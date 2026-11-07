import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { Brillo } from './ui';
import { DEGRADADO, F } from '../tema/tema';
import { SECUNDARIO_NEXVIO } from '../lib/color';
import { useTranslation } from 'react-i18next';

/**
 * SPLASH ANIMADO (8.7.j, decisión 32).
 *
 * Hay DOS splash:
 *  1. El NATIVO (app.json → expo-splash-screen): una imagen fija que Android
 *     muestra mientras arranca, antes de que exista JavaScript. No se anima.
 *  2. ESTE: en cuanto JavaScript está listo, App.tsx lo pinta ENCIMA de la app
 *     (que mientras tanto ya va cargando por detrás) y esconde el nativo. Como
 *     los dos son violeta con la N blanca, el paso de uno a otro no se nota.
 *
 * La animación (≈4 s) sigue el mockup:
 *   nodos que aparecen uno a uno con un "rebote" → la línea de la N se dibuja
 *   → aparece "Nexvio" → el nodo coral late y tres puntos de carga saltan →
 *   todo se desvanece y queda la app.
 *
 * Técnica: las partes del SVG (radio de los círculos, trazo de la línea) se
 * animan con el driver de JavaScript (SVG no admite el nativo); el texto, los
 * puntos y el desvanecido final, con el nativo (más fluido).
 */
const ACircle = Animated.createAnimatedComponent(Circle);
const APath = Animated.createAnimatedComponent(Path);

// Los 5 nodos de la N (x, y, radio) en el orden en que aparecen. El último es el coral.
const NODOS: [number, number, number][] = [
  [16, 48, 5.4],
  [16, 16, 5.4],
  [32, 32, 4.4],
  [48, 48, 5.4],
  [48, 16, 5.6],
];
const LARGO_LINEA = 110; // largo aproximado del trazo M16 48 L16 16 L48 48 L48 16

export function SplashAnimado({ alTerminar }: { alTerminar: () => void }) {
  const { t: tr } = useTranslation(); // 8.8: el lema en el idioma del teléfono
  const nodos = useRef(NODOS.map(() => new Animated.Value(0))).current;
  const linea = useRef(new Animated.Value(0)).current;
  const pulso = useRef(new Animated.Value(0)).current;
  const marca = useRef(new Animated.Value(0)).current;
  const puntos = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const salida = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // El nodo coral "late" sin parar mientras dure la pantalla.
    const latido = Animated.loop(
      Animated.timing(pulso, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: false }),
    );
    // Los tres puntos de carga saltan uno detrás de otro.
    const carga = Animated.loop(
      Animated.stagger(
        150,
        puntos.map((v) =>
          Animated.sequence([
            Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(v, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
        ),
      ),
    );

    Animated.sequence([
      // 1) Los nodos aparecen uno a uno, con rebote.
      Animated.stagger(
        110,
        nodos.map((v) => Animated.spring(v, { toValue: 1, friction: 5, tension: 140, useNativeDriver: false })),
      ),
      // 2) Se dibuja la línea de la N.
      Animated.timing(linea, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start(() => {
      latido.start();
      carga.start();
    });
    // 3) "Nexvio" aparece mientras se termina de dibujar la línea.
    Animated.timing(marca, { toValue: 1, duration: 420, delay: 850, useNativeDriver: true }).start();
    // 4) Al final, todo se desvanece y avisamos a App.tsx para quitarlo.
    //    (4 s: ~1,5 s de armar la N y ~2,5 s para ver el latido — ajuste de Sebastián)
    Animated.timing(salida, { toValue: 0, duration: 380, delay: 4000, useNativeDriver: true }).start(() => {
      latido.stop();
      carga.stop();
      alTerminar();
    });
  }, [nodos, linea, pulso, marca, puntos, salida, alTerminar]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, est.capa, { opacity: salida }]} pointerEvents="none">
      <LinearGradient colors={DEGRADADO} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill}>
        <Brillo color={SECUNDARIO_NEXVIO} />
      </LinearGradient>

      <View style={est.centro}>
        <Svg width={132} height={132} viewBox="0 0 64 64">
          <APath
            d="M16 48 L16 16 L48 48 L48 16"
            stroke="#FFFFFF"
            strokeWidth={3.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={LARGO_LINEA}
            strokeDashoffset={linea.interpolate({ inputRange: [0, 1], outputRange: [LARGO_LINEA, 0] })}
          />
          {NODOS.map(([cx, cy, r], i) => (
            <ACircle
              key={i}
              cx={cx}
              cy={cy}
              r={nodos[i].interpolate({ inputRange: [0, 1], outputRange: [0, r] })}
              fill={i === NODOS.length - 1 ? '#FF7A59' : '#FFFFFF'}
            />
          ))}
          {/* El latido: un aro coral que crece y se apaga alrededor del nodo coral */}
          <ACircle
            cx={48}
            cy={16}
            r={pulso.interpolate({ inputRange: [0, 1], outputRange: [5.6, 14] })}
            stroke="#FF7A59"
            strokeWidth={1.4}
            fill="none"
            opacity={pulso.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.6, 0] })}
          />
        </Svg>

        <Animated.View
          style={{
            alignItems: 'center',
            opacity: marca,
            transform: [{ translateY: marca.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          }}
        >
          <Text style={est.nombre}>Nexvio</Text>
          <Text style={est.lema}>{tr('entrar.lema')}</Text>
        </Animated.View>
      </View>

      <View style={est.carga}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {puntos.map((v, i) => (
            <Animated.View
              key={i}
              style={[
                est.punto,
                i === 2 && { backgroundColor: '#FF7A59' },
                { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] },
              ]}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const est = StyleSheet.create({
  capa: { zIndex: 100, elevation: 100 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  nombre: { color: '#fff', fontFamily: F.titulo, fontSize: 40, letterSpacing: -0.8 },
  lema: { color: 'rgba(255,255,255,0.86)', fontFamily: F.semi, fontSize: 14, marginTop: 2 },
  carga: { position: 'absolute', left: 0, right: 0, bottom: 72, alignItems: 'center' },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
});
