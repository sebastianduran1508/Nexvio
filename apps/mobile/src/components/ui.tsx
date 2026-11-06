import React from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, sombra, useTema, type Degradado } from '../tema/tema';
import { useMarca } from '../context/MarcaContext';
import { conAlfa } from '../lib/color';

/**
 * PIEZAS VISUALES REUTILIZABLES del rediseño.
 *
 * La idea: cada pantalla arma su vista con estas piezas en vez de repetir
 * estilos. Si mañana cambia el radio de las tarjetas o el degradado, se cambia
 * AQUÍ y se actualiza toda la app.
 */

// ---------------------------------------------------------------------------
// Brillo de la esquina (8.7.j)
// ---------------------------------------------------------------------------

/**
 * El "brillo" coral de la esquina superior derecha, como en el panel.
 * LinearGradient no hace degradados radiales, así que lo imitamos con un
 * degradado diagonal que va del color (semitransparente) a transparente.
 * Se pone ENCIMA del degradado de marca, ocupando todo (absoluteFill).
 * El color es el secundario del congreso (coral en Nexvio).
 */
export function Brillo({ color, desde = 'arribaDerecha' }: { color: string; desde?: 'arribaDerecha' | 'derecha' }) {
  const inicio = desde === 'derecha' ? { x: 1, y: 0.5 } : { x: 1, y: 0 };
  const fin = desde === 'derecha' ? { x: 0.35, y: 0.5 } : { x: 0.35, y: 0.75 };
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[conAlfa(color, 0.5), conAlfa(color, 0)]}
      start={inicio}
      end={fin}
      style={StyleSheet.absoluteFill}
    />
  );
}

// ---------------------------------------------------------------------------
// Cabecera con el degradado de marca
// ---------------------------------------------------------------------------

type CabeceraProps = {
  titulo: string;
  /** Texto pequeño encima del título ("Hola de nuevo"). */
  antetitulo?: string;
  /** Texto pequeño debajo del título. */
  subtitulo?: string;
  /** Si viene, se pinta la flecha de volver. */
  onAtras?: () => void;
  /** 8.7.d: si está, el título (y el subtítulo) se pueden tocar. */
  alTocarTitulo?: () => void;
  /** Lo que va a la derecha (un botón, una etiqueta...). */
  derecha?: React.ReactNode;
  /** compacta = para pantallas internas (sesión, chat...). */
  compacta?: boolean;
  /**
   * Degradado (8.5). Si no viene, el del congreso abierto (useMarca), que ya
   * es el de Nexvio cuando el congreso no tiene colores propios.
   */
  colores?: Degradado;
  /** Logo del congreso (8.5): se pinta sobre un recuadro blanco junto al título. */
  logo?: string | null;
  children?: React.ReactNode;
  /**
   * 8.7.j — CABECERA PLEGABLE. Si viene, la cabecera flota sobre la pantalla
   * y se recoge al bajar: queda la fila del título y los `children` (la parte
   * "extra") se esconden. La pantalla le pasa:
   *  - scrollY: cuánto ha bajado (Animated.Value conectado al onScroll);
   *  - alMedir: le avisamos su alto total, para que deje ese espacio arriba
   *    del contenido (paddingTop), porque al flotar ya no lo empuja.
   */
  plegable?: { scrollY: Animated.Value; alMedir: (alto: number) => void };
};

