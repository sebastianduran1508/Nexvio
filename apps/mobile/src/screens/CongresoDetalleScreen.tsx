import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
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
import type { Aviso, CongresoDetalle, Ponente, Sesion, Sponsor } from '../lib/tipos';
import type { CongresosStackParamList } from '../navigation/CongresosStack';
import {
  Avatar,
  Cabecera,
  Cargando,
  Etiqueta,
  Tarjeta,
  TituloConIcono,
  useBordeMarca,
  HoraDosPisos,
  Vacio,
  bandera,
} from '../components/ui';
import { textoSobre } from '../lib/color';
import { F, sombra, useTema } from '../tema/tema';
import { useFijarMarca, useMarca } from '../context/MarcaContext';
import { ultimoAvisoVisto } from '../lib/push';
import BotonFavorito from '../components/BotonFavorito';
import Patrocinio from '../components/Patrocinio';

import { useTranslation } from 'react-i18next';
import { avisoError } from '../components/Dialogo'; // 8.8: diálogos con el estilo de Nexvio
import { useMiCongreso } from '../context/MiCongresoContext'; // 8.10
type Props = NativeStackScreenProps<CongresosStackParamList, 'CongresoDetalle'>;

/**
 * "Mi congreso": la pantalla principal del asistente (agenda, sponsors, avisos,
 * networking).
 *
 * 8.7.b: ya NO hay botón de inscribirse/cancelar (la inscripción la hace la
 * organización con el Excel) y es la PRIMERA pantalla de la pestaña, así que
 * no lleva flecha de volver.
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
  // 8.10 (fix, 12-nov): el congreso sale del CONTEXTO, no de route.params.
  // React Navigation guarda el estado de las pestañas y, al volver a montar el
  // stack, podía devolver los params del congreso ANTERIOR (cambiar A→B
  // funcionaba, B→A no). El param queda solo como respaldo.
  const { actual } = useMiCongreso();
  const id = actual?.id ?? route.params.id;
  const t = useTema();
  const { t: tr } = useTranslation(); // 8.8
  const marca = useMarca();
  const fijarMarca = useFijarMarca();
  const [detalle, setDetalle] = useState<CongresoDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [diaElegido, setDiaElegido] = useState<string | null>(null);
  // 8.6: cuántos avisos hay y cuántos no ha visto la persona.
  const [avisos, setAvisos] = useState({ total: 0, nuevos: 0 });
  // 8.7.j: cabecera plegable — cuánto ha bajado la persona y cuánto mide la cabecera.
  const scrollY = useRef(new Animated.Value(0)).current;
  const [altoCabecera, setAltoCabecera] = useState(0);

  const cargar = useCallback(async () => {
    try {
      const [d, lista, visto] = await Promise.all([
        api<CongresoDetalle>('GET', `/congresos/${id}`),
        api<Aviso[]>('GET', `/congresos/${id}/avisos`).catch(() => [] as Aviso[]),
        ultimoAvisoVisto(id),
      ]);
      setAvisos({
        total: lista.length,
        nuevos: lista.filter((a) => !visto || a.enviado_en > visto).length,
      });
      setDetalle(d);
      // Guardar la marca de ESTE congreso para sus pantallas hijas (8.5).
      fijarMarca({
        congresoId: d.id,
        color_primario: d.personalizacion?.color_primario ?? null,
        color_secundario: d.personalizacion?.color_secundario ?? null,
        logo_url: d.personalizacion?.logo_url ?? null,
        imagen_portada_url: d.personalizacion?.imagen_portada_url ?? null,
        tema_default: d.personalizacion?.tema_default ?? 'sistema', // 8.7.g
      });
    } catch (e: any) {
      avisoError(tr('comun.error'), e.message ?? tr('congreso.errorCarga'));
    } finally {
      setCargando(false);
    }
  }, [id, fijarMarca]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

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

  const vivo = enCurso(detalle.fecha_inicio, detalle.fecha_fin);

  // ---- 8.7.j: el "momento" del congreso -----------------------------------
  // AHORA = la charla (no break) que está en vivo; PRÓXIMA = la siguiente que
  // aún no empieza. Solo presentación: misma lista de sesiones de siempre.
  const charlas = detalle.sesiones.filter((s) => s.tipo !== 'break');
  const ahora = charlas.find((s) => enVivo(s.inicio, s.fin)) ?? null;
  const proxima =
    [...charlas]
      .filter((s) => Date.parse(s.inicio) > Date.now())
      .sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))[0] ?? null;
  const indiceHoy = dias.findIndex(([k]) => k === hoy);
  const indicadorDia =
    vivo && indiceHoy >= 0
      ? { valor: tr('congreso.indDia', { n: indiceHoy + 1 }), texto: tr('congreso.indDe', { total: dias.length }) }
      : { valor: String(dias.length), texto: tr('congreso.indDias', { count: dias.length }) };
  const abrirSesion = (s: Sesion) =>
    navigation.navigate('Sesion', { sesionId: s.id, titulo: s.titulo, sponsors: s.sponsors?.map((x) => x.sponsor) });

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <Cabecera
        titulo={detalle.nombre}
        // 8.7.b: el congreso es la PRIMERA pantalla de la pestaña: sin flecha.
        onAtras={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        colores={marca.degradado}
        logo={marca.logo}
        plegable={{ scrollY, alMedir: setAltoCabecera }}
      >
        {/* 8.7.j: fechas, lugar e indicadores; al bajar se esconden (cabecera plegable) */}
        <View style={est.cabMeta}>
          {/* EN CURSO va aquí y no junto al título: así el nombre usa todo el ancho */}
          {vivo ? <Etiqueta texto={tr('congreso.enCurso')} punto colores={[marca.acento, marca.textoAcento]} /> : null}
          <View style={est.cabMetaItem}>
            <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={est.cabMetaTexto}>{rangoFechas(detalle.fecha_inicio, detalle.fecha_fin)}</Text>
          </View>
          {(detalle.lugar || detalle.ciudad) && (
            <View style={[est.cabMetaItem, { flexShrink: 1 }]}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={est.cabMetaTexto} numberOfLines={1}>
                {[detalle.lugar, detalle.ciudad].filter(Boolean).join(' · ')}
              </Text>
            </View>
          )}
        </View>
        <View style={est.indicadores}>
          <Indicador valor={String(charlas.length)} texto={tr('congreso.indCharlas', { count: charlas.length })} />
          <Indicador valor={String(detalle.ponentes.length)} texto={tr('congreso.indPonentes', { count: detalle.ponentes.length })} />
          <Indicador valor={indicadorDia.valor} texto={indicadorDia.texto} />
        </View>
      </Cabecera>

      {/* Animated.ScrollView: avisa a scrollY cuánto se bajó (en el hilo nativo).
          paddingTop = alto de la cabecera, que ahora flota encima. */}
      <Animated.ScrollView
        contentContainerStyle={[est.contenido, { paddingTop: altoCabecera + 16 }]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* Portada (banner) completa: no va detrás del texto para que se vea entera */}
        {marca.portada ? (
          <Image source={{ uri: marca.portada }} style={est.portada} resizeMode="cover" />
        ) : null}

        {/* ---------- AHORA / PRÓXIMA (8.7.j) ---------- */}
        {ahora ? <TarjetaAhora sesion={ahora} onPress={() => abrirSesion(ahora)} /> : null}
        {proxima ? <FilaProxima sesion={proxima} onPress={() => abrirSesion(proxima)} /> : null}

        {detalle.descripcion ? (
          <Text style={[est.descripcion, { color: t.textoSuave }]}>{detalle.descripcion}</Text>
        ) : null}

        {/* ---------- Sponsors (8.5) ---------- */}
        {detalle.sponsors.length > 0 && (
          <FranjaSponsors
            sponsors={detalle.sponsors}
            onPress={() => navigation.navigate('Patrocinadores', { congresoId: id, nombre: detalle.nombre })}
          />
        )}

        {/* ---------- Avisos (8.6) ---------- */}
        <Tarjeta
          style={est.networking}
          onPress={() => navigation.navigate('Avisos', { congresoId: id, nombre: detalle.nombre })}
        >
          <View style={[est.netIcono, { backgroundColor: marca.primarioSuave }]}>
            <Ionicons name="notifications-outline" size={20} color={marca.primarioTexto} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[est.netTitulo, { color: t.texto }]}>{tr('congreso.avisosTitulo')}</Text>
            <Text style={[est.netTexto, { color: t.textoSuave }]}>
              {avisos.total === 0
                ? tr('congreso.avisosVacio')
                : tr('congreso.avisosCuenta', { count: avisos.total })}
            </Text>
          </View>
          {avisos.nuevos > 0 && (
            <Etiqueta
              texto={tr('congreso.nuevos', { count: avisos.nuevos })}
              colores={[marca.acento, marca.textoAcento]}
            />
          )}
          <Ionicons name="chevron-forward" size={18} color={t.textoTenue} />
        </Tarjeta>

        {/* 8.7.j: se quitó la tarjeta "Conecta con asistentes": era redundante con
            la pestaña Networking de la barra de abajo. */}

        {/* ---------- Agenda por día ---------- */}
        <TituloConIcono texto={tr('congreso.agenda')} icono="time-outline" />
        {dias.length > 0 && zonaDelTelefono() ? (
          <View style={est.zona}>
            <Ionicons name="globe-outline" size={13} color={t.textoTenue} />
            <Text style={[est.zonaTexto, { color: t.textoTenue }]}>
              {tr('congreso.zona', { zona: zonaDelTelefono() })}
            </Text>
          </View>
        ) : null}
        {dias.length === 0 ? (
          <Vacio texto={tr('congreso.sinSesiones')} icono="time-outline" />
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
                      <Text style={[est.diaSemana, { color: activo ? 'rgba(255,255,255,0.85)' : t.textoSuave }]}>
                        {semana}
                        {k === hoy ? ` · ${tr('congreso.hoy')}` : ''}
                      </Text>
                      <Text style={[est.diaNum, { color: activo ? '#fff' : t.texto }]}>{dia}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* 8.7.j: línea de tiempo — la hora a la izquierda, como la agenda del panel */}
            <View style={{ gap: 10 }}>
              {sesionesDelDia.map((s) => (
                <View key={s.id} style={est.filaTiempo}>
                  <View style={est.horaTiempo}>
                    <HoraDosPisos texto={hora(s.inicio)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ItemAgenda sesion={s} onPress={() => abrirSesion(s)} />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ---------- Ponentes ---------- */}
        <TituloConIcono texto={tr('congreso.ponentes')} icono="mic-outline" />
        {detalle.ponentes.length === 0 ? (
          <Vacio texto={tr('congreso.sinPonentes')} icono="mic-outline" />
        ) : (
          <View style={{ gap: 10 }}>
            {detalle.ponentes.map((p) => (
              <FichaPonente key={p.id} ponente={p} />
            ))}
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}

/** Un indicador "de cristal" dentro de la cabecera (18 charlas, 6 ponentes...). */
function Indicador({ valor, texto }: { valor: string; texto: string }) {
  return (
    <View style={est.indicador}>
      <Text style={est.indicadorValor} numberOfLines={1}>{valor}</Text>
      <Text style={est.indicadorTexto} numberOfLines={1}>{texto}</Text>
    </View>
  );
}

/** 8.7.j: la charla que está pasando AHORA, grande y con botón para entrar. */
function TarjetaAhora({ sesion, onPress }: { sesion: Sesion; onPress: () => void }) {
  const t = useTema();
  const { t: tr } = useTranslation(); // 8.8
  const marca = useMarca();
  const ponentes = sesion.ponentes?.map((x) => x.ponente) ?? [];
  const p = ponentes[0];
  return (
    <Tarjeta style={{ gap: 10, marginBottom: 10 }}>
      <View style={est.sesionArriba}>
        <Etiqueta texto={tr('congreso.enVivo')} tono="rojo" punto />
        <Text style={[est.ahoraHora, { color: t.textoSuave }]} numberOfLines={1}>
          {hora(sesion.inicio)} – {hora(sesion.fin)}{sesion.sala ? ` · ${sesion.sala}` : ''}
        </Text>
        <BotonFavorito sesionId={sesion.id} />
      </View>
      <Text style={[est.ahoraTitulo, { color: t.texto }]}>{sesion.titulo}</Text>
      {p ? (
        <View style={est.sesionPonentes}>
          <Avatar nombre={p.nombre} foto={p.foto_url} tamano={34} />
          <View style={{ flex: 1 }}>
            <Text style={[est.netTitulo, { color: t.texto, fontSize: 13.5 }]} numberOfLines={1}>
              {ponentes.length > 1 ? tr('congreso.yMas', { nombre: p.nombre, n: ponentes.length - 1 }) : p.nombre}
            </Text>
            {[p.cargo, p.empresa].filter(Boolean).length ? (
              <Text style={[est.netTexto, { color: t.textoSuave }]} numberOfLines={1}>
                {[p.cargo, p.empresa].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[est.ahoraBoton, { backgroundColor: marca.primario }]}>
        <Text style={[est.ahoraBotonTexto, { color: textoSobre(marca.primario) }]}>{tr('congreso.entrarSala')}</Text>
        <Ionicons name="arrow-forward" size={17} color={textoSobre(marca.primario)} />
      </TouchableOpacity>
    </Tarjeta>
  );
}

/** 8.7.j: la siguiente charla, en una fila compacta ("en 25 min"). */
function FilaProxima({ sesion, onPress }: { sesion: Sesion; onPress: () => void }) {
  const t = useTema();
  const { t: tr } = useTranslation(); // 8.8
  const marca = useMarca();
  const min = Math.round((Date.parse(sesion.inicio) - Date.now()) / 60000);
  const cuando =
    min < 60 ? tr('tiempo.enMin', { n: Math.max(min, 1) })
    : claveDia(sesion.inicio) === hoyISO() ? tr('tiempo.hoyHora', { hora: hora(sesion.inicio) })
    : `${etiquetaDia(claveDia(sesion.inicio)).semana} ${etiquetaDia(claveDia(sesion.inicio)).dia}`;
  return (
    <Tarjeta onPress={onPress} style={est.proxima}>
      <View style={[est.proximaChip, { backgroundColor: marca.primarioSuave }]}>
        <Text style={[est.proximaChipTexto, { color: marca.primarioTexto }]}>{cuando}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[est.proximaEtiqueta, { color: t.textoSuave }]}>{tr('congreso.proxima', { hora: hora(sesion.inicio) })}</Text>
        <Text style={[est.netTitulo, { color: t.texto }]} numberOfLines={1}>{sesion.titulo}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={t.textoTenue} />
    </Tarjeta>
  );
}

/**
 * Un bloque de la agenda: charla/taller/plenaria (tocable) o break (no).
 * 8.7.j: mismos colores que la agenda del panel — café ámbar y almuerzo verde
 * (borde punteado), taller cian, plenaria coral y charla con el color del
 * congreso (la franja de la izquierda). En vivo, la franja usa el acento.
 */
function ItemAgenda({ sesion, onPress }: { sesion: Sesion; onPress: () => void }) {
  const t = useTema();
  const { t: tr } = useTranslation(); // 8.8
  const marca = useMarca();
  const bordeMarca = useBordeMarca();
  const esBreak = sesion.tipo === 'break';
  const vivo = enVivo(sesion.inicio, sesion.fin);
  const ponentes = sesion.ponentes?.map((x) => x.ponente) ?? [];
  const horario = `${hora(sesion.inicio)} – ${hora(sesion.fin)}${sesion.sala ? ` · ${sesion.sala}` : ''}`;

  if (esBreak) {
    const almuerzo = /almuerzo|almorzar|lunch/i.test(sesion.titulo);
    const [fondo, borde, texto] = almuerzo
      ? [t.verdeSuave, t.verdeBorde, t.verde]
      : [t.ambarSuave, t.ambarBorde, t.ambarTexto];
    return (
      <View style={[est.break, { backgroundColor: fondo, borderColor: borde }]}>
        <Ionicons name={almuerzo ? 'restaurant-outline' : 'cafe-outline'} size={18} color={texto} />
        <View style={{ flex: 1 }}>
          <Text style={[est.breakTitulo, { color: texto }]}>{sesion.titulo}</Text>
          <Text style={[est.breakHora, { color: t.textoSuave }]}>{horario}</Text>
          {sesion.sponsors?.length ? <Patrocinio sponsors={sesion.sponsors.map((x) => x.sponsor)} esBreak /> : null}
        </View>
      </View>
    );
  }

  const franja = vivo
    ? marca.acento
    : sesion.tipo === 'taller'
      ? t.cian
      : sesion.tipo === 'plenaria'
        ? t.coral
        : marca.primario;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[est.sesion, { backgroundColor: t.tarjeta, borderColor: vivo ? marca.primario : bordeMarca, borderWidth: vivo ? 2 : 1.5 }, sombra(t)]}
    >
      <View style={[est.barra, { backgroundColor: franja }]} />
      <View style={{ flex: 1, padding: 14, paddingLeft: 14 }}>
        <View style={est.sesionArriba}>
          <Text style={[est.sesionHora, { color: marca.primarioTexto }]} numberOfLines={1}>
            {horario}
          </Text>
          {vivo ? (
            <Etiqueta texto={tr('congreso.enVivo')} tono="rojo" punto />
          ) : sesion.tipo === 'taller' ? (
            <Etiqueta texto={tr('congreso.taller')} tono="cian" />
          ) : sesion.tipo === 'plenaria' ? (
            <Etiqueta texto={tr('congreso.plenaria')} tono="coral" />
          ) : null}
          {/* 8.7.e: agregar a Mi agenda */}
          <BotonFavorito sesionId={sesion.id} />
        </View>
        <Text style={[est.sesionTitulo, { color: t.texto }]}>{sesion.titulo}</Text>

        {ponentes.length > 0 && (
          <View style={est.sesionPonentes}>
            <View style={{ flexDirection: 'row' }}>
              {ponentes.slice(0, 3).map((p, i) => (
                <View key={p.id} style={{ marginLeft: i === 0 ? 0 : -8, borderRadius: 10, borderWidth: 2, borderColor: t.tarjeta }}>
                  {/* 8.7.j: la foto del ponente si la tiene (antes solo iniciales) */}
                  <Avatar nombre={p.nombre} foto={p.foto_url} tamano={26} />
                </View>
              ))}
            </View>
            <Text style={[est.sesionPonentesTexto, { color: t.textoSuave }]} numberOfLines={1}>
              {ponentes.map((p) => p.nombre).join(', ')}
            </Text>
          </View>
        )}

        {sesion.sponsors?.length ? <Patrocinio sponsors={sesion.sponsors.map((x) => x.sponsor)} /> : null}

        <View style={est.sesionLink}>
          <Ionicons name="chatbubbles-outline" size={14} color={marca.primarioTexto} />
          <Text style={[est.sesionLinkTexto, { color: marca.primarioTexto }]}>{tr('congreso.preguntasEncuestas')}</Text>
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
  const { t: tr } = useTranslation(); // 8.8
  const marca = useMarca();
  return (
    <View style={{ marginTop: 18 }}>
      <TouchableOpacity onPress={onPress} style={est.franjaTitulo} hitSlop={6}>
        <Text style={[est.franjaTexto, { color: t.textoSuave }]}>{tr('congreso.conApoyo')}</Text>
        <View style={est.franjaVer}>
          <Text style={[est.franjaVerTexto, { color: marca.primarioTexto }]}>{tr('congreso.verTodos')}</Text>
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
  const { t: tr } = useTranslation(); // 8.8
  const cargoEmpresa = [ponente.cargo, ponente.empresa].filter(Boolean).join(' · ');
  // El borde de color de marca ya lo pone <Tarjeta> (useBordeMarca).
  return (
    <Tarjeta style={est.ponente}>
      {/* Foto más grande (antes 50 → ahora 76): la persona es lo importante */}
      <Avatar nombre={ponente.nombre} foto={ponente.foto_url} tamano={76} />
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
  contenido: { padding: 16, paddingTop: 16, paddingBottom: 32 },
  portada: { width: '100%', aspectRatio: 16 / 9, borderRadius: 20, marginBottom: 12 },
  // 8.7.j: cabecera con datos e indicadores
  cabMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, columnGap: 14, marginTop: 14 },
  cabMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cabMetaTexto: { color: 'rgba(255,255,255,0.92)', fontFamily: F.semi, fontSize: 13 },
  indicadores: { flexDirection: 'row', gap: 8, marginTop: 14 },
  indicador: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  indicadorValor: { color: '#fff', fontFamily: F.titulo, fontSize: 19 },
  indicadorTexto: { color: 'rgba(255,255,255,0.86)', fontFamily: F.semi, fontSize: 11.5 },
  // 8.7.j: AHORA / PRÓXIMA
  ahoraHora: { fontFamily: F.semi, fontSize: 12.5, flex: 1 },
  ahoraTitulo: { fontFamily: F.titulo, fontSize: 18.5, lineHeight: 24 },
  ahoraBoton: { height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2 },
  ahoraBotonTexto: { fontFamily: F.negrita, fontSize: 14.5 },
  proxima: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, marginBottom: 4 },
  proximaChip: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 },
  proximaChipTexto: { fontFamily: F.negrita, fontSize: 11.5 },
  proximaEtiqueta: { fontFamily: F.negrita, fontSize: 10.5, letterSpacing: 0.6 },
  // 8.7.j: línea de tiempo
  filaTiempo: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  horaTiempo: { width: 44, paddingTop: 14, alignItems: 'flex-start' },
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
  break: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14, borderWidth: 1.5, borderStyle: 'dashed' },
  breakTitulo: { fontFamily: F.semi, fontSize: 14 },
  breakHora: { fontFamily: F.medio, fontSize: 12, marginTop: 1 },
  ponente: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  ponNombre: { fontFamily: F.negrita, fontSize: 15 },
  ponCargo: { fontFamily: F.medio, fontSize: 13, marginTop: 2 },
  ponPais: { fontFamily: F.medio, fontSize: 12.5, marginTop: 3 },
  ponBio: { fontFamily: F.normal, fontSize: 13, lineHeight: 18, marginTop: 6 },
});
