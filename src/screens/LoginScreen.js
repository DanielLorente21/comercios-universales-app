// ════════════════════════════════════════════════════════════════════════════
// src/screens/LoginScreen.js · Comercios Universales
// Compatible con APK (Android) y Web (Firebase Hosting)
// ════════════════════════════════════════════════════════════════════════════

import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView,
  StatusBar, Animated, ScrollView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LogoAnimado from '../components/LogoAnimado';
import { codeToEmail, normalizarPass, guardarSesion } from '../services/auth';
import { buscarUsuario, fsGet } from '../services/firestore';
import { registrarPushToken } from '../services/notifications';
import { AUTH_URL } from '../constants/config';

const IS_WEB = Platform.OS === 'web';

// ─────────────────────────────────────────────────────────────────────────────

export default function LoginScreen({ onLoginExitoso, onSuperAdmin }) {
  const [codigo,        setCodigo]        = useState('');
  const [password,      setPassword]      = useState('');
  const [loginCargando, setLoginCargando] = useState(false);

  // ── Doble tap en el logo → SuperAdmin ──
  const lastTap   = useRef(null);
  const logoScale = useRef(new Animated.Value(1)).current;

  const handleLogoTap = () => {
    const now = Date.now();
    Animated.sequence([
      Animated.timing(logoScale, { toValue: 0.87, duration: 90, useNativeDriver: !IS_WEB }),
      Animated.spring(logoScale,  { toValue: 1,   friction: 4,  useNativeDriver: !IS_WEB }),
    ]).start();

    if (lastTap.current && (now - lastTap.current) < 400) {
      lastTap.current = null;
      onSuperAdmin();
    } else {
      lastTap.current = now;
    }
  };

  const handleLogin = async () => {
    if (!codigo || !password) {
      alert('Ingresa tu código y contraseña');
      return;
    }
    setLoginCargando(true);
    try {
      const authRes = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:             codeToEmail(codigo),
          password:          normalizarPass(password),
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

      const u = await buscarUsuario(codigo.toUpperCase().trim());
      if (!u) {
        alert('Perfil de empleado no encontrado en la base de datos');
        setLoginCargando(false);
        return;
      }

      u.idToken = authData.idToken;

      let todosUsuarios = [];
      if (u.rol !== 'auxiliar') {
        todosUsuarios = await fsGet('usuarios');
      }

      registrarPushToken(u.id);

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

      onLoginExitoso(u, todosUsuarios);
    } catch (e) {
      alert(`${e?.message ?? String(e)}`);
    }
    setLoginCargando(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root}>
      {!IS_WEB && (
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      )}

      {/* Luces de fondo */}
      <View style={s.glowTL} pointerEvents="none" />
      <View style={s.glowBR} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.container}>

          {/*
            ── Logo flotante ──
            Está FUERA de la tarjeta y con zIndex alto para que no se corte
            en web. El marginBottom negativo lo superpone sobre la tarjeta.
          */}
          <TouchableOpacity
            onPress={handleLogoTap}
            activeOpacity={1}
            style={s.logoWrapper}
          >
            <Animated.View style={[s.logoCircle, { transform: [{ scale: logoScale }] }]}>
              <LogoAnimado />
            </Animated.View>
          </TouchableOpacity>

          {/* ── Tarjeta glassmorphism ── */}
          <View style={s.card}>

            <Text style={s.title}>Bienvenido</Text>
            <Text style={s.sub}>Comercios Universales | Permisos</Text>

            <Text style={s.label}>Código de Empleado</Text>
            <TextInput
              style={s.input}
              placeholder="Ej: 1046"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={codigo}
              onChangeText={setCodigo}
              autoCapitalize="characters"
            />

            <Text style={s.label}>Contraseña</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {loginCargando ? (
              <ActivityIndicator color="#fff" style={{ marginTop: 18 }} />
            ) : (
              <TouchableOpacity style={s.btn} onPress={handleLogin} activeOpacity={0.85}>
                <Text style={s.btnText}>Entrar al Sistema</Text>
              </TouchableOpacity>
            )}

            {/* Texto plano — sin vínculo */}
            <Text style={s.footerText}>
              ¿Olvidaste tu acceso? Contacta a tu administrador.
            </Text>

          </View>

          {/* ── Créditos ── */}
          <View style={s.credits}>
            <Text style={s.creditsTop}>Desarrollado por</Text>
            <Text style={s.creditsName}>✦ Daniel Lorente ✦</Text>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: '#0f172a',
    ...(IS_WEB && { minHeight: '100vh' }),
  },

  glowTL: {
    position:        'absolute',
    width:           380,
    height:          380,
    borderRadius:    190,
    backgroundColor: 'rgba(99,102,241,0.18)',
    top:  -80,
    left: -80,
  },
  glowBR: {
    position:        'absolute',
    width:           380,
    height:          380,
    borderRadius:    190,
    backgroundColor: 'rgba(168,85,247,0.18)',
    bottom: -80,
    right:  -80,
  },

  scroll: {
    flexGrow:          1,
    justifyContent:    'center',
    alignItems:        'center',
    paddingVertical:   48,
    paddingHorizontal: IS_WEB ? 0 : 20,
  },

  // Contenedor máximo 400px — igual que el HTML
  container: {
    width:      IS_WEB ? 400 : '100%',
    maxWidth:   400,
    alignSelf:  'center',
    alignItems: 'center',
  },

  // ── Wrapper del logo: está fuera de la tarjeta, con overflow visible ──
  logoWrapper: {
    zIndex:       20,
    marginBottom: -52,   // se monta sobre la tarjeta
    alignSelf:    'center',
  },

  logoCircle: {
    width:           128,
    height:          128,
    borderRadius:    64,
    backgroundColor: 'white',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         10,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 10 },
    shadowOpacity:   0.5,
    shadowRadius:    18,
    elevation:       16,
  },

  // ── Tarjeta — SIN overflow:hidden para que el logo no se corte ──
  card: {
    width:             '100%',
    backgroundColor:   'rgba(255,255,255,0.10)',
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.18)',
    borderRadius:      28,
    paddingTop:        72,        // espacio para el logo superpuesto
    paddingBottom:     36,
    paddingHorizontal: 28,
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 20 },
    shadowOpacity:     0.45,
    shadowRadius:      30,
    elevation:         10,
    ...(IS_WEB && {
      backdropFilter:       'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }),
  },

  title: {
    color:        'white',
    fontSize:     22,
    fontWeight:   '700',
    textAlign:    'center',
    marginBottom: 4,
  },
  sub: {
    color:        '#94a3b8',
    fontSize:     13,
    textAlign:    'center',
    marginBottom: 26,
  },

  label: {
    color:        '#cbd5e1',
    fontSize:     13,
    marginBottom: 6,
    marginLeft:   4,
  },

  input: {
    width:             '100%',
    paddingVertical:    13,
    paddingHorizontal:  18,
    backgroundColor:    'rgba(255,255,255,0.06)',
    borderWidth:        1,
    borderColor:        'rgba(255,255,255,0.18)',
    borderRadius:       14,
    color:              'white',
    fontSize:           15,
    marginBottom:       18,
    ...(IS_WEB && { outline: 'none' }),
  },

  btn: {
    width:           '100%',
    paddingVertical:  15,
    backgroundColor:  '#6366f1',
    borderRadius:     14,
    alignItems:       'center',
    marginTop:        4,
    shadowColor:      '#6366f1',
    shadowOffset:     { width: 0, height: 8 },
    shadowOpacity:    0.55,
    shadowRadius:     14,
    elevation:        6,
    ...(IS_WEB && {
      backgroundImage: 'linear-gradient(to right, #6366f1, #a855f7)',
      cursor:          'pointer',
    }),
  },
  btnText: {
    color:      'white',
    fontWeight: '700',
    fontSize:   16,
  },

  // Texto plano sin link
  footerText: {
    color:     '#64748b',
    fontSize:  12,
    textAlign: 'center',
    marginTop: 22,
  },

  // ── Créditos ──
  credits: {
    alignItems: 'center',
    marginTop:  22,
  },
  creditsTop: {
    color:         'rgba(255,255,255,0.3)',
    fontSize:      10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  creditsName: {
    color:         '#6366f1',
    fontSize:      13,
    fontWeight:    '700',
    marginTop:     3,
    letterSpacing: 1,
  },
});