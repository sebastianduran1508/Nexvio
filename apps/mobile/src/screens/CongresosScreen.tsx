import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { fecha } from '../lib/formato';
import type { Congreso } from '../lib/tipos';
import type { CongresosStackParamList } from '../navigation/CongresosStack';

type Props = NativeStackScreenProps<CongresosStackParamList, 'Congresos'>;

/**
 * Lista de congresos de la organizacion del asistente. Los trae de GET /congresos
 * (el backend, con el RLS, solo devuelve los de su tenant). Al tocar uno, navega
 * al detalle.
 */
export default function CongresosScreen({ navigation }: Props) {
  const [congresos, setCongresos] = useState<Congreso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      const data = await api<Congreso[]>('GET', '/congresos');
      setCongresos(data);
    } catch (e: any) {
      setError(e.message ?? 'No se pudieron cargar los congresos');
    } finally {
      setCargando(false);
    }
  }, []);

  // useFocusEffect: recarga cada vez que la pantalla vuelve a estar visible.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

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
      data={congresos}
      keyExtractor={(c) => c.id}
      refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} />}
      ListEmptyComponent={
        <Text style={styles.vacio}>
          {error ?? 'Aun no hay congresos disponibles.'}
        </Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate('CongresoDetalle', {
              id: item.id,
              nombre: item.nombre,
            })
          }
        >
          <Text style={styles.nombre}>{item.nombre}</Text>
          <Text style={styles.fechas}>
            {fecha(item.fecha_inicio)} — {fecha(item.fecha_fin)}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeTexto}>{item.estado}</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lista: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  nombre: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  fechas: { fontSize: 14, color: '#64748b', marginTop: 4 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeTexto: { color: '#4f46e5', fontSize: 12, fontWeight: '600' },
  vacio: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});
