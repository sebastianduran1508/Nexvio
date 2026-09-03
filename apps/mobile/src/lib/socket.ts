import { io, Socket } from 'socket.io-client';
import { API_URL } from './config';
import { supabase } from './supabase';

/**
 * Crea un socket autenticado con el JWT de la sesion actual. El backend verifica
 * ese token en su middleware de Socket.io antes de aceptar la conexion.
 */
export async function crearSocket(): Promise<Socket> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return io(API_URL, { auth: { token }, transports: ['websocket'] });
}
