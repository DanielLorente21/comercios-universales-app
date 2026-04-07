// ════════════════════════════════════════════════════════════════════════════
// ReporteScreen.js — Reporte anual de permisos + calendario
// Extraído de App.js (era: función PanelReporte)
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
} from 'react-native';
import { calcularDias } from '../utils/calcularDias';

const AZUL = '#2C4A8C';

export default function ReporteScreen({ usuario, permisos, usuarios, festivosMapState = {} }) {
  const anioActual = new Date().getFullYear();

  const [tab,            setTab]            = useState('reporte');
  const [anio,           setAnio]           = useState(anioActual);
  const [mesCalendario,  setMesCalendario]  = useState(new Date().getMonth());
  const [anioCalendario, setAnioCalendario] = useState(anioActual);
  const [filtroDept,     setFiltroDept]     = useState('Todos');
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  const esGerente = usuario?.rol === 'dueno' || usuario?.rol === 'contralor' || usuario?.rol === 'jefe';

  const calcDiasAnio = (codigoEmp, anioRef) =>
    permisos
      .filter(p => p.codigo === codigoEmp && p.estado === 'Aprobado')
      .filter(p => { const partes = p.fechaInicio?.split('/'); return partes && partes[2] === String(anioRef); })
      .reduce((sum, p) => sum + calcularDias(p.fechaInicio, p.fechaFin, festivosMapState), 0);

  const empReporte = esGerente
    ? usuarios.filter(u => filtroDept === 'Todos' || u.departamento === filtroDept)
    : [usuario];

  const deptos = ['Todos', ...new Set(usuarios.map(u => u.departamento).filter(Boolean))];

  const diasConPermiso = () => {
    const mapa = {};
    permisos.forEach(p => {
      if (!p.fechaInicio || !p.fechaFin) return;
      try {
        const [d1,m1,y1] = p.fechaInicio.split('/');
        const [d2,m2,y2] = p.fechaFin.split('/');
        const cur = new Date(Number(y1), Number(m1)-1, Number(d1));
        const fin = new Date(Number(y2), Number(m2)-1, Number(d2));
        while (cur <= fin) {
          if (cur.getMonth() === mesCalendario && cur.getFullYear() === anioCalendario) {
            const key = cur.toISOString().split('T')[0];
            if (!mapa[key]) mapa[key] = [];
            mapa[key].push({ nombre: p.nombre, tipo: p.tipo, estado: p.estado });
          }
          cur.setDate(cur.getDate() + 1);
        }
      } catch {}
    });
    return mapa;
  };

  const colorEstadoCal = (e) => e === 'Aprobado' ? '#4CAF7D' : e === 'Rechazado' ? '#EF5350' : '#F59E0B';

  const mapa          = diasConPermiso();
  const primerDiaMes  = new Date(anioCalendario, mesCalendario, 1).getDay();
  const diasEnMes     = new Date(anioCalendario, mesCalendario + 1, 0).getDate();

  const MESES      = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const DIAS_SEMANA = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];

  const celdas = [];
  for (let i = 0; i < primerDiaMes; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F7FF' }}>
      {/* Tabs Reporte / Calendario */}
      <View style={{ flexDirection: 'row', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#EEF2FB' }}>
        {[{ key: 'reporte', label: '📊 Reporte' }, { key: 'calendario', label: '📅 Calendario' }].map(t => (
          <TouchableOpacity
            key={t.key}
            style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === t.key ? AZUL : 'transparent' }}
            onPress={() => setTab(t.key)}
          >
            <Text style={{ fontWeight: '700', color: tab === t.key ? AZUL : '#aaa', fontSize: 13 }}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── TAB: Reporte anual ── */}
      {tab === 'reporte' && (
        <ScrollView style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a2e' }}>📊 Reporte {anio}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => setAnio(a => a - 1)} style={{ backgroundColor: 'white', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#EEF2FB' }}>
                <Text style={{ color: AZUL, fontWeight: '700' }}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAnio(a => a + 1)} style={{ backgroundColor: 'white', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#EEF2FB' }}>
                <Text style={{ color: AZUL, fontWeight: '700' }}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {esGerente && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {deptos.map(d => (
                <TouchableOpacity
                  key={d}
                  style={{ backgroundColor: filtroDept === d ? AZUL : 'white', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: filtroDept === d ? AZUL : '#EEF2FB' }}
                  onPress={() => setFiltroDept(d)}
                >
                  <Text style={{ color: filtroDept === d ? 'white' : '#555', fontWeight: '600', fontSize: 12 }}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {empReporte.map(emp => {
            const diasUsados  = calcDiasAnio(emp.codigo, anio);
            const diasRestant = parseFloat(emp.dias || 0);
            const permisosEmp = permisos.filter(p => p.codigo === emp.codigo && p.fechaInicio?.endsWith(String(anio)));
            return (
              <View key={emp.id || emp.codigo} style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FB', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontWeight: '800', color: AZUL, fontSize: 13 }}>{emp.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: '#1a1a2e', fontSize: 14 }}>{emp.nombre}</Text>
                    <Text style={{ color: '#888', fontSize: 11 }}>{emp.cargo} · {emp.departamento}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'Días usados',  val: diasUsados % 1 === 0 ? diasUsados : diasUsados.toFixed(1),             color: '#EF5350' },
                    { label: 'Disponibles',  val: diasRestant % 1 === 0 ? diasRestant : parseFloat(diasRestant).toFixed(1), color: '#4CAF7D' },
                    { label: 'Solicitudes', val: permisosEmp.length,                                                     color: AZUL },
                  ].map(st => (
                    <View key={st.label} style={{ flex: 1, backgroundColor: '#F5F7FF', borderRadius: 12, padding: 10, alignItems: 'center' }}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: st.color }}>{st.val}</Text>
                      <Text style={{ fontSize: 10, color: '#888', marginTop: 2, textAlign: 'center' }}>{st.label}</Text>
                    </View>
                  ))}
                </View>
                {permisosEmp.length > 0 && (
                  <>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6 }}>Solicitudes del año:</Text>
                    {permisosEmp.map(p => (
                      <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#EEF2FB' }}>
                        <Text style={{ fontSize: 12, color: '#555', flex: 1 }}>{p.tipo} · {p.fechaInicio} → {p.fechaFin}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colorEstadoCal(p.estado) }}>{p.estado}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            );
          })}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* ── TAB: Calendario ── */}
      {tab === 'calendario' && (
        <ScrollView style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => { if (mesCalendario === 0) { setMesCalendario(11); setAnioCalendario(a => a - 1); } else setMesCalendario(m => m - 1); }}
              style={{ backgroundColor: 'white', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#EEF2FB' }}
            >
              <Text style={{ color: AZUL, fontWeight: '700', fontSize: 16 }}>‹</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#1a1a2e' }}>{MESES[mesCalendario]} {anioCalendario}</Text>
            <TouchableOpacity
              onPress={() => { if (mesCalendario === 11) { setMesCalendario(0); setAnioCalendario(a => a + 1); } else setMesCalendario(m => m + 1); }}
              style={{ backgroundColor: 'white', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#EEF2FB' }}
            >
              <Text style={{ color: AZUL, fontWeight: '700', fontSize: 16 }}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Cabecera días semana */}
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            {DIAS_SEMANA.map(d => (
              <View key={d} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: d === 'Do' ? '#EF5350' : d === 'Sa' ? '#F59E0B' : '#888' }}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Celdas del mes */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {celdas.map((dia, idx) => {
              if (!dia) return <View key={`e${idx}`} style={{ width: '14.28%', aspectRatio: 1 }} />;
              const fechaISO = `${anioCalendario}-${String(mesCalendario + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
              const eventos  = mapa[fechaISO] || [];
              const hoy      = new Date();
              const esHoy    = dia === hoy.getDate() && mesCalendario === hoy.getMonth() && anioCalendario === hoy.getFullYear();
              const dow      = new Date(anioCalendario, mesCalendario, dia).getDay();
              return (
                <TouchableOpacity
                  key={dia}
                  style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 }}
                  onPress={() => eventos.length > 0 && setDiaSeleccionado(diaSeleccionado === dia ? null : dia)}
                >
                  <View style={{ width: '90%', aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: esHoy ? AZUL : eventos.length > 0 ? '#EEF2FB' : 'transparent', borderWidth: eventos.length > 0 && !esHoy ? 1 : 0, borderColor: '#4A9EC4' }}>
                    <Text style={{ fontSize: 13, fontWeight: esHoy || eventos.length > 0 ? '800' : '400', color: esHoy ? 'white' : dow === 0 ? '#EF5350' : dow === 6 ? '#F59E0B' : '#1a1a2e' }}>{dia}</Text>
                    {eventos.length > 0 && !esHoy && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#4A9EC4', marginTop: 1 }} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Detalle día seleccionado */}
          {diaSeleccionado && mapa[`${anioCalendario}-${String(mesCalendario + 1).padStart(2, '0')}-${String(diaSeleccionado).padStart(2, '0')}`] && (
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginTop: 16 }}>
              <Text style={{ fontWeight: '800', color: '#1a1a2e', marginBottom: 10, fontSize: 15 }}>📅 {diaSeleccionado} de {MESES[mesCalendario]}</Text>
              {mapa[`${anioCalendario}-${String(mesCalendario + 1).padStart(2, '0')}-${String(diaSeleccionado).padStart(2, '0')}`].map((ev, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#EEF2FB' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colorEstadoCal(ev.estado) }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 13, color: '#1a1a2e' }}>{ev.nombre}</Text>
                    <Text style={{ fontSize: 11, color: '#888' }}>{ev.tipo} · {ev.estado}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Leyenda */}
          <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, marginTop: 16, flexDirection: 'row', justifyContent: 'space-around' }}>
            {[{ color: '#4A9EC4', label: 'Con permiso' }, { color: AZUL, label: 'Hoy' }, { color: '#EF5350', label: 'Domingo' }, { color: '#F59E0B', label: 'Sábado ½' }].map(l => (
              <View key={l.label} style={{ alignItems: 'center', gap: 4 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: l.color }} />
                <Text style={{ fontSize: 10, color: '#888' }}>{l.label}</Text>
              </View>
            ))}
          </View>
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </View>
  );
}
