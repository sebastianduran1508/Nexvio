import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Cabecera } from '../components/ui';
import { useApariencia, type PreferenciaTema } from '../tema/TemaProvider';
import { useMarca } from '../context/MarcaContext';
import { F, useTema, type Degradado } from '../tema/tema';
import type { PerfilStackParamList } from '../navigation/PerfilStack';

type Props = NativeStackScreenProps<PerfilStackParamList, 'Apariencia'>;

const NOMBRE = { claro: 'Claro', oscuro: 'Oscuro', sistema: 'Según tu teléfono' } as const;

/**
 * APARIENCIA (8.7.g) — cada persona elige cómo ver la app.
 * Tres opciones (ajuste de Sebastián): "Por defecto" sigue lo que eligió el
 * organizador; "Claro" y "Oscuro" mandan sobre él. Se guarda en el teléfono y
 * el cambio es inmediato.
 */
export default function AparienciaScreen({ navigation }: Props) {
  const t = useTema();
  const marca = useMarca();
  const { preferencia, cambiarPreferencia, temaCongreso, modo } = useApariencia();

  const opciones: {
    valor: PreferenciaTema;
    titulo: string;
    sub?: string;
    icono: React.ComponentProps<typeof Ionicons>['name'];
    muestra: 'claro' | 'oscuro' | 'mitad';
  }[] = [
    {
      valor: 'congreso',
      titulo: 'Por defecto',
      icono: 'color-palette-outline',
      muestra: temaCongreso === 'claro' || temaCongreso === 'oscuro' ? temaCongreso : 'mitad',
    },
    { valor: 'claro', titulo: 'Claro', icono: 'sunny-outline', muestra: 'claro' },
    { valor: 'oscuro', titulo: 'Oscuro', icono: 'moon-outline', muestra: 'oscuro' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <Cabecera compacta titulo="Apariencia" onAtras={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 36 }}>
        <Text style={[est.ahora, { color: t.textoSuave }]}>
          Ahora estás viendo la app en modo <Text style={{ fontFamily: F.negrita, color: t.texto }}>{NOMBRE[modo].toLowerCase()}</Text>.
        </Text>
        {opciones.map((o) => {
          const activa = preferencia === o.valor;
          return (
            <TouchableOpacity
              key={o.valor}
              onPress={() => cambiarPreferencia(o.valor)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ selected: activa }}
              style={[est.opcion, { backgroundColor: t.tarjeta, borderColor: activa ? marca.primario : t.borde }]}
            >
              <Muestra tipo={o.muestra} degradado={marca.degradado} />
              <View style={{ flex: 1 }}>
                <View style={est.tituloFila}>
                  <Ionicons name={o.icono} size={16} color={activa ? marca.primarioTexto : t.textoSuave} />
                  <Text style={[est.titulo, { color: t.texto }]}>{o.titulo}</Text>
                </View>
                {o.sub ? <Text style={[est.sub, { color: t.textoTenue }]}>{o.sub}</Text> : null}
              </View>
              <View style={[est.radio, { borderColor: activa ? marca.primario : t.borde }]}>
                {activa && <View style={[est.radioPunto, { backgroundColor: marca.primario }]} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Un celular en miniatura en claro, en oscuro o mitad y mitad. */
function Muestra({ tipo, degradado }: { tipo: 'claro' | 'oscuro' | 'mitad'; degradado: Degradado }) {
  const mini = (oscuro: boolean) => (
    <View style={[est.miniFondo, { backgroundColor: oscuro ? '#0B0A12' : '#F5F6FA' }]}>
      <LinearGradient colors={degradado} style={est.miniCabecera} />
      <View style={[est.miniTarjeta, { backgroundColor: oscuro ? '#16151F' : '#FFFFFF' }]} />
      <View style={[est.miniTarjeta, { backgroundColor: oscuro ? '#16151F' : '#FFFFFF', width: '60%' }]} />
    </View>
  );
  return (
    <View style={est.muestra}>
      {tipo === 'mitad' ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1, overflow: 'hidden' }}>{mini(false)}</View>
          <View style={{ flex: 1, overflow: 'hidden' }}>{mini(true)}</View>
        </View>
      ) : (
        mini(tipo === 'oscuro')
      )}
    </View>
  );
}

const est = StyleSheet.create({
  ahora: { fontFamily: F.medio, fontSize: 13.5, marginBottom: 4 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 2, borderRadius: 18, padding: 12 },
  tituloFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titulo: { fontFamily: F.negrita, fontSize: 15 },
  sub: { fontFamily: F.medio, fontSize: 12.5, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioPunto: { width: 11, height: 11, borderRadius: 6 },
  muestra: { width: 54, height: 76, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(120,120,140,0.35)' },
  miniFondo: { flex: 1, padding: 4, gap: 4 },
  miniCabecera: { height: 16, borderRadius: 4 },
  miniTarjeta: { height: 12, borderRadius: 3 },
});
