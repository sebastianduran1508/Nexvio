import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { CongresosStack } from './CongresosStack';
import MisCongresosScreen from '../screens/MisCongresosScreen';
import BotonSalir from '../components/BotonSalir';

/**
 * Las dos pestanas del asistente:
 *  - Congresos: un stack (lista -> detalle). Sus pantallas ya traen cabecera
 *    propia, por eso la pestana la oculta (headerShown: false) para no duplicarla.
 *  - Mis congresos: una sola pantalla; aqui SI mostramos cabecera con el boton Salir.
 */
const Tab = createBottomTabNavigator();

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, tabBarActiveTintColor: '#4f46e5' }}
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
          headerShown: true,
          headerRight: () => <BotonSalir />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-done-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
