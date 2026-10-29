import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from './notificaciones.service';

const CADA_MS = 60 * 1000; // revisar una vez por minuto

/**
 * EL PROGRAMADOR (Bloque 8.6): envía los avisos programados cuando llega su hora.
 *
 * Es un "despertador" que suena cada minuto mientras el backend está encendido:
 *  1. Le pregunta a la base qué avisos programados ya vencieron. Como aquí no
 *     hay petición ni tenant, usa la ventanilla nexvio_notificaciones_vencidas()
 *     (SECURITY DEFINER, solo lectura, devuelve id + organización).
 *  2. Por cada uno, entra a SU organización (runInTenant), lo "reclama"
 *     (programada -> enviando, solo si nadie lo tomó antes) y lo despacha.
 *
 * Si el backend estuvo apagado cuando tocaba enviar algo, lo envía al
 * arrancar (tarde, pero no se pierde).
 *
 * Se usa un setInterval simple en vez de una librería de tareas: para "revisar
 * cada minuto" basta, y no suma una dependencia más. Se puede apagar con
 * NOTIFICACIONES_PROGRAMADOR=off en el .env.
 */
@Injectable()
export class ProgramadorService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Programador');
  private reloj?: NodeJS.Timeout;
  private ocupado = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  onModuleInit() {
    if (process.env.NOTIFICACIONES_PROGRAMADOR === 'off') return;
    this.reloj = setInterval(() => void this.revisar(), CADA_MS);
    setTimeout(() => void this.revisar(), 5000); // una primera revisión al arrancar
  }

  onModuleDestroy() {
    if (this.reloj) clearInterval(this.reloj);
  }

  async revisar() {
    // Si una revisión tarda más de un minuto, la siguiente no se monta encima.
    if (this.ocupado) return;
    this.ocupado = true;
    try {
      const vencidas = await this.prisma.$queryRaw<{ id: string; organizacion_id: string }[]>`
        SELECT * FROM nexvio_notificaciones_vencidas()
      `;
      for (const n of vencidas) {
        try {
          if (await this.notificaciones.reclamar(n.organizacion_id, n.id)) {
            const r = await this.notificaciones.despachar(n.organizacion_id, n.id);
            this.log.log(`Aviso programado enviado (${r.enviados} teléfonos): ${r.titulo}`);
          }
        } catch (e) {
          // Un aviso con problemas no detiene a los demás.
          this.log.error(`No se pudo enviar el aviso ${n.id}: ${String(e)}`);
        }
      }
    } catch (e) {
      this.log.error(`Falló la revisión de avisos programados: ${String(e)}`);
    } finally {
      this.ocupado = false;
    }
  }
}
