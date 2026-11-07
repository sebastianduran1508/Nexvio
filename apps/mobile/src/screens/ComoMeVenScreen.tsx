import React, { useCallback, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import type { TarjetaPersona as Persona } from '../lib/tipos';
import { useMiCongreso } from '../context/MiCongresoContext';
import { Boton, Cabecera, Cargando, Vacio } from '../components/ui';
import TarjetaPersona from '../components/TarjetaPersona';
import { F, sombra, useTema } from '../tema/tema';
import type { PerfilStackParamList } from '../navigation/PerfilStack';

import { useTranslation } from 'react-i18next';
type Props = NativeStackScreenProps<PerfilStackParamList, 'ComoMeVen'>;

const ANCHO = Dimensions.get('window').width;

/**
 * ¿CÓMO ME VEN? (8.7.d) — tu tarjeta EXACTAMENTE como la ven los demás en
 * Descubrir (mismo componente, mismos datos del servidor). Sirve para revisar
 * cómo queda la foto con el texto encima.
 */
export default function ComoMeVenScreen({ navigation }: Props) {
  const t = useTema();
  const { t: tr } = useTranslation(); // 8.8
  const { actual } = useMiCongreso();
  const [yo, setYo] = useState<Persona | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!actual) return;
      api<Persona>('GET', `/congresos/${actual.id}/networking/mi-tarjeta`)
        .then(setYo)
        .catch((e) => setError(e?.message ?? tr('comoMeVen.errorCarga')));
    }, [actual]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <Cabecera compacta titulo={tr('comoMeVen.titulo')} onAtras={() => navigation.goBack()} />
      {!actual ? (
        <Vacio icono="calendar-outline" texto={tr('comoMeVen.eligeCongreso')} />
      ) : error ? (
        <Vacio icono="cloud-offline-outline" texto={error} />
      ) : !yo ? (
        <Cargando />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36, alignItems: 'center' }}>
          {yo.visible_networking === false && (
            <View style={[est.aviso, { backgroundColor: t.coralSuave }]}>
              <Ionicons name="eye-off-outline" size={16} color={t.coralTexto} />
              <Text style={[est.avisoTexto, { color: t.texto }]}>
                {tr('comoMeVen.oculto')}
              </Text>
            </View>
          )}
          <View style={[{ width: ANCHO - 40, height: (ANCHO - 40) * 1.4, borderRadius: 26 }, sombra(t, 2)]}>
            <TarjetaPersona persona={yo} style={{ flex: 1 }} />
          </View>
          <Boton
            texto={tr('comoMeVen.editar')}
            icono="create-outline"
            variante="suave"
            onPress={() => navigation.navigate('EditarPerfil')}
            style={{ marginTop: 20, alignSelf: 'stretch' }}
          />
        </ScrollView>
      )}
    </View>
  );
}

const est = StyleSheet.create({
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 11, marginBottom: 14, alignSelf: 'stretch' },
  avisoTexto: { flex: 1, fontFamily: F.medio, fontSize: 13 },
});