export function Cabecera({
  titulo,
  antetitulo,
  subtitulo,
  onAtras,
  alTocarTitulo,
  derecha,
  compacta,
  colores,
  logo,
  children,
  plegable,
}: CabeceraProps) {
  // insets.top = alto de la barra de estado / notch, para no tapar la hora.
  const insets = useSafeAreaInsets();
  const marca = useMarca();
  // Alto de la parte que se esconde (los children). Se mide al pintarla.
  const [extra, setExtra] = React.useState(0);

  // Cómo se pliega (solo si es plegable y ya sabemos cuánto mide lo extra):
  //  - toda la cabecera SUBE lo que bajó la persona (hasta `extra` px);
  //  - su contenido BAJA lo mismo, así el título se queda quieto en pantalla
  //    y el borde de abajo sube "como una cortina" tapando lo extra;
  //  - lo extra además se desvanece en la primera parte del recorrido.
  // Todo con el "native driver": corre en el hilo nativo, sin tirones.
  const anim =
    plegable && extra > 0
      ? {
          subir: plegable.scrollY.interpolate({ inputRange: [0, extra], outputRange: [0, -extra], extrapolate: 'clamp' }),
          bajar: plegable.scrollY.interpolate({ inputRange: [0, extra], outputRange: [0, extra], extrapolate: 'clamp' }),
          opacidad: plegable.scrollY.interpolate({ inputRange: [0, extra * 0.7], outputRange: [1, 0], extrapolate: 'clamp' }),
        }
      : null;

  const cabecera = (
    <LinearGradient
      colors={colores ?? marca.degradado}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={[
        est.cabecera,
        { paddingTop: insets.top + (compacta ? 10 : 18) },
        compacta && est.cabeceraCompacta,
      ]}
    >
      {/* 8.7.j: brillo en la esquina (reemplaza los círculos de la feria). */}
      <Brillo color={marca.brillo} />

      <Animated.View style={anim ? { transform: [{ translateY: anim.bajar }] } : undefined}>
      <View style={est.cabeceraFila}>
        {onAtras && (
          <TouchableOpacity onPress={onAtras} style={est.botonCristal} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
        )}
        {logo ? (
          <View style={est.logoCaja}>
            <Image source={{ uri: logo }} style={est.logoImg} resizeMode="contain" />
          </View>
        ) : null}
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={alTocarTitulo}
          disabled={!alTocarTitulo}
          activeOpacity={0.7}
        >
          {antetitulo ? <Text style={est.antetitulo}>{antetitulo}</Text> : null}
          {/* 8.7.j: los nombres de congreso suelen ser largos. La letra se
              ajusta al largo, hasta 3 líneas, y si aun así no cabe se encoge
              un poco más sola (adjustsFontSizeToFit, como mucho 15 %). */}
          <Text
            style={[est.cabeceraTitulo, { fontSize: compacta ? 18 : tamanoTitulo(titulo) }]}
            numberOfLines={compacta ? 2 : 3}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {titulo}
          </Text>
          {subtitulo ? (
            <Text style={est.cabeceraSubtitulo} numberOfLines={1}>
              {subtitulo}
            </Text>
          ) : null}
        </TouchableOpacity>
        {derecha}
      </View>
      {plegable && children ? (
        <Animated.View
          onLayout={(e) => setExtra(e.nativeEvent.layout.height)}
          style={anim ? { opacity: anim.opacidad } : undefined}
        >
          {children}
        </Animated.View>
      ) : (
        children
      )}
      </Animated.View>
    </LinearGradient>
  );

  if (!plegable) return cabecera;
  return (
    <Animated.View
      onLayout={(e) => plegable.alMedir(e.nativeEvent.layout.height)}
      style={[est.flotante, anim ? { transform: [{ translateY: anim.subir }] } : null]}
    >
      {cabecera}
    </Animated.View>
  );
}

/** 8.7.j: tamaño del título según su largo (nombres cortos, grandes). */
function tamanoTitulo(titulo: string): number {
  if (titulo.length <= 26) return 23;
  if (titulo.length <= 44) return 20;
  return 18;
}

