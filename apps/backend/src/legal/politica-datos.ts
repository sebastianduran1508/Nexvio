import type { Idioma } from '../idioma/idioma';

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
// 8.8 (decisión 35): la política también en INGLÉS y PORTUGUÉS, con la
// cláusula "si hay diferencias, prevalece la versión en español" (sección 8).
// NO se subió la versión: traducir no cambia qué se hace con los datos (no es
// un cambio sustancial, Decreto 1377) y subirla obligaría a todos a aceptar de
// nuevo. Si el asesor legal del cliente opina distinto, se sube aquí.
export const POLITICA_DATOS_VERSION = '2026-11-v4';
const VIGENTE_DESDE: Record<Idioma, string> = {
  es: '3 de noviembre de 2026',
  en: 'November 3, 2026',
  pt: '3 de novembro de 2026',
};

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

/** Lo que cambia según la organización: se arma una vez y lo usan los 3 idiomas. */
type Variables = {
  org: string;
  identificacion: string;
  ubicacion: string;
  correo: string | null;
  telefono: string | null;
  area: string | null;
  vigente: string;
};

/**
 * La política en el idioma pedido (8.8). Por defecto, español (el panel y
 * cualquier petición que no diga idioma). El TEXTO VINCULANTE es el español
 * (sección 8); el inglés y el portugués son traducciones para entenderla.
 */
export function politicaDatos(o: DatosResponsable, idioma: Idioma = 'es'): PoliticaDatos {
  const org = o.legal_razon_social || o.nombre || TEXTOS[idioma].orgGenerica;
  const v: Variables = {
    org,
    identificacion: [org, o.legal_nit ? `NIT ${o.legal_nit}` : null].filter(Boolean).join(', '),
    ubicacion: [o.legal_direccion, o.legal_ciudad].filter(Boolean).join(', '),
    correo: o.legal_correo || null,
    telefono: o.legal_telefono || null,
    area: o.legal_area || null,
    vigente: VIGENTE_DESDE[idioma],
  };
  const t = TEXTOS[idioma];
  return {
    version: POLITICA_DATOS_VERSION,
    vigente_desde: v.vigente,
    responsable: org,
    url_politica: o.legal_url_politica || null,
    resumen: t.resumen(v),
    secciones: t.secciones(v),
  };
}

type Textos = {
  orgGenerica: string;
  resumen: (v: Variables) => string[];
  secciones: (v: Variables) => { titulo: string; parrafos: string[] }[];
};

