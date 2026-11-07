import React, { useCallback, useState } from 'react';
import {
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

import { useTranslation } from 'react-i18next';
import { avisoError } from '../components/Dialogo'; // 8.8: diálogos con el estilo de Nexvio
type Props = NativeStackScreenProps<CongresosStackParamList, 'Patrocinadores'>;

/**
 * Cómo se ve cada nivel: cuántas columnas y qué tan alto el logo.
 * Oro ocupa todo el ancho (es lo que más pagó); General, tres por fila.
 */
const NIVELES = [
  // 8.8: el título de cada nivel sale del diccionario (patrocinadores.oro…)
  { valor: 'oro', columnas: 1, alto: 110 },
  { valor: 'plata', columnas: 2, alto: 80 },
  { valor: 'bronce', columnas: 3, alto: 64 },
  { valor: 'general', columnas: 3, alto: 56 },
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
  const { t: tr } = useTranslation(); // 8.8
  const marca = useMarca();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      setSponsors(await api<Sponsor[]>('GET', `/congresos/${congresoId}/sponsors`));
    } catch (e: any) {
      avisoError(tr('comun.error'), e.message ?? tr('patrocinadores.errorCarga'));
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
      avisoError(tr('patrocinadores.noAbrir'), s.sitio_web);
    }
  }

  if (cargando) return <Cargando />;

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <Cabecera
        compacta
        titulo={tr('patrocinadores.titulo')}
        subtitulo={nombre}
        onAtras={() => navigation.goBack()}
        colores={marca.degradado}
        logo={marca.logo}
      />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 40 }}>
        {sponsors.length === 0 ? (
          <Vacio texto={tr('patrocinadores.vacio')} icono="ribbon-outline" />
        ) : (
          NIVELES.map((nivel) => {
            const delNivel = sponsors.filter((s) => s.nivel === nivel.valor);
            if (delNivel.length === 0) return null;
            return (
              <View key={nivel.valor}>
                <TituloSeccion texto={tr(`patrocinadores.${nivel.valor}`)} />
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
                                <Text style={[est.webTexto, { color: marca.primarioTexto }]}>{tr('patrocinadores.visitar')}</Text>
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
