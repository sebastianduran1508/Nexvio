import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CongresosScreen from '../screens/CongresosScreen';
import CongresoDetalleScreen from '../screens/CongresoDetalleScreen';
import SesionScreen from '../screens/SesionScreen';
import NetworkingScreen from '../screens/NetworkingScreen';
import ChatScreen from '../screens/ChatScreen';
import BotonSalir from '../components/BotonSalir';

/** Pantallas (y parametros) de la pestana Congresos: lista -> detalle. */
export type CongresosStackParamList = {
  Congresos: undefined;
  CongresoDetalle: { id: string; nombre: string };
  Sesion: { sesionId: string; titulo: string };
  Networking: { congresoId: string; nombre: string };
  Chat: { conexionId: string; nombre: string };
};

const Stack = createNativeStackNavigator<CongresosStackParamList>();

export function CongresosStack() {
  return (
    <Stack.Navigator screenOptions={{ headerRight: () => <BotonSalir /> }}>
      <Stack.Screen
        name="Congresos"
        component={CongresosScreen}
        options={{ title: 'Congresos' }}
      />
      <Stack.Screen
        name="CongresoDetalle"
        component={CongresoDetalleScreen}
        // El titulo de la cabecera es el nombre del congreso (viene por params).
        options={({ route }) => ({ title: route.params.nombre })}
      />
      <Stack.Screen
        name="Sesion"
        component={SesionScreen}
        options={({ route }) => ({ title: route.params.titulo })}
      />
      <Stack.Screen
        name="Networking"
        component={NetworkingScreen}
        options={{ title: 'Networking' }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({ title: route.params.nombre })}
      />
    </Stack.Navigator>
  );
}
