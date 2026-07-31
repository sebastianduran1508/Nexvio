import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { CrearOrganizacionDto } from './dto/crear-organizacion.dto';

/**
 * Lógica de alta de organizaciones. Está pensada como pieza REUTILIZABLE: hoy la
 * llama un endpoint admin, pero mañana podría llamarla un endpoint público de
 * auto-registro sin cambiar nada de aquí.
 */
@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: SupabaseAdminService,
  ) {}

  /**
   * Crea una organización nueva junto con su primer usuario organizador.
   *
   * Pasos:
   *  1. Crear la cuenta de login en Supabase Auth (devuelve su id).
   *  2. Guardar en la base, dentro de una transacción, la organización y el
   *     usuario. Truco clave: generamos el UUID de la organización ANTES y lo
   *     usamos como tenant activo (runInTenant), así los INSERT pasan el RLS
   *     (id/organizacion_id == app.org_id) sin necesitar conexión privilegiada.
   *  3. Si el guardado falla, borramos la cuenta de Auth (compensación) para no
   *     dejar una cuenta huérfana sin su fila en `usuario`.
   */
  async registrarOrganizacion(dto: CrearOrganizacionDto) {
    // 1) Cuenta de login (si el correo ya existe, esto lanza 409 y no seguimos).
    const authUserId = await this.auth.crearUsuario(
      dto.organizador.email,
      dto.organizador.password,
    );

    // 2) UUID de la organización, pre-generado para usarlo como contexto de tenant.
    const orgId = randomUUID();

    try {
      return await this.prisma.runInTenant(orgId, async (tx) => {
        const organizacion = await tx.organizacion.create({
          data: { id: orgId, nombre: dto.nombre, slug: dto.slug },
        });

        const organizador = await tx.usuario.create({
          data: {
            id: authUserId, // == sub del JWT (convención de Fase 2)
            organizacion_id: orgId,
            email: dto.organizador.email,
            nombre: dto.organizador.nombre,
            rol: 'organizador',
          },
          select: { id: true, email: true, nombre: true, rol: true },
        });

        return { organizacion, organizador };
      });
    } catch (e: any) {
      // 3) Compensación: deshacer la cuenta de Auth para no dejar huérfanos.
      await this.auth.borrarUsuario(authUserId).catch(() => undefined);

      // P2002 = violación de restricción única (slug o email ya existían).
      if (e?.code === 'P2002') {
        throw new ConflictException(
          'Ya existe una organización con ese slug o un usuario con ese correo',
        );
      }
      throw e;
    }
  }
}
