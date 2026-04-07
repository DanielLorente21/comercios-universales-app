// ════════════════════════════════════════════════════════════════════════════
// AdminScreen.js — Panel de administración (Usuarios, Excel, Aprobar, Festivos)
// Extraído de App.js (era: función PanelAdmin)
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
  StyleSheet, Image, Platform,
} from 'react-native';
import AdminUserModal from '../../AdminUserModal';
import GestionFestivos from '../../GestionFestivos';
import { fsGet, fsUpdate, fsAdd, cargarFestivosSet } from '../services/firestore';
import { calcularDias } from '../utils/calcularDias';
import { DB_URL, API_KEY, DRIVE_API_KEY, SHEET_ID } from '../constants/config';


const AZUL       = '#2C4A8C';
const AZUL_CLARO = '#EEF2FB';

// ── Helper local: normalizar formato de fecha ──────────────────────────────
const normFecha = (fi) => {
  if (!fi) return null;
  fi = fi.toString().trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fi)) { const [d,m,y] = fi.split('/'); return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`; }
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(fi))  { const [d,m,y] = fi.split('/'); return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/20${y}`; }
  if (/^\d{4}-\d{2}-\d{2}/.test(fi))           { const [y,m,d] = fi.split('T')[0].split('-'); return `${d}/${m}/${y}`; }
  if (/^\d{5,6}$/.test(fi)) { const b = new Date(1899,11,30); b.setDate(b.getDate() + parseInt(fi)); return `${String(b.getDate()).padStart(2,'0')}/${String(b.getMonth()+1).padStart(2,'0')}/${b.getFullYear()}`; }
  return null;
};

