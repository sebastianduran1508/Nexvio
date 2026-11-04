/**
 * Política de tratamiento de datos personales (Ley 1581 de 2012) — Bloques
 * 8.7.a y 8.7.c.
 *
 * ⚠️ BORRADOR TÉCNICO: el contenido lo debe revisar y aprobar el cliente (o su
 * asesor legal) antes de producción. Está en un solo lugar a propósito: si
 * cambia de FONDO, se edita aquí y se SUBE LA VERSIÓN; con eso la app vuelve a
 * pedir la aceptación a todos (Decreto 1377, art. 13: los cambios sustanciales
 * se comunican antes de aplicarlos). Los datos de contacto de la organización
 * (que ella misma actualiza) no obligan a subir la versión.
 *
 * Quién es quién (vocabulario de la ley):
 *  - RESPONSABLE: la organización que hace el congreso (decide qué se hace con
 *    los datos; ella nos envía el Excel).
 *  - ENCARGADO: Nexvio, la plataforma que trata los datos por cuenta de ella.
 *
 * Contenido mínimo del art. 13 del Decreto 1377 de 2013 y dónde está:
 *  a) responsable: razón social, domicilio, dirección, correo, teléfono -> 1
 *  b) tratamiento y finalidad -> 2 y 3      c) derechos del titular -> 4
 *  d) área que atiende consultas y reclamos -> 5
 *  e) procedimiento para ejercer los derechos -> 5
 *  f) entrada en vigencia y vigencia de la base de datos -> 7
 */

// v2 (8.7.c): datos del responsable, área que atiende, procedimiento en la app
// y fecha de vigencia.
// v3 (8.7.c, ajustes): descripción y edad (año de nacimiento) opcionales, que
// se muestran en el networking.
// v4 (8.7.d): compartir el contacto (teléfono, correo y LinkedIn) con las
// conexiones, solo si la persona lo activa.
export const POLITICA_DATOS_VERSION = '2026-11-v4';
const VIGENTE_DESDE = '3 de noviembre de 2026';

export type PoliticaDatos = {
  version: string;
  vigente_desde: string;
  responsable: string;
  resumen: string[];
  secciones: { titulo: string; parrafos: string[] }[];
  /** Su política completa, si la organización la tiene publicada. */
  url_politica: string | null;
};

/** Lo que se necesita de la organización (sus "datos legales"). */
export type DatosResponsable = {
  nombre: string;
  legal_razon_social?: string | null;
  legal_nit?: string | null;
  legal_direccion?: string | null;
  legal_ciudad?: string | null;
  legal_correo?: string | null;
  legal_telefono?: string | null;
  legal_area?: string | null;
  legal_url_politica?: string | null;
};

