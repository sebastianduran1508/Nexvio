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
import { BarraPestanas } from '../components/BarraPestanas';
import { F, useTema } from '../tema/tema';
import { useTranslation } from 'react-i18next';

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
 *
 * 8.7.j: la barra de abajo es nuestra (<BarraPestanas />, violeta y
 * flotante). La pestaña activa usa el ícono RELLENO; las demás, el de contorno.
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
  // 8.8: textos según el idioma. (Ojo: aquí `t` ya es el tema; el traductor se llama `tr`.)
  const { t: tr } = useTranslation();
  const { cargando, error, actual, recargar } = useMiCongreso();

  if (cargando) return <Cargando />;
  if (error) return <ErrorCarga mensaje={error} onReintentar={recargar} />;

  return (
    <MiAgendaProvider congresoId={actual?.id}>
    <Tab.Navigator
      tabBar={(props) => <BarraPestanas {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.fondo } }}
    >
      {/* El nombre "CongresosTab" se conserva: la notificación push navega a él (8.6). */}
      <Tab.Screen
        name="CongresosTab"
        options={{
          title: tr('tabs.congreso'),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} />,
        }}
      >
        {() => <PestanaCongreso />}
      </Tab.Screen>
      <Tab.Screen
        name="MiAgendaTab"
        options={{
          title: tr('tabs.miAgenda'),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'star' : 'star-outline'} color={color} size={size} />,
        }}
      >
        {() => <PestanaMiAgenda />}
      </Tab.Screen>
      <Tab.Screen
        name="NetworkingTab"
        options={{
          title: tr('tabs.networking'),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'people' : 'people-outline'} color={color} size={size} />,
        }}
      >
        {() => <PestanaNetworking />}
      </Tab.Screen>
      <Tab.Screen
        name="PerfilTab"
        component={PerfilStack}
        options={{
          title: tr('tabs.perfil'),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
    </MiAgendaProvider>
  );
}

/*
 * 8.10 (fix, 12-nov): el contenido de cada pestaña LEE el congreso actual por su
 * cuenta (useMiCongreso) en vez de recibirlo "atrapado" en la función de
 * <Tab.Screen>. React Navigation no vuelve a dibujar las pestañas solo porque
 * cambió un dato de afuera, así que al elegir otro congreso desde el Perfil
 * (decisión 40) las otras pestañas seguían mostrando el anterior hasta reabrir
 * la app. Un componente que usa el contexto se redibuja siempre que el contexto
 * cambia, y la `key` hace que el stack arranque de cero en el congreso nuevo.
 */
function PestanaCongreso() {
  const { actual, congresos } = useMiCongreso();
  if (actual) return <CongresosStack key={actual.id} congreso={actual} />;
  return congresos.length === 0 ? <SinCongresoScreen /> : <ElegirCongresoScreen />;
}

function PestanaMiAgenda() {
  const t = useTema();
  const { t: tr } = useTranslation();
  const { actual } = useMiCongreso();
  if (actual) return <MiAgendaStack key={actual.id} congresoId={actual.id} />;
  return (
    <View style={{ flex: 1, backgroundColor: t.fondo, justifyContent: 'center' }}>
      <Vacio icono="star-outline" texto={tr('miCongreso.vacioAgenda')} />
    </View>
  );
}

function PestanaNetworking() {
  const t = useTema();
  const { t: tr } = useTranslation();
  const { actual } = useMiCongreso();
  if (actual) return <NetworkingStack key={actual.id} congresoId={actual.id} />;
  return (
    <View style={{ flex: 1, backgroundColor: t.fondo, justifyContent: 'center' }}>
      <Vacio icono="people-outline" texto={tr('miCongreso.vacioNetworking')} />
    </View>
  );
}

function ErrorCarga({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  const t = useTema();
  const { t: tr } = useTranslation();
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
        <Text style={{ fontFamily: F.semi, color: '#fff' }}>{tr('comun.reintentar')}</Text>
      </TouchableOpacity>
    </View>
  );
}
