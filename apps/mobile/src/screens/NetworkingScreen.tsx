import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import type { ConexionRed, Perfil, PonenteRed, TarjetaPersona as Persona } from '../lib/tipos';
import { Avatar, Cabecera, Cargando, Vacio, bandera } from '../components/ui';
import TarjetaPersona from '../components/TarjetaPersona';
import MatchModal from '../components/MatchModal';
import { useMarca } from '../context/MarcaContext';
import { F, sombra, useTema } from '../tema/tema';
import type { NetworkingStackParamList } from '../navigation/NetworkingStack';

type Props = NativeStackScreenProps<NetworkingStackParamList, 'Networking'>;
type Vista = 'descubrir' | 'explorar' | 'conexiones';

const ANCHO = Dimensions.get('window').width;
const UMBRAL = ANCHO * 0.28; // cuánto hay que arrastrar para decidir

/** Ponente sin cuenta -> la forma de una tarjeta (para el perfil completo). */
export function ponenteComoPersona(p: PonenteRed): Persona {
  return {
    id: p.id,
    nombre: p.nombre,
    foto_url: p.foto_url,
    cargo: p.cargo,
    empresa: p.empresa,
    pais: p.pais,
    pais_codigo: p.pais_codigo,
    descripcion: p.bio,
    edad: null,
    insignia: 'ponente',
    charlas: p.charlas,
  };
}

/**
 * NETWORKING (8.7.d) — tres secciones:
 *  - DESCUBRIR: una tarjeta por persona. Arrastrar a la derecha = 💜 "Me
 *    interesa"; a la izquierda = "Ahora no". También con los botones ✕ y 💜.
 *    Tocar la tarjeta abre el perfil completo. Primero salen quienes ya te
 *    dieron 💜 (¡más probabilidad de match!).
 *  - EXPLORAR: todos, en cuadrícula, con buscador y filtros; incluye a TODOS
 *    los speakers (con o sin cuenta).
 *  - CONEXIONES: los matches, para chatear.
 *
 * Cómo se mueve la tarjeta: PanResponder (lee el dedo) + Animated (la mueve).
 * Mientras arrastras, la tarjeta gira un poco y aparece el sello CONECTAR o
 * PASAR; al soltar, si pasaste el umbral sale volando y se registra la
 * decisión; si no, vuelve a su lugar con un "resorte".
 */
