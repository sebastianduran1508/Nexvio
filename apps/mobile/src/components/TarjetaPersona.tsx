import React from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { TarjetaPersona as Persona } from '../lib/tipos';
import { bandera, iniciales } from './ui';
import { F } from '../tema/tema';

/**
 * LA TARJETA DEL NETWORKING (8.7.d) — la foto es la protagonista.
 *
 * Se usa en tres lugares, idéntica, para que "¿Cómo me ven?" sea de verdad
 * como te ven: la pila de Descubrir, la vista previa del Perfil y (sin texto
 * largo) la cuadrícula de Explorar.
 *
 * Capas, de abajo hacia arriba:
 *  1. La foto a todo el tamaño (o, sin foto, un degradado con las iniciales
 *     gigantes: nadie se ve "vacío").
 *  2. Un velo oscuro abajo, para que el texto blanco se lea sobre cualquier foto.
 *  3. Insignia arriba a la izquierda (PONENTE dorada, ORGANIZACIÓN, COORDINADOR)
 *     y, si esa persona ya te dio 💜, un aviso arriba a la derecha.
 *  4. Nombre y edad, país, cargo · empresa, descripción y su próxima charla.
 */
export const INSIGNIAS = {
  ponente: { texto: 'PONENTE', icono: 'mic' as const, colores: ['#F59E0B', '#FCD34D'] as const, tinta: '#422006' },
  organizacion: { texto: 'ORGANIZACIÓN', icono: 'ribbon' as const, colores: ['#5A46F0', '#8B7BFF'] as const, tinta: '#FFFFFF' },
  coordinador: { texto: 'COORDINADOR', icono: 'shield-checkmark' as const, colores: ['#0D9488', '#2DD4BF'] as const, tinta: '#FFFFFF' },
};

/** Degradados para las tarjetas sin foto (salen del nombre: siempre el mismo). */
const FONDOS: [string, string][] = [
  ['#5A46F0', '#A78BFA'],
  ['#F97316', '#FDBA74'],
  ['#0EA5E9', '#7DD3FC'],
  ['#DB2777', '#F9A8D4'],
  ['#16A34A', '#86EFAC'],
  ['#7C3AED', '#C4B5FD'],
];

export function fondoDe(nombre: string): [string, string] {
  let h = 0;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return FONDOS[h % FONDOS.length];
}

/** "sáb 14 · 10:00" en la zona del teléfono. */
export function cuandoCharla(iso: string) {
  const d = new Date(iso);
  const dia = d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }).replace(/\./g, '');
  const hora = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  return `${dia} · ${hora}`;
}

export function Insignia({ tipo, pequena }: { tipo: NonNullable<Persona['insignia']>; pequena?: boolean }) {
  const i = INSIGNIAS[tipo];
  return (
    <LinearGradient
      colors={i.colores}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[est.insignia, pequena && { paddingHorizontal: 7, paddingVertical: 3 }]}
    >
      <Ionicons name={i.icono} size={pequena ? 10 : 12} color={i.tinta} />
      <Text style={[est.insigniaTexto, { color: i.tinta }, pequena && { fontSize: 9.5 }]}>{i.texto}</Text>
    </LinearGradient>
  );
}

export default function TarjetaPersona({
  persona,
  style,
  compacta,
}: {
  persona: Persona;
  style?: StyleProp<ViewStyle>;
  /** Para la cuadrícula: sin descripción ni charla, letras más chicas. */
  compacta?: boolean;
}) {
  const p = persona;
  const [a, b] = fondoDe(p.nombre);
  const puesto = [p.cargo, p.empresa].filter(Boolean).join(' · ');
  const charla = p.charlas[0];

  return (
    <View style={[est.tarjeta, compacta && est.tarjetaCompacta, style]}>
      {p.foto_url ? (
        <Image source={{ uri: p.foto_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient colors={[a, b]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, est.sinFoto]}>
          <Text style={[est.iniciales, compacta && { fontSize: 46 }]}>{iniciales(p.nombre)}</Text>
        </LinearGradient>
      )}

      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.88)']}
        locations={[0, 0.35, 1]}
        style={[est.velo, compacta && { height: '60%' }]}
      />

      <View style={est.arriba}>
        {p.insignia ? <Insignia tipo={p.insignia} pequena={compacta} /> : <View />}
        {p.estado === 'recibido' && !compacta ? (
          <View style={est.leInteresas}>
            <Text style={est.leInteresasTexto}>💜 Le interesas</Text>
          </View>
        ) : null}
      </View>

      <View style={[est.abajo, compacta && { padding: 12 }]}>
        <Text style={[est.nombre, compacta && { fontSize: 16 }]} numberOfLines={compacta ? 2 : 2}>
          {p.nombre}
          {p.edad ? <Text style={est.edad}>{`, ${p.edad}`}</Text> : null}
        </Text>
        {puesto ? (
          <Text style={[est.puesto, compacta && { fontSize: 12 }]} numberOfLines={compacta ? 1 : 2}>
            {puesto}
          </Text>
        ) : null}
        {p.pais ? (
          <Text style={[est.pais, compacta && { fontSize: 11.5 }]} numberOfLines={1}>
            {bandera(p.pais_codigo)} {p.pais}
          </Text>
        ) : null}
        {!compacta && p.descripcion ? (
          <Text style={est.descripcion} numberOfLines={3}>
            {p.descripcion}
          </Text>
        ) : null}
        {!compacta && charla ? (
          <View style={est.charla}>
            <Ionicons name="mic-outline" size={14} color="#FCD34D" />
            <Text style={est.charlaTexto} numberOfLines={1}>
              Habla {cuandoCharla(charla.inicio)} · {charla.titulo}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const est = StyleSheet.create({
  tarjeta: { borderRadius: 26, overflow: 'hidden', backgroundColor: '#1F1D2B', justifyContent: 'space-between' },
  tarjetaCompacta: { borderRadius: 18 },
  sinFoto: { alignItems: 'center', justifyContent: 'center' },
  iniciales: { color: 'rgba(255,255,255,0.92)', fontFamily: F.titulo, fontSize: 110, letterSpacing: -2 },
  velo: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  arriba: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14 },
  insignia: {
    flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  insigniaTexto: { fontFamily: F.negrita, fontSize: 11, letterSpacing: 0.6 },
  leInteresas: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  leInteresasTexto: { fontFamily: F.negrita, fontSize: 11.5, color: '#5A46F0' },
  abajo: { padding: 20, gap: 4 },
  nombre: { color: '#fff', fontFamily: F.titulo, fontSize: 27, letterSpacing: -0.4 },
  edad: { fontFamily: F.tituloMedio, color: 'rgba(255,255,255,0.85)' },
  puesto: { color: 'rgba(255,255,255,0.92)', fontFamily: F.semi, fontSize: 14.5 },
  pais: { color: 'rgba(255,255,255,0.85)', fontFamily: F.medio, fontSize: 13 },
  descripcion: { color: 'rgba(255,255,255,0.82)', fontFamily: F.normal, fontSize: 13.5, lineHeight: 19, marginTop: 6 },
  charla: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
  },
  charlaTexto: { flex: 1, color: '#FDE68A', fontFamily: F.semi, fontSize: 12.5 },
});
