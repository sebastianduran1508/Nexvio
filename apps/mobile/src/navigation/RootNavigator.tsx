import React, { useEffect } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import PrimerIngresoScreen from '../screens/PrimerIngresoScreen';
import { F, useTema } from '../tema/tema';
import { AppTabs } from './AppTabs';
import { alTocarNotificacion, registrarTelefono } from '../lib/push';

import { useTranslation } from 'react-i18next';
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
 * Bloque 8.7.a — el "portón" del primer ingreso. Con sesión, además se mira
 * QUIÉN es (yo, de /auth/yo):
 *  - todavía no se sabe          -> spinner;
 *  - no se pudo traer (internet) -> pantalla para reintentar;
 *  - falta cambiar la clave o aceptar la política de datos -> PrimerIngreso;
 *  - todo en orden               -> la app.
 *
 * Bloque 8.6:
 *  - Al haber sesión, registra el teléfono para recibir avisos push (en Expo
 *    Go no hace nada; ver lib/push.ts).
 *  - Al TOCAR una notificación, abre los avisos de ese congreso.
 */
export function RootNavigator() {
  const { session, loading, yo, recargarYo, signOut } = useAuth();
  const pendiente = !!yo && (yo.debe_cambiar_password || yo.requiere_aceptar_datos);
  const adentro = !!session && !!yo && !pendiente;

  // El teléfono se registra para avisos solo cuando la persona ya pasó la
  // puerta (aceptó el tratamiento de datos).
  useEffect(() => {
    if (adentro) void registrarTelefono();
  }, [adentro]);

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

  if (loading || (session && yo === undefined)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#5A46F0" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navegacion}>
      {session && yo === null ? (
        <SinConexion onReintentar={recargarYo} onSalir={signOut} />
      ) : session && pendiente ? (
        <LoginStack.Navigator screenOptions={{ headerShown: false }}>
          <LoginStack.Screen name="PrimerIngreso" component={PrimerIngresoScreen} />
        </LoginStack.Navigator>
      ) : session ? (
        <AppTabs />
      ) : (
        <LoginStack.Navigator screenOptions={{ headerShown: false }}>
          <LoginStack.Screen name="Login" component={LoginScreen} />
        </LoginStack.Navigator>
      )}
    </NavigationContainer>
  );
}

/** No se pudo saber quién es la persona (normalmente: sin internet). */
function SinConexion({ onReintentar, onSalir }: { onReintentar: () => void; onSalir: () => void }) {
  const t = useTema();
  const { t: tr } = useTranslation(); // 8.8
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: t.fondo }}>
      <Ionicons name="cloud-offline-outline" size={46} color={t.textoTenue} />
      <Text style={{ fontFamily: F.titulo, fontSize: 19, color: t.texto, marginTop: 14 }}>
        {tr('conexion.titulo')}
      </Text>
      <Text style={{ fontFamily: F.normal, fontSize: 14, color: t.textoSuave, textAlign: 'center', marginTop: 6 }}>
        {tr('conexion.texto')}
      </Text>
      <TouchableOpacity
        onPress={onReintentar}
        style={{ marginTop: 20, backgroundColor: t.primario, borderRadius: 14, paddingHorizontal: 26, paddingVertical: 12 }}
      >
        <Text style={{ fontFamily: F.semi, color: '#fff', fontSize: 15 }}>{tr('comun.reintentar')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSalir} style={{ marginTop: 14, padding: 6 }}>
        <Text style={{ fontFamily: F.medio, color: t.textoTenue }}>{tr('conexion.cerrarSesion')}</Text>
      </TouchableOpacity>
    </View>
  );
}
