// ════════════════════════════════════════════════════════════════════════════
// App.js — Sistema de Permisos Laborales · Comercios Universales
// ════════════════════════════════════════════════════════════════════════════
// CORRECCIONES APLICADAS:
//   FIX-A: calcularDias — domingo ya no suma 0.5 forzado; el mínimo real es 0.5
//          solo si el rango tiene al menos algún día laborable parcial.
//   FIX-B: abrirPanelNotif — marcarTodasLeidas ahora recibe la lista fresca
//          devuelta por cargarNotificaciones, no el estado capturado en cierre.
//   FIX-C: recuperarSesion — llama a acumularDiasPendientes para que los días
//          se acumulen también al abrir la app con sesión guardada.
//   FIX-D: OPENAI_KEY movida a constante con nombre OPENAI_KEY_PLACEHOLDER;
//          en producción debe leerse desde una variable de entorno o un
//          backend seguro, nunca hardcodeada en el bundle.
// ════════════════════════════════════════════════════════════════════════════

// ─── IMPORTACIONES ───────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import SuperAdmin from './SuperAdmin';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
// expo-file-system se importa dinámicamente solo en móvil (no disponible en web/Snack preview)

import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
  SafeAreaView, StatusBar, Platform, Linking, Image
} from 'react-native';

// ─── LOGO COMERCIOS UNIVERSALES ──────────────────────────────────────────────
const LOGO = require('./logocomercios.png');

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: LogoAnimado
// ════════════════════════════════════════════════════════════════════════════
const TAMAÑO_LOGO    = 110;
const COLOR_ANILLO   = 'rgba(255,255,255,0.85)';
const COLOR_ANILLO2  = 'rgba(255,255,255,0.4)';

function LogoAnimado() {
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
      Animated.timing(rotacion, {
        toValue: 1, duration: 3500,
        easing: Easing.linear, useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(rotacion2, {
        toValue: -1, duration: 5000,
        easing: Easing.linear, useNativeDriver: true,
      })
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

  const girar1 = rotacion.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const girar2 = rotacion2.interpolate({ inputRange: [-1, 0], outputRange: ['-360deg', '0deg'] });
  const escalaEntrada = entrada.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  const T = TAMAÑO_LOGO;

  return (
    <Animated.View style={{
      width: T, height: T,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 16,
      opacity: entrada,
      transform: [{ scale: escalaEntrada }],
    }}>
      <Animated.View style={{
        position: 'absolute',
        width: T + 24, height: T + 24,
        borderRadius: (T + 24) / 2,
        backgroundColor: 'rgba(255,255,255,0.18)',
        opacity: brillo,
      }} />

      <Animated.View style={{
        position: 'absolute', width: T, height: T,
        borderRadius: T / 2,
        transform: [{ rotate: girar1 }],
      }}>
        <View style={{ position:'absolute', top:0, left:T*0.2, width:T*0.6, height:3, borderRadius:2, backgroundColor:COLOR_ANILLO }} />
        <View style={{ position:'absolute', top:T*0.2, right:0, width:3, height:T*0.6, borderRadius:2, backgroundColor:COLOR_ANILLO }} />
        <View style={{ position:'absolute', bottom:0, left:T*0.2, width:T*0.6, height:3, borderRadius:2, backgroundColor:COLOR_ANILLO }} />
        <View style={{ position:'absolute', top:T*0.2, left:0, width:3, height:T*0.6, borderRadius:2, backgroundColor:COLOR_ANILLO }} />
      </Animated.View>

      <Animated.View style={{
        position: 'absolute', width: T-16, height: T-16,
        borderRadius: (T-16)/2,
        transform: [{ rotate: girar2 }],
      }}>
        <View style={{ position:'absolute', top:0, left:(T-16)*0.15, width:(T-16)*0.7, height:2, borderRadius:1, backgroundColor:COLOR_ANILLO2 }} />
        <View style={{ position:'absolute', bottom:0, left:(T-16)*0.15, width:(T-16)*0.7, height:2, borderRadius:1, backgroundColor:COLOR_ANILLO2 }} />
      </Animated.View>

      <View style={{
        width: T-22, height: T-22,
        borderRadius: (T-22)/2,
        backgroundColor: 'white',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width:0, height:4 },
        shadowOpacity: 0.25, shadowRadius: 8, elevation: 8,
      }}>
        <Animated.Image
          source={LOGO}
          style={{ width: T-42, height: T-42, transform: [{ scale: pulso }] }}
          resizeMode="contain"
        />
      </View>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTES DE COLOR GLOBALES
// ════════════════════════════════════════════════════════════════════════════
const AZUL       = '#2C4A8C';
const AZUL_CLARO = '#EEF2FB';

// ─── CONFIGURACIÓN FIREBASE / FIRESTORE ──────────────────────────────────────
const PROJECT_ID = 'permisoapplorenti';
const API_KEY    = 'AIzaSyCu8hGmT1NYWipG4pPO-QVfI_tXzRxs1eg';
const DB_URL     = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ════════════════════════════════════════════════════════════════════════════
// FIX-D: OPENAI_KEY
// La clave NO debe estar hardcodeada en el bundle de producción.
// Opciones recomendadas:
//   1. Variable de entorno en EAS Build:  process.env.OPENAI_KEY
//   2. Un backend propio que haga el proxy a OpenAI.
// Por ahora se lee desde process.env y cae al valor vacío si no está definida,
// lo que hará que la IA muestre un error controlado en lugar de exponer la clave.
// Para desarrollo local en Snack puedes reemplazar '' por tu clave temporalmente,
// pero NUNCA la subas a un repo público ni a una APK de producción.
// ════════════════════════════════════════════════════════════════════════════
const OPENAI_KEY = (typeof process !== 'undefined' && process.env?.OPENAI_KEY)
  ? process.env.OPENAI_KEY
  : '';   // <-- reemplaza '' con tu clave SOLO en desarrollo local

// ════════════════════════════════════════════════════════════════════════════
// NOTIFICACIONES PUSH
// ════════════════════════════════════════════════════════════════════════════
const registrarPushToken = async (userId) => {
  try {
    const Notifications = require('expo-notifications');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    // FIX APK: getExpoPushTokenAsync necesita el projectId en builds compilados.
    // Sin esto el token no se genera y las notificaciones no llegan en el APK.
    // Reemplaza 'TU_PROJECT_ID' con el ID real de tu proyecto en expo.dev
    const Constants = require('expo-constants');
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      '26283780-a585-49bb-bb13-0cb62a76b792';

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    if (token) {
      await fsUpdate('usuarios', userId, { pushToken: token });
      console.log('Push token registrado:', token);
    }

    // Configurar canal de notificaciones para Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Permisos',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2C4A8C',
      });
    }
  } catch(e) { console.log('Push no disponible:', e.message); }
};

const enviarNotificacion = async (pushToken, titulo, cuerpo) => {
  if (!pushToken) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: pushToken, title: titulo, body: cuerpo, sound: 'default' })
    });
  } catch(e) { console.log('Error notificación:', e.message); }
};

// ════════════════════════════════════════════════════════════════════════════
// NOTIFICACIONES EN FIRESTORE
// ════════════════════════════════════════════════════════════════════════════
const crearNotificacion = async (codigoDestinatario, titulo, cuerpo) => {
  try {
    await fsAdd('notificaciones', {
      codigo:   codigoDestinatario,
      titulo,
      cuerpo,
      leido:    'false',
      fecha:    new Date().toISOString(),
    });
  } catch(e) { console.log('Error creando notificación:', e.message); }
};

