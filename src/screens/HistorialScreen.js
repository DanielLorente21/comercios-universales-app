// ════════════════════════════════════════════════════════════════════════════
// src/screens/HistorialScreen.js · Comercios Universales
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';

import { AZUL, AZUL_CLARO } from '../constants/config';
import { calcularDias } from '../utils/calcularDias';
import { parsearFecha, REGEX_FECHA } from '../utils/fechas';
import { generarPDF } from '../services/pdf';

// ─────────────────────────────────────────────────────────────────────────────

const TIPOS = [
  { label: 'Vacaciones', icon: '🏖️', color: '#E8F4FD' },
  { label: 'IGSS',       icon: '🏥', color: '#EDF7ED' },
  { label: 'Personal',   icon: '👤', color: '#EDE8FD' },
  { label: 'Horas',      icon: '⏱️', color: '#FFF3E0' },
];

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

const parsearFechaPermiso = (str) => {
  if (!str) return new Date(0);
  const partes = str.split('/');
  if (partes.length !== 3) return new Date(0);
  const [d, m, y] = partes;
  return new Date(Number(y), Number(m) - 1, Number(d));
};

const autoFormatearFecha = (texto) => {
  const soloNumeros = texto.replace(/\D/g, '');
  const nums = soloNumeros.slice(0, 8);
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
};

// ─────────────────────────────────────────────────────────────────────────────

