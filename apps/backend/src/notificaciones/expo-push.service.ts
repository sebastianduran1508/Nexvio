import { Injectable, Logger } from '@nestjs/common';

/** Un mensaje para un teléfono. */
export type MensajePush = {
  to: string; // el token de Expo del teléfono
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export type ResultadoEnvio = {
  enviados: number;
  fallidos: number;
  /** Tokens que Expo dice que ya no existen (app desinstalada...): se apagan. */
  tokensInvalidos: string[];
};

const URL_EXPO = 'https://exp.host/--/api/v2/push/send';
const POR_LOTE = 100; // Expo acepta hasta 100 mensajes por llamada

/**
 * Habla con el servicio de notificaciones de Expo (Bloque 8.6).
 *
 * Expo hace de intermediario: nosotros le mandamos "a este token, este
 * mensaje", y él se encarga de entregarlo por Firebase (Android) o por Apple
 * (iOS). Así el backend no necesita hablar con cada plataforma.
 *
 * Por cada mensaje Expo devuelve un "ticket": status "ok" o "error". Si el
 * error es DeviceNotRegistered, ese token ya no sirve y lo desactivamos.
 *
 * EXPO_ACCESS_TOKEN (opcional, en el .env): si se activa la "seguridad
 * mejorada" en la cuenta de Expo, solo nuestro servidor puede enviar a
 * nuestros tokens.
 */
@Injectable()
export class ExpoPushService {
  private readonly log = new Logger(ExpoPushService.name);

  async enviar(mensajes: MensajePush[]): Promise<ResultadoEnvio> {
    const resultado: ResultadoEnvio = { enviados: 0, fallidos: 0, tokensInvalidos: [] };

    for (let i = 0; i < mensajes.length; i += POR_LOTE) {
      const lote = mensajes.slice(i, i + POR_LOTE).map((m) => ({ ...m, sound: 'default' }));
      try {
        const res = await fetch(URL_EXPO, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(process.env.EXPO_ACCESS_TOKEN
              ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
              : {}),
          },
          body: JSON.stringify(lote),
        });
        const json: any = await res.json().catch(() => ({}));
        const tickets: any[] = Array.isArray(json?.data) ? json.data : [];

        if (!res.ok || tickets.length !== lote.length) {
          this.log.warn(`Expo respondió ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
          resultado.fallidos += lote.length;
          continue;
        }
        tickets.forEach((t, k) => {
          if (t?.status === 'ok') {
            resultado.enviados++;
          } else {
            resultado.fallidos++;
            if (t?.details?.error === 'DeviceNotRegistered') resultado.tokensInvalidos.push(lote[k].to);
          }
        });
      } catch (e) {
        // Sin internet, Expo caído...: el lote entero cuenta como fallido.
        this.log.warn(`No se pudo contactar a Expo: ${String(e)}`);
        resultado.fallidos += lote.length;
      }
    }
    return resultado;
  }
}