export default function NetworkingScreen({ route, navigation }: Props) {
  const { congresoId } = route.params;
  const t = useTema();
  const marca = useMarca();
  const [vista, setVista] = useState<Vista>('descubrir');
  const [personas, setPersonas] = useState<Persona[] | null>(null);
  const [ponentes, setPonentes] = useState<PonenteRed[]>([]);
  const [conexiones, setConexiones] = useState<ConexionRed[]>([]);
  const [yo, setYo] = useState<Perfil | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<{ persona: Persona; conexionId: string } | null>(null);

  // La pila de Descubrir. Se arma al cargar y se va "comiendo" con cada
  // decisión (sin volver a pedir todo al servidor).
  const [pila, setPila] = useState<Persona[]>([]);

  const cargar = useCallback(async () => {
    try {
      const [ps, pn, cx, perfil] = await Promise.all([
        api<Persona[]>('GET', `/congresos/${congresoId}/networking/personas`),
        api<PonenteRed[]>('GET', `/congresos/${congresoId}/networking/ponentes`).catch(() => []),
        api<ConexionRed[]>('GET', '/conexiones').catch(() => []),
        api<Perfil>('GET', '/perfil').catch(() => null),
      ]);
      setPersonas(ps);
      setPonentes(pn);
      setConexiones(cx);
      setYo(perfil);
      setError(null);
      setPila(
        ps
          .filter((p) => p.estado === 'ninguno' || p.estado === 'recibido')
          // Primero quienes ya me dieron 💜, luego los que tienen foto.
          .sort((a, b) =>
            Number(b.estado === 'recibido') - Number(a.estado === 'recibido') ||
            Number(!!b.foto_url) - Number(!!a.foto_url) ||
            a.nombre.localeCompare(b.nombre),
          ),
      );
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo cargar el networking');
    }
  }, [congresoId]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const recibidos = (personas ?? []).filter((p) => p.estado === 'recibido').length;
  const pasados = (personas ?? []).filter((p) => p.estado === 'descartado').length;

  /** Registrar la decisión sobre `p` (la tarjeta ya salió de la pila). */
  async function decidir(p: Persona, dir: 'der' | 'izq') {
    try {
      if (dir === 'der') {
        const r = await api<{ match: boolean; conexionId?: string }>('POST', `/congresos/${congresoId}/intereses`, {
          receptor_id: p.id,
        });
        if (r.match && r.conexionId) setMatch({ persona: p, conexionId: r.conexionId });
      } else {
        await api('POST', `/congresos/${congresoId}/networking/pasar`, { receptor_id: p.id });
      }
      // Actualizamos el estado local (Explorar y los contadores lo usan).
      setPersonas((lista) =>
        (lista ?? []).map((x) => (x.id === p.id ? { ...x, estado: dir === 'der' ? 'enviado' : 'descartado' } : x)),
      );
    } catch (e: any) {
      Alert.alert('No se pudo guardar', e?.message ?? 'Intenta de nuevo');
      setPila((pl) => [p, ...pl]); // la devolvemos a la pila
    }
  }

  function abrirPerfil(p: Persona, sinCuenta = false) {
    navigation.navigate('PerfilPersona', { persona: p, congresoId, sinCuenta });
  }

  async function restablecer() {
    try {
      await api('POST', `/congresos/${congresoId}/networking/restablecer`);
      await cargar();
      setVista('descubrir');
    } catch (e: any) {
      Alert.alert('No se pudo', e?.message ?? 'Intenta de nuevo');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <Cabecera compacta titulo="Networking" antetitulo="Conecta con el congreso" colores={marca.degradado}>
        <View style={est.segmentos}>
          {(['descubrir', 'explorar', 'conexiones'] as Vista[]).map((v) => {
            const activa = vista === v;
            const n = v === 'conexiones' ? conexiones.length : 0;
            return (
              <TouchableOpacity key={v} style={[est.segmento, activa && est.segmentoActivo]} onPress={() => setVista(v)}>
                <Text style={[est.segmentoTexto, { color: activa ? marca.primario : 'rgba(255,255,255,0.9)' }]}>
                  {v === 'descubrir' ? 'Descubrir' : v === 'explorar' ? 'Explorar' : 'Conexiones'}
                </Text>
                {n > 0 && (
                  <View style={[est.contador, { backgroundColor: activa ? marca.primario : '#fff' }]}>
                    <Text style={[est.contadorTexto, { color: activa ? '#fff' : marca.primario }]}>{n}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Cabecera>

      {yo?.visible_networking === false && (
        <View style={[est.aviso, { backgroundColor: t.coralSuave }]}>
          <Ionicons name="eye-off-outline" size={16} color={t.coral} />
          <Text style={[est.avisoTexto, { color: t.texto }]}>
            Estás oculto: los demás no te ven. Actívalo en Perfil → Aparecer en networking.
          </Text>
        </View>
      )}

      {error ? (
        <Vacio icono="cloud-offline-outline" texto={error} />
      ) : !personas ? (
        <Cargando />
      ) : vista === 'descubrir' ? (
        <Descubrir
          pila={pila}
          setPila={setPila}
          decidir={decidir}
          abrirPerfil={abrirPerfil}
          recibidos={recibidos}
          pasados={pasados}
          alExplorar={() => setVista('explorar')}
          alRestablecer={restablecer}
        />
      ) : vista === 'explorar' ? (
        <Explorar personas={personas} ponentes={ponentes} abrirPerfil={abrirPerfil} recargar={cargar} />
      ) : (
        <Conexiones
          conexiones={conexiones}
          recibidos={recibidos}
          recargar={cargar}
          alAbrir={(c) => navigation.navigate('Chat', { conexionId: c.id, nombre: c.con.nombre, foto: c.con.foto_url, otroId: c.con.id })}
          alDescubrir={() => setVista('descubrir')}
        />
      )}

      <MatchModal
        visible={!!match}
        yo={yo ? { nombre: yo.nombre, foto_url: yo.foto_url } : null}
        otro={match?.persona ?? null}
        alSeguir={() => setMatch(null)}
        alMensaje={() => {
          const m = match;
          setMatch(null);
          void cargar();
          if (m) navigation.navigate('Chat', { conexionId: m.conexionId, nombre: m.persona.nombre, foto: m.persona.foto_url, otroId: m.persona.id });
        }}
      />
    </View>
  );
}

// ===========================================================================
// DESCUBRIR — la pila de tarjetas
// ===========================================================================

function Descubrir({
  pila,
  setPila,
  decidir,
  abrirPerfil,
  recibidos,
  pasados,
  alExplorar,
  alRestablecer,
}: {
  pila: Persona[];
  setPila: React.Dispatch<React.SetStateAction<Persona[]>>;
  decidir: (p: Persona, dir: 'der' | 'izq') => void;
  abrirPerfil: (p: Persona) => void;
  recibidos: number;
  pasados: number;
  alExplorar: () => void;
  alRestablecer: () => void;
}) {
  const t = useTema();
  const marca = useMarca();
  const pos = useRef(new Animated.ValueXY()).current;
  const actual = pila[0];
  const siguiente = pila[1];

  // El PanResponder se crea UNA vez; para que siempre "vea" la tarjeta de
  // arriba actual, la leemos desde una ref que se actualiza en cada render.
  const arriba = useRef<Persona | undefined>(actual);
  arriba.current = actual;
  const decidirRef = useRef(decidir);
  decidirRef.current = decidir;

  function salir(dir: 'der' | 'izq') {
    const p = arriba.current;
    if (!p) return;
    Animated.timing(pos, {
      toValue: { x: dir === 'der' ? ANCHO * 1.4 : -ANCHO * 1.4, y: 40 },
      duration: 230,
      useNativeDriver: false,
    }).start(() => {
      setPila((pl) => pl.filter((x) => x.id !== p.id));
      decidirRef.current(p, dir);
    });
  }

  // La posición se reinicia cuando YA cambió la tarjeta de arriba (si se
  // hiciera antes, la que se fue "parpadearía" un cuadro en el centro).
  useEffect(() => {
    pos.setValue({ x: 0, y: 0 });
  }, [actual?.id, pos]);
  const salirRef = useRef(salir);
  salirRef.current = salir;

  const gestos = useRef(
    PanResponder.create({
      // Solo tomamos el gesto si es un arrastre HORIZONTAL (un toque abre el perfil).
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > UMBRAL) salirRef.current('der');
        else if (g.dx < -UMBRAL) salirRef.current('izq');
        else Animated.spring(pos, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: false }).start();
      },
    }),
  ).current;

  const giro = pos.x.interpolate({ inputRange: [-ANCHO / 2, 0, ANCHO / 2], outputRange: ['-10deg', '0deg', '10deg'] });
  const selloSi = pos.x.interpolate({ inputRange: [0, UMBRAL], outputRange: [0, 1], extrapolate: 'clamp' });
  const selloNo = pos.x.interpolate({ inputRange: [-UMBRAL, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const escalaSiguiente = pos.x.interpolate({
    inputRange: [-ANCHO / 2, 0, ANCHO / 2],
    outputRange: [1, 0.93, 1],
    extrapolate: 'clamp',
  });

  if (!actual) {
    return (
      <ScrollView contentContainerStyle={est.fin}>
        <View style={[est.finIcono, { backgroundColor: marca.primarioSuave }]}>
          <Ionicons name="sparkles" size={30} color={marca.primarioTexto} />
        </View>
        <Text style={[est.finTitulo, { color: t.texto }]}>¡Ya viste a todos!</Text>
        <Text style={[est.finTexto, { color: t.textoSuave }]}>
          Cuando lleguen más asistentes aparecerán aquí. Mientras tanto, busca a alguien en Explorar.
        </Text>
        <TouchableOpacity style={[est.finBoton, { backgroundColor: marca.primario }]} onPress={alExplorar}>
          <Ionicons name="grid-outline" size={17} color="#fff" />
          <Text style={est.finBotonTexto}>Ir a Explorar</Text>
        </TouchableOpacity>
        {pasados > 0 && (
          <TouchableOpacity onPress={alRestablecer} style={{ padding: 12 }}>
            <Text style={[est.finEnlace, { color: marca.primarioTexto }]}>
              Volver a ver a {pasados === 1 ? 'la persona que pasaste' : `las ${pasados} personas que pasaste`}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
      {recibidos > 0 && (
        <Text style={[est.pista, { color: t.textoSuave }]}>
          💜 {recibidos === 1 ? '1 persona quiere' : `${recibidos} personas quieren`} conectar contigo
        </Text>
      )}

      <View style={{ flex: 1 }}>
        {siguiente && (
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: escalaSiguiente }] }]}>
            <TarjetaPersona persona={siguiente} style={{ flex: 1 }} />
          </Animated.View>
        )}
        <Animated.View
          key={actual.id}
          {...gestos.panHandlers}
          style={[
            StyleSheet.absoluteFill,
            sombra(t, 2),
            { transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate: giro }] },
          ]}
        >
          <Pressable style={{ flex: 1 }} onPress={() => abrirPerfil(actual)}>
            <TarjetaPersona persona={actual} style={{ flex: 1 }} />
          </Pressable>
          <Animated.View style={[est.sello, est.selloSi, { opacity: selloSi }]}>
            <Text style={[est.selloTexto, { color: '#22C55E' }]}>CONECTAR</Text>
          </Animated.View>
          <Animated.View style={[est.sello, est.selloNo, { opacity: selloNo }]}>
            <Text style={[est.selloTexto, { color: '#F43F5E' }]}>PASAR</Text>
          </Animated.View>
        </Animated.View>
      </View>

      <View style={est.botones}>
        <BotonRedondo icono="close" color="#F43F5E" tamano={58} onPress={() => salir('izq')} etiqueta="Ahora no" />
        <BotonRedondo icono="information" color={t.textoSuave} tamano={44} onPress={() => abrirPerfil(actual)} etiqueta="Ver perfil" />
        <BotonRedondo icono="heart" color="#fff" fondo={marca.primario} tamano={66} onPress={() => salir('der')} etiqueta="Me interesa" />
      </View>
    </View>
  );
}

function BotonRedondo({
  icono,
  color,
  fondo,
  tamano,
  onPress,
  etiqueta,
}: {
  icono: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  fondo?: string;
  tamano: number;
  onPress: () => void;
  etiqueta: string;
}) {
  const t = useTema();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={etiqueta}
      style={[
        { width: tamano, height: tamano, borderRadius: tamano / 2, backgroundColor: fondo ?? t.tarjeta },
        est.redondo,
        sombra(t, 2),
      ]}
    >
      <Ionicons name={icono} size={tamano * 0.46} color={color} />
    </TouchableOpacity>
  );
}

// ===========================================================================
// EXPLORAR — cuadrícula con buscador y filtros
// ===========================================================================

type Filtro = 'todos' | 'ponentes' | 'organizacion' | string; // string = código de país

function Explorar({
  personas,
  ponentes,
  abrirPerfil,
  recargar,
}: {
  personas: Persona[];
  ponentes: PonenteRed[];
  abrirPerfil: (p: Persona, sinCuenta?: boolean) => void;
  recargar: () => Promise<void>;
}) {
  const t = useTema();
  const marca = useMarca();
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const normal = (s?: string | null) => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  // Los países que realmente hay en el congreso (para los chips).
  const paises = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of personas) if (p.pais_codigo && p.pais) m.set(p.pais_codigo, p.pais);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [personas]);

  // Con el filtro Ponentes salen TODOS los speakers: los que tienen cuenta (con
  // su tarjeta y su estado) y los que no (solo con sus charlas).
  const items = useMemo(() => {
    const porId = new Map(personas.map((p) => [p.id, p]));
    let lista: { persona: Persona; sinCuenta: boolean }[];
    if (filtro === 'ponentes') {
      lista = ponentes.map((pn) => {
        const cuenta = pn.usuario_id ? porId.get(pn.usuario_id) : undefined;
        return cuenta ? { persona: cuenta, sinCuenta: false } : { persona: ponenteComoPersona(pn), sinCuenta: true };
      });
    } else {
      lista = personas
        .filter((p) =>
          filtro === 'todos' ? true : filtro === 'organizacion' ? p.insignia === 'organizacion' || p.insignia === 'coordinador' : p.pais_codigo === filtro,
        )
        .map((p) => ({ persona: p, sinCuenta: false }));
    }
    const nq = normal(q.trim());
    if (nq) {
      lista = lista.filter(({ persona: p }) =>
        normal(`${p.nombre} ${p.cargo} ${p.empresa} ${p.pais} ${p.descripcion}`).includes(nq),
      );
    }
    return lista.sort((a, b) => a.persona.nombre.localeCompare(b.persona.nombre));
  }, [personas, ponentes, filtro, q]);

  const chips: { id: Filtro; texto: string }[] = [
    { id: 'todos', texto: 'Todos' },
    { id: 'ponentes', texto: '🎤 Ponentes' },
    { id: 'organizacion', texto: 'Organización' },
    ...paises.map(([codigo, nombre]) => ({ id: codigo, texto: `${bandera(codigo)} ${nombre}` })),
  ];

  const anchoCelda = (ANCHO - 16 * 2 - 12) / 2;

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => `${i.sinCuenta ? 'pn' : 'u'}-${i.persona.id}`}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={recargar} tintColor={marca.primario} />}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <View>
            <Ionicons name="search" size={17} color={t.textoTenue} style={est.lupa} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Busca por nombre, cargo, empresa…"
              placeholderTextColor={t.textoTenue}
              style={[est.buscador, { backgroundColor: t.tarjeta, borderColor: t.borde, color: t.texto }]}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {chips.map((c) => {
              const activo = filtro === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setFiltro(c.id)}
                  style={[est.chip, { backgroundColor: activo ? marca.primario : t.tarjeta, borderColor: activo ? marca.primario : t.borde }]}
                >
                  <Text style={[est.chipTexto, { color: activo ? '#fff' : t.texto }]}>{c.texto}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={<Vacio icono="search-outline" texto={q ? `Nadie coincide con «${q}».` : 'Aún no hay nadie aquí.'} />}
      renderItem={({ item }) => (
        <Pressable onPress={() => abrirPerfil(item.persona, item.sinCuenta)} style={{ width: anchoCelda }}>
          <TarjetaPersona persona={item.persona} compacta style={{ height: anchoCelda * 1.3 }} />
          <EstadoMini estado={item.persona.estado} sinCuenta={item.sinCuenta} />
        </Pressable>
      )}
    />
  );
}

