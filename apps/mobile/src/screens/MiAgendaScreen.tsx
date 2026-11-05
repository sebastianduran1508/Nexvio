import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import { claveDia, enVivo, etiquetaDia, hora } from '../lib/formato';
import type { CongresoDetalle, Sesion } from '../lib/tipos';
import { Cabecera, Cargando, Vacio } from '../components/ui';
import BotonFavorito from '../components/BotonFavorito';
import Patrocinio from '../components/Patrocinio';
import { useMiAgenda } from '../context/MiAgendaContext';
import { useMarca } from '../context/MarcaContext';
import { F, sombra, useTema } from '../tema/tema';
import type { MiAgendaStackParamList } from '../navigation/MiAgendaStack';

type Props = NativeStackScreenProps<MiAgendaStackParamList, 'MiAgenda'>;

/** ¿Se cruzan dos charlas? (una empieza antes de que la otra termine) */
const seCruzan = (a: Sesion, b: Sesion) =>
  new Date(a.inicio) < new Date(b.fin) && new Date(b.inicio) < new Date(a.fin);

/** "en 25 min" · "en 2 h" · "mañana 10:00" · "vie 13 · 10:00" */
function cuandoEmpieza(iso: string) {
  const min = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (min < 60) return `en ${Math.max(min, 1)} min`;
  if (min < 6 * 60) return `en ${Math.round(min / 60)} h`;
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  if (claveDia(iso) === claveDia(manana.toISOString())) return `mañana ${hora(iso)}`;
  const e = etiquetaDia(claveDia(iso));
  return `${e.semana} ${e.dia} · ${hora(iso)}`;
}

/**
 * MI AGENDA (8.7.e) — las charlas que la persona marcó con ⭐, por día.
 *
 *  - Arriba, lo urgente: la charla que está EN VIVO o la PRÓXIMA ("en 25 min").
 *  - Si dos marcadas se cruzan de horario, lo avisa ("⚠️ Se cruza con …"):
 *    así decide a cuál ir antes de llegar.
 *  - Las que ya pasaron se ven apagadas.
 *  - Quitar la ⭐ aquí la quita en todas partes (MiAgendaContext).
 */
