import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NetworkingScreen from '../screens/NetworkingScreen';
import PerfilPersonaScreen from '../screens/PerfilPersonaScreen';
import ChatScreen from '../screens/ChatScreen';
import type { TarjetaPersona } from '../lib/tipos';

/**
 * Pestaña Networking (8.7.d): Descubrir/Explorar/Conexiones -> perfil completo
 * de una persona -> chat.
 */
export type NetworkingStackParamList = {
  Networking: { congresoId: string };
  PerfilPersona: { persona: TarjetaPersona; congresoId: string; sinCuenta?: boolean };
  // otroId: la otra persona, para abrir su perfil desde el chat.
  Chat: { conexionId: string; nombre: string; foto?: string | null; otroId?: string };
};

const Stack = createNativeStackNavigator<NetworkingStackParamList>();

export function NetworkingStack({ congresoId }: { congresoId: string }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Networking" component={NetworkingScreen} initialParams={{ congresoId }} />
      <Stack.Screen name="PerfilPersona" component={PerfilPersonaScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}
