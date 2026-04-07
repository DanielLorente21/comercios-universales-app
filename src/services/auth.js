// ════════════════════════════════════════════════════════════════════════════
// src/services/auth.js — Autenticación y sesión · Comercios Universales
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SESSION_TTL_MS } from '../constants/config';

// ─── Helpers de credenciales ──────────────────────────────────────────────────

// Convierte código de empleado al formato de email que usa Firebase Auth
export const codeToEmail = (code) => `${code.toLowerCase().trim()}@comercios.app`;

// Rellena contraseñas cortas hasta 6 caracteres (mínimo de Firebase Auth)
export const normalizarPass = (pass) => String(pass || '').trim().padEnd(6, '0');

// Firebase Auth maneja el hashing internamente
export const hashPassword = async (plain) => plain;

// ─── Sesión persistente ───────────────────────────────────────────────────────

export const guardarSesion = async (u) => {
  const sesion = { ...u, _savedAt: Date.now() };
  await AsyncStorage.setItem('sesion_usuario', JSON.stringify(sesion));
};

export const leerSesion = async () => {
  const raw = await AsyncStorage.getItem('sesion_usuario');
  if (!raw) return null;
  const sesion = JSON.parse(raw);
  if (Date.now() - (sesion._savedAt ?? 0) > SESSION_TTL_MS) {
    await AsyncStorage.removeItem('sesion_usuario');
    return null;
  }
  return sesion;
};

export const borrarSesion = async () => {
  await AsyncStorage.removeItem('sesion_usuario');
};
