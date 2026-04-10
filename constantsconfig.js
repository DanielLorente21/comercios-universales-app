// constants/config.js
import Constants from 'expo-constants';

// Leer variables de entorno desde .env (nunca hardcodear claves aquí)
const env = Constants.expoConfig?.extra || process.env || {};

// ⚠️ Si alguna variable crítica falta, lanzar error en desarrollo
if (__DEV__) {
  const required = [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_DRIVE_API_KEY',
    'EXPO_PUBLIC_SHEET_ID',
  ];
  required.forEach(key => {
    if (!env[key]) {
      console.warn(`⚠️  Variable de entorno faltante: ${key} — revisa tu archivo .env`);
    }
  });
}

const config = {
  // ── Firebase ────────────────────────────────────────────────────────────────
  
  FIREBASE_API_KEY:   env.EXPO_PUBLIC_FIREBASE_API_KEY,
  FIREBASE_PROJECT_ID: 'permisoapplorenti', 

  // ── Google Drive / Sheets ───────────────────────────────────────────────────
  DRIVE_API_KEY: env.EXPO_PUBLIC_DRIVE_API_KEY,
  SHEET_ID:      env.EXPO_PUBLIC_SHEET_ID,

  // ── URLs automáticas (se construyen a partir de las vars de entorno) ────────
  get DB_URL() {
    return `https://firestore.googleapis.com/v1/projects/${this.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
  },
  get AUTH_URL() {
    return `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.FIREBASE_API_KEY}`;
  },
  get AUTH_SIGNUP_URL() {
    return `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.FIREBASE_API_KEY}`;
  },
  get AUTH_UPDATE_URL() {
    return `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${this.FIREBASE_API_KEY}`;
  },
  get SHEETS_URL() {
    return `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/Sheet1?key=${this.DRIVE_API_KEY}&valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;
  },

  // ── Configuración de la app ─────────────────────────────────────────────────
  SA_USER:        'SUPERADMIN',
  // ❌ SA_PASS_FALLBACK eliminado — las contraseñas NUNCA van en el código
  //    La contraseña del superadmin debe manejarse únicamente en Firebase Auth
  SESSION_TTL_MS: 30 * 24 * 60 * 60 * 1000, // 30 días
  DIAS_POR_MES:   1.25,
  FESTIVOS_TTL:   24 * 60 * 60 * 1000,       // 24 horas
};

export default config;