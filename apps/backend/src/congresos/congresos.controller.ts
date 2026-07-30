import { Controller, Get, UseGuards } from '@nestjs/common';
import { CongresosService } from './congresos.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

/**
 * Rutas de congresos.
 *  - AuthGuard: exige estar autenticado (token válido).
 *  - RolesGuard + @Roles: solo estos roles pueden ver la lista.
 */
@Controller('congresos')
@UseGuards(AuthGuard, RolesGuard)
export class CongresosController {
  constructor(private readonly congresos: CongresosService) {}

  @Get()
  @Roles('admin', 'organizador', 'coordinador', 'participante')
  findAll() {
    return this.congresos.findAll();
  }
}
