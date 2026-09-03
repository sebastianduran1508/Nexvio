import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @RolActual(): devuelve el rol del usuario autenticado (claim `rol` del JWT).
 * Se usa cuando un endpoint muestra DISTINTA informacion segun el rol (p. ej.
 * el coordinador ve todas las preguntas y el asistente solo las aprobadas).
 */
export const RolActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    return req.user?.rol ?? '';
  },
);
