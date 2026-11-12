import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useMiCongreso } from '../context/MiCongresoContext';
import { rangoFechas } from '../lib/formato';
import { api, apiSubirImagen } from '../lib/api';
import { elegirFoto } from '../lib/foto';
import type { Perfil } from '../lib/tipos';
import { Avatar, Boton, Brillo, Tarjeta, TituloSeccion, bandera } from '../components/ui';
import { F, useTema } from '../tema/tema';
import { useApariencia, type PreferenciaTema } from '../tema/TemaProvider';
import { useMarca } from '../context/MarcaContext';
import { legibleSobre, textoSobre } from '../lib/color';
import type { PerfilStackParamList } from '../navigation/PerfilStack';

import { locale } from '../i18n';
import { useTranslation } from 'react-i18next';
import { useIdioma, type PreferenciaIdioma } from '../i18n/IdiomaProvider';
import { avisoError } from '../components/Dialogo'; // 8.8: diálogos con el estilo de Nexvio
type Props = NativeStackScreenProps<PerfilStackParamList, 'Perfil'>;

/**
 * PERFIL (8.7.b) — la pestaña de "todo lo demás".
 *
 * Patrón de casi todas las apps: lo que se usa a diario va en las pestañas de
 * abajo; lo que se usa de vez en cuando (congreso, privacidad, ayuda, salir)
 * vive aquí. Se irá llenando:
 *  - 8.7.c ✅: foto (tocar el avatar: cámara, galería o quitar) y "Mis datos".
 *  - 8.7.d ✅: "¿Cómo me ven?" y el interruptor "Aparecer en networking".
 *  - 8.7.g ✅: Apariencia (como el congreso / teléfono / claro / oscuro).
 *  - 8.7.j: rediseño del mockup — cabecera horizontal (foto grande + nombre +
 *    cargo + "@usuario · país"), Apariencia con selector directo aquí mismo y
 *    los colores del congreso en íconos e interruptor.
 */
