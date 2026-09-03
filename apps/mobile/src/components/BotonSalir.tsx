import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';

/** Boton de la cabecera para cerrar sesion (vuelve solo al login por el contexto). */
export default function BotonSalir() {
  const { signOut } = useAuth();
  return (
    <TouchableOpacity onPress={signOut} hitSlop={10}>
      <Text style={{ color: '#dc2626', fontWeight: '700', fontSize: 15 }}>Salir</Text>
    </TouchableOpacity>
  );
}
