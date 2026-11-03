import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import type { PoliticaDatos } from '../lib/tipos';
import { useAuth } from '../context/AuthContext';
import { Cabecera, Cargando, Vacio } from '../components/ui';
import { F, useTema } from '../tema/tema';
import type { PerfilStackParamList } from '../navigation/PerfilStack';

type Props = NativeStackScreenProps<PerfilStackParamList, 'PoliticaDatos'>;

/**
 * La política de datos, siempre a mano (8.7.b).
 *
 * La Ley 1581 da derecho a conocer el uso de los datos y a pedir prueba de la
 * autorización: aquí la persona vuelve a leer lo que aceptó y ve CUÁNDO y QUÉ
 * versión. (Revocar / pedir supresión desde la app llega con el Perfil, 8.7.c.)
 */
export default function PoliticaDatosScreen({ navigation }: Props) {
  const { yo } = useAuth();
  const t = useTema();
  const [politica, setPolitica] = useState<PoliticaDatos | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api<PoliticaDatos>('GET', '/auth/politica-datos')
      .then(setPolitica)
      .catch(() => setError(true));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <Cabecera compacta titulo="Tratamiento de datos" onAtras={() => navigation.goBack()} />
      {error ? (
        <Vacio icono="cloud-offline-outline" texto="No se pudo cargar la política. Revisa tu conexión." />
      ) : !politica ? (
        <Cargando />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }}>
          {yo?.acepto_datos_en ? (
            <View style={[est.sello, { backgroundColor: t.verdeSuave }]}>
              <Ionicons name="checkmark-circle" size={20} color={t.verde} />
              <Text style={[est.selloTexto, { color: t.verde }]}>
                Autorizaste esta política el{' '}
                {new Date(yo.acepto_datos_en).toLocaleString('es-CO', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                (versión {yo.politica_datos_version}).
              </Text>
            </View>
          ) : null}

          {politica.secciones.map((s) => (
            <View key={s.titulo} style={{ marginBottom: 18 }}>
              <Text style={[est.titulo, { color: t.texto }]}>{s.titulo}</Text>
              {s.parrafos.map((p) => (
                <Text key={p} style={[est.texto, { color: t.textoSuave }]}>
                  {p}
                </Text>
              ))}
            </View>
          ))}

          <Text style={[est.version, { color: t.textoTenue }]}>
            Responsable: {politica.responsable} · Versión {politica.version}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const est = StyleSheet.create({
  sello: { flexDirection: 'row', gap: 10, borderRadius: 14, padding: 14, marginBottom: 20 },
  selloTexto: { flex: 1, fontFamily: F.medio, fontSize: 13, lineHeight: 19 },
  titulo: { fontFamily: F.semi, fontSize: 15, marginBottom: 6 },
  texto: { fontFamily: F.normal, fontSize: 13.5, lineHeight: 20, marginBottom: 6 },
  version: { fontFamily: F.normal, fontSize: 12, textAlign: 'center', marginTop: 6 },
});
