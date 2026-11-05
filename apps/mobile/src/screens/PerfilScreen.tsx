import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useMiCongreso } from '../context/MiCongresoContext';
import { rangoFechas } from '../lib/formato';
import { api, apiSubirImagen } from '../lib/api';
import { elegirFoto } from '../lib/foto';
import type { Perfil } from '../lib/tipos';
import { Avatar, Boton, Tarjeta, TituloSeccion } from '../components/ui';
import { DEGRADADO, F, useTema } from '../tema/tema';
import { useApariencia } from '../tema/TemaProvider';
import type { PerfilStackParamList } from '../navigation/PerfilStack';

type Props = NativeStackScreenProps<PerfilStackParamList, 'Perfil'>;

/**
 * PERFIL (8.7.b) — la pestaña de "todo lo demás".
 *
 * Patrón de casi todas las apps: lo que se usa a diario va en las pestañas de
 * abajo; lo que se usa de vez en cuando (congreso, privacidad, ayuda, salir)
 * vive aquí. Se irá llenando:
 *  - 8.7.c ✅: foto (tocar el avatar: cámara, galería o quitar) y "Mis datos".
 *  - 8.7.d ✅: "¿Cómo me ven?" y el interruptor "Aparecer en networking".
 *  - 8.7.g ✅: Apariencia (como el congreso / teléfono / claro / oscuro).
 */
