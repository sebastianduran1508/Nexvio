import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MiAgendaScreen from '../screens/MiAgendaScreen';
import SesionScreen from '../screens/SesionScreen';
import type { SponsorCharla } from '../lib/tipos';

/** Pestaña Mi agenda (8.7.e): mis charlas -> la charla (preguntas y encuestas). */
export type MiAgendaStackParamList = {
  MiAgenda: { congresoId: string };
  // 8.7.f: el sponsor viaja con la charla (para la franja "Patrocinada por").
  Sesion: { sesionId: string; titulo: string; sponsors?: SponsorCharla[] };
};

const Stack = createNativeStackNavigator<MiAgendaStackParamList>();

export function MiAgendaStack({ congresoId }: { congresoId: string }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MiAgenda" component={MiAgendaScreen} initialParams={{ congresoId }} />
      <Stack.Screen name="Sesion" component={SesionScreen} />
    </Stack.Navigator>
  );
}
