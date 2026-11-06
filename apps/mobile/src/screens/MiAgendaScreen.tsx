import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import { claveDia, enVivo, etiquetaDia, hora } from '../lib/formato';
import type { CongresoDetalle, Sesion } from '../lib/tipos';
import { Cabecera, Cargando, Etiqueta, HoraDosPisos, Tarjeta, Vacio, useBordeMarca } from '../components/ui';
import { textoSobre } from '../lib/color';
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
 * 8.7.j: rediseño del mockup — AHORA y PRÓXIMA lado a lado, aviso de cruce en
 * ámbar arriba, "Hoy · vie 21" y la hora dentro de cada tarjeta.
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

  // 8.7.j: AHORA y PRÓXIMA a la vez (lado a lado), como el mockup.
  const ahora = mias.find((s) => enVivo(s.inicio, s.fin));
  const proxima = mias.find((s) => new Date(s.inicio) > new Date());
  // El primer cruce que todavía no pasó: se avisa arriba, una sola vez.
  const cruceGeneral = (() => {
    for (const s of mias) {
      if (new Date(s.fin) < new Date()) continue;
      const o = mias.find((x) => x.id !== s.id && seCruzan(s, x));
      if (o) return s;
    }
    return null;
  })();
  const hoy = claveDia(new Date().toISOString());

  const abrir = (s: Sesion) => navigation.navigate('Sesion', { sesionId: s.id, titulo: s.titulo, sponsors: s.sponsors?.map((x) => x.sponsor) });

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <Cabecera
        antetitulo={detalle?.nombre ?? 'Tu congreso'}
        titulo="Mi agenda"
        subtitulo={
          mias.length > 0
            ? `${mias.length} charla${mias.length === 1 ? '' : 's'} marcada${mias.length === 1 ? '' : 's'} · ${dias.length} día${dias.length === 1 ? '' : 's'}`
            : undefined
        }
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
          <View style={[est.vacioIcono, { backgroundColor: t.ambarSuave }]}>
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
            <Ionicons name="calendar-outline" size={17} color={textoSobre(marca.primario)} />
            <Text style={[est.vacioBotonTexto, { color: textoSobre(marca.primario) }]}>Ver la agenda del congreso</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} tintColor={marca.primario} />}
        >
          {/* ---------- Lo urgente: AHORA y PRÓXIMA, lado a lado ---------- */}
          {(ahora || proxima) && (
            <View style={est.urgentes}>
              {ahora && (
                <Tarjeta style={est.urgente} onPress={() => abrir(ahora)}>
                  <Etiqueta texto="AHORA" tono="rojo" punto />
                  <Text style={[est.urgenteTitulo, { color: t.texto }]} numberOfLines={3}>{ahora.titulo}</Text>
                  <Text style={[est.urgenteMeta, { color: t.textoSuave }]} numberOfLines={1}>
                    Hasta las {hora(ahora.fin)}{ahora.sala ? ` · ${ahora.sala}` : ''}
                  </Text>
                </Tarjeta>
              )}
              {proxima && (
                <Tarjeta style={est.urgente} onPress={() => abrir(proxima)}>
                  <Etiqueta texto={`PRÓXIMA · ${cuandoEmpieza(proxima.inicio).toUpperCase()}`} colores={[marca.primarioSuave, marca.primarioTexto]} />
                  <Text style={[est.urgenteTitulo, { color: t.texto }]} numberOfLines={3}>{proxima.titulo}</Text>
                  <Text style={[est.urgenteMeta, { color: t.textoSuave }]} numberOfLines={1}>
                    {hora(proxima.inicio)}{proxima.sala ? ` · ${proxima.sala}` : ''}
                  </Text>
                </Tarjeta>
              )}
            </View>
          )}

          {/* ---------- Aviso de cruce (ámbar, como en el panel) ---------- */}
          {cruceGeneral && (
            <View style={[est.aviso, { backgroundColor: t.ambarSuave, borderColor: t.ambarBorde }]}>
              <Ionicons name="warning-outline" size={18} color={t.ambarTexto} />
              <Text style={[est.avisoTexto, { color: t.ambarTexto }]}>
                Tienes charlas que se cruzan el {etiquetaDia(claveDia(cruceGeneral.inicio)).semana}{' '}
                {etiquetaDia(claveDia(cruceGeneral.inicio)).dia} a las {hora(cruceGeneral.inicio)}. Elige a cuál ir.
              </Text>
            </View>
          )}

          {/* ---------- Por día ---------- */}
          {dias.map(([clave, sesiones]) => {
            const e = etiquetaDia(clave);
            return (
              <View key={clave} style={{ marginTop: 20 }}>
                <View style={est.diaFila}>
                  <Text style={[est.dia, { color: t.texto }]}>
                    {clave === hoy ? `Hoy · ${e.semana} ${e.dia}` : `${e.semana} ${e.dia}`}
                  </Text>
                  <Text style={[est.diaCuenta, { color: t.textoSuave }]}>
                    {sesiones.length} charla{sesiones.length === 1 ? '' : 's'}
                  </Text>
                </View>
                <View style={{ gap: 10 }}>
                  {sesiones.map((s) => (
                    <FilaCharla
                      key={s.id}
                      sesion={s}
                      cruce={mias.find((o) => o.id !== s.id && seCruzan(s, o))}
                      onPress={() => abrir(s)}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

/**
 * Una charla marcada. La hora va DENTRO de la tarjeta (mockup 8.7.j) con lo que
 * la caracteriza debajo: TERMINÓ, EN VIVO o el tipo (TALLER, PLENARIA).
 * La que está en vivo, con borde resaltado. Las que ya pasaron NO se apagan
 * enteras (con opacity el texto quedaba gris y difícil de leer, ajuste del
 * 6-nov): se ven igual que las demás, con "TERMINÓ" y el borde gris tenue
 * en vez del color de marca.
 */
function FilaCharla({ sesion: s, cruce, onPress }: { sesion: Sesion; cruce?: Sesion; onPress: () => void }) {
  const t = useTema();
  const marca = useMarca();
  const bordeMarca = useBordeMarca();
  const paso = new Date(s.fin) < new Date();
  const vivo = enVivo(s.inicio, s.fin);
  const ponentes = s.ponentes?.map((x) => x.ponente.nombre) ?? [];
  // 8.7.j: el estado va en una PASTILLA (como "EN CURSO"), no en texto suelto.
  // [texto, fondo, color, ícono o punto]
  const estado: [string, string, string, 'punto' | 'check' | null] | null = paso
    ? ['TERMINÓ', t.barraFondo, t.textoSuave, 'check']
    : vivo
      ? ['EN VIVO', t.rojoSuave, t.rojo, 'punto']
      : s.tipo === 'taller'
        ? ['TALLER', t.cianSuave, t.cianTexto, null]
        : s.tipo === 'plenaria'
          ? ['PLENARIA', t.coralSuave, t.coralTexto, null]
          : null;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        est.tarjeta,
        { backgroundColor: t.tarjeta, borderColor: vivo ? marca.primario : paso ? t.borde : bordeMarca, borderWidth: vivo ? 2 : 1.5 },
        sombra(t),
      ]}
    >
      <View style={est.horas}>
        <HoraDosPisos texto={hora(s.inicio)} color={vivo ? marca.primarioTexto : t.texto} />
        {estado ? (
          <View style={[est.pastilla, { backgroundColor: estado[1] }]}>
            {estado[3] === 'punto' ? <View style={[est.pastillaPunto, { backgroundColor: estado[2] }]} /> : null}
            {estado[3] === 'check' ? <Ionicons name="checkmark" size={10} color={estado[2]} /> : null}
            <Text style={[est.pastillaTexto, { color: estado[2] }]}>{estado[0]}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[est.titulo, { color: t.texto }]}>{s.titulo}</Text>
        {(s.sala || ponentes.length > 0) && (
          <Text style={[est.meta, { color: t.textoSuave }]} numberOfLines={2}>
            {[ponentes.join(', '), s.sala].filter(Boolean).join(' · ')}
          </Text>
        )}
        {s.sponsors?.length ? <Patrocinio sponsors={s.sponsors.map((x) => x.sponsor)} /> : null}
        {cruce && !paso && (
          <View style={[est.cruce, { backgroundColor: t.ambarSuave }]}>
            <Ionicons name="warning-outline" size={13} color={t.ambarTexto} />
            <Text style={[est.cruceTexto, { color: t.ambarTexto }]} numberOfLines={2}>
              Se cruza con «{cruce.titulo}»
            </Text>
          </View>
        )}
      </View>
      <BotonFavorito sesionId={s.id} />
    </TouchableOpacity>
  );
}

const est = StyleSheet.create({
  vacio: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  vacioIcono: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  vacioTitulo: { fontFamily: F.titulo, fontSize: 22, marginTop: 16 },
  vacioTexto: { fontFamily: F.normal, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  vacioBoton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, marginTop: 20 },
  vacioBotonTexto: { fontFamily: F.negrita, fontSize: 14.5 },
  urgentes: { flexDirection: 'row', gap: 10 },
  urgente: { flex: 1, gap: 6, padding: 12 },
  urgenteTitulo: { fontFamily: F.negrita, fontSize: 14, lineHeight: 19 },
  urgenteMeta: { fontFamily: F.semi, fontSize: 12 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 },
  avisoTexto: { flex: 1, fontFamily: F.semi, fontSize: 12.5, lineHeight: 17 },
  diaFila: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 10, marginHorizontal: 2 },
  dia: { fontFamily: F.titulo, fontSize: 17 },
  diaCuenta: { fontFamily: F.semi, fontSize: 12 },
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 12 },
  horas: { width: 68, alignItems: 'center' },
  pastilla: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, marginTop: 5 },
  pastillaPunto: { width: 5, height: 5, borderRadius: 3 },
  pastillaTexto: { fontFamily: F.negrita, fontSize: 9, letterSpacing: 0.3 },
  titulo: { fontFamily: F.negrita, fontSize: 14.5, lineHeight: 19 },
  meta: { fontFamily: F.medio, fontSize: 12.5, marginTop: 3 },
  cruce: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6, marginTop: 8 },
  cruceTexto: { flex: 1, fontFamily: F.semi, fontSize: 12 },
});
