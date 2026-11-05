import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { CongresosStack } from './CongresosStack';
import { PerfilStack } from './PerfilStack';
import { NetworkingStack } from './NetworkingStack';
import { MiAgendaStack } from './MiAgendaStack';
import { MiAgendaProvider } from '../context/MiAgendaContext';
import { MiCongresoProvider, useMiCongreso } from '../context/MiCongresoContext';
import ElegirCongresoScreen, { SinCongresoScreen } from '../screens/ElegirCongresoScreen';
import { Cargando, Vacio } from '../components/ui';
import { F, useTema } from '../tema/tema';

/**
 * La app del asistente, una vez pasó la puerta del primer ingreso.
 *
 * Bloque 8.7.b — "ve SOLO su congreso". Las pestañas se ven SIEMPRE (ajuste
 * tras probar: así Perfil, y con él cerrar sesión, queda a mano); lo que cambia
 * es lo que muestra la pestaña Congreso:
 *  - 0 congresos -> SinCongreso;
 *  - 2+ sin elegir -> ElegirCongreso;
 *  - con su congreso -> el stack del congreso.
 *
 * Pestañas (decisión 8.7.b): lo de uso diario abajo, a la vista; lo demás en
 * Perfil.
 *   🏠 Congreso · 📅 Mi agenda (8.7.e) · 🤝 Networking (8.7.d) · 👤 Perfil
 *
 * MiAgendaProvider envuelve todo: la ⭐ de una charla se ve igual en la agenda
 * del congreso, dentro de la charla y en Mi agenda.
 *
 * Ninguna pantalla usa la cabecera nativa: cada una pinta la suya con
 * degradado (<Cabecera />). Por eso headerShown: false.
 */
const Tab = createBottomTabNavigator();

export function AppTabs() {
  return (
    <MiCongresoProvider>
      <Contenido />
    </MiCongresoProvider>
  );
}

function Contenido() {
  const t = useTema();
  const { cargando, error, congresos, actual, recargar } = useMiCongreso();

  if (cargando) return <Cargando />;
  if (error) return <ErrorCarga mensaje={error} onReintentar={recargar} />;

  return (
    <MiAgendaProvider congresoId={actual?.id}>
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primarioTexto,
        tabBarInactiveTintColor: t.textoTenue,
        tabBarStyle: { backgroundColor: t.tarjeta, borderTopColor: t.borde },
        tabBarLabelStyle: { fontFamily: F.negrita, fontSize: 11 },
      }}
    >
      {/* El nombre "CongresosTab" se conserva: la notificación push navega a él (8.6). */}
      <Tab.Screen
        name="CongresosTab"
        options={{
          title: 'Congreso',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      >
        {/* key: si cambia de congreso, el stack arranca de cero en el nuevo. */}
        {() =>
          actual ? (
            <CongresosStack key={actual.id} congreso={actual} />
          ) : congresos.length === 0 ? (
            <SinCongresoScreen />
          ) : (
            <ElegirCongresoScreen />
          )
        }
      </Tab.Screen>
      <Tab.Screen
        name="MiAgendaTab"
        options={{
          title: 'Mi agenda',
          tabBarIcon: ({ color, size }) => <Ionicons name="star-outline" color={color} size={size} />,
        }}
      >
        {() =>
          actual ? (
            <MiAgendaStack key={actual.id} congresoId={actual.id} />
          ) : (
            <View style={{ flex: 1, backgroundColor: t.fondo, justifyContent: 'center' }}>
              <Vacio icono="star-outline" texto="Elige tu congreso en la pestaña Congreso para ver tu agenda." />
            </View>
          )
        }
      </Tab.Screen>
      <Tab.Screen
        name="NetworkingTab"
        options={{
          title: 'Networking',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} />,
        }}
      >
        {() =>
          actual ? (
            <NetworkingStack key={actual.id} congresoId={actual.id} />
          ) : (
            <View style={{ flex: 1, backgroundColor: t.fondo, justifyContent: 'center' }}>
              <Vacio icono="people-outline" texto="Elige tu congreso en la pestaña Congreso para ver su networking." />
            </View>
          )
        }
      </Tab.Screen>
      <Tab.Screen
        name="PerfilTab"
        component={PerfilStack}
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
    </MiAgendaProvider>
  );
}

function ErrorCarga({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  const t = useTema();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: t.fondo }}>
      <Ionicons name="cloud-offline-outline" size={44} color={t.textoTenue} />
      <Text style={{ fontFamily: F.semi, fontSize: 15, color: t.texto, marginTop: 12, textAlign: 'center' }}>
        {mensaje}
      </Text>
      <TouchableOpacity
        onPress={onReintentar}
        style={{ marginTop: 18, backgroundColor: t.primario, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 11 }}
      >
        <Text style={{ fontFamily: F.semi, color: '#fff' }}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );
}
