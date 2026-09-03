import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import type { DirectorioItem } from '../lib/tipos';
import type { CongresosStackParamList } from '../navigation/CongresosStack';

type Props = NativeStackScreenProps<CongresosStackParamList, 'Networking'>;

/**
 * Directorio de networking de un congreso: los demas asistentes y tu estado con
 * cada uno. Puedes marcar interes ("Conectar") y, si hay match, entrar al chat.
 */
export default function NetworkingScreen({ route, navigation }: Props) {
  const { congresoId } = route.params;
  const [items, setItems] = useState<DirectorioItem[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      setItems(await api<DirectorioItem[]>('GET', `/congresos/${congresoId}/networking`));
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo cargar el directorio');
    } finally {
      setCargando(false);
    }
  }, [congresoId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  async function conectar(receptorId: string) {
    try {
      const res = await api<{ match: boolean; conexionId?: string }>(
        'POST',
        `/congresos/${congresoId}/intereses`,
        { receptor_id: receptorId },
      );
      if (res.match) Alert.alert('¡Conectaron!', 'Ya pueden chatear.');
      cargar();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo enviar');
    }
  }

  if (cargando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.lista}
      data={items}
      keyExtractor={(i) => i.usuario.id}
      refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} />}
      ListEmptyComponent={
        <Text style={styles.vacio}>Aun no hay otros asistentes inscritos.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.fila}>
            <Text style={styles.nombre}>{item.usuario.nombre}</Text>
            {accion(item, conectar, navigation)}
          </View>
          {item.estado === 'recibido' && (
            <Text style={styles.hint}>Te envió una solicitud</Text>
          )}
        </View>
      )}
    />
  );
}

/** Devuelve el boton/etiqueta correcto segun el estado con esa persona. */
function accion(
  item: DirectorioItem,
  conectar: (id: string) => void,
  navigation: Props['navigation'],
) {
  switch (item.estado) {
    case 'correspondido':
      return (
        <TouchableOpacity
          style={[styles.boton, styles.chatear]}
          onPress={() =>
            navigation.navigate('Chat', {
              conexionId: item.conexionId!,
              nombre: item.usuario.nombre,
            })
          }
        >
          <Text style={styles.chatearTexto}>Chatear</Text>
        </TouchableOpacity>
      );
    case 'enviado':
      return <Text style={styles.enviado}>Interés enviado</Text>;
    case 'recibido':
      return (
        <TouchableOpacity
          style={[styles.boton, styles.conectar]}
          onPress={() => conectar(item.usuario.id)}
        >
          <Text style={styles.conectarTexto}>Aceptar</Text>
        </TouchableOpacity>
      );
    default:
      return (
        <TouchableOpacity
          style={[styles.boton, styles.conectar]}
          onPress={() => conectar(item.usuario.id)}
        >
          <Text style={styles.conectarTexto}>Conectar</Text>
        </TouchableOpacity>
      );
  }
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lista: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nombre: { fontSize: 16, fontWeight: '700', color: '#0f172a', flex: 1 },
  hint: { fontSize: 12, color: '#4f46e5', marginTop: 6 },
  boton: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  conectar: { backgroundColor: '#4f46e5' },
  conectarTexto: { color: '#fff', fontWeight: '700' },
  chatear: { backgroundColor: '#dcfce7' },
  chatearTexto: { color: '#16a34a', fontWeight: '700' },
  enviado: { color: '#94a3b8', fontWeight: '600', fontSize: 13 },
  vacio: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});
