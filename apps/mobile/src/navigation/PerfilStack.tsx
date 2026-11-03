import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PerfilScreen from '../screens/PerfilScreen';
import PoliticaDatosScreen from '../screens/PoliticaDatosScreen';

/**
 * Pestaña Perfil (8.7.b): el menú de "todo lo demás" y sus pantallas.
 * En el 8.7.c se suma "Mis datos" (editar el perfil y la foto).
 */
export type PerfilStackParamList = {
  Perfil: undefined;
  PoliticaDatos: undefined;
};

const Stack = createNativeStackNavigator<PerfilStackParamList>();

export function PerfilStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Perfil" component={PerfilScreen} />
      <Stack.Screen name="PoliticaDatos" component={PoliticaDatosScreen} />
    </Stack.Navigator>
  );
}