/** El circulito sobre la foto en Explorar: ya le diste 💜, es match o le interesas. */
function EstadoMini({ estado, sinCuenta }: { estado?: Persona['estado']; sinCuenta: boolean }) {
  if (sinCuenta || !estado || estado === 'ninguno' || estado === 'descartado') return null;
  const cfg = {
    enviado: { icono: 'heart' as const, fondo: '#5A46F0' },
    recibido: { icono: 'heart-half' as const, fondo: '#FF5A8A' },
    correspondido: { icono: 'chatbubbles' as const, fondo: '#16A34A' },
  }[estado];
  return (
    <View style={[est.estadoMini, { backgroundColor: cfg.fondo }]}>
      <Ionicons name={cfg.icono} size={13} color="#fff" />
    </View>
  );
}

// ===========================================================================
// CONEXIONES — los matches
// ===========================================================================

function Conexiones({
  conexiones,
  recibidos,
  recargar,
  alAbrir,
  alDescubrir,
}: {
  conexiones: ConexionRed[];
  recibidos: number;
  recargar: () => Promise<void>;
  alAbrir: (c: ConexionRed) => void;
  alDescubrir: () => void;
}) {
  const t = useTema();
  const marca = useMarca();
  return (
    <FlatList
      data={conexiones}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={recargar} tintColor={marca.primario} />}
      ListHeaderComponent={
        recibidos > 0 ? (
          <TouchableOpacity style={[est.banner, { backgroundColor: marca.primarioSuave }]} onPress={alDescubrir}>
            <Text style={{ fontSize: 22 }}>💜</Text>
            <Text style={[est.bannerTexto, { color: t.texto }]}>
              {recibidos === 1 ? '1 persona quiere' : `${recibidos} personas quieren`} conectar contigo. Están primero
              en Descubrir.
            </Text>
            <Ionicons name="chevron-forward" size={18} color={t.textoTenue} />
          </TouchableOpacity>
        ) : null
      }
      ListEmptyComponent={
        <Vacio icono="people-outline" texto={'Aún no tienes conexiones.\nCuando alguien y tú se den 💜, aparecerá aquí para chatear.'} />
      }
      renderItem={({ item: c }) => {
        const nombre = [c.con.nombre, c.con.apellidos].filter(Boolean).join(' ');
        return (
          <TouchableOpacity
            style={[est.conexion, { backgroundColor: t.tarjeta, borderColor: t.borde }]}
            onPress={() => alAbrir(c)}
            activeOpacity={0.8}
          >
            <Avatar nombre={nombre} foto={c.con.foto_url} tamano={54} />
            <View style={{ flex: 1 }}>
              <Text style={[est.conexionNombre, { color: t.texto }]} numberOfLines={1}>{nombre}</Text>
              {c.con.cargo ? (
                <Text style={[est.conexionSub, { color: t.textoSuave }]} numberOfLines={1}>{c.con.cargo}</Text>
              ) : null}
              <Text style={[est.conexionSub, { color: t.textoTenue }]}>
                {c.mensajes === 0 ? '¡Escribe el primer mensaje!' : `${c.mensajes}/${c.limite_mensajes} mensajes`}
              </Text>
            </View>
            <Ionicons name="chatbubble-ellipses" size={22} color={marca.primarioTexto} />
          </TouchableOpacity>
        );
      }}
    />
  );
}

