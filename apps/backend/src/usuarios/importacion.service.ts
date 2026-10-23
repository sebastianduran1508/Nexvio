import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { AsistentesService } from './asistentes.service';
import { TIPOS_DOCUMENTO } from './dto/asistente.dto';
import {
  baseUsername,
  usernameLibre,
  correoSintetico,
  passwordTemporal,
} from './username.util';

/** Qué le va a pasar a cada fila del Excel. */
export type EstadoFila =
  | 'nueva' // persona nueva: se crea la cuenta y se inscribe
  | 'se_inscribe' // ya existe en la organización, solo falta inscribirla
  | 'ya_inscrita' // ya está en este congreso: se omite
  | 'error'; // le falta algo obligatorio o está repetida en el archivo

export interface FilaAnalizada {
  fila: number; // número de fila en el Excel (para que el admin la encuentre)
  nombres: string;
  apellidos: string;
  tipo_documento: string;
  numero_documento: string;
  tipo_suscripcion?: string;
  email?: string;
  telefono?: string;
  cargo?: string;
  empresa?: string;
  pais?: string;
  estado: EstadoFila;
  motivo?: string;
  username_propuesto?: string;
}

export interface Analisis {
  congreso: string;
  total: number;
  nuevas: number;
  se_inscriben: number;
  ya_inscritas: number;
  errores: number;
  filas: FilaAnalizada[];
}

export interface CredencialGenerada {
  nombres: string;
  apellidos: string;
  documento: string;
  username: string;
  password_temporal: string;
  estado?: 'temporal' | 'activa';
}

/**
 * Importación del Excel de inscritos (Bloque 8.3).
 *
 * El flujo es de DOS PASOS a propósito:
 *
 *   1. `analizar()`  — lee el archivo, valida cada fila y clasifica qué pasaría.
 *                      No escribe NADA en la base.
 *   2. `importar()`  — vuelve a leer el archivo y ejecuta solo las filas que el
 *                      análisis marcó como creables.
 *
 * ¿Por qué no de un solo golpe? Porque un Excel con un error de formato puede
 * crear 200 cuentas basura en Supabase Auth, y desde el panel no hay forma de
 * deshacerlo. Que el admin vea "30 se crean, 4 ya existen, 2 con documento
 * repetido" ANTES de confirmar convierte un desastre en un aviso.
 *
 * El paso 2 vuelve a leer el archivo en vez de confiar en lo que el navegador
 * devuelva: así el servidor no guarda estado entre las dos peticiones y nadie
 * puede manipular la lista por el camino.
 */
