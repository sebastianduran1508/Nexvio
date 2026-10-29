import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import {
  claveDia,
  enCurso,
  enVivo,
  etiquetaDia,
  hoyISO,
  hora,
  rangoFechas,
  zonaDelTelefono,
} from '../lib/formato';
import type { CongresoDetalle, Inscripcion, Ponente, Sesion, Sponsor } from '../lib/tipos';
import type { CongresosStackParamList } from '../navigation/CongresosStack';
import {
  Avatar,
  Boton,
  Cabecera,
  Cargando,
  Etiqueta,
  Tarjeta,
  TituloSeccion,
  Vacio,
  bandera,
} from '../components/ui';
import { F, sombra, useTema } from '../tema/tema';
import { useFijarMarca, useMarca } from '../context/MarcaContext';

type Props = NativeStackScreenProps<CongresosStackParamList, 'CongresoDetalle'>;

/**
 * Detalle de un congreso: su agenda (sesiones con sus ponentes) y el boton de
 * inscripcion. Para saber si el asistente YA esta inscrito, ademas del detalle
 * pedimos "/inscripciones/mias" y buscamos este congreso.
 *
 * Rediseño (mockup "A · Detalle"):
 *  - Cabecera con degradado y el estado del congreso.
 *  - AGENDA POR DÍA: pestañas arriba (Sáb 24 oct · Dom 25 oct) y solo las
 *    sesiones de ese día. No hay ninguna llamada nueva: es la misma lista de
 *    sesiones de siempre, agrupada en pantalla por su día local.
 *  - Los breaks (café, almuerzo) se ven distintos y no abren la pantalla de
 *    preguntas, porque no tienen preguntas ni encuestas.
 *  - Ponentes con avatar, cargo, empresa y bandera.
 *
 * Bloque 8.5 — la MARCA DEL EVENTO:
 *  - Al cargar, guarda la personalización en MarcaContext para que Sesión,
 *    Networking, Chat y Patrocinadores usen los mismos colores.
 *  - Cabecera con el degradado y el logo del congreso, portada arriba, y el
 *    color principal en botones, pestañas de día y agenda.
 *  - Franja "Con el apoyo de" con los logos de los sponsors (Oro primero).
 */
