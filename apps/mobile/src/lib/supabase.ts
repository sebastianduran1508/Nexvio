// El polyfill de URL debe importarse ANTES que supabase-js en React Native
// (RN no trae la API URL completa que la libreria necesita).
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

/**
 * Cliente de Supabase para el movil. Diferencias con el del navegador:
 *  - storage: AsyncStorage -> guarda la sesion en el almacenamiento del telefono,
 *    asi el usuario sigue logueado aunque cierre la app.
 *  - detectSessionInUrl: false -> eso es cosa de la web (magic links en la URL),
 *    no aplica en una app nativa.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
