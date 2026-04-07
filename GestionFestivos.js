// ════════════════════════════════════════════════════════════════════════════
// GestionFestivos.js
// Tab visible solo para usuarios con canGestionarFestivos = 'true'
//
// Funcionalidades:
//   • Ver calendario mensual con los días festivos marcados
//   • Agregar un nuevo día festivo (nombre + tipo: completo / medio día)
//   • Editar o eliminar días festivos existentes
//   • Los festivos se guardan en Firestore (colección "festivos")
//     con campos: fecha (DD/MM/AAAA), nombre, tipo ("completo" | "medio")
//
// Integración con calcularDias (App.js):
//   • Día festivo "completo" → NO descuenta días
//   • Día festivo "medio"    → descuenta 0.5 días
//   Exportar/importar: ver calcularDiasConFestivos() al final de este archivo.
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal, Platform
} from 'react-native';

// ─── Firestore config (misma que App.js) ─────────────────────────────────────
import config from './constantsconfig';
// FIX: importar invalidador de cache para que los cálculos en App.js se actualicen
import { invalidarCacheFestivos } from './App';

const PROJECT_ID = config.FIREBASE_PROJECT_ID;
const API_KEY = config.FIREBASE_API_KEY;
const DB_URL = config.DB_URL;

// ─── Colores (mismos que App.js) ─────────────────────────────────────────────
const AZUL       = '#2C4A8C';
const AZUL_CLARO = '#EEF2FB';
const VERDE      = '#4CAF7D';
const ROJO       = '#EF5350';
const AMARILLO   = '#F59E0B';
const MORADO     = '#7C4DCC';

// ─── Helpers Firestore ────────────────────────────────────────────────────────
const fsGetFestivos = async () => {
  try {
    let todos = [];
    let pageToken = null;
    do {
      const url = pageToken
        ? `${DB_URL}/festivos?key=${API_KEY}&pageSize=300&pageToken=${pageToken}`
        : `${DB_URL}/festivos?key=${API_KEY}&pageSize=300`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.documents) {
        const pagina = data.documents.map(doc => {
          const id = doc.name.split('/').pop();
          const f  = doc.fields;
          return {
            id,
            fecha:  f.fecha?.stringValue  ?? '',
            nombre: f.nombre?.stringValue ?? '',
            tipo:   f.tipo?.stringValue   ?? 'completo', // 'completo' | 'medio'
          };
        });
        todos = todos.concat(pagina);
      }
      pageToken = data.nextPageToken ?? null;
    } while (pageToken);
    // Ordenar por fecha ascendente
    return todos.sort((a, b) => {
      const pa = a.fecha.split('/'); const pb = b.fecha.split('/');
      const da = new Date(Number(pa[2]), Number(pa[1])-1, Number(pa[0]));
      const db = new Date(Number(pb[2]), Number(pb[1])-1, Number(pb[0]));
      return da - db;
    });
  } catch { return []; }
};

