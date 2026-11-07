import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

/** Boton de la cabecera para cerrar sesion (vuelve solo al login por el contexto). */
export default function BotonSalir() {
  const { signOut } = useAuth();
  const { t: tr } = useTranslation();
  return (
    <TouchableOpacity onPress={signOut} hitSlop={10}>
      <Text style={{ color: '#dc2626', fontWeight: '700', fontSize: 15 }}>{tr('primerIngreso.salir')}</Text>
    </TouchableOpacity>
  );
}
