import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import { marcarAvisosVistos, ultimoAvisoVisto } from '../lib/push';
import type { Aviso } from '../lib/tipos';
import type { CongresosStackParamList } from '../navigation/CongresosStack';
import { Cabecera, Cargando, Etiqueta, Tarjeta, Vacio } from '../components/ui';
import { useMarca } from '../context/MarcaContext';
import { F, useTema } from '../tema/tema';

import i18n, { locale } from '../i18n';
import { useTranslation } from 'react-i18next';
import { avisoError } from '../components/Dialogo'; // 8.8: diálogos con el estilo de Nexvio
type Props = NativeStackScreenProps<CongresosStackParamList, 'Avisos'>;

/** "hace 5 min", "hace 2 h", "ayer", "12 nov". */
export function haceCuanto(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  // 8.8: función suelta (no es un componente) -> i18n.t en vez de useTranslation
  if (min < 1) return i18n.t('tiempo.ahora');
  if (min < 60) return i18n.t('tiempo.haceMin', { n: min });
  const h = Math.round(min / 60);
  if (h < 24) return i18n.t('tiempo.haceH', { n: h });
  if (h < 48) return i18n.t('tiempo.ayer');
  return new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short' }).replace(/\./g, '');
}

/**
 * AVISOS del congreso (Bloque 8.6.c): la bandeja con todo lo que el organizador
 * ha enviado, lo más nuevo arriba.
 *
 * Existe aunque haya notificaciones push, por dos razones: (1) mientras usemos
 * Expo Go no hay push, y esto permite probar todo el flujo; (2) si alguien no
 * vio la notificación (o no dio permiso), el aviso queda aquí guardado.
 *
 * Al abrirla, los avisos se marcan como vistos: el detalle del congreso deja de
 * mostrar "N nuevos".
 */
export default function AvisosScreen({ route, navigation }: Props) {
  const { congresoId, nombre } = route.params;
  const t = useTema();
  const { t: tr } = useTranslation(); // 8.8
  const marca = useMarca();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [vistoAntes, setVistoAntes] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const [lista, visto] = await Promise.all([
        api<Aviso[]>('GET', `/congresos/${congresoId}/avisos`),
        ultimoAvisoVisto(congresoId),
      ]);
      setAvisos(lista);
      setVistoAntes(visto); // lo de ANTES de abrir: para resaltar los nuevos
      if (lista[0]) await marcarAvisosVistos(congresoId, lista[0].enviado_en);
    } catch (e: any) {
      avisoError(tr('comun.error'), e.message ?? tr('avisos.errorCarga'));
    } finally {
      setCargando(false);
    }
  }, [congresoId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  if (cargando) return <Cargando />;

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <Cabecera
        compacta
        titulo={tr('avisos.titulo')}
        subtitulo={nombre}
        onAtras={() => navigation.goBack()}
        colores={marca.degradado}
        logo={marca.logo}
      />
      <FlatList
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        data={avisos}
        keyExtractor={(a) => a.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} tintColor={marca.primario} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <Vacio texto={tr('avisos.vacio')} icono="notifications-outline" />
        }
        renderItem={({ item }) => {
          const nuevo = !vistoAntes || item.enviado_en > vistoAntes;
          return (
            <Tarjeta style={nuevo ? { borderColor: marca.primario } : undefined}>
              <View style={est.fila}>
                <View style={[est.icono, { backgroundColor: marca.primarioSuave }]}>
                  <Ionicons name="megaphone-outline" size={18} color={marca.primarioTexto} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={est.arriba}>
                    <Text style={[est.titulo, { color: t.texto }]} numberOfLines={2}>{item.titulo}</Text>
                    {nuevo && <Etiqueta texto={tr('avisos.nuevo')} colores={[marca.acento, marca.textoAcento]} />}
                  </View>
                  <Text style={[est.cuerpo, { color: t.textoSuave }]}>{item.cuerpo}</Text>
                  <View style={est.pie}>
                    <Text style={[est.cuando, { color: t.textoTenue }]}>{haceCuanto(item.enviado_en)}</Text>
                    {item.sesion && (
                      <TouchableOpacity
                        onPress={() => navigation.navigate('Sesion', { sesionId: item.sesion!.id, titulo: item.sesion!.titulo })}
                        style={est.sesion}
                        hitSlop={6}
                      >
                        <Text style={[est.sesionTexto, { color: marca.primarioTexto }]} numberOfLines={1}>
                          {item.sesion.titulo}
                        </Text>
                        <Ionicons name="chevron-forward" size={13} color={marca.primarioTexto} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </Tarjeta>
          );
        }}
      />
    </View>
  );
}

const est = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 12 },
  icono: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  arriba: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, justifyContent: 'space-between' },
  titulo: { fontFamily: F.negrita, fontSize: 15, flex: 1 },
  cuerpo: { fontFamily: F.normal, fontSize: 14, lineHeight: 20, marginTop: 3 },
  pie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 },
  cuando: { fontFamily: F.medio, fontSize: 12 },
  sesion: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1 },
  sesionTexto: { fontFamily: F.semi, fontSize: 12.5, flexShrink: 1 },
});
