import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Socket } from 'socket.io-client';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import { crearSocket } from '../lib/socket';
import type { EncuestaResultado, Pregunta } from '../lib/tipos';
import type { CongresosStackParamList } from '../navigation/CongresosStack';
import { Avatar, Cabecera, Etiqueta, Tarjeta, TituloSeccion, Vacio } from '../components/ui';
import { F, useTema } from '../tema/tema';

type Props = NativeStackScreenProps<CongresosStackParamList, 'Sesion'>;

/**
 * Pantalla de una sesion: el asistente manda preguntas y vota la encuesta activa.
 * Todo se actualiza EN VIVO: nos unimos a la sala de la sesion por Socket.io y,
 * cuando llega un aviso ('preguntas:cambio' / 'encuestas:cambio'), volvemos a
 * pedir la lista por REST (patron "avisar y refrescar").
 *
 * Rediseño (mockup "A · Sesión en vivo"): encuesta con barras, preguntas en
 * tarjetas, y la caja para escribir la pregunta fija abajo con botón redondo.
 */
export default function SesionScreen({ route, navigation }: Props) {
  const { sesionId, titulo } = route.params;
  const t = useTema();
  const insets = useSafeAreaInsets();
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [encuestas, setEncuestas] = useState<EncuestaResultado[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargarPreguntas = useCallback(async () => {
    try {
      setPreguntas(await api<Pregunta[]>('GET', `/sesiones/${sesionId}/preguntas`));
    } catch {
      /* mantener lo que haya */
    }
  }, [sesionId]);

  const cargarEncuestas = useCallback(async () => {
    try {
      setEncuestas(await api<EncuestaResultado[]>('GET', `/sesiones/${sesionId}/encuestas`));
    } catch {
      /* mantener lo que haya */
    }
  }, [sesionId]);

  // Carga inicial + conexion al socket (con limpieza al salir).
  useEffect(() => {
    cargarPreguntas();
    cargarEncuestas();

    let socket: Socket | undefined;
    let activo = true;
    crearSocket().then((s) => {
      if (!activo) {
        s.disconnect();
        return;
      }
      socket = s;
      s.emit('join_sesion', sesionId);
      s.on('preguntas:cambio', cargarPreguntas);
      s.on('encuestas:cambio', cargarEncuestas);
    });

    return () => {
      activo = false;
      if (socket) {
        socket.emit('leave_sesion', sesionId);
        socket.disconnect();
      }
    };
  }, [sesionId, cargarPreguntas, cargarEncuestas]);

  async function enviarPregunta() {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await api('POST', `/sesiones/${sesionId}/preguntas`, { texto: texto.trim() });
      setTexto('');
      Alert.alert('Enviada', 'Tu pregunta fue enviada. El coordinador la revisara.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo enviar');
    } finally {
      setEnviando(false);
    }
  }

  async function votar(encuestaId: string, opcionId: string) {
    try {
      await api('POST', `/encuestas/${encuestaId}/votar`, { opcion_id: opcionId });
      // El aviso del socket refresca; refrescamos ya por si acaso.
      cargarEncuestas();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo votar');
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.fondo }}
      // 'padding' también en Android: con edge-to-edge (app.json) Android ya no
      // encoge la ventana al abrir el teclado, así que hay que empujar nosotros.
      behavior="padding"
    >
      <Cabecera
        compacta
        titulo={titulo}
        subtitulo="Preguntas y encuestas en vivo"
        onAtras={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 24 }}>
        {/* ---------- ENCUESTA EN VIVO ---------- */}
        <TituloSeccion texto="Encuesta en vivo" />
        {encuestas.length === 0 ? (
          <Vacio texto="No hay ninguna encuesta activa ahora." icono="stats-chart-outline" />
        ) : (
          <View style={{ gap: 12 }}>
            {encuestas.map((e) => (
              <EncuestaCard key={e.id} encuesta={e} onVotar={votar} />
            ))}
          </View>
        )}

        {/* ---------- PREGUNTAS ---------- */}
        <TituloSeccion texto="Preguntas" />
        {preguntas.length === 0 ? (
          <Vacio texto="Aún no hay preguntas aprobadas. ¡Sé el primero!" icono="help-circle-outline" />
        ) : (
          <View style={{ gap: 10 }}>
            {preguntas.map((p) => (
              <Tarjeta key={p.id} style={{ padding: 14 }}>
                <Text style={[est.preguntaTexto, { color: t.texto }]}>{p.texto}</Text>
                <View style={est.preguntaPie}>
                  <View style={est.autorFila}>
                    <Avatar nombre={p.usuario?.nombre ?? 'Asistente'} tamano={22} />
                    <Text style={[est.autor, { color: t.textoTenue }]}>
                      {p.usuario?.nombre ?? 'Asistente'}
                    </Text>
                  </View>
                  {p.estado === 'respondida' && <Etiqueta texto="RESPONDIDA" tono="verde" />}
                </View>
              </Tarjeta>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ---------- Caja para preguntar (fija abajo) ---------- */}
      <View
        style={[
          est.barraInput,
          { backgroundColor: t.tarjeta, borderTopColor: t.borde, paddingBottom: insets.bottom + 10 },
        ]}
      >
        <TextInput
          style={[est.input, { backgroundColor: t.input, color: t.texto }]}
          placeholder="Escribe tu pregunta..."
          placeholderTextColor={t.textoTenue}
          value={texto}
          onChangeText={setTexto}
          multiline
        />
        <TouchableOpacity
          style={[est.enviar, { backgroundColor: t.primario }, enviando && { opacity: 0.6 }]}
          onPress={enviarPregunta}
          disabled={enviando}
        >
          {enviando ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Tarjeta de una encuesta: si no has votado y esta activa, muestra opciones para
 *  votar; si ya votaste (o esta cerrada), muestra los resultados con barras. */
function EncuestaCard({
  encuesta,
  onVotar,
}: {
  encuesta: EncuestaResultado;
  onVotar: (encuestaId: string, opcionId: string) => void;
}) {
  const t = useTema();
  const yaVote = encuesta.miVoto !== null;

  return (
    <Tarjeta>
      <Text style={[est.encuestaPregunta, { color: t.texto }]}>{encuesta.pregunta}</Text>

      {!yaVote && encuesta.activa
        ? // Modo VOTAR
          encuesta.opciones.map((o) => (
            <TouchableOpacity
              key={o.id}
              style={[est.opcion, { borderColor: t.borde, backgroundColor: t.input }]}
              onPress={() => onVotar(encuesta.id, o.id)}
            >
              <View style={[est.radio, { borderColor: t.textoTenue }]} />
              <Text style={[est.opcionTexto, { color: t.texto }]}>{o.texto}</Text>
            </TouchableOpacity>
          ))
        : // Modo RESULTADOS (barras)
          encuesta.opciones.map((o) => {
            const pct = encuesta.total > 0 ? Math.round((o.votos / encuesta.total) * 100) : 0;
            const esMio = encuesta.miVoto === o.id;
            return (
              <View key={o.id} style={{ marginBottom: 12 }}>
                <View style={est.resultadoHeader}>
                  <Text
                    style={[
                      est.resultadoTexto,
                      { color: esMio ? t.primarioTexto : t.texto, fontFamily: esMio ? F.negrita : F.medio },
                    ]}
                  >
                    {o.texto} {esMio ? '✓' : ''}
                  </Text>
                  <Text style={[est.resultadoPct, { color: t.textoSuave }]}>{pct}%</Text>
                </View>
                <View style={[est.barraFondo, { backgroundColor: t.barraFondo }]}>
                  <View
                    style={[
                      est.barra,
                      { width: `${pct}%`, backgroundColor: esMio ? t.primario : t.textoTenue },
                    ]}
                  />
                </View>
              </View>
            );
          })}

      <Text style={[est.totalVotos, { color: t.textoTenue }]}>
        {encuesta.total} voto{encuesta.total === 1 ? '' : 's'}
        {encuesta.activa ? ' · en vivo' : ' · cerrada'}
      </Text>
    </Tarjeta>
  );
}

const est = StyleSheet.create({
  encuestaPregunta: { fontFamily: F.titulo, fontSize: 16.5, marginBottom: 14 },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  opcionTexto: { fontFamily: F.semi, fontSize: 14.5, flex: 1 },
  resultadoHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  resultadoTexto: { fontSize: 14 },
  resultadoPct: { fontFamily: F.negrita, fontSize: 13.5 },
  barraFondo: { height: 8, borderRadius: 999, overflow: 'hidden' },
  barra: { height: 8, borderRadius: 999 },
  totalVotos: { fontFamily: F.medio, fontSize: 12, marginTop: 4 },
  preguntaTexto: { fontFamily: F.semi, fontSize: 15, lineHeight: 21 },
  preguntaPie: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  autorFila: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  autor: { fontFamily: F.medio, fontSize: 12.5 },
  barraInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: F.medio,
    maxHeight: 110,
  },
  enviar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
});
