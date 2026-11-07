import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './ui';
import { F } from '../tema/tema';

import { useTranslation } from 'react-i18next';
/**
 * "¡ES UN MATCH!" (8.7.d) — cuando los dos se dieron 💜.
 * Las dos fotos se acercan desde los lados y se superponen; el título "salta".
 * Todo con la Animated de React Native (sin librerías extra).
 */
export default function MatchModal({
  visible,
  yo,
  otro,
  alMensaje,
  alSeguir,
}: {
  visible: boolean;
  yo: { nombre: string; foto_url: string | null } | null;
  otro: { nombre: string; foto_url: string | null } | null;
  alMensaje: () => void;
  alSeguir: () => void;
}) {
  const avance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    avance.setValue(0);
    Animated.spring(avance, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }).start();
  }, [visible, avance]);

  const izq = avance.interpolate({ inputRange: [0, 1], outputRange: [-140, 0] });
  const der = avance.interpolate({ inputRange: [0, 1], outputRange: [140, 0] });
  const escala = avance.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const primerNombre = (otro?.nombre ?? '').split(' ')[0];
  const { t: tr } = useTranslation(); // 8.8

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={alSeguir}>
      <LinearGradient colors={['rgba(46,26,140,0.97)', 'rgba(124,58,237,0.97)', 'rgba(255,122,89,0.95)']} style={est.fondo}>
        <Animated.Text style={[est.titulo, { transform: [{ scale: escala }] }]}>{tr('match.titulo')}</Animated.Text>
        <Text style={est.sub}>{tr('match.sub', { nombre: primerNombre })}</Text>

        <View style={est.fotos}>
          <Animated.View style={[est.foto, { transform: [{ translateX: izq }, { rotate: '-8deg' }] }]}>
            <Avatar nombre={yo?.nombre ?? tr('match.yo')} foto={yo?.foto_url} tamano={130} />
          </Animated.View>
          <Animated.View style={[est.foto, est.fotoDerecha, { transform: [{ translateX: der }, { rotate: '8deg' }] }]}>
            <Avatar nombre={otro?.nombre ?? '?'} foto={otro?.foto_url} tamano={130} />
          </Animated.View>
          <Animated.View style={[est.corazon, { transform: [{ scale: escala }] }]}>
            <Ionicons name="heart" size={30} color="#fff" />
          </Animated.View>
        </View>

        <TouchableOpacity style={est.botonMensaje} onPress={alMensaje} activeOpacity={0.85}>
          <Ionicons name="chatbubbles" size={19} color="#5A46F0" />
          <Text style={est.botonMensajeTexto}>{tr('match.enviarMensaje')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={alSeguir} style={{ padding: 12 }}>
          <Text style={est.seguir}>{tr('match.seguir')}</Text>
        </TouchableOpacity>
      </LinearGradient>
    </Modal>
  );
}

const est = StyleSheet.create({
  fondo: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  titulo: { color: '#fff', fontFamily: F.titulo, fontSize: 42, letterSpacing: -1 },
  sub: { color: 'rgba(255,255,255,0.88)', fontFamily: F.medio, fontSize: 16, marginTop: 6 },
  fotos: { flexDirection: 'row', marginVertical: 42, alignItems: 'center' },
  foto: { borderWidth: 4, borderColor: '#fff', borderRadius: 46, overflow: 'hidden' },
  fotoDerecha: { marginLeft: -26 },
  corazon: {
    position: 'absolute', alignSelf: 'center', left: '50%', marginLeft: -28, bottom: -22,
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#FF5A8A',
    alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff',
  },
  botonMensaje: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff',
    borderRadius: 16, paddingVertical: 15, paddingHorizontal: 34, marginTop: 10,
  },
  botonMensajeTexto: { color: '#5A46F0', fontFamily: F.negrita, fontSize: 16 },
  seguir: { color: 'rgba(255,255,255,0.9)', fontFamily: F.semi, fontSize: 14.5, marginTop: 6 },
});
