import { IsOptional, Matches } from 'class-validator';

/** Un color en hexadecimal de 6 dígitos: "#5A46F0". */
export const COLOR_HEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Molde para guardar la personalización de un congreso
 * (PUT /congresos/:congresoId/personalizacion). Bloque 8.5.c.
 *
 * Solo los COLORES viajan aquí. El logo y la portada son archivos y tienen sus
 * propias rutas (multipart), igual que la foto de los ponentes.
 *
 * `null` = volver al color de Nexvio. @IsOptional deja pasar `null` sin
 * validarlo, así que el formato solo se revisa cuando llega un texto.
 *
 * El tema por defecto (claro/oscuro/sistema) existe en la tabla, pero se
 * decidió dejarlo para el 8.7 (ver HANDOFF): por eso no está en este DTO.
 */
export class GuardarPersonalizacionDto {
  @IsOptional()
  @Matches(COLOR_HEX, { message: 'color_primario debe ser un color como #5A46F0' })
  color_primario?: string | null;

  @IsOptional()
  @Matches(COLOR_HEX, { message: 'color_secundario debe ser un color como #FF7A59' })
  color_secundario?: string | null;
}
