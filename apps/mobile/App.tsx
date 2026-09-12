import './global.css';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

/**
 * Punto de entrada de la app. Envolvemos todo en:
 *  - SafeAreaProvider: respeta las zonas seguras (notch, barra de estado).
 *  - AuthProvider: la memoria de sesion compartida.
 *  - RootNavigator: decide login vs app segun la sesion.
 *
 * La primera línea (import './global.css') carga los tokens de NativeWind.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
