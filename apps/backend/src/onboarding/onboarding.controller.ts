import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CrearOrganizacionDto } from './dto/crear-organizacion.dto';

/**
 * Alta de organizaciones. Por ahora SOLO el admin global (super-admin de Grupo
 * Studio Sebia) puede crear organizaciones, según el rol "Admin" del diagrama C4.
 *
 * Nota: aquí NO usamos @OrgId() — el admin no pertenece a ninguna organización
 * (su organizacion_id es NULL). El tenant de la nueva org lo genera el service.
 *
 * Para pasar a auto-registro en el futuro, bastaría con añadir OTRO endpoint
 * público (sin guards) que llame al mismo OnboardingService.
 */
@Controller('organizaciones')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  crear(@Body() dto: CrearOrganizacionDto) {
    return this.onboarding.registrarOrganizacion(dto);
  }
}
