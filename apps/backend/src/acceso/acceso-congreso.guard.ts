import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

/**
 * "SOLO SU CONGRESO" (Bloque 8.7.b) — el portero de los asistentes.
 *
 * El RLS ya impide ver datos de OTRA organización. Pero dentro de la misma
 * organización hay varios congresos, y el asistente solo pagó (y solo debe
 * ver) aquel en el que la organización lo inscribió. Este guard lo garantiza
 * en cada ruta que lleve el id de un congreso, una sesión o una encuesta.
 *
 * Uso, en el controlador:
 *   @UseGuards(AuthGuard, RolesGuard, AccesoCongresoGuard)
 *   ...
 *   @Post('sesiones/:sesionId/preguntas')
 *   @SoloInscritos('sesion', 'sesionId')
 *
 * Reglas:
 *  - Staff (admin, organizador, coordinador): pasa; el RLS ya lo acota.
 *  - Asistente (participante): sigue el rastro encuesta -> sesión -> congreso
 *    y exige una inscripción CONFIRMADA suya en ese congreso.
 *  - Si no: 404 (y no 403), para no confirmarle a un curioso que existe.
 */
export type AccesoPor = 'congreso' | 'sesion' | 'encuesta';
type Regla = { por: AccesoPor; param: string };

export const ACCESO_CONGRESO_KEY = 'acceso_congreso';
export const SoloInscritos = (por: AccesoPor, param: string) =>
  SetMetadata(ACCESO_CONGRESO_KEY, { por, param } satisfies Regla);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class AccesoCongresoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const regla = this.reflector.getAllAndOverride<Regla | undefined>(
      ACCESO_CONGRESO_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!regla) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as { sub: string; orgId?: string; rol?: string } | undefined;
    if (user?.rol !== 'participante') return true;

    // Los guards corren ANTES que los pipes (ParseUUIDPipe): validamos aquí
    // para no mandarle basura a la base.
    const valor: string | undefined = req.params?.[regla.param];
    if (!valor || !UUID.test(valor)) throw new NotFoundException('No encontrado');

    const congresoId = await this.congresoDe(user.orgId, regla.por, valor);
    if (congresoId && (await this.estaInscrito(user.orgId, user.sub, congresoId))) {
      return true;
    }
    throw new NotFoundException('No encontrado');
  }

  /** A qué congreso pertenece lo que se pide (null si no existe en el tenant). */
  async congresoDe(orgId: string | undefined, por: AccesoPor, id: string) {
    if (por === 'congreso') return id;
    return this.prisma.runInTenant(orgId, async (tx) => {
      if (por === 'sesion') {
        const s = await tx.sesion.findFirst({ where: { id }, select: { congreso_id: true } });
        return s?.congreso_id ?? null;
      }
      const e = await tx.encuesta.findFirst({
        where: { id },
        select: { sesion: { select: { congreso_id: true } } },
      });
      return e?.sesion.congreso_id ?? null;
    });
  }

  /** ¿Tiene una inscripción CONFIRMADA en ese congreso? */
  async estaInscrito(orgId: string | undefined, usuarioId: string, congresoId: string) {
    const ins = await this.prisma.runInTenant(orgId, (tx) =>
      tx.inscripcion.findFirst({
        where: { congreso_id: congresoId, usuario_id: usuarioId, estado: 'confirmada' },
        select: { id: true },
      }),
    );
    return !!ins;
  }
}
