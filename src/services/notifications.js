// ════════════════════════════════════════════════════════════════════════════
// src/services/notifications.js — Push y notificaciones · Comercios Universales
// ════════════════════════════════════════════════════════════════════════════

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { EXPO_PROJECT_ID } from '../constants/config';
import { fsUpdate, fsAdd } from './firestore';

// ─── Registro de token push ───────────────────────────────────────────────────

export const registrarPushToken = async (userId) => {
  try {
    console.log('[PUSH] Iniciando registro para userId:', userId);

    // Paso 1: Verificar permisos
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('[PUSH] Permiso actual:', existingStatus);
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[PUSH] Permiso solicitado:', finalStatus);
    }
    if (finalStatus !== 'granted') {
      console.log('[PUSH] Sin permiso - abortando');
      return;
    }

    // Paso 2: Canal Android (obligatorio Android 8+)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Permisos',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2C4A8C',
        sound: true,
        enableVibrate: true,
        showBadge: true,
      });
      console.log('[PUSH] Canal Android creado');
    }

    // Paso 3: Obtener token
    console.log('[PUSH] Solicitando ExponentPushToken...');
    const t = await Notifications.getExpoPushTokenAsync({
      projectId: EXPO_PROJECT_ID,
    });
    const token = t.data;
    console.log('[PUSH] Token:', token);

    // Paso 4: Guardar en Firestore
    if (token) {
      await fsUpdate('usuarios', userId, {
        pushToken:  token,
        esTokenFCM: 'false',
        tokenFecha: new Date().toISOString(),
      });
      console.log('[PUSH] Token guardado en Firestore');
    }
  } catch (e) {
    console.log('[PUSH] Error:', e.message);
  }
};

// ─── Envío de notificación push (Expo) ───────────────────────────────────────

export const enviarNotificacion = async (pushToken, titulo, cuerpo) => {
  if (!pushToken) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        title: titulo,
        body: cuerpo,
        sound: 'default',
        priority: 'high',
        channelId: 'default',
      })
    });
  } catch (e) { console.log('Error notificación:', e.message); }
};

// ─── Crear notificación en Firestore ─────────────────────────────────────────

export const crearNotificacion = async (codigoDestinatario, titulo, cuerpo) => {
  try {
    await fsAdd('notificaciones', {
      codigo: codigoDestinatario,
      titulo,
      cuerpo,
      leido: 'false',
      fecha: new Date().toISOString(),
    });
  } catch (e) { console.log('Error creando notificación:', e.message); }
};
