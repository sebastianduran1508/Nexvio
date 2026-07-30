import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Portero de autenticación: deja pasar solo si el middleware ya validó un token
 * y adjuntó req.user. Si no hay usuario, corta con 401.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user) {
      throw new UnauthorizedException('Se requiere autenticación');
    }
    return true;
  }
}
