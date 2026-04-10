// ════════════════════════════════════════════════════════════════════════════
// src/screens/PerfilScreen.js · Comercios Universales
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

import { AZUL, PROJECT_ID, API_KEY } from '../constants/config';
import { fsUpdate } from '../services/firestore';

// ─────────────────────────────────────────────────────────────────────────────

const rolLabel = (r) => {
  if (r === 'dueno')     return '👑 Dueño';
  if (r === 'contralor') return '🏢 Contralor';
  if (r === 'jefe')      return '👔 Jefe de Área';
  return '🗂️ Auxiliar';
};

// ─────────────────────────────────────────────────────────────────────────────

export default function PerfilScreen({
  usuario,
  diasDisponibles,
  fotoPerfil,
  misPermisos,
  temaActual,
  T,
  onFotoActualizada,
  onCerrarSesion,
  onCambiarTema,
}) {
  const [modalPassword, setModalPassword] = useState(false);
  const [passActual,    setPassActual]    = useState('');
  const [passNueva,     setPassNueva]     = useState('');
  const [passConfirm,   setPassConfirm]   = useState('');
  const [passGuardando, setPassGuardando] = useState(false);
  const [cargando,      setCargando]      = useState(false);

  // ─── Cambiar foto de perfil ───────────────────────────────────────────────
  const seleccionarFoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.3, base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const b64     = result.assets[0].base64;
        const dataUrl = `data:image/jpeg;base64,${b64}`;
        onFotoActualizada(dataUrl);
        await AsyncStorage.setItem(`foto_perfil_${usuario.id}`, dataUrl);
        setCargando(true);
        try {
          let urlGuardada = dataUrl;
          try {
            const storageUrl = `https://firebasestorage.googleapis.com/v0/b/${PROJECT_ID}.appspot.com/o/fotos%2F${usuario.id}.jpg?uploadType=media`;
            const uploadRes  = await fetch(storageUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'image/jpeg', 'Authorization': `Firebase ${API_KEY}` },
              body: Uint8Array.from(atob(b64), c => c.charCodeAt(0)),
            });
            if (uploadRes.ok)
              urlGuardada = `https://firebasestorage.googleapis.com/v0/b/${PROJECT_ID}.appspot.com/o/fotos%2F${usuario.id}.jpg?alt=media`;
          } catch (storageErr) {
            console.log('Storage no disponible:', storageErr.message);
          }
          await fsUpdate('usuarios', usuario.id, { fotoPerfil: urlGuardada });
          Alert.alert('✅', 'Foto de perfil actualizada correctamente');
        } catch (e) {
          Alert.alert('Error', 'No se pudo guardar en la nube: ' + e.message);
        }
        setCargando(false);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo cambiar la foto: ' + e.message);
    }
  };

  // ─── Cambiar contraseña ───────────────────────────────────────────────────
  const handleCambiarPassword = async () => {
    if (!passActual || !passNueva || !passConfirm) {
      Alert.alert('Error', 'Completa todos los campos'); return;
    }
    if (passActual !== usuario.password) {
      Alert.alert('Error', 'La contraseña actual es incorrecta'); return;
    }
    if (passNueva.length < 4) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 4 caracteres'); return;
    }
    if (passNueva !== passConfirm) {
      Alert.alert('Error', 'Las contraseñas nuevas no coinciden'); return;
    }
    setPassGuardando(true);
          try {
        const passNorm = String(passNueva).trim().padEnd(6, '0');
        // Actualizar en Firebase Auth
        const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: usuario.idToken, password: passNorm, returnSecureToken: true }),
        });
        const authData = await authRes.json();
        if (authData.error) throw new Error(authData.error.message);
        // Actualizar en Firestore
        await fsUpdate('usuarios', usuario.id, { password: passNueva });
        setModalPassword(false);
        setPassActual(''); setPassNueva(''); setPassConfirm('');
        Alert.alert('✅', 'Contraseña actualizada correctamente');
      } catch (e) {
        Alert.alert('Error', e.message);
      }
    setPassGuardando(false);
  };

  // ─── Datos del perfil ─────────────────────────────────────────────────────
  const items = [
    { icon: '🪪', label: 'Código de Empleado', valor: usuario.codigo },
    { icon: '📁', label: 'Departamento',        valor: usuario.departamento || 'N/A' },
    { icon: '🔑', label: 'Rol en sistema',      valor: usuario.rol || 'auxiliar' },
    { icon: '📅', label: 'Días disponibles',    valor: `${Number.isInteger(diasDisponibles) ? diasDisponibles : diasDisponibles.toFixed(1)} días` },
    { icon: '🗓️', label: 'Fecha de ingreso',    valor: usuario.fechaIngreso || 'No registrada' },
    { icon: '🔄', label: 'Última acumulación',  valor: usuario.ultimaAcumulacion || 'Pendiente' },
    { icon: '📋', label: 'Total solicitudes',   valor: String(misPermisos.length) },
    { icon: '✅', label: 'Aprobadas',           valor: String(misPermisos.filter(p => p.estado === 'Aprobado').length) },
    { icon: '❌', label: 'Rechazadas',          valor: String(misPermisos.filter(p => p.estado === 'Rechazado').length) },
  ];

  return (
    <>
      <ScrollView style={[s.content, { backgroundColor: T.fondo }]} showsVerticalScrollIndicator={false}>

        {/* ── Avatar ── */}
        <View style={s.perfilHeader}>
          <TouchableOpacity onPress={seleccionarFoto} style={{ marginBottom: 12 }}>
            {fotoPerfil
              ? <Image source={{ uri: fotoPerfil }} style={s.perfilAvatarFoto} />
              : <View style={[s.perfilAvatar, { backgroundColor: AZUL }]}>
                  <Text style={s.perfilAvatarText}>
                    {usuario.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
            }
            <View style={s.perfilCamaraBtn}>
              <Text style={{ fontSize: 14 }}>📷</Text>
            </View>
          </TouchableOpacity>
          {cargando && <ActivityIndicator color={AZUL} style={{ marginBottom: 8 }} />}
          <Text style={[s.perfilNombre, { color: T.texto }]}>{usuario.nombre}</Text>
          <Text style={[s.perfilCargo,  { color: T.subTexto }]}>{usuario.cargo}</Text>
          <View style={[s.estadoTag, { backgroundColor: '#E8F4FD', marginTop: 8 }]}>
            <Text style={[s.estadoTagText, { color: AZUL }]}>{rolLabel(usuario.rol)}</Text>
          </View>
        </View>

        {/* ── Info items ── */}
        {items.map(item => (
          <View key={item.label} style={[s.perfilItem, { backgroundColor: T.tarjeta, borderColor: T.borde }]}>
            <Text style={s.perfilItemIcon}>{item.icon}</Text>
            <View>
              <Text style={[s.perfilItemLabel, { color: T.subTexto }]}>{item.label}</Text>
              <Text style={[s.perfilItemValor, { color: T.texto }]}>{item.valor}</Text>
            </View>
          </View>
        ))}

        {/* ── Cambiar contraseña ── */}
        <TouchableOpacity
          style={[s.logoutBtn, { backgroundColor: '#EEF2FB', marginBottom: 8 }]}
          onPress={() => setModalPassword(true)}
        >
          <Text style={[s.logoutBtnText, { color: AZUL }]}>🔒 Cambiar Contraseña</Text>
        </TouchableOpacity>

        {/* ── Toggle tema ── */}
        <TouchableOpacity
          style={[s.logoutBtn, {
            backgroundColor: temaActual === 'oscuro' ? '#1a2a3a' : '#F5F7FF',
            marginBottom: 8,
            borderWidth: 1,
            borderColor: temaActual === 'oscuro' ? '#4A9EC4' : '#E8EDF5',
          }]}
          onPress={onCambiarTema}
        >
          <Text style={[s.logoutBtnText, { color: temaActual === 'oscuro' ? '#4A9EC4' : '#555' }]}>
            {temaActual === 'oscuro' ? '☀️ Cambiar a modo claro' : '🌙 Cambiar a modo oscuro'}
          </Text>
        </TouchableOpacity>

        {/* ── Cerrar sesión ── */}
        <TouchableOpacity style={s.logoutBtn} onPress={onCerrarSesion}>
          <Text style={s.logoutBtnText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── Modal cambiar contraseña ── */}
      {modalPassword && (
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: T.tarjeta }]}>
            <Text style={[s.modalTitle, { color: T.texto }]}>🔒 Cambiar Contraseña</Text>
            {[
              { label: 'Contraseña actual',  val: passActual,  set: setPassActual  },
              { label: 'Nueva contraseña',   val: passNueva,   set: setPassNueva   },
              { label: 'Confirmar contraseña', val: passConfirm, set: setPassConfirm },
            ].map(f => (
              <View key={f.label} style={{ marginBottom: 12 }}>
                <Text style={[s.formLabel, { color: T.subTexto }]}>{f.label}</Text>
                <TextInput
                  style={[s.formInput, { backgroundColor: T.inputFondo, color: T.texto, borderColor: T.borde }]}
                  secureTextEntry
                  value={f.val}
                  onChangeText={f.set}
                  placeholder={f.label}
                  placeholderTextColor={T.subTexto}
                />
              </View>
            ))}
            {passGuardando
              ? <ActivityIndicator color={AZUL} style={{ margin: 10 }} />
              : <TouchableOpacity style={s.enviarBtn} onPress={handleCambiarPassword}>
                  <Text style={s.enviarBtnText}>💾 Guardar contraseña</Text>
                </TouchableOpacity>
            }
            <TouchableOpacity
              style={[s.cancelBtn, { marginTop: 8 }]}
              onPress={() => { setModalPassword(false); setPassActual(''); setPassNueva(''); setPassConfirm(''); }}
            >
              <Text style={[s.cancelBtnText, { color: AZUL }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  content:          { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  perfilHeader:     { alignItems: 'center', marginBottom: 24 },
  perfilAvatar:     { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  perfilAvatarFoto: { width: 72, height: 72, borderRadius: 36, marginBottom: 12 },
  perfilCamaraBtn:  { position: 'absolute', bottom: 12, right: -4, backgroundColor: 'white', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E8EDF5' },
  perfilAvatarText: { color: 'white', fontSize: 26, fontWeight: '800' },
  perfilNombre:     { fontSize: 20, fontWeight: '800', color: '#1a1a2e' },
  perfilCargo:      { fontSize: 13, color: '#888', marginTop: 4 },
  estadoTag:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  estadoTagText:    { fontSize: 11, fontWeight: '700' },
  perfilItem:       { backgroundColor: 'white', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  perfilItemIcon:   { fontSize: 22 },
  perfilItemLabel:  { fontSize: 11, color: '#888' },
  perfilItemValor:  { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginTop: 2 },
  logoutBtn:        { backgroundColor: '#FEECEC', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  logoutBtnText:    { color: '#EF5350', fontWeight: '700', fontSize: 15 },
  // Modal
  modalOverlay:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 999 },
  modalCard:        { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle:       { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  formLabel:        { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 8 },
  formInput:        { backgroundColor: 'white', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 4, borderWidth: 1, borderColor: '#E8EDF5' },
  enviarBtn:        { backgroundColor: AZUL, borderRadius: 14, padding: 16, alignItems: 'center' },
  enviarBtnText:    { color: 'white', fontWeight: '700', fontSize: 16 },
  cancelBtn:        { backgroundColor: '#EEF2FB', borderRadius: 14, padding: 16, alignItems: 'center' },
  cancelBtnText:    { color: AZUL, fontWeight: '700', fontSize: 14 },
});
