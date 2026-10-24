import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { CongresosStack } from './CongresosStack';
import MisCongresosScreen from '../screens/MisCongresosScreen';
import { F, useTema } from '../tema/tema';

/**
 * Las dos pestanas del asistente:
 *  - Congresos: un stack (lista -> detalle -> sesion / networking -> chat).
 *  - Mis congresos: una sola pantalla.
 *
 * Rediseño: ninguna pantalla usa la cabecera nativa; cada una pinta su propia
 * cabecera con degradado (componente <Cabecera />). Por eso headerShown: false.
 * El botón de salir vive ahora dentro de esas cabeceras.
 */
const Tab = createBottomTabNavigator();

export function AppTabs() {
  const t = useTema();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primarioTexto,
        tabBarInactiveTintColor: t.textoTenue,
        tabBarStyle: { backgroundColor: t.tarjeta, borderTopColor: t.borde },
        tabBarLabelStyle: { fontFamily: F.negrita, fontSize: 11 },
      }}
    >
      <Tab.Screen
        name="CongresosTab"
        component={CongresosStack}
        options={{
          title: 'Congresos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="MisCongresosTab"
        component={MisCongresosScreen}
        options={{
          title: 'Mis congresos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-done-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
