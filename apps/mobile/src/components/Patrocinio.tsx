import React from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SponsorCharla } from '../lib/tipos';
import { F, useTema } from '../tema/tema';

/**
 * "PATROCINADA POR…" (8.7.f) — uno o varios sponsors, en dos tamaños:
 *  - linea:  bajo una charla de la agenda
 *            ("Patrocinada por [logo] Bayer · [logo] Juan Valdez").
 *  - franja: arriba, dentro de la charla ("Esta charla es posible gracias a…"),
 *            un renglón por sponsor; si tiene página web, tocarlo la abre.
 */
export default function Patrocinio({
  sponsors,
  variante = 'linea',
  esBreak,
}: {
  sponsors: SponsorCharla[];
  variante?: 'linea' | 'franja';
  esBreak?: boolean;
}) {
  const t = useTema();
  if (sponsors.length === 0) return null;

  if (variante === 'linea') {
    return (
      <View style={est.linea}>
        <Text style={[est.lineaTexto, { color: t.textoTenue }]}>{esBreak ? 'Patrocinado por' : 'Patrocinada por'}</Text>
        {sponsors.map((sp, i) => (
          <View key={sp.id} style={est.lineaItem}>
            {sp.logo_url ? <Image source={{ uri: sp.logo_url }} style={est.logoChico} resizeMode="contain" /> : null}
            <Text style={[est.lineaNombre, { color: t.textoSuave }]} numberOfLines={1}>
              {sp.nombre}
              {i < sponsors.length - 1 ? ' ·' : ''}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={[est.franja, { backgroundColor: t.tarjeta, borderColor: t.borde }]}>
      <Text style={[est.franjaAntes, { color: t.textoTenue }]}>
        {esBreak ? 'Es posible gracias a' : 'Esta charla es posible gracias a'}
      </Text>
      {sponsors.map((sp) => {
        const abrir = sp.sitio_web ? () => void Linking.openURL(sp.sitio_web!) : undefined;
        return (
          <TouchableOpacity key={sp.id} style={est.franjaFila} onPress={abrir} disabled={!abrir} activeOpacity={0.8}>
            {sp.logo_url ? (
              <Image source={{ uri: sp.logo_url }} style={est.logoGrande} resizeMode="contain" />
            ) : (
              <View style={[est.logoGrande, est.sinLogo, { backgroundColor: t.primarioSuave }]}>
                <Ionicons name="ribbon" size={18} color={t.primarioTexto} />
              </View>
            )}
            <Text style={[est.franjaNombre, { color: t.texto }]} numberOfLines={1}>
              {sp.nombre}
            </Text>
            {abrir && <Ionicons name="open-outline" size={16} color={t.textoTenue} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const est = StyleSheet.create({
  linea: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 4, marginTop: 8 },
  lineaTexto: { fontFamily: F.medio, fontSize: 11.5 },
  lineaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  lineaNombre: { fontFamily: F.semi, fontSize: 12, flexShrink: 1 },
  logoChico: { width: 16, height: 16, borderRadius: 4, backgroundColor: '#fff' },
  franja: { borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 16, gap: 8 },
  franjaAntes: { fontFamily: F.medio, fontSize: 12 },
  franjaFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoGrande: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#fff' },
  sinLogo: { alignItems: 'center', justifyContent: 'center' },
  franjaNombre: { flex: 1, fontFamily: F.negrita, fontSize: 15 },
});
