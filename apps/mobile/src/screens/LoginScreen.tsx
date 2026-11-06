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
import { Boton, Brillo } from '../components/ui';
import { DEGRADADO, F, useTema } from '../tema/tema';
import { SECUNDARIO_NEXVIO } from '../lib/color';

/**
 * Pantalla de inicio de sesion del asistente. Pide usuario (o correo, para el
 * staff; 8.7.a) y contrasena y llama
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
      await signIn(email, password);
    } catch (e: any) {
      setError(e.message ?? 'No se pudo iniciar sesion');
    } finally {
      setCargando(false);
    }
  }

  const campo = [
    est.input,
    { backgroundColor: t.tarjeta, borderColor: t.borde, color: t.texto },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.fondo }}
      // 'padding' también en Android: con edge-to-edge (app.json) Android ya no
      // encoge la ventana al abrir el teclado, así que hay que empujar nosotros.
      behavior="padding"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        {/* ---------- Bloque de bienvenida ---------- */}
        {/* 8.7.j: siempre con los colores de NEXVIO (aún no se sabe a qué
            congreso se va a entrar; y tras cerrar sesión no debe quedar el
            color del congreso anterior). */}
        <LinearGradient
          colors={DEGRADADO}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={[est.hero, { paddingTop: insets.top + 44 }]}
        >
          <Brillo color={SECUNDARIO_NEXVIO} />
          <NexvioMark size={84} blanca />
          <Text style={est.marcaTexto}>Nexvio</Text>
          <Text style={est.heroTexto}>Tu congreso, conectado</Text>
        </LinearGradient>

        {/* ---------- Hoja con el formulario ---------- */}
        <View style={[est.hoja, { backgroundColor: t.tarjeta, paddingBottom: insets.bottom + 24 }]}>
          <Text style={[est.hojaTitulo, { color: t.texto }]}>¡Hola de nuevo!</Text>
          <Text style={[est.hojaSub, { color: t.textoSuave }]}>
            Entra con el usuario y la contraseña que te dio la organización del evento.
          </Text>

          <Text style={[est.label, { color: t.textoSuave }]}>Usuario</Text>
          <View>
          <View style={est.iconoCampo} pointerEvents="none">
            <Ionicons name="person-outline" size={18} color={t.primarioTexto} />
          </View>
          <TextInput
            style={[campo, { paddingLeft: 44 }]}
            placeholder="Ej. JPGarcia"
            placeholderTextColor={t.textoTenue}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            value={email}
            onChangeText={setEmail}
          />
          </View>

          <Text style={[est.label, { color: t.textoSuave }]}>Contraseña</Text>
          <View>
            <View style={est.iconoCampo} pointerEvents="none">
              <Ionicons name="lock-closed-outline" size={18} color={t.textoSuave} />
            </View>
            <TextInput
              style={[campo, { paddingRight: 48, paddingLeft: 44 }]}
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

          <View style={[est.ayuda, { backgroundColor: t.primarioSuave }]}>
            <Ionicons name="information-circle-outline" size={18} color={t.primarioTexto} />
            <Text style={[est.ayudaTexto, { color: t.texto }]}>
              ¿Olvidaste tu contraseña? Pídele a la organización del evento que la restablezca.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const est = StyleSheet.create({
  hero: { paddingHorizontal: 24, paddingBottom: 72, overflow: 'hidden', alignItems: 'center' },
  marcaTexto: { color: '#fff', fontFamily: F.titulo, fontSize: 36, letterSpacing: -0.6, marginTop: 10 },
  heroTexto: { color: 'rgba(255,255,255,0.88)', fontFamily: F.semi, fontSize: 14.5, marginTop: 4 },
  // El ícono a la izquierda del campo, centrado en alto (pointerEvents: el toque pasa al campo).
  iconoCampo: { position: 'absolute', left: 15, top: 0, bottom: 0, zIndex: 1, justifyContent: 'center' },
  hoja: {
    flex: 1,
    marginTop: -28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  hojaTitulo: { fontFamily: F.titulo, fontSize: 25 },
  hojaSub: { fontFamily: F.normal, fontSize: 14, lineHeight: 20, marginTop: 4, marginBottom: 10 },
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
  ayuda: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, padding: 13, marginTop: 18 },
  ayudaTexto: { flex: 1, fontFamily: F.medio, fontSize: 13, lineHeight: 18.5 },
});
