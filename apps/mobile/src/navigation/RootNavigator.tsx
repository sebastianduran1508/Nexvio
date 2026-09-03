import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import { AppTabs } from './AppTabs';

const LoginStack = createNativeStackNavigator();

/**
 * Decide QUE mostrar segun el estado de sesion:
 *  - mientras carga la sesion guardada -> spinner;
 *  - sin sesion -> pantalla de Login;
 *  - con sesion -> la app con sus pestanas (AppTabs).
 *
 * Como lee el contexto, al iniciar o cerrar sesion cambia SOLO.
 */
export function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
