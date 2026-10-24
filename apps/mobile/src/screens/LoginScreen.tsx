import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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
import { NexvioMark } from '../components/Logo';
import { Boton } from '../components/ui';
import { DEGRADADO, F, useTema } from '../tema/tema';

/**
 * Pantalla de inicio de sesion del asistente. Pide correo y contrasena y llama
 * a signIn() del contexto. Si el login funciona, la navegacion cambia sola a la
 * app (porque el contexto pasa a tener sesion).
 *
 * Rediseño (mockup "A · Login"): bloque superior con degradado y mensaje de
 * bienvenida, y una "hoja" blanca abajo con el formulario. La lógica no cambió.
 * Nuevo: el ojito para ver la contraseña mientras se escribe.
 */
export default function LoginScreen() {
  const { signIn } = useAuth();
  const t = useTema();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit() {
    setError(null);
    setCargando(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setError(e.message ?? 'No se pudo iniciar sesion');
    } finally {
      setCargando(false);
    }
  }

  const campo = [
    est.input,
    { backgroundColor: t.input, borderColor: t.borde, color: t.texto },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.tarjeta }}
      // 'padding' también en Android: con edge-to-edge (app.json) Android ya no
      // encoge la ventana al abrir el teclado, así que hay que empujar nosotros.
      behavior="padding"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        {/* ---------- Bloque de bienvenida ---------- */}
        <LinearGradient
          colors={DEGRADADO}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[est.hero, { paddingTop: insets.top + 48 }]}
        >
          <View style={[est.circulo, { width: 260, height: 260, right: -90, top: -70 }]} />
          <View style={[est.circulo, { width: 200, height: 200, left: -80, bottom: -40 }]} />

          <View style={est.marca}>
            <View style={est.marcaIcono}>
              <NexvioMark size={30} />
            </View>
            <Text style={est.marcaTexto}>Nexvio</Text>
          </View>

          <Text style={est.heroTitulo}>Tu congreso,{'\n'}en un solo lugar</Text>
          <Text style={est.heroTexto}>
            Agenda, preguntas en vivo, encuestas y networking entre asistentes.
          </Text>
        </LinearGradient>

        {/* ---------- Hoja con el formulario ---------- */}
        <View style={[est.hoja, { backgroundColor: t.tarjeta, paddingBottom: insets.bottom + 24 }]}>
          <Text style={[est.hojaTitulo, { color: t.texto }]}>Iniciar sesión</Text>

          <Text style={[est.label, { color: t.textoSuave }]}>Correo</Text>
          <TextInput
            style={campo}
            placeholder="tu@correo.com"
            placeholderTextColor={t.textoTenue}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={[est.label, { color: t.textoSuave }]}>Contraseña</Text>
          <View>
            <TextInput
              style={[campo, { paddingRight: 48 }]}
              placeholder="••••••••"
              placeholderTextColor={t.textoTenue}
              secureTextEntry={!verClave}
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
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

          {error && (
            <View style={[est.error, { backgroundColor: t.rojoSuave }]}>
              <Ionicons name="alert-circle-outline" size={16} color={t.rojo} />
              <Text style={[est.errorTexto, { color: t.rojo }]}>{error}</Text>
            </View>
          )}

          <Boton texto="Entrar" onPress={onSubmit} cargando={cargando} style={{ marginTop: 22 }} />

          <Text style={[est.ayuda, { color: t.textoTenue }]}>
            ¿Problemas para entrar? Pide ayuda al organizador del evento.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const est = StyleSheet.create({
  hero: { paddingHorizontal: 24, paddingBottom: 64, overflow: 'hidden' },
  circulo: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 36 },
  marcaIcono: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcaTexto: { color: '#fff', fontFamily: F.titulo, fontSize: 24 },
  heroTitulo: { color: '#fff', fontFamily: F.titulo, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  heroTexto: { color: 'rgba(255,255,255,0.82)', fontFamily: F.normal, fontSize: 14.5, lineHeight: 21, marginTop: 12 },
  hoja: {
    flex: 1,
    marginTop: -28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  hojaTitulo: { fontFamily: F.titulo, fontSize: 21, marginBottom: 18 },
  label: { fontFamily: F.semi, fontSize: 13, marginBottom: 7, marginTop: 10 },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: F.medio,
  },
  ojo: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12, marginTop: 14 },
  errorTexto: { flex: 1, fontFamily: F.medio, fontSize: 13 },
  ayuda: { textAlign: 'center', fontFamily: F.normal, fontSize: 12.5, marginTop: 18 },
});
