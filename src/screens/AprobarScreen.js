// ════════════════════════════════════════════════════════════════════════════
// AprobarScreen.js — Lista de solicitudes pendientes para aprobar/rechazar
// CAMBIOS:
//   - NUEVO: Tarjeta de Suspensión IGSS con confirmar / rechazar / extender
//   - Se recibe onAprobarSuspensionIGSS, onRechazarSuspensionIGSS, onExtenderSuspensionIGSS
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { AZUL, TIPOS } from '../constants/config';
import { calcularDias, } from '../utils/calcularDias';
import { REGEX_FECHA } from '../utils/fechas';

const colorEstado = (e) => { if (e === 'Aprobado') return '#4CAF7D'; if (e === 'Rechazado') return '#EF5350'; return '#F59E0B'; };
const iconoEstado = (e) => { if (e === 'Aprobado') return '✅'; if (e === 'Rechazado') return '❌'; return '⏳'; };
const rolLabel    = (r) => {
  if (r === 'gerente')     return '👑 Gerente';
  if (r === 'contralor') return '🏢 Contralor';
  if (r === 'jefe')      return '👔 Jefe de Área';
  return '🗂️ Auxiliar';
};

// ── Auto-formateador de fecha ──────────────────────────────────────────────
const autoFormatearFecha = (texto) => {
  const soloNumeros = texto.replace(/\D/g, '');
  const nums = soloNumeros.slice(0, 8);
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
};

