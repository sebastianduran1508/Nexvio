import { randomInt } from 'node:crypto';

/**
 * Utilidades para las credenciales del asistente (Bloque 8.3).
 *
 * El cliente pidió que el asistente NO entre con correo (muchos no lo dan),
 * sino con un usuario tipo `JPGarcia` + una contraseña temporal que cambia al
 * primer ingreso. Pero Supabase Auth trabaja con correos. La solución: por
 * dentro cada cuenta tiene un **correo sintético** que el asistente nunca ve.
 */

/** Quita tildes y deja solo letras. "García" -> "Garcia". */
function limpiar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // tildes
    .replace(/[^a-zA-Z]/g, ''); // ñ, guiones, espacios, números
}

/**
 * Construye el usuario a partir del nombre: iniciales de los nombres + el
 * primer apellido.
 *
 *   "Juan Pablo" + "García Ruiz"  ->  "JPGarcia"
 *   "Ana"        + "Gómez"        ->  "AGomez"
 *
 * Los datos reales vienen de un Excel que llena otra gente, así que llegan
 * incompletos a menudo. Qué hace en esos casos:
 *
 *   "Shakira"    + ""             ->  "Shakira"   (sin apellido: el nombre entero)
 *   ""           + "Pérez"        ->  "Perez"     (sin nombre: el apellido entero)
 *   "J"          + ""             ->  "Usuario"   (nada usable: lo genérico)
 *
 * Nunca falla ni deja a nadie sin usuario: el contador de colisiones se
 * encarga del resto (Usuario2, Usuario3…).
 *
 * Importante: esto solo afecta al USUARIO. La contraseña es aleatoria siempre
 * y no tiene ninguna relación con el nombre de la persona.
 */
export function baseUsername(nombres: string, apellidos = ''): string {
  const partesNombre = (nombres ?? '').trim().split(/\s+/).filter(Boolean);
  const partesApellido = (apellidos ?? '').trim().split(/\s+/).filter(Boolean);

  const capitalizar = (p: string) => {
    const limpio = limpiar(p);
    return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
  };

  // Sin apellido: usamos el primer nombre completo, que es lo más reconocible.
  if (partesApellido.length === 0) {
    const soloNombre = capitalizar(partesNombre[0] ?? '');
    return soloNombre.length >= 2 ? soloNombre : 'Usuario';
  }

  // Sin nombre: el primer apellido completo.
  if (partesNombre.length === 0) {
    const soloApellido = capitalizar(partesApellido[0]);
    return soloApellido.length >= 2 ? soloApellido : 'Usuario';
  }

  const iniciales = partesNombre
    .map((n) => limpiar(n).charAt(0).toUpperCase())
    .join('');
  const base = `${iniciales}${capitalizar(partesApellido[0])}`;
  return base.length >= 2 ? base : 'Usuario';
}

/**
 * Devuelve un username libre a partir de la base, evitando los ya ocupados.
 * "JPGarcia" ocupado -> "JPGarcia2" -> "JPGarcia3"…
 *
 * `ocupados` se pasa como Set para que la importación de 300 filas no tenga
 * que consultar la base por cada una: se cargan los existentes una sola vez y
 * se van agregando los nuevos a medida que se reservan.
 */
export function usernameLibre(base: string, ocupados: Set<string>): string {
  if (!ocupados.has(base.toLowerCase())) {
    ocupados.add(base.toLowerCase());
    return base;
  }
  let n = 2;
  while (ocupados.has(`${base}${n}`.toLowerCase())) n++;
  const elegido = `${base}${n}`;
  ocupados.add(elegido.toLowerCase());
  return elegido;
}

/**
 * El correo que guardamos en Supabase Auth cuando la persona no tiene uno.
 *
 *   JPGarcia + "amcper"  ->  "jpgarcia@amcper.nexvio.local"
 *
 * Lleva el slug de la organización porque el correo debe ser único en TODO el
 * proyecto de Supabase: dos organizaciones distintas pueden tener cada una su
 * "JPGarcia" sin chocar.
 *
 * `.local` es un dominio reservado que nunca va a existir de verdad, así que
 * ningún correo se escaparía hacia afuera por accidente. Las cuentas se crean
 * con `email_confirm: true`, de modo que Supabase no intenta enviar nada.
 */
export function correoSintetico(username: string, slugOrganizacion: string): string {
  const slug = limpiar(slugOrganizacion).toLowerCase() || 'org';
  return `${username.toLowerCase()}@${slug}.nexvio.local`;
}

/** ¿Este correo es de los que generamos nosotros (y el asistente no ve)? */
export function esCorreoSintetico(email: string): boolean {
  return email.toLowerCase().endsWith('.nexvio.local');
}

/**
 * Contraseña temporal de 8 caracteres.
 *
 * El alfabeto excluye a propósito los caracteres que se confunden al dictarlos
 * por teléfono o al copiarlos de un papel: O/0, I/l/1. Quien reparte las
 * credenciales lo va a agradecer.
 */
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export function passwordTemporal(longitud = 8): string {
  // randomInt de node: aleatoriedad criptográfica, no Math.random().
  let salida = '';
  for (let i = 0; i < longitud; i++) {
    salida += ALFABETO[randomInt(ALFABETO.length)];
  }
  return salida;
}
