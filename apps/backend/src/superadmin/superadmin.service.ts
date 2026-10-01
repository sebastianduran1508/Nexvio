import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Una organización tal como la devuelve la ventanilla 1. */
export interface OrganizacionResumen {
  id: string;
  nombre: string;
  slug: string;
  estado: string;
  creado_en: Date;
  total_congresos: number;
}

/** Una fila del panorama (ventanilla 2). */
export interface CongresoPanorama {
  organizacion_id: string;
  organizacion: string;
  congreso_id: string;
  congreso: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  estado: string;
  ciudad: string | null;
  en_curso: boolean;
  total_sesiones: number;
  total_inscritos: number;
}

/**
 * Lo único que el superadmin ve "por encima" del RLS.
 *
 * Fíjate en la diferencia con el resto de services del proyecto: aquí NO
 * usamos runInTenant(), porque estas consultas no pertenecen a ninguna
 * organización — son precisamente las dos vistas que cruzan tenants.
 *
 * A cambio, no tocan tablas directamente: llaman a las dos funciones
 * SECURITY DEFINER de `prisma/setup/08_funciones_superadmin.sql`, que son de
 * solo lectura y devuelven un puñado de columnas acotadas. Si mañana alguien
 * quiere saber qué puede ver el superadmin, la respuesta cabe en un archivo.
 */
@Injectable()
export class SuperadminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Las organizaciones del sistema (para el selector del panel). */
  listarOrganizaciones(): Promise<OrganizacionResumen[]> {
    return this.prisma.$queryRaw<OrganizacionResumen[]>`
      SELECT * FROM nexvio_listar_organizaciones()
    `;
  }

  /** Todos los congresos de todos los clientes, los en curso primero. */
  panorama(): Promise<CongresoPanorama[]> {
    return this.prisma.$queryRaw<CongresoPanorama[]>`
      SELECT * FROM nexvio_panorama_congresos()
    `;
  }
}
