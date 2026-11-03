import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CongresoDetalleScreen from '../screens/CongresoDetalleScreen';
import SesionScreen from '../screens/SesionScreen';
import NetworkingScreen from '../screens/NetworkingScreen';
import ChatScreen from '../screens/ChatScreen';
import PatrocinadoresScreen from '../screens/PatrocinadoresScreen';
import AvisosScreen from '../screens/AvisosScreen';
import type { Congreso } from '../lib/tipos';

/**
 * Pantallas (y parametros) de la pestana del congreso.
 * 8.7.b: ya no hay lista; el stack ARRANCA en el congreso de la persona.
 */
export type CongresosStackParamList = {
  CongresoDetalle: { id: string; nombre: string };
  Sesion: { sesionId: string; titulo: string };
  Networking: { congresoId: string; nombre: string };
  Chat: { conexionId: string; nombre: string };
  Patrocinadores: { congresoId: string; nombre: string };
  Avisos: { congresoId: string; nombre: string };
};

const Stack = createNativeStackNavigator<CongresosStackParamList>();

/**
 * Rediseño: cada pantalla pinta su propia cabecera con degradado (y su flecha de
 * volver), así que ocultamos la cabecera nativa en todo el stack.
 */
export function CongresosStack({ congreso }: { congreso: Congreso }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="CongresoDetalle"
        component={CongresoDetalleScreen}
        initialParams={{ id: congreso.id, nombre: congreso.nombre }}
      />
      <Stack.Screen name="Sesion" component={SesionScreen} />
      <Stack.Screen name="Networking" component={NetworkingScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Patrocinadores" component={PatrocinadoresScreen} />
      <Stack.Screen name="Avisos" component={AvisosScreen} />
    </Stack.Navigator>
  );
}
