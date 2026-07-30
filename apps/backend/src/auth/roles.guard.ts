import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

/**
 * Portero de autorización por rol. Lee los roles permitidos que puso @Roles(...)
 * en el endpoint y los compara con el rol del usuario (que viene del JWT).
 * Si el endpoint no declara roles, deja pasar.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const rol = req.user?.rol;

    if (!rol || !required.includes(rol)) {
      throw new ForbiddenException('No tienes el rol necesario para esta acción');
    }
    return true;
  }
}
