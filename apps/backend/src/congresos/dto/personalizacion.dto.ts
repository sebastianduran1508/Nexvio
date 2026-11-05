import { IsIn, IsOptional, Matches } from 'class-validator';

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
 * 8.7.g: el TEMA POR DEFECTO del congreso en la app. "sistema" = el que
 * tenga el teléfono. Cada asistente puede cambiarlo para sí en su Perfil.
 */
export class GuardarPersonalizacionDto {
  @IsOptional()
  @Matches(COLOR_HEX, { message: 'color_primario debe ser un color como #5A46F0' })
  color_primario?: string | null;

  @IsOptional()
  @Matches(COLOR_HEX, { message: 'color_secundario debe ser un color como #FF7A59' })
  color_secundario?: string | null;

  @IsOptional()
  @IsIn(['sistema', 'claro', 'oscuro'], { message: 'tema_default debe ser sistema, claro u oscuro' })
  tema_default?: string;
}
