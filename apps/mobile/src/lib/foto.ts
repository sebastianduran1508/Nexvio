import { Linking } from 'react-native';
import i18n from '../i18n';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { aviso } from '../components/Dialogo'; // 8.8: diálogos con el estilo de Nexvio
/**
 * Elegir la foto de perfil (8.7.c): cámara o galería, recorte cuadrado y, lo
 * importante, ACHICARLA antes de subir:
 *  - una foto de celular pesa 3-5 MB; achicada a 600 px en JPG queda en ~100 KB
 *    (sube rápido aunque el internet del evento sea malo, y cabe en el límite
 *    de 2 MB del backend);
 *  - las fotos HEIC de iPhone salen como JPG, que sí acepta el backend.
 * Devuelve la uri lista para subir, o null si la persona canceló.
 */
export async function elegirFoto(origen: 'camara' | 'galeria'): Promise<string | null> {
  const permiso =
    origen === 'camara'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permiso.granted) {
    aviso(
      i18n.t('dialogo.permisoTitulo'),
      origen === 'camara' ? i18n.t('dialogo.permisoCamara') : i18n.t('dialogo.permisoFotos'),
      [
        { text: i18n.t('dialogo.ahoraNo'), style: 'cancel' },
        { text: i18n.t('dialogo.abrirAjustes'), onPress: () => void Linking.openSettings() },
      ],
    );
    return null;
  }

  const opciones: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true, // el recorte cuadrado
    aspect: [1, 1],
    quality: 1, // la calidad la bajamos nosotros al achicar
  };
  const r =
    origen === 'camara'
      ? await ImagePicker.launchCameraAsync({ ...opciones, cameraType: ImagePicker.CameraType.front })
      : await ImagePicker.launchImageLibraryAsync(opciones);
  if (r.canceled || !r.assets?.[0]) return null;

  const lista = await ImageManipulator.manipulateAsync(
    r.assets[0].uri,
    [{ resize: { width: 600, height: 600 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );
  return lista.uri;
}
