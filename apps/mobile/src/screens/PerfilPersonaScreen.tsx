import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import type { ContactoConexion, Perfil, TarjetaPersona as Persona } from '../lib/tipos';
import { bandera, iniciales } from '../components/ui';
import { Insignia, cuandoCharla, fondoDe } from '../components/TarjetaPersona';
import MatchModal from '../components/MatchModal';
import { useMarca } from '../context/MarcaContext';
import { F, useTema } from '../tema/tema';
import type { NetworkingStackParamList } from '../navigation/NetworkingStack';

type Props = NativeStackScreenProps<NetworkingStackParamList, 'PerfilPersona'>;

const ANCHO = Dimensions.get('window').width;

/**
 * PERFIL COMPLETO de una persona del networking (8.7.d, decisión "d": verlo
 * antes de mostrar interés). Foto grande arriba, y abajo todo: descripción
 * entera, cargo, empresa, país y, si es speaker, sus charlas.
 *
 * El botón de abajo cambia según la relación:
 *   ninguno / recibido / descartado -> 💜 Me interesa
 *   enviado                         -> "Esperando su respuesta"
 *   correspondido                   -> Enviar mensaje
 *   speaker sin cuenta              -> (sin botón: solo sus charlas)
 *
 * Lo que DESBLOQUEA el match (8.7.d): desde cuándo están conectados, cuántos
 * mensajes llevan y, si la otra persona activó "Compartir mi contacto", su
 * WhatsApp, correo y LinkedIn.
 */
