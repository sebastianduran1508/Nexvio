import React from 'react';
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
import { enCurso, mesDia, rangoFechas } from '../lib/formato';
import type { Congreso } from '../lib/tipos';
import { useAuth } from '../context/AuthContext';
import { useMiCongreso } from '../context/MiCongresoContext';
import { BotonCristal, Cabecera, Etiqueta, Tarjeta, TituloSeccion, Vacio } from '../components/ui';
import { F, sombra, useTema } from '../tema/tema';

/**
 * ELEGIR CONGRESO (8.7.b) — solo aparece en el caso raro de que la persona
 * esté inscrita en DOS o más congresos (y no haya elegido uno todavía, o haya
 * tocado "Cambiar de congreso" en su Perfil). Con uno solo, entra directo.
 *
 * Antes (Fase 4) esta era la lista de TODOS los congresos de la organización;
 * desde el 8.7.b el backend solo trae aquellos en los que está inscrita.
 * Se conserva el diseño de la feria: el más relevante (en curso o el más
 * próximo) destacado arriba y el resto en filas compactas.
 */
export default function ElegirCongresoScreen() {
  const { signOut, yo } = useAuth();
  const { congresos, elegir, recargar } = useMiCongreso();
  const t = useTema();

  const destacado = congresos.find((c) => enCurso(c.fecha_inicio, c.fecha_fin)) ?? congresos[0];
  const resto = congresos.filter((c) => c.id !== destacado?.id);

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <Cabecera
        antetitulo={`Hola, ${yo?.nombre?.split(' ')[0] ?? ''}`}
        titulo="Elige tu congreso"
        subtitulo="Estás inscrito en más de uno"
        derecha={<BotonCristal icono="log-out-outline" onPress={signOut} />}
      />
      <FlatList
        contentContainerStyle={est.lista}
        data={resto}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={recargar} tintColor={t.primario} />}
        ListHeaderComponent={
          destacado ? (
            <>
              <Destacado congreso={destacado} onPress={() => elegir(destacado.id)} />
              {resto.length > 0 && <TituloSeccion texto="También estás en" />}
            </>
          ) : null
        }
        renderItem={({ item }) => <FilaCongreso congreso={item} onPress={() => elegir(item.id)} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
}

/**
 * SIN CONGRESO (8.7.b): la cuenta existe pero no tiene ninguna inscripción
 * confirmada (p. ej. el organizador la quitó). No es un error de la app.
 */
export function SinCongresoScreen() {
  const { signOut, yo } = useAuth();
  const { recargar } = useMiCongreso();
  const t = useTema();
  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <Cabecera
        antetitulo={`Hola, ${yo?.nombre?.split(' ')[0] ?? ''}`}
        titulo="Tu congreso"
        derecha={<BotonCristal icono="log-out-outline" onPress={signOut} />}
      />
      <FlatList
        data={[]}
        renderItem={null}
        contentContainerStyle={est.lista}
        refreshControl={<RefreshControl refreshing={false} onRefresh={recargar} tintColor={t.primario} />}
        ListEmptyComponent={
          <Vacio
            icono="calendar-outline"
            texto={'Aún no tienes un congreso asignado.\nSi ya te inscribiste, escríbele al organizador del evento.\n\nDesliza hacia abajo para actualizar.'}
          />
        }
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
