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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Socket } from 'socket.io-client';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import { crearSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import type { MensajeChat, MensajesResp } from '../lib/tipos';
import type { CongresosStackParamList } from '../navigation/CongresosStack';
import { Avatar, Cabecera, Vacio } from '../components/ui';
import { F, sombra, useTema } from '../tema/tema';
import { useMarca } from '../context/MarcaContext';

type Props = NativeStackScreenProps<CongresosStackParamList, 'Chat'>;

/**
 * Chat de una conexion. Se une a la sala `conexion:<id>` por socket y refresca al
 * oir 'mensajes:cambio'. El chat es ACOTADO: cuando se llega al limite, se
 * deshabilita el envio.
 *
 * Rediseño (mockup "A · Chat"): burbujas violeta (mías) y blancas (del otro),
 * contador de mensajes restantes y caja de texto con botón redondo.
 */
export default function ChatScreen({ route, navigation }: Props) {
  const { conexionId, nombre } = route.params;
  const { session } = useAuth();
  const miId = session?.user?.id;
  const t = useTema();
  const marca = useMarca(); // colores del congreso (8.5)
  const insets = useSafeAreaInsets();

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
      style={{ flex: 1, backgroundColor: t.fondo }}
      // 'padding' también en Android: con edge-to-edge (app.json) Android ya no
      // encoge la ventana al abrir el teclado, así que hay que empujar nosotros.
      behavior="padding"
    >
      <Cabecera
        compacta
        titulo={nombre}
        subtitulo="Conexión de networking"
        onAtras={() => navigation.goBack()}
        colores={marca.degradado}
        derecha={<Avatar nombre={nombre} tamano={38} />}
      />

      <FlatList
        ref={listaRef}
        contentContainerStyle={est.lista}
        data={mensajes}
        keyExtractor={(m) => m.id}
        onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: true })}
        ListHeaderComponent={
          <View style={[est.aviso, { backgroundColor: t.barraFondo }]}>
            <Text style={[est.avisoTexto, { color: t.textoTenue }]}>Conectaron · pueden chatear</Text>
          </View>
        }
        ListEmptyComponent={<Vacio texto="Aún no hay mensajes. ¡Saluda!" icono="hand-left-outline" />}
        renderItem={({ item }) => {
          const mio = item.autor.id === miId;
          return (
            <View style={[est.burbujaFila, { justifyContent: mio ? 'flex-end' : 'flex-start' }]}>
              <View
                style={[
                  est.burbuja,
                  mio
                    ? { backgroundColor: marca.primario, borderBottomRightRadius: 6 }
                    : { backgroundColor: t.tarjeta, borderBottomLeftRadius: 6, ...sombra(t) },
                ]}
              >
                <Text style={[est.burbujaTexto, { color: mio ? '#fff' : t.texto }]}>{item.texto}</Text>
              </View>
            </View>
          );
        }}
      />

      <Text style={[est.contador, { color: t.textoTenue }]}>
        {bloqueado
          ? 'Límite de mensajes alcanzado'
          : `${restantes} mensaje${restantes === 1 ? '' : 's'} restantes`}
      </Text>

      <View style={[est.barraInput, { paddingBottom: insets.bottom + 10 }]}>
        <TextInput
          style={[est.input, { backgroundColor: t.tarjeta, color: t.texto, borderColor: t.borde }]}
          placeholder={bloqueado ? 'Chat cerrado' : 'Mensaje...'}
          placeholderTextColor={t.textoTenue}
          value={texto}
          onChangeText={setTexto}
          editable={!bloqueado}
          multiline
        />
        <TouchableOpacity
          style={[est.enviar, { backgroundColor: marca.primario }, bloqueado && { opacity: 0.5 }]}
          onPress={enviar}
          disabled={bloqueado}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const est = StyleSheet.create({
  lista: { padding: 16, gap: 8, flexGrow: 1 },
  aviso: { alignSelf: 'center', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8 },
  avisoTexto: { fontFamily: F.medio, fontSize: 11.5 },
  burbujaFila: { flexDirection: 'row' },
  burbuja: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 15, paddingVertical: 10 },
  burbujaTexto: { fontFamily: F.medio, fontSize: 14.5, lineHeight: 20 },
  contador: { textAlign: 'center', fontFamily: F.medio, fontSize: 11.5, paddingVertical: 4 },
  barraInput: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 6, alignItems: 'flex-end' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: F.medio,
    maxHeight: 110,
  },
  enviar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
});
