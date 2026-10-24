import React from 'react';
import {
  ActivityIndicator,
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
import { DEGRADADO, F, sombra, useTema } from '../tema/tema';

/**
 * PIEZAS VISUALES REUTILIZABLES del rediseño.
 *
 * La idea: cada pantalla arma su vista con estas piezas en vez de repetir
 * estilos. Si mañana cambia el radio de las tarjetas o el degradado, se cambia
 * AQUÍ y se actualiza toda la app.
 */

// ---------------------------------------------------------------------------
// Cabecera con degradado violeta
// ---------------------------------------------------------------------------

type CabeceraProps = {
  titulo: string;
  /** Texto pequeño encima del título ("Hola de nuevo"). */
  antetitulo?: string;
  /** Texto pequeño debajo del título. */
  subtitulo?: string;
  /** Si viene, se pinta la flecha de volver. */
  onAtras?: () => void;
  /** Lo que va a la derecha (un botón, una etiqueta...). */
  derecha?: React.ReactNode;
  /** compacta = para pantallas internas (sesión, chat...). */
  compacta?: boolean;
  children?: React.ReactNode;
};

export function Cabecera({
  titulo,
  antetitulo,
  subtitulo,
  onAtras,
  derecha,
  compacta,
  children,
}: CabeceraProps) {
  // insets.top = alto de la barra de estado / notch, para no tapar la hora.
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={DEGRADADO}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        est.cabecera,
        { paddingTop: insets.top + (compacta ? 10 : 18) },
        compacta && est.cabeceraCompacta,
      ]}
    >
      {/* Círculos decorativos (solo adorno, como en el mockup) */}
      <View style={[est.circulo, { width: 180, height: 180, right: -50, top: -60 }]} />
      <View style={[est.circulo, { width: 110, height: 110, right: 70, bottom: -60 }]} />

      <View style={est.cabeceraFila}>
        {onAtras && (
          <TouchableOpacity onPress={onAtras} style={est.botonCristal} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          {antetitulo ? <Text style={est.antetitulo}>{antetitulo}</Text> : null}
          <Text
            style={[est.cabeceraTitulo, compacta && { fontSize: 18 }]}
            numberOfLines={2}
          >
            {titulo}
          </Text>
          {subtitulo ? (
            <Text style={est.cabeceraSubtitulo} numberOfLines={1}>
              {subtitulo}
            </Text>
          ) : null}
        </View>
        {derecha}
      </View>
      {children}
    </LinearGradient>
  );
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
  const base: ViewStyle = {
    backgroundColor: t.tarjeta,
    borderColor: t.borde,
    borderWidth: 1,
    borderRadius: 18,
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

export type Tono = 'violeta' | 'coral' | 'verde' | 'rojo' | 'gris' | 'coralSolido';

export function Etiqueta({ texto, tono = 'violeta', punto }: { texto: string; tono?: Tono; punto?: boolean }) {
  const t = useTema();
  const colores: Record<Tono, [string, string]> = {
    violeta: [t.primarioSuave, t.primarioTexto],
    coral: [t.coralSuave, t.coral],
    verde: [t.verdeSuave, t.verde],
    rojo: [t.rojoSuave, t.rojo],
    gris: [t.barraFondo, t.textoSuave],
    coralSolido: ['rgba(255,122,89,0.95)', '#fff'],
  };
  const [fondo, color] = colores[tono];
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

export function Avatar({ nombre, tamano = 44 }: { nombre: string; tamano?: number }) {
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
}: {
  texto: string;
  onPress: () => void;
  cargando?: boolean;
  variante?: Variante;
  icono?: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTema();
  const v: Record<Variante, { fondo: string; color: string; borde?: string }> = {
    primario: { fondo: t.primario, color: '#fff' },
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
        variante === 'primario' && !t.oscuro ? est.botonSombra : null,
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
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    overflow: 'hidden',
  },
  cabeceraCompacta: { paddingBottom: 16, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  circulo: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.09)' },
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
  vacio: { alignItems: 'center', marginTop: 32, paddingHorizontal: 24, gap: 10 },
  vacioIcono: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  vacioTexto: { fontFamily: F.medio, fontSize: 14, textAlign: 'center' },
});
