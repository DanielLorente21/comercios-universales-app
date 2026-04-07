// ════════════════════════════════════════════════════════════════════════════
// IntroScreen.js — Pantalla de introducción animada
// Comercios Universales · Desarrollado por Daniel Lorente
//
// INTEGRACIÓN EN App.js:
//
//   1) Importa este componente:
//        import IntroScreen from './IntroScreen';
//
//   2) Añade un estado en tu componente raíz:
//        const [introVisible, setIntroVisible] = useState(true);
//
//   3) En el return principal, ponlo ANTES de la pantalla de login:
//        if (introVisible) {
//          return <IntroScreen onFinish={() => setIntroVisible(false)} />;
//        }
//
//   La intro se muestra UNA sola vez por sesión (AsyncStorage).
//   Para mostrarla siempre (modo desarrollo), borra la línea de AsyncStorage
//   o comenta el bloque "revisar si ya se mostró".
// ════════════════════════════════════════════════════════════════════════════

import { useRef, useEffect } from 'react';
import {
  View, Text, Animated, Easing, TouchableOpacity,
  StyleSheet, Dimensions, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOGO = require('./assets/logocomercios.png');
const { width, height } = Dimensions.get('window');

// ─── Colores de marca ─────────────────────────────────────────────────────
const AZUL            = '#1a2a6c';   // azul oscuro principal
const AZUL_MED        = '#243490';
const BLANCO          = '#FFFFFF';
const COLOR_ANILLO    = 'rgba(255,255,255,0.85)';
const COLOR_ANILLO2   = 'rgba(255,255,255,0.40)';
const DURACION_AUTO   = 5800;        // ms antes de avanzar solo

// ─── Partícula individual ─────────────────────────────────────────────────
function Particula({ delay }) {
  const x     = useRef(Math.random() * width).current;
  const yInit = useRef(Math.random() * height).current;
  const size  = useRef(Math.random() * 3 + 1.5).current;
  const anim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 4000 + Math.random() * 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 4000 + Math.random() * 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });
  const opacity    = anim.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0, 0.5, 0.5, 0] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: yInit,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: BLANCO,
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

// ─── Logo animado incrustado ──────────────────────────────────────────────
const T = 120; // tamaño total del logo

