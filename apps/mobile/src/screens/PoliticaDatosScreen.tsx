import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import type { PoliticaDatos, SolicitudDatos } from '../lib/tipos';
import { useAuth } from '../context/AuthContext';
import { Boton, Cabecera, Cargando, Tarjeta, TituloSeccion, Vacio } from '../components/ui';
import { F, useTema } from '../tema/tema';
import type { PerfilStackParamList } from '../navigation/PerfilStack';

type Props = NativeStackScreenProps<PerfilStackParamList, 'PoliticaDatos'>;

/**
 * La política de datos, siempre a mano (8.7.b).
 *
 * La Ley 1581 da derecho a conocer el uso de los datos y a pedir prueba de la
 * autorización: aquí la persona vuelve a leer lo que aceptó y ve CUÁNDO y QUÉ
 * versión.
 *
 * 8.7.c — "Tus derechos" (art. 8):
 *  - Pedir que borren mis datos: crea una solicitud que el organizador atiende
 *    en el panel (plazo legal: 15 días hábiles). Aquí se ve en qué va.
 *  - Revocar mi autorización: deja de usar la app hasta que vuelva a aceptar.
 */
export default function PoliticaDatosScreen({ navigation }: Props) {
  const { yo, signOut } = useAuth();
  const t = useTema();
  const insets = useSafeAreaInsets();
  const [politica, setPolitica] = useState<PoliticaDatos | null>(null);
  const [error, setError] = useState(false);
  const [solicitudes, setSolicitudes] = useState<SolicitudDatos[]>([]);
  const [pidiendo, setPidiendo] = useState(false); // modal de supresión
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargarSolicitudes = useCallback(() => {
    api<SolicitudDatos[]>('GET', '/perfil/solicitudes').then(setSolicitudes).catch(() => undefined);
  }, []);

  useEffect(() => {
    api<PoliticaDatos>('GET', '/auth/politica-datos')
      .then(setPolitica)
      .catch(() => setError(true));
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  const ultima = solicitudes[0]; // vienen de la más nueva a la más vieja
  const enTramite = ultima?.estado === 'pendiente';

  async function pedirSupresion() {
    setEnviando(true);
    try {
      await api('POST', '/perfil/solicitudes', motivo.trim() ? { motivo: motivo.trim() } : {});
      setPidiendo(false);
      setMotivo('');
      cargarSolicitudes();
      Alert.alert(
        'Solicitud enviada',
        `${politica?.responsable ?? 'La organización'} tiene hasta 15 días hábiles para responderte. Verás la respuesta aquí.`,
      );
    } catch (e: any) {
      Alert.alert('No se pudo enviar', e?.message ?? 'Intenta de nuevo');
    } finally {
      setEnviando(false);
    }
  }

  function revocar() {
    Alert.alert(
      '¿Revocar tu autorización?',
      'Dejaremos de usar tus datos: saldrás del networking, no recibirás avisos y se cerrará tu sesión. ' +
        'Podrás volver a usar la app cuando quieras, aceptando de nuevo la política.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revocar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api('POST', '/auth/revocar-datos');
              await signOut();
            } catch (e: any) {
              Alert.alert('No se pudo revocar', e?.message ?? 'Intenta de nuevo');
            }
          },
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <Cabecera compacta titulo="Tratamiento de datos" onAtras={() => navigation.goBack()} />
      {error ? (
        <Vacio icono="cloud-offline-outline" texto="No se pudo cargar la política. Revisa tu conexión." />
      ) : !politica ? (
        <Cargando />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }}>
          {yo?.acepto_datos_en ? (
            <View style={[est.sello, { backgroundColor: t.verdeSuave }]}>
              <Ionicons name="checkmark-circle" size={20} color={t.verde} />
              <Text style={[est.selloTexto, { color: t.verde }]}>
                Autorizaste esta política el{' '}
                {new Date(yo.acepto_datos_en).toLocaleString('es-CO', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                (versión {yo.politica_datos_version}).
              </Text>
            </View>
          ) : null}

          {/* ---------- Tus derechos (8.7.c) ---------- */}
          <TituloSeccion texto="Tus derechos" />
          <Tarjeta style={{ gap: 14, marginBottom: 22 }}>
            {ultima && (
              <View
                style={[
                  est.estado,
                  {
                    backgroundColor:
                      ultima.estado === 'pendiente' ? t.coralSuave : ultima.estado === 'atendida' ? t.verdeSuave : t.barraFondo,
                  },
                ]}
              >
                <Ionicons
                  name={ultima.estado === 'pendiente' ? 'time-outline' : ultima.estado === 'atendida' ? 'checkmark-circle' : 'information-circle'}
                  size={18}
                  color={ultima.estado === 'pendiente' ? t.coral : ultima.estado === 'atendida' ? t.verde : t.textoSuave}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[est.estadoTitulo, { color: t.texto }]}>
                    {ultima.estado === 'pendiente'
                      ? 'Tu solicitud de supresión está en trámite'
                      : ultima.estado === 'atendida'
                        ? 'Tu solicitud fue atendida'
                        : 'Tu solicitud fue rechazada'}
                  </Text>
                  <Text style={[est.estadoTexto, { color: t.textoSuave }]}>
                    Enviada el {fechaCorta(ultima.creado_en)}
                    {ultima.estado === 'pendiente' ? ' · la organización tiene hasta 15 días hábiles para responder.' : '.'}
                  </Text>
                  {ultima.respuesta ? (
                    <Text style={[est.estadoTexto, { color: t.texto, marginTop: 4 }]}>“{ultima.respuesta}”</Text>
                  ) : null}
                </View>
              </View>
            )}

            <Accion
              icono="trash-outline"
              titulo="Pedir que borren mis datos"
              texto="La organización revisa tu solicitud y te responde aquí."
              onPress={enTramite ? undefined : () => setPidiendo(true)}
              deshabilitada={enTramite}
            />
            <View style={{ height: 1, backgroundColor: t.borde }} />
            <Accion
              icono="hand-left-outline"
              titulo="Revocar mi autorización"
              texto="Dejas de usar la app hasta que vuelvas a aceptar."
              onPress={revocar}
              peligro
            />
          </Tarjeta>

          <TituloSeccion texto="La política" />
          {politica.secciones.map((s) => (
            <View key={s.titulo} style={{ marginBottom: 18 }}>
              <Text style={[est.titulo, { color: t.texto }]}>{s.titulo}</Text>
              {s.parrafos.map((p) => (
                <Text key={p} style={[est.texto, { color: t.textoSuave }]}>
                  {p}
                </Text>
              ))}
            </View>
          ))}

          {politica.url_politica ? (
            <TouchableOpacity style={est.enlace} onPress={() => void Linking.openURL(politica.url_politica!)}>
              <Ionicons name="open-outline" size={16} color={t.primarioTexto} />
              <Text style={[est.enlaceTexto, { color: t.primarioTexto }]}>
                Ver la política completa de {politica.responsable}
              </Text>
            </TouchableOpacity>
          ) : null}

          <Text style={[est.version, { color: t.textoTenue }]}>
            Responsable: {politica.responsable} · Versión {politica.version}
            {politica.vigente_desde ? ` · Vigente desde el ${politica.vigente_desde}` : ''}
          </Text>
        </ScrollView>
      )}

      {/* ---------- Pedir supresión ---------- */}
      <Modal visible={pidiendo} transparent animationType="fade" onRequestClose={() => setPidiendo(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <Pressable style={est.fondoHoja} onPress={() => setPidiendo(false)}>
            <Pressable style={[est.hoja, { backgroundColor: t.tarjeta, paddingBottom: insets.bottom + 18 }]}>
              <Text style={[est.hojaTitulo, { color: t.texto }]}>Pedir que borren tus datos</Text>
              <Text style={[est.hojaTexto, { color: t.textoSuave }]}>
                Si la organización la aprueba, se borrará tu cuenta, tus chats y tu inscripción, y tu perfil quedará
                anónimo. No podrás volver a entrar con este usuario. Puede rechazarla solo si la ley le exige conservar
                algún dato (por ejemplo, para tu certificado), y te explicará por qué.
              </Text>
              <Text style={[est.label, { color: t.textoSuave }]}>Motivo (opcional)</Text>
              <TextInput
                value={motivo}
                onChangeText={setMotivo}
                placeholder="Cuéntale a la organización por qué, si quieres"
                placeholderTextColor={t.textoTenue}
                multiline
                maxLength={500}
                style={[est.area, { backgroundColor: t.input, borderColor: t.borde, color: t.texto }]}
              />
              <Boton texto="Enviar solicitud" icono="send" onPress={pedirSupresion} cargando={enviando} variante="peligro" style={{ marginTop: 16 }} />
              <TouchableOpacity onPress={() => setPidiendo(false)} style={{ alignSelf: 'center', padding: 10 }}>
                <Text style={[est.cancelar, { color: t.textoTenue }]}>Cancelar</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '');

function Accion({
  icono,
  titulo,
  texto,
  onPress,
  peligro,
  deshabilitada,
}: {
  icono: React.ComponentProps<typeof Ionicons>['name'];
  titulo: string;
  texto: string;
  onPress?: () => void;
  peligro?: boolean;
  deshabilitada?: boolean;
}) {
  const t = useTema();
  const color = peligro ? t.rojo : t.primarioTexto;
  return (
    <TouchableOpacity
      style={[est.accion, deshabilitada && { opacity: 0.45 }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={[est.accionIcono, { backgroundColor: peligro ? t.rojoSuave : t.primarioSuave }]}>
        <Ionicons name={icono} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[est.accionTitulo, { color: peligro ? t.rojo : t.texto }]}>{titulo}</Text>
        <Text style={[est.accionTexto, { color: t.textoTenue }]}>{texto}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={18} color={t.textoTenue} />}
    </TouchableOpacity>
  );
}

const est = StyleSheet.create({
  sello: { flexDirection: 'row', gap: 10, borderRadius: 14, padding: 14, marginBottom: 20 },
  selloTexto: { flex: 1, fontFamily: F.medio, fontSize: 13, lineHeight: 19 },
  titulo: { fontFamily: F.semi, fontSize: 15, marginBottom: 6 },
  texto: { fontFamily: F.normal, fontSize: 13.5, lineHeight: 20, marginBottom: 6 },
  version: { fontFamily: F.normal, fontSize: 12, textAlign: 'center', marginTop: 6 },
  estado: { flexDirection: 'row', gap: 10, borderRadius: 12, padding: 12 },
  estadoTitulo: { fontFamily: F.semi, fontSize: 13.5 },
  estadoTexto: { fontFamily: F.normal, fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  accion: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accionIcono: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  accionTitulo: { fontFamily: F.semi, fontSize: 14.5 },
  accionTexto: { fontFamily: F.medio, fontSize: 12.5, marginTop: 2 },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginBottom: 12 },
  enlaceTexto: { fontFamily: F.semi, fontSize: 13.5 },
  fondoHoja: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  hoja: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22 },
  hojaTitulo: { fontFamily: F.titulo, fontSize: 18 },
  hojaTexto: { fontFamily: F.normal, fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  label: { fontFamily: F.semi, fontSize: 13, marginBottom: 7, marginTop: 16 },
  area: { borderWidth: 1.5, borderRadius: 14, padding: 13, minHeight: 80, textAlignVertical: 'top', fontFamily: F.medio, fontSize: 14 },
  cancelar: { fontFamily: F.medio, fontSize: 14 },
});
