import { Module } from '@nestjs/common';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';

/** Mi agenda (8.7.e): las charlas marcadas con ⭐. */
@Module({ controllers: [AgendaController], providers: [AgendaService] })
export class AgendaModule {}
