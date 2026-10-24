import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import { enCurso, mesDia, rangoFechas } from '../lib/formato';
import type { Congreso } from '../lib/tipos';
import type { CongresosStackParamList } from '../navigation/CongresosStack';
import { useAuth } from '../context/AuthContext';
import { BotonCristal, Cabecera, Cargando, Etiqueta, Tarjeta, TituloSeccion, Vacio } from '../components/ui';
import { F, sombra, useTema } from '../tema/tema';

type Props = NativeStackScreenProps<CongresosStackParamList, 'Congresos'>;

/**
 * Lista de congresos de la organizacion del asistente. Los trae de GET /congresos
 * (el backend, con el RLS, solo devuelve los de su tenant). Al tocar uno, navega
 * al detalle.
 *
 * Rediseño (mockup "A · Congresos"): el congreso más relevante (el que está en
 * curso o, si no, el más próximo) va DESTACADO arriba con banner; el resto, en
 * filas compactas con un cuadrito de calendario.
 */
export default function CongresosScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const t = useTema();
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

  const abrir = (c: Congreso) =>
    navigation.navigate('CongresoDetalle', { id: c.id, nombre: c.nombre });

  if (cargando) return <Cargando />;

  // Destacado: el que está en curso; si ninguno, el primero (ya vienen por fecha).
  const destacado = congresos.find((c) => enCurso(c.fecha_inicio, c.fecha_fin)) ?? congresos[0];
  const resto = congresos.filter((c) => c.id !== destacado?.id);

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <Cabecera
        antetitulo="Hola de nuevo"
        titulo="Tus congresos"
        derecha={<BotonCristal icono="log-out-outline" onPress={signOut} />}
      />

      <FlatList
        contentContainerStyle={est.lista}
        data={resto}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} tintColor={t.primario} />}
        ListHeaderComponent={
          destacado ? (
            <>
              <Destacado congreso={destacado} onPress={() => abrir(destacado)} />
              {resto.length > 0 && <TituloSeccion texto="Más congresos" />}
            </>
          ) : null
        }
        ListEmptyComponent={
          destacado ? null : (
            <Vacio texto={error ?? 'Aún no hay congresos disponibles.'} icono="calendar-outline" />
          )
        }
        renderItem={({ item }) => <FilaCongreso congreso={item} onPress={() => abrir(item)} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
}

/** Tarjeta grande con banner degradado (el congreso más relevante). */
function Destacado({ congreso, onPress }: { congreso: Congreso; onPress: () => void }) {
  const t = useTema();
  const vivo = enCurso(congreso.fecha_inicio, congreso.fecha_fin);
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[est.destacado, { backgroundColor: t.tarjeta, borderColor: t.borde }, sombra(t, 2)]}
    >
      <LinearGradient colors={['#4A38D6', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={est.banner}>
        <View style={est.bannerCirculo} />
        <Etiqueta texto={vivo ? 'EN CURSO' : 'PRÓXIMO'} tono="coralSolido" />
      </LinearGradient>
      <View style={{ padding: 18 }}>
        <Text style={[est.destNombre, { color: t.texto }]}>{congreso.nombre}</Text>
        <View style={est.meta}>
          <Ionicons name="calendar-outline" size={15} color={t.textoTenue} />
          <Text style={[est.metaTexto, { color: t.textoSuave }]}>
            {rangoFechas(congreso.fecha_inicio, congreso.fecha_fin)}
            {congreso.ciudad ? ` · ${congreso.ciudad}` : ''}
          </Text>
        </View>
        <View style={est.destPie}>
          <Text style={[est.destHint, { color: t.textoTenue }]}>Agenda, ponentes y networking</Text>
          <View style={[est.entrar, { backgroundColor: t.primario }]}>
            <Text style={est.entrarTexto}>Entrar</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/** Fila compacta con el "cuadrito" de calendario. */
export function FilaCongreso({
  congreso,
  onPress,
  etiqueta,
}: {
  congreso: Congreso;
  onPress?: () => void;
  etiqueta?: React.ReactNode;
}) {
  const t = useTema();
  const { mes, dia } = mesDia(congreso.fecha_inicio);
  return (
    <Tarjeta onPress={onPress} style={est.fila}>
      <View style={[est.calendario, { backgroundColor: t.primarioSuave }]}>
        <Text style={[est.calMes, { color: t.primarioTexto }]}>{mes}</Text>
        <Text style={[est.calDia, { color: t.primarioTexto }]}>{dia}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[est.filaNombre, { color: t.texto }]} numberOfLines={2}>
          {congreso.nombre}
        </Text>
        <Text style={[est.filaMeta, { color: t.textoTenue }]} numberOfLines={1}>
          {rangoFechas(congreso.fecha_inicio, congreso.fecha_fin)}
          {congreso.ciudad ? ` · ${congreso.ciudad}` : ''}
        </Text>
        {etiqueta ? <View style={{ marginTop: 6 }}>{etiqueta}</View> : null}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={18} color={t.textoTenue} />}
    </Tarjeta>
  );
}

const est = StyleSheet.create({
  lista: { padding: 20, paddingBottom: 32 },
  destacado: { borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  banner: { height: 96, padding: 16, overflow: 'hidden' },
  bannerCirculo: {
    position: 'absolute',
    right: -16,
    bottom: -24,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  destNombre: { fontFamily: F.titulo, fontSize: 20, letterSpacing: -0.3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  metaTexto: { fontFamily: F.medio, fontSize: 13.5 },
  destPie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  destHint: { fontFamily: F.medio, fontSize: 12.5, flex: 1 },
  entrar: { borderRadius: 12, paddingVertical: 9, paddingHorizontal: 18 },
  entrarTexto: { color: '#fff', fontFamily: F.negrita, fontSize: 13.5 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  calendario: { width: 48, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  calMes: { fontFamily: F.negrita, fontSize: 10 },
  calDia: { fontFamily: F.titulo, fontSize: 18, lineHeight: 21 },
  filaNombre: { fontFamily: F.negrita, fontSize: 15 },
  filaMeta: { fontFamily: F.medio, fontSize: 12.5, marginTop: 3 },
});