export default function PerfilPersonaScreen({ route, navigation }: Props) {
  const { persona: inicial, congresoId, sinCuenta } = route.params;
  const t = useTema();
  const marca = useMarca();
  const insets = useSafeAreaInsets();
  const [p, setP] = useState<Persona>(inicial);
  const [yo, setYo] = useState<Perfil | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [match, setMatch] = useState<string | null>(null); // conexionId

  useEffect(() => {
    api<Perfil>('GET', '/perfil').then(setYo).catch(() => undefined);
  }, []);

  // 8.7.d: con match, pedimos lo que se desbloquea.
  const [contacto, setContacto] = useState<ContactoConexion | null>(null);
  useEffect(() => {
    if (p.estado !== 'correspondido' || !p.conexionId) return;
    api<ContactoConexion>('GET', `/conexiones/${p.conexionId}/contacto`).then(setContacto).catch(() => undefined);
  }, [p.estado, p.conexionId]);

  const [a, b] = fondoDe(p.nombre);
  const puesto = [p.cargo, p.empresa].filter(Boolean).join(' · ');

  async function meInteresa() {
    setEnviando(true);
    try {
      const r = await api<{ match: boolean; conexionId?: string }>('POST', `/congresos/${congresoId}/intereses`, {
        receptor_id: p.id,
      });
      if (r.match && r.conexionId) {
        setP((x) => ({ ...x, estado: 'correspondido', conexionId: r.conexionId }));
        setMatch(r.conexionId);
      } else {
        setP((x) => ({ ...x, estado: 'enviado' }));
      }
    } catch (e: any) {
      Alert.alert('No se pudo enviar', e?.message ?? 'Intenta de nuevo');
    } finally {
      setEnviando(false);
    }
  }

  function chatear(conexionId: string) {
    navigation.navigate('Chat', { conexionId, nombre: p.nombre, foto: p.foto_url, otroId: p.id });
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
        {/* ---------- Foto grande ---------- */}
        <View style={{ width: ANCHO, height: ANCHO * 1.05 }}>
          {p.foto_url ? (
            <Image source={{ uri: p.foto_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <LinearGradient colors={[a, b]} style={[StyleSheet.absoluteFill, est.sinFoto]}>
              <Text style={est.iniciales}>{iniciales(p.nombre)}</Text>
            </LinearGradient>
          )}
          <LinearGradient colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']} style={[est.veloArriba, { height: insets.top + 80 }]} />
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']} style={est.veloAbajo} />
          <TouchableOpacity
            style={[est.atras, { top: insets.top + 10 }]}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Volver"
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={est.sobreFoto}>
            {p.insignia ? <Insignia tipo={p.insignia} /> : null}
            <Text style={est.nombre}>
              {p.nombre}
              {p.edad ? <Text style={est.edad}>{`, ${p.edad}`}</Text> : null}
            </Text>
            {puesto ? <Text style={est.puesto}>{puesto}</Text> : null}
          </View>
        </View>

        <View style={{ padding: 20, gap: 18 }}>
          {p.estado === 'recibido' && (
            <View style={[est.aviso, { backgroundColor: marca.primarioSuave }]}>
              <Text style={{ fontSize: 18 }}>💜</Text>
              <Text style={[est.avisoTexto, { color: t.texto }]}>
                {p.nombre.split(' ')[0]} quiere conectar contigo. Si también te interesa, ¡es un match!
              </Text>
            </View>
          )}

          {p.pais ? (
            <Dato icono="location-outline" texto={`${bandera(p.pais_codigo)} ${p.pais}`} />
          ) : null}

          {p.descripcion ? (
            <View>
              <Text style={[est.seccion, { color: t.textoTenue }]}>{sinCuenta || p.insignia === 'ponente' ? 'SOBRE EL PONENTE' : 'SOBRE MÍ'}</Text>
              <Text style={[est.descripcion, { color: t.texto }]}>{p.descripcion}</Text>
            </View>
          ) : null}

          {/* ---------- Lo que desbloquea el match (8.7.d) ---------- */}
          {p.estado === 'correspondido' && contacto && (
            <View style={[est.contacto, { backgroundColor: t.tarjeta, borderColor: '#16A34A55' }]}>
              <View style={est.contactoCabeza}>
                <View style={est.contactoIcono}>
                  <Ionicons name="checkmark-done" size={16} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[est.contactoTitulo, { color: t.texto }]}>Son conexión</Text>
                  <Text style={[est.charlaCuando, { color: t.textoSuave }]}>
                    Desde el {new Date(contacto.conectados_desde).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })} ·{' '}
                    {contacto.mensajes}/{contacto.limite_mensajes} mensajes
                  </Text>
                </View>
              </View>

              {contacto.compartido && (contacto.telefono || contacto.correo || contacto.linkedin) ? (
                <View style={{ gap: 8, marginTop: 12 }}>
                  {contacto.telefono ? (
                    <BotonContacto
                      icono="logo-whatsapp"
                      color="#25D366"
                      titulo="WhatsApp"
                      valor={contacto.telefono}
                      onPress={() => abrir(`https://wa.me/${soloDigitos(contacto.telefono!)}`)}
                    />
                  ) : null}
                  {contacto.correo ? (
                    <BotonContacto icono="mail" color="#5A46F0" titulo="Correo" valor={contacto.correo} onPress={() => abrir(`mailto:${contacto.correo}`)} />
                  ) : null}
                  {contacto.linkedin ? (
                    <BotonContacto icono="logo-linkedin" color="#0A66C2" titulo="LinkedIn" valor="Ver su perfil" onPress={() => abrir(contacto.linkedin!)} />
                  ) : null}
                </View>
              ) : (
                <Text style={[est.nota, { color: t.textoTenue, marginTop: 10, textAlign: 'left' }]}>
                  Aún no comparte su contacto. ¡Pregúntaselo por el chat!
                </Text>
              )}
            </View>
          )}

          {p.charlas.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={[est.seccion, { color: t.textoTenue }]}>SUS CHARLAS</Text>
              {p.charlas.map((c) => (
                <View key={c.id} style={[est.charla, { backgroundColor: t.tarjeta, borderColor: t.borde }]}>
                  <View style={est.charlaIcono}>
                    <Ionicons name="mic" size={16} color="#B45309" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[est.charlaTitulo, { color: t.texto }]}>{c.titulo}</Text>
                    <Text style={[est.charlaCuando, { color: t.textoSuave }]}>{cuandoCharla(c.inicio)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {sinCuenta && (
            <Text style={[est.nota, { color: t.textoTenue }]}>
              Este ponente no usa la app, así que no se puede conectar con él aquí. ¡Búscalo en su charla!
            </Text>
          )}
        </View>
      </ScrollView>

      {/* ---------- Acción ---------- */}
      {!sinCuenta && p.estado && (
        <View style={[est.pie, { paddingBottom: insets.bottom + 14, backgroundColor: t.fondo, borderColor: t.borde }]}>
          {p.estado === 'correspondido' && p.conexionId ? (
            <BotonPie texto="Enviar mensaje" icono="chatbubbles" fondo="#16A34A" onPress={() => chatear(p.conexionId!)} />
          ) : p.estado === 'enviado' ? (
            <View style={[est.esperando, { backgroundColor: marca.primarioSuave }]}>
              <Ionicons name="heart" size={18} color={marca.primarioTexto} />
              <Text style={[est.esperandoTexto, { color: marca.primarioTexto }]}>Le diste 💜 · esperando su respuesta</Text>
            </View>
          ) : (
            <BotonPie texto="Me interesa" icono="heart" fondo={marca.primario} onPress={meInteresa} cargando={enviando} />
          )}
        </View>
      )}

      <MatchModal
        visible={!!match}
        yo={yo ? { nombre: yo.nombre, foto_url: yo.foto_url } : null}
        otro={p}
        alSeguir={() => setMatch(null)}
        alMensaje={() => {
          const id = match;
          setMatch(null);
          if (id) chatear(id);
        }}
      />
    </View>
  );
}

/** "+57 300 123 4567" -> "573001234567" (lo que pide wa.me). Sin indicativo, se asume Colombia. */
function soloDigitos(tel: string) {
  const d = tel.replace(/\D/g, '');
  return d.length === 10 && !tel.trim().startsWith('+') ? `57${d}` : d;
}

function abrir(url: string) {
  Linking.openURL(url).catch(() => Alert.alert('No se pudo abrir', 'Revisa que tengas la aplicación instalada.'));
}

function BotonContacto({
  icono,
  color,
  titulo,
  valor,
  onPress,
}: {
  icono: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  titulo: string;
  valor: string;
  onPress: () => void;
}) {
  const t = useTema();
  return (
    <TouchableOpacity style={[est.botonContacto, { backgroundColor: t.fondo }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[est.botonContactoIcono, { backgroundColor: color }]}>
        <Ionicons name={icono} size={18} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[est.charlaTitulo, { color: t.texto }]}>{titulo}</Text>
        <Text style={[est.charlaCuando, { color: t.textoSuave }]} numberOfLines={1}>{valor}</Text>
      </View>
      <Ionicons name="open-outline" size={17} color={t.textoTenue} />
    </TouchableOpacity>
  );
}

function Dato({ icono, texto }: { icono: React.ComponentProps<typeof Ionicons>['name']; texto: string }) {
  const t = useTema();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ionicons name={icono} size={17} color={t.textoTenue} />
      <Text style={{ fontFamily: F.medio, fontSize: 14.5, color: t.texto }}>{texto}</Text>
    </View>
  );
}

function BotonPie({
  texto,
  icono,
  fondo,
  onPress,
  cargando,
}: {
  texto: string;
  icono: React.ComponentProps<typeof Ionicons>['name'];
  fondo: string;
  onPress: () => void;
  cargando?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[est.botonPie, { backgroundColor: fondo, opacity: cargando ? 0.6 : 1 }]}
      onPress={onPress}
      disabled={cargando}
      activeOpacity={0.85}
    >
      <Ionicons name={icono} size={20} color="#fff" />
      <Text style={est.botonPieTexto}>{cargando ? 'Enviando…' : texto}</Text>
    </TouchableOpacity>
  );
}

const est = StyleSheet.create({
  sinFoto: { alignItems: 'center', justifyContent: 'center' },
  iniciales: { color: 'rgba(255,255,255,0.92)', fontFamily: F.titulo, fontSize: 140 },
  veloArriba: { position: 'absolute', top: 0, left: 0, right: 0 },
  veloAbajo: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' },
  atras: {
    position: 'absolute', left: 14, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center',
  },
  sobreFoto: { position: 'absolute', left: 20, right: 20, bottom: 20, gap: 6, alignItems: 'flex-start' },
  nombre: { color: '#fff', fontFamily: F.titulo, fontSize: 30, letterSpacing: -0.5 },
  edad: { fontFamily: F.tituloMedio, color: 'rgba(255,255,255,0.85)' },
  puesto: { color: 'rgba(255,255,255,0.92)', fontFamily: F.semi, fontSize: 15 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 13 },
  avisoTexto: { flex: 1, fontFamily: F.semi, fontSize: 13.5, lineHeight: 19 },
  seccion: { fontFamily: F.negrita, fontSize: 11.5, letterSpacing: 1, marginBottom: 6 },
  descripcion: { fontFamily: F.normal, fontSize: 15, lineHeight: 23 },
  charla: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 12 },
  charlaIcono: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  charlaTitulo: { fontFamily: F.semi, fontSize: 14.5 },
  charlaCuando: { fontFamily: F.medio, fontSize: 12.5, marginTop: 2 },
  nota: { fontFamily: F.medio, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  contacto: { borderWidth: 1.5, borderRadius: 18, padding: 14 },
  contactoCabeza: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactoIcono: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  contactoTitulo: { fontFamily: F.negrita, fontSize: 15 },
  botonContacto: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 11 },
  botonContactoIcono: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  pie: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1 },
  botonPie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 15 },
  botonPieTexto: { color: '#fff', fontFamily: F.negrita, fontSize: 16 },
  esperando: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 15 },
  esperandoTexto: { fontFamily: F.negrita, fontSize: 14.5 },
});
