import { Controller, Get, UseGuards } from '@nestjs/common';
import { SuperadminService } from './superadmin.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

/**
 * Rutas exclusivas del superadmin (rol `admin` global).
 *
 * Son las ÚNICAS dos rutas de toda la API que no están atadas a un tenant.
 * Por eso aquí no aparece @OrgId() ni runInTenant: ya están resueltas por las
 * funciones acotadas de la base.
 *
 * Para TODO lo demás (crear un congreso, editar la agenda, mandar push...), el
 * superadmin usa los mismos endpoints que un organizador, mandando la cabecera
 * X-Organizacion-Id para decir en qué organización está trabajando.
 */
@Controller('superadmin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class SuperadminController {
  constructor(private readonly superadmin: SuperadminService) {}

  /** GET /superadmin/organizaciones — para el selector de organización. */
  @Get('organizaciones')
  organizaciones() {
    return this.superadmin.listarOrganizaciones();
  }

  /** GET /superadmin/panorama — congresos de todos los clientes. */
  @Get('panorama')
  panorama() {
    return this.superadmin.panorama();
  }
}