function LogoIntro() {
  const rotacion  = useRef(new Animated.Value(0)).current;
  const rotacion2 = useRef(new Animated.Value(0)).current;
  const pulso     = useRef(new Animated.Value(1)).current;
  const brillo    = useRef(new Animated.Value(0.4)).current;
  const entrada   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entrada, { toValue: 1, tension: 55, friction: 6, useNativeDriver: true }).start();

    Animated.loop(
      Animated.timing(rotacion, { toValue: 1, duration: 3500, easing: Easing.linear, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.timing(rotacion2, { toValue: -1, duration: 5000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1.08, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 1,    duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(brillo, { toValue: 0.9, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(brillo, { toValue: 0.3, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const girar1       = rotacion.interpolate({ inputRange: [0, 1],   outputRange: ['0deg', '360deg'] });
  const girar2       = rotacion2.interpolate({ inputRange: [-1, 0], outputRange: ['-360deg', '0deg'] });
  const escalaEntrada = entrada.interpolate({ inputRange: [0, 1],   outputRange: [0.3, 1] });

  return (
    <Animated.View style={[s.logoContenedor, { opacity: entrada, transform: [{ scale: escalaEntrada }] }]}>
      {/* Halo pulsante */}
      <Animated.View style={[s.halo, { opacity: brillo }]} />

      {/* Anillo exterior */}
      <Animated.View style={[s.anilloExterior, { transform: [{ rotate: girar1 }] }]}>
        <View style={[s.seg, s.segTop]} />
        <View style={[s.seg, s.segBot]} />
        <View style={[s.seg, s.segIzq]} />
        <View style={[s.seg, s.segDer]} />
      </Animated.View>

      {/* Anillo interior (sentido inverso) */}
      <Animated.View style={[s.anilloInterior, { transform: [{ rotate: girar2 }] }]}>
        <View style={[s.segI, s.segITop]} />
        <View style={[s.segI, s.segIBot]} />
      </Animated.View>

      {/* Círculo blanco con logo */}
      <View style={s.circuloBlanco}>
        <Animated.Image
          source={LOGO}
          style={[s.logoImg, { transform: [{ scale: pulso }] }]}
          resizeMode="contain"
        />
      </View>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export default function IntroScreen({ onFinish }) {
  // ── Animaciones de texto ─────────────────────────────────────────────────
  const fadeNombre  = useRef(new Animated.Value(0)).current;
  const slidNombre  = useRef(new Animated.Value(20)).current;
  const fadeSub     = useRef(new Animated.Value(0)).current;
  const slidSub     = useRef(new Animated.Value(20)).current;
  const linea       = useRef(new Animated.Value(0)).current;
  const fadeDots    = useRef(new Animated.Value(0)).current;
  const fadeCredit  = useRef(new Animated.Value(0)).current;
  const fadeSkip    = useRef(new Animated.Value(0)).current;
  const fadeOut     = useRef(new Animated.Value(1)).current;

  // Puntos de carga
  const dot1 = useRef(new Animated.Value(0.25)).current;
  const dot2 = useRef(new Animated.Value(0.25)).current;
  const dot3 = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    // Secuencia de aparición
    Animated.sequence([
      Animated.delay(700),
      // nombre
      Animated.parallel([
        Animated.timing(fadeNombre, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(slidNombre, { toValue: 0, duration: 700, easing: Easing.out(Easing.exp), useNativeDriver: true }),
      ]),
      Animated.delay(150),
      // subtítulo
      Animated.parallel([
        Animated.timing(fadeSub, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slidSub, { toValue: 0, duration: 600, easing: Easing.out(Easing.exp), useNativeDriver: true }),
      ]),
      Animated.delay(200),
      // línea divisora
      Animated.timing(linea, { toValue: 1, duration: 800, easing: Easing.out(Easing.exp), useNativeDriver: false }),
      // dots de carga
      Animated.timing(fadeDots, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Crédito & skip aparecen más tarde
    Animated.sequence([
      Animated.delay(2600),
      Animated.timing(fadeCredit, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(3000),
      Animated.timing(fadeSkip, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    // Dots parpadeantes
    const dotAnim = (val, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.2, duration: 500, useNativeDriver: true }),
        ])
      ).start();

    setTimeout(() => {
      dotAnim(dot1, 0);
      dotAnim(dot2, 220);
      dotAnim(dot3, 440);
    }, 2000);

    // Auto-avance
    const timer = setTimeout(salir, DURACION_AUTO);
    return () => clearTimeout(timer);
  }, []);

  const salir = () => {
    Animated.timing(fadeOut, {
      toValue: 0,
      duration: 650,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(async () => {
      try {
        await AsyncStorage.setItem('@intro_mostrada', '1');
      } catch (_) {}
      onFinish && onFinish();
    });
  };

  const lineaWidth = linea.interpolate({ inputRange: [0, 1], outputRange: [0, 130] });

  // 30 partículas con delays aleatorios
  const particulas = Array.from({ length: 30 }, (_, i) => (
    <Particula key={i} delay={i * 120} />
  ));

  return (
    <Animated.View style={[s.root, { opacity: fadeOut }]}>
      {/* Gradiente de fondo (dos capas simuladas) */}
      <View style={s.bgTop} />
      <View style={s.bgBot} />

      {/* Partículas */}
      {particulas}

      {/* Botón saltar */}
      <Animated.View style={[s.skipWrap, { opacity: fadeSkip }]}>
        <TouchableOpacity onPress={salir} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={s.skipTxt}>SALTAR  ›</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Centro */}
      <View style={s.centro}>
        <LogoIntro />

        {/* Nombre de la empresa */}
        <Animated.Text style={[s.nombre, { opacity: fadeNombre, transform: [{ translateY: slidNombre }] }]}>
          COMERCIOS{'\n'}UNIVERSALES
        </Animated.Text>

        {/* Subtítulo */}
        <Animated.Text style={[s.subtitulo, { opacity: fadeSub, transform: [{ translateY: slidSub }] }]}>
          SISTEMA DE GESTIÓN
        </Animated.Text>

        {/* Línea */}
        <Animated.View style={[s.linea, { width: lineaWidth }]} />

        {/* Dots de carga */}
        <Animated.View style={[s.dotsRow, { opacity: fadeDots }]}>
          <Animated.View style={[s.dot, { opacity: dot1 }]} />
          <Animated.View style={[s.dot, { opacity: dot2 }]} />
          <Animated.View style={[s.dot, { opacity: dot3 }]} />
        </Animated.View>
      </View>

      {/* Crédito — discreto en la parte inferior */}
      <Animated.View style={[s.creditWrap, { opacity: fadeCredit }]}>
        <Text style={s.creditTxt}>
          DESARROLLADO POR{'  '}
          <Text style={s.creditNombre}>Daniel Lorente</Text>
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0, left: 0,
    width,
    height,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Fondo en dos capas para simular gradiente
  bgTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: height * 0.55,
    backgroundColor: AZUL,
  },
  bgBot: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: height * 0.55,
    backgroundColor: AZUL_MED,
  },

  // ── Botón skip ────────────────────────────────────────────────────────────
  skipWrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 36,
    right: 24,
    zIndex: 10,
  },
  skipTxt: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
  },

  // ── Centro ────────────────────────────────────────────────────────────────
  centro: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Logo ──────────────────────────────────────────────────────────────────
  logoContenedor: {
    width: T,
    height: T,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  halo: {
    position: 'absolute',
    width: T + 28,
    height: T + 28,
    borderRadius: (T + 28) / 2,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  anilloExterior: {
    position: 'absolute',
    width: T,
    height: T,
    borderRadius: T / 2,
  },
  anilloInterior: {
    position: 'absolute',
    width: T - 18,
    height: T - 18,
    borderRadius: (T - 18) / 2,
  },
  seg: {
    position: 'absolute',
    borderRadius: 2,
    backgroundColor: COLOR_ANILLO,
  },
  segTop: { top: 0,    left: T * 0.2,    width: T * 0.6, height: 3 },
  segBot: { bottom: 0, left: T * 0.2,    width: T * 0.6, height: 3 },
  segIzq: { left: 0,   top: T * 0.2,     width: 3, height: T * 0.6 },
  segDer: { right: 0,  top: T * 0.2,     width: 3, height: T * 0.6 },
  segI: {
    position: 'absolute',
    borderRadius: 1,
    backgroundColor: COLOR_ANILLO2,
  },
  segITop: { top: 0,    left: (T - 18) * 0.15, width: (T - 18) * 0.7, height: 2 },
  segIBot: { bottom: 0, left: (T - 18) * 0.15, width: (T - 18) * 0.7, height: 2 },
  circuloBlanco: {
    width: T - 24,
    height: T - 24,
    borderRadius: (T - 24) / 2,
    backgroundColor: BLANCO,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  logoImg: {
    width: T - 48,
    height: T - 48,
  },

  // ── Textos ────────────────────────────────────────────────────────────────
  nombre: {
    color: BLANCO,
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 6,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitulo: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 5,
    textAlign: 'center',
  },

  // ── Línea + dots ─────────────────────────────────────────────────────────
  linea: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.28)',
    marginVertical: 18,
    alignSelf: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },

  // ── Crédito ───────────────────────────────────────────────────────────────
  creditWrap: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 24,
  },
  creditTxt: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 2.5,
    textAlign: 'center',
  },
  creditNombre: {
    color: 'rgba(255,255,255,0.38)',
    fontWeight: '900',
    letterSpacing: 1,
  },
});
