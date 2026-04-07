// ════════════════════════════════════════════════════════════════════════════
// AdminUserModal.js — Modal para crear/editar usuarios en el PanelAdmin
// ════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal, Image } from 'react-native';
import config from './constantsconfig'; // Importar la configuración centralizada

const AZUL = '#2C4A8C';

export default function AdminUserModal({ u, onClose, onSaved }) {
  const esNuevo = !u.id;

  const [form, setForm] = useState({
    codigo: u.codigo ?? '', nombre: u.nombre ?? '', cargo: u.cargo ?? '',
    departamento: u.departamento ?? '', rol: u.rol ?? 'auxiliar',
    password: u.password ?? '', dias: u.dias ?? '15', fechaIngreso: u.fechaIngreso ?? '',
    correoPersonal: u.correoPersonal ?? '',
  });
  const [guardando, setGuardando] = useState(false);
  const ROLES = ['auxiliar','jefe','contralor','dueno'];

  const guardar = async () => {
    if (!form.codigo || !form.nombre) { Alert.alert('Error', 'Código y nombre son requeridos'); return; }
    setGuardando(true);
    try {
      const formFinal = { ...form };
      // Contraseñas en texto plano — sin hash (Firebase Auth se encarga de esto)
      const fields = {}; for (const k in formFinal) fields[k] = { stringValue: String(formFinal[k]) };

      if (u.id) {
        const mask = Object.keys(formFinal).map(k=>`updateMask.fieldPaths=${k}`).join('&');
        await fetch(`${config.DB_URL}/usuarios/${u.id}?${mask}&key=${config.FIREBASE_API_KEY}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ fields }) });
      } else {
        // Para nuevos usuarios, también se debe crear en Firebase Authentication
        const authRes = await fetch(config.AUTH_SIGNUP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: `${form.codigo.toLowerCase().trim()}@comercios.app`, password: form.password || form.codigo, returnSecureToken: true })
        });
        const authData = await authRes.json();
        if (authData.error) throw new Error('Error en Auth: ' + authData.error.message);

        // Guardar en Firestore con el UID de Auth
        await fetch(`${config.DB_URL}/usuarios/${authData.localId}?key=${config.FIREBASE_API_KEY}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ fields: { ...fields, uid: { stringValue: authData.localId } } }) });
      }
      Alert.alert('✅', esNuevo ? 'Usuario creado' : 'Usuario actualizado');
      onSaved();
    } catch(e) { Alert.alert('Error', e.message); }
    setGuardando(false);
  };

  return (
    <Modal visible={true} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitulo}>{esNuevo ? '➕ Nuevo Usuario' : '✏️ Editar Usuario'}</Text>
          {u.fotoPerfil && (
            <View style={styles.avatarContainer}>
              <Image source={{ uri: u.fotoPerfil }} style={styles.avatarImage} />
              <Text style={styles.avatarText}>Foto subida por el empleado</Text>
            </View>
          )}
          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { key:'codigo', label:'Código', kb:'default' },
              { key:'nombre', label:'Nombre completo', kb:'default' },
              { key:'cargo', label:'Cargo', kb:'default' },
              { key:'departamento', label:'Departamento', kb:'default' },
              { key:'correoPersonal', label:'📧 Correo (Opcional)', kb:'email-address' },
              { key:'password', label:'Contraseña', kb:'default', secure: true },
              { key:'dias', label:'Días disponibles', kb:'numeric' },
              { key:'fechaIngreso', label:'Fecha ingreso (DD/MM/AAAA)', kb:'default' }
            ].map(f => (
              <View key={f.key} style={styles.formGroup}>
                <Text style={styles.formLabel}>{f.label}</Text>
                <TextInput style={styles.formInput} value={form[f.key]} keyboardType={f.kb} onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))} placeholder={f.label} placeholderTextColor="#aaa" secureTextEntry={f.secure} />
              </View>
            ))}

            <Text style={styles.formLabel}>Rol</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rolesScroll}>
              {ROLES.map(r => (
                <TouchableOpacity key={r} style={[styles.roleButton, form.rol===r && styles.roleButtonActive]} onPress={() => setForm(p => ({ ...p, rol: r }))}>
                  <Text style={[styles.roleButtonText, form.rol===r && styles.roleButtonTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {guardando ? <ActivityIndicator color={AZUL} /> : <TouchableOpacity style={styles.saveButton} onPress={guardar}><Text style={styles.saveButtonText}>💾 {esNuevo ? 'Crear usuario' : 'Guardar cambios'}</Text></TouchableOpacity>}
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}><Text style={styles.cancelButtonText}>Cancelar</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: AZUL,
  },
  avatarText: {
    color: '#888',
    fontSize: 11,
    marginTop: 6,
  },
  formGroup: {
    marginBottom: 10,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#F5F7FF',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  rolesScroll: {
    marginBottom: 16,
  },
  roleButton: {
    backgroundColor: '#EEF2FB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  roleButtonActive: {
    backgroundColor: AZUL,
  },
  roleButtonText: {
    color: '#555',
    fontWeight: '600',
    fontSize: 12,
  },
  roleButtonTextActive: {
    color: 'white',
  },
  saveButton: {
    backgroundColor: AZUL,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#EEF2FB',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: AZUL,
    fontWeight: '700',
  },
});