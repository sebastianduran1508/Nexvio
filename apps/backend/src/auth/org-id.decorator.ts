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

/**
 * Igual que @OrgId(), pero NO corta si no hay organización.
 *
 * Lo usan las rutas que valen tanto para alguien con organización (un
 * asistente, un organizador) como para el superadmin global, que no tiene
 * ninguna: /auth/yo y /auth/cambiar-password. Sin organización, runInTenant
 * recibe undefined y toma el valor del contexto de la petición.
 */
export const OrgIdOpcional = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest();
    return req.user?.orgId ?? undefined;
  },
);
