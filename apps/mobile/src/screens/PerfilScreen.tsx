import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useMiCongreso } from '../context/MiCongresoContext';
import { rangoFechas } from '../lib/formato';
import { Avatar, Boton, Tarjeta, TituloSeccion } from '../components/ui';
import { DEGRADADO, F, useTema } from '../tema/tema';
import type { PerfilStackParamList } from '../navigation/PerfilStack';

type Props = NativeStackScreenProps<PerfilStackParamList, 'Perfil'>;

/**
 * PERFIL (8.7.b) — la pestaña de "todo lo demás".
 *
 * Patrón de casi todas las apps: lo que se usa a diario va en las pestañas de
 * abajo; lo que se usa de vez en cuando (congreso, privacidad, ayuda, salir)
 * vive aquí. Se irá llenando:
 *  - 8.7.c: foto y "Mis datos" (editar cargo, empresa, teléfono, país).
 *  - 8.7.d: "No aparecer en networking".
 *  - 8.7.g: Apariencia (claro / oscuro).
 */
export default function PerfilScreen({ navigation }: Props) {
  const { yo, signOut } = useAuth();
  const { actual, congresos, cambiar } = useMiCongreso();
  const t = useTema();
  const insets = useSafeAreaInsets();
  const nombre = [yo?.nombre, yo?.apellidos].filter(Boolean).join(' ');
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.fondo }} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* ---------- Encabezado con la persona ---------- */}
      <LinearGradient
        colors={DEGRADADO}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[est.hero, { paddingTop: insets.top + 28 }]}
      >
        <View style={[est.circulo, { width: 220, height: 220, right: -70, top: -70 }]} />
        <View style={[est.circulo, { width: 140, height: 140, left: -50, bottom: -60 }]} />
        <View style={est.avatarAro}>
          <Avatar nombre={nombre || '?'} tamano={88} />
        </View>
        <Text style={est.nombre}>{nombre}</Text>
        {yo?.username ? <Text style={est.usuario}>@{yo.username}</Text> : null}
      </LinearGradient>

      <View style={{ paddingHorizontal: 20 }}>
        {/* ---------- Congreso ---------- */}
        <TituloSeccion texto="Tu congreso" />
        <Tarjeta style={est.grupo}>
          <Fila
            icono="calendar"
            titulo={actual?.nombre ?? '—'}
            subtitulo={actual ? rangoFechas(actual.fecha_inicio, actual.fecha_fin) : undefined}
          />
          {congresos.length > 1 && (
            <>
              <Separador />
              <Fila
                icono="swap-horizontal"
                titulo="Cambiar de congreso"
                subtitulo={`Estás inscrito en ${congresos.length}`}
                onPress={cambiar}
              />
            </>
          )}
        </Tarjeta>

        {/* ---------- Privacidad ---------- */}
        <TituloSeccion texto="Privacidad" />
        <Tarjeta style={est.grupo}>
          <Fila
            icono="shield-checkmark"
            titulo="Tratamiento de datos"
            subtitulo={
              yo?.acepto_datos_en
                ? `Autorizado el ${fechaLocal(yo.acepto_datos_en)}`
                : 'Política de datos personales'
            }
            onPress={() => navigation.navigate('PoliticaDatos')}
          />
        </Tarjeta>

        {/* ---------- Ayuda ---------- */}
        <TituloSeccion texto="Ayuda" />
        <Tarjeta style={est.grupo}>
          <Fila
            icono="help-buoy"
            titulo="¿Necesitas ayuda?"
            subtitulo="Escríbele al organizador de tu congreso"
          />
          <Separador />
          <Fila icono="information-circle" titulo="Acerca de Nexvio" subtitulo={`Versión ${version}`} />
        </Tarjeta>

        <Boton
          texto="Cerrar sesión"
          icono="log-out-outline"
          variante="peligro"
          onPress={() => void signOut()}
          style={{ marginTop: 26 }}
        />
      </View>
    </ScrollView>
  );
}

/** Fecha y día en la zona del teléfono: "30 oct 2026". */
function fechaLocal(iso: string) {
  return new Date(iso)
    .toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(/\./g, '');
}

/** Una fila del menú: ícono en cuadrito, título, subtítulo y flecha si se toca. */
function Fila({
  icono,
  titulo,
  subtitulo,
  onPress,
}: {
  icono: React.ComponentProps<typeof Ionicons>['name'];
  titulo: string;
  subtitulo?: string;
  onPress?: () => void;
}) {
  const t = useTema();
  const contenido = (
    <>
      <View style={[est.icono, { backgroundColor: t.primarioSuave }]}>
        <Ionicons name={icono} size={18} color={t.primarioTexto} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[est.filaTitulo, { color: t.texto }]} numberOfLines={2}>
          {titulo}
        </Text>
        {subtitulo ? (
          <Text style={[est.filaSub, { color: t.textoTenue }]} numberOfLines={1}>
            {subtitulo}
          </Text>
        ) : null}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={18} color={t.textoTenue} />}
    </>
  );
  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={est.fila}>
      {contenido}
    </TouchableOpacity>
  ) : (
    <View style={est.fila}>{contenido}</View>
  );
}

function Separador() {
  const t = useTema();
  return <View style={{ height: 1, backgroundColor: t.borde, marginLeft: 62 }} />;
}

const est = StyleSheet.create({
  hero: { alignItems: 'center', paddingBottom: 30, overflow: 'hidden' },
  circulo: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  avatarAro: { padding: 4, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.35)' },
  nombre: { color: '#fff', fontFamily: F.titulo, fontSize: 22, marginTop: 14, textAlign: 'center', paddingHorizontal: 24 },
  usuario: { color: 'rgba(255,255,255,0.8)', fontFamily: F.medio, fontSize: 14, marginTop: 3 },
  grupo: { padding: 0, overflow: 'hidden' },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  icono: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  filaTitulo: { fontFamily: F.semi, fontSize: 14.5 },
  filaSub: { fontFamily: F.medio, fontSize: 12.5, marginTop: 2 },
});