export default function HistorialScreen({
  usuario,
  misPermisos,
  cargando,
  festivosMapState,
  T,
  onActualizar,
  onMarcarRegreso,
}) {
  const [filtroHistorial,    setFiltroHistorial]    = useState('Todos');
  const [ordenHistorial,     setOrdenHistorial]     = useState('reciente');
  const [filtroFechaDesde,   setFiltroFechaDesde]   = useState('');
  const [filtroFechaHasta,   setFiltroFechaHasta]   = useState('');
  const [mostrarFiltroFecha, setMostrarFiltroFecha] = useState(false);
  const [historialExpandido, setHistorialExpandido] = useState(false);

  const FILTROS = ['Todos', 'Pendiente', 'Aprobado', 'Rechazado'];

  // ── Filtros ───────────────────────────────────────────────────────────────
  const fDesde = REGEX_FECHA.test(filtroFechaDesde) ? parsearFecha(filtroFechaDesde) : null;
  const fHasta = REGEX_FECHA.test(filtroFechaHasta) ? parsearFecha(filtroFechaHasta) : null;
  const hayFiltroFecha = fDesde || fHasta;

  const permisosOrdenados = [...misPermisos].sort((a, b) => {
    const diff = parsearFechaPermiso(b.fechaInicio) - parsearFechaPermiso(a.fechaInicio);
    return ordenHistorial === 'reciente' ? diff : -diff;
  });

  const porEstado = filtroHistorial === 'Todos'
    ? permisosOrdenados
    : permisosOrdenados.filter(p => p.estado === filtroHistorial);

  const porFecha = hayFiltroFecha
    ? porEstado.filter(p => {
        const f = parsearFechaPermiso(p.fechaInicio);
        if (!f || f.getTime() === 0) return false;
        if (fDesde && f < fDesde) return false;
        if (fHasta && f > fHasta) return false;
        return true;
      })
    : porEstado;

  const mostrarTodos      = historialExpandido || filtroHistorial !== 'Todos' || hayFiltroFecha;
  const permisosFiltered  = mostrarTodos ? porFecha : porFecha.slice(0, 3);
  const hayMas            = porFecha.length > 3 && !mostrarTodos;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={[s.content, { backgroundColor: T.fondo }]} showsVerticalScrollIndicator={false}>
      <Text style={[s.pageTitle, { color: T.texto }]}>Mi Historial</Text>
      <Text style={[s.pageSub,   { color: T.subTexto }]}>Todas tus solicitudes de permiso</Text>

      {/* ── Resumen ── */}
      <View style={[s.resumenRow, { backgroundColor: T.tarjeta }]}>
        {[
          { val: misPermisos.length,                                       label: 'Total',      color: '#1a1a2e' },
          { val: misPermisos.filter(p => p.estado === 'Pendiente').length, label: 'Pendientes', color: '#F59E0B' },
          { val: misPermisos.filter(p => p.estado === 'Aprobado').length,  label: 'Aprobados',  color: '#4CAF7D' },
          { val: misPermisos.filter(p => p.estado === 'Rechazado').length, label: 'Rechazados', color: '#EF5350' },
        ].map(item => (
          <View key={item.label} style={s.resumenItem}>
            <Text style={[s.resumenNum,   { color: item.color }]}>{item.val}</Text>
            <Text style={[s.resumenLabel, { color: T.subTexto }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Filtros de estado ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        {FILTROS.map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filtroPill, { backgroundColor: T.tarjeta, borderColor: T.borde }, filtroHistorial === f && s.filtroPillActivo]}
            onPress={() => { setFiltroHistorial(f); setHistorialExpandido(false); }}
          >
            <Text style={[s.filtroPillText, { color: T.subTexto }, filtroHistorial === f && s.filtroPillTextActivo]}>
              {f === 'Pendiente' ? '⏳ ' : f === 'Aprobado' ? '✅ ' : f === 'Rechazado' ? '❌ ' : '📋 '}{f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Filtro por rango de fechas ── */}
      <TouchableOpacity
        style={[s.ordenBtn, { backgroundColor: hayFiltroFecha ? AZUL : T.tarjeta, borderColor: hayFiltroFecha ? AZUL : T.borde }]}
        onPress={() => setMostrarFiltroFecha(v => !v)}
      >
        <Text style={[s.ordenBtnText, { color: hayFiltroFecha ? 'white' : AZUL }]}>
          {hayFiltroFecha
            ? `📅 ${filtroFechaDesde || '...'} → ${filtroFechaHasta || '...'}`
            : '📅 Filtrar por rango de fechas'}
        </Text>
        <Text style={[s.ordenBtnFlecha, { color: hayFiltroFecha ? 'white' : AZUL }]}>
          {mostrarFiltroFecha ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {mostrarFiltroFecha && (
        <View style={{ backgroundColor: T.tarjeta, borderRadius: 14, padding: 14, marginBottom: 10, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[s.formLabel, { color: T.subTexto, marginBottom: 4 }]}>Desde</Text>
              <TextInput
                style={[s.formInput, { backgroundColor: T.inputFondo, color: T.texto, borderColor: T.borde, marginBottom: 0 }]}
                placeholder="DD/MM/AAAA" placeholderTextColor={T.subTexto}
                value={filtroFechaDesde}
                onChangeText={t => setFiltroFechaDesde(autoFormatearFecha(t))}
                keyboardType="numeric" maxLength={10}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.formLabel, { color: T.subTexto, marginBottom: 4 }]}>Hasta</Text>
              <TextInput
                style={[s.formInput, { backgroundColor: T.inputFondo, color: T.texto, borderColor: T.borde, marginBottom: 0 }]}
                placeholder="DD/MM/AAAA" placeholderTextColor={T.subTexto}
                value={filtroFechaHasta}
                onChangeText={t => setFiltroFechaHasta(autoFormatearFecha(t))}
                keyboardType="numeric" maxLength={10}
              />
            </View>
          </View>
          {(filtroFechaDesde || filtroFechaHasta) && (
            <TouchableOpacity
              style={{ backgroundColor: '#FEECEC', borderRadius: 10, padding: 10, alignItems: 'center' }}
              onPress={() => { setFiltroFechaDesde(''); setFiltroFechaHasta(''); }}
            >
              <Text style={{ color: '#EF5350', fontWeight: '700', fontSize: 13 }}>✕ Limpiar fechas</Text>
            </TouchableOpacity>
          )}
          {hayFiltroFecha && (
            <View style={{ backgroundColor: AZUL_CLARO, borderRadius: 10, padding: 8, alignItems: 'center' }}>
              <Text style={{ color: AZUL, fontWeight: '600', fontSize: 12 }}>
                {porFecha.length} permiso(s) en este período
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Toggle orden ── */}
      <TouchableOpacity
        style={[s.ordenBtn, { backgroundColor: T.tarjeta, borderColor: T.borde }]}
        onPress={() => setOrdenHistorial(o => o === 'reciente' ? 'antiguo' : 'reciente')}
      >
        <Text style={[s.ordenBtnText, { color: AZUL }]}>
          {ordenHistorial === 'reciente' ? '🕐 Más recientes primero' : '🕙 Más antiguos primero'}
        </Text>
        <Text style={s.ordenBtnFlecha}>⇅</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.btnActualizar} onPress={onActualizar}>
        <Text style={s.btnActualizarText}>🔄 Actualizar</Text>
      </TouchableOpacity>

      {cargando && <ActivityIndicator color={AZUL} style={{ margin: 20 }} />}

      {!cargando && permisosFiltered.length === 0 && (
        <View style={[s.vacio, { backgroundColor: T.tarjeta }]}>
          <Text style={[s.vacioTexto, { color: T.subTexto }]}>
            {hayFiltroFecha
              ? 'Sin permisos en ese período'
              : filtroHistorial === 'Todos'
                ? 'No tienes solicitudes aún'
                : `No tienes solicitudes ${filtroHistorial.toLowerCase()}s`}
          </Text>
        </View>
      )}

      {/* ── Lista de permisos ── */}
      {!cargando && permisosFiltered.map(p => {
        const tipoInfo = TIPOS.find(t => t.label === p.tipo);
        return (
          <View key={p.id} style={[s.aprobarCard, p.estado === 'Pendiente' && s.aprobarCardPendiente, { backgroundColor: T.tarjeta }]}>
            <View style={s.aprobarHeader}>
              <View style={[s.historialIconBox, { backgroundColor: tipoInfo?.color ?? AZUL_CLARO }]}>
                <Text style={s.historialIconText}>{tipoInfo?.icon ?? '📄'}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[s.aprobarNombre, { color: T.texto }]}>
                  {p.tipo}{p.tipo === 'Personal' && p.duracion === 'medioDia' ? ' — ½ día' : ''}
                </Text>
                {p.tipo !== 'Horas' ? (
                  <>
                    <Text style={[s.aprobarFecha, { color: T.subTexto }]}>📅 {p.fechaInicio} → {p.fechaFin}</Text>
                    <Text style={[s.aprobarFecha, { marginTop: 2, color: T.subTexto }]}>
                      {p.tipo === 'Personal' && p.duracion === 'medioDia'
                        ? '½ día'
                        : `${calcularDias(p.fechaInicio, p.fechaFin, festivosMapState)} día(s)`}
                    </Text>
                  </>
                ) : (
                  <Text style={[s.aprobarFecha, { color: T.subTexto }]}>⏱️ {p.horasSolicitadas} hora(s) · {p.fechaInicio}</Text>
                )}
              </View>
              <View style={[s.estadoTag, { backgroundColor: colorEstado(p.estado) + '20' }]}>
                <Text style={[s.estadoTagText, { color: colorEstado(p.estado) }]}>
                  {iconoEstado(p.estado)} {p.estado}
                </Text>
              </View>
            </View>

            <View style={[s.aprobarDetalle, { marginTop: 8, backgroundColor: T.inputFondo }]}>
              <Text style={[s.aprobarMotivo, { color: T.subTexto }]}>💬 {p.motivo}</Text>
            </View>

            {/* Info horas */}
            {p.tipo === 'Horas' && (
              <View style={{ marginTop: 8, backgroundColor: '#FFF3E0', borderRadius: 10, padding: 10, gap: 4 }}>
                {p.horasSolicitadas  ? <Text style={{ fontSize: 12, color: '#E65100', fontWeight: '700' }}>⏱️ Solicitó: {p.horasSolicitadas} hora(s)</Text> : null}
                {p.horaAprobacion    ? <Text style={{ fontSize: 12, color: '#555' }}>🟢 Hora de salida aprobada: {p.horaAprobacion}</Text> : null}
                {p.horaRegreso       ? <Text style={{ fontSize: 12, color: '#4A9EC4', fontWeight: '600' }}>🔵 Regresó a las: {p.horaRegreso}</Text> : null}
                {p.tiempoRealMinutos ? <Text style={{ fontSize: 12, color: '#555' }}>⏱️ Tiempo real: {p.tiempoRealMinutos} min</Text> : null}
                {p.descuentoResuelto === 'true' && (
                  <Text style={{ fontSize: 12, color: '#E65100', fontWeight: '600' }}>
                    💳 Descuento: {p.diasDescontados === '0' ? 'Sin descuento' : p.diasDescontados === '0.5' ? '½ día' : '1 día completo'}
                  </Text>
                )}
              </View>
            )}

            {/* Botón Ya Regresé */}
            {p.tipo === 'Horas' && p.estado === 'Aprobado' && p.horaAprobacion && !p.horaRegreso && (
              <TouchableOpacity
                style={{ marginTop: 10, backgroundColor: '#E65100', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onPress={() => onMarcarRegreso(p.id)}
              >
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>✋ Ya Regresé</Text>
              </TouchableOpacity>
            )}

            {p.aprobadoPor ? (
              <Text style={{ color: '#888', fontSize: 11, marginTop: 6, marginLeft: 2 }}>
                👤 {p.estado === 'Rechazado' ? 'Rechazado por:' : 'Aprobado por:'} {p.aprobadoPor}
                {p.fechaAprobacion ? ` · ${p.fechaAprobacion}` : ''}
              </Text>
            ) : null}

            {p.estado === 'Aprobado' && p.tipo !== 'Horas' && (
              <TouchableOpacity
                style={{ marginTop: 10, backgroundColor: '#EEF2FB', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onPress={() => generarPDF(p, usuario)}
              >
                <Text style={{ color: '#2C4A8C', fontWeight: '700', fontSize: 13 }}>📄 Descargar comprobante PDF</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* ── Ver más ── */}
      {!cargando && hayMas && (
        <TouchableOpacity
          style={[s.verTodosBtn, { backgroundColor: T.tarjeta, borderWidth: 1, borderColor: T.borde }]}
          onPress={() => setHistorialExpandido(true)}
        >
          <Text style={s.verTodosBtnText}>Ver todos ({porFecha.length - 3} más) →</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  content:              { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  pageTitle:            { fontSize: 22, fontWeight: '800', color: '#1a1a2e', marginBottom: 2 },
  pageSub:              { fontSize: 12, color: '#888', marginBottom: 16 },
  resumenRow:           { flexDirection: 'row', backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 14, justifyContent: 'space-around' },
  resumenItem:          { alignItems: 'center' },
  resumenNum:           { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  resumenLabel:         { fontSize: 10, color: '#888', marginTop: 2 },
  filtroPill:           { backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, borderWidth: 1, borderColor: '#E8EDF5' },
  filtroPillActivo:     { backgroundColor: AZUL, borderColor: AZUL },
  filtroPillText:       { fontSize: 12, fontWeight: '600', color: '#666' },
  filtroPillTextActivo: { color: 'white' },
  ordenBtn:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, borderWidth: 1, borderColor: '#E8EDF5' },
  ordenBtnText:         { fontSize: 13, color: AZUL, fontWeight: '700' },
  ordenBtnFlecha:       { fontSize: 16, color: AZUL, fontWeight: '700' },
  btnActualizar:        { backgroundColor: AZUL, borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 14 },
  btnActualizarText:    { color: 'white', fontWeight: '700', fontSize: 14 },
  vacio:                { backgroundColor: 'white', borderRadius: 16, padding: 30, alignItems: 'center', marginTop: 10 },
  vacioTexto:           { color: '#aaa', fontSize: 14 },
  aprobarCard:          { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12 },
  aprobarCardPendiente: { borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  aprobarHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  aprobarNombre:        { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  aprobarFecha:         { fontSize: 12, color: '#555', marginBottom: 4 },
  aprobarMotivo:        { fontSize: 12, color: '#555', marginBottom: 4 },
  aprobarDetalle:       { backgroundColor: '#F5F7FF', borderRadius: 10, padding: 10, marginBottom: 12 },
  historialIconBox:     { width: 42, height: 42, borderRadius: 12, backgroundColor: AZUL_CLARO, alignItems: 'center', justifyContent: 'center' },
  historialIconText:    { fontSize: 20 },
  estadoTag:            { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  estadoTagText:        { fontSize: 11, fontWeight: '700' },
  verTodosBtn:          { backgroundColor: AZUL_CLARO, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 4 },
  verTodosBtnText:      { color: AZUL, fontWeight: '700', fontSize: 13 },
  formLabel:            { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 8 },
  formInput:            { backgroundColor: 'white', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 4, borderWidth: 1, borderColor: '#E8EDF5' },
});
