import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../lib/api';
import type { Inscripcion } from '../lib/tipos';
import { useAuth } from '../context/AuthContext';
import { BotonCristal, Cabecera, Cargando, Etiqueta, Vacio } from '../components/ui';
import { FilaCongreso } from './CongresosScreen';
import { useTema } from '../tema/tema';

/**
 * Los congresos a los que el asistente esta inscrito (GET /inscripciones/mias).
 * Se recarga cada vez que la pestana vuelve a estar visible, asi si te inscribes
 * en el detalle y vuelves aca, ya aparece.
 *
 * Rediseño: misma cabecera con degradado y la misma fila compacta de la lista
 * de congresos (se reutiliza <FilaCongreso />), con la etiqueta "Inscrito".
 */
export default function MisCongresosScreen() {
  const { signOut } = useAuth();
  const t = useTema();
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const data = await api<Inscripcion[]>('GET', '/inscripciones/mias');
      setInscripciones(data);
    } catch {
      /* dejamos la lista como este */
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  if (cargando) return <Cargando />;

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <Cabecera
        antetitulo="Tu agenda personal"
        titulo="Mis congresos"
        derecha={<BotonCristal icono="log-out-outline" onPress={signOut} />}
      />
      <FlatList
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        data={inscripciones}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} tintColor={t.primario} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <Vacio
            texto="Aún no te has inscrito a ningún congreso. Ve a la pestaña Congresos."
            icono="bookmark-outline"
          />
        }
        renderItem={({ item }) => (
          <FilaCongreso
            congreso={item.congreso}
            etiqueta={<Etiqueta texto="INSCRITO" tono="verde" />}
          />
        )}
      />
    </View>
  );
}
