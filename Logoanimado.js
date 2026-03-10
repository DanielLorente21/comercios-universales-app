// ════════════════════════════════════════════════════════════════════════════
// LogoAnimado.js — Logo animado para pantalla de Login
// Comercios Universales
//
// USO: Importa este componente y reemplaza en el login:
//
//   ANTES:
//     <Image source={LOGO} style={{ width: 90, height: 90, marginBottom: 12 }} resizeMode="contain" />
//
//   DESPUÉS:
//     <LogoAnimado />
//
// ════════════════════════════════════════════════════════════════════════════

import { useRef, useEffect } from 'react';
import { Animated, Easing, View, Image, StyleSheet } from 'react-native';

const LOGO = require('./logocomercios.png');

export default function LogoAnimado() {
  // ─── Valores animados ─────────────────────────────────────────────────────
  const rotacion      = useRef(new Animated.Value(0)).current;  // anillo giratorio
  const pulso         = useRef(new Animated.Value(1)).current;  // escala del logo
  const brillo        = useRef(new Animated.Value(0.4)).current; // opacidad del halo
  const rotacion2     = useRef(new Animated.Value(0)).current;  // segundo anillo (inverso)
  const entrada       = useRef(new Animated.Value(0)).current;  // fade-in al montar

  useEffect(() => {
    // Animación de entrada (fade + escala desde 0)
    Animated.spring(entrada, {
      toValue: 1,
      tension: 60,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Anillo exterior girando continuamente
    Animated.loop(
      Animated.timing(rotacion, {
        toValue: 1,
        duration: 3500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Anillo interior girando en sentido inverso
    Animated.loop(
      Animated.timing(rotacion2, {
        toValue: -1,
        duration: 5000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulso del logo (respira suavemente)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulso, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Halo de brillo pulsante
    Animated.loop(
      Animated.sequence([
        Animated.timing(brillo, {
          toValue: 0.9,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(brillo, {
          toValue: 0.3,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // ─── Interpolaciones ──────────────────────────────────────────────────────
  const girar1 = rotacion.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const girar2 = rotacion2.interpolate({
    inputRange:  [-1, 0],
    outputRange: ['-360deg', '0deg'],
  });

  const escalaEntrada = entrada.interpolate({
    inputRange:  [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <Animated.View style={[
      estilos.contenedor,
      {
        opacity:   entrada,
        transform: [{ scale: escalaEntrada }],
      }
    ]}>

      {/* Halo exterior difuso */}
      <Animated.View style={[estilos.halo, { opacity: brillo }]} />

      {/* Anillo exterior con segmentos */}
      <Animated.View style={[
        estilos.anilloExterior,
        { transform: [{ rotate: girar1 }] }
      ]}>
        {/* 4 segmentos del anillo exterior */}
        <View style={[estilos.segmento, estilos.segmentoTop]} />
        <View style={[estilos.segmento, estilos.segmentoDer]} />
        <View style={[estilos.segmento, estilos.segmentoBaj]} />
        <View style={[estilos.segmento, estilos.segmentoIzq]} />
      </Animated.View>

      {/* Anillo interior (gira al revés) */}
      <Animated.View style={[
        estilos.anilloInterior,
        { transform: [{ rotate: girar2 }] }
      ]}>
        <View style={[estilos.segmentoInt, estilos.segmentoIntTop]} />
        <View style={[estilos.segmentoInt, estilos.segmentoIntBaj]} />
      </Animated.View>

      {/* Círculo blanco de fondo del logo */}
      <View style={estilos.circuloBlanco}>
        {/* Logo con pulso */}
        <Animated.Image
          source={LOGO}
          style={[
            estilos.logo,
            { transform: [{ scale: pulso }] }
          ]}
          resizeMode="contain"
        />
      </View>

    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ════════════════════════════════════════════════════════════════════════════
const TAMAÑO        = 110;   // diámetro total del componente
const GROSOR_EXT    = 3;     // grosor del anillo exterior
const GROSOR_INT    = 2;     // grosor del anillo interior
const COLOR_ANILLO  = 'rgba(255,255,255,0.85)';
const COLOR_ANILLO2 = 'rgba(255,255,255,0.4)';

const estilos = StyleSheet.create({
  contenedor: {
    width:          TAMAÑO,
    height:         TAMAÑO,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   16,
  },

  // Halo borroso detrás de todo
  halo: {
    position:     'absolute',
    width:        TAMAÑO + 24,
    height:       TAMAÑO + 24,
    borderRadius: (TAMAÑO + 24) / 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  // Anillo exterior con 4 segmentos
  anilloExterior: {
    position:     'absolute',
    width:        TAMAÑO,
    height:       TAMAÑO,
    borderRadius: TAMAÑO / 2,
  },
  segmento: {
    position:    'absolute',
    borderRadius: GROSOR_EXT,
    backgroundColor: COLOR_ANILLO,
  },
  segmentoTop: {
    top:    0,
    left:   TAMAÑO * 0.2,
    width:  TAMAÑO * 0.6,
    height: GROSOR_EXT,
  },
  segmentoDer: {
    top:    TAMAÑO * 0.2,
    right:  0,
    width:  GROSOR_EXT,
    height: TAMAÑO * 0.6,
  },
  segmentoBaj: {
    bottom: 0,
    left:   TAMAÑO * 0.2,
    width:  TAMAÑO * 0.6,
    height: GROSOR_EXT,
  },
  segmentoIzq: {
    top:   TAMAÑO * 0.2,
    left:  0,
    width: GROSOR_EXT,
    height: TAMAÑO * 0.6,
  },

  // Anillo interior con 2 segmentos (gira al revés)
  anilloInterior: {
    position:     'absolute',
    width:        TAMAÑO - 16,
    height:       TAMAÑO - 16,
    borderRadius: (TAMAÑO - 16) / 2,
  },
  segmentoInt: {
    position:        'absolute',
    backgroundColor: COLOR_ANILLO2,
    borderRadius:    GROSOR_INT,
  },
  segmentoIntTop: {
    top:   0,
    left:  (TAMAÑO - 16) * 0.15,
    width: (TAMAÑO - 16) * 0.7,
    height: GROSOR_INT,
  },
  segmentoIntBaj: {
    bottom: 0,
    left:   (TAMAÑO - 16) * 0.15,
    width:  (TAMAÑO - 16) * 0.7,
    height: GROSOR_INT,
  },

  // Círculo blanco del centro con sombra
  circuloBlanco: {
    width:           TAMAÑO - 22,
    height:          TAMAÑO - 22,
    borderRadius:    (TAMAÑO - 22) / 2,
    backgroundColor: 'white',
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.25,
    shadowRadius:    8,
    elevation:       8,
  },

  // Imagen del logo
  logo: {
    width:  TAMAÑO - 42,
    height: TAMAÑO - 42,
  },
});