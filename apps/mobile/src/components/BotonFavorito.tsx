import React, { useRef } from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMiAgenda } from '../context/MiAgendaContext';
import { useTema } from '../tema/tema';

import { useTranslation } from 'react-i18next';
/**
 * La ⭐ de "Mi agenda" (8.7.e). Al tocarla da un pequeño "salto" (crece y
 * vuelve), para que se sienta que pasó algo.
 *  - tono "normal": sobre tarjetas (gris -> dorada).
 *  - tono "claro": sobre la cabecera con degradado (blanca -> dorada).
 */
export default function BotonFavorito({
  sesionId,
  tamano = 22,
  tono = 'normal',
}: {
  sesionId: string;
  tamano?: number;
  tono?: 'normal' | 'claro';
}) {
  const t = useTema();
  const { t: tr } = useTranslation(); // 8.8
  const { esFavorita, alternar } = useMiAgenda();
  const activa = esFavorita(sesionId);
  const escala = useRef(new Animated.Value(1)).current;

  function tocar() {
    escala.setValue(0.6);
    Animated.spring(escala, { toValue: 1, friction: 3, tension: 140, useNativeDriver: true }).start();
    void alternar(sesionId);
  }

  const apagada = tono === 'claro' ? 'rgba(255,255,255,0.9)' : t.textoTenue;
  return (
    <TouchableOpacity
      onPress={tocar}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={activa ? tr('favorito.quitar') : tr('favorito.agregar')}
      accessibilityState={{ selected: activa }}
    >
      <Animated.View style={{ transform: [{ scale: escala }] }}>
        <Ionicons name={activa ? 'star' : 'star-outline'} size={tamano} color={activa ? '#F59E0B' : apagada} />
      </Animated.View>
    </TouchableOpacity>
  );
}
