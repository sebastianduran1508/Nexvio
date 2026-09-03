import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../lib/api';
import { fecha } from '../lib/formato';
import type { Inscripcion } from '../lib/tipos';

/**
 * Los congresos a los que el asistente esta inscrito (GET /inscripciones/mias).
 * Se recarga cada vez que la pestana vuelve a estar visible, asi si te inscribes
 * en el detalle y vuelves aca, ya aparece.
 */
export default function MisCongresosScreen() {
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const data = await api<Inscripcion[]>('GET', '/inscripciones/mias');
      setInscripciones(data);
    } catch {
      /* dejamos la lista como este */
    } finally {
      setCargando(false);
    }
  }, []);

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
      data={inscripciones}
      keyExtractor={(i) => i.id}
      refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} />}
      ListEmptyComponent={
        <Text style={styles.vacio}>
          Aun no te has inscrito a ningun congreso. Ve a la pestana Congresos.
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.nombre}>{item.congreso.nombre}</Text>
          <Text style={styles.fechas}>
            {fecha(item.congreso.fecha_inicio)} — {fecha(item.congreso.fecha_fin)}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeTexto}>Inscrito</Text>
          </View>
        </View>
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
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeTexto: { color: '#16a34a', fontSize: 12, fontWeight: '600' },
  vacio: { textAlign: 'center', color: '#64748b', marginTop: 40, paddingHorizontal: 20 },
});