export default function CongresoDetalleScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const t = useTema();
  const marca = useMarca();
  const fijarMarca = useFijarMarca();
  const [detalle, setDetalle] = useState<CongresoDetalle | null>(null);
  const [inscripcion, setInscripcion] = useState<Inscripcion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [accion, setAccion] = useState(false); // true mientras inscribe/cancela
  const [diaElegido, setDiaElegido] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [d, mias] = await Promise.all([
        api<CongresoDetalle>('GET', `/congresos/${id}`),
        api<Inscripcion[]>('GET', '/inscripciones/mias'),
      ]);
      setDetalle(d);
      // Guardar la marca de ESTE congreso para sus pantallas hijas (8.5).
      fijarMarca({
        congresoId: d.id,
        color_primario: d.personalizacion?.color_primario ?? null,
        color_secundario: d.personalizacion?.color_secundario ?? null,
        logo_url: d.personalizacion?.logo_url ?? null,
        imagen_portada_url: d.personalizacion?.imagen_portada_url ?? null,
      });
      setInscripcion(mias.find((i) => i.congreso.id === id) ?? null);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo cargar el congreso');
    } finally {
      setCargando(false);
    }
  }, [id, fijarMarca]);

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

  // ---- Agrupar la agenda por día (solo presentación) ----------------------
  // useMemo: solo se recalcula cuando cambian las sesiones, no en cada render.
  const dias = useMemo(() => {
    const grupos = new Map<string, Sesion[]>();
    for (const s of detalle?.sesiones ?? []) {
      const k = claveDia(s.inicio);
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k)!.push(s);
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [detalle]);

  // Día que se ve: el elegido; si no, HOY (si el congreso tiene agenda hoy);
  // si no, el primer día.
  const hoy = hoyISO();
  const diaActivo =
    (diaElegido && dias.find(([k]) => k === diaElegido)?.[0]) ??
    dias.find(([k]) => k === hoy)?.[0] ??
    dias[0]?.[0];
  const sesionesDelDia = dias.find(([k]) => k === diaActivo)?.[1] ?? [];

  if (cargando || !detalle) return <Cargando />;

  const inscrito = !!inscripcion;
  const vivo = enCurso(detalle.fecha_inicio, detalle.fecha_fin);

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <Cabecera
        compacta
        titulo={detalle.nombre}
        onAtras={() => navigation.goBack()}
        derecha={vivo ? <Etiqueta texto="EN CURSO" colores={[marca.acento, marca.textoAcento]} /> : undefined}
        colores={marca.degradado}
        logo={marca.logo}
      />

      <ScrollView contentContainerStyle={est.contenido}>
        {marca.portada ? (
          <Image source={{ uri: marca.portada }} style={est.portada} resizeMode="cover" />
        ) : null}
        {/* ---------- Datos del congreso ---------- */}
        <View style={est.meta}>
          <Ionicons name="calendar-outline" size={15} color={t.textoTenue} />
          <Text style={[est.metaTexto, { color: t.textoSuave }]}>
            {rangoFechas(detalle.fecha_inicio, detalle.fecha_fin)}
          </Text>
        </View>
        {(detalle.lugar || detalle.ciudad) && (
          <View style={est.meta}>
            <Ionicons name="location-outline" size={15} color={t.textoTenue} />
            <Text style={[est.metaTexto, { color: t.textoSuave }]}>
              {[detalle.lugar, detalle.ciudad].filter(Boolean).join(' · ')}
            </Text>
          </View>
        )}
        {detalle.descripcion ? (
          <Text style={[est.descripcion, { color: t.textoSuave }]}>{detalle.descripcion}</Text>
        ) : null}

        {/* ---------- Inscripción ---------- */}
        {inscrito && (
          <View style={{ marginTop: 14 }}>
            <Etiqueta texto="ESTÁS INSCRITO" tono="verde" punto />
          </View>
        )}
        <Boton
          texto={inscrito ? 'Cancelar inscripción' : 'Inscribirme'}
          variante={inscrito ? 'peligro' : 'primario'}
          onPress={inscrito ? cancelar : inscribirme}
          cargando={accion}
          style={{ marginTop: 14 }}
          color={marca.primario}
        />

        {/* ---------- Sponsors (8.5) ---------- */}
        {detalle.sponsors.length > 0 && (
          <FranjaSponsors
            sponsors={detalle.sponsors}
            onPress={() => navigation.navigate('Patrocinadores', { congresoId: id, nombre: detalle.nombre })}
          />
        )}

        {/* ---------- Networking ---------- */}
        <Tarjeta
          style={est.networking}
          onPress={() => navigation.navigate('Networking', { congresoId: id, nombre: detalle.nombre })}
        >
          <View style={[est.netIcono, { backgroundColor: t.coralSuave }]}>
            <Ionicons name="people-outline" size={20} color={t.coral} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[est.netTitulo, { color: t.texto }]}>Conecta con asistentes</Text>
            <Text style={[est.netTexto, { color: t.textoTenue }]}>Networking y chat del congreso</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.textoTenue} />
        </Tarjeta>

        {/* ---------- Agenda por día ---------- */}
        <TituloSeccion texto="Agenda" />
        {dias.length > 0 && zonaDelTelefono() ? (
          <View style={est.zona}>
            <Ionicons name="globe-outline" size={13} color={t.textoTenue} />
            <Text style={[est.zonaTexto, { color: t.textoTenue }]}>
              Horas en tu zona horaria ({zonaDelTelefono()})
            </Text>
          </View>
        ) : null}
        {dias.length === 0 ? (
          <Vacio texto="Este congreso aún no tiene sesiones." icono="time-outline" />
        ) : (
          <>
            {dias.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={est.dias}>
                {dias.map(([k]) => {
                  const activo = k === diaActivo;
                  const { semana, dia } = etiquetaDia(k);
                  return (
                    <TouchableOpacity
                      key={k}
                      onPress={() => setDiaElegido(k)}
                      style={[
                        est.diaChip,
                        activo
                          ? { backgroundColor: marca.primario, borderColor: marca.primario }
                          : { backgroundColor: t.tarjeta, borderColor: t.borde },
                      ]}
                    >
                      <Text style={[est.diaSemana, { color: activo ? 'rgba(255,255,255,0.8)' : t.textoTenue }]}>
                        {semana}
                        {k === hoy ? ' · hoy' : ''}
                      </Text>
                      <Text style={[est.diaNum, { color: activo ? '#fff' : t.texto }]}>{dia}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View style={{ gap: 10 }}>
              {sesionesDelDia.map((s) => (
                <ItemAgenda
                  key={s.id}
                  sesion={s}
                  onPress={() => navigation.navigate('Sesion', { sesionId: s.id, titulo: s.titulo })}
                />
              ))}
            </View>
          </>
        )}

        {/* ---------- Ponentes ---------- */}
        <TituloSeccion texto="Ponentes" />
        {detalle.ponentes.length === 0 ? (
          <Vacio texto="Aún no hay ponentes registrados." icono="mic-outline" />
        ) : (
          <View style={{ gap: 10 }}>
            {detalle.ponentes.map((p) => (
              <FichaPonente key={p.id} ponente={p} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/** Un bloque de la agenda: charla/taller/plenaria (tocable) o break (no). */
function ItemAgenda({ sesion, onPress }: { sesion: Sesion; onPress: () => void }) {
  const t = useTema();
  const marca = useMarca();
  const esBreak = sesion.tipo === 'break';
  const vivo = enVivo(sesion.inicio, sesion.fin);
  const ponentes = sesion.ponentes?.map((x) => x.ponente) ?? [];
  const horario = `${hora(sesion.inicio)} – ${hora(sesion.fin)}${sesion.sala ? ` · ${sesion.sala}` : ''}`;

  if (esBreak) {
    return (
      <View style={[est.break, { backgroundColor: t.barraFondo }]}>
        <Ionicons
          name={/almuerzo/i.test(sesion.titulo) ? 'restaurant-outline' : 'cafe-outline'}
          size={18}
          color={t.textoSuave}
        />
        <View style={{ flex: 1 }}>
          <Text style={[est.breakTitulo, { color: t.textoSuave }]}>{sesion.titulo}</Text>
          <Text style={[est.breakHora, { color: t.textoTenue }]}>{horario}</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[est.sesion, { backgroundColor: t.tarjeta, borderColor: t.borde }, sombra(t)]}
    >
      <View style={[est.barra, { backgroundColor: vivo ? marca.acento : marca.primario }]} />
      <View style={{ flex: 1, padding: 14, paddingLeft: 16 }}>
        <View style={est.sesionArriba}>
          <Text style={[est.sesionHora, { color: marca.primarioTexto }]} numberOfLines={1}>
            {horario}
          </Text>
          {vivo ? (
            <Etiqueta texto="EN VIVO" tono="rojo" punto />
          ) : sesion.tipo === 'taller' ? (
            <Etiqueta texto="TALLER" tono="coral" />
          ) : sesion.tipo === 'plenaria' ? (
            <Etiqueta texto="PLENARIA" colores={[marca.primarioSuave, marca.primarioTexto]} />
          ) : null}
        </View>
        <Text style={[est.sesionTitulo, { color: t.texto }]}>{sesion.titulo}</Text>

        {ponentes.length > 0 && (
          <View style={est.sesionPonentes}>
            <View style={{ flexDirection: 'row' }}>
              {ponentes.slice(0, 3).map((p, i) => (
                <View key={p.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                  <Avatar nombre={p.nombre} tamano={24} />
                </View>
              ))}
            </View>
            <Text style={[est.sesionPonentesTexto, { color: t.textoSuave }]} numberOfLines={1}>
              {ponentes.map((p) => p.nombre).join(', ')}
            </Text>
          </View>
        )}

        <View style={est.sesionLink}>
          <Ionicons name="chatbubbles-outline" size={14} color={marca.primarioTexto} />
          <Text style={[est.sesionLinkTexto, { color: marca.primarioTexto }]}>Preguntas y encuestas</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Franja "Con el apoyo de" (8.5): los logos de los sponsors en una fila que se
 * desliza de lado. Ya vienen ordenados por nivel (Oro primero) desde el backend.
 * Tocarla abre la pantalla de Patrocinadores.
 */
function FranjaSponsors({ sponsors, onPress }: { sponsors: Sponsor[]; onPress: () => void }) {
  const t = useTema();
  const marca = useMarca();
  return (
    <View style={{ marginTop: 18 }}>
      <TouchableOpacity onPress={onPress} style={est.franjaTitulo} hitSlop={6}>
        <Text style={[est.franjaTexto, { color: t.textoSuave }]}>CON EL APOYO DE</Text>
        <View style={est.franjaVer}>
          <Text style={[est.franjaVerTexto, { color: marca.primarioTexto }]}>Ver todos</Text>
          <Ionicons name="chevron-forward" size={14} color={marca.primarioTexto} />
        </View>
      </TouchableOpacity>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {sponsors.map((s) => (
          <TouchableOpacity
            key={s.id}
            activeOpacity={0.8}
            onPress={onPress}
            style={[
              est.franjaLogo,
              { borderColor: t.borde, width: s.nivel === 'oro' ? 108 : 84 },
            ]}
          >
            {s.logo_url ? (
              <Image source={{ uri: s.logo_url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            ) : (
              <Text style={est.franjaSinLogo} numberOfLines={2}>{s.nombre}</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

/** Ficha del ponente: foto (si hay) o iniciales, cargo, empresa y bandera. */
function FichaPonente({ ponente }: { ponente: Ponente }) {
  const t = useTema();
  const cargoEmpresa = [ponente.cargo, ponente.empresa].filter(Boolean).join(' · ');
  return (
    <Tarjeta style={est.ponente}>
      {ponente.foto_url ? (
        <Image source={{ uri: ponente.foto_url }} style={est.foto} />
      ) : (
        <Avatar nombre={ponente.nombre} tamano={50} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={[est.ponNombre, { color: t.texto }]}>{ponente.nombre}</Text>
        {cargoEmpresa ? (
          <Text style={[est.ponCargo, { color: t.textoSuave }]}>{cargoEmpresa}</Text>
        ) : null}
        {ponente.pais ? (
          <Text style={[est.ponPais, { color: t.textoTenue }]}>
            {bandera(ponente.pais_codigo)} {ponente.pais}
          </Text>
        ) : null}
        {ponente.bio ? (
          <Text style={[est.ponBio, { color: t.textoSuave }]} numberOfLines={3}>
            {ponente.bio}
          </Text>
        ) : null}
      </View>
    </Tarjeta>
  );
}

const est = StyleSheet.create({
  contenido: { padding: 20, paddingBottom: 40 },
  portada: { width: '100%', aspectRatio: 16 / 9, borderRadius: 18, marginBottom: 14 },
  franjaTitulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginHorizontal: 2 },
  franjaTexto: { fontFamily: F.tituloMedio, fontSize: 12, letterSpacing: 0.6 },
  franjaVer: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  franjaVerTexto: { fontFamily: F.semi, fontSize: 12.5 },
  franjaLogo: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#fff',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  franjaSinLogo: { fontFamily: F.titulo, fontSize: 11, color: '#94A3B8', textAlign: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  metaTexto: { fontFamily: F.medio, fontSize: 13.5, flex: 1 },
  descripcion: { fontFamily: F.normal, fontSize: 14, lineHeight: 20, marginTop: 8 },
  networking: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, paddingVertical: 14 },
  netIcono: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  netTitulo: { fontFamily: F.negrita, fontSize: 14.5 },
  netTexto: { fontFamily: F.medio, fontSize: 12.5, marginTop: 1 },
  dias: { gap: 8, paddingBottom: 14 },
  zona: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -6, marginBottom: 12, marginHorizontal: 4 },
  zonaTexto: { fontFamily: F.medio, fontSize: 12 },
  diaChip: { borderWidth: 1, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center' },
  diaSemana: { fontFamily: F.semi, fontSize: 11.5 },
  diaNum: { fontFamily: F.titulo, fontSize: 15, marginTop: 1 },
  sesion: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  barra: { width: 4 },
  sesionArriba: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sesionHora: { fontFamily: F.negrita, fontSize: 12.5, flex: 1 },
  sesionTitulo: { fontFamily: F.negrita, fontSize: 15.5, marginTop: 4, lineHeight: 21 },
  sesionPonentes: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  sesionPonentesTexto: { fontFamily: F.medio, fontSize: 12.5, flex: 1 },
  sesionLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  sesionLinkTexto: { fontFamily: F.semi, fontSize: 12.5 },
  break: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 16 },
  breakTitulo: { fontFamily: F.semi, fontSize: 14 },
  breakHora: { fontFamily: F.medio, fontSize: 12, marginTop: 1 },
  ponente: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  foto: { width: 50, height: 50, borderRadius: 16 },
  ponNombre: { fontFamily: F.negrita, fontSize: 15 },
  ponCargo: { fontFamily: F.medio, fontSize: 13, marginTop: 2 },
  ponPais: { fontFamily: F.medio, fontSize: 12.5, marginTop: 3 },
  ponBio: { fontFamily: F.normal, fontSize: 13, lineHeight: 18, marginTop: 6 },
});