export default function PerfilScreen({ navigation }: Props) {
  const { yo, signOut } = useAuth();
  const { actual, congresos, elegir } = useMiCongreso();
  const t = useTema();
  const marca = useMarca();
  const insets = useSafeAreaInsets();
  const nombre = [yo?.nombre, yo?.apellidos].filter(Boolean).join(' ');
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const { preferencia, cambiarPreferencia } = useApariencia();
  // 8.8: idioma (el traductor se llama `tr` porque `t` ya es el tema)
  const { t: tr } = useTranslation();
  const idioma = useIdioma();

  // 8.7.c: el perfil (para la foto y el resumen de "Mis datos"). Se recarga al
  // volver a la pantalla, por si se editó en "Mis datos".
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [menuFoto, setMenuFoto] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  useFocusEffect(
    useCallback(() => {
      api<Perfil>('GET', '/perfil').then(setPerfil).catch(() => undefined);
    }, []),
  );

  async function cambiarFoto(origen: 'camara' | 'galeria') {
    setMenuFoto(false);
    try {
      const uri = await elegirFoto(origen);
      if (!uri) return;
      setSubiendo(true);
      setPerfil(await apiSubirImagen<Perfil>('/perfil/foto', uri));
    } catch (e: any) {
      avisoError(tr('miPerfil.noCambiarFoto'), e?.message ?? tr('comun.intentaDeNuevo'));
    } finally {
      setSubiendo(false);
    }
  }

  async function quitarFoto() {
    setMenuFoto(false);
    try {
      setSubiendo(true);
      setPerfil(await api<Perfil>('DELETE', '/perfil/foto'));
    } catch (e: any) {
      avisoError(tr('miPerfil.noQuitarFoto'), e?.message ?? tr('comun.intentaDeNuevo'));
    } finally {
      setSubiendo(false);
    }
  }

  // 8.7.d: el interruptor. Se cambia al instante en pantalla y, si el servidor
  // falla, se devuelve a como estaba.
  async function cambiarVisible(visible: boolean) {
    const antes = perfil;
    setPerfil((x) => (x ? { ...x, visible_networking: visible } : x));
    try {
      setPerfil(await api<Perfil>('PATCH', '/perfil', { visible_networking: visible }));
    } catch (e: any) {
      setPerfil(antes);
      avisoError(tr('miPerfil.noCambiar'), e?.message ?? tr('comun.intentaDeNuevo'));
    }
  }

  const resumenDatos =
    [perfil?.cargo, perfil?.empresa].filter(Boolean).join(' · ') || tr('miPerfil.resumenDatos');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.fondo }} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* ---------- Encabezado con la persona ---------- */}
      <LinearGradient
        colors={marca.degradado}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={[est.hero, { paddingTop: insets.top + 22 }]}
      >
        <Brillo color={marca.brillo} />
        <View style={est.heroFila}>
          <TouchableOpacity
            style={est.avatarAro}
            onPress={() => setMenuFoto(true)}
            activeOpacity={0.85}
            accessibilityLabel={tr('miPerfil.cambiarFoto')}
          >
            <Avatar nombre={nombre || '?'} tamano={84} foto={perfil?.foto_url} />
            {subiendo && (
              <View style={est.subiendo}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
            <View style={[est.camara, { borderColor: marca.primario }]}>
              <Ionicons name="camera" size={15} color={legibleSobre(marca.primario, '#FFFFFF')} />
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={est.nombre} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>{nombre}</Text>
            {perfil?.cargo || perfil?.empresa ? (
              <Text style={est.puesto} numberOfLines={2}>
                {[perfil?.cargo, perfil?.empresa].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
            {yo?.username ? (
              <View style={est.chipUsuario}>
                <Text style={est.chipUsuarioTexto} numberOfLines={1}>
                  @{yo.username}
                  {perfil?.pais ? ` · ${bandera(perfil.pais_codigo)} ${perfil.pais}` : ''}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        {!perfil?.foto_url && !subiendo && (
          <Text style={est.pista}>{tr('miPerfil.agregaFoto')}</Text>
        )}
      </LinearGradient>

      <View style={{ paddingHorizontal: 20 }}>
        {/* ---------- Cuenta ---------- */}
        <TituloSeccion texto={tr('miPerfil.tuCuenta')} />
        <Tarjeta style={est.grupo}>
          <Fila
            icono="person"
            titulo={tr('miPerfil.misDatos')}
            subtitulo={resumenDatos}
            onPress={() => navigation.navigate('EditarPerfil')}
          />
        </Tarjeta>

        {/* ---------- Congreso ----------
            Decisión 40 (8.10): con 2 o más, aparecen TODOS aquí mismo; tocar uno
            lo elige y te quedas en el Perfil (antes: "Cambiar de congreso" te
            mandaba a la lista en la primera pestaña). */}
        {congresos.length > 1 ? (
          <>
            <TituloSeccion texto={tr('miPerfil.misCongresos')} />
            <Tarjeta style={est.grupo}>
              {congresos.map((c, i) => {
                const esActual = c.id === actual?.id;
                return (
                  <React.Fragment key={c.id}>
                    {i > 0 && <Separador />}
                    <Fila
                      icono="calendar"
                      titulo={c.nombre}
                      subtitulo={esActual ? tr('miPerfil.estasViendo') : rangoFechas(c.fecha_inicio, c.fecha_fin)}
                      destacada={esActual}
                      seleccion={esActual ? 'si' : 'no'}
                      onPress={esActual ? undefined : () => elegir(c.id)}
                    />
                  </React.Fragment>
                );
              })}
            </Tarjeta>
          </>
        ) : (
          <>
            <TituloSeccion texto={tr('miPerfil.tuCongreso')} />
            <Tarjeta style={est.grupo}>
              <Fila
                icono="calendar"
                titulo={actual?.nombre ?? '—'}
                subtitulo={actual ? rangoFechas(actual.fecha_inicio, actual.fecha_fin) : undefined}
              />
            </Tarjeta>
          </>
        )}

        {/* ---------- Privacidad ---------- */}
        {/* ---------- Networking (8.7.d) ---------- */}
        <TituloSeccion texto={tr('miPerfil.networking')} />
        <Tarjeta style={est.grupo}>
          {actual && (
            <>
              <Fila
                icono="eye"
                titulo={tr('miPerfil.comoMeVen')}
                subtitulo={tr('miPerfil.comoMeVenSub')}
                destacada
                onPress={() => navigation.navigate('ComoMeVen')}
              />
              <Separador />
            </>
          )}
          <View style={est.fila}>
            <View style={[est.icono, { backgroundColor: marca.primarioSuave }]}>
              <Ionicons name="people" size={18} color={marca.primarioTexto} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[est.filaTitulo, { color: t.texto }]}>{tr('miPerfil.aparecer')}</Text>
              <Text style={[est.filaSub, { color: t.textoTenue }]} numberOfLines={2}>
                {perfil?.visible_networking === false
                  ? tr('miPerfil.nadieTeVe')
                  : tr('miPerfil.teVen')}
              </Text>
            </View>
            <Switch
              value={perfil?.visible_networking !== false}
              onValueChange={cambiarVisible}
              disabled={!perfil}
              trackColor={{ true: marca.primario, false: t.borde }}
              thumbColor="#fff"
            />
          </View>
        </Tarjeta>

        <TituloSeccion texto={tr('miPerfil.privacidad')} />
        <Tarjeta style={est.grupo}>
          <Fila
            icono="shield-checkmark"
            titulo={tr('miPerfil.tratamiento')}
            subtitulo={
              yo?.acepto_datos_en
                ? tr('miPerfil.autorizadoEl', { fecha: fechaLocal(yo.acepto_datos_en) })
                : tr('miPerfil.politicaDatos')
            }
            onPress={() => navigation.navigate('PoliticaDatos')}
          />
        </Tarjeta>

        {/* ---------- Ajustes (8.7.g) ---------- */}
        <TituloSeccion texto={tr('miPerfil.ajustes')} />
        {/* 8.7.j: el selector va aquí mismo (antes había que entrar a otra pantalla) */}
        <Tarjeta style={{ padding: 14, gap: 10 }}>
          <Text style={[est.ajusteTitulo, { color: t.textoSuave }]}>{tr('perfil.apariencia').toUpperCase()}</Text>
          <View style={[est.segmentos, { backgroundColor: t.barraFondo }]} accessibilityRole="radiogroup">
            {(
              [
                ['congreso', tr('apariencia.porDefecto')],
                ['claro', tr('apariencia.claro')],
                ['oscuro', tr('apariencia.oscuro')],
              ] as [PreferenciaTema, string][]
            ).map(([valor, texto]) => {
              const activa = preferencia === valor || (valor === 'congreso' && preferencia === 'sistema');
              return (
                <TouchableOpacity
                  key={valor}
                  onPress={() => cambiarPreferencia(valor)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activa }}
                  style={[est.segmento, activa && { backgroundColor: marca.primario }]}
                >
                  <Text style={[est.segmentoTexto, { color: activa ? textoSobre(marca.primario) : t.textoSuave }]}>{texto}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Tarjeta>

        {/* ---------- Idioma (8.8, decisión 35) ---------- */}
        <Tarjeta style={{ padding: 14, gap: 10, marginTop: 10 }}>
          <Text style={[est.ajusteTitulo, { color: t.textoSuave }]}>{tr('perfil.idioma').toUpperCase()}</Text>
          <View style={[est.segmentos, { backgroundColor: t.barraFondo, flexWrap: 'wrap' }]} accessibilityRole="radiogroup">
            {(
              [
                ['telefono', tr('idioma.porDefecto')],
                ['es', tr('idioma.es')],
                ['en', tr('idioma.en')],
                ['pt', tr('idioma.pt')],
              ] as [PreferenciaIdioma, string][]
            ).map(([valor, texto]) => {
              const activa = idioma.preferencia === valor;
              return (
                <TouchableOpacity
                  key={valor}
                  onPress={() => idioma.cambiarPreferencia(valor)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activa }}
                  style={[est.segmento, { minWidth: '22%' }, activa && { backgroundColor: marca.primario }]}
                >
                  <Text style={[est.segmentoTexto, { fontSize: 12, color: activa ? textoSobre(marca.primario) : t.textoSuave }]} numberOfLines={1}>
                    {texto}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[est.filaSub, { color: t.textoTenue, marginTop: 0 }]}>{tr('idioma.ayuda')}</Text>
        </Tarjeta>

        {/* ---------- Ayuda ---------- */}
        <TituloSeccion texto={tr('miPerfil.ayuda')} />
        <Tarjeta style={est.grupo}>
          <Fila
            icono="help-buoy"
            titulo={tr('miPerfil.necesitasAyuda')}
            subtitulo={tr('miPerfil.escribeOrganizador')}
          />
          <Separador />
          <Fila icono="information-circle" titulo={tr('miPerfil.acerca')} subtitulo={tr('miPerfil.version', { version })} />
        </Tarjeta>

        <Boton
          texto={tr('miPerfil.cerrarSesion')}
          icono="log-out-outline"
          variante="peligro"
          onPress={() => void signOut()}
          style={{ marginTop: 26 }}
        />
      </View>

      {/* ---------- Menú de la foto (hoja desde abajo) ---------- */}
      <Modal visible={menuFoto} transparent animationType="fade" onRequestClose={() => setMenuFoto(false)}>
        <Pressable style={est.fondoHoja} onPress={() => setMenuFoto(false)}>
          <Pressable style={[est.hoja, { backgroundColor: t.tarjeta, paddingBottom: insets.bottom + 16 }]}>
            <View style={[est.agarre, { backgroundColor: t.borde }]} />
            <Text style={[est.hojaTitulo, { color: t.texto }]}>{tr('miPerfil.fotoPerfil')}</Text>
            <OpcionHoja icono="camera-outline" texto={tr('miPerfil.tomarFoto')} onPress={() => cambiarFoto('camara')} />
            <OpcionHoja icono="images-outline" texto={tr('miPerfil.elegirGaleria')} onPress={() => cambiarFoto('galeria')} />
            {perfil?.foto_url ? (
              <OpcionHoja icono="trash-outline" texto={tr('miPerfil.quitarFoto')} peligro onPress={quitarFoto} />
            ) : null}
            <OpcionHoja icono="close" texto={tr('comun.cancelar')} onPress={() => setMenuFoto(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function OpcionHoja({
  icono,
  texto,
  onPress,
  peligro,
}: {
  icono: React.ComponentProps<typeof Ionicons>['name'];
  texto: string;
  onPress: () => void;
  peligro?: boolean;
}) {
  const t = useTema();
  const color = peligro ? t.rojo : t.texto;
  return (
    <TouchableOpacity style={est.opcion} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icono} size={21} color={peligro ? t.rojo : t.primarioTexto} />
      <Text style={[est.opcionTexto, { color }]}>{texto}</Text>
    </TouchableOpacity>
  );
}

/** Fecha y día en la zona del teléfono: "30 oct 2026". */
function fechaLocal(iso: string) {
  return new Date(iso)
    .toLocaleDateString(locale(), { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(/\./g, '');
}

/** Una fila del menú: ícono en cuadrito, título, subtítulo y flecha si se toca. */
function Fila({
  icono,
  titulo,
  subtitulo,
  onPress,
  destacada,
  seleccion,
}: {
  icono: React.ComponentProps<typeof Ionicons>['name'];
  titulo: string;
  subtitulo?: string;
  onPress?: () => void;
  /** 8.7.j: ícono con el degradado de marca (para lo que debe resaltar). */
  destacada?: boolean;
  /** 8.10: fila de una lista "elige uno" (círculo marcado / vacío en vez de flecha). */
  seleccion?: 'si' | 'no';
}) {
  const t = useTema();
  const marca = useMarca();
  const contenido = (
    <>
      {destacada ? (
        <LinearGradient colors={[marca.primario, marca.brillo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={est.icono}>
          <Ionicons name={icono} size={18} color="#fff" />
        </LinearGradient>
      ) : (
        <View style={[est.icono, { backgroundColor: marca.primarioSuave }]}>
          <Ionicons name={icono} size={18} color={marca.primarioTexto} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[est.filaTitulo, { color: t.texto }]} numberOfLines={2}>
          {titulo}
        </Text>
        {subtitulo ? (
          <Text style={[est.filaSub, { color: t.textoTenue }]} numberOfLines={1}>
            {subtitulo}
          </Text>
        ) : null}
      </View>
      {seleccion ? (
        <Ionicons
          name={seleccion === 'si' ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={seleccion === 'si' ? marca.primario : t.textoTenue}
        />
      ) : (
        onPress && <Ionicons name="chevron-forward" size={18} color={t.textoTenue} />
      )}
    </>
  );
  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={est.fila}>
      {contenido}
    </TouchableOpacity>
  ) : (
    <View style={est.fila}>{contenido}</View>
  );
}

function Separador() {
  const t = useTema();
  return <View style={{ height: 1, backgroundColor: t.borde, marginLeft: 62 }} />;
}

const est = StyleSheet.create({
  hero: {
    paddingHorizontal: 20, paddingBottom: 24, overflow: 'hidden',
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  heroFila: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarAro: { padding: 3, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.9)' },
  subiendo: {
    position: 'absolute', top: 3, left: 3, width: 84, height: 84, borderRadius: 27,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  camara: {
    position: 'absolute', right: -6, bottom: -6, width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, backgroundColor: '#fff',
  },
  puesto: { color: 'rgba(255,255,255,0.9)', fontFamily: F.semi, fontSize: 13.5 },
  chipUsuario: {
    alignSelf: 'flex-start', marginTop: 4, backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.24)', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  chipUsuarioTexto: { color: '#fff', fontFamily: F.negrita, fontSize: 11.5 },
  ajusteTitulo: { fontFamily: F.negrita, fontSize: 11.5, letterSpacing: 0.6 },
  segmentos: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  segmento: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  segmentoTexto: { fontFamily: F.negrita, fontSize: 13 },
  pista: { color: 'rgba(255,255,255,0.78)', fontFamily: F.medio, fontSize: 12.5, marginTop: 12 },
  fondoHoja: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  hoja: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10 },
  agarre: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 12 },
  hojaTitulo: { fontFamily: F.titulo, fontSize: 17, marginBottom: 6 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  opcionTexto: { fontFamily: F.semi, fontSize: 15.5 },
  nombre: { color: '#fff', fontFamily: F.titulo, fontSize: 22 },
  grupo: { padding: 0, overflow: 'hidden' },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  icono: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  filaTitulo: { fontFamily: F.semi, fontSize: 14.5 },
  filaSub: { fontFamily: F.medio, fontSize: 12.5, marginTop: 2 },
});
