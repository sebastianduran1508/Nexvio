import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import type { Sponsor } from '../lib/tipos';
import type { CongresosStackParamList } from '../navigation/CongresosStack';
import { Cabecera, Cargando, TituloSeccion, Vacio } from '../components/ui';
import { useMarca } from '../context/MarcaContext';
import { F, sombra, useTema } from '../tema/tema';

type Props = NativeStackScreenProps<CongresosStackParamList, 'Patrocinadores'>;

/**
 * Cómo se ve cada nivel: cuántas columnas y qué tan alto el logo.
 * Oro ocupa todo el ancho (es lo que más pagó); General, tres por fila.
 */
const NIVELES = [
  { valor: 'oro', titulo: 'Oro', columnas: 1, alto: 110 },
  { valor: 'plata', titulo: 'Plata', columnas: 2, alto: 80 },
  { valor: 'bronce', titulo: 'Bronce', columnas: 3, alto: 64 },
  { valor: 'general', titulo: 'Con el apoyo de', columnas: 3, alto: 56 },
] as const;

/**
 * PATROCINADORES de un congreso (Bloque 8.5.e).
 *
 * Se llega tocando la franja "Con el apoyo de" del detalle. Agrupados por nivel,
 * con logos más grandes cuanto más alto el nivel. Al tocar uno con sitio web,
 * se abre en el navegador del teléfono.
 */
export default function PatrocinadoresScreen({ route, navigation }: Props) {
  const { congresoId, nombre } = route.params;
  const t = useTema();
  const marca = useMarca();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      setSponsors(await api<Sponsor[]>('GET', `/congresos/${congresoId}/sponsors`));
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudieron cargar los patrocinadores');
    } finally {
      setCargando(false);
    }
  }, [congresoId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  async function abrir(s: Sponsor) {
    if (!s.sitio_web) return;
    try {
      await Linking.openURL(s.sitio_web);
    } catch {
      Alert.alert('No se pudo abrir', s.sitio_web);
    }
  }

  if (cargando) return <Cargando />;

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <Cabecera
        compacta
        titulo="Patrocinadores"
        subtitulo={nombre}
        onAtras={() => navigation.goBack()}
        colores={marca.degradado}
        logo={marca.logo}
      />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 40 }}>
        {sponsors.length === 0 ? (
          <Vacio texto="Este congreso todavía no tiene patrocinadores." icono="ribbon-outline" />
        ) : (
          NIVELES.map((nivel) => {
            const delNivel = sponsors.filter((s) => s.nivel === nivel.valor);
            if (delNivel.length === 0) return null;
            return (
              <View key={nivel.valor}>
                <TituloSeccion texto={nivel.titulo} />
                <View style={est.rejilla}>
                  {delNivel.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      activeOpacity={s.sitio_web ? 0.7 : 1}
                      onPress={() => abrir(s)}
                      style={[
                        est.tarjeta,
                        { width: `${100 / nivel.columnas}%` as `${number}%` },
                      ]}
                    >
                      <View style={[est.caja, { backgroundColor: t.tarjeta, borderColor: t.borde }, sombra(t)]}>
                        {/* El logo siempre sobre blanco: casi todos están hechos para ese fondo. */}
                        <View style={[est.logo, { height: nivel.alto }]}>
                          {s.logo_url ? (
                            <Image source={{ uri: s.logo_url }} style={est.logoImg} resizeMode="contain" />
                          ) : (
                            <Text style={est.sinLogo} numberOfLines={2}>{s.nombre}</Text>
                          )}
                        </View>
                        {nivel.columnas < 3 && (
                          <View style={est.pie}>
                            <Text style={[est.nombre, { color: t.texto }]} numberOfLines={1}>{s.nombre}</Text>
                            {s.sitio_web ? (
                              <View style={est.web}>
                                <Text style={[est.webTexto, { color: marca.primarioTexto }]}>Visitar sitio web</Text>
                                <Ionicons name="open-outline" size={13} color={marca.primarioTexto} />
                              </View>
                            ) : null}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const est = StyleSheet.create({
  // Truco de la rejilla: cada tarjeta mide "100% / columnas" y lleva un margen
  // interno de 5 en cada lado; la fila compensa con -5. Así no hace falta
  // calcular anchos en píxeles.
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  tarjeta: { padding: 5 },
  caja: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  logo: { backgroundColor: '#fff', padding: 12, alignItems: 'center', justifyContent: 'center' },
  logoImg: { width: '100%', height: '100%' },
  sinLogo: { fontFamily: F.titulo, fontSize: 13, color: '#94A3B8', textAlign: 'center' },
  pie: { paddingHorizontal: 12, paddingVertical: 10 },
  nombre: { fontFamily: F.negrita, fontSize: 14 },
  web: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  webTexto: { fontFamily: F.semi, fontSize: 12.5 },
});
