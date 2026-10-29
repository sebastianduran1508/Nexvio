import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import { AppTabs } from './AppTabs';
import { alTocarNotificacion, registrarTelefono } from '../lib/push';

const LoginStack = createNativeStackNavigator();

/**
 * Una "referencia" a la navegación para poder navegar desde FUERA de una
 * pantalla: cuando la persona toca una notificación, no estamos dentro de
 * ninguna pantalla en particular (8.6).
 */
const navegacion = createNavigationContainerRef<any>();

/**
 * Decide QUE mostrar segun el estado de sesion:
 *  - mientras carga la sesion guardada -> spinner;
 *  - sin sesion -> pantalla de Login;
 *  - con sesion -> la app con sus pestanas (AppTabs).
 *
 * Como lee el contexto, al iniciar o cerrar sesion cambia SOLO.
 *
 * Bloque 8.6:
 *  - Al haber sesión, registra el teléfono para recibir avisos push (en Expo
 *    Go no hace nada; ver lib/push.ts).
 *  - Al TOCAR una notificación, abre los avisos de ese congreso.
 */
export function RootNavigator() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (session) void registrarTelefono();
  }, [session]);

  useEffect(
    () =>
      alTocarNotificacion(({ congresoId }) => {
        if (!congresoId || !navegacion.isReady()) return;
        // Pestaña Congresos -> pantalla Avisos de ese congreso.
        navegacion.navigate('CongresosTab', {
          screen: 'Avisos',
          params: { congresoId, nombre: '' },
        });
      }),
    [],
  );

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#5A46F0" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navegacion}>
      {session ? (
        <AppTabs />
      ) : (
        <LoginStack.Navigator screenOptions={{ headerShown: false }}>
          <LoginStack.Screen name="Login" component={LoginScreen} />
        </LoginStack.Navigator>
      )}
    </NavigationContainer>
  );
}
