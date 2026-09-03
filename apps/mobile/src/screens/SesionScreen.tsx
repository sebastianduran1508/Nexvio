import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Socket } from 'socket.io-client';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import { crearSocket } from '../lib/socket';
import type { EncuestaResultado, Pregunta } from '../lib/tipos';
import type { CongresosStackParamList } from '../navigation/CongresosStack';

type Props = NativeStackScreenProps<CongresosStackParamList, 'Sesion'>;

/**
 * Pantalla de una sesion: el asistente manda preguntas y vota la encuesta activa.
 * Todo se actualiza EN VIVO: nos unimos a la sala de la sesion por Socket.io y,
 * cuando llega un aviso ('preguntas:cambio' / 'encuestas:cambio'), volvemos a
 * pedir la lista por REST (patron "avisar y refrescar").
 */
export default function SesionScreen({ route }: Props) {
  const { sesionId } = route.params;
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
    <ScrollView contentContainerStyle={styles.container}>
      {/* ---------- ENCUESTA EN VIVO ---------- */}
      <Text style={styles.seccion}>Encuesta en vivo</Text>
      {encuestas.length === 0 ? (
        <Text style={styles.vacio}>No hay ninguna encuesta activa ahora.</Text>
      ) : (
        encuestas.map((e) => (
          <EncuestaCard key={e.id} encuesta={e} onVotar={votar} />
        ))
      )}

      {/* ---------- PREGUNTAS ---------- */}
      <Text style={styles.seccion}>Preguntas</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Escribe tu pregunta..."
          value={texto}
          onChangeText={setTexto}
          multiline
        />
        <TouchableOpacity
          style={[styles.enviar, enviando && styles.disabled]}
          onPress={enviarPregunta}
          disabled={enviando}
        >
          <Text style={styles.enviarTexto}>Enviar</Text>
        </TouchableOpacity>
      </View>

      {preguntas.length === 0 ? (
        <Text style={styles.vacio}>Aun no hay preguntas aprobadas. ¡Se el primero!</Text>
      ) : (
        preguntas.map((p) => (
          <View key={p.id} style={styles.pregunta}>
            <Text style={styles.preguntaTexto}>{p.texto}</Text>
            <View style={styles.preguntaPie}>
              <Text style={styles.autor}>{p.usuario?.nombre ?? 'Asistente'}</Text>
              {p.estado === 'respondida' && (
                <View style={styles.badge}>
                  <Text style={styles.badgeTexto}>Respondida</Text>
                </View>
              )}
            </View>
          </View>
        ))
      )}
    </ScrollView>
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
  const yaVote = encuesta.miVoto !== null;

  return (
    <View style={styles.encuesta}>
      <Text style={styles.encuestaPregunta}>{encuesta.pregunta}</Text>

      {!yaVote && encuesta.activa ? (
        // Modo VOTAR
        encuesta.opciones.map((o) => (
          <TouchableOpacity
            key={o.id}
            style={styles.opcionBoton}
            onPress={() => onVotar(encuesta.id, o.id)}
          >
            <Text style={styles.opcionBotonTexto}>{o.texto}</Text>
          </TouchableOpacity>
        ))
      ) : (
        // Modo RESULTADOS (barras)
        encuesta.opciones.map((o) => {
          const pct = encuesta.total > 0 ? Math.round((o.votos / encuesta.total) * 100) : 0;
          const esMio = encuesta.miVoto === o.id;
          return (
            <View key={o.id} style={styles.resultadoFila}>
              <View style={styles.resultadoHeader}>
                <Text style={[styles.resultadoTexto, esMio && styles.resultadoMio]}>
                  {o.texto} {esMio ? '✓' : ''}
                </Text>
                <Text style={styles.resultadoPct}>{pct}%</Text>
              </View>
              <View style={styles.barraFondo}>
                <View style={[styles.barra, { width: `${pct}%` }]} />
              </View>
            </View>
          );
        })
      )}

      <Text style={styles.totalVotos}>
        {encuesta.total} voto{encuesta.total === 1 ? '' : 's'}
        {encuesta.activa ? '' : '  ·  cerrada'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 4 },
  seccion: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginTop: 16, marginBottom: 8 },
  vacio: { color: '#64748b', fontStyle: 'italic', marginBottom: 8 },

  // Encuesta
  encuesta: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  encuestaPregunta: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  opcionBoton: {
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  opcionBotonTexto: { color: '#4f46e5', fontWeight: '600', fontSize: 15 },
  resultadoFila: { marginBottom: 10 },
  resultadoHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  resultadoTexto: { fontSize: 14, color: '#334155' },
  resultadoMio: { fontWeight: '700', color: '#4f46e5' },
  resultadoPct: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  barraFondo: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 999, overflow: 'hidden' },
  barra: { height: 8, backgroundColor: '#4f46e5', borderRadius: 999 },
  totalVotos: { fontSize: 12, color: '#94a3b8', marginTop: 6 },

  // Preguntas
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'flex-end' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    backgroundColor: '#fff',
  },
  enviar: { backgroundColor: '#4f46e5', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16 },
  enviarTexto: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  pregunta: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  preguntaTexto: { fontSize: 15, color: '#0f172a' },
  preguntaPie: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  autor: { fontSize: 12, color: '#94a3b8' },
  badge: { backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTexto: { color: '#16a34a', fontSize: 11, fontWeight: '600' },
});
