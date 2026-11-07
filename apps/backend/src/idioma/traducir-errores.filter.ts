import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CABECERA_IDIOMA, idiomaDe } from './idioma';
import { traducirMensaje } from './mensajes';

/**
 * FILTRO GLOBAL: TRADUCE LOS ERRORES AL IDIOMA DE LA APP (8.8).
 *
 * Un "filtro de excepciones" de NestJS atrapa cada error ANTES de que se
 * convierta en la respuesta HTTP. Este solo hace una cosa: si la petición
 * trae `X-Idioma: en` (o pt), cambia el `message` por su traducción
 * (mensajes.ts). El código, el estado y el resto de la respuesta quedan
 * IGUALES a lo que NestJS respondería sin el filtro.
 *
 * Ejemplo: la app en inglés pide un congreso que no existe ->
 *   sin filtro: 404 { message: 'Congreso no encontrado', error: 'Not Found', statusCode: 404 }
 *   con filtro: 404 { message: 'Congress not found',     error: 'Not Found', statusCode: 404 }
 * Los errores de validación traen VARIOS mensajes (un arreglo): se traduce cada uno.
 */
@Catch(HttpException)
export class TraducirErroresFilter implements ExceptionFilter {
  catch(excepcion: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const estado = excepcion.getStatus();
    const idioma = idiomaDe(req.headers[CABECERA_IDIOMA]);

    let cuerpo = excepcion.getResponse();
    if (typeof cuerpo === 'string') cuerpo = { statusCode: estado, message: cuerpo };

    if (idioma !== 'es' && cuerpo && typeof cuerpo === 'object' && 'message' in cuerpo) {
      const m = (cuerpo as { message: unknown }).message;
      const traducido = Array.isArray(m)
        ? m.map((x) => (typeof x === 'string' ? traducirMensaje(x, idioma) : x))
        : typeof m === 'string'
          ? traducirMensaje(m, idioma)
          : m;
      cuerpo = { ...(cuerpo as object), message: traducido };
    }
    res.status(estado).json(cuerpo);
  }
}
