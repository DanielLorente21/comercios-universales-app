// ════════════════════════════════════════════════════════════════════════════
// src/components/LogoAnimado.js · Comercios Universales
// ════════════════════════════════════════════════════════════════════════════

import { useRef, useEffect } from 'react';
import { Animated, Easing, View } from 'react-native';
import { LOGO, TAMAÑO_LOGO } from '../constants/config';

const COLOR_ANILLO  = 'rgba(255,255,255,0.85)';
const COLOR_ANILLO2 = 'rgba(255,255,255,0.4)';

export default function LogoAnimado() {
  const rotacion  = useRef(new Animated.Value(0)).current;
  const rotacion2 = useRef(new Animated.Value(0)).current;
  const pulso     = useRef(new Animated.Value(1)).current;
  const brillo    = useRef(new Animated.Value(0.4)).current;
  const entrada   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entrada, {
      toValue: 1, tension: 60, friction: 7, useNativeDriver: true,
    }).start();
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

  const girar1       = rotacion.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const girar2       = rotacion2.interpolate({ inputRange: [-1, 0], outputRange: ['-360deg', '0deg'] });
  const escalaEntrada = entrada.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const T = TAMAÑO_LOGO;

  return (
    <Animated.View style={{ width: T, height: T, alignItems: 'center', justifyContent: 'center', marginBottom: 16, opacity: entrada, transform: [{ scale: escalaEntrada }] }}>
      <Animated.View style={{ position: 'absolute', width: T + 25, height: T + 25, borderRadius: (T + 24) / 2, backgroundColor: 'rgba(255,255,255,0.18)', opacity: brillo }} />
      <Animated.View style={{ position: 'absolute', width: T, height: T, borderRadius: T / 2, transform: [{ rotate: girar1 }] }}>
        <View style={{ position:'absolute', top:0, left:T*0.2, width:T*0.6, height:3, borderRadius:2, backgroundColor:COLOR_ANILLO }} />
        <View style={{ position:'absolute', top:T*0.2, right:0, width:3, height:T*0.6, borderRadius:2, backgroundColor:COLOR_ANILLO }} />
        <View style={{ position:'absolute', bottom:0, left:T*0.2, width:T*0.6, height:3, borderRadius:2, backgroundColor:COLOR_ANILLO }} />
        <View style={{ position:'absolute', top:T*0.2, left:0, width:3, height:T*0.6, borderRadius:2, backgroundColor:COLOR_ANILLO }} />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', width: T-16, height: T-16, borderRadius: (T-16)/2, transform: [{ rotate: girar2 }] }}>
        <View style={{ position:'absolute', top:0, left:(T-16)*0.15, width:(T-16)*0.7, height:2, borderRadius:1, backgroundColor:COLOR_ANILLO2 }} />
        <View style={{ position:'absolute', bottom:0, left:(T-16)*0.15, width:(T-16)*0.7, height:2, borderRadius:1, backgroundColor:COLOR_ANILLO2 }} />
      </Animated.View>
      <View style={{ width: T-22, height: T-22, borderRadius: (T-22)/2, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width:0, height:4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 8 }}>
        <Animated.Image source={LOGO} style={{ width: T-42, height: T-42, transform: [{ scale: pulso }] }} resizeMode="contain" />
      </View>
    </Animated.View>
  );
}
