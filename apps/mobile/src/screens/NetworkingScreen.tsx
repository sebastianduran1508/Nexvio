import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import type { DirectorioItem } from '../lib/tipos';
import type { CongresosStackParamList } from '../navigation/CongresosStack';
import { Avatar, Boton, Cabecera, Cargando, Etiqueta, Tarjeta, Vacio } from '../components/ui';
import { F, useTema } from '../tema/tema';
import { useMarca } from '../context/MarcaContext';

type Props = NativeStackScreenProps<CongresosStackParamList, 'Networking'>;

/**
 * Directorio de networking de un congreso: los demas asistentes y tu estado con
 * cada uno. Puedes marcar interes ("Conectar") y, si hay match, entrar al chat.
 *
 * Rediseño (mockup "A · Networking"): tarjeta por persona con avatar de
 * iniciales; la acción cambia según el estado (igual que antes).
 */
export default function NetworkingScreen({ route, navigation }: Props) {
  const { congresoId, nombre } = route.params;
  const t = useTema();
  const marca = useMarca(); // colores del congreso (8.5)
  const [items, setItems] = useState<DirectorioItem[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      setItems(await api<DirectorioItem[]>('GET', `/congresos/${congresoId}/networking`));
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo cargar el directorio');
    } finally {
      setCargando(false);
    }
  }, [congresoId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  async function conectar(receptorId: string) {
    try {
      const res = await api<{ match: boolean; conexionId?: string }>(
        'POST',
        `/congresos/${congresoId}/intereses`,
        { receptor_id: receptorId },
      );
      if (res.match) Alert.alert('¡Conectaron!', 'Ya pueden chatear.');
      cargar();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo enviar');
    }
  }

  if (cargando) return <Cargando />;

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <Cabecera
        compacta
        titulo="Networking"
        subtitulo={nombre}
        onAtras={() => navigation.goBack()}
        colores={marca.degradado}
        logo={marca.logo}
      />
      <FlatList
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        data={items}
        keyExtractor={(i) => i.usuario.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} tintColor={t.primario} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <Vacio texto="Aún no hay otros asistentes inscritos." icono="people-outline" />
        }
        renderItem={({ item }) => {
          // "Sin acción a la derecha" = estados que llevan botón grande debajo.
          const botonAbajo = item.estado === 'correspondido' || item.estado === 'recibido';
          return (
            <Tarjeta>
              <View style={est.fila}>
                <Avatar nombre={item.usuario.nombre} tamano={48} />
                <View style={{ flex: 1 }}>
                  <View style={est.nombreFila}>
                    <Text style={[est.nombre, { color: t.texto }]} numberOfLines={1}>
                      {item.usuario.nombre}
                    </Text>
                    {item.estado === 'recibido' && <Etiqueta texto="TE INVITÓ" tono="coral" />}
                    {item.estado === 'correspondido' && <Etiqueta texto="CONECTADOS" tono="verde" />}
                  </View>
                  <Text style={[est.sub, { color: t.textoTenue }]}>
                    {item.estado === 'enviado'
                      ? 'Esperando respuesta'
                      : item.estado === 'recibido'
                        ? 'Quiere conectar contigo'
                        : item.estado === 'correspondido'
                          ? 'Ya pueden chatear'
                          : 'Asistente del congreso'}
                  </Text>
                </View>
                {!botonAbajo && accionDerecha(item, conectar, marca)}
              </View>
              {botonAbajo && accionAbajo(item, conectar, navigation, marca.primario)}
            </Tarjeta>
          );
        }}
      />
    </View>
  );
}

/** Acción compacta a la derecha: "+" para conectar o chip de "enviado". */
function accionDerecha(
  item: DirectorioItem,
  conectar: (id: string) => void,
  marca: ReturnType<typeof useMarca>,
) {
  if (item.estado === 'enviado') return <Etiqueta texto="ENVIADO" tono="gris" />;
  return (
    <TouchableOpacity
      onPress={() => conectar(item.usuario.id)}
      style={[est.mas, { borderColor: marca.primario }]}
      accessibilityLabel="Conectar"
    >
      <Ionicons name="add" size={22} color={marca.primarioTexto} />
    </TouchableOpacity>
  );
}

/** Acción grande debajo: "Chatear" (si hay match) o "Aceptar conexión". */
function accionAbajo(
  item: DirectorioItem,
  conectar: (id: string) => void,
  navigation: Props['navigation'],
  colorMarca: string,
) {
  if (item.estado === 'correspondido') {
    return (
      <Boton
        texto="Chatear"
        icono="chatbubble-outline"
        variante="verde"
        style={est.botonAbajo}
        onPress={() =>
          navigation.navigate('Chat', {
            conexionId: item.conexionId!,
            nombre: item.usuario.nombre,
          })
        }
      />
    );
  }
  return (
    <Boton texto="Aceptar conexión" color={colorMarca} style={est.botonAbajo} onPress={() => conectar(item.usuario.id)} />
  );
}

const est = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nombreFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nombre: { fontFamily: F.negrita, fontSize: 15.5, flexShrink: 1 },
  sub: { fontFamily: F.medio, fontSize: 12.5, marginTop: 2 },
  mas: { width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  botonAbajo: { marginTop: 14, paddingVertical: 12 },
});