export default function PerfilScreen({ navigation }: Props) {
  const { yo, signOut } = useAuth();
  const { actual, congresos, cambiar } = useMiCongreso();
  const t = useTema();
  const insets = useSafeAreaInsets();
  const nombre = [yo?.nombre, yo?.apellidos].filter(Boolean).join(' ');
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const { preferencia, modo } = useApariencia();
  const textoApariencia = preferencia === 'oscuro' ? 'Oscuro' : preferencia === 'claro' ? 'Claro' : 'Por defecto';

  // 8.7.c: el perfil (para la foto y el resumen de "Mis datos"). Se recarga al
  // volver a la pantalla, por si se editó en "Mis datos".
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [menuFoto, setMenuFoto] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  useFocusEffect(
    useCallback(() => {
      api<Perfil>('GET', '/perfil').then(setPerfil).catch(() => undefined);
    }, []),
  );

  async function cambiarFoto(origen: 'camara' | 'galeria') {
    setMenuFoto(false);
    try {
      const uri = await elegirFoto(origen);
      if (!uri) return;
      setSubiendo(true);
      setPerfil(await apiSubirImagen<Perfil>('/perfil/foto', uri));
    } catch (e: any) {
      Alert.alert('No se pudo cambiar la foto', e?.message ?? 'Intenta de nuevo');
    } finally {
      setSubiendo(false);
    }
  }

  async function quitarFoto() {
    setMenuFoto(false);
    try {
      setSubiendo(true);
      setPerfil(await api<Perfil>('DELETE', '/perfil/foto'));
    } catch (e: any) {
      Alert.alert('No se pudo quitar la foto', e?.message ?? 'Intenta de nuevo');
    } finally {
      setSubiendo(false);
    }
  }

  // 8.7.d: el interruptor. Se cambia al instante en pantalla y, si el servidor
  // falla, se devuelve a como estaba.
  async function cambiarVisible(visible: boolean) {
    const antes = perfil;
    setPerfil((x) => (x ? { ...x, visible_networking: visible } : x));
    try {
      setPerfil(await api<Perfil>('PATCH', '/perfil', { visible_networking: visible }));
    } catch (e: any) {
      setPerfil(antes);
      Alert.alert('No se pudo cambiar', e?.message ?? 'Intenta de nuevo');
    }
  }

  const resumenDatos =
    [perfil?.cargo, perfil?.empresa].filter(Boolean).join(' · ') || 'Cargo, empresa, teléfono y país';

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
        <TouchableOpacity
          style={est.avatarAro}
          onPress={() => setMenuFoto(true)}
          activeOpacity={0.85}
          accessibilityLabel="Cambiar foto de perfil"
        >
          <Avatar nombre={nombre || '?'} tamano={96} foto={perfil?.foto_url} />
          {subiendo && (
            <View style={est.subiendo}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
          <View style={[est.camara, { backgroundColor: t.coral }]}>
            <Ionicons name="camera" size={15} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={est.nombre}>{nombre}</Text>
        {yo?.username ? <Text style={est.usuario}>@{yo.username}</Text> : null}
        {!perfil?.foto_url && !subiendo && (
          <Text style={est.pista}>Toca tu foto para agregar una</Text>
        )}
      </LinearGradient>

      <View style={{ paddingHorizontal: 20 }}>
        {/* ---------- Cuenta ---------- */}
        <TituloSeccion texto="Tu cuenta" />
        <Tarjeta style={est.grupo}>
          <Fila
            icono="person"
            titulo="Mis datos"
            subtitulo={resumenDatos}
            onPress={() => navigation.navigate('EditarPerfil')}
          />
        </Tarjeta>

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
                onPress={() => {
                  cambiar();
                  // El selector vive en la pestaña Congreso: vamos hacia allá.
                  navigation.getParent()?.navigate('CongresosTab');
                }}
              />
            </>
          )}
        </Tarjeta>

        {/* ---------- Privacidad ---------- */}
        {/* ---------- Networking (8.7.d) ---------- */}
        <TituloSeccion texto="Networking" />
        <Tarjeta style={est.grupo}>
          {actual && (
            <>
              <Fila
                icono="eye"
                titulo="¿Cómo me ven?"
                onPress={() => navigation.navigate('ComoMeVen')}
              />
              <Separador />
            </>
          )}
          <View style={est.fila}>
            <View style={[est.icono, { backgroundColor: t.primarioSuave }]}>
              <Ionicons name="people" size={18} color={t.primarioTexto} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[est.filaTitulo, { color: t.texto }]}>Aparecer en networking</Text>
              <Text style={[est.filaSub, { color: t.textoTenue }]} numberOfLines={2}>
                {perfil?.visible_networking === false
                  ? 'Nadie te ve. Conservas tus chats.'
                  : 'Los asistentes pueden ver tu tarjeta'}
              </Text>
            </View>
            <Switch
              value={perfil?.visible_networking !== false}
              onValueChange={cambiarVisible}
              disabled={!perfil}
              trackColor={{ true: t.primario, false: t.borde }}
              thumbColor="#fff"
            />
          </View>
        </Tarjeta>

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

        {/* ---------- Ajustes (8.7.g) ---------- */}
        <TituloSeccion texto="Ajustes" />
        <Tarjeta style={est.grupo}>
          <Fila
            icono={modo === 'oscuro' ? 'moon' : 'sunny'}
            titulo="Apariencia"
            subtitulo={textoApariencia}
            onPress={() => navigation.navigate('Apariencia')}
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

      {/* ---------- Menú de la foto (hoja desde abajo) ---------- */}
      <Modal visible={menuFoto} transparent animationType="fade" onRequestClose={() => setMenuFoto(false)}>
        <Pressable style={est.fondoHoja} onPress={() => setMenuFoto(false)}>
          <Pressable style={[est.hoja, { backgroundColor: t.tarjeta, paddingBottom: insets.bottom + 16 }]}>
            <View style={[est.agarre, { backgroundColor: t.borde }]} />
            <Text style={[est.hojaTitulo, { color: t.texto }]}>Foto de perfil</Text>
            <OpcionHoja icono="camera-outline" texto="Tomar foto" onPress={() => cambiarFoto('camara')} />
            <OpcionHoja icono="images-outline" texto="Elegir de la galería" onPress={() => cambiarFoto('galeria')} />
            {perfil?.foto_url ? (
              <OpcionHoja icono="trash-outline" texto="Quitar foto" peligro onPress={quitarFoto} />
            ) : null}
            <OpcionHoja icono="close" texto="Cancelar" onPress={() => setMenuFoto(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function OpcionHoja({
  icono,
  texto,
  onPress,
  peligro,
}: {
  icono: React.ComponentProps<typeof Ionicons>['name'];
  texto: string;
  onPress: () => void;
  peligro?: boolean;
}) {
  const t = useTema();
  const color = peligro ? t.rojo : t.texto;
  return (
    <TouchableOpacity style={est.opcion} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icono} size={21} color={peligro ? t.rojo : t.primarioTexto} />
      <Text style={[est.opcionTexto, { color }]}>{texto}</Text>
    </TouchableOpacity>
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
  avatarAro: { padding: 4, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.35)' },
  subiendo: {
    position: 'absolute', top: 4, left: 4, width: 96, height: 96, borderRadius: 31,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  camara: {
    position: 'absolute', right: -4, bottom: -4, width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff',
  },
  pista: { color: 'rgba(255,255,255,0.75)', fontFamily: F.medio, fontSize: 12.5, marginTop: 8 },
  fondoHoja: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  hoja: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10 },
  agarre: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 12 },
  hojaTitulo: { fontFamily: F.titulo, fontSize: 17, marginBottom: 6 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  opcionTexto: { fontFamily: F.semi, fontSize: 15.5 },
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
