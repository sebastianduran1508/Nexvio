import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Brillo } from './ui';
import { useMarca } from '../context/MarcaContext';
import { legibleSobre } from '../lib/color';
import { F, useTema } from '../tema/tema';

/**
 * BARRA DE PESTAÑAS FLOTANTE (8.7.j, decisión 32).
 *
 * Es el "marco violeta" del panel llevado al celular: una barra con el
 * degradado de marca y el brillo de la esquina, separada de los bordes, y la
 * pestaña activa como una PASTILLA BLANCA (igual que la opción activa del
 * menú del panel). Igual en claro y en oscuro; solo cambia el fondo de detrás.
 *
 * Por qué una barra propia y no la de React Navigation con estilos: la de
 * fábrica no deja poner un degradado ni la pastilla. Con la prop `tabBar` del
 * Tab.Navigator le damos este componente y React Navigation nos pasa todo lo
 * que necesita (qué pestaña está activa, cómo navegar, los íconos y títulos).
 *
 * Personalización: si el congreso tiene colores propios, la barra usa SUS
 * colores (useMarca), así no choca con su cabecera.
 */
export function BarraPestanas({ state, descriptors, navigation }: BottomTabBarProps) {
  const t = useTema();
  const marca = useMarca();
  const insets = useSafeAreaInsets();
  // El color de la pestaña activa (sobre la pastilla blanca) debe leerse bien.
  const colorActivo = legibleSobre(marca.primario, '#FFFFFF');

  return (
    // El fondo de detrás es el de la pantalla: así la barra "flota".
    <View style={{ backgroundColor: t.fondo, paddingHorizontal: 12, paddingTop: 6, paddingBottom: insets.bottom + 10 }}>
      <View style={[est.sombra, t.oscuro && { shadowOpacity: 0.5, shadowColor: '#000' }]}>
        <LinearGradient
          colors={marca.degradado}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={est.barra}
        >
          <Brillo color={marca.brillo} desde="derecha" />
          {state.routes.map((ruta, i) => {
            const { options } = descriptors[ruta.key];
            const activa = state.index === i;
            const color = activa ? colorActivo : 'rgba(255,255,255,0.82)';
            const titulo = typeof options.title === 'string' ? options.title : ruta.name;

            const alTocar = () => {
              const evento = navigation.emit({ type: 'tabPress', target: ruta.key, canPreventDefault: true });
              if (!activa && !evento.defaultPrevented) navigation.navigate(ruta.name, ruta.params);
            };

            return (
              // Ojo: TouchableOpacity con estilo NORMAL. Un Pressable con estilo
              // en forma de función (({ pressed }) => ...) pierde los estilos
              // con NativeWind: las pestañas quedaban amontonadas a la izquierda.
              <TouchableOpacity
                key={ruta.key}
                onPress={alTocar}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: ruta.key })}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected: activa }}
                accessibilityLabel={titulo}
                style={[est.pestana, activa ? est.pastilla : null]}
              >
                {options.tabBarIcon?.({ focused: activa, color, size: 22 })}
                <Text style={[est.texto, { color, fontFamily: activa ? F.negrita : F.semi }]} numberOfLines={1}>
                  {titulo}
                </Text>
              </TouchableOpacity>
            );
          })}
        </LinearGradient>
      </View>
    </View>
  );
}

const est = StyleSheet.create({
  sombra: {
    borderRadius: 22,
    shadowColor: '#2E1A8C',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  barra: {
    height: 66,
    borderRadius: 22,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  pestana: {
    flex: 1,
    height: 52,
    marginHorizontal: 2,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  pastilla: { backgroundColor: '#FFFFFF' },
  texto: { fontSize: 11 },
});
