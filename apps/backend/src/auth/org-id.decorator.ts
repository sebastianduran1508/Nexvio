import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

/**
 * Decorador de parámetro @OrgId(): extrae el organizacion_id EFECTIVO de la
 * petición (el que el middleware calculó a partir del JWT y, para el
 * superadmin, de la cabecera X-Organizacion-Id).
 *
 * Sirve para dos cosas en el CRUD:
 *   1) pasárselo a runInTenant(orgId, ...) -> activa el RLS de esa organización;
 *   2) estamparlo en organizacion_id al CREAR filas -> el RLS (WITH CHECK) exige
 *      que las filas nuevas pertenezcan al tenant activo.
 *
 * Uso en un controller:
 *   @Post()
 *   crear(@OrgId() orgId: string, @Body() dto: CrearCongresoDto) { ... }
 *
 * Nota (Bloque 8.2): el superadmin SÍ puede usar estos endpoints, pero antes
 * tiene que elegir en qué organización trabaja. Si no manda la cabecera, no hay
 * tenant que activar y cortamos con un mensaje que explica qué falta.
 */
export const OrgId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    const orgId = req.user?.orgId;

    if (!orgId) {
      if (req.user?.rol === 'admin') {
        throw new BadRequestException(
          'Elige una organización: falta la cabecera X-Organizacion-Id',
        );
      }
      throw new BadRequestException(
        'El usuario no tiene una organización asociada',
      );
    }
    return orgId;
  },
);