// ── Tarjeta de Suspensión IGSS ────────────────────────────────────────────
function TarjetaSuspensionIGSS({ p, T, onAprobar, onRechazar, onExtender }) {
  const [extendiendo,    setExtendiendo]    = useState(false);
  const [nuevaFechaFin,  setNuevaFechaFin]  = useState('');
  const [nuevaBoleta,    setNuevaBoleta]    = useState('');

  const handleExtender = () => {
    if (!REGEX_FECHA.test(nuevaFechaFin)) {
      Alert.alert('Error', 'Ingresa una fecha válida (DD/MM/AAAA)');
      return;
    }
    onExtender(p.id, nuevaFechaFin, nuevaBoleta);
    setExtendiendo(false);
    setNuevaFechaFin('');
    setNuevaBoleta('');
  };

  return (
    <View style={[
      { backgroundColor: T.tarjeta, borderRadius: 16, padding: 16, marginBottom: 12 },
      p.estado === 'Pendiente' && { borderLeftWidth: 4, borderLeftColor: '#1565C0' },
    ]}>
      {/* Cabecera */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: T.texto }}>{p.nombre}</Text>
          <Text style={{ fontSize: 11, color: T.subTexto, marginTop: 2 }}>{p.cargo} | {p.codigo}</Text>
          <Text style={{ fontSize: 11, color: '#4A9EC4', marginTop: 2 }}>📁 {p.departamento} · {rolLabel(p.rol)}</Text>
        </View>
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: colorEstado(p.estado) + '20' }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colorEstado(p.estado) }}>{iconoEstado(p.estado)} {p.estado}</Text>
        </View>
      </View>

      {/* Badge de tipo */}
      <View style={{ backgroundColor: '#E3F0FF', borderRadius: 10, padding: 10, marginBottom: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1565C0', marginBottom: 4 }}>🏥 Suspensión IGSS</Text>
        <Text style={{ fontSize: 12, color: '#1976D2' }}>
          📅 {p.fechaInicio} → {p.fechaFin}
        </Text>
        {p.numeroBoleta ? (
          <Text style={{ fontSize: 12, color: '#1976D2', marginTop: 2 }}>📋 Boleta: {p.numeroBoleta}</Text>
        ) : null}
        <Text style={{ fontSize: 12, color: T.subTexto, marginTop: 4 }}>💬 {p.motivo}</Text>
        <View style={{ backgroundColor: '#C8E6FA', borderRadius: 8, padding: 6, marginTop: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#0D47A1', textAlign: 'center' }}>
            🔒 Sin descuento de vacaciones
          </Text>
        </View>
        {p.fechaExtension ? (
          <Text style={{ fontSize: 11, color: '#888', marginTop: 4 }}>🔄 Extendida el {p.fechaExtension} por {p.extendidaPor}</Text>
        ) : null}
      </View>

      {/* Botones según estado */}
      {p.estado === 'Pendiente' && (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: '#E3F0FF', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#1565C0' }}
              onPress={() => onAprobar(p.id)}
            >
              <Text style={{ color: '#1565C0', fontWeight: '700' }}>✅ Confirmar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: '#FEECEC', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#EF5350' }}
              onPress={() => onRechazar(p.id)}
            >
              <Text style={{ color: '#EF5350', fontWeight: '700' }}>❌ Rechazar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Suspensión aprobada: mostrar opción de extender */}
      {p.estado === 'Aprobado' && (
        <View style={{ gap: 8 }}>
          <View style={{ backgroundColor: '#EDF7ED', borderRadius: 8, padding: 8 }}>
            <Text style={{ color: '#4CAF7D', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
              ✅ Suspensión confirmada · Sin descuento
            </Text>
          </View>
          {!extendiendo ? (
            <TouchableOpacity
              style={{ backgroundColor: '#FFF3E0', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#F59E0B' }}
              onPress={() => setExtendiendo(true)}
            >
              <Text style={{ color: '#E65100', fontWeight: '700', fontSize: 12 }}>🔄 El IGSS extendió la suspensión</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ backgroundColor: '#FFF8E1', borderRadius: 12, padding: 12, gap: 8 }}>
              <Text style={{ fontWeight: '700', color: '#E65100', fontSize: 13 }}>🔄 Extender suspensión</Text>
              <TextInput
                style={{ backgroundColor: 'white', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FFE0B2', fontSize: 14 }}
                placeholder="Nueva fecha fin (DD/MM/AAAA)"
                value={nuevaFechaFin}
                onChangeText={(t) => setNuevaFechaFin(autoFormatearFecha(t))}
                keyboardType="numeric"
                maxLength={10}
              />
              <TextInput
                style={{ backgroundColor: 'white', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FFE0B2', fontSize: 14 }}
                placeholder="Nuevo N° de boleta (opcional)"
                value={nuevaBoleta}
                onChangeText={setNuevaBoleta}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={{ flex: 0.4, backgroundColor: 'white', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' }}
                  onPress={() => { setExtendiendo(false); setNuevaFechaFin(''); setNuevaBoleta(''); }}
                >
                  <Text style={{ color: '#888', fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#E65100', borderRadius: 10, padding: 10, alignItems: 'center' }}
                  onPress={handleExtender}
                >
                  <Text style={{ color: 'white', fontWeight: '700' }}>Guardar extensión</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function AprobarScreen({
  usuario,
  permisosParaAprobar,
  cargando,
  festivosMapState,
  T,
  onActualizar,
  onCambiarEstado,
  onDescuentoHoras,
  onAprobarSuspensionIGSS,
  onRechazarSuspensionIGSS,
  onExtenderSuspensionIGSS,
}) {
  const pendientes = permisosParaAprobar.filter(p => p.estado === 'Pendiente');
  const lista      = [...pendientes, ...permisosParaAprobar.filter(p => p.estado !== 'Pendiente')];

  const renderItem = ({ item: p }) => {
    // ── Tarjeta de Suspensión IGSS ──────────────────────────────────
    if (p.tipo === 'Suspensión IGSS' || p.esSuspension === 'true') {
      return (
        <TarjetaSuspensionIGSS
          p={p} T={T}
          onAprobar={onAprobarSuspensionIGSS}
          onRechazar={onRechazarSuspensionIGSS}
          onExtender={onExtenderSuspensionIGSS}
        />
      );
    }

    // ── Tarjeta normal ──────────────────────────────────────────────
    return (
      <View style={[
        { backgroundColor: T.tarjeta, borderRadius: 16, padding: 16, marginBottom: 12 },
        p.estado === 'Pendiente' && { borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
      ]}>
        {/* Cabecera */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: T.texto }}>{p.nombre}</Text>
            <Text style={{ fontSize: 11, color: T.subTexto, marginTop: 2 }}>{p.cargo} | {p.codigo}</Text>
            <Text style={{ fontSize: 11, color: '#4A9EC4', marginTop: 2 }}>📁 {p.departamento} · {rolLabel(p.rol)}</Text>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: colorEstado(p.estado) + '20' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colorEstado(p.estado) }}>{iconoEstado(p.estado)} {p.estado}</Text>
          </View>
        </View>

        {/* Detalle */}
        <View style={{ backgroundColor: T.inputFondo, borderRadius: 10, padding: 10, marginBottom: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: T.texto, marginBottom: 4 }}>
            {TIPOS.find(t => t.label === p.tipo)?.icon ?? '📄'} {p.tipo}
          </Text>
          {p.tipo === 'Horas' ? (
            <>
              <Text style={{ fontSize: 12, color: T.subTexto }}>⏱️ Solicita {p.horasSolicitadas} hora(s) · {p.fechaInicio}</Text>
              {p.horaAprobacion ? <Text style={{ fontSize: 12, color: '#4CAF7D' }}>🟢 Hora salida: {p.horaAprobacion}</Text> : null}
              {p.horaRegreso    ? <Text style={{ fontSize: 12, color: '#4A9EC4' }}>🔵 Regresó: {p.horaRegreso}</Text> : null}
            </>
          ) : (
            <Text style={{ fontSize: 12, color: T.subTexto }}>
              📅 {p.fechaInicio} → {p.fechaFin} ({calcularDias(p.fechaInicio, p.fechaFin, festivosMapState)} día(s))
            </Text>
          )}
          <Text style={{ fontSize: 12, color: T.subTexto, marginTop: 4 }}>💬 {p.motivo}</Text>
        </View>

        {/* Panel de horas */}
        {p.tipo === 'Horas' && (
          <View style={{ marginBottom: 8, backgroundColor: '#FFF3E0', borderRadius: 10, padding: 10, gap: 4 }}>
            {p.horasSolicitadas  ? <Text style={{ fontSize: 12, color: '#E65100', fontWeight: '700' }}>⏱️ Solicitó: {p.horasSolicitadas} hora(s)</Text> : null}
            {p.horaAprobacion    ? <Text style={{ fontSize: 12, color: '#4CAF7D', fontWeight: '600' }}>🟢 Hora salida: {p.horaAprobacion}</Text> : null}
            {p.horaRegreso       ? <Text style={{ fontSize: 12, color: '#4A9EC4', fontWeight: '600' }}>🔵 Regresó: {p.horaRegreso}</Text> : null}
            {p.tiempoRealMinutos ? <Text style={{ fontSize: 12, color: '#555' }}>⏱️ Tiempo real: {p.tiempoRealMinutos} min</Text> : null}
          </View>
        )}

        {/* Horas: Pendiente */}
        {p.tipo === 'Horas' && p.estado === 'Pendiente' && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={{ flex: 1, backgroundColor: '#EDF7ED', borderRadius: 10, padding: 10, alignItems: 'center' }} onPress={() => onCambiarEstado(p.id, 'Aprobado')}>
              <Text style={{ color: '#4CAF7D', fontWeight: '700' }}>⏱️ Aprobar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1, backgroundColor: '#FEECEC', borderRadius: 10, padding: 10, alignItems: 'center' }} onPress={() => onCambiarEstado(p.id, 'Rechazado')}>
              <Text style={{ color: '#EF5350', fontWeight: '700' }}>❌ Rechazar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Horas: Aprobado sin regreso */}
        {p.tipo === 'Horas' && p.estado === 'Aprobado' && p.horaAprobacion && !p.horaRegreso && (
          <View style={{ backgroundColor: '#FFF8E1', borderRadius: 10, padding: 10 }}>
            <Text style={{ fontWeight: '700', color: '#F59E0B', fontSize: 12, textAlign: 'center' }}>⏳ Esperando regreso del empleado...</Text>
            <Text style={{ color: '#aaa', fontSize: 11, textAlign: 'center', marginTop: 4 }}>Las opciones de descuento aparecerán cuando marque "Ya Regresé"</Text>
          </View>
        )}

        {/* Horas: con regreso, sin resolver */}
        {p.tipo === 'Horas' && p.estado === 'Aprobado' && p.horaRegreso && p.descuentoResuelto !== 'true' && (
          <View style={{ backgroundColor: '#E8F4FD', borderRadius: 10, padding: 12 }}>
            <Text style={{ fontWeight: '700', color: AZUL, fontSize: 13, marginBottom: 4 }}>🔵 Regresó a las {p.horaRegreso}</Text>
            {p.tiempoRealMinutos ? <Text style={{ color: '#555', fontSize: 12, marginBottom: 8 }}>⏱️ Tiempo real: {p.tiempoRealMinutos} min</Text> : null}
            <Text style={{ fontWeight: '700', color: '#1a1a2e', fontSize: 12, marginBottom: 8 }}>¿Descontar de vacaciones?</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: '#EDF7ED', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#4CAF7D' }} onPress={() => onDescuentoHoras(p.id, 'no')}>
                <Text style={{ color: '#2E7D32', fontWeight: '700', fontSize: 12 }}>✅ Sin desc.</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, backgroundColor: '#FFF8E1', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#F59E0B' }} onPress={() => onDescuentoHoras(p.id, 'medio')}>
                <Text style={{ color: '#E65100', fontWeight: '700', fontSize: 12 }}>½ Día</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, backgroundColor: '#FEECEC', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#EF5350' }} onPress={() => onDescuentoHoras(p.id, 'completo')}>
                <Text style={{ color: '#C62828', fontWeight: '700', fontSize: 12 }}>1 Día</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Horas: resuelto */}
        {p.tipo === 'Horas' && p.estado === 'Aprobado' && p.horaRegreso && p.descuentoResuelto === 'true' && (
          <View style={{ backgroundColor: '#EDF7ED', borderRadius: 8, padding: 10 }}>
            <Text style={{ color: '#4CAF7D', fontSize: 12, fontWeight: '700' }}>✅ Permiso completado</Text>
            <Text style={{ color: '#555', fontSize: 12, marginTop: 2 }}>
              {p.diasDescontados === '0' ? 'Sin descuento' : p.diasDescontados === '0.5' ? 'Desc: ½ día' : 'Desc: 1 día'}
            </Text>
          </View>
        )}

        {/* Días: Pendiente */}
        {p.tipo !== 'Horas' && p.estado === 'Pendiente' && (() => {
          const esPersonal = p.tipo === 'Personal';
          const esMedioDia = p.duracion === 'medioDia';
          return (
            <View style={{ gap: 8, marginTop: 4 }}>
              {esPersonal ? (
                <>
                  {esMedioDia && (
                    <View style={{ backgroundColor: '#EDE8FD', borderRadius: 10, padding: 8, marginBottom: 4 }}>
                      <Text style={{ color: '#7C4DCC', fontWeight: '700', fontSize: 12, textAlign: 'center' }}>🕐 Solicita ½ día</Text>
                    </View>
                  )}
                  <TouchableOpacity style={{ backgroundColor: '#EDF7ED', borderRadius: 10, padding: 10, alignItems: 'center' }} onPress={() => onCambiarEstado(p.id, 'Aprobado', false)}>
                    <Text style={{ color: '#2E7D32', fontWeight: '700' }}>✅ Aprobar sin descuento</Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={{ flex: 1, backgroundColor: '#FFF8E1', borderRadius: 10, padding: 10, alignItems: 'center' }} onPress={() => onCambiarEstado(p.id, 'Aprobado', 0.5)}>
                      <Text style={{ color: '#E65100', fontWeight: '700', fontSize: 12 }}>{'✅ Aprobar\ndesc. ½ día'}</Text>
                    </TouchableOpacity>
                    {/* BUG FIX #2: siempre pasa 1 explícito, el handler respeta el override del jefe */}
                    <TouchableOpacity style={{ flex: 1, backgroundColor: '#FFE0E0', borderRadius: 10, padding: 10, alignItems: 'center' }} onPress={() => onCambiarEstado(p.id, 'Aprobado', 1)}>
                      <Text style={{ color: '#C62828', fontWeight: '700', fontSize: 12 }}>{'✅ Aprobar\ndesc. 1 día'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flex: 0.6, backgroundColor: '#FEECEC', borderRadius: 10, padding: 10, alignItems: 'center' }} onPress={() => onCambiarEstado(p.id, 'Rechazado')}>
                      <Text style={{ color: '#EF5350', fontWeight: '700' }}>❌</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={{ flex: 1, backgroundColor: '#EDF7ED', borderRadius: 10, padding: 10, alignItems: 'center' }} onPress={() => onCambiarEstado(p.id, 'Aprobado')}>
                    <Text style={{ color: '#4CAF7D', fontWeight: '700' }}>✅ Aprobar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flex: 1, backgroundColor: '#FEECEC', borderRadius: 10, padding: 10, alignItems: 'center' }} onPress={() => onCambiarEstado(p.id, 'Rechazado')}>
                    <Text style={{ color: '#EF5350', fontWeight: '700' }}>❌ Rechazar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })()}
      </View>
    );
  };

  return (
    <FlatList
      data={lista}
      keyExtractor={p => p.id}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40, backgroundColor: T.fondo }}
      renderItem={renderItem}
      ListHeaderComponent={
        <>
          <Text style={{ fontSize: 22, fontWeight: '800', color: T.texto, marginBottom: 2 }}>Aprobar Solicitudes</Text>
          <Text style={{ fontSize: 12, color: T.subTexto, marginBottom: 16 }}>
            {usuario?.rol === 'gerente' || usuario?.rol === 'contralor'
              ? 'Vista completa — Todos los departamentos'
              : `Dept: ${usuario?.departamento} — ${rolLabel(usuario?.rol)}`}
          </Text>
          {/* Resumen */}
          <View style={{ backgroundColor: T.tarjeta, borderRadius: 14, padding: 14, flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 }}>
            {[
              { val: permisosParaAprobar.length,                                        label: 'Total',      color: '#1a1a2e' },
              { val: pendientes.length,                                                  label: 'Pendientes', color: '#F59E0B' },
              { val: permisosParaAprobar.filter(p => p.estado === 'Aprobado').length,   label: 'Aprobados',  color: '#4CAF7D' },
              { val: permisosParaAprobar.filter(p => p.estado === 'Rechazado').length,  label: 'Rechazados', color: '#EF5350' },
            ].map(item => (
              <View key={item.label} style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: item.color }}>{item.val}</Text>
                <Text style={{ fontSize: 10, color: T.subTexto, marginTop: 2 }}>{item.label}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={{ backgroundColor: AZUL, borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 14 }} onPress={onActualizar}>
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>🔄 Actualizar lista</Text>
          </TouchableOpacity>
          {cargando && <ActivityIndicator color={AZUL} style={{ margin: 20 }} />}
          {!cargando && lista.length === 0 && (
            <View style={{ backgroundColor: T.tarjeta, borderRadius: 16, padding: 30, alignItems: 'center' }}>
              <Text style={{ color: T.subTexto }}>No hay solicitudes para aprobar</Text>
            </View>
          )}
        </>
      }
    />
  );
}