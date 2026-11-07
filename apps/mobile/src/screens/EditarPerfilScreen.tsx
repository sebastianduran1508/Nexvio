import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import { PAISES } from '../lib/paises';
import type { Perfil } from '../lib/tipos';
import { Boton, Cabecera, Cargando, Tarjeta, TituloSeccion, bandera } from '../components/ui';
import { F, useTema } from '../tema/tema';
import type { PerfilStackParamList } from '../navigation/PerfilStack';

import { useTranslation } from 'react-i18next';
import { avisoError } from '../components/Dialogo'; // 8.8: diálogos con el estilo de Nexvio
type Props = NativeStackScreenProps<PerfilStackParamList, 'EditarPerfil'>;

/**
 * Cómo se pinta cada campo editable. El backend dice CUÁLES son (`editables`);
 * aquí solo se dice CÓMO se ven. Si el cliente pide un campo nuevo, se agrega
 * en el backend (CAMPOS_EDITABLES) y aquí su etiqueta.
 * `pais` y `pais_codigo` se editan juntos con el selector de país.
 */
const CAMPOS: Record<
  string,
  {
    etiqueta: string;
    placeholder: string;
    icono: React.ComponentProps<typeof Ionicons>['name'];
    teclado?: 'phone-pad' | 'number-pad' | 'email-address' | 'url';
    max: number;
    multilinea?: boolean;
    ayuda?: string;
  }
> = {
  cargo: { etiqueta: 'Cargo', placeholder: 'Ej. Médica internista', icono: 'briefcase-outline', max: 120 },
  empresa: { etiqueta: 'Empresa o institución', placeholder: 'Ej. Clínica del Norte', icono: 'business-outline', max: 120 },
  descripcion: {
    etiqueta: 'Sobre ti',
    placeholder: 'Cuéntales a los demás qué haces, en qué eres experto, qué te apasiona o con quién te gustaría conectar…',
    icono: 'chatbubble-ellipses-outline',
    max: 500,
    multilinea: true,
    ayuda: 'Es lo primero que leerán en el networking. ¡Hazlo con tu estilo!',
  },
  anio_nacimiento: {
    etiqueta: 'Año de nacimiento (opcional)',
    placeholder: 'Ej. 1992',
    icono: 'gift-outline',
    teclado: 'number-pad',
    max: 4,
    ayuda: 'Solo mostramos tu edad, nunca el año. Déjalo vacío si no quieres que se vea.',
  },
  telefono: { etiqueta: 'Teléfono', placeholder: 'Ej. +57 300 123 4567', icono: 'call-outline', teclado: 'phone-pad', max: 20, ayuda: 'Solo lo ven tus conexiones, y si activas "Compartir mi contacto".' },
  // 8.7.d: contacto para las conexiones (sección propia, con su interruptor).
  contacto_email: { etiqueta: 'Correo de contacto', placeholder: 'tu@correo.com', icono: 'mail-outline', teclado: 'email-address', max: 120 },
  linkedin_url: { etiqueta: 'LinkedIn', placeholder: 'https://www.linkedin.com/in/tu-perfil', icono: 'logo-linkedin', teclado: 'url', max: 200 },
};

/** Los campos que van en la sección "Contacto para tus conexiones"... */
const DE_CONTACTO = ['telefono', 'contacto_email', 'linkedin_url'];

/** 8.8: los campos que tienen textos en el diccionario (editarPerfil.campos.<campo>). */
type CampoTexto = 'cargo' | 'empresa' | 'descripcion' | 'anio_nacimiento' | 'telefono' | 'contacto_email' | 'linkedin_url';
/** ...y el interruptor individual de cada uno (consentimiento granular). */
const INTERRUPTOR: Record<string, 'compartir_telefono' | 'compartir_correo' | 'compartir_linkedin'> = {
  telefono: 'compartir_telefono',
  contacto_email: 'compartir_correo',
  linkedin_url: 'compartir_linkedin',
};

/** El orden en que se ven los campos (los que no estén aquí van al final). */
const ORDEN = ['cargo', 'empresa', 'descripcion', 'anio_nacimiento', 'telefono', 'contacto_email', 'linkedin_url'];