const TEXTOS: Record<Idioma, Textos> = {
  // ===================== ESPAÑOL (texto vinculante) =====================
  es: {
    orgGenerica: 'la organización del congreso',
    resumen: (v) => [
      `${v.org} es responsable de tus datos; Nexvio los trata por su cuenta.`,
      'Se usan para tu acceso al congreso, la agenda, los avisos, la participación en vivo y el networking.',
      'En networking otros asistentes ven tu nombre, foto, cargo, empresa, país y, si las agregas, tu descripción y tu edad.',
      'Puedes consultar, actualizar y rectificar tus datos, pedir que se borren o revocar esta autorización desde tu Perfil.',
    ],
    secciones: (v) => {
      const contacto = [v.correo ? `correo ${v.correo}` : null, v.telefono ? `teléfono ${v.telefono}` : null].filter(Boolean).join(' · ');
      return [
        {
          titulo: '1. Responsable y encargado',
          parrafos: [
            `Responsable del tratamiento: ${v.identificacion}.` +
              (v.ubicacion ? ` Domicilio y dirección: ${v.ubicacion}.` : '') +
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
            `Área responsable de atender consultas y reclamos: ${v.area ?? 'el equipo organizador del congreso'}.`,
            'Desde la app: en Perfil → Mis datos puedes consultar y actualizar tu información; en Perfil → Tratamiento de datos puedes ver la fecha de tu autorización, revocarla (dejas de usar la app hasta que vuelvas a aceptar) o pedir la supresión de tus datos.',
            `También ${v.correo ? `escribiendo a ${v.correo}` : 'a través del organizador del congreso'}, indicando tu nombre, tu documento y lo que solicitas.`,
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
            `Esta política rige desde el ${v.vigente}. Tus datos se conservan mientras dure tu relación con el congreso y el tiempo adicional que exija la ley, o hasta que pidas su supresión.`,
            'Si la política cambia de forma importante, te lo avisaremos y te pediremos aceptarla de nuevo antes de aplicarla.',
          ],
        },
        {
          titulo: '8. Idioma',
          parrafos: [
            'Esta política también está disponible en inglés y en portugués para facilitar su comprensión. Si hubiera alguna diferencia entre versiones, prevalece la versión en español.',
          ],
        },
      ];
    },
  },

  // ===================== ENGLISH (translation) =====================
  en: {
    orgGenerica: 'the congress organizer',
    resumen: (v) => [
      `${v.org} is responsible for your data; Nexvio processes it on its behalf.`,
      'It is used for your access to the congress, the agenda, announcements, live participation and networking.',
      'In networking, other attendees see your name, photo, role, company, country and, if you add them, your description and age.',
      'You can view, update and correct your data, request its deletion or revoke this authorization from your Profile.',
    ],
    secciones: (v) => {
      const contacto = [v.correo ? `email ${v.correo}` : null, v.telefono ? `phone ${v.telefono}` : null].filter(Boolean).join(' · ');
      return [
        {
          titulo: '1. Data controller and processor',
          parrafos: [
            `Data controller: ${v.identificacion}.` +
              (v.ubicacion ? ` Address: ${v.ubicacion}.` : '') +
              (contacto ? ` Contact: ${contacto}.` : ''),
            'Nexvio acts as data processor: it provides the technology platform and processes data only on behalf of, and following the instructions of, the data controller.',
          ],
        },
        {
          titulo: '2. What data we process',
          parrafos: [
            'Identification: first names, last names, ID type and number.',
            'Contact and professional profile: email, phone, role, company, country and, if you upload it, your photo.',
            'If you choose to add them: a description about you and your year of birth (only the year: networking shows your age, never the date), a contact email and your LinkedIn profile.',
            'Your activity in the app: questions to speakers, poll answers, networking messages and talks you save to your agenda.',
            'We do not request sensitive data. If a poll ever asked for it, answering would always be optional.',
          ],
        },
        {
          titulo: '3. What we use it for',
          parrafos: [
            'Managing your registration and your access to the congress.',
            'Showing you the agenda, speakers and sponsors, and sending you announcements about the event.',
            'Enabling live participation (questions and polls).',
            'Networking: showing your profile (name, photo, role, company, country and, if you added them, your description and age) to other attendees of the SAME congress, and enabling chat when both show interest.',
            'Contact with your connections: ONLY if you turn on "Share my contact", the people you matched with will see your phone, contact email and LinkedIn. You can turn it off at any time.',
            'Producing aggregated event statistics for the organizer.',
          ],
        },
        {
          titulo: '4. Your rights',
          parrafos: [
            'To know, update and correct your data; request proof of this authorization; be informed about its use; revoke the authorization and/or request the deletion of your data when there is no legal or contractual duty to keep it; access it free of charge; and file complaints with the Superintendence of Industry and Commerce of Colombia (art. 8, Law 1581 of 2012).',
          ],
        },
        {
          titulo: '5. How to exercise them',
          parrafos: [
            `Area in charge of inquiries and claims: ${v.area ?? 'the congress organizing team'}.`,
            'From the app: in Profile → My details you can view and update your information; in Profile → Data processing you can see the date of your authorization, revoke it (you stop using the app until you accept again) or request the deletion of your data.',
            `Also ${v.correo ? `by writing to ${v.correo}` : 'through the congress organizer'}, stating your name, your ID document and your request.`,
            'Inquiries are answered within 10 business days at most, and claims (such as deletion) within 15 business days at most (arts. 14 and 15, Law 1581).',
          ],
        },
        {
          titulo: '6. Security and storage',
          parrafos: [
            'Data is stored with isolation per organization and restricted access. It may be hosted on servers of cloud providers located outside Colombia, with appropriate security measures.',
          ],
        },
        {
          titulo: '7. Validity',
          parrafos: [
            `This policy is in force since ${v.vigente}. Your data is kept for as long as your relationship with the congress lasts and any additional time required by law, or until you request its deletion.`,
            'If the policy changes significantly, we will let you know and ask you to accept it again before applying it.',
          ],
        },
        {
          titulo: '8. Language',
          parrafos: [
            'This policy is also available in English and Portuguese to make it easier to understand. In case of any difference between versions, the Spanish version prevails.',
          ],
        },
      ];
    },
  },

  // ===================== PORTUGUÊS (tradução) =====================
  pt: {
    orgGenerica: 'a organização do congresso',
    resumen: (v) => [
      `${v.org} é responsável pelos seus dados; a Nexvio os trata em nome dela.`,
      'Eles são usados para o seu acesso ao congresso, a agenda, os avisos, a participação ao vivo e o networking.',
      'No networking, outros participantes veem seu nome, foto, cargo, empresa, país e, se você adicionar, sua descrição e sua idade.',
      'Você pode consultar, atualizar e corrigir seus dados, pedir a exclusão ou revogar esta autorização no seu Perfil.',
    ],
    secciones: (v) => {
      const contacto = [v.correo ? `e-mail ${v.correo}` : null, v.telefono ? `telefone ${v.telefono}` : null].filter(Boolean).join(' · ');
      return [
        {
          titulo: '1. Controlador e operador',
          parrafos: [
            `Controlador dos dados: ${v.identificacion}.` +
              (v.ubicacion ? ` Endereço: ${v.ubicacion}.` : '') +
              (contacto ? ` Contato: ${contacto}.` : ''),
            'A Nexvio atua como operadora: fornece a plataforma tecnológica e trata os dados apenas em nome do controlador e seguindo suas instruções.',
          ],
        },
        {
          titulo: '2. Quais dados tratamos',
          parrafos: [
            'Identificação: nomes, sobrenomes, tipo e número de documento.',
            'Contato e perfil profissional: e-mail, telefone, cargo, empresa, país e, se você enviar, sua foto.',
            'Se você decidir adicionar: uma descrição sobre você e seu ano de nascimento (só o ano: no networking aparece sua idade, nunca a data), um e-mail de contato e seu perfil do LinkedIn.',
            'Sua atividade no app: perguntas aos palestrantes, respostas a enquetes, mensagens de networking e palestras que você salva na agenda.',
            'Não solicitamos dados sensíveis. Se alguma enquete chegar a perguntar por eles, responder será sempre opcional.',
          ],
        },
        {
          titulo: '3. Para que os usamos',
          parrafos: [
            'Gerenciar sua inscrição e seu acesso ao congresso.',
            'Mostrar a agenda, os palestrantes e os patrocinadores, e enviar avisos sobre o evento.',
            'Permitir a participação ao vivo (perguntas e enquetes).',
            'Networking: mostrar seu perfil (nome, foto, cargo, empresa, país e, se você adicionou, sua descrição e sua idade) a outros participantes do MESMO congresso e permitir o chat quando ambos demonstram interesse.',
            'Contato com suas conexões: SOMENTE se você ativar "Compartilhar meu contato", as pessoas com quem você deu match verão seu telefone, seu e-mail de contato e seu LinkedIn. Você pode desativar quando quiser.',
            'Gerar estatísticas agregadas do evento para a organização.',
          ],
        },
        {
          titulo: '4. Seus direitos',
          parrafos: [
            'Conhecer, atualizar e corrigir seus dados; solicitar prova desta autorização; ser informado sobre seu uso; revogar a autorização e/ou pedir a exclusão dos seus dados quando não houver dever legal ou contratual de conservá-los; acessá-los gratuitamente; e apresentar reclamações à Superintendência de Indústria e Comércio da Colômbia (art. 8, Lei 1581 de 2012).',
          ],
        },
        {
          titulo: '5. Como exercê-los',
          parrafos: [
            `Área responsável por atender consultas e reclamações: ${v.area ?? 'a equipe organizadora do congresso'}.`,
            'Pelo app: em Perfil → Meus dados você pode consultar e atualizar suas informações; em Perfil → Tratamento de dados pode ver a data da sua autorização, revogá-la (você deixa de usar o app até aceitar de novo) ou pedir a exclusão dos seus dados.',
            `Também ${v.correo ? `escrevendo para ${v.correo}` : 'por meio da organização do congresso'}, informando seu nome, seu documento e o que solicita.`,
            'As consultas são respondidas em no máximo 10 dias úteis, e as reclamações (como a exclusão) em no máximo 15 dias úteis (arts. 14 e 15 da Lei 1581).',
          ],
        },
        {
          titulo: '6. Segurança e armazenamento',
          parrafos: [
            'Os dados são guardados com isolamento por organização e acesso restrito. Podem ficar em servidores de provedores de nuvem localizados fora da Colômbia, com medidas de segurança adequadas.',
          ],
        },
        {
          titulo: '7. Vigência',
          parrafos: [
            `Esta política vigora desde ${v.vigente}. Seus dados são conservados enquanto durar sua relação com o congresso e pelo tempo adicional que a lei exigir, ou até que você peça a exclusão.`,
            'Se a política mudar de forma importante, avisaremos você e pediremos que a aceite novamente antes de aplicá-la.',
          ],
        },
        {
          titulo: '8. Idioma',
          parrafos: [
            'Esta política também está disponível em inglês e em português para facilitar a compreensão. Se houver alguma diferença entre as versões, prevalece a versão em espanhol.',
          ],
        },
      ];
    },
  },
};