const fsAddFestivo = async (datos) => {
  const fields = {};
  for (const k in datos) fields[k] = { stringValue: String(datos[k]) };
  const res  = await fetch(`${DB_URL}/festivos?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
};

const fsUpdateFestivo = async (docId, datos) => {
  const fields = {};
  for (const k in datos) fields[k] = { stringValue: String(datos[k]) };
  const mask = Object.keys(datos).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const res  = await fetch(`${DB_URL}/festivos/${docId}?${mask}&key=${API_KEY}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
};

const fsDeleteFestivo = async (docId) => {
  const res = await fetch(`${DB_URL}/festivos/${docId}?key=${API_KEY}`, { method: 'DELETE' });
  return res.ok;
};

// ─── Auto-formato de fecha ────────────────────────────────────────────────────
const autoFormatearFecha = (texto) => {
  const nums = texto.replace(/\D/g, '').slice(0, 8);
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
};

const REGEX_FECHA = /^(\d{2})\/(\d{2})\/(\d{4})$/;

// ─── Nombres de meses ─────────────────────────────────────────────────────────
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA_CORTO = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export default function GestionFestivos() {
  const [festivos,      setFestivos]      = useState([]);
  const [cargando,      setCargando]      = useState(false);
  const [modalVisible,  setModalVisible]  = useState(false);
  const [editando,      setEditando]      = useState(null); // null = nuevo, objeto = editar
  const [confirmDelete, setConfirmDelete] = useState(null); // id a eliminar

  // Form del modal
  const FORM_VACIO = { fecha: '', nombre: '', tipo: 'completo' };
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  // Calendario
  const hoy = new Date();
  const [mes,  setMes]  = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  // ─── Cargar festivos ────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setCargando(true);
    const data = await fsGetFestivos();
    setFestivos(data);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // ─── Abrir modal nuevo ──────────────────────────────────────────────────
  const abrirNuevo = (fechaPreseleccionada = '') => {
    setEditando(null);
    setForm({ ...FORM_VACIO, fecha: fechaPreseleccionada });
    setModalVisible(true);
  };

  // ─── Abrir modal editar ─────────────────────────────────────────────────
  const abrirEditar = (festivo) => {
    setEditando(festivo);
    setForm({ fecha: festivo.fecha, nombre: festivo.nombre, tipo: festivo.tipo });
    setModalVisible(true);
  };

  // ─── Guardar (crear o actualizar) ───────────────────────────────────────
  const guardar = async () => {
    if (!form.fecha || !REGEX_FECHA.test(form.fecha)) {
      Alert.alert('Error', 'La fecha debe tener formato DD/MM/AAAA'); return;
    }
    if (!form.nombre.trim()) {
      Alert.alert('Error', 'Ingresa el nombre del día festivo'); return;
    }
    setGuardando(true);
    try {
      if (editando) {
        await fsUpdateFestivo(editando.id, { fecha: form.fecha, nombre: form.nombre.trim(), tipo: form.tipo });
      } else {
        await fsAddFestivo({ fecha: form.fecha, nombre: form.nombre.trim(), tipo: form.tipo });
      }
      invalidarCacheFestivos(); // FIX: forzar recarga del cache en App.js
      setModalVisible(false);
      setForm(FORM_VACIO);
      await cargar();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setGuardando(false);
  };

  // ─── Eliminar ───────────────────────────────────────────────────────────
  const eliminar = async (id) => {
    try {
      await fsDeleteFestivo(id);
      invalidarCacheFestivos(); // FIX: forzar recarga del cache en App.js
      setConfirmDelete(null);
      setModalVisible(false);
      await cargar();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // ─── Mapa de festivos por fecha ISO (YYYY-MM-DD) ────────────────────────
  const festivosPorFecha = festivos.reduce((acc, f) => {
    const [d, m, y] = f.fecha.split('/');
    if (!d || !m || !y) return acc;
    const key = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  // ─── Celdas del calendario ──────────────────────────────────────────────
  const primerDia  = new Date(anio, mes, 1).getDay();
  const diasEnMes  = new Date(anio, mes + 1, 0).getDate();
  const celdas     = [];
  for (let i = 0; i < primerDia; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);

  const keyDia = (d) =>
    `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const navMes = (delta) => {
    let nm = mes + delta;
    let na = anio;
    if (nm < 0)  { nm = 11; na--; }
    if (nm > 11) { nm = 0;  na++; }
    setMes(nm);
    setAnio(na);
    setDiaSeleccionado(null);
  };

  // ─── Resumen: festivos del mes actual ───────────────────────────────────
  const festivosMes = festivos.filter(f => {
    const parts = f.fecha.split('/');
    return Number(parts[1]) === mes + 1 && Number(parts[2]) === anio;
  });

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <View style={{ flex: 1, backgroundColor: '#F4F6FB' }}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Encabezado ── */}
        <View style={gf.header}>
          <View>
            <Text style={gf.titulo}>🎉 Días Festivos</Text>
            <Text style={gf.subtitulo}>Gestiona el calendario de festivos</Text>
          </View>
          <TouchableOpacity style={gf.btnNuevo} onPress={() => abrirNuevo()}>
            <Text style={gf.btnNuevoText}>＋ Agregar</Text>
          </TouchableOpacity>
        </View>

        {/* ── Resumen rápido ── */}
        <View style={gf.resumenRow}>
          <View style={gf.resumenItem}>
            <Text style={gf.resumenNum}>{festivos.length}</Text>
            <Text style={gf.resumenLabel}>Total</Text>
          </View>
          <View style={gf.resumenItem}>
            <Text style={[gf.resumenNum, { color: AZUL }]}>
              {festivos.filter(f => f.tipo === 'completo').length}
            </Text>
            <Text style={gf.resumenLabel}>Día completo</Text>
          </View>
          <View style={gf.resumenItem}>
            <Text style={[gf.resumenNum, { color: AMARILLO }]}>
              {festivos.filter(f => f.tipo === 'medio').length}
            </Text>
            <Text style={gf.resumenLabel}>Medio día</Text>
          </View>
          <View style={gf.resumenItem}>
            <Text style={[gf.resumenNum, { color: VERDE }]}>{festivosMes.length}</Text>
            <Text style={gf.resumenLabel}>Este mes</Text>
          </View>
        </View>

        {/* ── Calendario ── */}
        <View style={gf.calendarCard}>
          {/* Navegación de mes */}
          <View style={gf.calNavRow}>
            <TouchableOpacity style={gf.calNavBtn} onPress={() => navMes(-1)}>
              <Text style={gf.calNavBtnText}>‹</Text>
            </TouchableOpacity>
            <Text style={gf.calMesTitulo}>{MESES[mes]} {anio}</Text>
            <TouchableOpacity style={gf.calNavBtn} onPress={() => navMes(1)}>
              <Text style={gf.calNavBtnText}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Cabecera días de semana */}
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            {DIAS_SEMANA_CORTO.map(d => (
              <View key={d} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
                <Text style={{
                  fontSize: 11, fontWeight: '700',
                  color: d === 'Do' ? ROJO : d === 'Sa' ? AMARILLO : '#888'
                }}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Celdas */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {celdas.map((dia, idx) => {
              if (!dia) return <View key={`e${idx}`} style={{ width: '14.28%', aspectRatio: 1 }} />;
              const key      = keyDia(dia);
              const eventos  = festivosPorFecha[key] || [];
              const esHoy    = dia === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();
              const dow      = new Date(anio, mes, dia).getDay();
              const esDom    = dow === 0;
              const esSab    = dow === 6;
              const selec    = diaSeleccionado === dia;
              const tieneComp = eventos.some(e => e.tipo === 'completo');
              const tieneMed  = eventos.some(e => e.tipo === 'medio');

              return (
                <TouchableOpacity
                  key={dia}
                  style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 }}
                  onPress={() => {
                    if (eventos.length > 0) {
                      setDiaSeleccionado(selec ? null : dia);
                    } else {
                      // Abrir modal de nuevo festivo con la fecha preseleccionada
                      const fechaStr = `${String(dia).padStart(2,'0')}/${String(mes+1).padStart(2,'0')}/${anio}`;
                      abrirNuevo(fechaStr);
                    }
                  }}>
                  <View style={[
                    gf.calCelda,
                    esHoy  && { backgroundColor: AZUL },
                    selec  && !esHoy && { backgroundColor: AZUL_CLARO, borderWidth: 2, borderColor: AZUL },
                    tieneComp && !esHoy && { backgroundColor: '#FFF3E0' },
                    tieneMed  && !tieneComp && !esHoy && { backgroundColor: '#FFF8E1' },
                  ]}>
                    <Text style={[
                      gf.calDiaNum,
                      esHoy  && { color: 'white' },
                      esDom  && !esHoy && { color: ROJO },
                      esSab  && !esHoy && { color: AMARILLO },
                      (tieneComp || tieneMed) && !esHoy && { fontWeight: '800' },
                    ]}>{dia}</Text>
                    {/* Punto indicador */}
                    {eventos.length > 0 && !esHoy && (
                      <View style={{
                        width: 5, height: 5, borderRadius: 3, marginTop: 1,
                        backgroundColor: tieneComp ? AMARILLO : MORADO,
                      }} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Leyenda */}
          <View style={gf.leyendaRow}>
            {[
              { color: AZUL,        label: 'Hoy'         },
              { color: '#FFF3E0',   label: 'Día completo', border: AMARILLO },
              { color: '#FFF8E1',   label: 'Medio día',    border: MORADO   },
              { color: ROJO,        label: 'Domingo'      },
            ].map(l => (
              <View key={l.label} style={{ alignItems: 'center', gap: 3 }}>
                <View style={{
                  width: 14, height: 14, borderRadius: 4,
                  backgroundColor: l.color,
                  borderWidth: l.border ? 1.5 : 0,
                  borderColor: l.border ?? 'transparent',
                }} />
                <Text style={{ fontSize: 9, color: '#888' }}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Detalle del día seleccionado ── */}
        {diaSeleccionado && festivosPorFecha[keyDia(diaSeleccionado)] && (
          <View style={gf.detalleCard}>
            <Text style={gf.detalleTitulo}>
              📅 {diaSeleccionado} de {MESES[mes]} {anio}
            </Text>
            {festivosPorFecha[keyDia(diaSeleccionado)].map(f => (
              <View key={f.id} style={gf.detalleItem}>
                <View style={{ flex: 1 }}>
                  <Text style={gf.detalleNombre}>{f.nombre}</Text>
                  <View style={[gf.tipoPill, { backgroundColor: f.tipo === 'completo' ? AMARILLO + '25' : MORADO + '25' }]}>
                    <Text style={[gf.tipoPillText, { color: f.tipo === 'completo' ? AMARILLO : MORADO }]}>
                      {f.tipo === 'completo' ? '📅 Día completo — no descuenta' : '🕐 Medio día — descuenta 0.5'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={gf.btnEditarSmall} onPress={() => abrirEditar(f)}>
                  <Text style={{ fontSize: 15 }}>✏️</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── Lista completa ── */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={gf.seccionTitulo}>Lista de festivos ({festivos.length})</Text>
            <TouchableOpacity onPress={cargar} style={gf.btnRefresh}>
              <Text style={{ color: AZUL, fontSize: 12, fontWeight: '700' }}>🔄 Actualizar</Text>
            </TouchableOpacity>
          </View>

          {cargando && <ActivityIndicator color={AZUL} style={{ margin: 20 }} />}

          {!cargando && festivos.length === 0 && (
            <View style={gf.vacio}>
              <Text style={{ fontSize: 36, marginBottom: 10 }}>📭</Text>
              <Text style={{ color: '#aaa', fontSize: 14 }}>No hay días festivos registrados</Text>
              <TouchableOpacity style={[gf.btnNuevo, { marginTop: 14 }]} onPress={() => abrirNuevo()}>
                <Text style={gf.btnNuevoText}>＋ Agregar el primero</Text>
              </TouchableOpacity>
            </View>
          )}

          {!cargando && festivos.map(f => {
            const [d, m, y] = f.fecha.split('/');
            const esComp    = f.tipo === 'completo';
            return (
              <TouchableOpacity key={f.id} style={gf.festivoRow} onPress={() => abrirEditar(f)}>
                {/* Fecha badge */}
                <View style={[gf.fechaBadge, { backgroundColor: esComp ? '#FFF3E0' : '#F3F0FF' }]}>
                  <Text style={[gf.fechaBadgeDia, { color: esComp ? AMARILLO : MORADO }]}>{d}</Text>
                  <Text style={[gf.fechaBadgeMes, { color: esComp ? AMARILLO : MORADO }]}>{MESES[Number(m)-1]?.slice(0,3).toUpperCase()}</Text>
                  <Text style={[gf.fechaBadgeAnio, { color: esComp ? AMARILLO : MORADO }]}>{y}</Text>
                </View>
                {/* Info */}
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={gf.festivoNombre}>{f.nombre}</Text>
                  <View style={[gf.tipoPill, {
                    backgroundColor: esComp ? AMARILLO + '20' : MORADO + '20',
                    alignSelf: 'flex-start', marginTop: 4
                  }]}>
                    <Text style={[gf.tipoPillText, { color: esComp ? AMARILLO : MORADO }]}>
                      {esComp ? '📅 Día completo' : '🕐 Medio día (0.5)'}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: '#bbb', fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: AGREGAR / EDITAR FESTIVO
      ════════════════════════════════════════════════════════════════════ */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={gf.modalOverlay}>
          <View style={gf.modalCard}>
            <Text style={gf.modalTitulo}>
              {editando ? '✏️ Editar festivo' : '🎉 Nuevo día festivo'}
            </Text>

            {/* Fecha */}
            <Text style={gf.formLabel}>Fecha del día festivo</Text>
            <TextInput
              style={[gf.formInput, form.fecha && !REGEX_FECHA.test(form.fecha) && { borderColor: ROJO }]}
              placeholder="DD/MM/AAAA  (ej: 01/01/2026)"
              value={form.fecha}
              onChangeText={t => setForm(p => ({ ...p, fecha: autoFormatearFecha(t) }))}
              keyboardType="numeric"
              maxLength={10}
              placeholderTextColor="#aaa"
            />
            {form.fecha && !REGEX_FECHA.test(form.fecha) && (
              <Text style={{ color: ROJO, fontSize: 11, marginBottom: 8 }}>⚠️ Formato: DD/MM/AAAA</Text>
            )}

            {/* Nombre */}
            <Text style={gf.formLabel}>Nombre del día festivo</Text>
            <TextInput
              style={gf.formInput}
              placeholder="Ej: Día de la Independencia"
              value={form.nombre}
              onChangeText={t => setForm(p => ({ ...p, nombre: t }))}
              placeholderTextColor="#aaa"
            />

            {/* Tipo */}
            <Text style={gf.formLabel}>Tipo de festivo</Text>
            <Text style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>
              Define si este día se descuenta o no al calcular días de permiso
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <TouchableOpacity
                style={[gf.tipoBtn, form.tipo === 'completo' && gf.tipoBtnActivo, { borderColor: AMARILLO, flex: 1 }]}
                onPress={() => setForm(p => ({ ...p, tipo: 'completo' }))}>
                <Text style={{ fontSize: 22, marginBottom: 4 }}>📅</Text>
                <Text style={[gf.tipoBtnLabel, form.tipo === 'completo' && { color: AMARILLO }]}>
                  Día completo
                </Text>
                <Text style={{ fontSize: 10, color: '#aaa', textAlign: 'center', marginTop: 2 }}>
                  No descuenta días
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[gf.tipoBtn, form.tipo === 'medio' && gf.tipoBtnActivo, { borderColor: MORADO, flex: 1 }]}
                onPress={() => setForm(p => ({ ...p, tipo: 'medio' }))}>
                <Text style={{ fontSize: 22, marginBottom: 4 }}>🕐</Text>
                <Text style={[gf.tipoBtnLabel, form.tipo === 'medio' && { color: MORADO }]}>
                  Medio día
                </Text>
                <Text style={{ fontSize: 10, color: '#aaa', textAlign: 'center', marginTop: 2 }}>
                  Descuenta 0.5 días
                </Text>
              </TouchableOpacity>
            </View>

            {/* Botones */}
            {guardando
              ? <ActivityIndicator color={AZUL} style={{ marginVertical: 8 }} />
              : <TouchableOpacity style={gf.btnGuardar} onPress={guardar}>
                  <Text style={gf.btnGuardarText}>
                    💾 {editando ? 'Guardar cambios' : 'Agregar festivo'}
                  </Text>
                </TouchableOpacity>
            }

            {/* Eliminar (solo al editar) */}
            {editando && (
              confirmDelete === editando.id ? (
                <View style={gf.confirmElimRow}>
                  <Text style={gf.confirmElimText}>¿Eliminar este festivo?</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <TouchableOpacity
                      style={[gf.btnCancelar, { flex: 1, backgroundColor: ROJO + '20', borderColor: ROJO }]}
                      onPress={() => eliminar(editando.id)}>
                      <Text style={[gf.btnCancelarText, { color: ROJO }]}>🗑️ Sí, eliminar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[gf.btnCancelar, { flex: 1 }]} onPress={() => setConfirmDelete(null)}>
                      <Text style={gf.btnCancelarText}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[gf.btnCancelar, { borderColor: ROJO + '80', marginTop: 8 }]}
                  onPress={() => setConfirmDelete(editando.id)}>
                  <Text style={[gf.btnCancelarText, { color: ROJO }]}>🗑️ Eliminar festivo</Text>
                </TouchableOpacity>
              )
            )}

            <TouchableOpacity
              style={gf.btnCancelar}
              onPress={() => { setModalVisible(false); setConfirmDelete(null); }}>
              <Text style={gf.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// UTILIDAD EXPORTABLE: calcularDiasConFestivos
// ════════════════════════════════════════════════════════════════════════════
// Reemplaza la función calcularDias() en App.js.
// Recibe el array de festivos cargados desde Firestore.
//
// ORDEN DE PRIORIDAD por día:
//   1. Domingo          → 0   (siempre, aunque esté marcado como festivo)
//   2. Festivo completo → 0   (prioridad sobre sábado: sábado festivo completo → 0)
//   3. Festivo medio    → 0.5 (sábado festivo medio → 0.5, igual que sábado normal)
//   4. Sábado normal    → 0.5
//   5. Día hábil normal → 1
//
// Uso en App.js:
//   import { calcularDiasConFestivos } from './GestionFestivos';
//   const dias = calcularDiasConFestivos(fechaInicio, fechaFin, festivos);
// ════════════════════════════════════════════════════════════════════════════
export const calcularDiasConFestivos = (fechaInicio, fechaFin, festivos = []) => {
  try {
    const [d1, m1, y1] = fechaInicio.split('/');
    const [d2, m2, y2] = fechaFin.split('/');
    const inicio = new Date(Number(y1), Number(m1) - 1, Number(d1));
    const fin    = new Date(Number(y2), Number(m2) - 1, Number(d2));
    if (fin < inicio) return 0;

    // Construir mapa de festivos: clave YYYY-MM-DD (con padding) → tipo
    const mapaFestivos = {};
    for (const f of festivos) {
      const [fd, fm, fy] = f.fecha.split('/');
      if (!fd || !fm || !fy) continue;
      // FIX: padding consistente para que coincida con la clave del cursor
      const key = `${fy}-${fm.padStart(2, '0')}-${fd.padStart(2, '0')}`;
      mapaFestivos[key] = f.tipo; // 'completo' | 'medio'
    }

    let total = 0;
    const cur = new Date(inicio);
    while (cur <= fin) {
      const dow = cur.getDay();
      // FIX: padding en la clave del cursor para que coincida con el mapa
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      const tipoFestivo = mapaFestivos[key];

      if (dow === 0) {
        // Domingo → siempre 0
      } else if (tipoFestivo === 'completo') {
        // Festivo completo → no descuenta
      } else if (tipoFestivo === 'medio') {
        // Festivo medio día → 0.5
        total += 0.5;
      } else if (dow === 6) {
        // Sábado sin festivo → 0.5
        total += 0.5;
      } else {
        // Día laborable normal → 1
        total += 1;
      }

      cur.setDate(cur.getDate() + 1);
    }
    return total;
  } catch { return 1; }
};

// ════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ════════════════════════════════════════════════════════════════════════════
const AZUL_L = '#2C4A8C';
const AZUL_C = '#EEF2FB';

const gf = StyleSheet.create({
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 20 },
  titulo:           { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  subtitulo:        { fontSize: 12, color: '#888', marginTop: 2 },
  btnNuevo:         { backgroundColor: AZUL_L, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  btnNuevoText:     { color: 'white', fontWeight: '700', fontSize: 13 },

  resumenRow:       { flexDirection: 'row', backgroundColor: 'white', borderRadius: 14, marginHorizontal: 16, padding: 14, marginBottom: 14, justifyContent: 'space-around', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  resumenItem:      { alignItems: 'center' },
  resumenNum:       { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  resumenLabel:     { fontSize: 10, color: '#888', marginTop: 2 },

  calendarCard:     { backgroundColor: 'white', borderRadius: 20, marginHorizontal: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  calNavRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  calNavBtn:        { backgroundColor: AZUL_C, borderRadius: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  calNavBtnText:    { color: AZUL_L, fontWeight: '700', fontSize: 20 },
  calMesTitulo:     { fontSize: 17, fontWeight: '800', color: '#1a1a2e' },
  calCelda:         { width: '90%', aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  calDiaNum:        { fontSize: 13, fontWeight: '400', color: '#1a1a2e' },

  leyendaRow:       { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },

  detalleCard:      { backgroundColor: 'white', borderRadius: 16, marginHorizontal: 16, padding: 16, marginBottom: 14, borderLeftWidth: 4, borderLeftColor: AZUL_L },
  detalleTitulo:    { fontSize: 15, fontWeight: '800', color: '#1a1a2e', marginBottom: 10 },
  detalleItem:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F2F8' },
  detalleNombre:    { fontSize: 14, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  btnEditarSmall:   { padding: 8 },

  seccionTitulo:    { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  btnRefresh:       { backgroundColor: AZUL_C, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },

  vacio:            { backgroundColor: 'white', borderRadius: 16, padding: 40, alignItems: 'center' },

  festivoRow:       { backgroundColor: 'white', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  fechaBadge:       { width: 52, borderRadius: 12, padding: 6, alignItems: 'center' },
  fechaBadgeDia:    { fontSize: 18, fontWeight: '900' },
  fechaBadgeMes:    { fontSize: 9, fontWeight: '700', marginTop: -2 },
  fechaBadgeAnio:   { fontSize: 9, color: '#aaa', marginTop: 1 },
  festivoNombre:    { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  tipoPill:         { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  tipoPillText:     { fontSize: 11, fontWeight: '700' },

  // Modal
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:        { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalTitulo:      { fontSize: 20, fontWeight: '800', color: '#1a1a2e', marginBottom: 20 },
  formLabel:        { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 8 },
  formInput:        { backgroundColor: '#F5F7FF', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#E8EDF5', color: '#1a1a2e' },

  tipoBtn:          { borderRadius: 14, padding: 14, alignItems: 'center', backgroundColor: '#F5F7FF', borderWidth: 2, borderColor: '#E8EDF5' },
  tipoBtnActivo:    { backgroundColor: '#FFFBF0', borderWidth: 2 },
  tipoBtnLabel:     { fontSize: 13, fontWeight: '700', color: '#555', textAlign: 'center' },

  btnGuardar:       { backgroundColor: AZUL_L, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4, marginBottom: 8 },
  btnGuardarText:   { color: 'white', fontWeight: '700', fontSize: 16 },
  btnCancelar:      { backgroundColor: '#F5F7FF', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4, borderWidth: 1, borderColor: '#E8EDF5' },
  btnCancelarText:  { color: '#555', fontWeight: '700', fontSize: 14 },

  confirmElimRow:   { backgroundColor: '#FEECEC', borderRadius: 12, padding: 14, marginTop: 8 },
  confirmElimText:  { color: ROJO, fontWeight: '700', textAlign: 'center', fontSize: 14 },
});