// ════════════════════════════════════════════════════════════════════════════
// src/services/firestore.js — Capa de acceso a Firestore REST
// Comercios Universales
// CAMBIOS:
//   - BUG FIX #5: fsGet ahora lee stringValue | integerValue | doubleValue | booleanValue
//     igual que fsQuery y buscarUsuario (era inconsistente y perdía números)
// ════════════════════════════════════════════════════════════════════════════

import { PROJECT_ID, API_KEY, DB_URL } from '../constants/config';

// ── Helper interno: convierte un campo Firestore a su valor JS ────────────
// Centraliza la conversión para que fsGet, fsQuery y buscarUsuario sean consistentes.
const campoAValor = (campo) => {
  if (campo.doubleValue  !== undefined) return campo.doubleValue;
  if (campo.integerValue !== undefined) return Number(campo.integerValue);
  if (campo.booleanValue !== undefined) return String(campo.booleanValue);
  return campo.stringValue ?? '';
};

// ─── Operaciones básicas CRUD ─────────────────────────────────────────────────

export const fsQuery = async (col, campo, valor) => {
  try {
    const res = await fetch(`${DB_URL}:runQuery?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: col }],
          where: { fieldFilter: { field: { fieldPath: campo }, op: 'EQUAL', value: { stringValue: valor } } },
        }
      })
    });
    const data = await res.json();
    if (!data[0]?.document) return [];
    return data.filter(r => r.document).map(r => {
      const id  = r.document.name.split('/').pop();
      const f   = r.document.fields;
      const obj = { id };
      for (const k in f) obj[k] = campoAValor(f[k]);
      return obj;
    });
  } catch { return []; }
};

export const fsGet = async (col) => {
  try {
    let todos     = [];
    let pageToken = null;
    do {
      const url = pageToken
        ? `${DB_URL}/${col}?key=${API_KEY}&pageSize=300&pageToken=${pageToken}`
        : `${DB_URL}/${col}?key=${API_KEY}&pageSize=300`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.documents) {
        const pagina = data.documents.map(doc => {
          const id  = doc.name.split('/').pop();
          const f   = doc.fields;
          const obj = { id };
          // BUG FIX #5: antes solo leía stringValue — ahora usa campoAValor igual que fsQuery
          for (const k in f) obj[k] = campoAValor(f[k]);
          return obj;
        });
        todos = todos.concat(pagina);
      }
      pageToken = data.nextPageToken ?? null;
    } while (pageToken);
    return todos;
  } catch { return []; }
};

export const fsAdd = async (col, datos) => {
  const fields = {};
  for (const k in datos) fields[k] = { stringValue: String(datos[k]) };
  const res  = await fetch(`${DB_URL}/${col}?key=${API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
};

export const fsUpdate = async (col, docId, datos) => {
  const fields = {};
  for (const k in datos) fields[k] = { stringValue: String(datos[k]) };
  const mask = Object.keys(datos).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const res  = await fetch(`${DB_URL}/${col}/${docId}?${mask}&key=${API_KEY}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
};

// ─── Búsqueda de usuarios ─────────────────────────────────────────────────────

export const buscarUsuario = async (codigo) => {
  try {
    const res = await fetch(`${DB_URL}:runQuery?key=${API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'usuarios' }],
          where: { fieldFilter: { field: { fieldPath: 'codigo' }, op: 'EQUAL', value: { stringValue: codigo } } },
          limit: 1
        }
      })
    });
    const data = await res.json();
    if (!data[0]?.document) return null;
    const doc  = data[0].document;
    const id   = doc.name.split('/').pop();
    const f    = doc.fields;
    const obj  = { id };
    for (const k in f) obj[k] = campoAValor(f[k]);
    return obj;
  } catch { return null; }
};

export const refrescarUsuario = async (codigo) => {
  try { return await buscarUsuario(codigo); } catch { return null; }
};

// ─── Cache de festivos ────────────────────────────────────────────────────────

let _festivosCache   = null;
let _festivosCacheTs = 0;
const FESTIVOS_TTL   = 24 * 60 * 60 * 1000; // 24 horas

export const invalidarCacheFestivos = () => {
  _festivosCache   = null;
  _festivosCacheTs = 0;
};

export const cargarFestivosSet = async () => {
  try {
    const ahora = Date.now();
    if (_festivosCache && Object.keys(_festivosCache).length > 0 && (ahora - _festivosCacheTs) < FESTIVOS_TTL) {
      return _festivosCache;
    }
    const docs = await fsGet('festivos');
    const mapaFestivos = {};
    for (const d of docs) {
      if (!d.fecha) continue;
      const [dd, mm, yyyy] = d.fecha.split('/');
      if (!dd || !mm || !yyyy) continue;
      const key = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
      mapaFestivos[key] = d.tipo ?? 'completo';
    }
    if (Object.keys(mapaFestivos).length > 0) {
      _festivosCache   = mapaFestivos;
      _festivosCacheTs = ahora;
    }
    return mapaFestivos;
  } catch { return {}; }
};

// firestore.js — reemplazar fsQueryRecientes completo

export const fsQueryRecientes = async (col, campo, valor, limite = 3) => {
  try {
    const res = await fetch(`${DB_URL}:runQuery?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: col }],
          where: {
            fieldFilter: {
              field: { fieldPath: campo },
              op: 'EQUAL',
              value: { stringValue: valor },
            },
          },
          // ← SIN orderBy para evitar el índice compuesto
        },
      }),
    });
    const data = await res.json();
    if (!data[0]?.document) return [];
    return data
      .filter(r => r.document)
      .map(r => {
        const id  = r.document.name.split('/').pop();
        const f   = r.document.fields;
        const obj = { id };
        for (const k in f) obj[k] = campoAValor(f[k]);
        return obj;
      })
      .sort((a, b) => (b.creadoEn ?? '').localeCompare(a.creadoEn ?? ''))  // orden cliente
      .slice(0, limite);  // tomar los N más recientes
  } catch { return []; }
};
   
  