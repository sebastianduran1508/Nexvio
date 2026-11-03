/**
 * Política de tratamiento de datos personales (Ley 1581 de 2012) — Bloque 8.7.a.
 *
 * ⚠️ BORRADOR TÉCNICO: el contenido lo debe revisar y aprobar el cliente (o su
 * asesor legal) antes de producción. Está en un solo lugar a propósito: si
 * cambia, se edita aquí y se SUBE LA VERSIÓN; con eso la app vuelve a pedir la
 * aceptación a todos (ver AuthService.yo -> requiere_aceptar_datos).
 *
 * Quién es quién (vocabulario de la ley):
 *  - RESPONSABLE: la organización que hace el congreso (decide qué se hace con
 *    los datos; ella nos envía el Excel).
 *  - ENCARGADO: Nexvio, la plataforma que trata los datos por cuenta de ella.
 */
export const POLITICA_DATOS_VERSION = '2026-10-v1';

export type PoliticaDatos = {
  version: string;
  responsable: string;
  resumen: string[];
  secciones: { titulo: string; parrafos: string[] }[];
};

export function politicaDatos(organizacion: string): PoliticaDatos {
  const org = organizacion || 'la organización del congreso';
  return {
    version: POLITICA_DATOS_VERSION,
    responsable: org,
    resumen: [
      `${org} es responsable de tus datos; Nexvio los trata por su cuenta.`,
      'Se usan para tu acceso al congreso, la agenda, los avisos, la participación en vivo y el networking.',
      'En networking otros asistentes ven tu nombre, foto, cargo, empresa y país. Puedes ocultarte cuando quieras.',
      'Puedes conocer, actualizar, rectificar y pedir la supresión de tus datos, o revocar esta autorización.',
    ],
    secciones: [
      {
        titulo: '1. Responsable y encargado',
        parrafos: [
          `El responsable del tratamiento es ${org}, organizadora del congreso. Nexvio actúa como encargado: presta la plataforma tecnológica y trata los datos solo por cuenta y siguiendo las instrucciones del responsable.`,
        ],
      },
      {
        titulo: '2. Qué datos tratamos',
        parrafos: [
          'Identificación: nombres, apellidos, tipo y número de documento.',
          'Contacto y perfil profesional: correo, teléfono, cargo, empresa, país y, si la subes, tu foto.',
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
          'Networking: mostrar tu perfil (nombre, foto, cargo, empresa y país) a otros asistentes del MISMO congreso y permitir el chat cuando ambos muestran interés. Puedes desactivar tu aparición en cualquier momento.',
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
          `Escribe al organizador del congreso (${org}). Las consultas se responden en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles (arts. 14 y 15 de la Ley 1581).`,
        ],
      },
      {
        titulo: '6. Seguridad, almacenamiento y vigencia',
        parrafos: [
          'Los datos se guardan con aislamiento por organización y acceso restringido. Pueden alojarse en servidores de proveedores de nube ubicados fuera de Colombia, con medidas de seguridad adecuadas.',
          'Se conservan mientras dure tu relación con el congreso y el tiempo adicional que exija la ley.',
        ],
      },
    ],
  };
}
