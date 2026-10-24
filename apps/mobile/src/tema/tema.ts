import { Platform, useColorScheme, type ViewStyle } from 'react-native';

/**
 * TEMA VISUAL DE LA APP (rediseño "Opción A" del mockup).
 *
 * Por qué un objeto de colores además de los tokens de NativeWind:
 * las pantallas usan StyleSheet (no className), y StyleSheet no entiende las
 * variables CSS. Así que aquí guardamos la MISMA paleta como valores JS, en dos
 * versiones (claro y oscuro), y cada pantalla pide la que toca con useTema().
 *
 * El modo lo decide el sistema operativo (igual que el panel web).
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
  verde: string;
  verdeSuave: string;
  rojo: string;
  rojoSuave: string;
  input: string;
  barraFondo: string;
  oscuro: boolean;
};

const CLARO: Paleta = {
  fondo: '#F5F6FA',
  tarjeta: '#FFFFFF',
  borde: '#ECEDF3',
  texto: '#0E1525',
  textoSuave: '#6B7385',
  textoTenue: '#9AA1B2',
  primario: '#5A46F0',
  primarioTexto: '#5A46F0',
  primarioSuave: '#EEF0FF',
  coral: '#FF7A59',
  coralSuave: '#FFEDE7',
  verde: '#16A34A',
  verdeSuave: '#DCFCE7',
  rojo: '#E11D48',
  rojoSuave: '#FEE2E2',
  input: '#F5F6FA',
  barraFondo: '#EEF0F5',
  oscuro: false,
};

const OSCURO: Paleta = {
  fondo: '#0B0A12',
  tarjeta: '#16151F',
  borde: '#26252F',
  texto: '#FAFAFA',
  textoSuave: '#A1A1AA',
  textoTenue: '#71717A',
  primario: '#5A46F0',
  primarioTexto: '#9D90FF',
  primarioSuave: 'rgba(90,70,240,0.18)',
  coral: '#FF7A59',
  coralSuave: 'rgba(255,122,89,0.16)',
  verde: '#4ADE80',
  verdeSuave: 'rgba(34,197,94,0.16)',
  rojo: '#FB7185',
  rojoSuave: 'rgba(244,63,94,0.16)',
  input: '#1E1D29',
  barraFondo: '#26252F',
  oscuro: true,
};

/** Devuelve la paleta del modo actual (claro u oscuro). */
export function useTema(): Paleta {
  return useColorScheme() === 'dark' ? OSCURO : CLARO;
}

/** Los colores del degradado de marca (iguales en claro y oscuro). */
export const DEGRADADO = ['#5A46F0', '#7C3AED'] as const;

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
      shadowColor: '#101525',
      shadowOpacity: nivel === 1 ? 0.05 : 0.08,
      shadowRadius: nivel === 1 ? 12 : 20,
      shadowOffset: { width: 0, height: nivel === 1 ? 4 : 8 },
    },
    default: { elevation: nivel === 1 ? 1 : 3 },
  })!;
}
