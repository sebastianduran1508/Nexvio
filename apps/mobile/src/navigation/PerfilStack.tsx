import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PerfilScreen from '../screens/PerfilScreen';
import PoliticaDatosScreen from '../screens/PoliticaDatosScreen';
import EditarPerfilScreen from '../screens/EditarPerfilScreen';
import ComoMeVenScreen from '../screens/ComoMeVenScreen';

/**
 * Pestaña Perfil (8.7.b): el menú de "todo lo demás" y sus pantallas.
 * 8.7.c: "Mis datos" (EditarPerfil).
 */
export type PerfilStackParamList = {
  Perfil: undefined;
  PoliticaDatos: undefined;
  EditarPerfil: undefined;
  ComoMeVen: undefined; // 8.7.d
};

const Stack = createNativeStackNavigator<PerfilStackParamList>();

export function PerfilStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Perfil" component={PerfilScreen} />
      <Stack.Screen name="PoliticaDatos" component={PoliticaDatosScreen} />
      <Stack.Screen name="EditarPerfil" component={EditarPerfilScreen} />
      <Stack.Screen name="ComoMeVen" component={ComoMeVenScreen} />
    </Stack.Navigator>
  );
}
