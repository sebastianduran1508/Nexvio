import { createContext, useContext } from 'react';
import { Platform, useColorScheme, type ViewStyle } from 'react-native';

/**
 * TEMA VISUAL DE LA APP.
 *
 * 8.7.j: paleta "Violeta vivo" — LA MISMA del panel web (decisión 32), para
 * que app y panel se vean como un solo producto. Antes (feria) el claro era
 * gris (#F5F6FA); ahora es lavanda, con bordes violeta tenue y un texto
 * secundario más oscuro que cumple contraste AA (4.5:1).
 *
 * Por qué un objeto de colores además de los tokens de NativeWind:
 * las pantallas usan StyleSheet (no className), y StyleSheet no entiende las
 * variables CSS. Así que aquí guardamos la MISMA paleta como valores JS, en dos
 * versiones (claro y oscuro), y cada pantalla pide la que toca con useTema().
 *
 * 8.7.g: el modo ya no lo decide solo el teléfono. Lo resuelve TemaProvider
 * (tema/TemaProvider.tsx) combinando la preferencia de la persona (Perfil →
 * Apariencia) con el tema por defecto del congreso. Si no hay provider, se
 * usa el del teléfono, como antes.
 */

export type Paleta = {
  fondo: string;
  tarjeta: string;
  borde: string;
  texto: string;
  textoSuave: string;
  textoTenue: string;
  primario: string; // botones y rellenos (siempre el violeta de marca)
  primarioTexto: string; // textos/íconos violetas (más claro en oscuro, para contraste)
  primarioSuave: string; // fondos violeta muy claritos
  coral: string;
  coralSuave: string;
  coralTexto: string; // 8.7.j: coral para TEXTO (el #FF7A59 no se lee sobre blanco)
  verde: string;
  verdeSuave: string;
  rojo: string;
  rojoSuave: string;
  // 8.7.j: tipos de la agenda, iguales al panel (café ámbar, almuerzo verde, taller cian)
  ambarSuave: string;
  ambarBorde: string;
  ambarTexto: string;
  verdeBorde: string;
  cian: string;
  cianSuave: string;
  cianTexto: string;
  input: string;
  barraFondo: string;
  oscuro: boolean;
};

const CLARO: Paleta = {
  fondo: '#F4F2FF', // lavanda (panel: --background)
  tarjeta: '#FFFFFF',
  borde: '#E4DFFB', // violeta tenue (panel: --border)
  texto: '#1B1638',
  textoSuave: '#55506E', // contraste AA (panel: --muted-foreground)
  textoTenue: '#6E6987',
  primario: '#5A46F0',
  primarioTexto: '#4A35D6',
  primarioSuave: '#EEEBFF',
  coral: '#FF7A59',
  coralSuave: '#FFEDE7',
  coralTexto: '#B4441F',
  verde: '#15803D',
  verdeSuave: '#DCFCE7',
  rojo: '#C8102E',
  rojoSuave: '#FDE7EB',
  ambarSuave: '#FFF6E5',
  ambarBorde: '#F2C063',
  ambarTexto: '#8A5300',
  verdeBorde: '#86D7A4',
  cian: '#06B6D4',
  cianSuave: '#E3F7FB',
  cianTexto: '#0B6577',
  input: '#F4F2FF',
  barraFondo: '#F1EEFF',
  oscuro: false,
};

const OSCURO: Paleta = {
  fondo: '#0D0B18', // panel oscuro: --background
  tarjeta: '#17152A',
  borde: '#2A2645',
  texto: '#F4F3FA',
  textoSuave: '#B9B5CC',
  textoTenue: '#9C97B5',
  primario: '#5A46F0',
  primarioTexto: '#A99FFF',
  primarioSuave: 'rgba(109,92,255,0.20)',
  coral: '#FF7A59',
  coralSuave: 'rgba(255,122,89,0.16)',
  coralTexto: '#FF9B80',
  verde: '#4ADE80',
  verdeSuave: 'rgba(34,197,94,0.16)',
  rojo: '#FB7185',
  rojoSuave: 'rgba(244,63,94,0.16)',
  ambarSuave: 'rgba(245,158,11,0.10)',
  ambarBorde: 'rgba(245,158,11,0.45)',
  ambarTexto: '#FBBF5A',
  verdeBorde: 'rgba(34,197,94,0.45)',
  cian: '#22D3EE',
  cianSuave: 'rgba(6,182,212,0.16)',
  cianTexto: '#67E3F5',
  input: '#221F38',
  barraFondo: '#221F38',
  oscuro: true,
};

/**
 * 8.7.g: el modo YA RESUELTO ('claro' | 'oscuro'), que publica TemaProvider.
 * Vive aquí (y no en TemaProvider.tsx) para no crear una dependencia circular:
 * tema.ts no importa a nadie, y todos importan tema.ts.
 */
export const TemaCtx = createContext<'claro' | 'oscuro' | null>(null);

/**
 * Devuelve la paleta del modo actual (claro u oscuro). TODAS las pantallas la
 * usan, así que con cambiar solo esto la app entera sigue el tema elegido.
 */
export function useTema(): Paleta {
  const sistema = useColorScheme();
  const resuelto = useContext(TemaCtx);
  const oscuro = resuelto ? resuelto === 'oscuro' : sistema === 'dark';
  return oscuro ? OSCURO : CLARO;
}

/**
 * El degradado de marca (igual en claro y oscuro), el mismo del menú del panel:
 * de un violeta profundo arriba a la izquierda al violeta de marca abajo a la
 * derecha. Encima va un BRILLO coral en la esquina (ver <Brillo /> en ui.tsx).
 * Si el congreso tiene colores propios, useMarca() arma uno equivalente con
 * los suyos.
 */
export const DEGRADADO = ['#2E1A8C', '#4A35D6', '#5A46F0'] as const;

/** Tipo de un degradado: 2 o más colores (lo que pide LinearGradient). */
export type Degradado = readonly [string, string, ...string[]];

/**
 * Las fuentes del mockup. Se cargan UNA vez en App.tsx con useFonts().
 * Ojo: con fuentes personalizadas el "grosor" va en el NOMBRE de la fuente;
 * no se combina con fontWeight (en Android ignoraría la fuente).
 */
export const F = {
  titulo: 'SpaceGrotesk_700Bold',
  tituloMedio: 'SpaceGrotesk_600SemiBold',
  normal: 'PlusJakartaSans_400Regular',
  medio: 'PlusJakartaSans_500Medium',
  semi: 'PlusJakartaSans_600SemiBold',
  negrita: 'PlusJakartaSans_700Bold',
};

/**
 * Sombra suave de tarjeta. iOS usa shadow*, Android usa elevation.
 * En modo oscuro casi no se ve una sombra, así que la bajamos.
 */
export function sombra(t: Paleta, nivel: 1 | 2 = 1): ViewStyle {
  if (t.oscuro) return {};
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#2E1A8C', // 8.7.j: sombra violeta tenue, como el panel
      shadowOpacity: nivel === 1 ? 0.07 : 0.1,
      shadowRadius: nivel === 1 ? 12 : 20,
      shadowOffset: { width: 0, height: nivel === 1 ? 4 : 8 },
    },
    default: { elevation: nivel === 1 ? 1 : 3 },
  })!;
}
