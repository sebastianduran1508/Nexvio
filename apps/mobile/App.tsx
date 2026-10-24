import './global.css';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

/**
 * Punto de entrada de la app. Envolvemos todo en:
 *  - SafeAreaProvider: respeta las zonas seguras (notch, barra de estado).
 *  - AuthProvider: la memoria de sesion compartida.
 *  - RootNavigator: decide login vs app segun la sesion.
 *
 * La primera línea (import './global.css') carga los tokens de NativeWind.
 *
 * Rediseño: antes de pintar nada cargamos las fuentes del mockup (Space Grotesk
 * para títulos, Plus Jakarta Sans para el texto). useFonts devuelve `false`
 * mientras descarga; esos milisegundos no mostramos nada para evitar que la app
 * "salte" de la fuente del sistema a la nuestra.
 */
export default function App() {
  const [fuentesListas] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  if (!fuentesListas) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
        {/* Texto blanco en la barra de estado: todas las pantallas tienen cabecera violeta. */}
        <StatusBar style="light" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