/** Botón redondo "de cristal" para poner sobre la cabecera (salir, etc.). */
export function BotonCristal({
  icono,
  onPress,
}: {
  icono: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={est.botonCristalGrande} hitSlop={8}>
      <Ionicons name={icono} size={20} color="#fff" />
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta
// ---------------------------------------------------------------------------

/**
 * 8.7.j (pedido de Sebastián): el borde de las tarjetas es del COLOR DE MARCA,
 * delgado y semitransparente, en vez del gris. Violeta en Nexvio; el color
 * principal si el congreso tiene los suyos (para no chocar con su cabecera).
 * En oscuro un poco más fuerte para que se note sobre el fondo negro.
 */
export function useBordeMarca(): string {
  const t = useTema();
  const marca = useMarca();
  return conAlfa(marca.primario, t.oscuro ? 0.6 : 0.45);
}

export function Tarjeta({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const t = useTema();
  const borde = useBordeMarca();
  const base: ViewStyle = {
    backgroundColor: t.tarjeta,
    borderColor: borde,
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    ...sombra(t),
  };
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={[base, style]}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

// ---------------------------------------------------------------------------
// Etiqueta (chip de color)
// ---------------------------------------------------------------------------

export type Tono = 'violeta' | 'coral' | 'verde' | 'rojo' | 'gris' | 'coralSolido' | 'cian';

export function Etiqueta({
  texto,
  tono = 'violeta',
  punto,
  colores,
}: {
  texto: string;
  tono?: Tono;
  punto?: boolean;
  /** [fondo, texto]: colores del congreso (8.5). Gana sobre `tono`. */
  colores?: readonly [string, string];
}) {
  const t = useTema();
  const paleta: Record<Tono, [string, string]> = {
    violeta: [t.primarioSuave, t.primarioTexto],
    coral: [t.coralSuave, t.coralTexto],
    verde: [t.verdeSuave, t.verde],
    rojo: [t.rojoSuave, t.rojo],
    gris: [t.barraFondo, t.textoSuave],
    coralSolido: ['rgba(255,122,89,0.95)', '#fff'],
    cian: [t.cianSuave, t.cianTexto],
  };
  const [fondo, color] = colores ?? paleta[tono];
  return (
    <View style={[est.etiqueta, { backgroundColor: fondo }]}>
      {punto && <View style={[est.punto, { backgroundColor: color }]} />}
      <Text style={[est.etiquetaTexto, { color }]}>{texto}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Avatar con iniciales
// ---------------------------------------------------------------------------

/** Colores pastel del mockup. Cada nombre cae siempre en el mismo color. */
const PASTELES: [string, string][] = [
  ['#E0E7FF', '#4F46E5'],
  ['#FFE4D6', '#EA580C'],
  ['#DCFCE7', '#15803D'],
  ['#FCE7F3', '#BE185D'],
  ['#E0F2FE', '#0369A1'],
  ['#EDE9FE', '#6D28D9'],
];

export function iniciales(nombre: string): string {
  const limpio = nombre.replace(/^(dr|dra)\.?\s+/i, '').trim();
  const partes = limpio.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const a = partes[0][0] ?? '';
  const b = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (a + b).toUpperCase();
}

/**
 * Avatar: la FOTO si la hay (8.7.c) o, si no, las iniciales sobre un pastel
 * que sale del nombre (siempre el mismo color para la misma persona).
 */
export function Avatar({
  nombre,
  tamano = 44,
  foto,
}: {
  nombre: string;
  tamano?: number;
  foto?: string | null;
}) {
  if (foto) {
    return (
      <Image
        source={{ uri: foto }}
        style={{ width: tamano, height: tamano, borderRadius: tamano * 0.32, backgroundColor: '#E5E7EB' }}
        accessibilityLabel={`Foto de ${nombre}`}
      />
    );
  }
  let h = 0;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [fondo, color] = PASTELES[h % PASTELES.length];
  return (
    <View
      style={{
        width: tamano,
        height: tamano,
        borderRadius: tamano * 0.32,
        backgroundColor: fondo,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontFamily: F.titulo, fontSize: tamano * 0.36 }}>
        {iniciales(nombre)}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Botón
// ---------------------------------------------------------------------------

type Variante = 'primario' | 'peligro' | 'suave' | 'verde';

export function Boton({
  texto,
  onPress,
  cargando,
  variante = 'primario',
  icono,
  style,
  color: colorMarca,
}: {
  texto: string;
  onPress: () => void;
  cargando?: boolean;
  variante?: Variante;
  /** Color del congreso (8.5) para la variante primaria. */
  color?: string;
  icono?: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTema();
  const v: Record<Variante, { fondo: string; color: string; borde?: string }> = {
    primario: { fondo: colorMarca ?? t.primario, color: '#fff' },
    peligro: { fondo: 'transparent', color: t.rojo, borde: t.rojo },
    suave: { fondo: t.primarioSuave, color: t.primarioTexto },
    verde: { fondo: t.verdeSuave, color: t.verde },
  };
  const { fondo, color, borde } = v[variante];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={cargando}
      activeOpacity={0.8}
      style={[
        est.boton,
        { backgroundColor: fondo },
        borde ? { borderWidth: 1.5, borderColor: borde } : null,
        variante === 'primario' && !t.oscuro ? [est.botonSombra, colorMarca ? { shadowColor: colorMarca } : null] : null,
        cargando && { opacity: 0.6 },
        style,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={est.botonFila}>
          {icono && <Ionicons name={icono} size={18} color={color} />}
          <Text style={[est.botonTexto, { color }]}>{texto}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Otros
// ---------------------------------------------------------------------------

/** Título de sección en mayúsculas pequeñas ("PRÓXIMOS", "AGENDA"...). */
export function TituloSeccion({ texto, derecha }: { texto: string; derecha?: React.ReactNode }) {
  const t = useTema();
  return (
    <View style={est.seccionFila}>
      <Text style={[est.seccion, { color: t.textoSuave }]}>{texto.toUpperCase()}</Text>
      {derecha}
    </View>
  );
}

/**
 * 8.7.j: título de sección con un chip de ícono a la izquierda (como el
 * `ChipTitulo` del panel): "🕒 Agenda". El chip toma el color del congreso.
 */
export function TituloConIcono({
  texto,
  icono,
  derecha,
}: {
  texto: string;
  icono: React.ComponentProps<typeof Ionicons>['name'];
  derecha?: React.ReactNode;
}) {
  const t = useTema();
  const marca = useMarca();
  return (
    <View style={[est.seccionFila, { justifyContent: 'flex-start', gap: 10 }]}>
      <View style={[est.chipTitulo, { backgroundColor: marca.primarioSuave }]}>
        <Ionicons name={icono} size={16} color={marca.primarioTexto} />
      </View>
      <Text style={[est.tituloIcono, { color: t.texto }]}>{texto}</Text>
      <View style={{ flex: 1 }} />
      {derecha}
    </View>
  );
}

/**
 * 8.7.j: una hora "en dos pisos": "10:00" grande y "a. m." pequeño debajo.
 * Recibe el texto ya formateado (hora() de lib/formato).
 * Ojo: el teléfono separa "7:30" y "a. m." con un espacio ESPECIAL que no se
 * parte (\u202F o \u00A0), no con uno normal; por eso se separa con \s, que
 * los reconoce todos. (Con indexOf(' ') la hora salía partida "7:30 a / . m.")
 */
export function HoraDosPisos({
  texto,
  color,
  tamano = 14,
}: {
  texto: string;
  color?: string;
  tamano?: number;
}) {
  const t = useTema();
  const m = texto.match(/^(\S+)\s+(.*)$/u);
  const [num, sufijo] = m ? [m[1], m[2]] : [texto, ''];
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: F.titulo, fontSize: tamano, color: color ?? t.texto }}>{num}</Text>
      {sufijo ? (
        <Text style={{ fontFamily: F.semi, fontSize: 10.5, marginTop: 1, color: t.textoSuave }}>{sufijo}</Text>
      ) : null}
    </View>
  );
}

/** Spinner centrado sobre el fondo del tema. */
export function Cargando() {
  const t = useTema();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.fondo }}>
      <ActivityIndicator size="large" color={t.primario} />
    </View>
  );
}

/** Mensaje de lista vacía con ícono. */
export function Vacio({
  texto,
  icono = 'sparkles-outline',
}: {
  texto: string;
  icono?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  const t = useTema();
  return (
    <View style={est.vacio}>
      <View style={[est.vacioIcono, { backgroundColor: t.primarioSuave }]}>
        <Ionicons name={icono} size={22} color={t.primarioTexto} />
      </View>
      <Text style={[est.vacioTexto, { color: t.textoSuave }]}>{texto}</Text>
    </View>
  );
}

/** Bandera a partir del código ISO ("CO" -> 🇨🇴) con los "regional indicators". */
export function bandera(codigo?: string | null): string {
  if (!codigo || codigo.length !== 2) return '';
  const base = 0x1f1e6 - 'A'.charCodeAt(0);
  const c = codigo.toUpperCase();
  return String.fromCodePoint(base + c.charCodeAt(0), base + c.charCodeAt(1));
}

const est = StyleSheet.create({
  cabecera: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  flotante: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, elevation: 10 },
  cabeceraCompacta: { paddingBottom: 16, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  // Sin relleno: el logo llega hasta el borde (antes quedaba un marco blanco).
  // El fondo blanco solo se nota si el logo tiene partes transparentes.
  logoCaja: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  logoImg: { width: '100%', height: '100%' },
  cabeceraFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  antetitulo: { color: 'rgba(255,255,255,0.78)', fontFamily: F.medio, fontSize: 13 },
  cabeceraTitulo: { color: '#fff', fontFamily: F.titulo, fontSize: 23, letterSpacing: -0.3 },
  cabeceraSubtitulo: { color: 'rgba(255,255,255,0.8)', fontFamily: F.normal, fontSize: 13, marginTop: 2 },
  botonCristal: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonCristalGrande: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  punto: { width: 6, height: 6, borderRadius: 3 },
  etiquetaTexto: { fontFamily: F.negrita, fontSize: 10.5, letterSpacing: 0.3 },
  boton: {
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonSombra: {
    shadowColor: '#5A46F0',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  botonFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  botonTexto: { fontFamily: F.negrita, fontSize: 15 },
  seccionFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
    marginHorizontal: 4,
  },
  seccion: { fontFamily: F.tituloMedio, fontSize: 13, letterSpacing: 0.6 },
  chipTitulo: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tituloIcono: { fontFamily: F.titulo, fontSize: 18 },
  vacio: { alignItems: 'center', marginTop: 32, paddingHorizontal: 24, gap: 10 },
  vacioIcono: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  vacioTexto: { fontFamily: F.medio, fontSize: 14, textAlign: 'center' },
});
