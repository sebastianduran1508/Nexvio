import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';

/**
 * Pantalla de inicio de sesion del asistente. Pide correo y contrasena y llama
 * a signIn() del contexto. Si el login funciona, la navegacion cambia sola a la
 * app (porque el contexto pasa a tener sesion).
 *
 * Diseño: usa el <Logo /> de marca (símbolo de nodos + wordmark) y tokens
 * NativeWind. El modo oscuro lo aplica el sistema operativo automáticamente.
 */
export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <KeyboardAvoidingView
      className="flex-1 justify-center bg-background p-6"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="rounded-2xl border border-border bg-card p-6">
        <View className="mb-6 items-center">
          <Logo />
          <Text className="mt-2 text-[15px] text-muted-foreground">
            Accede a tus congresos
          </Text>
        </View>

        <TextInput
          className="mb-3 rounded-xl border border-input bg-card px-3.5 py-3 text-base text-foreground"
          placeholder="Correo"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          className="mb-3 rounded-xl border border-input bg-card px-3.5 py-3 text-base text-foreground"
          placeholder="Contrasena"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text className="mb-3 text-destructive">{error}</Text>}

        <TouchableOpacity
          className={`mt-1 items-center rounded-xl bg-primary py-3.5 ${cargando ? 'opacity-60' : ''}`}
          onPress={onSubmit}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-bold text-primary-foreground">Entrar</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
