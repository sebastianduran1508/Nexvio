import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CongresosScreen from '../screens/CongresosScreen';
import CongresoDetalleScreen from '../screens/CongresoDetalleScreen';
import SesionScreen from '../screens/SesionScreen';
import NetworkingScreen from '../screens/NetworkingScreen';
import ChatScreen from '../screens/ChatScreen';

/** Pantallas (y parametros) de la pestana Congresos: lista -> detalle. */
export type CongresosStackParamList = {
  Congresos: undefined;
  CongresoDetalle: { id: string; nombre: string };
  Sesion: { sesionId: string; titulo: string };
  Networking: { congresoId: string; nombre: string };
  Chat: { conexionId: string; nombre: string };
};

const Stack = createNativeStackNavigator<CongresosStackParamList>();

/**
 * Rediseño: cada pantalla pinta su propia cabecera con degradado (y su flecha de
 * volver), así que ocultamos la cabecera nativa en todo el stack.
 */
export function CongresosStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Congresos" component={CongresosScreen} />
      <Stack.Screen name="CongresoDetalle" component={CongresoDetalleScreen} />
      <Stack.Screen name="Sesion" component={SesionScreen} />
      <Stack.Screen name="Networking" component={NetworkingScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}