export default function AdminScreen({ permisosAdmin }) {
  const [adminTab,       setAdminTab]       = useState('menu');
  const [adminUsuarios,  setAdminUsuarios]  = useState([]);
  const [adminCargando,  setAdminCargando]  = useState(false);
  const [adminBusqueda,  setAdminBusqueda]  = useState('');
  const [adminModalUser, setAdminModalUser] = useState(null);
  const [excelProgreso,  setExcelProgreso]  = useState(null);
  const [excelResultado, setExcelResultado] = useState(null);
  const [excelCoriendo,  setExcelCoriendo]  = useState(false);
  const [adminPermisos,  setAdminPermisos]  = useState([]);
  const [modoExcel,      setModoExcel]      = useState('plantilla');

  const DRIVE_API_KEY = 'AIzaSyD39TKa2k47Ft6I2IlxhFyBUSkQQLjTQww';
  const SHEET_ID      = '1oFv182U_QA7dbGQJBq3PADwUHCfZVD3KgBrstYyVDFo';

  const cargarUsuariosAdmin = async () => { setAdminCargando(true); setAdminUsuarios(await fsGet('usuarios')); setAdminCargando(false); };
  const cargarPermisosAdmin = async () => { setAdminCargando(true); setAdminPermisos(await fsGet('permisos'));  setAdminCargando(false); };

  const colorE = (e) => e === 'Aprobado' ? '#4CAF7D' : e === 'Rechazado' ? '#EF5350' : '#F59E0B';

  // ── Cambiar estado de permiso desde el panel admin ──────────────────────
  const cambiarEstadoPermiso = async (id, estado, permiso, descuentaOverrideAdmin = null) => {
    setAdminCargando(true);
    try {
      const esVacaciones = permiso.tipo === 'Vacaciones';
      const esPersonal   = permiso.tipo === 'Personal';
      const esIGSS       = permiso.tipo?.startsWith('IGSS');

      let diasADescontar = 0;
      if (estado === 'Aprobado') {
        if (esVacaciones) {
          const festivosMap = await cargarFestivosSet();
          diasADescontar = calcularDias(permiso.fechaInicio, permiso.fechaFin, festivosMap);
        } else if (esPersonal) {
          if (descuentaOverrideAdmin === 0.5) {
            diasADescontar = 0.5;
          } else if (descuentaOverrideAdmin === 1) {
            diasADescontar = permiso.duracion === 'medioDia' ? 0.5 : 1;
          }
        }
        // IGSS → nunca descuenta
      }

      const debeDescontar = diasADescontar > 0;
      await fsUpdate('permisos', id, {
        estado,
        descuento:       debeDescontar ? 'si' : 'no',
        aprobadoPor:     '',
        fechaAprobacion: new Date().toLocaleDateString('es-GT'),
      });

      if (estado === 'Aprobado' && debeDescontar) {
        const qRes  = await fetch(`${DB_URL}:runQuery?key=${API_KEY}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ structuredQuery: { from:[{collectionId:'usuarios'}], where:{fieldFilter:{field:{fieldPath:'codigo'},op:'EQUAL',value:{stringValue:permiso.codigo}}}, limit:1 }})
        });
        const qData = await qRes.json();
        if (qData[0]?.document) {
          const doc   = qData[0].document;
          const docId = doc.name.split('/').pop();
          const campoDias  = doc.fields?.dias;
          const diasActual = parseFloat(campoDias?.stringValue ?? campoDias?.doubleValue ?? campoDias?.integerValue ?? '15');
          const diasActualSafe = isNaN(diasActual) ? 15 : diasActual;
          const nuevosDias = Math.max(0, (Math.round(diasActualSafe * 100) - Math.round(diasADescontar * 100)) / 100);
          await fsUpdate('usuarios', docId, { dias: String(nuevosDias) });
        }
      }

      Alert.alert(
        estado === 'Aprobado' ? '✅ Aprobada' : '❌ Rechazada',
        estado === 'Aprobado' && debeDescontar
          ? `Solicitud de ${permiso.nombre} aprobada.\nDías descontados: ${diasADescontar}`
          : `Solicitud de ${permiso.nombre} ${estado.toLowerCase()}.`
      );
      await cargarPermisosAdmin();
    } catch(e) { Alert.alert('Error', e.message); }
    setAdminCargando(false);
  };

  // ── Procesamiento masivo de empleados ────────────────────────────────────
  const procesarEmpleados = async (empleados) => {
    let actualizados = 0, creados = 0, protegidos = 0, errores = 0;
    for (let i = 0; i < empleados.length; i++) {
      const emp = empleados[i];
      try {
        const qRes  = await fetch(`${DB_URL}:runQuery?key=${API_KEY}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ structuredQuery: { from:[{collectionId:'usuarios'}], where:{fieldFilter:{field:{fieldPath:'codigo'},op:'EQUAL',value:{stringValue:emp.codigo}}}, limit:1 }})
        });
        const qData = await qRes.json();
        if (qData[0]?.document) {
          const docExist = qData[0].document;
          const docId    = docExist.name.split('/').pop();
          const fields   = docExist.fields;
          const yaRol   = fields?.rol?.stringValue && fields.rol.stringValue !== '';
          const yaDept  = fields?.departamento?.stringValue && fields.departamento.stringValue !== '';
          const datosActualizar = { fechaIngreso: emp.fechaIngreso, nombre: emp.nombre };
          if (!yaRol  || emp.fuentePlantilla) datosActualizar.rol          = emp.rol || 'auxiliar';
          if (!yaDept || emp.fuentePlantilla) datosActualizar.departamento = emp.departamento || '';
          if (emp.fuentePlantilla) {
            if (emp.cargo)            datosActualizar.cargo            = emp.cargo;
            if (emp.dias)             datosActualizar.dias             = emp.dias;
            if (emp.canAprobar)       datosActualizar.canAprobar       = emp.canAprobar;
            if (emp.canCreateUsers)   datosActualizar.canCreateUsers   = emp.canCreateUsers;
            if (emp.canGestionarFestivos) datosActualizar.canGestionarFestivos = emp.canGestionarFestivos;
            if (emp.canReporteDiario) datosActualizar.canReporteDiario = emp.canReporteDiario;
          }
          await fsUpdate('usuarios', docId, datosActualizar);
          if (yaRol && yaDept && !emp.fuentePlantilla) protegidos++;
          else actualizados++;
        } else {
          const passPlana = emp.password || emp.codigo;
          await fsAdd('usuarios', {
            codigo: emp.codigo, nombre: emp.nombre,
            cargo: emp.cargo || 'Empleado',
            departamento: emp.departamento || '',
            rol: emp.rol || 'auxiliar',
            password: passPlana,
            dias: emp.dias || '15',
            fechaIngreso: emp.fechaIngreso,
            ultimaAcumulacion: '',
            canAprobar: emp.canAprobar || 'false',
            canCreateUsers: emp.canCreateUsers || 'false',
            canGestionarFestivos: emp.canGestionarFestivos || 'false',
            canReporteDiario: emp.canReporteDiario || 'false',
          });
          creados++;
        }
      } catch { errores++; }
      setExcelProgreso({ actual: i + 1, total: empleados.length, actualizados, creados, protegidos, errores });
      await new Promise(r => setTimeout(r, 100));
    }
    setExcelResultado({ total: empleados.length, actualizados, creados, protegidos, errores });
  };

  // ── Modo SICAF: lee desde Google Sheets ─────────────────────────────────
  const iniciarExcelSICAF = async () => {
    setExcelCoriendo(true); setExcelProgreso(null); setExcelResultado(null);
    try {
      const url  = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1?key=${DRIVE_API_KEY}&valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      let deptActual = '', empleados = [];
      for (const row of (data.values || [])) {
        if (row[0]?.toString().trim() === 'Departamento:') { deptActual = row[6]?.toString().trim() || row[3]?.toString().trim() || ''; continue; }
        const codigo = row[1]?.toString().trim() ?? '';
        if (!codigo || !/^\d+$/.test(codigo)) continue;
        const fechaIngreso = normFecha(row[23]);
        if (!fechaIngreso) continue;
        empleados.push({ codigo, nombre: `${row[4]?.toString().trim()??''} ${row[8]?.toString().trim()??''}`.trim(), departamento: deptActual, fechaIngreso, fuentePlantilla: false });
      }
      await procesarEmpleados(empleados);
    } catch(e) { Alert.alert('❌ Error', e.message); }
    setExcelCoriendo(false);
  };

  // ── Modo Plantilla: leer xlsx subido por el usuario ──────────────────────
  const parsearFilasExcel = (rows) => rows
    .filter(r => r['codigo*'] && String(r['codigo*']).trim() !== '' && String(r['codigo*']).trim() !== 'FILA DE EJEMPLO')
    .map(r => ({
      codigo:               String(r['codigo*']).trim(),
      nombre:               String(r['nombre*'] || '').trim(),
      cargo:                String(r['cargo*']  || 'Empleado').trim(),
      departamento:         String(r['sub_departamento'] || r['departamento*'] || '').trim(),
      rol:                  String(r['rol*'] || 'auxiliar').trim(),
      password:             String(r['password*'] || r['codigo*']).trim(),
      fechaIngreso:         normFecha(r['fechaIngreso*']) || '',
      dias:                 String(r['dias'] || '15').trim(),
      canAprobar:           String(r['canAprobar'] || 'false').trim(),
      canCreateUsers:       String(r['canCreateUsers'] || 'false').trim(),
      canGestionarFestivos: String(r['canGestionarFestivos'] || 'false').trim(),
      canReporteDiario:     String(r['canReporteDiario'] || 'false').trim(),
      fuentePlantilla:      true,
    }));

  const procesarBase64Excel = async (base64) => {
    let XLSX;
    try { XLSX = require('xlsx'); }
    catch {
      try { XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs'); }
      catch { Alert.alert('Error', 'No se pudo cargar el parser de Excel. Instala: npm install xlsx'); return; }
    }
    const workbook = XLSX.read(base64, { type: 'base64' });
    const sheet    = workbook.Sheets['Empleados'] ?? workbook.Sheets[workbook.SheetNames[0]];
    const rows     = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    const empleados = parsearFilasExcel(rows);
    if (empleados.length === 0) { Alert.alert('⚠️ Atención', 'No se encontraron empleados. Verifica que uses la plantilla correcta.'); return; }
    await procesarEmpleados(empleados);
  };

  const iniciarExcelPlantilla = async () => {
    setExcelCoriendo(true); setExcelProgreso(null); setExcelResultado(null);
    try {
      if (Platform.OS === 'web') {
        const input   = document.createElement('input');
        input.type    = 'file';
        input.accept  = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        input.onchange = async (e) => {
          const file = e.target.files?.[0];
          if (!file) { setExcelCoriendo(false); return; }
          const reader = new FileReader();
          reader.onload = async (ev) => {
            try {
              const arrayBuffer = ev.target.result;
              const bytes  = new Uint8Array(arrayBuffer);
              let binary   = '';
              for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
              const base64 = btoa(binary);
              await procesarBase64Excel(base64);
            } catch(err) { Alert.alert('❌ Error', err.message); }
            setExcelCoriendo(false);
          };
          reader.readAsArrayBuffer(file);
        };
        input.oncancel = () => setExcelCoriendo(false);
        input.click();
        return;
      }
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) { setExcelCoriendo(false); return; }
      const fileUri    = result.assets[0].uri;
      const FileSystem = await import('expo-file-system');
      const base64     = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType?.Base64 || 'base64' });
      await procesarBase64Excel(base64);
    } catch(e) { Alert.alert('❌ Error', e.message); }
    setExcelCoriendo(false);
  };

  const iniciarExcel = modoExcel === 'plantilla' ? iniciarExcelPlantilla : iniciarExcelSICAF;

  // ════════════════════════════════════════════════════════════════════════
  // VISTAS
  // ════════════════════════════════════════════════════════════════════════

  // ── Menú principal ───────────────────────────────────────────────────────
  if (adminTab === 'menu') return (
    <ScrollView style={pa.content}>
      <Text style={pa.titulo}>🔧 Panel de Administración</Text>
      <Text style={pa.sub}>Accesos otorgados por el administrador del sistema</Text>
      {permisosAdmin.canCreateUsers && (
        <TouchableOpacity style={[pa.card, { borderLeftColor: '#4A9EC4' }]} onPress={() => { setAdminTab('usuarios'); cargarUsuariosAdmin(); }}>
          <Text style={pa.cardIcon}>👥</Text>
          <View style={{ flex: 1 }}><Text style={pa.cardTitulo}>Gestionar Usuarios</Text><Text style={pa.cardDesc}>Crear nuevos usuarios y editar datos existentes</Text></View>
          <Text style={{ color: '#aaa' }}>›</Text>
        </TouchableOpacity>
      )}
      {permisosAdmin.canLoadExcel && (
        <TouchableOpacity style={[pa.card, { borderLeftColor: '#4CAF7D' }]} onPress={() => setAdminTab('excel')}>
          <Text style={pa.cardIcon}>📂</Text>
          <View style={{ flex: 1 }}><Text style={pa.cardTitulo}>Cargar desde Excel</Text><Text style={pa.cardDesc}>Sincronizar empleados desde Google Drive</Text></View>
          <Text style={{ color: '#aaa' }}>›</Text>
        </TouchableOpacity>
      )}
      {permisosAdmin.canAprobar && (
        <TouchableOpacity style={[pa.card, { borderLeftColor: '#F59E0B' }]} onPress={() => { setAdminTab('aprobar'); cargarPermisosAdmin(); }}>
          <Text style={pa.cardIcon}>✅</Text>
          <View style={{ flex: 1 }}><Text style={pa.cardTitulo}>Aprobar / Rechazar Solicitudes</Text><Text style={pa.cardDesc}>Gestionar solicitudes de todos los empleados</Text></View>
          <Text style={{ color: '#aaa' }}>›</Text>
        </TouchableOpacity>
      )}
      {permisosAdmin.canGestionarFestivos && (
        <TouchableOpacity style={[pa.card, { borderLeftColor: '#7C4DCC' }]} onPress={() => setAdminTab('festivos')}>
          <Text style={pa.cardIcon}>🎉</Text>
          <View style={{ flex: 1 }}><Text style={pa.cardTitulo}>Gestionar Días Festivos</Text><Text style={pa.cardDesc}>Agregar, editar y eliminar días festivos del calendario</Text></View>
          <Text style={{ color: '#aaa' }}>›</Text>
        </TouchableOpacity>
      )}
      <View style={{ height: 30 }} />
    </ScrollView>
  );

  // ── Usuarios ─────────────────────────────────────────────────────────────
  if (adminTab === 'usuarios') {
    const filtrados = adminUsuarios.filter(u =>
      u.nombre?.toLowerCase().includes(adminBusqueda.toLowerCase()) || u.codigo?.includes(adminBusqueda)
    );
    return (
      <View style={{ flex: 1 }}>
        <View style={pa.topBar}>
          <TouchableOpacity onPress={() => setAdminTab('menu')} style={pa.btnVolver}><Text style={pa.btnVolverText}>← Volver</Text></TouchableOpacity>
          <TextInput style={pa.searchInput} placeholder="🔍 Buscar..." placeholderTextColor="#aaa" value={adminBusqueda} onChangeText={setAdminBusqueda} />
          <TouchableOpacity style={pa.btnNuevo} onPress={() => setAdminModalUser({})}><Text style={{ color: 'white', fontWeight: '700', fontSize: 20 }}>＋</Text></TouchableOpacity>
        </View>
        <ScrollView style={pa.content}>
          <Text style={pa.titulo}>👥 Usuarios ({filtrados.length})</Text>
          {adminCargando && <ActivityIndicator color={AZUL} style={{ margin: 20 }} />}
          {filtrados.map(u => (
            <TouchableOpacity key={u.id} style={pa.userRow} onPress={() => setAdminModalUser(u)}>
              {u.fotoPerfil
                ? <Image source={{ uri: u.fotoPerfil }} style={{ width: 42, height: 42, borderRadius: 21 }} />
                : <View style={pa.userAvatar}><Text style={pa.userAvatarText}>{u.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</Text></View>
              }
              <View style={{ flex: 1 }}>
                <Text style={pa.userNombre}>{u.nombre}</Text>
                <Text style={pa.userSub}>{u.codigo} · {u.departamento} · {u.rol}</Text>
              </View>
              <Text style={{ color: '#888' }}>✏️</Text>
            </TouchableOpacity>
          ))}
          <View style={{ height: 80 }} />
        </ScrollView>
        {adminModalUser !== null && (
          <AdminUserModal
            u={adminModalUser}
            dbUrl={DB_URL}
            apiKey={API_KEY}
            onClose={() => setAdminModalUser(null)}
            onSaved={() => { setAdminModalUser(null); cargarUsuariosAdmin(); }}
          />
        )}
      </View>
    );
  }

  // ── Excel ─────────────────────────────────────────────────────────────────
  if (adminTab === 'excel') {
    const pct = excelProgreso ? Math.round((excelProgreso.actual / excelProgreso.total) * 100) : 0;
    return (
      <ScrollView style={pa.content}>
        <TouchableOpacity onPress={() => setAdminTab('menu')} style={{ marginBottom: 16 }}>
          <Text style={{ color: AZUL, fontWeight: '700' }}>← Volver</Text>
        </TouchableOpacity>
        <Text style={pa.titulo}>📂 Carga Masiva de Empleados</Text>
        <Text style={pa.sub}>Selecciona el modo de carga</Text>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {[{ key: 'plantilla', icon: '📋', label: 'Plantilla Excel', desc: 'Con roles y departamentos' }, { key: 'sicaf', icon: '🏢', label: 'Reporte SICAF', desc: 'Desde Google Drive' }].map(m => (
            <TouchableOpacity
              key={m.key}
              style={{ flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', backgroundColor: modoExcel === m.key ? AZUL : AZUL_CLARO, borderWidth: 2, borderColor: modoExcel === m.key ? AZUL : '#E8EDF5' }}
              onPress={() => setModoExcel(m.key)}
            >
              <Text style={{ fontSize: 20 }}>{m.icon}</Text>
              <Text style={{ fontWeight: '700', fontSize: 12, color: modoExcel === m.key ? 'white' : '#555', marginTop: 4 }}>{m.label}</Text>
              <Text style={{ fontSize: 10, color: modoExcel === m.key ? 'rgba(255,255,255,0.8)' : '#888', textAlign: 'center', marginTop: 2 }}>{m.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {modoExcel === 'plantilla' ? (
          <View style={{ backgroundColor: '#EDF7ED', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <Text style={{ fontWeight: '700', color: '#2E7D32', marginBottom: 6 }}>✅ Modo Plantilla Excel</Text>
            <Text style={{ fontSize: 12, color: '#555' }}>{'• Sube el archivo Excel con la plantilla oficial\n• Incluye rol, departamento, días y permisos\n• Los roles y departamentos existentes SÍ se actualizan\n• Empleados nuevos se crean con todos sus datos'}</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: '#FFF8E1', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <Text style={{ fontWeight: '700', color: '#F59E0B', marginBottom: 6 }}>⚠️ Modo SICAF (Google Drive)</Text>
            <Text style={{ fontSize: 12, color: '#555' }}>{'• Lee el reporte de empleados de SICAF\n• Solo actualiza nombre y fecha de ingreso\n• 🔒 Rol y departamento existentes NO se sobreescriben\n• Empleados nuevos se crean como "auxiliar"'}</Text>
          </View>
        )}

        {!excelCoriendo && !excelResultado && (
          <TouchableOpacity style={pa.btnPrimary} onPress={iniciarExcel}>
            <Text style={pa.btnPrimaryText}>{modoExcel === 'plantilla' ? '📁 Seleccionar archivo Excel' : '▶ Leer desde Google Drive'}</Text>
          </TouchableOpacity>
        )}

        {excelCoriendo && excelProgreso && (
          <View style={[pa.card, { flexDirection: 'column', alignItems: 'center', gap: 10 }]}>
            <ActivityIndicator color={AZUL} />
            <Text style={{ fontWeight: '800' }}>{excelProgreso.actual}/{excelProgreso.total} — {pct}%</Text>
            <View style={{ width: '100%', height: 8, backgroundColor: AZUL_CLARO, borderRadius: 4 }}>
              <View style={{ height: 8, backgroundColor: AZUL, borderRadius: 4, width: `${pct}%` }} />
            </View>
            <Text style={{ color: '#555' }}>✅ {excelProgreso.actualizados}  🆕 {excelProgreso.creados}  🔒 {excelProgreso.protegidos ?? 0}  ❌ {excelProgreso.errores}</Text>
          </View>
        )}

        {excelResultado && (
          <View style={[pa.card, { flexDirection: 'column', borderLeftColor: '#4CAF7D' }]}>
            <Text style={{ color: '#4CAF7D', fontWeight: '800', fontSize: 16, marginBottom: 10 }}>✅ Carga completada</Text>
            <Text style={{ marginBottom: 4 }}>📊 Total procesados: {excelResultado.total}</Text>
            <Text style={{ color: '#4CAF7D', marginBottom: 4 }}>✅ Actualizados: {excelResultado.actualizados}</Text>
            <Text style={{ color: '#4A9EC4', marginBottom: 4 }}>🆕 Creados: {excelResultado.creados}</Text>
            <Text style={{ color: '#F59E0B', marginBottom: 4 }}>🔒 Protegidos (sin cambio): {excelResultado.protegidos ?? 0}</Text>
            <Text style={{ color: '#EF5350', marginBottom: 12 }}>❌ Errores: {excelResultado.errores}</Text>
            <TouchableOpacity style={pa.btnPrimary} onPress={() => { setExcelResultado(null); setExcelProgreso(null); }}>
              <Text style={pa.btnPrimaryText}>🔄 Cargar otro archivo</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    );
  }

  // ── Aprobar desde admin ──────────────────────────────────────────────────
  if (adminTab === 'aprobar') {
    const pendientes = adminPermisos.filter(p => p.estado === 'Pendiente');
    const lista      = [...pendientes, ...adminPermisos.filter(p => p.estado !== 'Pendiente')];
    return (
      <View style={{ flex: 1 }}>
        <View style={pa.topBar}>
          <TouchableOpacity onPress={() => setAdminTab('menu')} style={pa.btnVolver}><Text style={pa.btnVolverText}>← Volver</Text></TouchableOpacity>
          <Text style={{ flex: 1, fontWeight: '700', color: '#1a1a2e' }}>Solicitudes ({lista.length})</Text>
          <TouchableOpacity onPress={cargarPermisosAdmin} style={{ padding: 8 }}><Text style={{ color: AZUL, fontWeight: '700' }}>🔄</Text></TouchableOpacity>
        </View>
        <ScrollView style={pa.content}>
          {adminCargando && <ActivityIndicator color={AZUL} style={{ margin: 20 }} />}
          {lista.length === 0 && !adminCargando && (
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 30, alignItems: 'center', marginTop: 10 }}>
              <Text style={{ color: '#aaa' }}>No hay solicitudes</Text>
            </View>
          )}
          {lista.map(p => (
            <View key={p.id} style={[pa.card, { flexDirection: 'column', borderLeftColor: colorE(p.estado) }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={pa.userNombre}>{p.nombre}</Text>
                  <Text style={pa.userSub}>{p.cargo} · {p.codigo}</Text>
                  <Text style={pa.userSub}>📁 {p.departamento}</Text>
                </View>
                <View style={{ backgroundColor: colorE(p.estado)+'20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' }}>
                  <Text style={{ color: colorE(p.estado), fontWeight: '700', fontSize: 11 }}>{p.estado}</Text>
                </View>
              </View>
              <View style={{ backgroundColor: '#F5F7FF', borderRadius: 10, padding: 10, marginBottom: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a2e', marginBottom: 4 }}>{p.tipo} · 📅 {p.fechaInicio} → {p.fechaFin}</Text>
                <Text style={{ fontSize: 12, color: '#555' }}>💬 {p.motivo}</Text>
              </View>
              {p.estado === 'Pendiente' && (() => {
                const esPersonalAdmin = p.tipo === 'Personal';
                const esMedioDiaAdmin = p.duracion === 'medioDia';
                return esPersonalAdmin ? (
                  <View style={{ gap: 6 }}>
                    {esMedioDiaAdmin && (
                      <View style={{ backgroundColor: '#EDE8FD', borderRadius: 8, padding: 6, alignItems: 'center' }}>
                        <Text style={{ color: '#7C4DCC', fontWeight: '700', fontSize: 11 }}>🕐 Solicita ½ día</Text>
                      </View>
                    )}
                    <TouchableOpacity style={{ backgroundColor: '#EDF7ED', borderRadius: 10, padding: 10, alignItems: 'center' }} onPress={() => cambiarEstadoPermiso(p.id, 'Aprobado', p, false)}>
                      <Text style={{ color: '#2E7D32', fontWeight: '700' }}>✅ Aprobar sin descuento</Text>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity style={{ flex: 1, backgroundColor: '#FFF8E1', borderRadius: 10, padding: 10, alignItems: 'center' }} onPress={() => cambiarEstadoPermiso(p.id, 'Aprobado', p, 0.5)}>
                        <Text style={{ color: '#E65100', fontWeight: '700', fontSize: 12 }}>✅ Desc. ½ día</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ flex: 1, backgroundColor: '#FFE0E0', borderRadius: 10, padding: 10, alignItems: 'center' }} onPress={() => cambiarEstadoPermiso(p.id, 'Aprobado', p, 1)}>
                        <Text style={{ color: '#C62828', fontWeight: '700', fontSize: 12 }}>✅ Desc. 1 día</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ flex: 0.6, backgroundColor: '#FEECEC', borderRadius: 10, padding: 10, alignItems: 'center' }} onPress={() => cambiarEstadoPermiso(p.id, 'Rechazado', p)}>
                        <Text style={{ color: '#EF5350', fontWeight: '700' }}>❌</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={{ flex: 1, backgroundColor: '#EDF7ED', borderRadius: 10, padding: 10, alignItems: 'center' }} onPress={() => cambiarEstadoPermiso(p.id, 'Aprobado', p)}>
                      <Text style={{ color: '#4CAF7D', fontWeight: '700' }}>✅ Aprobar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flex: 1, backgroundColor: '#FEECEC', borderRadius: 10, padding: 10, alignItems: 'center' }} onPress={() => cambiarEstadoPermiso(p.id, 'Rechazado', p)}>
                      <Text style={{ color: '#EF5350', fontWeight: '700' }}>❌ Rechazar</Text>
                    </TouchableOpacity>
                  </View>
                );
              })()}
            </View>
          ))}
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    );
  }

  // ── Festivos ──────────────────────────────────────────────────────────────
  if (adminTab === 'festivos') {
    return (
      <View style={{ flex: 1 }}>
        <View style={pa.topBar}>
          <TouchableOpacity onPress={() => setAdminTab('menu')} style={pa.btnVolver}>
            <Text style={pa.btnVolverText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={{ flex: 1, fontWeight: '700', color: '#1a1a2e' }}>🎉 Días Festivos</Text>
        </View>
        <GestionFestivos />
      </View>
    );
  }

  return null;
}

const pa = StyleSheet.create({
  content:        { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  titulo:         { fontSize: 22, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  sub:            { fontSize: 12, color: '#888', marginBottom: 20 },
  card:           { backgroundColor: 'white', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#EEF2FB' },
  cardIcon:       { fontSize: 28 },
  cardTitulo:     { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  cardDesc:       { fontSize: 12, color: '#888', marginTop: 2 },
  topBar:         { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#EEF2FB' },
  btnVolver:      { padding: 8 },
  btnVolverText:  { color: AZUL, fontWeight: '700' },
  searchInput:    { flex: 1, backgroundColor: '#F5F7FF', borderRadius: 12, padding: 10, fontSize: 13, borderWidth: 1, borderColor: '#E8EDF5' },
  btnNuevo:       { backgroundColor: AZUL, borderRadius: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  userRow:        { backgroundColor: 'white', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  userAvatar:     { width: 42, height: 42, borderRadius: 21, backgroundColor: AZUL_CLARO, alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { color: AZUL, fontWeight: '800', fontSize: 14 },
  userNombre:     { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  userSub:        { fontSize: 11, color: '#888', marginTop: 2 },
  btnPrimary:     { backgroundColor: AZUL, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  btnPrimaryText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