export function politicaDatos(o: DatosResponsable): PoliticaDatos {
  const org = o.legal_razon_social || o.nombre || 'la organización del congreso';
  const identificacion = [org, o.legal_nit ? `NIT ${o.legal_nit}` : null].filter(Boolean).join(', ');
  const ubicacion = [o.legal_direccion, o.legal_ciudad].filter(Boolean).join(', ');
  const contacto = [
    o.legal_correo ? `correo ${o.legal_correo}` : null,
    o.legal_telefono ? `teléfono ${o.legal_telefono}` : null,
  ].filter(Boolean).join(' · ');
  const area = o.legal_area || 'el equipo organizador del congreso';
  const canal = o.legal_correo
    ? `escribiendo a ${o.legal_correo}`
    : 'a través del organizador del congreso';

  return {
    version: POLITICA_DATOS_VERSION,
    vigente_desde: VIGENTE_DESDE,
    responsable: org,
    url_politica: o.legal_url_politica || null,
    resumen: [
      `${org} es responsable de tus datos; Nexvio los trata por su cuenta.`,
      'Se usan para tu acceso al congreso, la agenda, los avisos, la participación en vivo y el networking.',
      'En networking otros asistentes ven tu nombre, foto, cargo, empresa, país y, si las agregas, tu descripción y tu edad.',
      'Puedes consultar, actualizar y rectificar tus datos, pedir que se borren o revocar esta autorización desde tu Perfil.',
    ],
    secciones: [
      {
        titulo: '1. Responsable y encargado',
        parrafos: [
          `Responsable del tratamiento: ${identificacion}.` +
            (ubicacion ? ` Domicilio y dirección: ${ubicacion}.` : '') +
            (contacto ? ` Contacto: ${contacto}.` : ''),
          'Nexvio actúa como encargado: presta la plataforma tecnológica y trata los datos solo por cuenta y siguiendo las instrucciones del responsable.',
        ],
      },
      {
        titulo: '2. Qué datos tratamos',
        parrafos: [
          'Identificación: nombres, apellidos, tipo y número de documento.',
          'Contacto y perfil profesional: correo, teléfono, cargo, empresa, país y, si la subes, tu foto.',
          'Si decides agregarlos: una descripción sobre ti y tu año de nacimiento (solo el año: en el networking se muestra tu edad, nunca la fecha), un correo de contacto y tu perfil de LinkedIn.',
          'Tu actividad en la app: preguntas a los ponentes, respuestas a encuestas, mensajes de networking y charlas que marcas en tu agenda.',
          'No solicitamos datos sensibles. Si alguna encuesta llegara a preguntar por ellos, responderla es siempre opcional.',
        ],
      },
      {
        titulo: '3. Para qué los usamos',
        parrafos: [
          'Gestionar tu inscripción y tu acceso al congreso.',
          'Mostrarte la agenda, los ponentes y los patrocinadores, y enviarte avisos sobre el evento.',
          'Permitir la participación en vivo (preguntas y encuestas).',
          'Networking: mostrar tu perfil (nombre, foto, cargo, empresa, país y, si los agregaste, tu descripción y tu edad) a otros asistentes del MISMO congreso y permitir el chat cuando ambos muestran interés.',
          'Contacto con tus conexiones: SOLO si activas "Compartir mi contacto", las personas con las que hiciste match verán tu teléfono, tu correo de contacto y tu LinkedIn. Puedes desactivarlo cuando quieras.',
          'Generar estadísticas agregadas del evento para el organizador.',
        ],
      },
      {
        titulo: '4. Tus derechos',
        parrafos: [
          'Conocer, actualizar y rectificar tus datos; solicitar prueba de esta autorización; ser informado sobre su uso; revocar la autorización y/o pedir la supresión de tus datos cuando no exista un deber legal o contractual de conservarlos; acceder a ellos gratuitamente; y presentar quejas ante la Superintendencia de Industria y Comercio (art. 8, Ley 1581 de 2012).',
        ],
      },
      {
        titulo: '5. Cómo ejercerlos',
        parrafos: [
          `Área responsable de atender consultas y reclamos: ${area}.`,
          'Desde la app: en Perfil → Mis datos puedes consultar y actualizar tu información; en Perfil → Tratamiento de datos puedes ver la fecha de tu autorización, revocarla (dejas de usar la app hasta que vuelvas a aceptar) o pedir la supresión de tus datos.',
          `También ${canal}, indicando tu nombre, tu documento y lo que solicitas.`,
          'Las consultas se responden en máximo 10 días hábiles y los reclamos (como la supresión) en máximo 15 días hábiles (arts. 14 y 15 de la Ley 1581).',
        ],
      },
      {
        titulo: '6. Seguridad y almacenamiento',
        parrafos: [
          'Los datos se guardan con aislamiento por organización y acceso restringido. Pueden alojarse en servidores de proveedores de nube ubicados fuera de Colombia, con medidas de seguridad adecuadas.',
        ],
      },
      {
        titulo: '7. Vigencia',
        parrafos: [
          `Esta política rige desde el ${VIGENTE_DESDE}. Tus datos se conservan mientras dure tu relación con el congreso y el tiempo adicional que exija la ley, o hasta que pidas su supresión.`,
          'Si la política cambia de forma importante, te lo avisaremos y te pediremos aceptarla de nuevo antes de aplicarla.',
        ],
      },
    ],
  };
}
