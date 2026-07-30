import { SetMetadata } from '@nestjs/common';

/**
 * Decorador @Roles('organizador', 'admin') para marcar qué roles pueden usar
 * un endpoint. El RolesGuard lee esta metadata y decide.
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
