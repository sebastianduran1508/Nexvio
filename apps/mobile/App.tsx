import './global.css';
import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
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
import { MarcaProvider } from './src/context/MarcaContext';
import { TemaProvider } from './src/tema/TemaProvider';
import { SplashAnimado } from './src/components/SplashAnimado';
// 8.8: idiomas (es / en / pt). Importarlo arranca i18next con el idioma del teléfono.
import { IdiomaProvider } from './src/i18n/IdiomaProvider';
import { DialogoProvider } from './src/components/Dialogo';

// 8.7.j: el splash NATIVO se queda hasta que digamos (cuando ya podemos pintar
// el animado, que es igual de violeta). Así no hay un parpadeo blanco entre los dos.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

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

  // 8.7.j: el splash animado se ve una vez, al abrir la app.
  const [intro, setIntro] = useState(true);
  const terminarIntro = useCallback(() => setIntro(false), []);
  useEffect(() => {
    // Con las fuentes listas ya se puede pintar el animado: fuera el nativo.
    if (fuentesListas) SplashScreen.hideAsync().catch(() => undefined);
  }, [fuentesListas]);

  if (!fuentesListas) return null;

  return (
    <SafeAreaProvider>
      {/* 8.8: el idioma va por fuera de todo: hasta el login se traduce. */}
      <IdiomaProvider>
      <AuthProvider>
        {/* La marca del congreso abierto (8.5): la fija el detalle y la leen sus pantallas hijas. */}
        <MarcaProvider>
          {/* 8.7.g: claro/oscuro según la persona y el congreso (dentro de
              MarcaProvider porque lee el tema que eligió el organizador). */}
          <TemaProvider>
            {/* 8.8: diálogos propios (reemplazan Alert.alert); dentro del tema y la marca */}
            <DialogoProvider>
              <RootNavigator />
            </DialogoProvider>
          </TemaProvider>
        </MarcaProvider>
        {/* Texto blanco en la barra de estado: todas las pantallas tienen cabecera violeta. */}
        <StatusBar style="light" />
        {/* 8.7.j: encima de todo; la app ya va cargando por detrás. */}
        {intro && <SplashAnimado alTerminar={terminarIntro} />}
      </AuthProvider>
      </IdiomaProvider>
    </SafeAreaProvider>
  );
}
