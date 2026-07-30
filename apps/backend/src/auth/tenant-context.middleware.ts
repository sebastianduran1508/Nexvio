import {
  Injectable,
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
 * Se ejecuta al inicio de CADA petición:
 *  1. Si hay token, verifica su firma y extrae los claims (sub, organizacion_id, rol).
 *  2. Los adjunta a req.user.
 *  3. Corre el resto de la petición dentro del AsyncLocalStorage, para que el
 *     PrismaService sepa qué tenant está activo sin que nadie se lo pase a mano.
 *
 * Sin token válido, sigue sin contexto: los guards protegerán las rutas privadas.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
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

    const user = {
      sub: payload.sub as string,
      orgId: payload.organizacion_id as string | undefined,
      rol: payload.rol as string | undefined,
    };
    (req as unknown as { user: typeof user }).user = user;

    // Toda la petición corre dentro del contexto del tenant.
    tenantStorage.run({ orgId: user.orgId ?? '', rol: user.rol }, () => next());
  }
}
