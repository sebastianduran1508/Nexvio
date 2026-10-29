import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

/**
 * REGISTRO DEL TELÉFONO PARA RECIBIR AVISOS PUSH (Bloque 8.6.c).
 *
 * Para que el backend pueda mandarle una notificación a ESTE teléfono necesita
 * su "token de Expo" (ExponentPushToken[...]): la dirección del teléfono en el
 * servicio de Expo. La app lo pide al iniciar sesión y se lo manda al backend.
 *
 * ⚠️ En Expo Go (Android, desde el SDK 53) las push remotas NO existen. Por eso
 * todo esto se SALTA en Expo Go sin fallar: la app funciona normal y los avisos
 * igual llegan a la bandeja "Avisos". Cuando compilemos la app (development
 * build, al final del Módulo 8), este mismo código empieza a funcionar solo.
 *
 * expo-notifications se carga con require() DENTRO de las funciones, y solo
 * fuera de Expo Go: así ni siquiera se inicializa donde no está soportado.
 */

const CLAVE_TOKEN = 'nexvio.pushToken';

/** ¿Estamos dentro de la app Expo Go (y no en nuestra app compilada)? */
export function enExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/**
 * Pide permiso, obtiene el token y lo registra en el backend.
 * Devuelve el token, o null si no se pudo (Expo Go, permiso negado, emulador,
 * proyecto sin configurar en EAS...). Nunca lanza error: no es algo por lo que
 * la app deba fallar.
 */
export async function registrarTelefono(): Promise<string | null> {
  if (enExpoGo() || Platform.OS === 'web') return null;
  try {
    const Notifications = require('expo-notifications');
    const Device = require('expo-device');
    if (!Device.isDevice) return null; // los emuladores no reciben push

    // Android agrupa las notificaciones en "canales"; sin uno, no se muestran.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Avisos del congreso',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return null; // la persona dijo que no: se respeta

    // El "projectId" de EAS identifica nuestra app ante Expo. Existirá cuando
    // configuremos la compilación; mientras tanto no hay token posible.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
    if (!projectId) return null;

    const token: string = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await api('POST', '/dispositivos', { expo_push_token: token, plataforma: Platform.OS });
    await AsyncStorage.setItem(CLAVE_TOKEN, token);
    return token;
  } catch (e) {
    console.log('[push] no se pudo registrar el teléfono:', String(e));
    return null;
  }
}

/**
 * Al cerrar sesión: este teléfono deja de recibir avisos de esta persona.
 * Se llama ANTES de cerrar la sesión (todavía hay token para hablar con la API).
 */
export async function olvidarTelefono(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(CLAVE_TOKEN);
    if (!token) return;
    await api('POST', '/dispositivos/desactivar', { expo_push_token: token });
    await AsyncStorage.removeItem(CLAVE_TOKEN);
  } catch {
    /* si falla, el backend lo apagará cuando Expo diga que el token no sirve */
  }
}

/**
 * Qué hacer cuando la persona TOCA una notificación: se le pasa una función
 * que recibe los datos del aviso ({ congresoId, sesionId? }). Devuelve la
 * función para dejar de escuchar. En Expo Go no hace nada.
 */
export function alTocarNotificacion(
  hacer: (datos: { congresoId?: string; sesionId?: string }) => void,
): () => void {
  if (enExpoGo() || Platform.OS === 'web') return () => {};
  try {
    const Notifications = require('expo-notifications');
    // Con la app ABIERTA, mostrar igual la notificación arriba (por defecto no).
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    const sub = Notifications.addNotificationResponseReceivedListener((r: any) =>
      hacer(r?.notification?.request?.content?.data ?? {}),
    );
    return () => sub.remove();
  } catch {
    return () => {};
  }
}

// ---------------------------------------------------------------------------
// "Avisos nuevos": qué fue lo último que la persona vio en cada congreso.
// ---------------------------------------------------------------------------

const claveVisto = (congresoId: string) => `nexvio.avisosVistos.${congresoId}`;

/** La fecha del aviso más nuevo que la persona ya vio en ese congreso. */
export async function ultimoAvisoVisto(congresoId: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(claveVisto(congresoId));
  } catch {
    return null;
  }
}

/** Marcar como vistos todos los avisos hasta esa fecha. */
export async function marcarAvisosVistos(congresoId: string, hasta: string): Promise<void> {
  try {
    await AsyncStorage.setItem(claveVisto(congresoId), hasta);
  } catch {
    /* no es grave: solo se verían como nuevos otra vez */
  }
}
