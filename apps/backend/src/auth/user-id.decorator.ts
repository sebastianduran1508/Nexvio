import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Decorador de parametro @UserId(): extrae el id del usuario autenticado
 * (el claim `sub` del JWT, que por convencion es igual a usuario.id).
 *
 * Lo usamos en Inscripciones para saber QUIEN se inscribe / cancela, sin
 * confiar en nada que venga en el cuerpo de la peticion: la identidad sale
 * del token firmado, no de datos que el cliente pueda manipular.
 */
export const UserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    const sub = req.user?.sub;
    if (!sub) {
      throw new UnauthorizedException('No hay un usuario autenticado');
    }
    return sub;
  },
);
