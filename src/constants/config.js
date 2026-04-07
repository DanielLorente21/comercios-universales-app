// ════════════════════════════════════════════════════════════════════════════
// src/constants/config.js — Constantes globales · Comercios Universales
// ════════════════════════════════════════════════════════════════════════════

import baseConfig from '../../constantsconfig';

// ─── Firebase ────────────────────────────────────────────────────────────────
export const PROJECT_ID      = baseConfig.FIREBASE_PROJECT_ID;
export const API_KEY         = baseConfig.FIREBASE_API_KEY;
export const DB_URL          = baseConfig.DB_URL;
export const AUTH_URL        = baseConfig.AUTH_URL;
export const AUTH_UPDATE_URL = baseConfig.AUTH_UPDATE_URL;

// ─── Sesión ──────────────────────────────────────────────────────────────────
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

// ─── Expo / Push Notifications ───────────────────────────────────────────────
export const EXPO_PROJECT_ID = 'bc8bdb50-4561-4e06-99c4-778693833d30';

// ─── Colores principales ─────────────────────────────────────────────────────
export const AZUL       = '#2C4A8C';
export const AZUL_CLARO = '#EEF2FB';

// ─── Tema claro / oscuro ─────────────────────────────────────────────────────
export const TEMAS = {
  claro: {
    fondo:       '#F4F6FB',
    tarjeta:     'white',
    texto:       '#1a1a2e',
    subTexto:    '#888',
    borde:       '#E8EDF5',
    inputFondo:  '#F5F7FF',
    header:      'white',
    headerBorde: '#EEF2FB',
    navFondo:    'white',
    saludoBox:   AZUL,
    statusBar:   'dark-content',
  },
  oscuro: {
    fondo:       '#0d1117',
    tarjeta:     '#16213e',
    texto:       '#ffffff',
    subTexto:    '#aaa',
    borde:       '#1e2d3d',
    inputFondo:  '#1a2a3a',
    header:      '#1a1a2e',
    headerBorde: '#16213e',
    navFondo:    '#1a1a2e',
    saludoBox:   '#16213e',
    statusBar:   'light-content',
  },
};

// ─── Logo ─────────────────────────────────────────────────────────────────────
export const LOGO = require('../../assets/logocomercios.png');
export const TAMAÑO_LOGO = 110;
// ─── Tipos de permiso ─────────────────────────────────────────────────────────
export const TIPOS = [
  { label: 'Vacaciones', icon: '🏖️', color: '#E8F4FD', iconColor: '#4A9EC4', descuenta: true  },
  { label: 'IGSS',       icon: '🏥', color: '#EDF7ED', iconColor: '#4CAF7D', descuenta: false },
  { label: 'Personal',   icon: '👤', color: '#EDE8FD', iconColor: '#7C4DCC', descuenta: false },
  { label: 'Horas',      icon: '⏱️', color: '#FFF3E0', iconColor: '#E65100', descuenta: false },
];