import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMarca } from '../context/MarcaContext';
import { conAlfa, textoSobre } from '../lib/color';
import { F, sombra, useTema } from '../tema/tema';
import { useBordeMarca } from './ui';
import i18n from '../i18n';

/**
 * DIÁLOGOS CON EL ESTILO DE NEXVIO (8.8, pedido de Sebastián).
 *
 * Alert.alert() le pide el mensaje al SISTEMA (Android/iOS): sale con su
 * estilo (blanco, botones azules en mayúsculas) y no se puede personalizar.
 * Este componente lo reemplaza con uno propio: tarjeta con el borde de marca,
 * ícono arriba, botones en pastilla con el color del congreso, claro/oscuro.
 *
 * Se usa IGUAL que Alert.alert (mismos parámetros), desde cualquier parte,
 * incluso desde funciones que no son pantallas:
 *
 *   aviso('Enviada', 'Tu pregunta fue enviada.');
 *   avisoError('No se pudo guardar', e.message);           // ícono de error
 *   aviso('¿Eliminar?', 'No se puede deshacer.', [
 *     { text: 'Cancelar', style: 'cancel' },
 *     { text: 'Eliminar', style: 'destructive', onPress: borrar },  // -> tono peligro, botón rojo
 *   ]);
 *
 * Cómo funciona por dentro: <DialogoProvider> (en App.tsx) pinta el diálogo y
 * deja anotada su función "mostrar" en una variable del módulo; aviso() la
 * llama. Si por algo no estuviera montado, cae al Alert del sistema.
 */
export type BotonDialogo = { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void };
type Tono = 'info' | 'error' | 'peligro' | 'exito';
type Dialogo = { titulo: string; mensaje?: string; botones: BotonDialogo[]; tono: Tono };

let mostrarRef: ((d: Dialogo) => void) | null = null;

function abrir(titulo: string, mensaje: string | undefined, botones: BotonDialogo[] | undefined, tono: Tono) {
  const lista = botones && botones.length > 0 ? botones : [{ text: i18n.t('dialogo.entendido') }];
  // Con un botón "destructive" (eliminar, revocar…) el diálogo es de peligro.
  const t = lista.some((b) => b.style === 'destructive') ? 'peligro' : tono;
  if (mostrarRef) mostrarRef({ titulo, mensaje, botones: lista, tono: t });
  else Alert.alert(titulo, mensaje, lista);
}

/** Mensaje normal (información, confirmación). */
export function aviso(titulo: string, mensaje?: string, botones?: BotonDialogo[]) {
  abrir(titulo, mensaje, botones, 'info');
}
/** Algo salió mal (ícono de error). */
export function avisoError(titulo: string, mensaje?: string, botones?: BotonDialogo[]) {
  abrir(titulo, mensaje, botones, 'error');
}
/** Algo salió bien (ícono de check). */
export function avisoExito(titulo: string, mensaje?: string, botones?: BotonDialogo[]) {
  abrir(titulo, mensaje, botones, 'exito');
}

export function DialogoProvider({ children }: { children: React.ReactNode }) {
  // Cola: si llega uno mientras otro está abierto, se muestra después.
  const [cola, setCola] = useState<Dialogo[]>([]);
  const actual = cola[0];

  useEffect(() => {
    mostrarRef = (d) => setCola((c) => [...c, d]);
    return () => {
      mostrarRef = null;
    };
  }, []);

  const cerrar = useCallback((boton?: BotonDialogo) => {
    setCola((c) => c.slice(1));
    // El onPress va DESPUÉS de cerrar (por si abre otro diálogo o navega).
    if (boton?.onPress) setTimeout(boton.onPress, 0);
  }, []);

  return (
    <>
      {children}
      {actual ? <Tarjeta key={cola.length + actual.titulo} dialogo={actual} alCerrar={cerrar} /> : null}
    </>
  );
}

const ICONO: Record<Tono, React.ComponentProps<typeof Ionicons>['name']> = {
  info: 'information',
  error: 'alert',
  peligro: 'trash-outline',
  exito: 'checkmark',
};

function Tarjeta({ dialogo, alCerrar }: { dialogo: Dialogo; alCerrar: (b?: BotonDialogo) => void }) {
  const t = useTema();
  const marca = useMarca();
  const borde = useBordeMarca();
  const escala = useRef(new Animated.Value(0.9)).current;
  useEffect(() => {
    Animated.spring(escala, { toValue: 1, friction: 7, tension: 120, useNativeDriver: true }).start();
  }, [escala]);

  const { titulo, mensaje, botones, tono } = dialogo;
  // Color del ícono según el tono: la marca para info, rojo para error/peligro, verde para éxito.
  const color = tono === 'error' || tono === 'peligro' ? t.rojo : tono === 'exito' ? t.verde : marca.primario;
  const cancelar = botones.find((b) => b.style === 'cancel');
  // Si hay "cancelar", va primero (a la izquierda) y en gris; los demás en color.
  const ordenados = [...botones.filter((b) => b.style === 'cancel'), ...botones.filter((b) => b.style !== 'cancel')];
  const enFila = ordenados.length === 2;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => alCerrar(cancelar)} statusBarTranslucent>
      {/* Tocar fuera = cancelar (solo si hay un "cancelar" o un único botón) */}
      <Pressable
        style={est.fondo}
        onPress={() => (cancelar || botones.length === 1 ? alCerrar(cancelar ?? botones[0]) : undefined)}
      >
        <Animated.View style={{ transform: [{ scale: escala }], width: '100%', alignItems: 'center' }}>
          <Pressable
            accessibilityRole="alert"
            style={[est.tarjeta, { backgroundColor: t.tarjeta, borderColor: borde }, sombra(t, 2)]}
          >
            <View style={[est.icono, { backgroundColor: conAlfa(color.startsWith('#') ? color : '#5A46F0', t.oscuro ? 0.22 : 0.12) }]}>
              <Ionicons name={ICONO[tono]} size={26} color={color} />
            </View>
            <Text style={[est.titulo, { color: t.texto }]}>{titulo}</Text>
            {mensaje ? <Text style={[est.mensaje, { color: t.textoSuave }]}>{mensaje}</Text> : null}

            <View style={[est.botones, enFila && { flexDirection: 'row' }]}>
              {ordenados.map((b, i) => {
                const esCancelar = b.style === 'cancel';
                const esPeligro = b.style === 'destructive';
                const fondo = esCancelar ? t.barraFondo : esPeligro ? t.rojo : marca.primario;
                const texto = esCancelar ? t.texto : textoSobre(esPeligro ? '#C8102E' : marca.primario);
                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.85}
                    onPress={() => alCerrar(b)}
                    style={[est.boton, enFila && { flex: 1 }, { backgroundColor: fondo }]}
                  >
                    <Text style={[est.botonTexto, { color: texto }]} numberOfLines={1}>
                      {b.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const est = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(13,11,24,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  tarjeta: { width: '100%', maxWidth: 380, borderRadius: 26, borderWidth: 1.5, padding: 22, alignItems: 'center' },
  icono: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  titulo: { fontFamily: F.titulo, fontSize: 19, textAlign: 'center', lineHeight: 25 },
  mensaje: { fontFamily: F.normal, fontSize: 14.5, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  botones: { alignSelf: 'stretch', gap: 10, marginTop: 20 },
  boton: { borderRadius: 14, paddingVertical: 13, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  botonTexto: { fontFamily: F.negrita, fontSize: 15 },
});
