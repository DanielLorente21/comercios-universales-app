// ════════════════════════════════════════════════════════════════════════════
// src/screens/LoginScreen.js · Comercios Universales
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LogoAnimado from '../components/LogoAnimado';
import { AZUL } from '../constants/config';
import { codeToEmail, normalizarPass, guardarSesion } from '../services/auth';
import { buscarUsuario } from '../services/firestore';
import { registrarPushToken } from '../services/notifications';
import { AUTH_URL } from '../constants/config';
import { fsGet } from '../services/firestore';

// ─────────────────────────────────────────────────────────────────────────────

export default function LoginScreen({ onLoginExitoso, onSuperAdmin }) {
  const [codigo,        setCodigo]        = useState('');
  const [password,      setPassword]      = useState('');
  const [loginCargando, setLoginCargando] = useState(false);

  const handleLogin = async () => {
    if (!codigo || !password) {
      alert('Ingresa tu código y contraseña');
      return;
    }
    setLoginCargando(true);
    try {
      // PASO 1: Autenticar con Firebase Auth REST API
      const authRes = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: codeToEmail(codigo),
          password: normalizarPass(password),
          returnSecureToken: true,
        }),
      });
      const authData = await authRes.json();

      if (authData.error) {
        const msg =
          authData.error.message === 'INVALID_PASSWORD' ||
          authData.error.message === 'EMAIL_NOT_FOUND'
            ? 'Código o contraseña incorrectos'
            : 'Error de autenticación';
        alert(msg);
        setLoginCargando(false);
        return;
      }

      // PASO 2: Obtener datos del perfil desde Firestore
      const u = await buscarUsuario(codigo.toUpperCase().trim());
      if (!u) {
        alert('Perfil de empleado no encontrado en la base de datos');
        setLoginCargando(false);
        return;
      }

      u.idToken = authData.idToken;

      // Solo cargamos lista de usuarios si el rol es administrativo
      let todosUsuarios = [];
      if (u.rol !== 'auxiliar') {
        todosUsuarios = await fsGet('usuarios');
      }

      registrarPushToken(u.id); // sin await — no bloquea el login

      // Guardar sesión
      try {
        await guardarSesion(u);
        const fotoCloud = u.fotoPerfil;
        if (fotoCloud) {
          await AsyncStorage.setItem(`foto_perfil_${u.id}`, fotoCloud);
        } else {
          const fotoLocal = await AsyncStorage.getItem(`foto_perfil_${u.id}`);
          u._fotoLocal = fotoLocal ?? null;
        }
      } catch (storageErr) {
        console.warn('Storage error (no crítico):', storageErr?.message);
      }

      // Notificar al padre (App.js) con los datos del usuario
      onLoginExitoso(u, todosUsuarios);
    } catch (e) {
      alert(`${e?.message ?? String(e)}`);
    }
    setLoginCargando(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AZUL }}>
      <StatusBar barStyle="light-content" backgroundColor={AZUL} />

      {/* ── Parte superior: logo y nombre ── */}
      <View style={s.loginTop}>
        <LogoAnimado />
        <Text style={s.loginAppName}>{'comercios\nuniversales'}</Text>
      </View>

      {/* ── Tarjeta blanca con el formulario ── */}
      <View style={s.loginCard}>
        <Text style={s.loginTitle}>Bienvenido</Text>
        <Text style={s.loginSub}>Ingresa con tu código de empleado</Text>

        <Text style={s.loginLabel}>Código de Empleado</Text>
        <TextInput
          style={s.loginInput}
          placeholder="Ingresa tu código de empleado"
          value={codigo}
          onChangeText={setCodigo}
          autoCapitalize="characters"
          placeholderTextColor="#aaa"
        />

        <Text style={s.loginLabel}>Contraseña</Text>
        <TextInput
          style={s.loginInput}
          placeholder="Ingresa tu contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#aaa"
        />

        {loginCargando ? (
          <ActivityIndicator color={AZUL} style={{ marginTop: 20 }} />
        ) : (
          <TouchableOpacity style={s.loginBtn} onPress={handleLogin}>
            <Text style={s.loginBtnText}>Ingresar →</Text>
          </TouchableOpacity>
        )}

        <Text style={{ color: '#aaa', fontSize: 12, textAlign: 'center', marginTop: 15 }}>
          Olvidaste tu contraseña? Contacta a tu administrador.
        </Text>

        {/* Acceso oculto a SuperAdmin */}
        <TouchableOpacity
          onPress={onSuperAdmin}
          style={{ alignItems: 'center', marginTop: 16, marginBottom: 4 }}
        >
          <Text style={{ color: '#ccc', fontSize: 11 }}>⚙️ administrador del sistema</Text>
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <Text style={{ color: '#ddd', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
            Desarrollado por
          </Text>
          <Text style={{ color: AZUL, fontSize: 13, fontWeight: '700', marginTop: 3, letterSpacing: 1 }}>
            ✦ Daniel Lorente ✦
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  loginTop: {
    alignItems:    'center',
    paddingTop:    50,
    paddingBottom: 30,
  },
  loginAppName: {
    color:      'white',
    fontSize:   20,
    fontWeight: '800',
    textAlign:  'center',
    lineHeight: 26,
  },
  loginCard: {
    flex:                1,
    backgroundColor:     'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding:             28,
  },
  loginTitle: {
    fontSize:     24,
    fontWeight:   '800',
    color:        '#1a1a2e',
    marginBottom: 4,
  },
  loginSub: {
    fontSize:     13,
    color:        '#888',
    marginBottom: 24,
  },
  loginLabel: {
    fontSize:     13,
    fontWeight:   '600',
    color:        '#444',
    marginBottom: 6,
  },
  loginInput: {
    backgroundColor: '#F5F7FF',
    borderRadius:    12,
    padding:         14,
    fontSize:        15,
    marginBottom:    16,
    borderWidth:     1,
    borderColor:     '#E8EDF5',
  },
  loginBtn: {
    backgroundColor: AZUL,
    borderRadius:    14,
    padding:         16,
    alignItems:      'center',
    marginTop:       4,
  },
  loginBtnText: {
    color:      'white',
    fontWeight: '700',
    fontSize:   16,
  },
});
