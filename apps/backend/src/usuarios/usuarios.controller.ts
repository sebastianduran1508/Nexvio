import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgId } from '../auth/org-id.decorator';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';

/**
 * Gestion de usuarios del tenant. Solo el staff (admin/organizador) puede
 * crear usuarios y listarlos. El asistente (participante) no gestiona usuarios.
 */
@Controller('usuarios')
@UseGuards(AuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Post()
  @Roles('admin', 'organizador')
  crear(@OrgId() orgId: string, @Body() dto: CrearUsuarioDto) {
    return this.usuarios.crear(orgId, dto);
  }

  @Get()
  @Roles('admin', 'organizador')
  listar(@OrgId() orgId: string) {
    return this.usuarios.listar(orgId);
  }
}