const est = StyleSheet.create({
  segmentos: {
    flexDirection: 'row', marginTop: 14, backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 14, padding: 4, gap: 4,
  },
  segmento: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10 },
  segmentoActivo: { backgroundColor: '#fff' },
  segmentoTexto: { fontFamily: F.negrita, fontSize: 13 },
  contador: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  contadorTexto: { fontFamily: F.negrita, fontSize: 10.5 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 10 },
  avisoTexto: { flex: 1, fontFamily: F.medio, fontSize: 12.5 },
  pista: { fontFamily: F.semi, fontSize: 13, textAlign: 'center', marginBottom: 10 },
  sello: { position: 'absolute', top: 40, borderWidth: 4, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.85)' },
  selloSi: { left: 22, borderColor: '#22C55E', transform: [{ rotate: '-14deg' }] },
  selloNo: { right: 22, borderColor: '#F43F5E', transform: [{ rotate: '14deg' }] },
  selloTexto: { fontFamily: F.titulo, fontSize: 28, letterSpacing: 1 },
  botones: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 22, paddingVertical: 16 },
  redondo: { alignItems: 'center', justifyContent: 'center' },
  fin: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  finIcono: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  finTitulo: { fontFamily: F.titulo, fontSize: 22, marginTop: 16 },
  finTexto: { fontFamily: F.normal, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  finBoton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 12, marginTop: 20 },
  finBotonTexto: { color: '#fff', fontFamily: F.negrita, fontSize: 14.5 },
  finEnlace: { fontFamily: F.semi, fontSize: 14 },
  lupa: { position: 'absolute', left: 14, top: 14, zIndex: 1 },
  buscador: { borderWidth: 1.5, borderRadius: 14, paddingLeft: 40, paddingRight: 14, paddingVertical: 12, fontFamily: F.medio, fontSize: 14.5 },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  chipTexto: { fontFamily: F.semi, fontSize: 13 },
  estadoMini: {
    position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 14, marginBottom: 6 },
  bannerTexto: { flex: 1, fontFamily: F.semi, fontSize: 13.5, lineHeight: 19 },
  conexion: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1, padding: 12 },
  conexionNombre: { fontFamily: F.negrita, fontSize: 15.5 },
  conexionSub: { fontFamily: F.medio, fontSize: 12.5, marginTop: 1 },
});
