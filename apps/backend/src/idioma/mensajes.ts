import type { Idioma } from './idioma';

/**
 * TRADUCCIÓN DE LOS MENSAJES DE ERROR QUE VE EL ASISTENTE (8.8).
 *
 * Los servicios siguen lanzando sus errores en español, como siempre
 * (throw new NotFoundException('Congreso no encontrado')). El filtro global
 * (traducir-errores.filter.ts) busca aquí el mensaje EXACTO y, si la app pidió
 * inglés o portugués, lo cambia antes de responder.
 *
 * - Solo están los que puede ver un ASISTENTE en la app. Los del panel
 *   (organizador/superadmin) no: el panel está en español (decisión 35).
 * - Un mensaje que no esté aquí sale en español: nunca se rompe nada.
 * - Si cambias el texto de un error en un servicio, cámbialo también aquí
 *   (la clave es el texto exacto en español).
 */
export const MENSAJES: Record<string, { en: string; pt: string }> = {
  // --- No encontrado / acceso ---
  'Congreso no encontrado': { en: 'Congress not found', pt: 'Congresso não encontrado' },
  'Sesión no encontrada': { en: 'Session not found', pt: 'Sessão não encontrada' },
  'Sesion no encontrada': { en: 'Session not found', pt: 'Sessão não encontrada' },
  'Perfil no encontrado': { en: 'Profile not found', pt: 'Perfil não encontrado' },
  'Encuesta no encontrada': { en: 'Poll not found', pt: 'Enquete não encontrada' },
  'Pregunta no encontrada': { en: 'Question not found', pt: 'Pergunta não encontrada' },
  'Inscripción no encontrada': { en: 'Registration not found', pt: 'Inscrição não encontrada' },
  'Inscripcion no encontrada': { en: 'Registration not found', pt: 'Inscrição não encontrada' },
  'Conexion no encontrada': { en: 'Connection not found', pt: 'Conexão não encontrada' },
  'Usuario no encontrado': { en: 'User not found', pt: 'Usuário não encontrado' },
  'Solicitud no encontrada': { en: 'Request not found', pt: 'Solicitação não encontrada' },
  'No encontrado': { en: 'Not found', pt: 'Não encontrado' },
  'Debes estar inscrito en el congreso': { en: 'You must be registered in the congress', pt: 'Você precisa estar inscrito no congresso' },
  'Ese asistente no esta en el congreso': { en: 'That attendee is not in this congress', pt: 'Esse participante não está no congresso' },
  'Esa persona no está inscrita en este congreso': { en: 'That person is not registered in this congress', pt: 'Essa pessoa não está inscrita neste congresso' },
  // --- Sesión y permisos ---
  'Usuario o contraseña incorrectos': { en: 'Wrong username or password', pt: 'Usuário ou senha incorretos' },
  'Token inválido o expirado': { en: 'Your session expired. Please sign in again.', pt: 'Sua sessão expirou. Entre novamente.' },
  'Se requiere autenticación': { en: 'Please sign in', pt: 'Faça login para continuar' },
  'No hay un usuario autenticado': { en: 'Please sign in', pt: 'Faça login para continuar' },
  'No tienes el rol necesario para esta acción': { en: 'You don’t have permission for this action', pt: 'Você não tem permissão para esta ação' },
  'El usuario no tiene una organización asociada': { en: 'Your account has no organization', pt: 'Sua conta não tem uma organização' },
  'La contraseña nueva debe tener al menos 8 caracteres': { en: 'The new password must have at least 8 characters', pt: 'A nova senha deve ter pelo menos 8 caracteres' },
  // --- Datos personales (Ley 1581) ---
  'La política de datos se actualizó. Vuelve a leerla antes de aceptar.': {
    en: 'The data policy was updated. Please read it again before accepting.',
    pt: 'A política de dados foi atualizada. Leia-a novamente antes de aceitar.',
  },
  'No tienes una autorización vigente': { en: 'You don’t have a current authorization', pt: 'Você não tem uma autorização vigente' },
  'Ya tienes una solicitud de supresión en trámite': { en: 'You already have a deletion request in progress', pt: 'Você já tem uma solicitação de exclusão em andamento' },
  // --- Participación en vivo, agenda y networking ---
  'Ya votaste en esta encuesta': { en: 'You already voted in this poll', pt: 'Você já votou nesta enquete' },
  'La encuesta esta cerrada': { en: 'This poll is closed', pt: 'Esta enquete está encerrada' },
  'Opcion no valida': { en: 'Invalid option', pt: 'Opção inválida' },
  'Los breaks no se pueden marcar': { en: 'Breaks can’t be saved to your agenda', pt: 'Os intervalos não podem ser salvos na agenda' },
  'Se alcanzo el limite de mensajes de esta conexion': { en: 'You reached the message limit for this connection', pt: 'Vocês atingiram o limite de mensagens desta conexão' },
  'No puedes conectar contigo mismo': { en: 'You can’t connect with yourself', pt: 'Você não pode se conectar consigo mesmo' },
  'No puedes pasarte a ti mismo': { en: 'You can’t skip yourself', pt: 'Você não pode pular a si mesmo' },
  // --- Foto de perfil ---
  'No llegó ningún archivo': { en: 'No file was received', pt: 'Nenhum arquivo foi recebido' },
  'No llegó ningún archivo (campo "archivo")': { en: 'No file was received', pt: 'Nenhum arquivo foi recebido' },
  'Solo se aceptan imágenes JPG, PNG o WebP': { en: 'Only JPG, PNG or WebP images are allowed', pt: 'Só são aceitas imagens JPG, PNG ou WebP' },
  'La imagen pesa más de 2 MB': { en: 'The image is larger than 2 MB', pt: 'A imagem tem mais de 2 MB' },
  // --- Validación de "Mis datos" (DTO) ---
  'Correo de contacto inválido': { en: 'Invalid contact email', pt: 'E-mail de contato inválido' },
  'Correo inválido': { en: 'Invalid email', pt: 'E-mail inválido' },
  'Teléfono inválido': { en: 'Invalid phone number', pt: 'Telefone inválido' },
  'El teléfono solo puede tener números, espacios, +, ( ) y -': {
    en: 'The phone number can only have numbers, spaces, +, ( ) and -',
    pt: 'O telefone só pode ter números, espaços, +, ( ) e -',
  },
  'El año de nacimiento es un número de 4 cifras': { en: 'The year of birth is a 4-digit number', pt: 'O ano de nascimento é um número de 4 dígitos' },
  'Revisa el año de nacimiento': { en: 'Check the year of birth', pt: 'Confira o ano de nascimento' },
  'El código de país son 2 letras (CO, MX…)': { en: 'The country code is 2 letters (US, BR…)', pt: 'O código do país tem 2 letras (BR, CO…)' },
  'La descripción puede tener hasta 500 caracteres': { en: 'The description can have up to 500 characters', pt: 'A descrição pode ter até 500 caracteres' },
  'Pega el enlace de tu perfil de LinkedIn (https://www.linkedin.com/in/…)': {
    en: 'Paste your LinkedIn profile link (https://www.linkedin.com/in/…)',
    pt: 'Cole o link do seu perfil do LinkedIn (https://www.linkedin.com/in/…)',
  },
};

/** El mensaje en el idioma pedido (o el original si no lo conocemos). */
export function traducirMensaje(mensaje: string, idioma: Idioma): string {
  if (idioma === 'es') return mensaje;
  return MENSAJES[mensaje]?.[idioma] ?? mensaje;
}
