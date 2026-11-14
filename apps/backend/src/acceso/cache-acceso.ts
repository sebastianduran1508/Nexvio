/**
 * MEMORIA DEL PORTERO (Fase 9 · 9.13.a — rendimiento).
 *
 * El `AccesoCongresoGuard` responde dos preguntas en CADA petición de un
 * asistente: "¿de qué congreso es esta charla/encuesta?" y "¿está inscrito
 * ahí?". Antes eran dos transacciones a la base por petición (más la del
 * servicio). En la prueba de carga eso multiplicaba la latencia (Hallazgo
 * 9.1-3 del HANDOFF). Aquí se RECUERDAN las respuestas un rato:
 *
 *  - Charla/encuesta → congreso: no cambia nunca (una charla no se muda de
 *    congreso) → 10 minutos.
 *  - "Está inscrito": puede cambiar → solo 30 segundos, y SOLO las respuestas
 *    "sí" (un "no" siempre se vuelve a preguntar a la base).
 *  - Cuando alguien sale de un congreso (lo quitan, se suprimen sus datos o se
 *    borra el congreso) los servicios llaman a `olvidar…()` y el recuerdo se
 *    borra AL INSTANTE: el acceso se corta en la siguiente petición.
 *
 * Es memoria de UN proceso. Con varias instancias del backend, la de otra
 * instancia se borraría sola a los 30 s como máximo (aceptable; anotado).
 */

const MAX_ENTRADAS = 50_000; // tope de seguridad: si se llena, se vacía

class Recuerdo<T> {
  private readonly mapa = new Map<string, { valor: T; hasta: number }>();
  constructor(private readonly vidaMs: number) {}

  leer(clave: string): T | undefined {
    const e = this.mapa.get(clave);
    if (!e) return undefined;
    if (e.hasta < Date.now()) {
      this.mapa.delete(clave);
      return undefined;
    }
    return e.valor;
  }

  guardar(clave: string, valor: T) {
    if (this.mapa.size >= MAX_ENTRADAS) this.mapa.clear();
    this.mapa.set(clave, { valor, hasta: Date.now() + this.vidaMs });
  }

  borrarDonde(condicion: (clave: string) => boolean) {
    for (const clave of this.mapa.keys()) if (condicion(clave)) this.mapa.delete(clave);
  }
}

/** clave "sesion:<id>" o "encuesta:<id>" → id del congreso. */
export const congresoDeRecuerdo = new Recuerdo<string>(10 * 60_000);
/** clave "<usuarioId>:<congresoId>" → true (solo se guardan los "sí"). */
export const inscritoRecuerdo = new Recuerdo<true>(30_000);

/** Llamar cuando a un usuario se le quitan o cancelan inscripciones. */
export function olvidarInscripcionesDe(usuarioId: string) {
  inscritoRecuerdo.borrarDonde((k) => k.startsWith(`${usuarioId}:`));
}

/** Llamar cuando se borra un congreso entero. */
export function olvidarCongreso(congresoId: string) {
  inscritoRecuerdo.borrarDonde((k) => k.endsWith(`:${congresoId}`));
}
