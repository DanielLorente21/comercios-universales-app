// ════════════════════════════════════════════════════════════════════════════
// ReporteDiarioScreen.js — Reporte diario de asistencia con exportación PDF
// Extraído de App.js (era: función ReporteDiario)
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Platform,
} from 'react-native';

const AZUL = '#2C4A8C';

export default function ReporteDiarioScreen({ permisos, usuarios }) {
  const hoy  = new Date();
  const dd   = String(hoy.getDate()).padStart(2, '0');
  const mm   = String(hoy.getMonth() + 1).padStart(2, '0');
  const yyyy = hoy.getFullYear();
  const fechaHoy = `${dd}/${mm}/${yyyy}`;

  const DIAS_SEMANA_ES = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const fechaTexto = `${DIAS_SEMANA_ES[hoy.getDay()]}, ${hoy.getDate()} de ${MESES_ES[hoy.getMonth()]} de ${yyyy}`;

  const [generando, setGenerando] = useState(false);

  const permisosHoy = permisos.filter(p => {
    if (p.estado !== 'Aprobado') return false;
    try {
      const [d1,m1,y1] = p.fechaInicio.split('/');
      const [d2,m2,y2] = p.fechaFin.split('/');
      const inicio  = new Date(Number(y1), Number(m1) - 1, Number(d1));
      const fin     = new Date(Number(y2), Number(m2) - 1, Number(d2));
      const hoyDate = new Date(yyyy, hoy.getMonth(), hoy.getDate());
      return hoyDate >= inicio && hoyDate <= fin;
    } catch { return false; }
  });

  const permisosVacaciones = permisosHoy.filter(p => p.tipo === 'Vacaciones');
  const permisosIGSS       = permisosHoy.filter(p => p.tipo?.startsWith('IGSS'));
  const permisosOtros      = permisosHoy.filter(p => p.tipo !== 'Vacaciones' && !p.tipo?.startsWith('IGSS'));

  const departamentos = [...new Set(usuarios.map(u => u.departamento).filter(Boolean))].sort();
  const estadoDepts = departamentos.map(dept => {
    const empleadosDept = usuarios.filter(u => u.departamento === dept);
    const ausentes = empleadosDept.filter(emp => permisosHoy.some(p => p.codigo === emp.codigo));
    return { nombre: dept, completo: ausentes.length === 0, ausentes: ausentes.map(e => e.nombre) };
  });

  const generarPDFReporte = async () => {
    setGenerando(true);
    try {
      const filasVacaciones = permisosVacaciones.length > 0
        ? permisosVacaciones.map(p => `<tr><td>${p.nombre}</td><td>${p.departamento}</td><td>${p.fechaInicio} al ${p.fechaFin}</td><td>${p.motivo || '—'}</td></tr>`).join('')
        : `<tr><td colspan="4" class="vacio">Sin vacaciones hoy</td></tr>`;

      const filasIGSS = permisosIGSS.length > 0
        ? permisosIGSS.map(p => `<tr><td>${p.nombre}</td><td>${p.departamento}</td><td>${p.tipo}</td><td>${p.motivo || '—'}</td></tr>`).join('')
        : `<tr><td colspan="4" class="vacio">Sin permisos IGSS hoy</td></tr>`;

      const filasOtros = permisosOtros.length > 0
        ? permisosOtros.map(p => `<tr><td>${p.nombre}</td><td>${p.departamento}</td><td>${p.tipo}</td><td>${p.motivo || '—'}</td></tr>`).join('')
        : `<tr><td colspan="4" class="vacio">Sin otros permisos hoy</td></tr>`;

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: Arial, sans-serif; padding: 32px; color: #1a1a2e; background: white; }
.header { text-align:center; margin-bottom:28px; border-bottom:3px solid #2C4A8C; padding-bottom:18px; }
.titulo { font-size:20px; font-weight:800; color:#2C4A8C; }
.fecha { font-size:15px; color:#555; margin-top:6px; text-transform:capitalize; }
.seccion-titulo { background:#2C4A8C; color:white; padding:8px 14px; font-weight:700; font-size:13px; margin-top:20px; margin-bottom:0; text-transform:uppercase; letter-spacing:1px; }
.seccion-titulo-vac  { background:#4A9EC4; }
.seccion-titulo-igss { background:#4CAF7D; }
.seccion-titulo-otro { background:#7C4DCC; }
table { width:100%; border-collapse:collapse; background:white; page-break-inside:avoid; }
thead tr { background:#F5F7FF; }
th { padding:8px 10px; font-size:10px; color:#888; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; text-align:left; border-bottom:1px solid #EEF2FB; }
td { padding:9px 10px; font-size:12px; border-bottom:1px solid #F0F0F0; vertical-align:middle; }
td:first-child { font-weight:600; font-size:13px; }
tr:last-child td { border-bottom:none; }
.vacio { color:#aaa; font-size:12px; padding:12px 10px; }
.footer { margin-top:30px; text-align:center; color:#bbb; font-size:10px; border-top:1px solid #EEF2FB; padding-top:14px; }
@media print { @page { margin:0; size:A4; } body { padding:28px 32px; -webkit-print-color-adjust:exact; print-color-adjust:exact; } .no-print { display:none !important; } }
</style></head><body>
<div class="header">
  <div class="titulo">Comercios Universales</div>
  <div class="fecha">Reporte Diario de Asistencia — ${fechaTexto}</div>
</div>
<div class="seccion-titulo seccion-titulo-vac">🏖️ Vacaciones</div>
<table><thead><tr><th>Empleado</th><th>Departamento</th><th>Período</th><th>Motivo</th></tr></thead><tbody>${filasVacaciones}</tbody></table>
<div class="seccion-titulo seccion-titulo-igss">🏥 IGSS / Cita o Suspensión</div>
<table><thead><tr><th>Empleado</th><th>Departamento</th><th>Tipo</th><th>Motivo</th></tr></thead><tbody>${filasIGSS}</tbody></table>
<div class="seccion-titulo seccion-titulo-otro">👤 Otros Permisos</div>
<table><thead><tr><th>Empleado</th><th>Departamento</th><th>Tipo</th><th>Motivo</th></tr></thead><tbody>${filasOtros}</tbody></table>
<div class="footer">Generado automáticamente por el Sistema de Permisos — Comercios Universales S.A. · ${fechaHoy}</div>
</body></html>`;

      if (Platform.OS === 'web') {
        const htmlConBoton = html.replace('</body>', `<div class="no-print" style="text-align:center;margin:20px"><button onclick="window.print()" style="background:#2C4A8C;color:white;border:none;padding:12px 30px;border-radius:8px;font-size:15px;cursor:pointer;font-weight:bold">📄 Guardar como PDF</button></div></body>`);
        const blobFinal = new Blob([htmlConBoton], { type: 'text/html' });
        window.open(URL.createObjectURL(blobFinal), '_blank');
      } else {
        const { printToFileAsync } = await import('expo-print');
        const { shareAsync }       = await import('expo-sharing');
        const { uri: uriTemporal } = await printToFileAsync({ html, base64: false });
        let uriFinal = uriTemporal;
        try {
          const FileSystem  = await import('expo-file-system');
          const nombreArchivo = `reporte_diario_${dd}-${mm}-${yyyy}.pdf`;
          const uriCache      = `${FileSystem.cacheDirectory}${nombreArchivo}`;
          await FileSystem.copyAsync({ from: uriTemporal, to: uriCache });
          uriFinal = uriCache;
        } catch (e) { console.log('FileSystem no disponible:', e.message); }
        const puedeCompartir = await (await import('expo-sharing')).isAvailableAsync();
        if (puedeCompartir) {
          await shareAsync(uriFinal, { mimeType: 'application/pdf', dialogTitle: 'Reporte Diario', UTI: 'com.adobe.pdf' });
        } else {
          Alert.alert('✅ PDF generado', 'El reporte fue guardado correctamente.');
        }
      }
    } catch(e) { Alert.alert('Error', 'No se pudo generar el reporte: ' + e.message); }
    setGenerando(false);
  };

  const SeccionTitulo = ({ icon, titulo, color = '#070808' }) => (
    <View style={{ backgroundColor: color, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginTop: 18, marginBottom: 8 }}>
      <Text style={{ color: 'white', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 }}>{icon} {titulo.toUpperCase()}</Text>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F4F6FB', padding: 16 }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={{ backgroundColor: AZUL, borderRadius: 16, padding: 18, marginBottom: 16, alignItems: 'center' }}>
        <Text style={{ color: 'white', fontSize: 18, fontWeight: '800' }}>📋 Reporte Diario</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4, textTransform: 'capitalize' }}>{fechaTexto}</Text>
      </View>

      {/* Botón generar PDF */}
      {generando
        ? <ActivityIndicator color={AZUL} style={{ marginBottom: 16 }} />
        : (
          <TouchableOpacity
            onPress={generarPDFReporte}
            style={{ backgroundColor: AZUL, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 }}
          >
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>📄 Generar y compartir PDF</Text>
          </TouchableOpacity>
        )
      }

      {/* Resumen total */}
      <View style={{ backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-around' }}>
        {[
          { val: permisosHoy.length,        label: 'Total hoy',   color: AZUL },
          { val: permisosVacaciones.length, label: 'Vacaciones',  color: '#4A9EC4' },
          { val: permisosIGSS.length,       label: 'IGSS',        color: '#4CAF7D' },
          { val: permisosOtros.length,      label: 'Otros',       color: '#7C4DCC' },
        ].map(item => (
          <View key={item.label} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: item.color }}>{item.val}</Text>
            <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Estado por departamento */}
      <SeccionTitulo icon="📋" titulo="Estado por Departamento" />
      {estadoDepts.length === 0
        ? <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 16, alignItems: 'center' }}><Text style={{ color: '#aaa' }}>No hay departamentos registrados</Text></View>
        : estadoDepts.map(d => (
          <View key={d.nombre} style={{ backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '700', color: '#1a1a2e', fontSize: 14 }}>{d.nombre}</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ backgroundColor: d.completo ? '#EDF7ED' : '#FEECEC', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 }}>
                <Text style={{ color: d.completo ? '#2E7D32' : '#C62828', fontWeight: '700', fontSize: 12 }}>{d.completo ? 'COMPLETOS' : 'INCOMPLETO'}</Text>
              </View>
              {!d.completo && <Text style={{ fontSize: 11, color: '#888', marginTop: 4, textAlign: 'right' }}>Ausente(s): {d.ausentes.join(', ')}</Text>}
            </View>
          </View>
        ))
      }

      {/* Vacaciones */}
      <SeccionTitulo icon="🏖️" titulo="Vacaciones" color="#4A9EC4" />
      {permisosVacaciones.length === 0
        ? <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 14 }}><Text style={{ color: '#aaa', fontSize: 13 }}>Sin vacaciones hoy</Text></View>
        : permisosVacaciones.map(p => (
          <View key={p.id} style={{ backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8 }}>
            <Text style={{ fontWeight: '700', color: '#1a1a2e' }}>{p.nombre}</Text>
            <Text style={{ color: '#888', fontSize: 12, marginTop: 2 }}>{p.departamento} · {p.fechaInicio} al {p.fechaFin}</Text>
            {p.motivo ? <Text style={{ color: '#aaa', fontSize: 11, marginTop: 2, fontStyle: 'italic' }}>"{p.motivo}"</Text> : null}
          </View>
        ))
      }

      {/* IGSS */}
      <SeccionTitulo icon="🏥" titulo="IGSS / Cita o Suspensión" color="#4CAF7D" />
      {permisosIGSS.length === 0
        ? <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 14 }}><Text style={{ color: '#aaa', fontSize: 13 }}>Sin permisos IGSS hoy</Text></View>
        : permisosIGSS.map(p => (
          <View key={p.id} style={{ backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8 }}>
            <Text style={{ fontWeight: '700', color: '#1a1a2e' }}>{p.nombre}</Text>
            <Text style={{ color: '#888', fontSize: 12, marginTop: 2 }}>{p.departamento} · {p.tipo}</Text>
            {p.motivo ? <Text style={{ color: '#aaa', fontSize: 11, marginTop: 2, fontStyle: 'italic' }}>"{p.motivo}"</Text> : null}
          </View>
        ))
      }

      {/* Otros */}
      <SeccionTitulo icon="👤" titulo="Otros Permisos" color="#7C4DCC" />
      {permisosOtros.length === 0
        ? <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 14 }}><Text style={{ color: '#aaa', fontSize: 13 }}>Sin otros permisos hoy</Text></View>
        : permisosOtros.map(p => (
          <View key={p.id} style={{ backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8 }}>
            <Text style={{ fontWeight: '700', color: '#1a1a2e' }}>{p.nombre}</Text>
            <Text style={{ color: '#888', fontSize: 12, marginTop: 2 }}>{p.departamento} · {p.motivo}</Text>
          </View>
        ))
      }

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
