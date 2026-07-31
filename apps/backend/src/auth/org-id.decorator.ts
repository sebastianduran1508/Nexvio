import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Decorador de parámetro @OrgId(): extrae el organizacion_id del usuario
 * autenticado (que el middleware puso en req.user a partir del JWT).
 *
 * Sirve para dos cosas en el CRUD:
 *   1) pasárselo a runInTenant(orgId, ...) -> activa el RLS de esa organización;
 *   2) estamparlo en organizacion_id al CREAR filas -> el RLS (WITH CHECK) exige
 *      que las filas nuevas pertenezcan al tenant activo.
 *
 * Uso en un controller:
 *   @Post()
 *   crear(@OrgId() orgId: string, @Body() dto: CrearCongresoDto) { ... }
 */
export const OrgId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    const orgId = req.user?.orgId;
    if (!orgId) {
      // Un admin global (sin organización) no puede operar sobre datos de tenant.
      throw new UnauthorizedException('El usuario no tiene una organización asociada');
    }
    return orgId;
  },
);
