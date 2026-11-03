import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { PoliticaDatos } from '../lib/tipos';
import { Boton } from '../components/ui';
import { DEGRADADO, F, sombra, useTema, type Paleta } from '../tema/tema';

/**
 * PRIMER INGRESO (Bloque 8.7.a) — la "puerta" antes de entrar a la app.
 *
 * Aparece si /auth/yo dice que falta alguna de estas dos cosas:
 *  1) debe_cambiar_password  -> la clave es la temporal que mandó el organizador.
 *  2) requiere_aceptar_datos -> no ha aceptado la política de datos VIGENTE
 *     (Ley 1581). Si un día cambia la política, solo aparece esta parte.
 *
 * Mientras falte algo, la persona no ve la app (lo decide RootNavigator).
 * Si no acepta, puede salir: la autorización debe ser libre.
 */
export default function PrimerIngresoScreen() {
  const { yo, recargarYo, signOut } = useAuth();
  const t = useTema();
  const insets = useSafeAreaInsets();

  const pideClave = !!yo?.debe_cambiar_password;
  const pideDatos = !!yo?.requiere_aceptar_datos;

  // --- Contraseña ---
  const [clave, setClave] = useState('');
  const [clave2, setClave2] = useState('');
  const [verClave, setVerClave] = useState(false);
  const requisitos = [
    { texto: 'Al menos 8 caracteres', ok: clave.length >= 8 },
    { texto: 'Una letra y un número', ok: /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(clave) && /\d/.test(clave) },
    { texto: 'Las dos coinciden', ok: clave.length > 0 && clave === clave2 },
  ];
  const claveValida = requisitos.every((r) => r.ok);

  // --- Política de datos ---
  const [politica, setPolitica] = useState<PoliticaDatos | null>(null);
  const [errorPolitica, setErrorPolitica] = useState(false);
  const [acepto, setAcepto] = useState(false);
  const [verPolitica, setVerPolitica] = useState(false);

  async function cargarPolitica() {
    setErrorPolitica(false);
    try {
      setPolitica(await api<PoliticaDatos>('GET', '/auth/politica-datos'));
    } catch {
      setErrorPolitica(true);
    }
  }
  useEffect(() => {
    if (pideDatos) void cargarPolitica();
  }, [pideDatos]);

  // --- Enviar ---
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listo = (!pideClave || claveValida) && (!pideDatos || (acepto && !!politica));

  async function continuar() {
    setError(null);
    if (pideClave && !claveValida) {
      setError('Revisa los requisitos de la contraseña.');
      return;
    }
    if (pideDatos && !acepto) {
      setError('Para usar la app necesitamos tu autorización de datos.');
      return;
    }
    setEnviando(true);
    try {
      // Primero la clave: si esto falla, no se registra nada más.
      if (pideClave) await api('POST', '/auth/cambiar-password', { password: clave });
      if (pideDatos && politica) {
        try {
          await api('POST', '/auth/aceptar-datos', { version: politica.version });
        } catch (e: any) {
          // 409: la política cambió mientras leía -> traemos la nueva.
          setAcepto(false);
          await cargarPolitica();
          throw e;
        }
      }
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setEnviando(false);
      // Siempre volvemos a preguntar: si la clave sí se cambió pero lo de los
      // datos falló, la pantalla ya solo mostrará lo que falta.
      await recargarYo();
    }
  }

  const campo = [est.input, { backgroundColor: t.input, borderColor: t.borde, color: t.texto }];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.fondo }} behavior="padding">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 28 }} keyboardShouldPersistTaps="handled">
        {/* ---------- Saludo ---------- */}
        <LinearGradient
          colors={DEGRADADO}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[est.hero, { paddingTop: insets.top + 32 }]}
        >
          <View style={[est.circulo, { width: 220, height: 220, right: -70, top: -60 }]} />
          <Text style={est.heroHola}>¡Hola, {yo?.nombre?.split(' ')[0] ?? ''}! 👋</Text>
          <Text style={est.heroTexto}>
            {pideClave && pideDatos
              ? 'Antes de empezar, dos cosas rápidas.'
              : pideClave
                ? 'Antes de empezar, crea tu propia contraseña.'
                : 'Actualizamos la política de datos. Revísala para continuar.'}
          </Text>
        </LinearGradient>

        <View style={{ paddingHorizontal: 18, marginTop: -26, gap: 16 }}>
          {/* ---------- 1. Contraseña ---------- */}
          {pideClave && (
            <View style={[est.tarjeta, { backgroundColor: t.tarjeta }, sombra(t)]}>
              <Paso t={t} numero={pideDatos ? 1 : undefined} icono="key-outline" titulo="Crea tu contraseña" />
              <Text style={[est.texto, { color: t.textoSuave }]}>
                La que te enviaron es temporal. Elige una que solo tú conozcas.
              </Text>

              <Text style={[est.label, { color: t.textoSuave }]}>Nueva contraseña</Text>
              <View>
                <TextInput
                  style={[campo, { paddingRight: 48 }]}
                  secureTextEntry={!verClave}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  value={clave}
                  onChangeText={setClave}
                  placeholder="••••••••"
                  placeholderTextColor={t.textoTenue}
                />
                <TouchableOpacity
                  style={est.ojo}
                  onPress={() => setVerClave((v) => !v)}
                  hitSlop={10}
                  accessibilityLabel={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <Ionicons name={verClave ? 'eye-off-outline' : 'eye-outline'} size={20} color={t.textoTenue} />
                </TouchableOpacity>
              </View>

              <Text style={[est.label, { color: t.textoSuave }]}>Repítela</Text>
              <TextInput
                style={campo}
                secureTextEntry={!verClave}
                autoCapitalize="none"
                autoCorrect={false}
                value={clave2}
                onChangeText={setClave2}
                placeholder="••••••••"
                placeholderTextColor={t.textoTenue}
              />

              <View style={{ marginTop: 12, gap: 6 }}>
                {requisitos.map((r) => (
                  <View key={r.texto} style={est.fila}>
                    <Ionicons
                      name={r.ok ? 'checkmark-circle' : 'ellipse-outline'}
                      size={17}
                      color={r.ok ? t.verde : t.textoTenue}
                    />
                    <Text style={[est.req, { color: r.ok ? t.verde : t.textoSuave }]}>{r.texto}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ---------- 2. Tratamiento de datos ---------- */}
          {pideDatos && (
            <View style={[est.tarjeta, { backgroundColor: t.tarjeta }, sombra(t)]}>
              <Paso t={t} numero={pideClave ? 2 : undefined} icono="shield-checkmark-outline" titulo="Tus datos personales" />

              {!politica && !errorPolitica && (
                <Text style={[est.texto, { color: t.textoSuave }]}>Cargando la política…</Text>
              )}
              {errorPolitica && (
                <TouchableOpacity onPress={cargarPolitica}>
                  <Text style={[est.texto, { color: t.rojo }]}>
                    No se pudo cargar la política. Toca para reintentar.
                  </Text>
                </TouchableOpacity>
              )}

              {politica && (
                <>
                  <View style={{ gap: 9, marginTop: 4 }}>
                    {politica.resumen.map((r) => (
                      <View key={r} style={[est.fila, { alignItems: 'flex-start' }]}>
                        <View style={[est.punto, { backgroundColor: t.primarioTexto }]} />
                        <Text style={[est.texto, { color: t.textoSuave, flex: 1, marginTop: 0 }]}>{r}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity style={est.enlace} onPress={() => setVerPolitica(true)}>
                    <Ionicons name="document-text-outline" size={16} color={t.primarioTexto} />
                    <Text style={[est.enlaceTexto, { color: t.primarioTexto }]}>Leer la política completa</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[est.casilla, { borderColor: acepto ? t.primario : t.borde, backgroundColor: acepto ? t.primarioSuave : 'transparent' }]}
                    onPress={() => setAcepto((a) => !a)}
                    activeOpacity={0.8}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: acepto }}
                  >
                    <Ionicons
                      name={acepto ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={acepto ? t.primario : t.textoTenue}
                    />
                    <Text style={[est.casillaTexto, { color: t.texto }]}>
                      Autorizo a {politica.responsable} y a Nexvio, como encargado, el tratamiento
                      de mis datos personales según esta política.
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {error && (
            <View style={[est.error, { backgroundColor: t.rojoSuave }]}>
              <Ionicons name="alert-circle-outline" size={16} color={t.rojo} />
              <Text style={[est.errorTexto, { color: t.rojo }]}>{error}</Text>
            </View>
          )}

          <Boton
            texto="Continuar"
            icono="arrow-forward"
            onPress={continuar}
            cargando={enviando}
            style={{ opacity: listo ? 1 : 0.5 }}
          />

          <TouchableOpacity onPress={() => void signOut()} style={{ alignSelf: 'center', padding: 8 }}>
            <Text style={[est.salir, { color: t.textoTenue }]}>
              {pideDatos ? 'No acepto, salir' : 'Salir'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ---------- Política completa ---------- */}
      <Modal visible={verPolitica} animationType="slide" onRequestClose={() => setVerPolitica(false)}>
        <View style={{ flex: 1, backgroundColor: t.tarjeta, paddingTop: insets.top }}>
          <View style={[est.modalCabecera, { borderColor: t.borde }]}>
            <Text style={[est.modalTitulo, { color: t.texto }]}>Política de datos</Text>
            <TouchableOpacity onPress={() => setVerPolitica(false)} hitSlop={10} accessibilityLabel="Cerrar">
              <Ionicons name="close" size={26} color={t.texto} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 30 }}>
            {politica?.secciones.map((s) => (
              <View key={s.titulo} style={{ marginBottom: 18 }}>
                <Text style={[est.secTitulo, { color: t.texto }]}>{s.titulo}</Text>
                {s.parrafos.map((p) => (
                  <Text key={p} style={[est.secTexto, { color: t.textoSuave }]}>{p}</Text>
                ))}
              </View>
            ))}
            <Text style={[est.version, { color: t.textoTenue }]}>Versión {politica?.version}</Text>
            <Boton
              texto="Entendido"
              onPress={() => setVerPolitica(false)}
              variante="suave"
              style={{ marginTop: 16 }}
            />
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

/** Encabezado de cada tarjeta: número (si hay dos pasos), ícono y título. */
function Paso({
  t,
  numero,
  icono,
  titulo,
}: {
  t: Paleta;
  numero?: number;
  icono: React.ComponentProps<typeof Ionicons>['name'];
  titulo: string;
}) {
  return (
    <View style={est.fila}>
      <View style={[est.pasoIcono, { backgroundColor: t.primarioSuave }]}>
        <Ionicons name={icono} size={18} color={t.primarioTexto} />
      </View>
      <Text style={[est.pasoTitulo, { color: t.texto }]}>
        {numero ? `${numero}. ` : ''}
        {titulo}
      </Text>
    </View>
  );
}

const est = StyleSheet.create({
  hero: { paddingHorizontal: 24, paddingBottom: 52, overflow: 'hidden' },
  circulo: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroHola: { color: '#fff', fontFamily: F.titulo, fontSize: 27, letterSpacing: -0.4 },
  heroTexto: { color: 'rgba(255,255,255,0.85)', fontFamily: F.normal, fontSize: 15, lineHeight: 21, marginTop: 8 },
  tarjeta: { borderRadius: 20, padding: 18 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  pasoIcono: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  pasoTitulo: { fontFamily: F.titulo, fontSize: 17 },
  texto: { fontFamily: F.normal, fontSize: 13.5, lineHeight: 19.5, marginTop: 10 },
  label: { fontFamily: F.semi, fontSize: 13, marginBottom: 7, marginTop: 14 },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 13, fontSize: 15, fontFamily: F.medio },
  ojo: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  req: { fontFamily: F.medio, fontSize: 13 },
  punto: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  enlaceTexto: { fontFamily: F.semi, fontSize: 13.5 },
  casilla: { flexDirection: 'row', gap: 10, borderWidth: 1.5, borderRadius: 14, padding: 13, marginTop: 14 },
  casillaTexto: { flex: 1, fontFamily: F.medio, fontSize: 13, lineHeight: 18.5 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12 },
  errorTexto: { flex: 1, fontFamily: F.medio, fontSize: 13 },
  salir: { fontFamily: F.medio, fontSize: 13.5 },
  modalCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitulo: { fontFamily: F.titulo, fontSize: 19 },
  secTitulo: { fontFamily: F.semi, fontSize: 15, marginBottom: 6 },
  secTexto: { fontFamily: F.normal, fontSize: 13.5, lineHeight: 20, marginBottom: 6 },
  version: { fontFamily: F.normal, fontSize: 12, textAlign: 'center' },
});
