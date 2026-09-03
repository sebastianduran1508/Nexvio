import Constants from 'expo-constants';

/**
 * URL base del backend (NestJS, puerto 3000).
 *
 * OJO: en un telefono fisico con Expo Go, "localhost" es el TELEFONO, no tu PC.
 * Por eso NO ponemos localhost: derivamos la IP de tu PC de desarrollo desde la
 * misma direccion que usa Expo/Metro para servir la app (hostUri, algo como
 * "192.168.1.20:8081"). Nos quedamos con la IP y le ponemos el puerto del backend.
 *
 * Requisito: el telefono y el PC en el MISMO WiFi, y el backend corriendo.
 */
const hostUri =
  Constants.expoConfig?.hostUri ??
  // fallbacks para distintas versiones de Expo
  (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost ??
  (Constants as any)?.manifest?.debuggerHost ??
  'localhost:8081';

const host = hostUri.split(':')[0];

export const API_URL = `http://${host}:3000`;
