import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import { fecha, hora } from '../lib/formato';
import type { CongresoDetalle, Inscripcion } from '../lib/tipos';
import type { CongresosStackParamList } from '../navigation/CongresosStack';

type Props = NativeStackScreenProps<CongresosStackParamList, 'CongresoDetalle'>;

/**
 * Detalle de un congreso: su agenda (sesiones con sus ponentes) y el boton de
 * inscripcion. Para saber si el asistente YA esta inscrito, ademas del detalle
 * pedimos "/inscripciones/mias" y buscamos este congreso.
 */
export default function CongresoDetalleScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [detalle, setDetalle] = useState<CongresoDetalle | null>(null);
  const [inscripcion, setInscripcion] = useState<Inscripcion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [accion, setAccion] = useState(false); // true mientras inscribe/cancela

  const cargar = useCallback(async () => {
    try {
      const [d, mias] = await Promise.all([
        api<CongresoDetalle>('GET', `/congresos/${id}`),
        api<Inscripcion[]>('GET', '/inscripciones/mias'),
      ]);
      setDetalle(d);
      setInscripcion(mias.find((i) => i.congreso.id === id) ?? null);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo cargar el congreso');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  async function inscribirme() {
    setAccion(true);
    try {
      await api('POST', `/congresos/${id}/inscripciones`);
      await cargar();
      Alert.alert('Listo', 'Te inscribiste a este congreso.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo inscribir');
    } finally {
      setAccion(false);
    }
  }

  async function cancelar() {
    if (!inscripcion) return;
    setAccion(true);
    try {
      await api('DELETE', `/inscripciones/${inscripcion.id}`);
      await cargar();
      Alert.alert('Inscripcion cancelada', 'Ya no estas inscrito.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo cancelar');
    } finally {
      setAccion(false);
    }
  }

  if (cargando || !detalle) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  const inscrito = !!inscripcion;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>{detalle.nombre}</Text>
      <Text style={styles.fechas}>
        {fecha(detalle.fecha_inicio)} — {fecha(detalle.fecha_fin)}
      </Text>

      {/* Boton de inscripcion (cambia segun estes inscrito o no) */}
      <TouchableOpacity
        style={[
          styles.boton,
          inscrito ? styles.botonCancelar : styles.botonInscribir,
          accion && styles.botonDisabled,
        ]}
        onPress={inscrito ? cancelar : inscribirme}
        disabled={accion}
      >
        {accion ? (
          <ActivityIndicator color={inscrito ? '#dc2626' : '#fff'} />
        ) : (
          <Text
            style={[
              styles.botonTexto,
              inscrito ? styles.botonTextoCancelar : styles.botonTextoInscribir,
            ]}
          >
            {inscrito ? 'Cancelar inscripcion' : 'Inscribirme'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.networking}
        onPress={() =>
          navigation.navigate('Networking', { congresoId: id, nombre: detalle.nombre })
        }
      >
        <Text style={styles.networkingTexto}>Conectar con asistentes (Networking) ›</Text>
      </TouchableOpacity>

      <Text style={styles.seccion}>Agenda</Text>
      {detalle.sesiones.length === 0 ? (
        <Text style={styles.vacio}>Este congreso aun no tiene sesiones.</Text>
      ) : (
        detalle.sesiones.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={styles.sesion}
            onPress={() =>
              navigation.navigate('Sesion', { sesionId: s.id, titulo: s.titulo })
            }
          >
            <Text style={styles.sesionHora}>
              {hora(s.inicio)} - {hora(s.fin)}
              {s.sala ? `  ·  ${s.sala}` : ''}
            </Text>
            <Text style={styles.sesionTitulo}>{s.titulo}</Text>
            <Text style={styles.sesionLink}>Preguntas y encuestas ›</Text>
          </TouchableOpacity>
        ))
      )}

      <Text style={styles.seccion}>Ponentes</Text>
      {detalle.ponentes.length === 0 ? (
        <Text style={styles.vacio}>Aun no hay ponentes registrados.</Text>
      ) : (
        detalle.ponentes.map((p) => (
          <View key={p.id} style={styles.ponente}>
            <Text style={styles.ponenteNombre}>{p.nombre}</Text>
            {p.bio ? <Text style={styles.ponenteBio}>{p.bio}</Text> : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, gap: 4 },
  titulo: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  fechas: { fontSize: 14, color: '#64748b', marginTop: 4 },
  boton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  botonInscribir: { backgroundColor: '#4f46e5' },
  botonCancelar: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dc2626' },
  botonDisabled: { opacity: 0.6 },
  botonTexto: { fontSize: 16, fontWeight: '700' },
  botonTextoInscribir: { color: '#fff' },
  botonTextoCancelar: { color: '#dc2626' },
  networking: {
    marginTop: 16,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  networkingTexto: { color: '#4f46e5', fontWeight: '700', fontSize: 15 },
  seccion: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 20,
    marginBottom: 8,
  },
  sesion: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  sesionHora: { fontSize: 13, color: '#4f46e5', fontWeight: '600' },
  sesionTitulo: { fontSize: 15, color: '#0f172a', marginTop: 2 },
  sesionLink: { fontSize: 13, color: '#4f46e5', fontWeight: '600', marginTop: 6 },
  ponente: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  ponenteNombre: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  ponenteBio: { fontSize: 13, color: '#64748b', marginTop: 2 },
  vacio: { color: '#64748b', fontStyle: 'italic' },
});
