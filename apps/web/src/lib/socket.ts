import { io, Socket } from 'socket.io-client';
import { supabase, API_URL } from './supabase';

/** Crea un socket autenticado con el JWT de la sesion actual. */
export async function crearSocket(): Promise<Socket> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return io(API_URL, { auth: { token }, transports: ['websocket'] });
}
