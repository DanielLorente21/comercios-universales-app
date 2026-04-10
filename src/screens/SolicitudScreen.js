// ════════════════════════════════════════════════════════════════════════════
// SolicitudScreen.js — Formulario de nueva solicitud de permiso
// CAMBIOS:
//   - BUG FIX #4: Validación de fecha única para permiso de ½ día (medioDia)
//   - NUEVO: Sección de Suspensión IGSS con campos de boleta y rango de fechas
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { AZUL, TIPOS } from '../constants/config';
import { validarFechas, REGEX_FECHA } from '../utils/fechas';
import { calcularDias } from '../utils/calcularDias';

// ── Helper: auto-formatear fecha mientras el usuario escribe ───────────────
const autoFormatearFecha = (texto) => {
  const soloNumeros = texto.replace(/\D/g, '');
  const nums = soloNumeros.slice(0, 8);
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
};

export default function SolicitudScreen({
  // Estado del formulario
  tipoSeleccionado,    setTipoSeleccionado,
  subtipoIGSS,         setSubtipoIGSS,
  fechaInicio,         setFechaInicio,
  fechaFin,            setFechaFin,
  motivo,              setMotivo,
  horasSolicitadas,    setHorasSolicitadas,
  duracionPersonal,    setDuracionPersonal,
  festivosMapState,
  cargando,
  T,
  usuario,
  // Handlers
  onEnviar,
  onEnviarSuspensionIGSS,
}) {
  // ── Estado local para el formulario de Suspensión IGSS ────────────────
  const [suspFechaInicio,  setSuspFechaInicio]  = useState('');
  const [suspFechaFin,     setSuspFechaFin]     = useState('');
  const [suspMotivo,       setSuspMotivo]       = useState('');
  const [suspNumeroBoleta, setSuspNumeroBoleta] = useState('');

  const errorFechaLive = fechaInicio && fechaFin ? validarFechas(fechaInicio, fechaFin) : null;

  // BUG FIX #4: advertir en tiempo real si medioDia tiene fechas distintas
  const errorMedioDia =
    tipoSeleccionado === 'Personal' &&
    duracionPersonal === 'medioDia' &&
    fechaInicio && fechaFin &&
    REGEX_FECHA.test(fechaInicio) && REGEX_FECHA.test(fechaFin) &&
    fechaInicio !== fechaFin
      ? 'El permiso de ½ día debe tener la misma fecha de inicio y fin.'
      : null;

  const errorSusp = suspFechaInicio && suspFechaFin ? validarFechas(suspFechaInicio, suspFechaFin) : null;

  const handleEnviarSuspension = () => {
    if (!suspFechaInicio || !suspFechaFin || !suspMotivo) {
      Alert.alert('Error', 'Completa las fechas y el motivo de la suspensión.');
      return;
    }
    if (errorSusp) { Alert.alert('Fecha inválida', errorSusp); return; }
    onEnviarSuspensionIGSS({
      codigoEmpleado:       usuario.codigo,
      nombreEmpleado:       usuario.nombre,
      cargoEmpleado:        usuario.cargo,
      rolEmpleado:          usuario.rol,
      departamentoEmpleado: usuario.departamento || '',
      fechaInicioSuspension: suspFechaInicio,
      fechaFinSuspension:    suspFechaFin,
      motivoSuspension:      suspMotivo,
      numeroBoleta:          suspNumeroBoleta,
    });
    // Limpiar formulario tras envío
    setSuspFechaInicio(''); setSuspFechaFin(''); setSuspMotivo(''); setSuspNumeroBoleta('');
  };

  return (
    <ScrollView
      style={[{ flex: 1, paddingHorizontal: 16, paddingTop: 20 }, { backgroundColor: T.fondo }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={{ fontSize: 22, fontWeight: '800', color: T.texto, marginBottom: 2 }}>Nueva Solicitud</Text>
      <Text style={{ fontSize: 12, color: T.subTexto, marginBottom: 16 }}>Selecciona el tipo de permiso</Text>

      {/* ── Selector de tipo ─────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        {TIPOS.map(t => (
          <TouchableOpacity
            key={t.label}
            style={[
              { width: '47%', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', backgroundColor: t.color },
              tipoSeleccionado === t.label && { borderColor: AZUL },
            ]}
            onPress={() => { setTipoSeleccionado(t.label); setSubtipoIGSS(''); }}
          >
            <Text style={{ fontSize: 26, marginBottom: 6 }}>{t.icon}</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: t.iconColor }}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Subtipo IGSS ─────────────────────────────────────────────── */}
      {tipoSeleccionado === 'IGSS' && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: T.subTexto, marginBottom: 8 }}>Tipo de consulta IGSS</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {['Consulta externa', 'Emergencia'].map(sub => (
              <TouchableOpacity
                key={sub}
                onPress={() => setSubtipoIGSS(sub)}
                style={{ flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: subtipoIGSS === sub ? '#4CAF7D' : '#EDF7ED', borderWidth: 2, borderColor: subtipoIGSS === sub ? '#4CAF7D' : '#C8E6C9' }}
              >
                <Text style={{ fontWeight: '700', color: subtipoIGSS === sub ? 'white' : '#2E7D32' }}>
                  {sub === 'Consulta externa' ? '🏥' : '🚨'} {sub}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── Duración Personal ────────────────────────────────────────── */}
      {tipoSeleccionado === 'Personal' && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: T.subTexto, marginBottom: 8 }}>Duración del permiso</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[
              { val: 'diaCompleto', label: '1 Día completo', icon: '📅' },
              { val: 'medioDia',    label: '½ Día',          icon: '🕐' },
            ].map(op => (
              <TouchableOpacity
                key={op.val}
                onPress={() => setDuracionPersonal(op.val)}
                style={{ flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', backgroundColor: duracionPersonal === op.val ? '#7C4DCC' : '#EDE8FD', borderWidth: 2, borderColor: duracionPersonal === op.val ? '#7C4DCC' : '#D1C4E9' }}
              >
                <Text style={{ fontSize: 20 }}>{op.icon}</Text>
                <Text style={{ fontWeight: '700', color: duracionPersonal === op.val ? 'white' : '#7C4DCC', marginTop: 4, fontSize: 13 }}>{op.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Hint cuando se selecciona medio día */}
          {duracionPersonal === 'medioDia' && (
            <View style={{ backgroundColor: '#EDE8FD', borderRadius: 10, padding: 8, marginTop: 8 }}>
              <Text style={{ color: '#7C4DCC', fontSize: 12 }}>🕐 Para ½ día, la fecha de inicio y fin deben ser el mismo día.</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Formulario por HORAS ─────────────────────────────────────── */}
      {tipoSeleccionado === 'Horas' ? (
        <>
          <View style={{ backgroundColor: '#FFF3E0', borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <Text style={{ fontWeight: '700', color: '#E65100', marginBottom: 4 }}>⏱️ Permiso por horas</Text>
            <Text style={{ fontSize: 12, color: '#555' }}>Máximo 2 horas. No descuenta días de vacaciones.</Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '600', color: T.subTexto, marginBottom: 8 }}>¿Cuántas horas necesitas?</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            {['1', '2'].map(h => (
              <TouchableOpacity
                key={h}
                onPress={() => setHorasSolicitadas(h)}
                style={{ flex: 1, padding: 16, borderRadius: 14, alignItems: 'center', backgroundColor: horasSolicitadas === h ? '#E65100' : '#FFF3E0', borderWidth: 2, borderColor: horasSolicitadas === h ? '#E65100' : '#FFE0B2' }}
              >
                <Text style={{ fontSize: 22, fontWeight: '900', color: horasSolicitadas === h ? 'white' : '#E65100' }}>{h}h</Text>
                <Text style={{ fontSize: 11, color: horasSolicitadas === h ? 'rgba(255,255,255,0.8)' : '#888', marginTop: 2 }}>{h === '1' ? '1 hora' : '2 horas'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ fontSize: 13, fontWeight: '600', color: T.subTexto, marginBottom: 8 }}>Motivo</Text>
          <TextInput
            style={{ backgroundColor: T.inputFondo, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 4, borderWidth: 1, borderColor: T.borde, height: 90, textAlignVertical: 'top', color: T.texto }}
            placeholder="Describe el motivo..."
            value={motivo}
            onChangeText={setMotivo}
            multiline
            placeholderTextColor={T.subTexto}
          />
          {cargando
            ? <ActivityIndicator color={AZUL} style={{ marginTop: 20 }} />
            : (
              <TouchableOpacity style={{ backgroundColor: '#E65100', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 }} onPress={onEnviar}>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>⏱️ Solicitar {horasSolicitadas} hora(s)</Text>
              </TouchableOpacity>
            )
          }
        </>

      /* ── Formulario Suspensión IGSS ──────────────────────────────── */
     ) : tipoSeleccionado === 'IGSS' && (
  <View style={{ backgroundColor: '#E3F0FF', borderRadius: 14, padding: 14, marginBottom: 16 }}>
    <Text style={{ fontWeight: '800', color: '#1565C0', fontSize: 14, marginBottom: 4 }}>🏥 ¿Tienes una suspensión del IGSS?</Text>
    <Text style={{ fontSize: 12, color: '#1976D2' }}>
      Si el IGSS te suspendió por enfermedad o accidente, regístralo aquí.{'\n'}
      <Text style={{ fontWeight: '700' }}>No descuenta días de vacaciones.</Text>
    </Text>
    <TouchableOpacity
      style={{ backgroundColor: '#1565C0', borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 10 }}
      onPress={() => setTipoSeleccionado('SuspensionIGSS')}
    >
      <Text style={{ color: 'white', fontWeight: '700' }}>📋 Registrar Suspensión IGSS</Text>
    </TouchableOpacity>
  </View>
)}

      {/* ── Formulario Suspensión IGSS completo ──────────────────────── */}
      {tipoSeleccionado === 'SuspensionIGSS' && (
        <>
          <View style={{ backgroundColor: '#E3F0FF', borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <Text style={{ fontWeight: '800', color: '#1565C0', fontSize: 15, marginBottom: 4 }}>🏥 Suspensión IGSS</Text>
            <Text style={{ fontSize: 12, color: '#1976D2' }}>
              Registra la suspensión médica emitida por el IGSS.{'\n'}
              Puede ser por días, semanas o meses.{'\n'}
              <Text style={{ fontWeight: '700' }}>No se descuenta de vacaciones.</Text>
            </Text>
          </View>

          {/* Número de boleta */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: T.subTexto, marginBottom: 8 }}>N° de Boleta / Constancia (opcional)</Text>
          <TextInput
            style={{ backgroundColor: T.inputFondo, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 16, borderWidth: 1, borderColor: T.borde, color: T.texto }}
            placeholder="Ej: 2024-00123"
            value={suspNumeroBoleta}
            onChangeText={setSuspNumeroBoleta}
            placeholderTextColor={T.subTexto}
          />

          {/* Fecha inicio */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: T.subTexto, marginBottom: 8 }}>Fecha de inicio de suspensión</Text>
          <TextInput
            style={[
              { backgroundColor: T.inputFondo, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 4, borderWidth: 1, borderColor: T.borde, color: T.texto },
              suspFechaInicio && !REGEX_FECHA.test(suspFechaInicio) && { borderColor: '#EF5350', borderWidth: 2 },
            ]}
            placeholder="DD/MM/AAAA"
            value={suspFechaInicio}
            onChangeText={(t) => setSuspFechaInicio(autoFormatearFecha(t))}
            keyboardType="numeric"
            maxLength={10}
            placeholderTextColor={T.subTexto}
          />
          {suspFechaInicio && !REGEX_FECHA.test(suspFechaInicio) && (
            <Text style={{ fontSize: 11, color: '#EF5350', marginBottom: 12, marginLeft: 4 }}>⚠️ Sigue escribiendo... (DD/MM/AAAA)</Text>
          )}

          {/* Fecha fin */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: T.subTexto, marginBottom: 8 }}>Fecha de fin de suspensión</Text>
          <TextInput
            style={[
              { backgroundColor: T.inputFondo, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 4, borderWidth: 1, borderColor: T.borde, color: T.texto },
              suspFechaFin && !REGEX_FECHA.test(suspFechaFin) && { borderColor: '#EF5350', borderWidth: 2 },
            ]}
            placeholder="DD/MM/AAAA"
            value={suspFechaFin}
            onChangeText={(t) => setSuspFechaFin(autoFormatearFecha(t))}
            keyboardType="numeric"
            maxLength={10}
            placeholderTextColor={T.subTexto}
          />
          {suspFechaFin && !REGEX_FECHA.test(suspFechaFin) && (
            <Text style={{ fontSize: 11, color: '#EF5350', marginBottom: 12, marginLeft: 4 }}>⚠️ Sigue escribiendo... (DD/MM/AAAA)</Text>
          )}
          {errorSusp && REGEX_FECHA.test(suspFechaInicio) && REGEX_FECHA.test(suspFechaFin) && (
            <Text style={{ fontSize: 11, color: '#EF5350', marginBottom: 12, marginLeft: 4 }}>⚠️ {errorSusp}</Text>
          )}

          {/* Preview de días */}
          {suspFechaInicio && suspFechaFin && !errorSusp && REGEX_FECHA.test(suspFechaInicio) && REGEX_FECHA.test(suspFechaFin) && (
            <View style={{ backgroundColor: '#E3F0FF', borderRadius: 10, padding: 10, marginBottom: 12 }}>
              <Text style={{ color: '#1565C0', fontWeight: '700', fontSize: 13 }}>
                📅 Duración: {calcularDias(suspFechaInicio, suspFechaFin, festivosMapState)} día(s) hábil(es) · Sin descuento de vacaciones
              </Text>
            </View>
          )}

          {/* Motivo / Diagnóstico */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: T.subTexto, marginBottom: 8 }}>Diagnóstico / Motivo de suspensión</Text>
          <TextInput
            style={{ backgroundColor: T.inputFondo, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 4, borderWidth: 1, borderColor: T.borde, height: 90, textAlignVertical: 'top', color: T.texto }}
            placeholder="Ej: Fractura de mano derecha, reposo por 21 días..."
            value={suspMotivo}
            onChangeText={setSuspMotivo}
            multiline
            placeholderTextColor={T.subTexto}
          />

          {/* Botones */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <TouchableOpacity
              style={{ flex: 0.4, backgroundColor: T.inputFondo, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: T.borde }}
              onPress={() => { setTipoSeleccionado('IGSS'); setSuspFechaInicio(''); setSuspFechaFin(''); setSuspMotivo(''); setSuspNumeroBoleta(''); }}
            >
              <Text style={{ color: T.subTexto, fontWeight: '700' }}>← Atrás</Text>
            </TouchableOpacity>
            {cargando
              ? <ActivityIndicator color={AZUL} style={{ flex: 1, marginTop: 0 }} />
              : (
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#1565C0', borderRadius: 14, padding: 16, alignItems: 'center' }}
                  onPress={handleEnviarSuspension}
                >
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>🏥 Registrar Suspensión</Text>
                </TouchableOpacity>
              )
            }
          </View>
        </>
      )}

      {/* ── Formulario de días (Vacaciones, Personal, IGSS consulta) ─── */}
      {tipoSeleccionado !== 'Horas' && tipoSeleccionado !== 'SuspensionIGSS' && tipoSeleccionado !== '' && !(tipoSeleccionado === 'IGSS' && subtipoIGSS === '') && (
        <>
          <Text style={{ fontSize: 13, fontWeight: '600', color: T.subTexto, marginBottom: 8 }}>Fecha de Inicio</Text>
          <TextInput
            style={[
              { backgroundColor: T.inputFondo, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 4, borderWidth: 1, borderColor: T.borde, color: T.texto },
              fechaInicio && !REGEX_FECHA.test(fechaInicio) && { borderColor: '#EF5350', borderWidth: 2 },
            ]}
            placeholder="DD/MM/AAAA  (ej: 10032026)"
            value={fechaInicio}
            onChangeText={(texto) => setFechaInicio(autoFormatearFecha(texto))}
            keyboardType="numeric"
            maxLength={10}
            placeholderTextColor={T.subTexto}
          />
          {fechaInicio && !REGEX_FECHA.test(fechaInicio) && (
            <Text style={{ fontSize: 11, color: '#EF5350', marginBottom: 12, marginLeft: 4 }}>⚠️ Sigue escribiendo... (DD/MM/AAAA)</Text>
          )}

          <Text style={{ fontSize: 13, fontWeight: '600', color: T.subTexto, marginBottom: 8 }}>Fecha de Fin</Text>
          <TextInput
            style={[
              { backgroundColor: T.inputFondo, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 4, borderWidth: 1, borderColor: T.borde, color: T.texto },
              fechaFin && !REGEX_FECHA.test(fechaFin) && { borderColor: '#EF5350', borderWidth: 2 },
            ]}
            placeholder="DD/MM/AAAA  (ej: 15032026)"
            value={fechaFin}
            onChangeText={(texto) => setFechaFin(autoFormatearFecha(texto))}
            keyboardType="numeric"
            maxLength={10}
            placeholderTextColor={T.subTexto}
          />
          {fechaFin && !REGEX_FECHA.test(fechaFin) && (
            <Text style={{ fontSize: 11, color: '#EF5350', marginBottom: 12, marginLeft: 4 }}>⚠️ Sigue escribiendo... (DD/MM/AAAA)</Text>
          )}
          {errorFechaLive && REGEX_FECHA.test(fechaInicio) && REGEX_FECHA.test(fechaFin) && (
            <Text style={{ fontSize: 11, color: '#EF5350', marginBottom: 12, marginLeft: 4 }}>⚠️ {errorFechaLive}</Text>
          )}
          {/* BUG FIX #4: error live para medioDia */}
          {errorMedioDia && (
            <Text style={{ fontSize: 11, color: '#EF5350', marginBottom: 12, marginLeft: 4 }}>⚠️ {errorMedioDia}</Text>
          )}

          {fechaInicio && fechaFin && !errorFechaLive && !errorMedioDia && (
            <View style={{ backgroundColor: '#EDF7ED', borderRadius: 10, padding: 10, marginBottom: 12 }}>
              <Text style={{ color: '#4CAF7D', fontWeight: '700', fontSize: 13 }}>
                📅 Duración: {calcularDias(fechaInicio, fechaFin, festivosMapState)} día(s)
              </Text>
            </View>
          )}

          <Text style={{ fontSize: 13, fontWeight: '600', color: T.subTexto, marginBottom: 8 }}>Motivo</Text>
          <TextInput
            style={{ backgroundColor: T.inputFondo, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 4, borderWidth: 1, borderColor: T.borde, height: 90, textAlignVertical: 'top', color: T.texto }}
            placeholder="Describe el motivo de tu solicitud..."
            value={motivo}
            onChangeText={setMotivo}
            multiline
            placeholderTextColor={T.subTexto}
          />
          {cargando
            ? <ActivityIndicator color={AZUL} style={{ marginTop: 20 }} />
            : (
              <TouchableOpacity
                style={{ backgroundColor: AZUL, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 }}
                onPress={onEnviar}
              >
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Enviar Solicitud 🚀</Text>
              </TouchableOpacity>
            )
          }
        </>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}