@Injectable()
export class ImportacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: SupabaseAdminService,
    private readonly asistentes: AsistentesService,
  ) {}

  // ------------------------------------------------------------- lectura

  /**
   * Normaliza un encabezado para poder reconocerlo escriba como escriba la
   * organización: "Número de documento", "NUMERO DOCUMENTO" y "numero_documento"
   * acaban todos como "numerodedocumento"... bueno, como "numerodocumento".
   */
  private clave(texto: string): string {
    return texto
      .toString()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  /**
   * Sinónimos aceptados por columna. Es lo que hace que la importación no se
   * rompa porque alguien escribió "Celular" en vez de "Teléfono".
   */
  private readonly COLUMNAS: Record<string, string[]> = {
    nombres: ['nombres', 'nombre', 'primernombre'],
    apellidos: ['apellidos', 'apellido'],
    tipo_documento: ['tipodocumento', 'tipodedocumento', 'tipodoc'],
    numero_documento: [
      'numerodocumento', 'numerodedocumento', 'documento', 'cedula',
      'identificacion', 'nrodocumento',
    ],
    tipo_suscripcion: [
      'tiposuscripcion', 'tipodesuscripcion', 'suscripcion', 'membresia',
      'categoria',
    ],
    email: ['correo', 'email', 'correoelectronico', 'mail'],
    telefono: ['telefono', 'celular', 'movil', 'tel'],
    cargo: ['cargo', 'profesion', 'especialidad'],
    empresa: ['empresa', 'institucion', 'organizacion', 'entidad'],
    pais: ['pais'],
  };

  /** Lee el .xlsx y devuelve filas ya mapeadas a nuestros nombres de campo. */
  private async leerFilas(
    buffer: Buffer,
  ): Promise<{ fila: number; datos: Record<string, string> }[]> {
    const libro = new ExcelJS.Workbook();
    try {
      await libro.xlsx.load(buffer as any);
    } catch {
      throw new BadRequestException(
        'No se pudo leer el archivo. ¿Seguro que es un .xlsx?',
      );
    }

    const hoja = libro.worksheets[0];
    if (!hoja) throw new BadRequestException('El archivo no tiene ninguna hoja.');

    // Fila 1 = encabezados. Construimos: número de columna -> nombre de campo.
    const mapa = new Map<number, string>();
    hoja.getRow(1).eachCell((celda, col) => {
      const k = this.clave(this.texto(celda.value));
      for (const [campo, sinonimos] of Object.entries(this.COLUMNAS)) {
        if (sinonimos.includes(k)) mapa.set(col, campo);
      }
    });

    const faltan = ['nombres', 'apellidos', 'numero_documento'].filter(
      (c) => ![...mapa.values()].includes(c),
    );
    if (faltan.length > 0) {
      throw new BadRequestException(
        `Al archivo le faltan columnas obligatorias: ${faltan.join(', ')}. ` +
          'Descarga la plantilla y vuelve a intentarlo.',
      );
    }

    const filas: { fila: number; datos: Record<string, string> }[] = [];
    hoja.eachRow((row, numero) => {
      if (numero === 1) return; // encabezados
      const datos: Record<string, string> = {};
      mapa.forEach((campo, col) => {
        datos[campo] = this.texto(row.getCell(col).value).trim();
      });
      // Una fila totalmente vacía (típico al final del archivo) se ignora.
      if (Object.values(datos).some((v) => v !== '')) {
        filas.push({ fila: numero, datos });
      }
    });

    return filas;
  }

  /** Convierte cualquier valor de celda de ExcelJS a texto plano. */
  private texto(valor: ExcelJS.CellValue): string {
    if (valor === null || valor === undefined) return '';
    if (typeof valor === 'object') {
      // Celdas con fórmula, texto enriquecido o hipervínculo.
      const v = valor as any;
      if ('result' in v) return this.texto(v.result);
      if ('text' in v) return String(v.text);
      if ('richText' in v) return v.richText.map((t: any) => t.text).join('');
      if (valor instanceof Date) return valor.toISOString().slice(0, 10);
      return '';
    }
    return String(valor);
  }

  // ------------------------------------------------------------- análisis

  /** Paso 1: lee, valida y clasifica. NO escribe nada. */
  async analizar(
    orgId: string,
    congresoId: string,
    buffer: Buffer,
  ): Promise<Analisis> {
    const filas = await this.leerFilas(buffer);
    const ctx = await this.asistentes.cargarContexto(orgId, congresoId);

    // Copias de trabajo: así el análisis no "reserva" nada de verdad.
    const ocupados = new Set(ctx.ocupados);
    const documentosEnArchivo = new Set<string>();

    const analizadas: FilaAnalizada[] = filas.map(({ fila, datos }) => {
      const base: FilaAnalizada = {
        fila,
        nombres: datos.nombres ?? '',
        apellidos: datos.apellidos ?? '',
        tipo_documento: (datos.tipo_documento ?? 'CC').toUpperCase(),
        numero_documento: datos.numero_documento ?? '',
        tipo_suscripcion: datos.tipo_suscripcion || undefined,
        email: datos.email || undefined,
        telefono: datos.telefono || undefined,
        cargo: datos.cargo || undefined,
        empresa: datos.empresa || undefined,
        pais: datos.pais || undefined,
        estado: 'nueva',
      };

      // --- validaciones de formato ---
      if (!base.nombres || !base.apellidos) {
        return { ...base, estado: 'error', motivo: 'Faltan nombres o apellidos' };
      }
      if (!base.numero_documento) {
        return { ...base, estado: 'error', motivo: 'Falta el número de documento' };
      }
      if (!TIPOS_DOCUMENTO.includes(base.tipo_documento as any)) {
        return {
          ...base,
          estado: 'error',
          motivo: `Tipo de documento "${base.tipo_documento}" no válido (CC, CE, PA, TI o NIT)`,
        };
      }
      if (base.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(base.email)) {
        return { ...base, estado: 'error', motivo: 'El correo no tiene formato válido' };
      }

      const doc = base.numero_documento.toLowerCase();

      // --- repetido DENTRO del mismo archivo ---
      if (documentosEnArchivo.has(doc)) {
        return {
          ...base,
          estado: 'error',
          motivo: 'Este documento aparece dos veces en el archivo',
        };
      }
      documentosEnArchivo.add(doc);

      // --- ¿ya existe esta persona en la organización? ---
      const usuarioExistente = ctx.documentos.get(doc);
      if (usuarioExistente) {
        return ctx.inscritos.has(usuarioExistente)
          ? { ...base, estado: 'ya_inscrita', motivo: 'Ya está inscrita a este congreso' }
          : {
              ...base,
              estado: 'se_inscribe',
              motivo: 'La persona ya existe: solo se inscribe (conserva su usuario)',
            };
      }

      // --- persona nueva: le proponemos usuario ---
      return {
        ...base,
        estado: 'nueva',
        username_propuesto: usernameLibre(
          baseUsername(base.nombres, base.apellidos),
          ocupados,
        ),
      };
    });

    return {
      congreso: ctx.congreso.nombre,
      total: analizadas.length,
      nuevas: analizadas.filter((f) => f.estado === 'nueva').length,
      se_inscriben: analizadas.filter((f) => f.estado === 'se_inscribe').length,
      ya_inscritas: analizadas.filter((f) => f.estado === 'ya_inscrita').length,
      errores: analizadas.filter((f) => f.estado === 'error').length,
      filas: analizadas,
    };
  }

  // ----------------------------------------------------------- importación

  /**
   * Paso 2: ejecuta lo que el análisis marcó como creable.
   *
   * Las filas con error y las ya inscritas se saltan sin tocar nada. Devuelve
   * las credenciales de los recién creados para que el panel las descargue:
   * es la ÚNICA vez que la contraseña temporal se puede ver (después solo
   * queda su hash en Supabase).
   */
  async importar(orgId: string, congresoId: string, buffer: Buffer) {
    const analisis = await this.analizar(orgId, congresoId, buffer);
    const ctx = await this.asistentes.cargarContexto(orgId, congresoId);
    const ocupados = new Set(ctx.ocupados);

    const credenciales: CredencialGenerada[] = [];
    const fallidas: { fila: number; motivo: string }[] = [];
    let inscritasExistentes = 0;

    for (const fila of analisis.filas) {
      if (fila.estado === 'error' || fila.estado === 'ya_inscrita') continue;

      // --- caso fácil: la persona ya existe, solo le falta la inscripción ---
      if (fila.estado === 'se_inscribe') {
        const usuarioId = ctx.documentos.get(fila.numero_documento.toLowerCase())!;
        try {
          await this.prisma.runInTenant(orgId, (tx) =>
            tx.inscripcion.create({
              data: {
                organizacion_id: orgId,
                congreso_id: congresoId,
                usuario_id: usuarioId,
                tipo_suscripcion: fila.tipo_suscripcion ?? null,
                origen: 'excel',
              },
            }),
          );
          inscritasExistentes++;
        } catch (e: any) {
          fallidas.push({ fila: fila.fila, motivo: e.message ?? 'Error al inscribir' });
        }
        continue;
      }

      // --- persona nueva: cuenta de Auth + usuario + inscripción ---
      const username = usernameLibre(
        baseUsername(fila.nombres, fila.apellidos),
        ocupados,
      );
      const email = fila.email || correoSintetico(username, ctx.organizacion.slug);
      const password = passwordTemporal();

      let authUserId: string;
      try {
        authUserId = await this.auth.crearUsuario(email, password);
      } catch (e: any) {
        fallidas.push({
          fila: fila.fila,
          motivo: e?.response?.message ?? e.message ?? 'No se pudo crear la cuenta',
        });
        continue;
      }

      try {
        await this.prisma.runInTenant(orgId, async (tx) => {
          const usuario = await tx.usuario.create({
            data: this.asistentes.datosUsuario(authUserId, orgId, username, email, {
              nombres: fila.nombres,
              apellidos: fila.apellidos,
              tipo_documento: fila.tipo_documento,
              numero_documento: fila.numero_documento,
              telefono: fila.telefono,
              cargo: fila.cargo,
              empresa: fila.empresa,
              pais: fila.pais,
            } as any),
          });

          await tx.inscripcion.create({
            data: {
              organizacion_id: orgId,
              congreso_id: congresoId,
              usuario_id: usuario.id,
              tipo_suscripcion: fila.tipo_suscripcion ?? null,
              origen: 'excel',
            },
          });
        });

        credenciales.push({
          nombres: fila.nombres,
          apellidos: fila.apellidos,
          documento: fila.numero_documento,
          username,
          password_temporal: password,
        });
      } catch (e: any) {
        // Compensación: la fila no entró, así que la cuenta de Auth sobra.
        await this.auth.borrarUsuario(authUserId).catch(() => undefined);
        fallidas.push({
          fila: fila.fila,
          motivo: e?.code === 'P2002' ? 'Documento o usuario duplicado' : e.message,
        });
      }
    }

    return {
      congreso: analisis.congreso,
      creadas: credenciales.length,
      inscritas_existentes: inscritasExistentes,
      omitidas: analisis.ya_inscritas + analisis.errores,
      fallidas,
      credenciales,
    };
  }

  // ------------------------------------------------- generación de archivos

  /**
   * El Excel de accesos: quién entra, con qué usuario y con qué contraseña.
   *
   * Sirve para los dos casos. Tras una importación trae solo a los recién
   * creados; desde "Listado de acceso" trae a TODO el congreso, y entonces
   * aparecen también los que ya estrenaron su cuenta — sin contraseña, porque
   * la suya es privada y nadie puede leerla. Que salgan igual es a propósito:
   * así el archivo es un censo completo y no una lista parcial.
   */
  async excelCredenciales(
    congreso: string,
    credenciales: CredencialGenerada[],
  ): Promise<Buffer> {
    const libro = new ExcelJS.Workbook();
    libro.creator = 'Nexvio';
    const hoja = libro.addWorksheet('Accesos');

    hoja.columns = [
      { header: 'Nombres', key: 'nombres', width: 24 },
      { header: 'Apellidos', key: 'apellidos', width: 24 },
      { header: 'Documento', key: 'documento', width: 18 },
      { header: 'Usuario', key: 'username', width: 18 },
      { header: 'Contraseña temporal', key: 'password_temporal', width: 24 },
      { header: 'Estado', key: 'estado_texto', width: 34 },
    ];
    hoja.getRow(1).font = { bold: true };

    for (const c of credenciales) {
      const activa = c.estado === 'activa';
      const fila = hoja.addRow({
        ...c,
        password_temporal: activa ? '—' : c.password_temporal || '(no se pudo generar)',
        estado_texto: activa
          ? 'Ya tiene su propia contraseña'
          : 'Entregar esta contraseña temporal',
      });
      // Las que ya están activas van en gris: se leen como "aquí no hay nada
      // que hacer", que es justo lo que el admin necesita ver de un vistazo.
      if (activa) fila.font = { color: { argb: 'FF888888' } };
    }

    hoja.addRow([]);
    hoja.addRow([
      `Congreso: ${congreso}. Las contraseñas temporales se cambian al primer ingreso. ` +
        'Nexvio no las vuelve a mostrar: guarda este archivo hasta repartirlas. ' +
        'Quien ya puso su propia contraseña aparece en gris y sin clave: la suya es ' +
        'privada y no se puede consultar, solo restablecer.',
    ]);

    return Buffer.from(await libro.xlsx.writeBuffer());
  }

  /** La plantilla vacía que la organización llena. */
  async excelPlantilla(): Promise<Buffer> {
    const libro = new ExcelJS.Workbook();
    libro.creator = 'Nexvio';
    const hoja = libro.addWorksheet('Inscritos');

    hoja.columns = [
      { header: 'Nombres', key: 'nombres', width: 24 },
      { header: 'Apellidos', key: 'apellidos', width: 24 },
      { header: 'Tipo documento', key: 'tipo_documento', width: 16 },
      { header: 'Número documento', key: 'numero_documento', width: 20 },
      { header: 'Tipo suscripción', key: 'tipo_suscripcion', width: 18 },
      { header: 'Correo', key: 'email', width: 28 },
      { header: 'Teléfono', key: 'telefono', width: 18 },
      { header: 'Cargo', key: 'cargo', width: 22 },
      { header: 'Empresa', key: 'empresa', width: 24 },
      { header: 'País', key: 'pais', width: 16 },
    ];
    hoja.getRow(1).font = { bold: true };

    // Una fila de ejemplo, en gris y en cursiva: se ve que hay que borrarla.
    const ejemplo = hoja.addRow({
      nombres: 'Juan Pablo',
      apellidos: 'García Ruiz',
      tipo_documento: 'CC',
      numero_documento: '1020304050',
      tipo_suscripcion: 'Miembro',
      email: 'juan@ejemplo.com',
      telefono: '3001234567',
      cargo: 'Médico internista',
      empresa: 'Clínica Ejemplo',
      pais: 'Colombia',
    });
    ejemplo.font = { italic: true, color: { argb: 'FF888888' } };

    // Segunda hoja con las instrucciones. addWorksheet es del LIBRO, no de
    // la hoja: una hoja no puede crear otra hoja.
    const notas = libro.addWorksheet('Instrucciones');
    notas.getColumn(1).width = 100;
    [
      'Cómo llenar esta plantilla',
      '',
      'OBLIGATORIAS: Nombres, Apellidos, Número documento.',
      'Tipo documento: CC, CE, PA, TI o NIT. Si se deja vacío se asume CC.',
      'El resto de columnas son opcionales.',
      '',
      'Borra la fila de ejemplo (la gris en cursiva) antes de enviar el archivo.',
      'No cambies los nombres de las columnas ni el orden de la primera fila.',
      '',
      'El usuario y la contraseña de cada asistente los genera Nexvio al importar:',
      'no los pongas aquí. El correo solo hace falta si la persona lo tiene.',
      '',
      'Si una persona ya fue importada antes (mismo documento), Nexvio no la duplica:',
      'la reconoce y, si hace falta, solo la inscribe a este congreso.',
    ].forEach((linea, i) => {
      const fila = notas.addRow([linea]);
      if (i === 0) fila.font = { bold: true, size: 13 };
    });

    return Buffer.from(await libro.xlsx.writeBuffer());
  }
}
