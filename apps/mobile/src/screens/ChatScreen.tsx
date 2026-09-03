import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
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
import { useAuth } from '../context/AuthContext';
import type { MensajeChat, MensajesResp } from '../lib/tipos';
import type { CongresosStackParamList } from '../navigation/CongresosStack';

type Props = NativeStackScreenProps<CongresosStackParamList, 'Chat'>;

/**
 * Chat de una conexion. Se une a la sala `conexion:<id>` por socket y refresca al
 * oir 'mensajes:cambio'. El chat es ACOTADO: cuando se llega al limite, se
 * deshabilita el envio.
 */
export default function ChatScreen({ route }: Props) {
  const { conexionId } = route.params;
  const { session } = useAuth();
  const miId = session?.user?.id;

  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [limite, setLimite] = useState(0);
  const [usados, setUsados] = useState(0);
  const [texto, setTexto] = useState('');
  const listaRef = useRef<FlatList>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await api<MensajesResp>('GET', `/conexiones/${conexionId}/mensajes`);
      setMensajes(r.mensajes);
      setLimite(r.limite_mensajes);
      setUsados(r.usados);
    } catch {
      /* mantener */
    }
  }, [conexionId]);

  useEffect(() => {
    cargar();
    let socket: Socket | undefined;
    let activo = true;
    crearSocket().then((s) => {
      if (!activo) return s.disconnect();
      socket = s;
      s.emit('join_conexion', conexionId);
      s.on('mensajes:cambio', cargar);
    });
    return () => {
      activo = false;
      if (socket) {
        socket.emit('leave_conexion', conexionId);
        socket.disconnect();
      }
    };
  }, [conexionId, cargar]);

  async function enviar() {
    if (!texto.trim()) return;
    const t = texto.trim();
    setTexto('');
    try {
      await api('POST', `/conexiones/${conexionId}/mensajes`, { texto: t });
      cargar();
    } catch {
      setTexto(t); // devolver el texto si fallo
    }
  }

  const restantes = Math.max(limite - usados, 0);
  const bloqueado = limite > 0 && usados >= limite;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listaRef}
        contentContainerStyle={styles.lista}
        data={mensajes}
        keyExtractor={(m) => m.id}
        onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <Text style={styles.vacio}>Aún no hay mensajes. ¡Saluda!</Text>
        }
        renderItem={({ item }) => {
          const mio = item.autor.id === miId;
          return (
            <View style={[styles.burbujaFila, mio ? styles.derecha : styles.izquierda]}>
              <View style={[styles.burbuja, mio ? styles.burbujaMia : styles.burbujaOtro]}>
                <Text style={mio ? styles.textoMio : styles.textoOtro}>{item.texto}</Text>
              </View>
            </View>
          );
        }}
      />

      <Text style={styles.contador}>
        {bloqueado ? 'Límite de mensajes alcanzado' : `${restantes} mensaje${restantes === 1 ? '' : 's'} restantes`}
      </Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={bloqueado ? 'Chat cerrado' : 'Mensaje...'}
          value={texto}
          onChangeText={setTexto}
          editable={!bloqueado}
          multiline
        />
        <TouchableOpacity
          style={[styles.enviar, bloqueado && styles.disabled]}
          onPress={enviar}
          disabled={bloqueado}
        >
          <Text style={styles.enviarTexto}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  lista: { padding: 12, gap: 6, flexGrow: 1 },
  vacio: { textAlign: 'center', color: '#64748b', marginTop: 40 },
  burbujaFila: { flexDirection: 'row' },
  izquierda: { justifyContent: 'flex-start' },
  derecha: { justifyContent: 'flex-end' },
  burbuja: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 },
  burbujaMia: { backgroundColor: '#4f46e5', borderBottomRightRadius: 4 },
  burbujaOtro: { backgroundColor: '#e2e8f0', borderBottomLeftRadius: 4 },
  textoMio: { color: '#fff', fontSize: 15 },
  textoOtro: { color: '#0f172a', fontSize: 15 },
  contador: { textAlign: 'center', fontSize: 12, color: '#94a3b8', paddingVertical: 4 },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  enviar: { backgroundColor: '#4f46e5', borderRadius: 20, paddingVertical: 11, paddingHorizontal: 18 },
  enviarTexto: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