/**
 * MIS DATOS (8.7.c) — ver y corregir el propio perfil.
 *
 * Arriba, lo que NO se puede cambiar (nombre, documento, usuario): viene del
 * Excel de la organización y es su identidad; si está mal, se le pide al
 * organizador. Abajo, lo que sí: cargo, empresa, teléfono y país. Es el
 * derecho a ACTUALIZAR y RECTIFICAR de la Ley 1581.
 */
export default function EditarPerfilScreen({ navigation }: Props) {
  const t = useTema();
  const { t: tr } = useTranslation(); // 8.8
  const insets = useSafeAreaInsets();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [elegirPais, setElegirPais] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    api<Perfil>('GET', '/perfil')
      .then((p) => {
        setPerfil(p);
        setForm(valoresDe(p));
      })
      .catch((e) => setMensaje({ ok: false, texto: e?.message ?? tr('editarPerfil.errorCarga') }));
  }, []);

  const cambios = useMemo(
    () => !!perfil && Object.entries(valoresDe(perfil)).some(([k, v]) => (form[k] ?? '') !== v),
    [perfil, form],
  );

  async function guardar() {
    setMensaje(null);
    setGuardando(true);
    try {
      const anio = (form.anio_nacimiento ?? '').trim();
      if (anio && !/^\d{4}$/.test(anio)) {
        setMensaje({ ok: false, texto: tr('editarPerfil.anioInvalido') });
        return;
      }
      const cuerpo: Record<string, string | number | null> = Object.fromEntries(
        Object.entries(form).filter(([k]) => perfil?.editables.includes(k)),
      );
      // El año viaja como número (o null para quitarlo).
      if ('anio_nacimiento' in cuerpo) cuerpo.anio_nacimiento = anio ? Number(anio) : null;
      const p = await api<Perfil>('PATCH', '/perfil', cuerpo);
      setPerfil(p);
      setForm(valoresDe(p));
      setMensaje({ ok: true, texto: tr('editarPerfil.listo') });
    } catch (e: any) {
      setMensaje({ ok: false, texto: e?.message ?? tr('editarPerfil.noGuardar') });
    } finally {
      setGuardando(false);
    }
  }

  if (!perfil) {
    return (
      <View style={{ flex: 1, backgroundColor: t.fondo }}>
        <Cabecera compacta titulo={tr('editarPerfil.titulo')} onAtras={() => navigation.goBack()} />
        {mensaje ? <Text style={[est.errorSolo, { color: t.rojo }]}>{mensaje.texto}</Text> : <Cargando />}
      </View>
    );
  }

  const campoEstilo = [est.input, { backgroundColor: t.input, borderColor: t.borde, color: t.texto }];
  const ordenados = perfil.editables
    .filter((c) => CAMPOS[c])
    .sort((a, b) => (ORDEN.indexOf(a) + 99) % 99 - (ORDEN.indexOf(b) + 99) % 99);
  const editables = ordenados.filter((c) => !DE_CONTACTO.includes(c));
  const deContacto = ordenados.filter((c) => DE_CONTACTO.includes(c));

  /** Un campo del formulario (se usa en las dos tarjetas). */
  const pintarCampo = (c: string) => {
    const cfg = CAMPOS[c];
    // 8.8: la etiqueta, el ejemplo y la ayuda salen del diccionario, en el idioma activo
    const id = c as CampoTexto;
    const ayuda = tr(`editarPerfil.campos.${id}.ayuda`);
    return (
      <View key={c} style={{ marginBottom: 14 }}>
        <View style={est.labelFila}>
          <Text style={[est.label, { color: t.textoSuave }]}>{tr(`editarPerfil.campos.${id}.etiqueta`)}</Text>
          {cfg.multilinea ? (
            <Text style={[est.contador, { color: (form[c] ?? '').length > cfg.max * 0.9 ? t.coral : t.textoTenue }]}>
              {(form[c] ?? '').length}/{cfg.max}
            </Text>
          ) : null}
        </View>
        <View>
          <Ionicons name={cfg.icono} size={18} color={t.textoTenue} style={est.iconoCampo} />
          <TextInput
            style={[campoEstilo, { paddingLeft: 42 }, cfg.multilinea && est.area]}
            value={form[c] ?? ''}
            onChangeText={(v) => setForm((f) => ({ ...f, [c]: c === 'anio_nacimiento' ? v.replace(/\D/g, '') : v }))}
            placeholder={tr(`editarPerfil.campos.${id}.placeholder`)}
            placeholderTextColor={t.textoTenue}
            keyboardType={cfg.teclado ?? 'default'}
            autoCapitalize={cfg.teclado === 'email-address' || cfg.teclado === 'url' ? 'none' : 'sentences'}
            autoCorrect={!(cfg.teclado === 'email-address' || cfg.teclado === 'url')}
            maxLength={cfg.max}
            multiline={cfg.multilinea}
          />
        </View>
        {ayuda ? <Text style={[est.ayuda, { color: t.textoTenue }]}>{ayuda}</Text> : null}
      </View>
    );
  };

  /**
   * 8.7.d: los interruptores se guardan al instante (como "Aparecer en
   * networking"). `clave` es el principal o el de un dato. Al ENCENDER el
   * principal, se encienden también los tres datos (así lo pidió Sebastián):
   * luego cada quien apaga los que no quiera.
   */
  async function cambiarCompartir(
    clave: 'compartir_contacto' | 'compartir_telefono' | 'compartir_correo' | 'compartir_linkedin',
    v: boolean,
  ) {
    const antes = perfil;
    const cambios: Partial<Perfil> =
      clave === 'compartir_contacto' && v
        ? { compartir_contacto: true, compartir_telefono: true, compartir_correo: true, compartir_linkedin: true }
        : { [clave]: v };
    setPerfil((p) => (p ? { ...p, ...cambios } : p));
    try {
      const p = await api<Perfil>('PATCH', '/perfil', cambios);
      setPerfil(p);
    } catch (e: any) {
      setPerfil(antes);
      avisoError(tr('editarPerfil.noCambiar'), e?.message ?? tr('comun.intentaDeNuevo'));
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.fondo }} behavior="padding">
      <Cabecera compacta titulo={tr('editarPerfil.titulo')} onAtras={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
        {/* ---------- Lo que no se puede cambiar ---------- */}
        <TituloSeccion texto={tr('editarPerfil.tuIdentidad')} />
        <Tarjeta style={{ gap: 12 }}>
          <Dato etiqueta={tr('editarPerfil.nombre')} valor={[perfil.nombre, perfil.apellidos].filter(Boolean).join(' ')} />
          {perfil.numero_documento ? (
            <Dato etiqueta={tr('editarPerfil.documento')} valor={`${perfil.tipo_documento ?? ''} ${perfil.numero_documento}`.trim()} />
          ) : null}
          {perfil.username ? <Dato etiqueta={tr('editarPerfil.usuario')} valor={`@${perfil.username}`} /> : null}
          <View style={[est.nota, { backgroundColor: t.primarioSuave }]}>
            <Ionicons name="lock-closed" size={14} color={t.primarioTexto} />
            <Text style={[est.notaTexto, { color: t.primarioTexto }]}>
              {tr('editarPerfil.registro')}
            </Text>
          </View>
        </Tarjeta>

        {/* ---------- Lo que sí ---------- */}
        <TituloSeccion texto={tr('editarPerfil.perfilProfesional')} />
        <Tarjeta>
          {editables.map(pintarCampo)}

          {perfil.editables.includes('pais_codigo') && (
            <View>
              <Text style={[est.label, { color: t.textoSuave }]}>{tr('editarPerfil.pais')}</Text>
              <TouchableOpacity style={[campoEstilo, est.selector]} onPress={() => setElegirPais(true)} activeOpacity={0.8}>
                <Text style={{ fontSize: 20 }}>{form.pais_codigo ? bandera(form.pais_codigo) : '🌎'}</Text>
                <Text style={[est.selectorTexto, { color: form.pais ? t.texto : t.textoTenue }]}>
                  {form.pais || tr('editarPerfil.eligePais')}
                </Text>
                <Ionicons name="chevron-down" size={18} color={t.textoTenue} />
              </TouchableOpacity>
            </View>
          )}
        </Tarjeta>

        {/* ---------- Contacto para las conexiones (8.7.d) ---------- */}
        {deContacto.length > 0 && (
          <>
            <TituloSeccion texto={tr('editarPerfil.contactoConexiones')} />
            <Tarjeta>
              <View style={est.interruptor}>
                <View style={{ flex: 1 }}>
                  <Text style={[est.interruptorTitulo, { color: t.texto }]}>{tr('editarPerfil.compartir')}</Text>
                  <Text style={[est.ayuda, { color: t.textoTenue, marginTop: 2 }]}>
                    {tr('editarPerfil.compartirAyuda')}
                  </Text>
                </View>
                <Switch
                  value={!!perfil.compartir_contacto}
                  onValueChange={(v) => cambiarCompartir('compartir_contacto', v)}
                  trackColor={{ true: t.primario, false: t.borde }}
                  thumbColor="#fff"
                />
              </View>
              <View style={{ height: 1, backgroundColor: t.borde, marginVertical: 14 }} />
              {deContacto.map((c) => {
                const k = INTERRUPTOR[c];
                const activo = perfil.compartir_contacto && perfil[k];
                return (
                  <View key={c} style={{ marginBottom: 6 }}>
                    <View style={{ opacity: activo ? 1 : 0.6 }}>{pintarCampo(c)}</View>
                    <View style={[est.datoContacto, { backgroundColor: activo ? t.verdeSuave : t.barraFondo }]}>
                      <Ionicons name={activo ? 'eye' : 'eye-off'} size={15} color={activo ? t.verde : t.textoTenue} />
                      <Text style={[est.datoContactoTexto, { color: activo ? t.verde : t.textoTenue }]}>
                        {activo ? tr('editarPerfil.loVeran') : tr('editarPerfil.noSeComparte')}
                      </Text>
                      <Switch
                        value={!!perfil[k]}
                        onValueChange={(v) => cambiarCompartir(k, v)}
                        disabled={!perfil.compartir_contacto}
                        trackColor={{ true: t.verde, false: t.borde }}
                        thumbColor="#fff"
                      />
                    </View>
                  </View>
                );
              })}
            </Tarjeta>
          </>
        )}

        {mensaje && (
          <View style={[est.mensaje, { backgroundColor: mensaje.ok ? t.verdeSuave : t.rojoSuave }]}>
            <Ionicons name={mensaje.ok ? 'checkmark-circle' : 'alert-circle-outline'} size={17} color={mensaje.ok ? t.verde : t.rojo} />
            <Text style={[est.mensajeTexto, { color: mensaje.ok ? t.verde : t.rojo }]}>{mensaje.texto}</Text>
          </View>
        )}

        <Boton
          texto={tr('editarPerfil.guardar')}
          icono="checkmark"
          onPress={() => (cambios ? void guardar() : undefined)}
          cargando={guardando}
          style={{ marginTop: 20, opacity: cambios ? 1 : 0.5 }}
        />
        <Text style={[est.pie, { color: t.textoTenue }]}>
          {tr('editarPerfil.pie')}
        </Text>
      </ScrollView>

      <SelectorPais
        visible={elegirPais}
        actual={form.pais_codigo}
        alCerrar={() => setElegirPais(false)}
        alElegir={(p) => {
          setForm((f) => ({ ...f, pais: p?.nombre ?? '', pais_codigo: p?.codigo ?? '' }));
          setElegirPais(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

/** Los valores del formulario, como texto ('' = vacío). */
function valoresDe(p: Perfil): Record<string, string> {
  const v: Record<string, string> = {};
  for (const c of p.editables) {
    const valor = (p as any)[c];
    v[c] = valor === null || valor === undefined ? '' : String(valor);
  }
  return v;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const t = useTema();
  const { t: tr } = useTranslation(); // 8.8
  return (
    <View>
      <Text style={[est.datoEtiqueta, { color: t.textoTenue }]}>{etiqueta}</Text>
      <Text style={[est.datoValor, { color: t.texto }]}>{valor}</Text>
    </View>
  );
}

/** Lista de países con buscador (ignora tildes). */
function SelectorPais({
  visible,
  actual,
  alCerrar,
  alElegir,
}: {
  visible: boolean;
  actual?: string;
  alCerrar: () => void;
  alElegir: (p: { codigo: string; nombre: string } | null) => void;
}) {
  const t = useTema();
  const { t: tr } = useTranslation(); // 8.8
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const normal = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const lista = PAISES.filter((p) => normal(p.nombre).includes(normal(q.trim())));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={alCerrar}>
      <View style={{ flex: 1, backgroundColor: t.tarjeta, paddingTop: insets.top }}>
        <View style={[est.modalCabecera, { borderColor: t.borde }]}>
          <Text style={[est.modalTitulo, { color: t.texto }]}>{tr('editarPerfil.eligePais')}</Text>
          <TouchableOpacity onPress={alCerrar} hitSlop={10} accessibilityLabel={tr('comun.cerrar')}>
            <Ionicons name="close" size={26} color={t.texto} />
          </TouchableOpacity>
        </View>
        <View style={{ padding: 16 }}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={tr('editarPerfil.buscarPais')}
            placeholderTextColor={t.textoTenue}
            style={[est.input, { backgroundColor: t.input, borderColor: t.borde, color: t.texto }]}
            autoCorrect={false}
          />
        </View>
        <FlatList
          data={lista}
          keyExtractor={(p) => p.codigo}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          ListFooterComponent={
            actual ? (
              <TouchableOpacity style={est.paisFila} onPress={() => alElegir(null)}>
                <Text style={[est.paisNombre, { color: t.rojo }]}>{tr('editarPerfil.quitarPais')}</Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={est.paisFila} onPress={() => alElegir(item)}>
              <Text style={{ fontSize: 22 }}>{bandera(item.codigo)}</Text>
              <Text style={[est.paisNombre, { color: t.texto }]}>{item.nombre}</Text>
              {item.codigo === actual && <Ionicons name="checkmark" size={20} color={t.primarioTexto} />}
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

const est = StyleSheet.create({
  errorSolo: { padding: 24, fontFamily: F.medio, textAlign: 'center' },
  datoEtiqueta: { fontFamily: F.medio, fontSize: 12 },
  datoValor: { fontFamily: F.semi, fontSize: 15, marginTop: 1 },
  nota: { flexDirection: 'row', gap: 8, borderRadius: 12, padding: 11, alignItems: 'flex-start' },
  notaTexto: { flex: 1, fontFamily: F.medio, fontSize: 12.5, lineHeight: 17.5 },
  label: { fontFamily: F.semi, fontSize: 13, marginBottom: 7 },
  labelFila: { flexDirection: 'row', justifyContent: 'space-between' },
  contador: { fontFamily: F.medio, fontSize: 12 },
  area: { minHeight: 120, textAlignVertical: 'top', paddingTop: 13, lineHeight: 21 },
  ayuda: { fontFamily: F.normal, fontSize: 12, marginTop: 6 },
  interruptor: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  interruptorTitulo: { fontFamily: F.semi, fontSize: 15 },
  // Debajo de cada dato de contacto: "👁 Lo verán tus conexiones ..... [o ]".
  datoContacto: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingLeft: 12, paddingRight: 4, paddingVertical: 2, marginTop: -6, marginBottom: 10 },
  datoContactoTexto: { flex: 1, fontFamily: F.medio, fontSize: 12.5 },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 13, fontSize: 15, fontFamily: F.medio },
  iconoCampo: { position: 'absolute', left: 14, top: 15, zIndex: 1 },
  selector: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectorTexto: { flex: 1, fontFamily: F.medio, fontSize: 15 },
  mensaje: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12, marginTop: 16 },
  mensajeTexto: { flex: 1, fontFamily: F.medio, fontSize: 13 },
  pie: { fontFamily: F.normal, fontSize: 12, textAlign: 'center', marginTop: 12 },
  modalCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitulo: { fontFamily: F.titulo, fontSize: 19 },
  paisFila: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 13 },
  paisNombre: { flex: 1, fontFamily: F.medio, fontSize: 15.5 },
});