export default function MiAgendaScreen({ route, navigation }: Props) {
  const { congresoId } = route.params;
  const t = useTema();
  const marca = useMarca();
  const { ids, recargar } = useMiAgenda();
  const [detalle, setDetalle] = useState<CongresoDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [d] = await Promise.all([api<CongresoDetalle>('GET', `/congresos/${congresoId}`), recargar()]);
      setDetalle(d);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo cargar tu agenda');
    }
  }, [congresoId, recargar]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const mias = useMemo(
    () =>
      (detalle?.sesiones ?? [])
        .filter((s) => ids.has(s.id))
        .sort((a, b) => +new Date(a.inicio) - +new Date(b.inicio)),
    [detalle, ids],
  );

  const dias = useMemo(() => {
    const g = new Map<string, Sesion[]>();
    for (const s of mias) {
      const k = claveDia(s.inicio);
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(s);
    }
    return [...g.entries()];
  }, [mias]);

  const ahora = mias.find((s) => enVivo(s.inicio, s.fin));
  const proxima = !ahora ? mias.find((s) => new Date(s.inicio) > new Date()) : undefined;
  const destacada = ahora ?? proxima;

  const abrir = (s: Sesion) => navigation.navigate('Sesion', { sesionId: s.id, titulo: s.titulo, sponsors: s.sponsors?.map((x) => x.sponsor) });

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <Cabecera
        antetitulo={detalle?.nombre ?? 'Tu congreso'}
        titulo="Mi agenda"
        subtitulo={mias.length > 0 ? `${mias.length} charla${mias.length === 1 ? '' : 's'} marcada${mias.length === 1 ? '' : 's'}` : undefined}
        colores={marca.degradado}
      />

      {error ? (
        <Vacio icono="cloud-offline-outline" texto={error} />
      ) : !detalle ? (
        <Cargando />
      ) : mias.length === 0 ? (
        <ScrollView
          contentContainerStyle={est.vacio}
          refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} tintColor={marca.primario} />}
        >
          <View style={est.vacioIcono}>
            <Ionicons name="star" size={34} color="#F59E0B" />
          </View>
          <Text style={[est.vacioTitulo, { color: t.texto }]}>Tu agenda está vacía</Text>
          <Text style={[est.vacioTexto, { color: t.textoSuave }]}>
            Toca la ⭐ en las charlas que no te quieres perder y aparecerán aquí, ordenadas por hora.
          </Text>
          <TouchableOpacity
            style={[est.vacioBoton, { backgroundColor: marca.primario }]}
            onPress={() => navigation.getParent()?.navigate('CongresosTab')}
          >
            <Ionicons name="calendar-outline" size={17} color="#fff" />
            <Text style={est.vacioBotonTexto}>Ver la agenda del congreso</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} tintColor={marca.primario} />}
        >
          {/* ---------- Lo urgente ---------- */}
          {destacada && (
            <TouchableOpacity activeOpacity={0.85} onPress={() => abrir(destacada)}>
              <LinearGradient colors={marca.degradado} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[est.destacada, sombra(t, 2)]}>
                <View style={est.destacadaFila}>
                  <View style={[est.chip, { backgroundColor: ahora ? '#F43F5E' : 'rgba(255,255,255,0.22)' }]}>
                    {ahora ? <View style={est.punto} /> : <Ionicons name="time-outline" size={13} color="#fff" />}
                    <Text style={est.chipTexto}>{ahora ? 'AHORA' : `PRÓXIMA · ${cuandoEmpieza(destacada.inicio).toUpperCase()}`}</Text>
                  </View>
                </View>
                <Text style={est.destacadaTitulo} numberOfLines={2}>{destacada.titulo}</Text>
                <Text style={est.destacadaMeta}>
                  {hora(destacada.inicio)} – {hora(destacada.fin)}
                  {destacada.sala ? ` · ${destacada.sala}` : ''}
                </Text>
                <View style={est.destacadaPie}>
                  <Text style={est.destacadaAccion}>{ahora ? 'Entrar: preguntas y encuestas' : 'Ver la charla'}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* ---------- Por día ---------- */}
          {dias.map(([clave, sesiones]) => {
            const e = etiquetaDia(clave);
            return (
              <View key={clave} style={{ marginTop: 22 }}>
                <Text style={[est.dia, { color: t.texto }]}>
                  {e.semana} <Text style={{ color: t.textoSuave }}>{e.dia}</Text>
                </Text>
                {sesiones.map((s) => {
                  const cruce = mias.find((o) => o.id !== s.id && seCruzan(s, o));
                  const paso = new Date(s.fin) < new Date();
                  const vivo = enVivo(s.inicio, s.fin);
                  const ponentes = s.ponentes?.map((x) => x.ponente.nombre) ?? [];
                  return (
                    <View key={s.id} style={[est.fila, paso && { opacity: 0.5 }]}>
                      <View style={est.horas}>
                        <Text style={[est.horaInicio, { color: vivo ? '#F43F5E' : marca.primarioTexto }]}>{hora(s.inicio)}</Text>
                        <Text style={[est.horaFin, { color: t.textoTenue }]}>{hora(s.fin)}</Text>
                        <View style={[est.linea, { backgroundColor: t.borde }]} />
                      </View>
                      <TouchableOpacity
                        style={[est.tarjeta, { backgroundColor: t.tarjeta, borderColor: vivo ? '#F43F5E' : t.borde }, sombra(t)]}
                        onPress={() => abrir(s)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1 }}>
                          {vivo && <Text style={est.enVivo}>● EN VIVO</Text>}
                          <Text style={[est.titulo, { color: t.texto }]}>{s.titulo}</Text>
                          {(s.sala || ponentes.length > 0) && (
                            <Text style={[est.meta, { color: t.textoSuave }]} numberOfLines={2}>
                              {[s.sala, ponentes.join(', ')].filter(Boolean).join(' · ')}
                            </Text>
                          )}
                          {s.sponsors?.length ? <Patrocinio sponsors={s.sponsors.map((x) => x.sponsor)} /> : null}
                          {cruce && !paso && (
                            <View style={[est.cruce, { backgroundColor: t.coralSuave }]}>
                              <Ionicons name="warning-outline" size={13} color={t.coral} />
                              <Text style={[est.cruceTexto, { color: t.coral }]} numberOfLines={2}>
                                Se cruza con «{cruce.titulo}»
                              </Text>
                            </View>
                          )}
                        </View>
                        <BotonFavorito sesionId={s.id} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const est = StyleSheet.create({
  vacio: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  vacioIcono: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  vacioTitulo: { fontFamily: F.titulo, fontSize: 22, marginTop: 16 },
  vacioTexto: { fontFamily: F.normal, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  vacioBoton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, marginTop: 20 },
  vacioBotonTexto: { color: '#fff', fontFamily: F.negrita, fontSize: 14.5 },
  destacada: { borderRadius: 22, padding: 18 },
  destacadaFila: { flexDirection: 'row' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  punto: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  chipTexto: { color: '#fff', fontFamily: F.negrita, fontSize: 11, letterSpacing: 0.5 },
  destacadaTitulo: { color: '#fff', fontFamily: F.titulo, fontSize: 21, marginTop: 12, letterSpacing: -0.3 },
  destacadaMeta: { color: 'rgba(255,255,255,0.85)', fontFamily: F.medio, fontSize: 13.5, marginTop: 4 },
  destacadaPie: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  destacadaAccion: { color: '#fff', fontFamily: F.negrita, fontSize: 13.5 },
  dia: { fontFamily: F.titulo, fontSize: 17, marginBottom: 10, textTransform: 'capitalize' },
  fila: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  horas: { width: 50, alignItems: 'flex-end', paddingTop: 14 },
  horaInicio: { fontFamily: F.negrita, fontSize: 13.5 },
  horaFin: { fontFamily: F.medio, fontSize: 11.5, marginTop: 1 },
  linea: { width: 2, flex: 1, borderRadius: 1, marginTop: 6, alignSelf: 'flex-end', marginRight: 10 },
  tarjeta: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 16, borderWidth: 1, padding: 14 },
  enVivo: { color: '#F43F5E', fontFamily: F.negrita, fontSize: 11, marginBottom: 3 },
  titulo: { fontFamily: F.negrita, fontSize: 15, lineHeight: 20 },
  meta: { fontFamily: F.medio, fontSize: 12.5, marginTop: 4 },
  cruce: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6, marginTop: 8 },
  cruceTexto: { flex: 1, fontFamily: F.semi, fontSize: 12 },
});
