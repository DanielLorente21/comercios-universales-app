// ════════════════════════════════════════════════════════════════════════════
// src/screens/HomeScreen.js · Comercios Universales
// ════════════════════════════════════════════════════════════════════════════

import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';

import { AZUL, AZUL_CLARO } from '../constants/config';

// ─────────────────────────────────────────────────────────────────────────────

const TIPOS = [
  { label: 'Vacaciones', icon: '🏖️', color: '#E8F4FD', iconColor: '#4A9EC4' },
  { label: 'IGSS',       icon: '🏥', color: '#EDF7ED', iconColor: '#4CAF7D' },
  { label: 'Personal',   icon: '👤', color: '#EDE8FD', iconColor: '#7C4DCC' },
  { label: 'Horas',      icon: '⏱️', color: '#FFF3E0', iconColor: '#E65100' },
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
const rolLabel = (r) => {
  if (r === 'dueno')     return '👑 Dueño';
  if (r === 'contralor') return '🏢 Contralor';
  if (r === 'jefe')      return '👔 Jefe de Área';
  return '🗂️ Auxiliar';
};

// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen({
  usuario,
  diasDisponibles,
  misPermisos,
  pendientesCount,
  puedeAprobar,
  cargando,
  T,
  onIrANuevo,
  onIrAHistorial,
}) {
  const barWidth = `${Math.min(100, (diasDisponibles / 15) * 100)}%`;

  return (
    <ScrollView style={[s.content, { backgroundColor: T.fondo }]} showsVerticalScrollIndicator={false}>

      {/* ── Saludo y stats ── */}
      <View style={[s.saludoBox, { backgroundColor: T.saludoBox }]}>
        <Text style={s.saludoHola}>Hola, {usuario.nombre?.split(' ')[0]} 👋</Text>
        <Text style={s.saludoCargo}>{usuario.cargo} | {usuario.codigo}</Text>
        {usuario.departamento
          ? <Text style={s.saludoDept}>📁 {usuario.departamento}</Text>
          : null}
        <View style={s.rolTag}>
          <Text style={s.rolTagText}>{rolLabel(usuario.rol)}</Text>
        </View>
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statLabel}>Días disponibles:</Text>
            <View style={s.statBar}>
              <View style={[s.statFill, { width: barWidth }]} />
            </View>
            <Text style={s.statVal}>
              {Number.isInteger(diasDisponibles) ? diasDisponibles : diasDisponibles.toFixed(2)}
            </Text>
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
                <Text style={[s.statVal, { color: '#EF5350', fontSize: 18 }]}>{pendientesCount}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* ── Módulos de acceso rápido ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.modulosScroll}>
        {TIPOS.map(t => (
          <TouchableOpacity
            key={t.label}
            style={[s.moduloCard, { backgroundColor: t.color }]}
            onPress={() => onIrANuevo(t.label)}
          >
            <Text style={s.moduloIcon}>{t.icon}</Text>
            <Text style={[s.moduloLabel, { color: t.iconColor }]}>{t.label}</Text>
            <Text style={[s.moduloFlecha, { color: t.iconColor }]}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Historial reciente ── */}
      <View style={s.seccionRow}>
        <Text style={[s.seccionTitle, { color: T.texto }]}>Mi Historial Reciente</Text>
      </View>

      {cargando && <ActivityIndicator color={AZUL} style={{ margin: 20 }} />}

      {!cargando && misPermisos.length === 0 && (
        <View style={[s.vacio, { backgroundColor: T.tarjeta }]}>
          <Text style={[s.vacioTexto, { color: T.subTexto }]}>No tienes solicitudes aún</Text>
        </View>
      )}

      {misPermisos.slice(0, 3).map(p => (
        <View key={p.id} style={[s.historialItem, { backgroundColor: T.tarjeta }]}>
          <View style={s.historialIconBox}>
            <Text style={s.historialIconText}>{TIPOS.find(t => t.label === p.tipo)?.icon ?? '📄'}</Text>
          </View>
          <View style={s.historialInfo}>
            <Text style={[s.historialTipo,  { color: T.texto }]}>{p.tipo}</Text>
            <Text style={[s.historialFecha, { color: T.subTexto }]}>{p.fechaInicio} — {p.fechaFin}</Text>
          </View>
          <View style={[s.estadoTag, { backgroundColor: colorEstado(p.estado) + '20' }]}>
            <Text style={[s.estadoTagText, { color: colorEstado(p.estado) }]}>
              {iconoEstado(p.estado)} {p.estado}
            </Text>
          </View>
        </View>
      ))}

      {misPermisos.length > 3 && (
        <TouchableOpacity style={s.verTodosBtn} onPress={onIrAHistorial}>
          <Text style={s.verTodosBtnText}>Ver todo el historial →</Text>
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
  content:         { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  saludoBox:       { backgroundColor: AZUL, borderRadius: 20, padding: 20, marginBottom: 20 },
  saludoHola:      { color: 'white', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  saludoCargo:     { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 2 },
  saludoDept:      { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 8 },
  rolTag:          { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 12 },
  rolTagText:      { color: 'white', fontSize: 11, fontWeight: '700' },
  statsRow:        { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  statItem:        { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statLabel:       { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  statBar:         { height: 6, width: 44, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3 },
  statFill:        { height: 6, backgroundColor: '#4CAF7D', borderRadius: 3 },
  statVal:         { color: 'white', fontWeight: '700', fontSize: 14 },
  statDivider:     { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 8 },
  modulosScroll:   { marginBottom: 20 },
  moduloCard:      { width: 130, borderRadius: 16, padding: 16, marginRight: 12, minHeight: 100, justifyContent: 'space-between' },
  moduloIcon:      { fontSize: 28 },
  moduloLabel:     { fontSize: 14, fontWeight: '700' },
  moduloFlecha:    { fontSize: 20, fontWeight: '700', alignSelf: 'flex-end' },
  seccionRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seccionTitle:    { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  vacio:           { backgroundColor: 'white', borderRadius: 16, padding: 30, alignItems: 'center', marginTop: 10 },
  vacioTexto:      { color: '#aaa', fontSize: 14 },
  historialItem:   { backgroundColor: 'white', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  historialIconBox:{ width: 42, height: 42, borderRadius: 12, backgroundColor: AZUL_CLARO, alignItems: 'center', justifyContent: 'center' },
  historialIconText:{ fontSize: 20 },
  historialInfo:   { flex: 1 },
  historialTipo:   { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  historialFecha:  { fontSize: 11, color: '#888', marginTop: 2 },
  estadoTag:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  estadoTagText:   { fontSize: 11, fontWeight: '700' },
  verTodosBtn:     { backgroundColor: AZUL_CLARO, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 4 },
  verTodosBtnText: { color: AZUL, fontWeight: '700', fontSize: 13 },
});
