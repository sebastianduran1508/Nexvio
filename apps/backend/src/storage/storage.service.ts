import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';

/** El bucket público de imágenes (prisma/setup/13_storage_bucket.sql). */
export const BUCKET_PUBLICO = 'nexvio-publico';

/** Tope de tamaño. El bucket tiene el mismo límite: es el segundo cerrojo. */
export const LIMITE_IMAGEN = 2 * 1024 * 1024; // 2 MB

/** Tipos aceptados y la extensión con la que se guardan. */
const TIPOS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * SUPABASE STORAGE (Bloque 8.4.d) — el "disco en la nube" de Nexvio.
 *
 * La base de datos guarda textos, no imágenes. Las imágenes viven en Storage
 * y en la base solo anotamos su DIRECCIÓN (ej. ponente.foto_url).
 *
 * Por qué sube el BACKEND y no el navegador directamente:
 *  1. La suplantación del superadmin (X-Organizacion-Id) solo la entiende el
 *     backend. Las políticas de Storage no la verían.
 *  2. El aislamiento entre organizaciones sigue viviendo en un solo lugar.
 *  3. La clave service_role nunca sale del servidor.
 *
 * Igual que SupabaseAdminService, habla con la API REST de Supabase con fetch:
 * no hace falta instalar ningún SDK.
 */
@Injectable()
export class StorageService {
  private readonly log = new Logger(StorageService.name);
  private readonly url = process.env.SUPABASE_URL;
  private readonly serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  private cabeceras(extra: Record<string, string> = {}) {
    if (!this.serviceKey) {
      throw new InternalServerErrorException('Falta SUPABASE_SERVICE_ROLE_KEY en el .env');
    }
    return { apikey: this.serviceKey, Authorization: `Bearer ${this.serviceKey}`, ...extra };
  }

  /** Dirección pública de un archivo del bucket. */
  urlPublica(ruta: string): string {
    return `${this.url}/storage/v1/object/public/${BUCKET_PUBLICO}/${ruta}`;
  }

  /**
   * Revisa que el archivo sea de verdad una imagen permitida.
   *
   * No basta con el `mimetype`: ese dato lo declara quien sube el archivo y se
   * puede falsificar (un .exe renombrado a foto.jpg). Por eso además miramos
   * los primeros bytes, la "firma" que cada formato lleva al principio.
   */
  validarImagen(archivo?: Express.Multer.File): string {
    if (!archivo) throw new BadRequestException('No llegó ningún archivo (campo "archivo")');
    if (archivo.size > LIMITE_IMAGEN) {
      throw new BadRequestException('La imagen pesa más de 2 MB');
    }
    const ext = TIPOS[archivo.mimetype];
    const b = archivo.buffer;
    const firmaOk =
      (ext === 'jpg' && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) ||
      (ext === 'png' && b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') ||
      (ext === 'webp' && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP');
    if (!ext || !firmaOk) {
      throw new BadRequestException('Solo se aceptan imágenes JPG, PNG o WebP');
    }
    return ext;
  }

  /**
   * Sube una imagen y devuelve su URL pública.
   *
   * `carpeta` organiza el bucket por cliente: "<org>/<congreso>/ponentes".
   * `base` es el comienzo del nombre (ej. el id del ponente). Se le agrega un
   * sufijo aleatorio para que, al CAMBIAR la foto, la dirección sea otra: así
   * la app no sigue mostrando la vieja que tenía guardada en caché.
   */
  async subirImagen(archivo: Express.Multer.File, carpeta: string, base: string): Promise<string> {
    const ext = this.validarImagen(archivo);
    const ruta = `${carpeta}/${base}-${randomBytes(4).toString('hex')}.${ext}`;

    const res = await fetch(`${this.url}/storage/v1/object/${BUCKET_PUBLICO}/${ruta}`, {
      method: 'POST',
      headers: this.cabeceras({ 'Content-Type': archivo.mimetype, 'Cache-Control': 'max-age=31536000' }),
      body: new Uint8Array(archivo.buffer),
    });
    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      this.log.error(`Storage rechazó la subida (${res.status}): ${detalle}`);
      throw new InternalServerErrorException(
        res.status === 404
          ? 'No existe el bucket de imágenes: corre prisma/setup/13_storage_bucket.sql'
          : 'No se pudo subir la imagen',
      );
    }
    return this.urlPublica(ruta);
  }

  /**
   * Borra un archivo a partir de su URL pública. Si la URL no es de nuestro
   * bucket (por ejemplo, una dirección externa puesta a mano), no hace nada.
   *
   * Nunca lanza error: si el borrado falla, queda un archivo huérfano en el
   * bucket, pero el cambio que pidió el admin (cambiar o quitar la foto) ya
   * está hecho. Preferimos eso a fallarle por una limpieza.
   */
  async borrarPorUrl(url?: string | null): Promise<void> {
    const prefijo = this.urlPublica('');
    if (!url || !url.startsWith(prefijo)) return;
    const ruta = url.slice(prefijo.length);
    try {
      const res = await fetch(`${this.url}/storage/v1/object/${BUCKET_PUBLICO}`, {
        method: 'DELETE',
        headers: this.cabeceras({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ prefixes: [ruta] }),
      });
      if (!res.ok) this.log.warn(`No se pudo borrar ${ruta} (${res.status})`);
    } catch (e) {
      this.log.warn(`No se pudo borrar ${ruta}: ${String(e)}`);
    }
  }
}