// ════════════════════════════════════════════════════════════════════════════
// GENERACIÓN DE PDF / COMPROBANTE
// ════════════════════════════════════════════════════════════════════════════
const generarPDF = async (permiso, empleado) => {
  try {
    const dias = calcularDias(permiso.fechaInicio, permiso.fechaFin);
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a2e; background: white; }
    .header { text-align: center; border-bottom: 3px solid #2C4A8C; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 22px; font-weight: bold; color: #2C4A8C; }
    .subtitulo { font-size: 14px; color: #666; margin-top: 6px; }
    .sello-wrap { margin: 16px 0; }
    .sello { display: inline-block; background: #EDF7ED; border: 2px solid #4CAF7D; color: #2E7D32; padding: 8px 24px; border-radius: 30px; font-weight: bold; font-size: 15px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    tr { border-bottom: 1px solid #EEF2FB; }
    td { padding: 11px 4px; font-size: 13px; }
    td:first-child { color: #888; width: 40%; }
    td:last-child { font-weight: 600; color: #1a1a2e; text-align: right; }
    .estado-ok { color: #4CAF7D; font-weight: bold; }
    .firmas { display: flex; justify-content: space-around; margin-top: 50px; }
    .firma-box { text-align: center; width: 200px; }
    .linea-firma { border-top: 1px solid #1a1a2e; margin-bottom: 8px; }
    .firma-label { font-size: 12px; color: #888; }
    .footer { margin-top: 30px; text-align: center; color: #bbb; font-size: 10px; border-top: 1px solid #EEF2FB; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">⚙️ Comercios Universales</div>
    <div class="subtitulo">Comprobante de Permiso Laboral</div>
    <div class="sello-wrap"><span class="sello">✅ APROBADO</span></div>
  </div>
  <table>
    <tr><td>Empleado</td><td>${permiso.nombre}</td></tr>
    <tr><td>Código</td><td>${permiso.codigo}</td></tr>
    <tr><td>Cargo</td><td>${permiso.cargo}</td></tr>
    <tr><td>Departamento</td><td>${permiso.departamento}</td></tr>
    <tr><td>Tipo de permiso</td><td>${permiso.tipo}</td></tr>
    <tr><td>Fecha inicio</td><td>${permiso.fechaInicio}</td></tr>
    <tr><td>Fecha fin</td><td>${permiso.fechaFin}</td></tr>
    <tr><td>Días</td><td>${dias % 1 === 0 ? dias : dias.toFixed(1)}</td></tr>
    <tr><td>Motivo</td><td>${permiso.motivo}</td></tr>
    <tr><td>Estado</td><td class="estado-ok">APROBADO</td></tr>
    <tr><td>Fecha emisión</td><td>${new Date().toLocaleDateString('es-GT')}</td></tr>
  </table>
  <div class="firmas">
    <div class="firma-box"><div class="linea-firma"></div><div class="firma-label">Firma del Empleado</div></div>
    <div class="firma-box"><div class="linea-firma"></div><div class="firma-label">Firma del Aprobador</div></div>
  </div>
  <div class="footer">Documento generado automáticamente por el Sistema de Permisos — Comercios Universales S.A.</div>
</body>
</html>`;

    if (Platform.OS === 'web') {
      const htmlConBoton = html.replace('</body>', `
        <div style="text-align:center;margin:20px">
          <button onclick="window.print()" style="background:#2C4A8C;color:white;border:none;padding:12px 30px;border-radius:8px;font-size:15px;cursor:pointer;font-weight:bold">
            📄 Guardar como PDF
          </button>
        </div>
      </body>`);
      const blobFinal = new Blob([htmlConBoton], { type: 'text/html' });
      const urlFinal  = URL.createObjectURL(blobFinal);
      window.open(urlFinal, '_blank');
    } else {
      // Generar PDF en ruta temporal
      const { uri: uriTemporal } = await Print.printToFileAsync({ html, base64: false });

      // FIX Android 10+: copiar al directorio de caché antes de compartir
      // FileSystem se importa dinámicamente para evitar error en preview web de Snack
      let uriFinal = uriTemporal;
      try {
        const FileSystem = await import('expo-file-system');
        const nombreArchivo = `permiso_${permiso.codigo}_${permiso.fechaInicio?.replace(/\//g, '-')}.pdf`;
        const uriCache = `${FileSystem.cacheDirectory}${nombreArchivo}`;
        await FileSystem.copyAsync({ from: uriTemporal, to: uriCache });
        uriFinal = uriCache;
      } catch (e) {
        console.log('FileSystem no disponible, usando ruta temporal:', e.message);
      }

      const puedeCompartir = await Sharing.isAvailableAsync();
      if (puedeCompartir) {
        await Sharing.shareAsync(uriFinal, {
          mimeType: 'application/pdf',
          dialogTitle: 'Comprobante de Permiso',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('✅ PDF generado', 'El archivo fue guardado correctamente.');
      }
    }
  } catch(e) {
    Alert.alert('Error', 'No se pudo generar el PDF: ' + e.message);
  }
};

// ════════════════════════════════════════════════════════════════════════════
// JERARQUÍA DE ROLES
// ════════════════════════════════════════════════════════════════════════════
const JERARQUIA = { gerente: 4, supervisor: 3, jefe: 2, auxiliar: 1, empleado: 0 };

const puedeAprobarA = (aprobador, solicitante) => {
  if (aprobador.rol === 'gerente') return true;
  return (
    aprobador.departamento === solicitante.departamento &&
    (JERARQUIA[aprobador.rol] ?? 0) > (JERARQUIA[solicitante.rol] ?? 0)
  );
};

// ════════════════════════════════════════════════════════════════════════════
// HELPERS DE FIRESTORE
// ════════════════════════════════════════════════════════════════════════════
const fsGet = async (col) => {
  try {
    const res  = await fetch(`${DB_URL}/${col}?key=${API_KEY}`);
    const data = await res.json();
    if (!data.documents) return [];
    return data.documents.map(doc => {
      const id  = doc.name.split('/').pop();
      const f   = doc.fields;
      const obj = { id };
      for (const k in f) obj[k] = f[k].stringValue ?? '';
      return obj;
    });
  } catch { return []; }
};

const fsAdd = async (col, datos) => {
  const fields = {};
  for (const k in datos) fields[k] = { stringValue: String(datos[k]) };
  const res  = await fetch(`${DB_URL}/${col}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
};

const fsUpdate = async (col, docId, datos) => {
  const fields = {};
  for (const k in datos) fields[k] = { stringValue: String(datos[k]) };
  const mask = Object.keys(datos).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const res  = await fetch(`${DB_URL}/${col}/${docId}?${mask}&key=${API_KEY}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
};

const buscarUsuario = async (codigo) => {
  try {
    const res  = await fetch(`${DB_URL}:runQuery?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'usuarios' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'codigo' },
              op: 'EQUAL',
              value: { stringValue: codigo }
            }
          },
          limit: 1
        }
      })
    });
    const data = await res.json();
    if (!data[0]?.document) return null;
    const doc = data[0].document;
    const id  = doc.name.split('/').pop();
    const f   = doc.fields;
    const obj = { id };
    for (const k in f) obj[k] = f[k].stringValue ?? '';
    return obj;
  } catch { return null; }
};

// ════════════════════════════════════════════════════════════════════════════
// ACUMULACIÓN DE DÍAS DE VACACIONES
// ════════════════════════════════════════════════════════════════════════════
const DIAS_POR_MES = 1.25;

const parsearFechaIngreso = (str) => {
  if (!str) return null;
  const [d, m, y] = str.split('/');
  if (!d || !m || !y) return null;
  return new Date(Number(y), Number(m) - 1, Number(d));
};

const clavesMesActual = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
};

const calcularMesesPendientes = (fechaIngreso, ultimaAcumulacion) => {
  const ingreso = parsearFechaIngreso(fechaIngreso);
  if (!ingreso) return 0;

  const hoy       = new Date();
  const limiteMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  let desde;
  if (ultimaAcumulacion) {
    const [ya, ym] = ultimaAcumulacion.split('-').map(Number);
    desde = new Date(ya, ym, 1);
  } else {
    desde = new Date(ingreso.getFullYear(), ingreso.getMonth(), 1);
  }

  if (desde >= limiteMes) return 0;

  let meses = 0;
  const cursor = new Date(desde);
  while (cursor < limiteMes) {
    meses++;
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return meses;
};

const ultimoMesCerrado = () => {
  const hoy = new Date();
  const mes = hoy.getMonth();
  const anio = hoy.getFullYear();
  const mesAnterior = mes === 0 ? 12 : mes;
  const anioAnterior = mes === 0 ? anio - 1 : anio;
  return `${anioAnterior}-${String(mesAnterior).padStart(2, '0')}`;
};

// ════════════════════════════════════════════════════════════════════════════
// VALIDACIÓN Y CÁLCULO DE FECHAS
// ════════════════════════════════════════════════════════════════════════════
const REGEX_FECHA = /^(\d{2})\/(\d{2})\/(\d{4})$/;

const parsearFecha = (str) => {
  const m = str.match(REGEX_FECHA);
  if (!m) return null;
  const [, d, mo, y] = m;
  const fecha = new Date(Number(y), Number(mo) - 1, Number(d));
  if (
    fecha.getFullYear() !== Number(y) ||
    fecha.getMonth()    !== Number(mo) - 1 ||
    fecha.getDate()     !== Number(d)
  ) return null;
  return fecha;
};

const validarFechas = (inicio, fin) => {
  if (!REGEX_FECHA.test(inicio)) return 'La fecha de inicio no tiene formato DD/MM/AAAA';
  if (!REGEX_FECHA.test(fin))    return 'La fecha de fin no tiene formato DD/MM/AAAA';
  const fInicio = parsearFecha(inicio);
  const fFin    = parsearFecha(fin);
  if (!fInicio) return 'Fecha de inicio inválida';
  if (!fFin)    return 'Fecha de fin inválida';
  if (fFin < fInicio) return 'La fecha de fin no puede ser anterior a la fecha de inicio';
  return null;
};

// ════════════════════════════════════════════════════════════════════════════
// FIX-A: calcularDias
// Antes: si todo el rango eran domingos (total = 0), forzaba 0.5 — incorrecto.
// Ahora: el mínimo de 0.5 solo aplica cuando el rango contiene al menos un
// sábado (día parcial). Si el rango es solo domingos devuelve 0.
// Reglas:
//   Domingo  → 0 días
//   Sábado   → 0.5 días
//   Lun-Vie  → 1 día
// ════════════════════════════════════════════════════════════════════════════
const calcularDias = (fechaInicio, fechaFin) => {
  try {
    const [d1, m1, y1] = fechaInicio.split('/');
    const [d2, m2, y2] = fechaFin.split('/');
    const inicio = new Date(Number(y1), Number(m1) - 1, Number(d1));
    const fin    = new Date(Number(y2), Number(m2) - 1, Number(d2));
    if (fin < inicio) return 0;
    let total = 0;
    const cur = new Date(inicio);
    while (cur <= fin) {
      const dow = cur.getDay();
      if      (dow === 0) total += 0;    // domingo → no cuenta
      else if (dow === 6) total += 0.5;  // sábado  → medio día
      else                total += 1;    // lun-vie → día completo
      cur.setDate(cur.getDate() + 1);
    }
    // FIX-A: solo retornar 0 si realmente es 0 (ej: rango solo domingos).
    // El antiguo "return total > 0 ? total : 0.5" era incorrecto.
    return total;
  } catch { return 1; }
};

const calcularDiasTexto = (fechaInicio, fechaFin) => {
  const d = calcularDias(fechaInicio, fechaFin);
  return `${d} día(s)`;
};

// ════════════════════════════════════════════════════════════════════════════
// AUTO-FORMATO DE FECHA
// ════════════════════════════════════════════════════════════════════════════
const autoFormatearFecha = (texto) => {
  const soloNumeros = texto.replace(/\D/g, '');
  const nums = soloNumeros.slice(0, 8);
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
};

// ════════════════════════════════════════════════════════════════════════════
// ASISTENTE IA (OpenAI GPT-3.5)
// ════════════════════════════════════════════════════════════════════════════
const asistirMotivo = async (tipoSeleccionado, setIaMotivo, setIaCargando) => {
  if (!tipoSeleccionado) {
    Alert.alert('Aviso', 'Primero selecciona el tipo de permiso');
    return;
  }
  if (!OPENAI_KEY) {
    Alert.alert('IA no disponible', 'La clave de OpenAI no está configurada en este entorno.');
    return;
  }
  setIaCargando(true);
  setIaMotivo('');
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        max_tokens: 150,
        messages: [{
          role: 'system',
          content: 'Eres asistente de Recursos Humanos de Comercios Universales. Redacta motivos de permisos laborales de forma profesional y breve en español. Solo responde con el motivo redactado, sin explicaciones adicionales.'
        }, {
          role: 'user',
          content: `Redacta un motivo profesional para un permiso de tipo "${tipoSeleccionado}" para un empleado de empresa comercial.`
        }]
      })
    });
    const data = await res.json();
    if (data.error) {
      Alert.alert('Error OpenAI', data.error.message);
      setIaCargando(false);
      return;
    }
    const texto = data.choices?.[0]?.message?.content?.trim();
    if (texto) setIaMotivo(texto);
    else Alert.alert('Error', 'Respuesta inesperada: ' + JSON.stringify(data).slice(0, 200));
  } catch(e) {
    Alert.alert('Error de conexión', e.message);
  }
  setIaCargando(false);
};

// ════════════════════════════════════════════════════════════════════════════
// TIPOS DE PERMISO
// ════════════════════════════════════════════════════════════════════════════
const TIPOS = [
  { label: 'Vacaciones', icon: '🏖️', color: '#E8F4FD', iconColor: '#4A9EC4', descuenta: true  },
  { label: 'IGSS',       icon: '🏥', color: '#EDF7ED', iconColor: '#4CAF7D', descuenta: false },
  { label: 'Personal',   icon: '👤', color: '#EDE8FD', iconColor: '#7C4DCC', descuenta: false },
];

// ─── HELPERS DE UI ───────────────────────────────────────────────────────────
const colorEstado = (e) => {
  if (e === 'Aprobado')  return '#4CAF7D';
  if (e === 'Rechazado') return '#EF5350';
  return '#F59E0B';
};
const iconoEstado = (e) => {
  if (e === 'Aprobado')  return '✅';
  if (e === 'Rechazado') return '❌';
  return '⏳';
};
const rolLabel = (r) => {
  if (r === 'gerente')    return '👑 Gerente General';
  if (r === 'supervisor') return '🏢 Supervisor';
  if (r === 'jefe')       return '👔 Jefe de Área';
  if (r === 'auxiliar')   return '🗂️ Auxiliar';
  return '👤 Empleado';
};

// ════════════════════════════════════════════════════════════════════════════
// FECHAS DE INGRESO (HARDCODEADAS)
// ════════════════════════════════════════════════════════════════════════════
const FECHAS_INGRESO_EXCEL = {
  "861": "01/11/2019","938": "01/05/2022","1005": "01/07/2023","1035": "09/01/2024",
  "1036": "05/01/2024","1053": "01/06/2024","1057": "22/07/2024","1089": "01/06/2025",
  "1090": "01/06/2025","1091": "01/06/2025","1104": "04/09/2025","1105": "04/09/2025",
  "1115": "07/11/2025","1117": "01/11/2025","1131": "01/02/2026","937": "07/03/2022",
  "943": "01/05/2022","948": "01/05/2022","949": "01/05/2022","950": "01/05/2022",
  "953": "01/05/2022","955": "01/05/2022","1061": "11/09/2024","1120": "21/11/2025",
  "789": "01/12/2016","982": "10/02/2023","1079": "05/03/2025","1087": "01/05/2025",
  "1097": "11/08/2025","920": "28/07/2021","935": "14/02/2022","705": "01/08/2014",
  "1018": "16/08/2023","1033": "05/12/2023","1046": "01/03/2024","1055": "11/07/2024",
  "1056": "22/07/2024","1059": "01/08/2024","1062": "07/10/2024","1074": "01/12/2024",
  "1078": "01/02/2025","1082": "22/03/2025","1086": "02/05/2025","1110": "13/10/2025",
  "1126": "19/01/2026","1130": "09/02/2026","505": "01/12/2012","731": "20/04/2015",
  "778": "14/10/2016","804": "08/05/2018","807": "01/10/2018","827": "01/11/2019",
  "830": "01/11/2019","894": "04/11/2020","904": "19/01/2021","905": "01/02/2021",
  "917": "10/05/2021","930": "03/01/2022","996": "16/05/2023","1044": "26/02/2024",
  "1080": "13/03/2025","1113": "04/11/2025","1125": "12/01/2026","697": "19/05/2014",
  "814": "06/11/2018","833": "01/11/2019","834": "01/11/2019","882": "13/07/2020",
  "941": "01/05/2022","995": "03/05/2023","1000": "09/06/2023","1006": "01/07/2023",
  "1007": "24/07/2023","1010": "21/07/2023","1022": "06/10/2023","1023": "04/10/2023",
  "1024": "02/10/2023","1025": "23/10/2023","1034": "13/12/2023","1040": "16/02/2024",
  "1042": "16/02/2024","1047": "01/03/2024","1049": "15/04/2024","1052": "27/05/2024",
  "1058": "06/08/2024","1063": "07/10/2024","1064": "07/10/2024","1067": "16/10/2024",
  "1068": "17/10/2024","1071": "07/11/2024","1075": "16/01/2025","1076": "16/01/2025",
  "1083": "05/04/2025","1084": "04/04/2025","1085": "21/04/2025","1088": "21/05/2025",
  "1092": "23/06/2025","1093": "04/07/2025","1094": "04/07/2025","1095": "24/07/2025",
  "1096": "16/07/2025","1098": "11/08/2025","1099": "11/08/2025","1100": "01/08/2025",
  "1101": "07/08/2025","1102": "04/09/2025","1103": "04/09/2025","1106": "25/09/2025",
  "1107": "25/09/2025","1108": "25/09/2025","1109": "09/10/2025","1111": "16/10/2025",
  "1112": "16/10/2025","1114": "03/11/2025","1116": "10/11/2025","1121": "01/12/2025",
  "1122": "01/12/2025","1123": "03/12/2025","1124": "06/12/2025","1129": "01/02/2026",
  "784": "26/10/2016","821": "01/03/2019","839": "01/11/2019","842": "01/11/2019",
  "856": "01/11/2019","867": "08/01/2020","880": "08/06/2020","884": "03/08/2020",
  "887": "21/09/2020","893": "03/11/2020","897": "21/11/2020","903": "01/01/2021",
  "910": "16/02/2021","921": "04/08/2021","928": "24/11/2021","931": "04/01/2022",
  "944": "01/05/2022","952": "01/05/2022","977": "17/12/2022","979": "16/01/2023",
  "983": "16/02/2023","987": "16/03/2023","992": "17/04/2023","783": "19/10/2016",
  "947": "01/05/2022","1045": "21/02/2024","1081": "25/03/2025","1118": "01/11/2025",
  "723": "01/02/2015","773": "01/08/2016","803": "01/03/2018","902": "08/01/2021",
  "915": "16/04/2021","939": "01/05/2022"
};

// ════════════════════════════════════════════════════════════════════════════
// CARGA MASIVA DE FECHAS DE INGRESO
// ════════════════════════════════════════════════════════════════════════════
const ejecutarCargaFechas = async (onProgress) => {
  const codigos = Object.keys(FECHAS_INGRESO_EXCEL);
  let ok = 0, noEncontrado = 0, errores = 0;
  for (let i = 0; i < codigos.length; i++) {
    const codigo = codigos[i];
    const fecha  = FECHAS_INGRESO_EXCEL[codigo];
    try {
      const res = await fetch(`${DB_URL}:runQuery?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'usuarios' }],
            where: { fieldFilter: { field: { fieldPath: 'codigo' }, op: 'EQUAL', value: { stringValue: codigo } } },
            limit: 1
          }
        })
      });
      const data = await res.json();
      if (!data[0]?.document) { noEncontrado++; }
      else {
        const docId = data[0].document.name.split('/').pop();
        await fetch(`${DB_URL}/usuarios/${docId}?updateMask.fieldPaths=fechaIngreso&key=${API_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { fechaIngreso: { stringValue: fecha } } })
        });
        ok++;
      }
    } catch { errores++; }
    if (onProgress) onProgress(i + 1, codigos.length, ok, noEncontrado, errores);
    await new Promise(r => setTimeout(r, 150));
  }
  return { total: codigos.length, ok, noEncontrado, errores };
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — App
// ════════════════════════════════════════════════════════════════════════════
export default function App() {

  // ─── Estados de navegación ───────────────────────────────────────────────
  const [modoPantalla,    setModoPantalla]    = useState('app');
  const [pantalla,        setPantalla]        = useState('login');
  const [tabActivo,       setTabActivo]       = useState('inicio');

  // ─── Estados de login ────────────────────────────────────────────────────
  const [codigo,          setCodigo]          = useState('');
  const [password,        setPassword]        = useState('');
  const [loginCargando,   setLoginCargando]   = useState(false);

  // ─── Estados de datos globales ───────────────────────────────────────────
  const [usuario,         setUsuario]         = useState(null);
  const [usuarios,        setUsuarios]        = useState([]);
  const [permisos,        setPermisos]        = useState([]);
  const [cargando,        setCargando]        = useState(false);

  // ─── Estados de nueva solicitud ──────────────────────────────────────────
  const [tipoSeleccionado,setTipoSeleccionado] = useState('');
  const [subtipoIGSS,     setSubtipoIGSS]      = useState(''); // 'Consulta externa' | 'Emergencia'
  const [fechaInicio,     setFechaInicio]     = useState('');
  const [fechaFin,        setFechaFin]        = useState('');
  const [motivo,          setMotivo]          = useState('');
  const [iaMotivo,        setIaMotivo]        = useState('');
  const [iaCargando,      setIaCargando]      = useState(false);

  // ─── Estados de días y perfil ────────────────────────────────────────────
  const [diasDisponibles, setDiasDisponibles] = useState(15);
  const [fotoPerfil,      setFotoPerfil]      = useState(null);

  // ─── Estados de notificaciones ───────────────────────────────────────────
  const [notificaciones,     setNotificaciones]     = useState([]);
  const [panelNotif,         setPanelNotif]         = useState(false);
  const [notifCargando,      setNotifCargando]      = useState(false);

  // ─── Estados de cambio de contraseña ────────────────────────────────────
  const [modalPassword,   setModalPassword]   = useState(false);
  const [passActual,      setPassActual]      = useState('');
  const [passNueva,       setPassNueva]       = useState('');
  const [passConfirm,     setPassConfirm]     = useState('');
  const [passGuardando,   setPassGuardando]   = useState(false);

  // ─── Estados de historial ────────────────────────────────────────────────
  const [filtroHistorial, setFiltroHistorial] = useState('Todos');

  // ─── Estados de carga masiva de fechas ───────────────────────────────────
  const [cargaProgreso,  setCargaProgreso]  = useState(null);
  const [cargaResultado, setCargaResultado] = useState(null);
  const [cargaCoriendo,  setCargaCoriendo]  = useState(false);

  // ─── Permisos especiales del panel admin delegado ────────────────────────
  const [permisosAdmin, setPermisosAdmin] = useState({
    canCreateUsers: false,
    canLoadExcel:   false,
    canAprobar:     false,
  });

  // ════════════════════════════════════════════════════════════════════════
  // FOTO DE PERFIL
  // ════════════════════════════════════════════════════════════════════════
  const seleccionarFoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],   // FIX: MediaTypeOptions.Images deprecado en SDK 50+
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const b64     = result.assets[0].base64;
        const dataUrl = `data:image/jpeg;base64,${b64}`;

        setFotoPerfil(dataUrl);
        await AsyncStorage.setItem(`foto_perfil_${usuario.id}`, dataUrl);

        setCargando(true);
        try {
          await fsUpdate('usuarios', usuario.id, { fotoPerfil: dataUrl });
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

  // ════════════════════════════════════════════════════════════════════════
  // SESIÓN PERSISTENTE — useEffect al montar la app
  // FIX-C: ahora llama a acumularDiasPendientes(u) para que los días se
  // acumulen también cuando la sesión se recupera desde AsyncStorage,
  // no solo cuando el usuario hace login manual.
  // ════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const recuperarSesion = async () => {
      try {
        const sesionGuardada = await AsyncStorage.getItem('sesion_usuario');
        if (sesionGuardada) {
          const u = JSON.parse(sesionGuardada);
          const todosUsuarios = await fsGet('usuarios');
          setUsuarios(todosUsuarios);
          setUsuario(u);

          // FIX-C: acumular días pendientes igual que en el login manual
          const diasFinales = await acumularDiasPendientes(u);
          setDiasDisponibles(diasFinales);

          setPermisosAdmin({
            canCreateUsers: u.canCreateUsers === 'true',
            canLoadExcel:   u.canLoadExcel   === 'true',
            canAprobar:     u.canAprobar     === 'true',
          });
          setPantalla('app');
          setTabActivo('inicio');
          cargarPermisos(u);
          cargarNotificaciones(u);

          const fotoCloud = u.fotoPerfil;
          if (fotoCloud) {
            setFotoPerfil(fotoCloud);
            await AsyncStorage.setItem(`foto_perfil_${u.id}`, fotoCloud);
          } else {
            const fotoLocal = await AsyncStorage.getItem(`foto_perfil_${u.id}`);
            if (fotoLocal) setFotoPerfil(fotoLocal);
          }
        }
      } catch (e) {
        console.log('No se pudo recuperar sesión:', e.message);
      }
    };
    recuperarSesion();
  }, []);

  // ════════════════════════════════════════════════════════════════════════
  // CARGAR PERMISOS
  // ════════════════════════════════════════════════════════════════════════
  const cargarPermisos = async (usuarioRef) => {
    setCargando(true);
    const data = await fsGet('permisos');
    setPermisos(data);
    const ref = usuarioRef ?? usuario;
    if (ref?.id) {
      try {
        const res = await fetch(`${DB_URL}/usuarios/${ref.id}?key=${API_KEY}`);
        const doc = await res.json();
        if (doc.fields?.dias?.stringValue) {
          setDiasDisponibles(parseInt(doc.fields.dias.stringValue) || 0);
        }
      } catch { }
    }
    setCargando(false);
  };

  // ════════════════════════════════════════════════════════════════════════
  // CARGAR NOTIFICACIONES
  // FIX-B: ahora devuelve la lista fresca para que abrirPanelNotif
  // pueda pasarla directamente a marcarTodasLeidas, evitando el problema
  // de closure sobre el estado anterior.
  // ════════════════════════════════════════════════════════════════════════
  const cargarNotificaciones = async (usuarioParam) => {
    const ref = usuarioParam ?? usuario;
    if (!ref?.codigo) return [];
    setNotifCargando(true);
    try {
      const res  = await fetch(`${DB_URL}:runQuery?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'notificaciones' }],
            where: { fieldFilter: { field: { fieldPath: 'codigo' }, op: 'EQUAL', value: { stringValue: ref.codigo } } },
            orderBy: [{ field: { fieldPath: 'fecha' }, direction: 'DESCENDING' }],
            limit: 30
          }
        })
      });
      const data = await res.json();
      if (!data[0]?.document) {
        setNotificaciones([]);
        setNotifCargando(false);
        return [];
      }
      const lista = data
        .filter(r => r.document)
        .map(r => {
          const id = r.document.name.split('/').pop();
          const f  = r.document.fields;
          return {
            id,
            codigo: f.codigo?.stringValue ?? '',
            titulo: f.titulo?.stringValue ?? '',
            cuerpo: f.cuerpo?.stringValue ?? '',
            leido:  f.leido?.stringValue === 'true',
            fecha:  f.fecha?.stringValue ?? ''
          };
        });
      setNotificaciones(lista);
      setNotifCargando(false);
      return lista;   // FIX-B: retornar la lista fresca
    } catch(e) {
      console.log('Error cargando notificaciones:', e.message);
      setNotifCargando(false);
      return [];
    }
  };

  const marcarTodasLeidas = async (lista) => {
    const noLeidas = lista.filter(n => !n.leido);
    for (const n of noLeidas) {
      try { await fsUpdate('notificaciones', n.id, { leido: 'true' }); } catch {}
    }
    setNotificaciones(prev => prev.map(n => ({ ...n, leido: true })));
  };

  const notifNoLeidas = notificaciones.filter(n => !n.leido).length;

  // ════════════════════════════════════════════════════════════════════════
  // FIX-B: abrirPanelNotif
  // Antes usaba setTimeout con el estado `notificaciones` capturado en
  // el cierre (closure), que podía ser la lista vieja.
  // Ahora espera la lista fresca que devuelve cargarNotificaciones() y
  // la pasa directamente a marcarTodasLeidas().
  // ════════════════════════════════════════════════════════════════════════
  const abrirPanelNotif = async () => {
    setPanelNotif(true);
    const listaFresca = await cargarNotificaciones();   // FIX-B: obtener lista actualizada
    await marcarTodasLeidas(listaFresca);               // FIX-B: usar lista fresca, no estado viejo
  };

  // ════════════════════════════════════════════════════════════════════════
  // handleCambiarTab
  // ════════════════════════════════════════════════════════════════════════
  const handleCambiarTab = (tab) => {
    setTabActivo(tab);
    cargarPermisos();
  };

  // ════════════════════════════════════════════════════════════════════════
  // PERSISTIR DÍAS
  // ════════════════════════════════════════════════════════════════════════
  const persistirDias = async (usuarioId, nuevoDias, extras = {}) => {
    try {
      await fsUpdate('usuarios', usuarioId, { dias: String(nuevoDias), ...extras });
    } catch (e) {
      console.warn('No se pudo persistir días:', e.message);
    }
  };

  // ════════════════════════════════════════════════════════════════════════
  // ACUMULAR DÍAS PENDIENTES
  // ════════════════════════════════════════════════════════════════════════
  const acumularDiasPendientes = async (u) => {
    if (!u?.fechaIngreso) return parseInt(u?.dias) || 0;
    const mesesPendientes = calcularMesesPendientes(u.fechaIngreso, u.ultimaAcumulacion);
    if (mesesPendientes <= 0) return parseInt(u.dias) || 0;
    const diasActuales  = parseFloat(u.dias) || 0;
    const diasGanados   = mesesPendientes * DIAS_POR_MES;
    const diasNuevos    = Math.round((diasActuales + diasGanados) * 100) / 100;
    const nuevaAcumulacion = ultimoMesCerrado();
    await persistirDias(u.id, diasNuevos, { ultimaAcumulacion: nuevaAcumulacion });
    Alert.alert(
      '📅 Días acumulados',
      `Se sumaron ${diasGanados.toFixed(2)} días\n(${mesesPendientes} mes${mesesPendientes > 1 ? 'es' : ''} × 1.25)\n\nTotal disponible: ${diasNuevos} días`
    );
    return diasNuevos;
  };

  // ════════════════════════════════════════════════════════════════════════
  // CAMBIAR CONTRASEÑA
  // ════════════════════════════════════════════════════════════════════════
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
      await fsUpdate('usuarios', usuario.id, { password: passNueva });
      setModalPassword(false);
      setPassActual(''); setPassNueva(''); setPassConfirm('');
      Alert.alert('✅', 'Contraseña actualizada correctamente');
    } catch(e) { Alert.alert('Error', e.message); }
    setPassGuardando(false);
  };

  // ════════════════════════════════════════════════════════════════════════
  // LOGIN
  // ════════════════════════════════════════════════════════════════════════
  const handleLogin = async () => {
    if (!codigo || !password) { Alert.alert('Error', 'Ingresa tu código y contraseña'); return; }
    setLoginCargando(true);
    try {
      const u = await buscarUsuario(codigo.toUpperCase());
      if (!u) { Alert.alert('Error', 'Código de empleado no encontrado'); setLoginCargando(false); return; }
      if (u.password !== password) { Alert.alert('Error', 'Contraseña incorrecta'); setLoginCargando(false); return; }

      const todosUsuarios = await fsGet('usuarios');
      setUsuarios(todosUsuarios);
      setUsuario(u);

      const diasFinales = await acumularDiasPendientes(u);
      setDiasDisponibles(diasFinales);
      registrarPushToken(u.id);
      setPermisosAdmin({
        canCreateUsers: u.canCreateUsers === 'true',
        canLoadExcel:   u.canLoadExcel   === 'true',
        canAprobar:     u.canAprobar     === 'true',
      });
      await AsyncStorage.setItem('sesion_usuario', JSON.stringify(u));

      const fotoCloud = u.fotoPerfil;
      if (fotoCloud) {
        setFotoPerfil(fotoCloud);
        await AsyncStorage.setItem(`foto_perfil_${u.id}`, fotoCloud);
      } else {
        const fotoLocal = await AsyncStorage.getItem(`foto_perfil_${u.id}`);
        if (fotoLocal) setFotoPerfil(fotoLocal);
      }

      setPantalla('app');
      setTabActivo('inicio');
      cargarPermisos(u);
      cargarNotificaciones(u);
    } catch {
      Alert.alert('Error', 'No se pudo conectar. Intenta de nuevo.');
    }
    setLoginCargando(false);
  };

  // ════════════════════════════════════════════════════════════════════════
  // ENVIAR SOLICITUD
  // ════════════════════════════════════════════════════════════════════════
  const handleEnviar = async () => {
    if (!tipoSeleccionado || !fechaInicio || !fechaFin || !motivo) {
      Alert.alert('Error', 'Completa todos los campos'); return;
    }
    if (tipoSeleccionado === 'IGSS' && !subtipoIGSS) {
      Alert.alert('Error', 'Selecciona el tipo de consulta IGSS'); return;
    }
    const errorFecha = validarFechas(fechaInicio, fechaFin);
    if (errorFecha) { Alert.alert('Fecha inválida', errorFecha); return; }
    setCargando(true);

    // Tipo final incluye subtipo si aplica
    const tipoFinal = tipoSeleccionado === 'IGSS'
      ? `IGSS - ${subtipoIGSS}`
      : tipoSeleccionado;

    try {
      await fsAdd('permisos', {
        nombre:       usuario.nombre,
        codigo:       usuario.codigo,
        cargo:        usuario.cargo,
        rol:          usuario.rol,
        departamento: usuario.departamento || '',
        tipo:         tipoFinal,
        fechaInicio, fechaFin, motivo,
        estado:       'Pendiente'
      });

      const aprobadores = usuarios.filter(u =>
        u.codigo !== usuario.codigo && puedeAprobarA(u, usuario)
      );
      for (const apr of aprobadores) {
        await crearNotificacion(
          apr.codigo,
          `📋 Nueva solicitud de permiso`,
          `${usuario.nombre} solicitó ${tipoFinal} del ${fechaInicio} al ${fechaFin}`
        );
        if (apr.pushToken) enviarNotificacion(apr.pushToken, '📋 Nueva solicitud', `${usuario.nombre} solicitó ${tipoFinal}`);
      }

      Alert.alert('✅ Enviado', 'Tu solicitud fue enviada correctamente');
      setTipoSeleccionado(''); setSubtipoIGSS(''); setFechaInicio(''); setFechaFin(''); setMotivo('');
      await cargarPermisos(usuario);
      setTabActivo('inicio');
    } catch (e) { Alert.alert('Error', 'No se pudo enviar: ' + e.message); }
    setCargando(false);
  };

  // ════════════════════════════════════════════════════════════════════════
  // APROBAR / RECHAZAR PERMISO
  // ════════════════════════════════════════════════════════════════════════
  const handleCambiarEstado = async (id, estado, descuentaOverride = null) => {
    setCargando(true);
    try {
      const permiso  = permisos.find(p => p.id === id);
      const esIGSS   = permiso?.tipo?.startsWith('IGSS');
      const esVacaciones = permiso?.tipo === 'Vacaciones';
      // Vacaciones siempre descuenta. IGSS nunca. Personal: según decisión del jefe.
      const debeDescontar = esVacaciones
        ? true
        : esIGSS
          ? false
          : descuentaOverride === true;

      await fsUpdate('permisos', id, { estado, descuento: debeDescontar ? 'si' : 'no' });

      if (estado === 'Aprobado' && debeDescontar) {
        const diasUsados = calcularDias(permiso.fechaInicio, permiso.fechaFin);

        let solicitanteId   = null;
        let diasActualesFS  = 15;
        let pushTokenSolic  = null;
        try {
          const qRes  = await fetch(`${DB_URL}:runQuery?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              structuredQuery: {
                from: [{ collectionId: 'usuarios' }],
                where: { fieldFilter: { field: { fieldPath: 'codigo' }, op: 'EQUAL', value: { stringValue: permiso.codigo } } },
                limit: 1
              }
            })
          });
          const qData = await qRes.json();
          if (qData[0]?.document) {
            const docFS      = qData[0].document;
            solicitanteId    = docFS.name.split('/').pop();
            diasActualesFS   = parseInt(docFS.fields?.dias?.stringValue ?? '15');
            pushTokenSolic   = docFS.fields?.pushToken?.stringValue ?? null;
          }
        } catch (e) { console.warn('No se pudo leer solicitante de Firestore:', e.message); }

        if (solicitanteId) {
          const nuevosDias = Math.max(0, diasActualesFS - diasUsados);
          await persistirDias(solicitanteId, nuevosDias);

          if (permiso.codigo === usuario?.codigo) {
            setDiasDisponibles(nuevosDias);
          }
          setUsuarios(prev =>
            prev.map(u => u.codigo === permiso.codigo ? { ...u, dias: String(nuevosDias) } : u)
          );

          enviarNotificacion(pushTokenSolic, '✅ Permiso aprobado', `Tu solicitud de ${permiso.tipo} fue aprobada.`);
          await crearNotificacion(permiso.codigo, '✅ Permiso aprobado', `Tu solicitud de ${permiso.tipo} del ${permiso.fechaInicio} al ${permiso.fechaFin} fue aprobada.`);

          Alert.alert(
            '✅ Aprobada',
            `Empleado: ${permiso.nombre}\nTipo: ${permiso.tipo}\nDías descontados: ${diasUsados}\nDías restantes: ${nuevosDias}`
          );
        } else {
          Alert.alert('✅ Aprobada', `Permiso aprobado.\nNo se pudo actualizar días (empleado no encontrado).`);
        }

      } else if (estado === 'Aprobado') {
        Alert.alert('✅ Aprobada', `Permiso de ${permiso?.tipo} aprobado.\nNo descuenta días de vacaciones.`);
      } else {
        (async () => {
          try {
            const r = await fetch(`${DB_URL}:runQuery?key=${API_KEY}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                structuredQuery: {
                  from: [{ collectionId: 'usuarios' }],
                  where: { fieldFilter: { field: { fieldPath: 'codigo' }, op: 'EQUAL', value: { stringValue: permiso.codigo } } },
                  limit: 1
                }
              })
            });
            const d  = await r.json();
            const tk = d[0]?.document?.fields?.pushToken?.stringValue;
            enviarNotificacion(tk, '❌ Permiso rechazado', `Tu solicitud de ${permiso?.tipo} fue rechazada.`);
            await crearNotificacion(permiso.codigo, '❌ Permiso rechazado', `Tu solicitud de ${permiso?.tipo} del ${permiso?.fechaInicio} al ${permiso?.fechaFin} fue rechazada.`);
          } catch {}
        })();
        Alert.alert('❌ Rechazada', 'La solicitud fue rechazada. No se descontaron días.');
      }
      await cargarPermisos();
    } catch (e) { Alert.alert('Error', 'No se pudo actualizar: ' + e.message); }
    setCargando(false);
  };

  // ─── Variables derivadas ─────────────────────────────────────────────────
  const misPermisos = permisos.filter(p => p.codigo === usuario?.codigo);

  const permisosParaAprobar = permisos.filter(p => {
    if (p.codigo === usuario?.codigo) return false;
    if (usuario?.rol === 'gerente') return true;
    const solicitante = usuarios.find(u => u.codigo === p.codigo);
    if (solicitante) return puedeAprobarA(usuario, solicitante);
    if (p.rol) {
      return (
        p.departamento === usuario?.departamento &&
        (JERARQUIA[usuario?.rol] ?? 0) > (JERARQUIA[p.rol] ?? 0)
      );
    }
    return p.departamento === usuario?.departamento;
  });

  const pendientesCount = permisosParaAprobar.filter(p => p.estado === 'Pendiente').length;
  const barWidth        = `${Math.min(100, (diasDisponibles / 15) * 100)}%`;
  const puedeAprobar    = (JERARQUIA[usuario?.rol] ?? 0) > 0;

  // ════════════════════════════════════════════════════════════════════════
  // PANTALLA SUPERADMIN
  // ════════════════════════════════════════════════════════════════════════
  if (modoPantalla === 'superadmin') return (
    <SuperAdmin onSalir={() => setModoPantalla('app')} />
  );

  // ════════════════════════════════════════════════════════════════════════
  // PANTALLA DE LOGIN
  // ════════════════════════════════════════════════════════════════════════
  if (pantalla === 'login') return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AZUL }}>
      <StatusBar barStyle="light-content" backgroundColor={AZUL} />
      <View style={s.loginTop}>
        <LogoAnimado />
        <Text style={s.loginAppName}>comercios{'\n'}universales</Text>
      </View>
      <View style={s.loginCard}>
        <Text style={s.loginTitle}>Bienvenido</Text>
        <Text style={s.loginSub}>Ingresa con tu código de empleado</Text>
        <Text style={s.loginLabel}>Código de Empleado</Text>
        <TextInput style={s.loginInput} placeholder="Ingresa tu Codigo de empleado"
          value={codigo} onChangeText={setCodigo}
          autoCapitalize="characters" placeholderTextColor="#aaa" />
        <Text style={s.loginLabel}>Contraseña</Text>
        <TextInput style={s.loginInput} placeholder="Ingresa tu contraseña"
          value={password} onChangeText={setPassword}
          secureTextEntry placeholderTextColor="#aaa" />
        {loginCargando
          ? <ActivityIndicator color={AZUL} style={{ marginTop: 20 }} />
          : <TouchableOpacity style={s.loginBtn} onPress={handleLogin}>
              <Text style={s.loginBtnText}>Ingresar →</Text>
            </TouchableOpacity>
        }
        <TouchableOpacity
          onPress={() => setModoPantalla('superadmin')}
          style={{ alignItems: 'center', marginTop: 16, marginBottom: 4 }}>
          <Text style={{ color: '#ccc', fontSize: 11 }}>⚙️ Acceso administrador del sistema</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );

  // ════════════════════════════════════════════════════════════════════════
  // TAB: INICIO
  // ════════════════════════════════════════════════════════════════════════
  const renderInicio = () => (
    <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.saludoBox}>
        <Text style={s.saludoHola}>Hola, {usuario.nombre?.split(' ')[0]} 👋</Text>
        <Text style={s.saludoCargo}>{usuario.cargo} | {usuario.codigo}</Text>
        {usuario.departamento ? <Text style={s.saludoDept}>📁 {usuario.departamento}</Text> : null}
        <View style={s.rolTag}>
          <Text style={s.rolTagText}>{rolLabel(usuario.rol)}</Text>
        </View>
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statLabel}>Días disponibles:</Text>
            <View style={s.statBar}><View style={[s.statFill, { width: barWidth }]} /></View>
            <Text style={s.statVal}>{Number.isInteger(diasDisponibles) ? diasDisponibles : diasDisponibles.toFixed(2)}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statLabel}>Mis pendientes:</Text>
            <Text style={[s.statVal, { color: '#F59E0B', fontSize: 18 }]}>
              {misPermisos.filter(p => p.estado === 'Pendiente').length}
            </Text>
          </View>
          {puedeAprobar && (
            <>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statLabel}>Por aprobar:</Text>
                <Text style={[s.statVal, { color: '#EF5350', fontSize: 18 }]}>
                  {pendientesCount}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.modulosScroll}>
        {TIPOS.map(t => (
          <TouchableOpacity key={t.label} style={[s.moduloCard, { backgroundColor: t.color }]}
            onPress={() => { setTipoSeleccionado(t.label); handleCambiarTab('nuevo'); }}>
            <Text style={s.moduloIcon}>{t.icon}</Text>
            <Text style={[s.moduloLabel, { color: t.iconColor }]}>{t.label}</Text>
            <Text style={[s.moduloFlecha, { color: t.iconColor }]}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={s.seccionRow}>
        <Text style={s.seccionTitle}>Mi Historial Reciente</Text>
      </View>
      {cargando && <ActivityIndicator color={AZUL} style={{ margin: 20 }} />}
      {!cargando && misPermisos.length === 0 && (
        <View style={s.vacio}><Text style={s.vacioTexto}>No tienes solicitudes aún</Text></View>
      )}
      {misPermisos.slice(0, 3).map(p => (
        <View key={p.id} style={s.historialItem}>
          <View style={s.historialIconBox}>
            <Text style={s.historialIconText}>{TIPOS.find(t => t.label === p.tipo)?.icon ?? '📄'}</Text>
          </View>
          <View style={s.historialInfo}>
            <Text style={s.historialTipo}>{p.tipo}</Text>
            <Text style={s.historialFecha}>{p.fechaInicio} — {p.fechaFin}</Text>
          </View>
          <View style={[s.estadoTag, { backgroundColor: colorEstado(p.estado) + '20' }]}>
            <Text style={[s.estadoTagText, { color: colorEstado(p.estado) }]}>
              {iconoEstado(p.estado)} {p.estado}
            </Text>
          </View>
        </View>
      ))}
      {misPermisos.length > 3 && (
        <TouchableOpacity style={s.verTodosBtn} onPress={() => handleCambiarTab('historial')}>
          <Text style={s.verTodosBtnText}>Ver todo el historial →</Text>
        </TouchableOpacity>
      )}
      <View style={{ height: 30 }} />
    </ScrollView>
  );

  // ════════════════════════════════════════════════════════════════════════
  // TAB: NUEVA SOLICITUD
  // ════════════════════════════════════════════════════════════════════════
  const renderNuevo = () => {
    const errorFechaLive = fechaInicio && fechaFin ? validarFechas(fechaInicio, fechaFin) : null;

    return (
      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Nueva Solicitud</Text>
        <Text style={s.pageSub}>Selecciona el tipo de permiso</Text>
        <View style={s.tiposGrid}>
          {TIPOS.map(t => (
            <TouchableOpacity key={t.label}
              style={[s.tipoOpcion, { backgroundColor: t.color }, tipoSeleccionado === t.label && s.tipoOpcionActivo]}
              onPress={() => { setTipoSeleccionado(t.label); setSubtipoIGSS(''); }}>
              <Text style={s.tipoOpcionIcon}>{t.icon}</Text>
              <Text style={[s.tipoOpcionLabel, { color: t.iconColor }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Selector de subtipo para IGSS */}
        {tipoSeleccionado === 'IGSS' && (
          <View style={{ marginBottom: 16 }}>
            <Text style={s.formLabel}>Tipo de consulta IGSS</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {['Consulta externa', 'Emergencia'].map(sub => (
                <TouchableOpacity key={sub}
                  onPress={() => setSubtipoIGSS(sub)}
                  style={{
                    flex: 1, padding: 12, borderRadius: 10, alignItems: 'center',
                    backgroundColor: subtipoIGSS === sub ? '#4CAF7D' : '#EDF7ED',
                    borderWidth: 2,
                    borderColor: subtipoIGSS === sub ? '#4CAF7D' : '#C8E6C9',
                  }}>
                  <Text style={{ fontWeight: '700', color: subtipoIGSS === sub ? 'white' : '#2E7D32' }}>
                    {sub === 'Consulta externa' ? '🏥' : '🚨'} {sub}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <Text style={s.formLabel}>Fecha de Inicio</Text>
        <TextInput
          style={[s.formInput, fechaInicio && !REGEX_FECHA.test(fechaInicio) && s.formInputError]}
          placeholder="DD/MM/AAAA  (ej: 10032026)"
          value={fechaInicio}
          onChangeText={(texto) => setFechaInicio(autoFormatearFecha(texto))}
          keyboardType="numeric"
          maxLength={10}
          placeholderTextColor="#aaa"
        />
        {fechaInicio && !REGEX_FECHA.test(fechaInicio) && (
          <Text style={s.errorMsg}>⚠️ Sigue escribiendo... (DD/MM/AAAA)</Text>
        )}

        <Text style={s.formLabel}>Fecha de Fin</Text>
        <TextInput
          style={[s.formInput, fechaFin && !REGEX_FECHA.test(fechaFin) && s.formInputError]}
          placeholder="DD/MM/AAAA  (ej: 15032026)"
          value={fechaFin}
          onChangeText={(texto) => setFechaFin(autoFormatearFecha(texto))}
          keyboardType="numeric"
          maxLength={10}
          placeholderTextColor="#aaa"
        />
        {fechaFin && !REGEX_FECHA.test(fechaFin) && (
          <Text style={s.errorMsg}>⚠️ Sigue escribiendo... (DD/MM/AAAA)</Text>
        )}
        {errorFechaLive && REGEX_FECHA.test(fechaInicio) && REGEX_FECHA.test(fechaFin) && (
          <Text style={s.errorMsg}>⚠️ {errorFechaLive}</Text>
        )}

        {fechaInicio && fechaFin && !errorFechaLive && (
          <View style={s.diasPreview}>
            <Text style={s.diasPreviewText}>
              📅 Duración: {calcularDias(fechaInicio, fechaFin)} día(s)
            </Text>
          </View>
        )}

        <Text style={s.formLabel}>Motivo</Text>
        <TextInput style={[s.formInput, { height: 90, textAlignVertical: 'top' }]}
          placeholder="Describe el motivo de tu solicitud..."
          value={motivo} onChangeText={setMotivo}
          multiline placeholderTextColor="#aaa" />

        {iaCargando
          ? <ActivityIndicator color="#7C4DCC" style={{ marginVertical: 8 }} />
          : <TouchableOpacity
              style={{ backgroundColor: '#EDE8FD', borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 8, flexDirection: 'row', justifyContent: 'center', gap: 6 }}
              onPress={() => asistirMotivo(tipoSeleccionado, setIaMotivo, setIaCargando)}>
              <Text style={{ color: '#7C4DCC', fontWeight: '700', fontSize: 13 }}>✨ Ayuda con el motivo</Text>
            </TouchableOpacity>
        }
        {iaMotivo ? (
          <View style={{ backgroundColor: '#F5F0FF', borderRadius: 12, padding: 14, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#7C4DCC' }}>
            <Text style={{ fontSize: 11, color: '#7C4DCC', fontWeight: '700', marginBottom: 6 }}>🤖 Sugerencia de IA:</Text>
            <Text style={{ fontSize: 13, color: '#333', lineHeight: 20 }}>{iaMotivo}</Text>
            <TouchableOpacity
              style={{ backgroundColor: '#7C4DCC', borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 10 }}
              onPress={() => { setMotivo(iaMotivo); setIaMotivo(''); }}>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>✅ Usar este motivo</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {cargando
          ? <ActivityIndicator color={AZUL} style={{ marginTop: 20 }} />
          : <TouchableOpacity style={s.enviarBtn} onPress={handleEnviar}>
              <Text style={s.enviarBtnText}>Enviar Solicitud 🚀</Text>
            </TouchableOpacity>
        }
        <View style={{ height: 30 }} />
      </ScrollView>
    );
  };

  // ════════════════════════════════════════════════════════════════════════
  // MODAL: CAMBIAR CONTRASEÑA
  // ════════════════════════════════════════════════════════════════════════
  const renderModalPassword = () => {
    if (!modalPassword) return null;
    return (
      <View style={{ position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end', zIndex:999 }}>
        <View style={{ backgroundColor:'white', borderTopLeftRadius:24, borderTopRightRadius:24, padding:24 }}>
          <Text style={[s.pageTitle, { marginBottom:16 }]}>🔒 Cambiar Contraseña</Text>
          {[
            { label:'Contraseña actual',    val:passActual,  set:setPassActual  },
            { label:'Nueva contraseña',     val:passNueva,   set:setPassNueva   },
            { label:'Confirmar contraseña', val:passConfirm, set:setPassConfirm },
          ].map(f => (
            <View key={f.label} style={{ marginBottom:12 }}>
              <Text style={s.formLabel}>{f.label}</Text>
              <TextInput style={s.formInput} secureTextEntry value={f.val}
                onChangeText={f.set} placeholder={f.label} placeholderTextColor="#aaa" />
            </View>
          ))}
          {passGuardando
            ? <ActivityIndicator color="#2C4A8C" style={{ margin:10 }} />
            : <TouchableOpacity style={s.enviarBtn} onPress={handleCambiarPassword}>
                <Text style={s.enviarBtnText}>💾 Guardar contraseña</Text>
              </TouchableOpacity>
          }
          <TouchableOpacity style={[s.verTodosBtn, { marginTop:8 }]} onPress={() => {
            setModalPassword(false); setPassActual(''); setPassNueva(''); setPassConfirm('');
          }}>
            <Text style={s.verTodosBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ════════════════════════════════════════════════════════════════════════
  // TAB: HISTORIAL
  // ════════════════════════════════════════════════════════════════════════
  const renderHistorial = () => {
    const FILTROS = ['Todos', 'Pendiente', 'Aprobado', 'Rechazado'];
    const permisosFiltered = filtroHistorial === 'Todos'
      ? misPermisos
      : misPermisos.filter(p => p.estado === filtroHistorial);

    return (
      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Mi Historial</Text>
        <Text style={s.pageSub}>Todas tus solicitudes de permiso</Text>
        <View style={s.resumenRow}>
          <View style={s.resumenItem}>
            <Text style={s.resumenNum}>{misPermisos.length}</Text>
            <Text style={s.resumenLabel}>Total</Text>
          </View>
          <View style={s.resumenItem}>
            <Text style={[s.resumenNum, { color: '#F59E0B' }]}>
              {misPermisos.filter(p => p.estado === 'Pendiente').length}
            </Text>
            <Text style={s.resumenLabel}>Pendientes</Text>
          </View>
          <View style={s.resumenItem}>
            <Text style={[s.resumenNum, { color: '#4CAF7D' }]}>
              {misPermisos.filter(p => p.estado === 'Aprobado').length}
            </Text>
            <Text style={s.resumenLabel}>Aprobados</Text>
          </View>
          <View style={s.resumenItem}>
            <Text style={[s.resumenNum, { color: '#EF5350' }]}>
              {misPermisos.filter(p => p.estado === 'Rechazado').length}
            </Text>
            <Text style={s.resumenLabel}>Rechazados</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          {FILTROS.map(f => (
            <TouchableOpacity
              key={f}
              style={[s.filtroPill, filtroHistorial === f && s.filtroPillActivo]}
              onPress={() => setFiltroHistorial(f)}>
              <Text style={[s.filtroPillText, filtroHistorial === f && s.filtroPillTextActivo]}>
                {f === 'Pendiente' ? '⏳ ' : f === 'Aprobado' ? '✅ ' : f === 'Rechazado' ? '❌ ' : '📋 '}{f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={s.btnActualizar} onPress={cargarPermisos}>
          <Text style={s.btnActualizarText}>🔄 Actualizar</Text>
        </TouchableOpacity>
        {cargando && <ActivityIndicator color={AZUL} style={{ margin: 20 }} />}
        {!cargando && permisosFiltered.length === 0 && (
          <View style={s.vacio}>
            <Text style={s.vacioTexto}>
              {filtroHistorial === 'Todos'
                ? 'No tienes solicitudes aún'
                : `No tienes solicitudes ${filtroHistorial.toLowerCase()}s`}
            </Text>
          </View>
        )}
        {!cargando && permisosFiltered.map(p => {
          const tipoInfo = TIPOS.find(t => t.label === p.tipo);
          return (
            <View key={p.id} style={[s.aprobarCard, p.estado === 'Pendiente' && s.aprobarCardPendiente]}>
              <View style={s.aprobarHeader}>
                <View style={[s.historialIconBox, { backgroundColor: tipoInfo?.color ?? AZUL_CLARO }]}>
                  <Text style={s.historialIconText}>{tipoInfo?.icon ?? '📄'}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.aprobarNombre}>{p.tipo}</Text>
                  <Text style={s.aprobarFecha}>📅 {p.fechaInicio} → {p.fechaFin}</Text>
                  <Text style={[s.aprobarFecha, { marginTop: 2 }]}>
                    {calcularDias(p.fechaInicio, p.fechaFin)} día(s)
                  </Text>
                </View>
                <View style={[s.estadoTag, { backgroundColor: colorEstado(p.estado) + '20' }]}>
                  <Text style={[s.estadoTagText, { color: colorEstado(p.estado) }]}>
                    {iconoEstado(p.estado)} {p.estado}
                  </Text>
                </View>
              </View>
              <View style={[s.aprobarDetalle, { marginTop: 8 }]}>
                <Text style={s.aprobarMotivo}>💬 {p.motivo}</Text>
              </View>
              {p.estado === 'Aprobado' && (
                <TouchableOpacity
                  style={{ marginTop:10, backgroundColor:'#EEF2FB', borderRadius:10, padding:10, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6 }}
                  onPress={() => generarPDF(p, usuario)}>
                  <Text style={{ color:'#2C4A8C', fontWeight:'700', fontSize:13 }}>📄 Descargar comprobante PDF</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
        <View style={{ height: 30 }} />
      </ScrollView>
    );
  };

  // ════════════════════════════════════════════════════════════════════════
  // TAB: APROBAR SOLICITUDES
  // ════════════════════════════════════════════════════════════════════════
  const renderAprobar = () => {
    const pendientes = permisosParaAprobar.filter(p => p.estado === 'Pendiente');
    const resto      = permisosParaAprobar.filter(p => p.estado !== 'Pendiente');
    const lista      = [...pendientes, ...resto];

    return (
      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Aprobar Solicitudes</Text>
        <Text style={s.pageSub}>
          {usuario?.rol === 'gerente'
            ? 'Vista completa — Todos los departamentos'
            : `Dept: ${usuario?.departamento} — ${rolLabel(usuario?.rol)}`}
        </Text>
        <View style={s.resumenRow}>
          <View style={s.resumenItem}>
            <Text style={s.resumenNum}>{permisosParaAprobar.length}</Text>
            <Text style={s.resumenLabel}>Total</Text>
          </View>
          <View style={s.resumenItem}>
            <Text style={[s.resumenNum, { color: '#F59E0B' }]}>{pendientes.length}</Text>
            <Text style={s.resumenLabel}>Pendientes</Text>
          </View>
          <View style={s.resumenItem}>
            <Text style={[s.resumenNum, { color: '#4CAF7D' }]}>
              {permisosParaAprobar.filter(p => p.estado === 'Aprobado').length}
            </Text>
            <Text style={s.resumenLabel}>Aprobados</Text>
          </View>
          <View style={s.resumenItem}>
            <Text style={[s.resumenNum, { color: '#EF5350' }]}>
              {permisosParaAprobar.filter(p => p.estado === 'Rechazado').length}
            </Text>
            <Text style={s.resumenLabel}>Rechazados</Text>
          </View>
        </View>
        <TouchableOpacity style={s.btnActualizar} onPress={cargarPermisos}>
          <Text style={s.btnActualizarText}>🔄 Actualizar lista</Text>
        </TouchableOpacity>
        {cargando && <ActivityIndicator color={AZUL} style={{ margin: 20 }} />}
        {!cargando && lista.length === 0 && (
          <View style={s.vacio}>
            <Text style={s.vacioTexto}>No hay solicitudes para aprobar</Text>
          </View>
        )}
        {!cargando && lista.map(p => (
          <View key={p.id} style={[s.aprobarCard, p.estado === 'Pendiente' && s.aprobarCardPendiente]}>
            <View style={s.aprobarHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.aprobarNombre}>{p.nombre}</Text>
                <Text style={s.aprobarCargo}>{p.cargo} | {p.codigo}</Text>
                <Text style={s.aprobarDept}>📁 {p.departamento} · {rolLabel(p.rol)}</Text>
              </View>
              <View style={[s.estadoTag, { backgroundColor: colorEstado(p.estado) + '20' }]}>
                <Text style={[s.estadoTagText, { color: colorEstado(p.estado) }]}>
                  {iconoEstado(p.estado)} {p.estado}
                </Text>
              </View>
            </View>
            <View style={s.aprobarDetalle}>
              <Text style={s.aprobarTipo}>{TIPOS.find(t => t.label === p.tipo)?.icon ?? '📄'} {p.tipo}</Text>
              <Text style={s.aprobarFecha}>📅 {p.fechaInicio} → {p.fechaFin} ({calcularDias(p.fechaInicio, p.fechaFin)} día(s))</Text>
              <Text style={s.aprobarMotivo}>💬 {p.motivo}</Text>
            </View>
            {p.estado === 'Pendiente' && (() => {
              const esPersonal = p.tipo === 'Personal';
              return (
                <View style={s.aprobarBtns}>
                  {esPersonal ? (
                    <>
                      <TouchableOpacity style={[s.btnAprobar, { flex: 1, backgroundColor: '#E8F5E9' }]}
                        onPress={() => handleCambiarEstado(p.id, 'Aprobado', false)}>
                        <Text style={[s.btnAprobarText, { color: '#2E7D32', fontSize: 12 }]}>✅ Aprobar{'\n'}sin descuento</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.btnAprobar, { flex: 1, backgroundColor: '#FFF3E0', marginHorizontal: 4 }]}
                        onPress={() => handleCambiarEstado(p.id, 'Aprobado', true)}>
                        <Text style={[s.btnAprobarText, { color: '#E65100', fontSize: 12 }]}>✅ Aprobar{'\n'}con descuento</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.btnRechazar}
                        onPress={() => handleCambiarEstado(p.id, 'Rechazado')}>
                        <Text style={s.btnRechazarText}>❌</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity style={s.btnAprobar}
                        onPress={() => handleCambiarEstado(p.id, 'Aprobado')}>
                        <Text style={s.btnAprobarText}>✅ Aprobar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.btnRechazar}
                        onPress={() => handleCambiarEstado(p.id, 'Rechazado')}>
                        <Text style={s.btnRechazarText}>❌ Rechazar</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              );
            })()}
          </View>
        ))}
        <View style={{ height: 30 }} />
      </ScrollView>
    );
  };

  // ════════════════════════════════════════════════════════════════════════
  // TAB: PERFIL
  // ════════════════════════════════════════════════════════════════════════
  const renderPerfil = () => (
    <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.perfilHeader}>
        <TouchableOpacity onPress={seleccionarFoto} style={{ marginBottom: 12 }}>
          {fotoPerfil
            ? <Image source={{ uri: fotoPerfil }} style={s.perfilAvatarFoto} />
            : <View style={s.perfilAvatar}>
                <Text style={s.perfilAvatarText}>
                  {usuario.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              </View>
          }
          <View style={s.perfilCamaraBtn}>
            <Text style={{ fontSize: 14 }}>📷</Text>
          </View>
        </TouchableOpacity>

        <Text style={s.perfilNombre}>{usuario.nombre}</Text>
        <Text style={s.perfilCargo}>{usuario.cargo}</Text>
        <View style={[s.estadoTag, { backgroundColor: '#E8F4FD', marginTop: 8 }]}>
          <Text style={[s.estadoTagText, { color: AZUL }]}>{rolLabel(usuario.rol)}</Text>
        </View>
      </View>

      {[
        { icon: '🪪', label: 'Código de Empleado',   valor: usuario.codigo },
        { icon: '📁', label: 'Departamento',          valor: usuario.departamento || 'N/A' },
        { icon: '🔑', label: 'Rol en sistema',        valor: usuario.rol || 'empleado' },
        { icon: '📅', label: 'Días disponibles',      valor: `${diasDisponibles} días` },
        { icon: '🗓️', label: 'Fecha de ingreso',      valor: usuario.fechaIngreso || 'No registrada' },
        { icon: '🔄', label: 'Última acumulación',    valor: usuario.ultimaAcumulacion || 'Pendiente' },
        { icon: '📋', label: 'Total solicitudes',     valor: String(misPermisos.length) },
        { icon: '✅', label: 'Aprobadas',             valor: String(misPermisos.filter(p => p.estado === 'Aprobado').length) },
        { icon: '❌', label: 'Rechazadas',            valor: String(misPermisos.filter(p => p.estado === 'Rechazado').length) },
      ].map(item => (
        <View key={item.label} style={s.perfilItem}>
          <Text style={s.perfilItemIcon}>{item.icon}</Text>
          <View>
            <Text style={s.perfilItemLabel}>{item.label}</Text>
            <Text style={s.perfilItemValor}>{item.valor}</Text>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={[s.logoutBtn, { backgroundColor: '#EEF2FB', marginBottom: 8 }]}
        onPress={() => setModalPassword(true)}>
        <Text style={[s.logoutBtnText, { color: AZUL }]}>🔒 Cambiar Contraseña</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.logoutBtn} onPress={() => {
        AsyncStorage.removeItem('sesion_usuario');
        setUsuario(null); setPantalla('login'); setCodigo(''); setPassword('');
        setPermisos([]); setUsuarios([]);
        setFotoPerfil(null);
      }}>
        <Text style={s.logoutBtnText}>Cerrar Sesión</Text>
      </TouchableOpacity>
      <View style={{ height: 30 }} />
    </ScrollView>
  );

  // ════════════════════════════════════════════════════════════════════════
  // TAB: CARGA DE FECHAS (solo gerente)
  // ════════════════════════════════════════════════════════════════════════
  const renderCargaFechas = () => {
    const pct = cargaProgreso ? Math.round((cargaProgreso.actual / cargaProgreso.total) * 100) : 0;

    const iniciar = async () => {
      setCargaCoriendo(true);
      setCargaProgreso(null);
      setCargaResultado(null);
      const res = await ejecutarCargaFechas((actual, total, ok, nf, err) => {
        setCargaProgreso({ actual, total, ok, nf, err });
      });
      setCargaResultado(res);
      setCargaCoriendo(false);
    };

    return (
      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>🗓️ Cargar Fechas de Ingreso</Text>
        <Text style={s.pageSub}>Actualiza el campo fechaIngreso en Firestore para {Object.keys(FECHAS_INGRESO_EXCEL).length} empleados desde el Excel.</Text>
        <View style={[s.resumenRow, { marginBottom: 20 }]}>
          <View style={s.resumenItem}>
            <Text style={s.resumenNum}>{Object.keys(FECHAS_INGRESO_EXCEL).length}</Text>
            <Text style={s.resumenLabel}>Empleados</Text>
          </View>
          <View style={s.resumenItem}>
            <Text style={[s.resumenNum, { color: '#4CAF7D' }]}>{cargaResultado?.ok ?? '—'}</Text>
            <Text style={s.resumenLabel}>Actualizados</Text>
          </View>
          <View style={s.resumenItem}>
            <Text style={[s.resumenNum, { color: '#F59E0B' }]}>{cargaResultado?.noEncontrado ?? '—'}</Text>
            <Text style={s.resumenLabel}>No encontrados</Text>
          </View>
          <View style={s.resumenItem}>
            <Text style={[s.resumenNum, { color: '#EF5350' }]}>{cargaResultado?.errores ?? '—'}</Text>
            <Text style={s.resumenLabel}>Errores</Text>
          </View>
        </View>
        {!cargaCoriendo && !cargaResultado && (
          <>
            <View style={[s.hintBox, { marginBottom: 16 }]}>
              <Text style={s.hintTitle}>⚠️ Importante</Text>
              <Text style={s.hintText}>Ejecuta esto UNA sola vez. Una vez completado, los empleados tendrán su fecha de ingreso y la acumulación mensual funcionará automáticamente.</Text>
            </View>
            <TouchableOpacity style={s.enviarBtn} onPress={iniciar}>
              <Text style={s.enviarBtnText}>▶ Iniciar carga de {Object.keys(FECHAS_INGRESO_EXCEL).length} empleados</Text>
            </TouchableOpacity>
          </>
        )}
        {cargaCoriendo && (
          <View style={[s.aprobarCard, { alignItems: 'center', gap: 12 }]}>
            <ActivityIndicator color={AZUL} size="large" />
            {cargaProgreso && (
              <>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#1a1a2e' }}>
                  {cargaProgreso.actual} / {cargaProgreso.total} — {pct}%
                </Text>
                <View style={{ width: '100%', height: 10, backgroundColor: '#EEF2FB', borderRadius: 5 }}>
                  <View style={{ height: 10, backgroundColor: AZUL, borderRadius: 5, width: `${pct}%` }} />
                </View>
                <Text style={{ color: '#555', fontSize: 13 }}>
                  ✅ {cargaProgreso.ok}  ⚠️ {cargaProgreso.nf}  ❌ {cargaProgreso.err}
                </Text>
              </>
            )}
          </View>
        )}
        {cargaResultado && (
          <View style={[s.aprobarCard, { borderLeftWidth: 4, borderLeftColor: '#4CAF7D' }]}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#4CAF7D', marginBottom: 12 }}>✅ Carga completada</Text>
            <Text style={{ fontSize: 14, color: '#1a1a2e', marginBottom: 4 }}>Total procesados: {cargaResultado.total}</Text>
            <Text style={{ fontSize: 14, color: '#4CAF7D', marginBottom: 4 }}>Actualizados exitosamente: {cargaResultado.ok}</Text>
            <Text style={{ fontSize: 14, color: '#F59E0B', marginBottom: 4 }}>No encontrados en Firestore: {cargaResultado.noEncontrado}</Text>
            <Text style={{ fontSize: 14, color: '#EF5350', marginBottom: 12 }}>Errores: {cargaResultado.errores}</Text>
            <Text style={{ fontSize: 11, color: '#888' }}>La acumulación mensual ya está activa para todos los empleados actualizados.</Text>
          </View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    );
  };

  const renderAdmin = () => <PanelAdmin permisosAdmin={permisosAdmin} />;

  // ════════════════════════════════════════════════════════════════════════
  // CONFIGURACIÓN DE TABS
  // ════════════════════════════════════════════════════════════════════════
  const TABS = puedeAprobar
    ? usuario?.rol === 'gerente'
      ? [
          { key: 'inicio',       icon: '🏠', label: 'Inicio'    },
          { key: 'aprobar',      icon: '👍', label: 'Aprobar'   },
          { key: 'nuevo',        icon: '📝', label: 'Solicitar' },
          { key: 'historial',    icon: '📋', label: 'Historial' },
          { key: 'cargaFechas',  icon: '🗓️', label: 'Admin'     },
          { key: 'perfil',       icon: '👤', label: 'Perfil'    },
        ]
      : [
          { key: 'inicio',    icon: '🏠', label: 'Inicio'    },
          { key: 'aprobar',   icon: '👍', label: 'Aprobar'   },
          { key: 'nuevo',     icon: '📝', label: 'Solicitar' },
          { key: 'historial', icon: '📋', label: 'Historial' },
          { key: 'perfil',    icon: '👤', label: 'Perfil'    },
        ]
    : [
        { key: 'inicio',    icon: '🏠', label: 'Inicio'    },
        { key: 'nuevo',     icon: '📝', label: 'Solicitar' },
        { key: 'historial', icon: '📋', label: 'Historial' },
        ...(permisosAdmin.canCreateUsers || permisosAdmin.canLoadExcel || permisosAdmin.canAprobar
          ? [{ key: 'admin', icon: '🔧', label: 'Admin' }] : []),
        { key: 'perfil',    icon: '👤', label: 'Perfil'    },
      ];

  // ════════════════════════════════════════════════════════════════════════
  // RENDER PRINCIPAL
  // ════════════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={s.appContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      <View style={s.appHeader}>
        <View style={s.appHeaderLeft}>
          <Image source={LOGO} style={{ width: 36, height: 36, borderRadius: 8 }} resizeMode="contain" />
          <View>
            <Text style={s.appHeaderBrand}>comercios</Text>
            <Text style={s.appHeaderBrandSub}>universales</Text>
          </View>
        </View>
        <View style={s.appHeaderRight}>
          <TouchableOpacity style={s.notifBtn} onPress={abrirPanelNotif}>
            <Text>🔔</Text>
            {(notifNoLeidas > 0 || pendientesCount > 0) && (
              <View style={s.notifBadge}>
                <Text style={s.notifBadgeText}>{notifNoLeidas || pendientesCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          {fotoPerfil
            ? <Image source={{ uri: fotoPerfil }} style={{ width: 36, height: 36, borderRadius: 18 }} />
            : <View style={s.userChip}>
                <Text style={s.userChipText}>
                  {usuario.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              </View>
          }
        </View>
      </View>

      {/* Panel de notificaciones */}
      {panelNotif && (
        <View style={{ position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.5)', zIndex:1000, justifyContent:'flex-end' }}>
          <View style={{ backgroundColor:'white', borderTopLeftRadius:24, borderTopRightRadius:24, maxHeight:'80%', paddingBottom:20 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:20, borderBottomWidth:1, borderBottomColor:'#EEF2FB' }}>
              <Text style={{ fontSize:18, fontWeight:'800', color:'#1a1a2e' }}>🔔 Notificaciones</Text>
              <TouchableOpacity onPress={() => setPanelNotif(false)} style={{ padding:6 }}>
                <Text style={{ fontSize:18, color:'#888' }}>✕</Text>
              </TouchableOpacity>
            </View>
            {notifCargando
              ? <ActivityIndicator color={AZUL} style={{ margin:30 }} />
              : <ScrollView style={{ padding:16 }}>
                  {notificaciones.length === 0 && (
                    <View style={{ alignItems:'center', paddingVertical:40 }}>
                      <Text style={{ fontSize:32, marginBottom:10 }}>🔕</Text>
                      <Text style={{ color:'#aaa', fontSize:14 }}>No tienes notificaciones</Text>
                    </View>
                  )}
                  {notificaciones.map(n => (
                    <View key={n.id} style={{ backgroundColor: n.leido ? '#F5F7FF' : '#EEF2FB', borderRadius:14, padding:14, marginBottom:10, borderLeftWidth:3, borderLeftColor: n.leido ? '#ddd' : AZUL }}>
                      <Text style={{ fontWeight:'700', fontSize:14, color:'#1a1a2e', marginBottom:4 }}>{n.titulo}</Text>
                      <Text style={{ fontSize:13, color:'#555', marginBottom:6 }}>{n.cuerpo}</Text>
                      <Text style={{ fontSize:10, color:'#aaa' }}>
                        {n.fecha ? new Date(n.fecha).toLocaleString('es-GT') : ''}
                        {!n.leido && <Text style={{ color:AZUL, fontWeight:'700' }}>  · Nueva</Text>}
                      </Text>
                    </View>
                  ))}
                  <View style={{ height:20 }} />
                </ScrollView>
            }
          </View>
        </View>
      )}

      {/* Contenido según el tab activo */}
      <View style={{ flex: 1 }}>
        {tabActivo === 'inicio'      && renderInicio()}
        {tabActivo === 'nuevo'       && renderNuevo()}
        {tabActivo === 'aprobar'     && renderAprobar()}
        {tabActivo === 'historial'   && renderHistorial()}
        {tabActivo === 'cargaFechas' && usuario?.rol === 'gerente' && renderCargaFechas()}
        {tabActivo === 'reporte'     && <PanelReporte usuario={usuario} permisos={permisos} usuarios={usuarios} />}
        {tabActivo === 'admin'       && renderAdmin()}
        {tabActivo === 'perfil'      && renderPerfil()}
        {renderModalPassword()}
      </View>

      {/* Barra de navegación inferior */}
      <View style={s.bottomNav}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab.key} style={s.navItem}
            onPress={() => handleCambiarTab(tab.key)}>
            <View style={[s.navIconBox, tabActivo === tab.key && s.navIconBoxActivo]}>
              <Text style={s.navIcon}>{tab.icon}</Text>
            </View>
            <Text style={[s.navLabel, tabActivo === tab.key && s.navLabelActivo]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: PanelReporte
// ════════════════════════════════════════════════════════════════════════════
function PanelReporte({ usuario, permisos, usuarios }) {
  const AZUL  = '#2C4A8C';
  const anioActual = new Date().getFullYear();
  const [tab,           setTab]           = useState('reporte');
  const [anio,          setAnio]          = useState(anioActual);
  const [mesCalendario, setMesCalendario] = useState(new Date().getMonth());
  const [anioCalendario,setAnioCalendario]= useState(anioActual);
  const [filtroDept,    setFiltroDept]    = useState('Todos');

  const esGerente = usuario?.rol === 'gerente' || usuario?.rol === 'supervisor' || usuario?.rol === 'jefe';

  const calcDiasAnio = (codigoEmp, anioRef) => {
    return permisos
      .filter(p => p.codigo === codigoEmp && p.estado === 'Aprobado')
      .filter(p => {
        const partes = p.fechaInicio?.split('/');
        return partes && partes[2] === String(anioRef);
      })
      .reduce((sum, p) => {
        const d = calcularDias(p.fechaInicio, p.fechaFin);
        return sum + d;
      }, 0);
  };

  const empReporte = esGerente
    ? usuarios.filter(u => filtroDept === 'Todos' || u.departamento === filtroDept)
    : [usuario];

  const deptos = ['Todos', ...new Set(usuarios.map(u => u.departamento).filter(Boolean))];

  const diasConPermiso = () => {
    const mapa = {};
    permisos.forEach(p => {
      if (!p.fechaInicio || !p.fechaFin) return;
      try {
        const [d1,m1,y1] = p.fechaInicio.split('/');
        const [d2,m2,y2] = p.fechaFin.split('/');
        const cur = new Date(Number(y1), Number(m1)-1, Number(d1));
        const fin = new Date(Number(y2), Number(m2)-1, Number(d2));
        while (cur <= fin) {
          if (cur.getMonth() === mesCalendario && cur.getFullYear() === anioCalendario) {
            const key = cur.toISOString().split('T')[0];
            if (!mapa[key]) mapa[key] = [];
            mapa[key].push({ nombre: p.nombre, tipo: p.tipo, estado: p.estado });
          }
          cur.setDate(cur.getDate()+1);
        }
      } catch {}
    });
    return mapa;
  };

  const colorEstadoCal = (e) => e==='Aprobado' ? '#4CAF7D' : e==='Rechazado' ? '#EF5350' : '#F59E0B';

  const mapa = diasConPermiso();
  const primerDiaMes = new Date(anioCalendario, mesCalendario, 1).getDay();
  const diasEnMes    = new Date(anioCalendario, mesCalendario+1, 0).getDate();
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const DIAS_SEMANA = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];

  const celdas = [];
  for (let i = 0; i < primerDiaMes; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);

  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  return (
    <View style={{ flex:1, backgroundColor:'#F5F7FF' }}>
      <View style={{ flexDirection:'row', backgroundColor:'white', borderBottomWidth:1, borderBottomColor:'#EEF2FB' }}>
        {[{ key:'reporte', label:'📊 Reporte' }, { key:'calendario', label:'📅 Calendario' }].map(t => (
          <TouchableOpacity key={t.key} style={{ flex:1, paddingVertical:14, alignItems:'center', borderBottomWidth:2, borderBottomColor: tab===t.key ? AZUL : 'transparent' }}
            onPress={() => setTab(t.key)}>
            <Text style={{ fontWeight:'700', color: tab===t.key ? AZUL : '#aaa', fontSize:13 }}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'reporte' && (
        <ScrollView style={{ padding:16 }}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <Text style={{ fontSize:20, fontWeight:'800', color:'#1a1a2e' }}>📊 Reporte {anio}</Text>
            <View style={{ flexDirection:'row', gap:8 }}>
              <TouchableOpacity onPress={() => setAnio(a => a-1)} style={{ backgroundColor:'white', borderRadius:8, padding:8, borderWidth:1, borderColor:'#EEF2FB' }}>
                <Text style={{ color:AZUL, fontWeight:'700' }}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAnio(a => a+1)} style={{ backgroundColor:'white', borderRadius:8, padding:8, borderWidth:1, borderColor:'#EEF2FB' }}>
                <Text style={{ color:AZUL, fontWeight:'700' }}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {esGerente && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:12 }}>
              {deptos.map(d => (
                <TouchableOpacity key={d}
                  style={{ backgroundColor: filtroDept===d ? AZUL : 'white', borderRadius:20, paddingHorizontal:14, paddingVertical:8, marginRight:8, borderWidth:1, borderColor: filtroDept===d ? AZUL : '#EEF2FB' }}
                  onPress={() => setFiltroDept(d)}>
                  <Text style={{ color: filtroDept===d ? 'white':'#555', fontWeight:'600', fontSize:12 }}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {empReporte.map(emp => {
            const diasUsados  = calcDiasAnio(emp.codigo, anio);
            const diasRestant = parseFloat(emp.dias || 0);
            const permisosEmp = permisos.filter(p => p.codigo === emp.codigo && p.fechaInicio?.endsWith(String(anio)));
            return (
              <View key={emp.id || emp.codigo} style={{ backgroundColor:'white', borderRadius:16, padding:16, marginBottom:12 }}>
                <View style={{ flexDirection:'row', alignItems:'center', marginBottom:12, gap:10 }}>
                  <View style={{ width:40, height:40, borderRadius:20, backgroundColor:'#EEF2FB', alignItems:'center', justifyContent:'center' }}>
                    <Text style={{ fontWeight:'800', color:AZUL, fontSize:13 }}>{emp.nombre?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontWeight:'700', color:'#1a1a2e', fontSize:14 }}>{emp.nombre}</Text>
                    <Text style={{ color:'#888', fontSize:11 }}>{emp.cargo} · {emp.departamento}</Text>
                  </View>
                </View>
                <View style={{ flexDirection:'row', gap:8, marginBottom:12 }}>
                  {[
                    { label:'Días usados', val: diasUsados % 1 === 0 ? diasUsados : diasUsados.toFixed(1), color:'#EF5350' },
                    { label:'Disponibles', val: diasRestant % 1 === 0 ? diasRestant : parseFloat(diasRestant).toFixed(1), color:'#4CAF7D' },
                    { label:'Solicitudes', val: permisosEmp.length, color:AZUL },
                  ].map(s => (
                    <View key={s.label} style={{ flex:1, backgroundColor:'#F5F7FF', borderRadius:12, padding:10, alignItems:'center' }}>
                      <Text style={{ fontSize:18, fontWeight:'900', color:s.color }}>{s.val}</Text>
                      <Text style={{ fontSize:10, color:'#888', marginTop:2, textAlign:'center' }}>{s.label}</Text>
                    </View>
                  ))}
                </View>
                {permisosEmp.length > 0 && (
                  <>
                    <Text style={{ fontSize:12, fontWeight:'600', color:'#888', marginBottom:6 }}>Solicitudes del año:</Text>
                    {permisosEmp.map(p => (
                      <View key={p.id} style={{ flexDirection:'row', justifyContent:'space-between', paddingVertical:5, borderBottomWidth:1, borderBottomColor:'#EEF2FB' }}>
                        <Text style={{ fontSize:12, color:'#555', flex:1 }}>{p.tipo} · {p.fechaInicio} → {p.fechaFin}</Text>
                        <Text style={{ fontSize:11, fontWeight:'700', color: colorEstadoCal(p.estado) }}>{p.estado}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            );
          })}
          <View style={{ height:30 }} />
        </ScrollView>
      )}

      {tab === 'calendario' && (
        <ScrollView style={{ padding:16 }}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <TouchableOpacity onPress={() => {
              if (mesCalendario === 0) { setMesCalendario(11); setAnioCalendario(a=>a-1); }
              else setMesCalendario(m=>m-1);
            }} style={{ backgroundColor:'white', borderRadius:10, padding:10, borderWidth:1, borderColor:'#EEF2FB' }}>
              <Text style={{ color:AZUL, fontWeight:'700', fontSize:16 }}>‹</Text>
            </TouchableOpacity>
            <Text style={{ fontSize:17, fontWeight:'800', color:'#1a1a2e' }}>{MESES[mesCalendario]} {anioCalendario}</Text>
            <TouchableOpacity onPress={() => {
              if (mesCalendario === 11) { setMesCalendario(0); setAnioCalendario(a=>a+1); }
              else setMesCalendario(m=>m+1);
            }} style={{ backgroundColor:'white', borderRadius:10, padding:10, borderWidth:1, borderColor:'#EEF2FB' }}>
              <Text style={{ color:AZUL, fontWeight:'700', fontSize:16 }}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection:'row', marginBottom:4 }}>
            {DIAS_SEMANA.map(d => (
              <View key={d} style={{ flex:1, alignItems:'center', paddingVertical:6 }}>
                <Text style={{ fontSize:11, fontWeight:'700', color: d==='Do'?'#EF5350': d==='Sa'?'#F59E0B':'#888' }}>{d}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
            {celdas.map((dia, idx) => {
              if (!dia) return <View key={`e${idx}`} style={{ width:'14.28%', aspectRatio:1 }} />;
              const fechaISO = `${anioCalendario}-${String(mesCalendario+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
              const eventos  = mapa[fechaISO] || [];
              const hoy      = new Date();
              const esHoy    = dia === hoy.getDate() && mesCalendario === hoy.getMonth() && anioCalendario === hoy.getFullYear();
              const dow      = new Date(anioCalendario, mesCalendario, dia).getDay();
              const esDom    = dow === 0;
              const esSab    = dow === 6;
              return (
                <TouchableOpacity key={dia}
                  style={{ width:'14.28%', aspectRatio:1, alignItems:'center', justifyContent:'center', padding:2 }}
                  onPress={() => eventos.length > 0 && setDiaSeleccionado(diaSeleccionado === dia ? null : dia)}>
                  <View style={{
                    width:'90%', aspectRatio:1, borderRadius:8, alignItems:'center', justifyContent:'center',
                    backgroundColor: esHoy ? AZUL : eventos.length > 0 ? '#EEF2FB' : 'transparent',
                    borderWidth: eventos.length > 0 && !esHoy ? 1 : 0,
                    borderColor: '#4A9EC4',
                  }}>
                    <Text style={{ fontSize:13, fontWeight: esHoy||eventos.length>0 ? '800':'400', color: esHoy?'white': esDom?'#EF5350': esSab?'#F59E0B':'#1a1a2e' }}>{dia}</Text>
                    {eventos.length > 0 && !esHoy && (
                      <View style={{ width:5, height:5, borderRadius:3, backgroundColor:'#4A9EC4', marginTop:1 }} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {diaSeleccionado && mapa[`${anioCalendario}-${String(mesCalendario+1).padStart(2,'0')}-${String(diaSeleccionado).padStart(2,'0')}`] && (
            <View style={{ backgroundColor:'white', borderRadius:16, padding:16, marginTop:16 }}>
              <Text style={{ fontWeight:'800', color:'#1a1a2e', marginBottom:10, fontSize:15 }}>
                📅 {diaSeleccionado} de {MESES[mesCalendario]}
              </Text>
              {mapa[`${anioCalendario}-${String(mesCalendario+1).padStart(2,'0')}-${String(diaSeleccionado).padStart(2,'0')}`].map((ev, i) => (
                <View key={i} style={{ flexDirection:'row', alignItems:'center', gap:8, paddingVertical:6, borderBottomWidth:1, borderBottomColor:'#EEF2FB' }}>
                  <View style={{ width:8, height:8, borderRadius:4, backgroundColor: colorEstadoCal(ev.estado) }} />
                  <View style={{ flex:1 }}>
                    <Text style={{ fontWeight:'700', fontSize:13, color:'#1a1a2e' }}>{ev.nombre}</Text>
                    <Text style={{ fontSize:11, color:'#888' }}>{ev.tipo} · {ev.estado}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ backgroundColor:'white', borderRadius:16, padding:14, marginTop:16, flexDirection:'row', justifyContent:'space-around' }}>
            {[
              { color:'#4A9EC4', label:'Con permiso' },
              { color:AZUL,      label:'Hoy'         },
              { color:'#EF5350', label:'Domingo'      },
              { color:'#F59E0B', label:'Sábado ½'     },
            ].map(l => (
              <View key={l.label} style={{ alignItems:'center', gap:4 }}>
                <View style={{ width:12, height:12, borderRadius:6, backgroundColor:l.color }} />
                <Text style={{ fontSize:10, color:'#888' }}>{l.label}</Text>
              </View>
            ))}
          </View>
          <View style={{ height:30 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: PanelAdmin
// ════════════════════════════════════════════════════════════════════════════
function PanelAdmin({ permisosAdmin }) {
  const AZUL       = '#2C4A8C';
  const AZUL_CLARO = '#EEF2FB';

  const [adminTab,       setAdminTab]       = useState('menu');
  const [adminUsuarios,  setAdminUsuarios]  = useState([]);
  const [adminCargando,  setAdminCargando]  = useState(false);
  const [adminBusqueda,  setAdminBusqueda]  = useState('');
  const [adminModalUser, setAdminModalUser] = useState(null);
  const [excelProgreso,  setExcelProgreso]  = useState(null);
  const [excelResultado, setExcelResultado] = useState(null);
  const [excelCoriendo,  setExcelCoriendo]  = useState(false);
  const [adminPermisos,  setAdminPermisos]  = useState([]);

  const DRIVE_API_KEY = 'AIzaSyD39TKa2k47Ft6I2IlxhFyBUSkQQLjTQww';
  const SHEET_ID      = '1oFv182U_QA7dbGQJBq3PADwUHCfZVD3KgBrstYyVDFo';
  const PROJECT_ID_PA = 'permisoapplorenti';
  const API_KEY_PA    = 'AIzaSyCu8hGmT1NYWipG4pPO-QVfI_tXzRxs1eg';
  const DB_URL_PA     = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID_PA}/databases/(default)/documents`;

  const fsGetPA = async (col) => {
    try {
      const res  = await fetch(`${DB_URL_PA}/${col}?key=${API_KEY_PA}&pageSize=300`);
      const data = await res.json();
      if (!data.documents) return [];
      return data.documents.map(doc => {
        const id = doc.name.split('/').pop();
        const f  = doc.fields;
        const obj = { id };
        for (const k in f) obj[k] = f[k].stringValue ?? '';
        return obj;
      });
    } catch { return []; }
  };

  const fsUpdatePA = async (col, docId, datos) => {
    const fields = {};
    for (const k in datos) fields[k] = { stringValue: String(datos[k]) };
    const mask = Object.keys(datos).map(k => `updateMask.fieldPaths=${k}`).join('&');
    await fetch(`${DB_URL_PA}/${col}/${docId}?${mask}&key=${API_KEY_PA}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
  };

  const fsAddPA = async (col, datos) => {
    const fields = {};
    for (const k in datos) fields[k] = { stringValue: String(datos[k]) };
    await fetch(`${DB_URL_PA}/${col}?key=${API_KEY_PA}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
  };

  const cargarUsuariosAdmin = async () => {
    setAdminCargando(true);
    const u = await fsGetPA('usuarios');
    setAdminUsuarios(u);
    setAdminCargando(false);
  };

  const cargarPermisosAdmin = async () => {
    setAdminCargando(true);
    const p = await fsGetPA('permisos');
    setAdminPermisos(p);
    setAdminCargando(false);
  };

  const cambiarEstadoPermiso = async (id, estado, permiso) => {
    setAdminCargando(true);
    try {
      await fsUpdatePA('permisos', id, { estado });
      const debeDescontarAdmin = estado === 'Aprobado' && permiso.tipo === 'Vacaciones';
      if (debeDescontarAdmin) {
        const qRes  = await fetch(`${DB_URL_PA}:runQuery?key=${API_KEY_PA}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ structuredQuery: { from:[{collectionId:'usuarios'}], where:{fieldFilter:{field:{fieldPath:'codigo'},op:'EQUAL',value:{stringValue:permiso.codigo}}}, limit:1 }})
        });
        const qData = await qRes.json();
        if (qData[0]?.document) {
          const doc        = qData[0].document;
          const docId      = doc.name.split('/').pop();
          const diasActual = parseInt(doc.fields?.dias?.stringValue ?? '15');
          const [d1,m1,y1] = permiso.fechaInicio.split('/');
          const [d2,m2,y2] = permiso.fechaFin.split('/');
          const diff = Math.ceil((new Date(y2,m2-1,d2) - new Date(y1,m1-1,d1)) / 86400000) + 1;
          const nuevosDias = Math.max(0, diasActual - diff);
          await fsUpdatePA('usuarios', docId, { dias: String(nuevosDias) });
        }
      }
      Alert.alert(estado === 'Aprobado' ? '✅ Aprobada' : '❌ Rechazada', `Solicitud de ${permiso.nombre} ${estado.toLowerCase()}`);
      await cargarPermisosAdmin();
    } catch(e) { Alert.alert('Error', e.message); }
    setAdminCargando(false);
  };

  const normFecha = (fi) => {
    if (!fi) return null;
    fi = fi.toString().trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fi)) { const [d,m,y]=fi.split('/'); return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`; }
    if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(fi))  { const [d,m,y]=fi.split('/'); return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/20${y}`; }
    if (/^\d{4}-\d{2}-\d{2}/.test(fi))           { const [y,m,d]=fi.split('T')[0].split('-'); return `${d}/${m}/${y}`; }
    if (/^\d{5,6}$/.test(fi)) { const b=new Date(1899,11,30); b.setDate(b.getDate()+parseInt(fi)); return `${String(b.getDate()).padStart(2,'0')}/${String(b.getMonth()+1).padStart(2,'0')}/${b.getFullYear()}`; }
    return null;
  };

  const iniciarExcel = async () => {
    setExcelCoriendo(true); setExcelProgreso(null); setExcelResultado(null);
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1?key=${DRIVE_API_KEY}&valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      let deptActual = '', empleados = [];
      for (const row of (data.values || [])) {
        if (row[0]?.toString().trim() === 'Departamento:') { deptActual = row[6]?.toString().trim() || row[3]?.toString().trim() || ''; continue; }
        const codigo = row[1]?.toString().trim() ?? '';
        if (!codigo || !/^\d+$/.test(codigo)) continue;
        const fechaIngreso = normFecha(row[23]);
        if (!fechaIngreso) continue;
        empleados.push({ codigo, nombre: `${row[4]?.toString().trim()??''} ${row[8]?.toString().trim()??''}`.trim(), departamento: deptActual, fechaIngreso });
      }
      let actualizados = 0, creados = 0, errores = 0;
      for (let i = 0; i < empleados.length; i++) {
        const emp = empleados[i];
        try {
          const qRes  = await fetch(`${DB_URL_PA}:runQuery?key=${API_KEY_PA}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ structuredQuery: { from:[{collectionId:'usuarios'}], where:{fieldFilter:{field:{fieldPath:'codigo'},op:'EQUAL',value:{stringValue:emp.codigo}}}, limit:1 }}) });
          const qData = await qRes.json();
          if (qData[0]?.document) { await fsUpdatePA('usuarios', qData[0].document.name.split('/').pop(), { fechaIngreso: emp.fechaIngreso, departamento: emp.departamento }); actualizados++; }
          else { await fsAddPA('usuarios', { codigo: emp.codigo, nombre: emp.nombre, cargo:'Empleado', departamento: emp.departamento, rol:'empleado', password: emp.codigo, dias:'15', fechaIngreso: emp.fechaIngreso, ultimaAcumulacion:'' }); creados++; }
        } catch { errores++; }
        setExcelProgreso({ actual: i+1, total: empleados.length, actualizados, creados, errores });
        await new Promise(r => setTimeout(r, 120));
      }
      setExcelResultado({ total: empleados.length, actualizados, creados, errores });
    } catch(e) { Alert.alert('❌ Error', e.message); }
    setExcelCoriendo(false);
  };

  const colorE = (e) => e==='Aprobado' ? '#4CAF7D' : e==='Rechazado' ? '#EF5350' : '#F59E0B';

  if (adminTab === 'menu') return (
    <ScrollView style={pa.content}>
      <Text style={pa.titulo}>🔧 Panel de Administración</Text>
      <Text style={pa.sub}>Accesos otorgados por el administrador del sistema</Text>
      {permisosAdmin.canCreateUsers && (
        <TouchableOpacity style={[pa.card, { borderLeftColor:'#4A9EC4' }]}
          onPress={() => { setAdminTab('usuarios'); cargarUsuariosAdmin(); }}>
          <Text style={pa.cardIcon}>👥</Text>
          <View style={{ flex:1 }}>
            <Text style={pa.cardTitulo}>Gestionar Usuarios</Text>
            <Text style={pa.cardDesc}>Crear nuevos usuarios y editar datos existentes</Text>
          </View>
          <Text style={{ color:'#aaa' }}>›</Text>
        </TouchableOpacity>
      )}
      {permisosAdmin.canLoadExcel && (
        <TouchableOpacity style={[pa.card, { borderLeftColor:'#4CAF7D' }]}
          onPress={() => setAdminTab('excel')}>
          <Text style={pa.cardIcon}>📂</Text>
          <View style={{ flex:1 }}>
            <Text style={pa.cardTitulo}>Cargar desde Excel</Text>
            <Text style={pa.cardDesc}>Sincronizar empleados desde Google Drive</Text>
          </View>
          <Text style={{ color:'#aaa' }}>›</Text>
        </TouchableOpacity>
      )}
      {permisosAdmin.canAprobar && (
        <TouchableOpacity style={[pa.card, { borderLeftColor:'#F59E0B' }]}
          onPress={() => { setAdminTab('aprobar'); cargarPermisosAdmin(); }}>
          <Text style={pa.cardIcon}>✅</Text>
          <View style={{ flex:1 }}>
            <Text style={pa.cardTitulo}>Aprobar / Rechazar Solicitudes</Text>
            <Text style={pa.cardDesc}>Gestionar solicitudes de todos los empleados</Text>
          </View>
          <Text style={{ color:'#aaa' }}>›</Text>
        </TouchableOpacity>
      )}
      <View style={{ height:30 }} />
    </ScrollView>
  );

  if (adminTab === 'usuarios') {
    const filtrados = adminUsuarios.filter(u =>
      u.nombre?.toLowerCase().includes(adminBusqueda.toLowerCase()) ||
      u.codigo?.includes(adminBusqueda)
    );
    return (
      <View style={{ flex:1 }}>
        <View style={pa.topBar}>
          <TouchableOpacity onPress={() => setAdminTab('menu')} style={pa.btnVolver}>
            <Text style={pa.btnVolverText}>← Volver</Text>
          </TouchableOpacity>
          <TextInput style={pa.searchInput} placeholder="🔍 Buscar..." placeholderTextColor="#aaa"
            value={adminBusqueda} onChangeText={setAdminBusqueda} />
          <TouchableOpacity style={pa.btnNuevo} onPress={() => setAdminModalUser({})}>
            <Text style={{ color:'white', fontWeight:'700', fontSize:20 }}>＋</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={pa.content}>
          <Text style={pa.titulo}>👥 Usuarios ({filtrados.length})</Text>
          {adminCargando && <ActivityIndicator color={AZUL} style={{ margin:20 }} />}
          {filtrados.map(u => (
            <TouchableOpacity key={u.id} style={pa.userRow} onPress={() => setAdminModalUser(u)}>
              {u.fotoPerfil
                ? <Image source={{ uri: u.fotoPerfil }} style={{ width:42, height:42, borderRadius:21 }} />
                : <View style={pa.userAvatar}>
                    <Text style={pa.userAvatarText}>{u.nombre?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</Text>
                  </View>
              }
              <View style={{ flex:1 }}>
                <Text style={pa.userNombre}>{u.nombre}</Text>
                <Text style={pa.userSub}>{u.codigo} · {u.departamento} · {u.rol}</Text>
              </View>
              <Text style={{ color:'#888' }}>✏️</Text>
            </TouchableOpacity>
          ))}
          <View style={{ height:80 }} />
        </ScrollView>
        {adminModalUser !== null && (
          <AdminUserModal u={adminModalUser} dbUrl={DB_URL_PA} apiKey={API_KEY_PA}
            onClose={() => setAdminModalUser(null)}
            onSaved={() => { setAdminModalUser(null); cargarUsuariosAdmin(); }} />
        )}
      </View>
    );
  }

  if (adminTab === 'excel') {
    const pct = excelProgreso ? Math.round((excelProgreso.actual/excelProgreso.total)*100) : 0;
    return (
      <ScrollView style={pa.content}>
        <TouchableOpacity onPress={() => setAdminTab('menu')} style={{ marginBottom:16 }}>
          <Text style={{ color:AZUL, fontWeight:'700' }}>← Volver</Text>
        </TouchableOpacity>
        <Text style={pa.titulo}>📂 Cargar desde Excel</Text>
        <Text style={pa.sub}>Lee el archivo desde Google Drive y sincroniza empleados</Text>
        {!excelCoriendo && !excelResultado && (
          <TouchableOpacity style={pa.btnPrimary} onPress={iniciarExcel}>
            <Text style={pa.btnPrimaryText}>▶ Leer Excel y sincronizar</Text>
          </TouchableOpacity>
        )}
        {excelCoriendo && excelProgreso && (
          <View style={[pa.card, { flexDirection:'column', alignItems:'center', gap:10 }]}>
            <ActivityIndicator color={AZUL} />
            <Text style={{ fontWeight:'800' }}>{excelProgreso.actual}/{excelProgreso.total} — {pct}%</Text>
            <View style={{ width:'100%', height:8, backgroundColor:'#EEF2FB', borderRadius:4 }}>
              <View style={{ height:8, backgroundColor:AZUL, borderRadius:4, width:`${pct}%` }} />
            </View>
            <Text style={{ color:'#555' }}>✅ {excelProgreso.actualizados}  🆕 {excelProgreso.creados}  ❌ {excelProgreso.errores}</Text>
          </View>
        )}
        {excelResultado && (
          <View style={[pa.card, { flexDirection:'column', borderLeftColor:'#4CAF7D' }]}>
            <Text style={{ color:'#4CAF7D', fontWeight:'800', fontSize:16, marginBottom:10 }}>✅ Completado</Text>
            <Text>Total: {excelResultado.total}</Text>
            <Text style={{ color:'#4CAF7D' }}>Actualizados: {excelResultado.actualizados}</Text>
            <Text style={{ color:'#4A9EC4' }}>Creados: {excelResultado.creados}</Text>
            <Text style={{ color:'#EF5350' }}>Errores: {excelResultado.errores}</Text>
            <TouchableOpacity style={[pa.btnPrimary, { marginTop:12 }]}
              onPress={() => { setExcelResultado(null); setExcelProgreso(null); }}>
              <Text style={pa.btnPrimaryText}>🔄 Ejecutar de nuevo</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height:30 }} />
      </ScrollView>
    );
  }

  if (adminTab === 'aprobar') {
    const pendientes = adminPermisos.filter(p => p.estado === 'Pendiente');
    const resto      = adminPermisos.filter(p => p.estado !== 'Pendiente');
    const lista      = [...pendientes, ...resto];
    return (
      <View style={{ flex:1 }}>
        <View style={pa.topBar}>
          <TouchableOpacity onPress={() => setAdminTab('menu')} style={pa.btnVolver}>
            <Text style={pa.btnVolverText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={{ flex:1, fontWeight:'700', color:'#1a1a2e' }}>Solicitudes ({lista.length})</Text>
          <TouchableOpacity onPress={cargarPermisosAdmin} style={{ padding:8 }}>
            <Text style={{ color:'#2C4A8C', fontWeight:'700' }}>🔄</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={pa.content}>
          {adminCargando && <ActivityIndicator color={'#2C4A8C'} style={{ margin:20 }} />}
          {lista.length === 0 && !adminCargando && (
            <View style={{ backgroundColor:'white', borderRadius:16, padding:30, alignItems:'center', marginTop:10 }}>
              <Text style={{ color:'#aaa' }}>No hay solicitudes</Text>
            </View>
          )}
          {lista.map(p => (
            <View key={p.id} style={[pa.card, { flexDirection:'column', borderLeftColor: colorE(p.estado) }]}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:8 }}>
                <View style={{ flex:1 }}>
                  <Text style={pa.userNombre}>{p.nombre}</Text>
                  <Text style={pa.userSub}>{p.cargo} · {p.codigo}</Text>
                  <Text style={pa.userSub}>📁 {p.departamento}</Text>
                </View>
                <View style={{ backgroundColor: colorE(p.estado)+'20', paddingHorizontal:8, paddingVertical:4, borderRadius:20, alignSelf:'flex-start' }}>
                  <Text style={{ color: colorE(p.estado), fontWeight:'700', fontSize:11 }}>{p.estado}</Text>
                </View>
              </View>
              <View style={{ backgroundColor:'#F5F7FF', borderRadius:10, padding:10, marginBottom:10 }}>
                <Text style={{ fontSize:14, fontWeight:'600', color:'#1a1a2e', marginBottom:4 }}>
                  {p.tipo} · 📅 {p.fechaInicio} → {p.fechaFin}
                </Text>
                <Text style={{ fontSize:12, color:'#555' }}>💬 {p.motivo}</Text>
              </View>
              {p.estado === 'Pendiente' && (
                <View style={{ flexDirection:'row', gap:10 }}>
                  <TouchableOpacity style={{ flex:1, backgroundColor:'#EDF7ED', borderRadius:10, padding:10, alignItems:'center' }}
                    onPress={() => cambiarEstadoPermiso(p.id, 'Aprobado', p)}>
                    <Text style={{ color:'#4CAF7D', fontWeight:'700' }}>✅ Aprobar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flex:1, backgroundColor:'#FEECEC', borderRadius:10, padding:10, alignItems:'center' }}
                    onPress={() => cambiarEstadoPermiso(p.id, 'Rechazado', p)}>
                    <Text style={{ color:'#EF5350', fontWeight:'700' }}>❌ Rechazar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
          <View style={{ height:30 }} />
        </ScrollView>
      </View>
    );
  }

  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: AdminUserModal
// ════════════════════════════════════════════════════════════════════════════
function AdminUserModal({ u, dbUrl, apiKey, onClose, onSaved }) {
  const esNuevo = !u.id;
  const AZUL = '#2C4A8C';
  const [form, setForm] = useState({
    codigo:       u.codigo       ?? '',
    nombre:       u.nombre       ?? '',
    cargo:        u.cargo        ?? '',
    departamento: u.departamento ?? '',
    rol:          u.rol          ?? 'empleado',
    password:     u.password     ?? '',
    dias:         u.dias         ?? '15',
    fechaIngreso: u.fechaIngreso ?? '',
  });
  const [guardando, setGuardando] = useState(false);
  const ROLES = ['empleado','auxiliar','jefe','supervisor','gerente'];

  const guardar = async () => {
    if (!form.codigo || !form.nombre) { Alert.alert('Error', 'Código y nombre son requeridos'); return; }
    setGuardando(true);
    try {
      const fields = {};
      for (const k in form) fields[k] = { stringValue: String(form[k]) };
      if (u.id) {
        const mask = Object.keys(form).map(k=>`updateMask.fieldPaths=${k}`).join('&');
        await fetch(`${dbUrl}/usuarios/${u.id}?${mask}&key=${apiKey}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ fields }) });
      } else {
        await fetch(`${dbUrl}/usuarios?key=${apiKey}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ fields }) });
      }
      Alert.alert('✅', esNuevo ? 'Usuario creado' : 'Usuario actualizado');
      onSaved();
    } catch(e) { Alert.alert('Error', e.message); }
    setGuardando(false);
  };

  return (
    <View style={{ position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' }}>
      <View style={{ backgroundColor:'white', borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, maxHeight:'90%' }}>
        <Text style={{ fontSize:18, fontWeight:'800', color:'#1a1a2e', marginBottom:16 }}>{esNuevo ? '➕ Nuevo Usuario' : '✏️ Editar Usuario'}</Text>

        {u.fotoPerfil && (
          <View style={{ alignItems:'center', marginBottom:16 }}>
            <Image
              source={{ uri: u.fotoPerfil }}
              style={{ width:72, height:72, borderRadius:36, borderWidth:2, borderColor:AZUL }}
            />
            <Text style={{ color:'#888', fontSize:11, marginTop:6 }}>Foto subida por el empleado</Text>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false}>
          {[
            { key:'codigo',       label:'Código',           kb:'default' },
            { key:'nombre',       label:'Nombre completo',  kb:'default' },
            { key:'cargo',        label:'Cargo',            kb:'default' },
            { key:'departamento', label:'Departamento',     kb:'default' },
            { key:'password',     label:'Contraseña',       kb:'default' },
            { key:'dias',         label:'Días disponibles', kb:'numeric'  },
            { key:'fechaIngreso', label:'Fecha ingreso (DD/MM/AAAA)', kb:'default' },
          ].map(f => (
            <View key={f.key} style={{ marginBottom:10 }}>
              <Text style={{ fontSize:13, fontWeight:'600', color:'#444', marginBottom:6 }}>{f.label}</Text>
              <TextInput
                style={{ backgroundColor:'#F5F7FF', borderRadius:12, padding:14, fontSize:14, borderWidth:1, borderColor:'#E8EDF5' }}
                value={form[f.key]} keyboardType={f.kb}
                onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                placeholder={f.label} placeholderTextColor="#aaa" />
            </View>
          ))}
          <Text style={{ fontSize:13, fontWeight:'600', color:'#444', marginBottom:8 }}>Rol</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:16 }}>
            {ROLES.map(r => (
              <TouchableOpacity key={r}
                style={{ backgroundColor: form.rol===r ? AZUL : '#EEF2FB', borderRadius:20, paddingHorizontal:14, paddingVertical:8, marginRight:8 }}
                onPress={() => setForm(p => ({ ...p, rol: r }))}>
                <Text style={{ color: form.rol===r ? 'white' : '#555', fontWeight:'600', fontSize:12 }}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {guardando
            ? <ActivityIndicator color={AZUL} />
            : <TouchableOpacity style={{ backgroundColor:AZUL, borderRadius:14, padding:16, alignItems:'center' }} onPress={guardar}>
                <Text style={{ color:'white', fontWeight:'700', fontSize:16 }}>💾 {esNuevo ? 'Crear usuario' : 'Guardar cambios'}</Text>
              </TouchableOpacity>
          }
          <TouchableOpacity style={{ backgroundColor:'#EEF2FB', borderRadius:14, padding:14, alignItems:'center', marginTop:8 }} onPress={onClose}>
            <Text style={{ color:'#2C4A8C', fontWeight:'700' }}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ESTILOS — PanelAdmin (pa)
// ════════════════════════════════════════════════════════════════════════════
const pa = StyleSheet.create({
  content:        { flex:1, paddingHorizontal:16, paddingTop:20 },
  titulo:         { fontSize:22, fontWeight:'800', color:'#1a1a2e', marginBottom:4 },
  sub:            { fontSize:12, color:'#888', marginBottom:20 },
  card:           { backgroundColor:'white', borderRadius:16, padding:16, flexDirection:'row', alignItems:'center', gap:12, marginBottom:12, borderLeftWidth:4, borderLeftColor:'#EEF2FB' },
  cardIcon:       { fontSize:28 },
  cardTitulo:     { fontSize:15, fontWeight:'700', color:'#1a1a2e' },
  cardDesc:       { fontSize:12, color:'#888', marginTop:2 },
  topBar:         { flexDirection:'row', alignItems:'center', gap:8, padding:12, backgroundColor:'white', borderBottomWidth:1, borderBottomColor:'#EEF2FB' },
  btnVolver:      { padding:8 },
  btnVolverText:  { color:'#2C4A8C', fontWeight:'700' },
  searchInput:    { flex:1, backgroundColor:'#F5F7FF', borderRadius:12, padding:10, fontSize:13, borderWidth:1, borderColor:'#E8EDF5' },
  btnNuevo:       { backgroundColor:'#2C4A8C', borderRadius:12, width:44, height:44, alignItems:'center', justifyContent:'center' },
  userRow:        { backgroundColor:'white', borderRadius:14, padding:14, flexDirection:'row', alignItems:'center', gap:12, marginBottom:10 },
  userAvatar:     { width:42, height:42, borderRadius:21, backgroundColor:'#EEF2FB', alignItems:'center', justifyContent:'center' },
  userAvatarText: { color:'#2C4A8C', fontWeight:'800', fontSize:14 },
  userNombre:     { fontSize:14, fontWeight:'700', color:'#1a1a2e' },
  userSub:        { fontSize:11, color:'#888', marginTop:2 },
  btnPrimary:     { backgroundColor:'#2C4A8C', borderRadius:14, padding:16, alignItems:'center', marginTop:4 },
  btnPrimaryText: { color:'white', fontWeight:'700', fontSize:15 },
});

// ════════════════════════════════════════════════════════════════════════════
// ESTILOS — App principal (s)
// ════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  // ── Login ─────────────────────────────────────────────────────────────────
  loginTop:       { alignItems: 'center', paddingTop: 50, paddingBottom: 30 },
  logoCircle:     { width: 64, height: 64, borderRadius: 32, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoIcon:       { fontSize: 30 },
  loginAppName:   { color: 'white', fontSize: 20, fontWeight: '800', textAlign: 'center', lineHeight: 26 },
  loginCard:      { flex: 1, backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 28 },
  loginTitle:     { fontSize: 24, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  loginSub:       { fontSize: 13, color: '#888', marginBottom: 24 },
  loginLabel:     { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  loginInput:     { backgroundColor: '#F5F7FF', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 16, borderWidth: 1, borderColor: '#E8EDF5' },
  loginBtn:       { backgroundColor: AZUL, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  loginBtnText:   { color: 'white', fontWeight: '700', fontSize: 16 },
  hintBox:        { marginTop: 20, backgroundColor: '#F5F7FF', borderRadius: 12, padding: 14 },
  hintTitle:      { fontWeight: '700', fontSize: 13, color: AZUL, marginBottom: 6 },
  hintText:       { fontSize: 12, color: '#666', marginTop: 3 },
  // ── Contenedor principal y header ─────────────────────────────────────────
  appContainer:      { flex: 1, backgroundColor: '#F4F6FB' },
  appHeader:         { backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: Platform.OS === 'android' ? 12 : 8, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#EEF2FB' },
  appHeaderLeft:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appLogoMini:       { width: 36, height: 36, borderRadius: 10, backgroundColor: AZUL_CLARO, alignItems: 'center', justifyContent: 'center' },
  appHeaderBrand:    { fontSize: 14, fontWeight: '800', color: AZUL, lineHeight: 16 },
  appHeaderBrandSub: { fontSize: 11, color: '#888', lineHeight: 14 },
  appHeaderRight:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifBtn:          { width: 36, height: 36, borderRadius: 10, backgroundColor: AZUL_CLARO, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notifBadge:        { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#EF5350', alignItems: 'center', justifyContent: 'center' },
  notifBadgeText:    { color: 'white', fontSize: 9, fontWeight: '700' },
  userChip:          { width: 36, height: 36, borderRadius: 18, backgroundColor: AZUL, alignItems: 'center', justifyContent: 'center' },
  userChipText:      { color: 'white', fontWeight: '700', fontSize: 13 },
  // ── Contenido general ─────────────────────────────────────────────────────
  content:      { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  pageTitle:    { fontSize: 22, fontWeight: '800', color: '#1a1a2e', marginBottom: 2 },
  pageSub:      { fontSize: 12, color: '#888', marginBottom: 16 },
  vacio:        { backgroundColor: 'white', borderRadius: 16, padding: 30, alignItems: 'center', marginTop: 10 },
  vacioTexto:   { color: '#aaa', fontSize: 14 },
  // ── Inicio / Dashboard ────────────────────────────────────────────────────
  saludoBox:    { backgroundColor: AZUL, borderRadius: 20, padding: 20, marginBottom: 20 },
  saludoHola:   { color: 'white', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  saludoCargo:  { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 2 },
  saludoDept:   { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 8 },
  rolTag:       { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 12 },
  rolTagText:   { color: 'white', fontSize: 11, fontWeight: '700' },
  statsRow:     { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  statItem:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statLabel:    { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  statBar:      { height: 6, width: 44, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3 },
  statFill:     { height: 6, backgroundColor: '#4CAF7D', borderRadius: 3 },
  statVal:      { color: 'white', fontWeight: '700', fontSize: 14 },
  statDivider:  { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 8 },
  // ── Módulos acceso rápido ─────────────────────────────────────────────────
  modulosScroll: { marginBottom: 20 },
  moduloCard:   { width: 130, borderRadius: 16, padding: 16, marginRight: 12, minHeight: 100, justifyContent: 'space-between' },
  moduloIcon:   { fontSize: 28 },
  moduloLabel:  { fontSize: 14, fontWeight: '700' },
  moduloFlecha: { fontSize: 20, fontWeight: '700', alignSelf: 'flex-end' },
  seccionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seccionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  verTodosBtn:  { backgroundColor: AZUL_CLARO, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 4 },
  verTodosBtnText: { color: AZUL, fontWeight: '700', fontSize: 13 },
  // ── Historial ─────────────────────────────────────────────────────────────
  historialItem:    { backgroundColor: 'white', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  historialIconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: AZUL_CLARO, alignItems: 'center', justifyContent: 'center' },
  historialIconText:{ fontSize: 20 },
  historialInfo:    { flex: 1 },
  historialTipo:    { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  historialFecha:   { fontSize: 11, color: '#888', marginTop: 2 },
  // ── Filtros pill ──────────────────────────────────────────────────────────
  filtroPill:        { backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, borderWidth: 1, borderColor: '#E8EDF5' },
  filtroPillActivo:  { backgroundColor: AZUL, borderColor: AZUL },
  filtroPillText:    { fontSize: 12, fontWeight: '600', color: '#666' },
  filtroPillTextActivo: { color: 'white' },
  // ── Formulario ────────────────────────────────────────────────────────────
  formLabel:      { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 8 },
  formInput:      { backgroundColor: 'white', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 4, borderWidth: 1, borderColor: '#E8EDF5' },
  formInputError: { borderColor: '#EF5350', borderWidth: 2 },
  errorMsg:       { fontSize: 11, color: '#EF5350', marginBottom: 12, marginLeft: 4 },
  diasPreview:    { backgroundColor: '#EDF7ED', borderRadius: 10, padding: 10, marginBottom: 12 },
  diasPreviewText:{ color: '#4CAF7D', fontWeight: '700', fontSize: 13 },
  tiposGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  tipoOpcion:     { width: '47%', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  tipoOpcionActivo:{ borderColor: AZUL },
  tipoOpcionIcon: { fontSize: 26, marginBottom: 6 },
  tipoOpcionLabel:{ fontSize: 13, fontWeight: '700' },
  tipoDescuenta:  { fontSize: 10, color: '#E8944A', marginTop: 4, fontWeight: '600' },
  tipoNoDescuenta:{ fontSize: 10, color: '#4CAF7D', marginTop: 4, fontWeight: '600' },
  enviarBtn:      { backgroundColor: AZUL, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  enviarBtnText:  { color: 'white', fontWeight: '700', fontSize: 16 },
  // ── Resumen estadísticas ──────────────────────────────────────────────────
  resumenRow:     { flexDirection: 'row', backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 14, justifyContent: 'space-around' },
  resumenItem:    { alignItems: 'center' },
  resumenNum:     { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  resumenLabel:   { fontSize: 10, color: '#888', marginTop: 2 },
  btnActualizar:  { backgroundColor: AZUL, borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 14 },
  btnActualizarText: { color: 'white', fontWeight: '700', fontSize: 14 },
  // ── Tarjetas de aprobar/historial ─────────────────────────────────────────
  aprobarCard:    { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12 },
  aprobarCardPendiente: { borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  aprobarHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  aprobarNombre:  { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  aprobarCargo:   { fontSize: 11, color: '#888', marginTop: 2 },
  aprobarDept:    { fontSize: 11, color: '#4A9EC4', marginTop: 2 },
  aprobarDetalle: { backgroundColor: '#F5F7FF', borderRadius: 10, padding: 10, marginBottom: 12 },
  aprobarTipo:    { fontSize: 14, fontWeight: '600', color: '#1a1a2e', marginBottom: 4 },
  aprobarFecha:   { fontSize: 12, color: '#555', marginBottom: 4 },
  aprobarMotivo:  { fontSize: 12, color: '#555', marginBottom: 4 },
  aprobarBtns:    { flexDirection: 'row', gap: 10 },
  btnAprobar:     { flex: 1, backgroundColor: '#EDF7ED', borderRadius: 10, padding: 10, alignItems: 'center' },
  btnAprobarText: { color: '#4CAF7D', fontWeight: '700', fontSize: 13 },
  btnRechazar:    { flex: 1, backgroundColor: '#FEECEC', borderRadius: 10, padding: 10, alignItems: 'center' },
  btnRechazarText:{ color: '#EF5350', fontWeight: '700', fontSize: 13 },
  // ── Tag de estado ─────────────────────────────────────────────────────────
  estadoTag:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  estadoTagText:  { fontSize: 11, fontWeight: '700' },
  // ── Perfil ────────────────────────────────────────────────────────────────
  perfilHeader:       { alignItems: 'center', marginBottom: 24 },
  perfilAvatar:       { width: 72, height: 72, borderRadius: 36, backgroundColor: AZUL, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  perfilAvatarFoto:   { width: 72, height: 72, borderRadius: 36, marginBottom: 12 },
  perfilCamaraBtn:    { position: 'absolute', bottom: 12, right: -4, backgroundColor: 'white', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E8EDF5' },
  perfilAvatarText:   { color: 'white', fontSize: 26, fontWeight: '800' },
  perfilNombre:       { fontSize: 20, fontWeight: '800', color: '#1a1a2e' },
  perfilCargo:        { fontSize: 13, color: '#888', marginTop: 4 },
  perfilItem:         { backgroundColor: 'white', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  perfilItemIcon:     { fontSize: 22 },
  perfilItemLabel:    { fontSize: 11, color: '#888' },
  perfilItemValor:    { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginTop: 2 },
  logoutBtn:          { backgroundColor: '#FEECEC', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  logoutBtnText:      { color: '#EF5350', fontWeight: '700', fontSize: 15 },
  // ── Navegación inferior ───────────────────────────────────────────────────
  bottomNav:        { backgroundColor: 'white', flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#EEF2FB', paddingBottom: Platform.OS === 'ios' ? 4 : 24, paddingTop: 8 },
  navItem:          { flex: 1, alignItems: 'center', gap: 4 },
  navIconBox:       { width: 40, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navIconBoxActivo: { backgroundColor: AZUL_CLARO },
  navIcon:          { fontSize: 18 },
  navLabel:         { fontSize: 10, color: '#aaa', fontWeight: '600' },
  navLabelActivo:   { color: AZUL },
});