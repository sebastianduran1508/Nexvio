import {
  Injectable,
  Logger,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { tenantStorage } from '../tenant/tenant-context';

/**
 * Fuente de claves públicas (JWKS) de Supabase. jose descarga y cachea las
 * claves ECC (ES256) para verificar la firma de los tokens. No hay secreto
 * compartido en el backend: solo verificamos con la clave PÚBLICA.
 */
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
);

/**
 * Cabecera con la que el SUPERADMIN elige en qué organización quiere trabajar.
 * (Ver "Suplantación de tenant" más abajo.)
 */
export const CABECERA_ORG = 'x-organizacion-id';

/** Formato UUID v4 — validamos la cabecera antes de usarla. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Se ejecuta al inicio de CADA petición:
 *  1. Si hay token, verifica su firma y extrae los claims (sub, organizacion_id, rol).
 *  2. Decide cuál es el tenant EFECTIVO (ver suplantación).
 *  3. Los adjunta a req.user.
 *  4. Corre el resto de la petición dentro del AsyncLocalStorage, para que el
 *     PrismaService sepa qué tenant está activo sin que nadie se lo pase a mano.
 *
 * Sin token válido, sigue sin contexto: los guards protegerán las rutas privadas.
 *
 * ---------------------------------------------------------------------------
 * SUPLANTACIÓN DE TENANT (Bloque 8.2)
 * ---------------------------------------------------------------------------
 * El superadmin (rol `admin`) no pertenece a ninguna organización: su claim
 * `organizacion_id` es NULL. Para que pueda trabajar DENTRO de un cliente
 * concreto, manda la cabecera `X-Organizacion-Id` y nosotros usamos ESE valor
 * como tenant activo de la petición.
 *
 * A partir de ahí, para la base de datos el superadmin es un organizador más de
 * esa organización: pasa por las MISMAS políticas de RLS, usa los MISMOS
 * endpoints, y no hay que duplicar ni una línea de los módulos existentes.
 *
 * Tres garantías de seguridad, y conviene entenderlas:
 *   1. La cabecera SOLO se obedece si el token dice `rol: admin`. Para
 *      cualquier otro rol se ignora en silencio (jamás confiamos en una
 *      cabecera que manda el cliente para decidir permisos).
 *   2. Una petición solo puede estar en UN tenant. Nunca se ven dos a la vez,
 *      así que un bug jamás podría mezclar datos de dos clientes.
 *   3. NO se desactiva ni se modifica ninguna política de RLS. El aislamiento
 *      sigue siendo fail-closed: simplemente movemos de casilla al superadmin.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger('Tenant');

  async use(req: Request, res: Response, next: NextFunction) {
    const header = req.headers['authorization'];

    if (!header || !header.startsWith('Bearer ')) {
      return next();
    }

    const token = header.slice('Bearer '.length);

    let payload;
    try {
      ({ payload } = await jwtVerify(token, JWKS, {
        issuer: `${process.env.SUPABASE_URL}/auth/v1`,
        audience: 'authenticated',
      }));
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    const rol = payload.rol as string | undefined;
    const orgDelToken = payload.organizacion_id as string | undefined;

    // --- Tenant efectivo de esta petición -----------------------------------
    let orgId = orgDelToken;
    let suplantando = false;

    const orgPedida = req.headers[CABECERA_ORG];
    if (typeof orgPedida === 'string' && orgPedida.length > 0) {
      if (rol === 'admin' && UUID_RE.test(orgPedida)) {
        orgId = orgPedida;
        suplantando = true;
        // Rastro de auditoría: queda registrado a qué tenant entró el superadmin.
        this.logger.log(
          `superadmin ${payload.sub as string} -> organizacion ${orgPedida} (${req.method} ${req.originalUrl})`,
        );
      } else if (rol !== 'admin') {
        // No es un error que corte la petición: simplemente la ignoramos y la
        // persona sigue viendo SU organización. Pero sí lo dejamos anotado.
        this.logger.warn(
          `cabecera ${CABECERA_ORG} ignorada (rol "${rol ?? 'desconocido'}" no es admin)`,
        );
      }
    }

    const user = {
      sub: payload.sub as string,
      orgId,
      rol,
      suplantando, // lo usa el panel para mostrar el aviso "estás viendo X"
    };
    (req as unknown as { user: typeof user }).user = user;

    // Toda la petición corre dentro del contexto del tenant.
    tenantStorage.run({ orgId: orgId ?? '', rol }, () => next());
  }
}
