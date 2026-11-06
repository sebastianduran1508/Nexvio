import React from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SponsorCharla } from '../lib/tipos';
import { F, useTema } from '../tema/tema';
import { conAlfa } from '../lib/color';

/**
 * "PATROCINADA POR…" (8.7.f) — uno o varios sponsors, en dos tamaños:
 *  - linea:  bajo una charla de la agenda
 *            ("🎗 Patrocinada por [logo Bayer] [logo Juan Valdez]").
 *            8.7.j: cada sponsor en una cajita con borde CORAL suave, para que
 *            se distinga del texto de la charla sin robarle protagonismo.
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
        <View style={est.lineaAntes}>
          <Ionicons name="ribbon-outline" size={13} color={t.coralTexto} />
          <Text style={[est.lineaTexto, { color: t.coralTexto }]}>{esBreak ? 'Patrocinado por' : 'Patrocinada por'}</Text>
        </View>
        {sponsors.map((sp) => (
          <View key={sp.id} style={[est.lineaItem, { backgroundColor: t.coralSuave, borderColor: conAlfa('#FF7A59', t.oscuro ? 0.55 : 0.45) }]}>
            {sp.logo_url ? <Image source={{ uri: sp.logo_url }} style={est.logoChico} resizeMode="contain" /> : null}
            <Text style={[est.lineaNombre, { color: t.texto }]} numberOfLines={1}>
              {sp.nombre}
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
  linea: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 6, marginTop: 10 },
  lineaAntes: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lineaTexto: { fontFamily: F.semi, fontSize: 11.5 },
  lineaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  lineaNombre: { fontFamily: F.semi, fontSize: 12, flexShrink: 1 },
  logoChico: { width: 16, height: 16, borderRadius: 4, backgroundColor: '#fff' },
  franja: { borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 16, gap: 8 },
  franjaAntes: { fontFamily: F.medio, fontSize: 12 },
  franjaFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoGrande: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#fff' },
  sinLogo: { alignItems: 'center', justifyContent: 'center' },
  franjaNombre: { flex: 1, fontFamily: F.negrita, fontSize: 15 },
});
