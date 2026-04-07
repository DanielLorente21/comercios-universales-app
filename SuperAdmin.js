import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, SafeAreaView,
  StatusBar, Platform, Modal, FlatList, Image
} from 'react-native';

// Imports condicionales — funcionan en APK y Expo Go, no en Snack.dev
let DocumentPicker = null;
let FileSystem     = null;
let Sharing        = null;
try { DocumentPicker = require('expo-document-picker'); } catch {}
try { FileSystem     = require('expo-file-system');     } catch {} // Keep this for file operations
try { Sharing        = require('expo-sharing');         } catch {} // Keep this for sharing files

import config from './constantsconfig'; // Importar la configuración centralizada

// Helper para formato de email
const codeToEmail = (code) => `${code.toLowerCase().trim()}@comercios.app`;
// SEGURIDAD: Los usuarios SA se cargan desde la colección 'superadmins' en Firestore.

const DRIVE_API_KEY = config.DRIVE_API_KEY;
const AZUL     = '#1a1a2e';
const ACENTO   = '#e94560';
const VERDE    = '#4CAF7D';
const AMARILLO = '#F59E0B';
const ROJO     = '#EF5350';

const FECHAS_INGRESO_EXCEL = {}; // Limpieza de datos estáticos obsoletos

const fsGetAll = async (col) => {
  try {
    let todos = [];
    let pageToken = null;
    do {
      const url = pageToken
        ? `${config.DB_URL}/${col}?key=${config.FIREBASE_API_KEY}&pageSize=300&pageToken=${pageToken}`
        : `${config.DB_URL}/${col}?key=${config.FIREBASE_API_KEY}&pageSize=300`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        const pagina = data.documents.map(doc => {
          if (!doc || !doc.name) return null;
          const id = doc.name.split('/').pop();
          const f = doc.fields || {};
          const obj = { id };
          for (const k in f) {
            // Soporta todos los tipos de campo de Firestore REST
            obj[k] = f[k].stringValue
              ?? f[k].integerValue
              ?? f[k].doubleValue
              ?? (f[k].booleanValue !== undefined ? String(f[k].booleanValue) : undefined)
              ?? '';
          }
          return obj;
        }).filter(Boolean);
        todos = todos.concat(pagina);
      }
      pageToken = data.nextPageToken ?? null;
    } while (pageToken);
    return todos;
  } catch { return []; }
};

const fsUpdate = async (col, docId, datos) => {
  const fields = {};
  for (const k in datos) fields[k] = { stringValue: String(datos[k]) };
  const mask = Object.keys(datos).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const res  = await fetch(`${config.DB_URL}/${col}/${docId}?${mask}&key=${config.FIREBASE_API_KEY}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
};

const fsAdd = async (col, datos) => {
  const fields = {};
  for (const k in datos) fields[k] = { stringValue: String(datos[k]) };
  const res  = await fetch(`${config.DB_URL}/${col}?key=${config.FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
};

const fsDelete = async (col, docId) => {
  const res = await fetch(`${config.DB_URL}/${col}/${docId}?key=${config.FIREBASE_API_KEY}`, { method: 'DELETE' });
  return res.ok;
};

const fsGetConfig = async () => {
  try {
    const res  = await fetch(`${config.DB_URL}/config/global?key=${config.FIREBASE_API_KEY}`);
    const data = await res.json();
    if (data.error) return null;
    const f = data.fields;
    return { diasPorMes: f?.diasPorMes?.stringValue ?? '1.25' };
  } catch { return null; }
};

const fsSetConfig = async (datos) => {
  const fields = {};
  for (const k in datos) fields[k] = { stringValue: String(datos[k]) };
  const mask = Object.keys(datos).map(k => `updateMask.fieldPaths=${k}`).join('&'); // Firestore REST API requires updateMask for PATCH
  await fetch(`${config.DB_URL}/config/global?${mask}&key=${config.FIREBASE_API_KEY}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
};


const fsLog = async (accion, detalle, usuario, apiKey, dbUrl) => {
  try {
    const ahora = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fecha = `${pad(ahora.getDate())}/${pad(ahora.getMonth()+1)}/${ahora.getFullYear()}`;
    const hora  = `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:${pad(ahora.getSeconds())}`;
    const ts    = ahora.getTime(); // para ordenar
    await fetch(`${dbUrl}/bitacora?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {
        accion:   { stringValue: accion },
        detalle:  { stringValue: detalle },
        usuario:  { stringValue: usuario },
        fecha:    { stringValue: fecha },
        hora:     { stringValue: hora },
        timestamp:{ stringValue: String(ts) },
      }})
    });
  } catch { /* silencioso — no interrumpir el flujo si falla el log */ }
};

const ROLES_SA = ['auxiliar', 'jefe', 'contralor', 'dueno'];

function ModalUsuarioExterno({ modalUsuario, setModalUsuario, guardarUsuario, resetearDias, nuevoUser }) {
  const esNuevo = modalUsuario && !modalUsuario.id;
  const [form, setForm] = useState(esNuevo ? nuevoUser : {
    codigo:               modalUsuario?.codigo               ?? '',
    nombre:               modalUsuario?.nombre               ?? '',
    cargo:                modalUsuario?.cargo                ?? '',
    departamento:         modalUsuario?.departamento         ?? '',
    rol:                  modalUsuario?.rol                  ?? 'empleado',
    password:             modalUsuario?.password             ?? '',
    dias:                 modalUsuario?.dias                 ?? '15',
    fechaIngreso:         modalUsuario?.fechaIngreso         ?? '',
    canGestionarFestivos: modalUsuario?.canGestionarFestivos ?? 'false',
    canCreateUsers:       modalUsuario?.canCreateUsers       ?? 'false',
    canLoadExcel:         modalUsuario?.canLoadExcel         ?? 'false',
    canAprobar:           modalUsuario?.canAprobar           ?? 'false',
  });

  const guardar = () => {
    if (!form.codigo || !form.nombre) { Alert.alert('Error', 'Código y nombre son requeridos'); return; }
    guardarUsuario(form, modalUsuario?.id);
  };

  const resetDias = () => {
    Alert.alert('Resetear días', `¿A cuántos días resetear a ${form.nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: '15 días', onPress: () => { resetearDias(modalUsuario, '15'); setModalUsuario(null); } },
      { text: '0 días', style: 'destructive', onPress: () => { resetearDias(modalUsuario, '0'); setModalUsuario(null); } },
    ]);
  };

  return (
    <Modal visible={!!modalUsuario} animationType="slide" transparent>
      <View style={sa.modalOverlay}>
        <View style={sa.modalCard}>
          <Text style={sa.modalTitulo}>{esNuevo ? '➕ Nuevo Usuario' : '✏️ Editar Usuario'}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { key: 'codigo',       label: 'Código',                     kb: 'default' },
              { key: 'nombre',       label: 'Nombre completo',            kb: 'default' },
              { key: 'cargo',        label: 'Cargo',                      kb: 'default' },
              { key: 'departamento', label: 'Departamento',               kb: 'default' },
              { key: 'password',     label: 'Contraseña',                 kb: 'default', secure: true },
              { key: 'dias',         label: 'Días disponibles',           kb: 'numeric'  },
              { key: 'fechaIngreso', label: 'Fecha ingreso (DD/MM/AAAA)', kb: 'default' },
            ].map(f => (
              <View key={f.key} style={{ marginBottom: 10 }}>
                <Text style={sa.configLabel}>{f.label}</Text>
                <TextInput style={sa.input} value={form[f.key]} keyboardType={f.kb}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  secureTextEntry={f.secure}
                  placeholderTextColor="#555" placeholder={f.label} />
              </View>
            ))}
            <Text style={sa.configLabel}>Rol</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {ROLES_SA.map(r => (
                <TouchableOpacity key={r}
                  style={[sa.pill, { backgroundColor: form.rol === r ? ACENTO : '#333', paddingHorizontal: 14, paddingVertical: 8 }]}
                  onPress={() => setForm(p => ({ ...p, rol: r }))}>
                  <Text style={[sa.pillText, { color: 'white' }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[sa.configLabel, { marginTop: 8 }]}>🔧 Permisos especiales</Text>
            {[
              { key: 'canCreateUsers',       label: '👥 Crear y editar usuarios',      desc: 'Puede crear nuevos usuarios y editar sus datos'                },
              { key: 'canLoadExcel',         label: '📂 Cargar empleados desde Excel', desc: 'Puede sincronizar empleados desde Google Drive'                },
              { key: 'canAprobar',           label: '✅ Aprobar/rechazar solicitudes',  desc: 'Puede aprobar o rechazar solicitudes de cualquier empleado'    },
              { key: 'canGestionarFestivos', label: '🎉 Gestionar días festivos',       desc: 'Puede agregar, editar y eliminar días festivos del calendario' },
            ].map(p => (
              <TouchableOpacity key={p.key}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: form[p.key] === 'true' ? ACENTO + '22' : '#1a1a2e', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: form[p.key] === 'true' ? ACENTO : '#333' }}
                onPress={() => setForm(prev => ({ ...prev, [p.key]: prev[p.key] === 'true' ? 'false' : 'true' }))}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>{p.label}</Text>
                  <Text style={{ color: '#666', fontSize: 11, marginTop: 2 }}>{p.desc}</Text>
                </View>
                <View style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: form[p.key] === 'true' ? ACENTO : '#333', justifyContent: 'center', paddingHorizontal: 2 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: 'white', alignSelf: form[p.key] === 'true' ? 'flex-end' : 'flex-start' }} />
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={sa.btnAcceso} onPress={guardar}>
              <Text style={sa.btnAccesoText}>💾 {esNuevo ? 'Crear usuario' : 'Guardar cambios'}</Text>
            </TouchableOpacity>
            {!esNuevo && (
              <TouchableOpacity style={[sa.btnAcceso, { backgroundColor: AMARILLO + '33', marginTop: 8 }]} onPress={resetDias}>
                <Text style={[sa.btnAccesoText, { color: AMARILLO }]}>🔄 Resetear días</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[sa.btnAcceso, { backgroundColor: '#333', marginTop: 8 }]} onPress={() => setModalUsuario(null)}>
              <Text style={sa.btnAccesoText}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function SuperAdmin({ onSalir }) {
  const [pantalla,  setPantalla]  = useState('login');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [tabActivo, setTabActivo] = useState('stats');
  const [cargando,  setCargando]  = useState(false);

  const [usuarios, setUsuarios] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [ajustesConfig, setAjustesConfig] = useState({ diasPorMes: '1.25' });

  const [modalUsuario, setModalUsuario] = useState(null);
  const [modalPermiso, setModalPermiso] = useState(null);
  const [busquedaUser, setBusquedaUser] = useState('');
  const [busquedaPerm, setBusquedaPerm] = useState('');

  const [modalResetear,       setModalResetear]       = useState(null);
  const [diasReset,           setDiasReset]           = useState('15');
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);

  const [passActual,    setPassActual]    = useState('');
  const [passNueva,     setPassNueva]     = useState('');
  const [passConfirm,   setPassConfirm]   = useState('');
  const [passGuardando, setPassGuardando] = useState(false);
  const [passExito,     setPassExito]     = useState(false);
  const [passVigente,   setPassVigente]   = useState(null);
  const [passCargando,  setPassCargando]  = useState(true);
  const [passError,     setPassError]     = useState(false);

  useEffect(() => {
    const cargarAdminsSA = async () => {
      try {
        const res  = await fetch(`${config.DB_URL}/superadmins?key=${config.FIREBASE_API_KEY}&pageSize=50`);
        const data = await res.json();
        if (data.documents && Array.isArray(data.documents)) {
          const lista = data.documents.map(doc => ({
            id:       doc.name.split('/').pop(),
            usuario:  doc.fields?.usuario?.stringValue  ?? '',
            password: doc.fields?.password?.stringValue ?? '',
          }));
          setAdminsSA(lista);
          if (lista.length > 0) setPassVigente('ok'); // señal de que hay admins cargados
          else setPassVigente(null);
        } else {
          setPassVigente(null);
        }
      } catch {
        setPassError(true);
      }
      setPassCargando(false);
    };
    cargarAdminsSA();
  }, []);

  const [cargaProgreso,  setCargaProgreso]  = useState(null);
  // AZUL definido como constante global (línea 27)

  // ── PLANTILLA EXCEL ────────────────────────────────────────────────────────
  const [modoExcelSA,        setModoExcelSA]        = useState('plantilla'); // 'plantilla' | 'sicaf'
  const [plantillaProgreso,  setPlantillaProgreso]  = useState(null);
  const [plantillaResultado, setPlantillaResultado] = useState(null);
  const [plantillaCoriendo,  setPlantillaCoriendo]  = useState(false);

  // ── MANTENIMIENTO ──────────────────────────────────────────────────────────
  const [mantAnalisis,    setMantAnalisis]    = useState(null);
  const [mantAnalizando,  setMantAnalizando]  = useState(false);
  const [mantLimpiando,   setMantLimpiando]   = useState(false);
  const [mantResultado,   setMantResultado]   = useState(null);

  // ── BACKUP ─────────────────────────────────────────────────────────────────
  const [backupGenerando, setBackupGenerando] = useState(false);
  const [backupResultado, setBackupResultado] = useState(null);
  const [backupCargado,   setBackupCargado]   = useState(null);  // datos del backup cargado
  const [backupBusqueda,  setBackupBusqueda]  = useState('');    // búsqueda en visor
  const [backupEmpleado,  setBackupEmpleado]  = useState(null);  // empleado seleccionado
  const [backupCargando,  setBackupCargando]  = useState(false); // cargando archivo
  const [cargaResultado, setCargaResultado] = useState(null);
  const [cargaCoriendo,  setCargaCoriendo]  = useState(false);
  const [empleadosDrive, setEmpleadosDrive] = useState([]);

  const [nuevoUser] = useState({
    codigo: '', nombre: '', cargo: '', departamento: '',
    rol: 'empleado', password: '', dias: '15', fechaIngreso: ''
  });

  const [filtroEstadoSA,       setFiltroEstadoSA]       = useState('Todos');
  const [filtroDesdePermSA,    setFiltroDesdePermSA]    = useState('');
  const [filtroHastaPermSA,    setFiltroHastaPermSA]    = useState('');
  const [mostrarFiltroFechaSA, setMostrarFiltroFechaSA] = useState(false);
  const [permisosExpandidoSA,  setPermisosExpandidoSA]  = useState(false);

  // ── ADMINS SA ──────────────────────────────────────────────────────────────
  const [adminsSA,        setAdminsSA]        = useState([]);
  const [nuevoAdminUser,  setNuevoAdminUser]  = useState('');
  const [nuevoAdminPass,  setNuevoAdminPass]  = useState('');
  const [adminGuardando,  setAdminGuardando]  = useState(false);
  const [saActual,        setSaActual]        = useState('');

  // ── BITÁCORA ───────────────────────────────────────────────────────────────
  const [bitLogs,         setBitLogs]         = useState([]);
  const [bitCargando,     setBitCargando]     = useState(false);
  const [bitDesde,        setBitDesde]        = useState('');
  const [bitHasta,        setBitHasta]        = useState('');
  const [bitUsuario,      setBitUsuario]      = useState('Todos');
  const [bitAccion,       setBitAccion]       = useState('Todos');
  const [bitBuscado,      setBitBuscado]      = useState(false);
  const [bitHayMas,       setBitHayMas]       = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    const [u, p, c] = await Promise.all([
      fsGetAll('usuarios'),
      fsGetAll('permisos'),
      fsGetConfig()
    ]);
    setUsuarios(u);
    setPermisos(p);
    if (c) setAjustesConfig(c);
    setCargando(false);
  };

  const handleLogin = () => {
    if (passCargando) {
      Alert.alert('⏳', 'Verificando credenciales, espera un momento...'); return;
    }
    if (adminsSA.length === 0) {
      Alert.alert('⚠️ Sin configurar', 'No hay usuarios SuperAdmin configurados.\nCrea uno en Firestore → colección superadmins.');
      return;
    }
    const user = loginUser.trim().toUpperCase();
    const pass = loginPass;
    const encontrado = adminsSA.find(a => a.usuario.toUpperCase() === user && a.password === pass);
    if (encontrado) {
      setSaActual(encontrado.usuario);
      setPantalla('app');
      cargarDatos();
      fsLog('Login', `Ingresó al panel SuperAdmin`, encontrado.usuario, config.FIREBASE_API_KEY, config.DB_URL);
    } else {
      const existeUser = adminsSA.find(a => a.usuario.toUpperCase() === user);
      const msg = !existeUser
        ? `Usuario incorrecto.\nEscriste: "${user}"`
        : `Contraseña incorrecta.\nVerifica mayúsculas y caracteres especiales.`;
      Alert.alert('❌ Acceso denegado', msg);
    }
  };

  const handleCambiarPassword = async () => {
    if (!passActual || !passNueva || !passConfirm) {
      Alert.alert('Error', 'Completa todos los campos'); return;
    }
    const adminActual = adminsSA.find(a => a.usuario.toUpperCase() === saActual.toUpperCase());
    if (!adminActual || passActual !== adminActual.password) {
      Alert.alert('Error', 'La contraseña actual es incorrecta'); return;
    }
    if (passNueva.length < 6) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres'); return;
    }
    if (passNueva !== passConfirm) {
      Alert.alert('Error', 'Las contraseñas nuevas no coinciden'); return;
    }
    setPassGuardando(true);
    try {
      const res = await fetch(`${config.DB_URL}/superadmins/${adminActual.id}?updateMask.fieldPaths=password&key=${config.FIREBASE_API_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { password: { stringValue: passNueva } } })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setAdminsSA(prev => prev.map(a => a.id === adminActual.id ? { ...a, password: passNueva } : a));
      setPassActual(''); setPassNueva(''); setPassConfirm('');
      setPassExito(true);
      fsLog('Contraseña cambiada', `Cambió su contraseña de acceso al panel`, saActual, config.FIREBASE_API_KEY, config.DB_URL);
      setTimeout(() => setPassExito(false), 3000);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la contraseña: ' + e.message);
    }
    setPassGuardando(false);
  };

  // Cálculo de estadísticas con protecciones contra valores nulos
  const stats = (!usuarios || !permisos) ? { totalUsuarios:0, totalPermisos:0, pendientes:0, aprobados:0, rechazados:0, porDpto:{}, porRol:{} } : {
    totalUsuarios: usuarios.length || 0,
    totalPermisos: permisos.length || 0,
    pendientes:    (permisos || []).filter(p => p.estado === 'Pendiente').length,
    aprobados:     (permisos || []).filter(p => p.estado === 'Aprobado').length,
    rechazados:    (permisos || []).filter(p => p.estado === 'Rechazado').length,
    porDpto: (usuarios || []).reduce((acc, u) => {
      if (!u) return acc;
      const d = u.departamento || 'Sin dept.';
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {}),
    porRol: (usuarios || []).reduce((acc, u) => {
      if (!u) return acc;
      acc[u.rol || '??'] = (acc[u.rol || '??'] || 0) + 1;
      return acc;
    }, {}),
  };

  const guardarUsuario = async (datos, id) => {
    setCargando(true);
    try {
      if (id) {
        // Al editar, Firebase Auth no permite cambiar contraseña fácilmente vía REST sin el token del usuario,
        // pero actualizamos los datos en Firestore.
        await fsUpdate('usuarios', id, datos);
        fsLog('Usuario editado', `Editó al usuario ${datos.nombre || id} (código: ${datos.codigo || id})`, saActual, config.FIREBASE_API_KEY, config.DB_URL);
        Alert.alert('✅', 'Usuario actualizado');
      } else {
        // 1. Crear el usuario en Firebase Authentication
        const authRes = await fetch(config.AUTH_SIGNUP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: `${datos.codigo.toLowerCase()}@comercios.app`, password: datos.password || datos.codigo, returnSecureToken: true })
        });
        const authData = await authRes.json();
        
        if (authData.error) throw new Error('Error en Auth: ' + authData.error.message);
        
        // 2. Crear el perfil en Firestore
        await fsAdd('usuarios', { ...datos, uid: authData.localId });
        fsLog('Usuario creado', `Creó al usuario ${datos.nombre} (código: ${datos.codigo})`, saActual, config.FIREBASE_API_KEY, config.DB_URL);
        Alert.alert('✅', 'Usuario creado exitosamente en Auth y Base de Datos');
      }
      await cargarDatos();
      setModalUsuario(null);
    } catch (e) { Alert.alert('Error', e.message); }
    setCargando(false);
  };

  const ejecutarEliminarPermiso = async (id) => {
    const perm = permisos.find(p => p.id === id);
    await fsDelete('permisos', id);
    setConfirmandoEliminar(false);
    setModalPermiso(null);
    await cargarDatos();
    fsLog('Permiso eliminado', `Eliminó permiso de ${perm?.nombre || id} (${perm?.tipo || ''} ${perm?.fechaInicio || ''})`, saActual, config.FIREBASE_API_KEY, config.DB_URL);
    Alert.alert('🗑️', 'Permiso eliminado');
  };

  const resetearDias = async (usuario, nuevosDias) => {
    await fsUpdate('usuarios', usuario.id, { dias: String(nuevosDias) });
    fsLog('Días reseteados', `Reseteó días de ${usuario.nombre} (código: ${usuario.codigo}) a ${nuevosDias} días`, saActual, config.FIREBASE_API_KEY, config.DB_URL);
    await cargarDatos();
    Alert.alert('✅', `Días de ${usuario.nombre} actualizados a ${nuevosDias}`);
  };

  const confirmarReset = async () => {
    if (!modalResetear) return;
    if (!diasReset || isNaN(Number(diasReset))) {
      Alert.alert('Error', 'Ingresa un número válido de días');
      return;
    }
    await resetearDias(modalResetear, diasReset);
    setModalResetear(null);
  };

  const guardarConfig = async () => {
    setCargando(true);
    await fsSetConfig({ diasPorMes: ajustesConfig.diasPorMes });
    Alert.alert('✅', `Rate actualizado a ${ajustesConfig.diasPorMes} días/mes`);
    setCargando(false);
  };

  const normalizarFecha = (fi) => {
    if (!fi) return null;
    fi = fi.toString().trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fi)) {
      const [d, m, y] = fi.split('/');
      return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`;
    } else if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(fi)) {
      const [d, m, y] = fi.split('/');
      return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/20${y}`;
    } else if (/^\d{4}-\d{2}-\d{2}/.test(fi)) {
      const [y, m, d] = fi.split('T')[0].split('-');
      return `${d}/${m}/${y}`;
    } else if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(fi)) {
      const meses = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
      const [d, mon, y] = fi.split('-');
      return `${d.padStart(2,'0')}/${meses[mon.toLowerCase()] ?? '01'}/${y}`;
    } else if (/^\d{5,6}$/.test(fi)) {
      const base = new Date(1899, 11, 30);
      base.setDate(base.getDate() + parseInt(fi));
      return `${String(base.getDate()).padStart(2,'0')}/${String(base.getMonth()+1).padStart(2,'0')}/${base.getFullYear()}`;
    }
    return null;
  };

  const leerExcelDrive = async () => {
    const url  = `https://sheets.googleapis.com/v4/spreadsheets/${config.SHEET_ID}/values/Sheet1?key=${config.DRIVE_API_KEY}&valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    if (!data.values || data.values.length === 0) throw new Error('La hoja está vacía');

    let deptActual = '';
    const empleados = [];

    for (let i = 0; i < data.values.length; i++) {
      const row = data.values[i];
      if (row[0]?.toString().trim() === 'Departamento:') {
        deptActual = row[6]?.toString().trim() || row[3]?.toString().trim() || '';
        continue;
      }
      const codigo = row[1]?.toString().trim() ?? '';
      if (!codigo || !/^\d+$/.test(codigo)) continue;
      const nombres      = row[4]?.toString().trim() ?? '';
      const apellidos    = row[8]?.toString().trim() ?? '';
      const fechaIngreso = normalizarFecha(row[23]);
      if (!fechaIngreso) continue;
      empleados.push({
        codigo,
        nombre:            `${nombres} ${apellidos}`.trim(),
        cargo:             'Empleado',
        departamento:      deptActual,
        rol:               'empleado',
        password:          codigo,
        dias:              '15',
        fechaIngreso,
        ultimaAcumulacion: '',
      });
    }
    return empleados;
  };

  const iniciarCargaExcel = async () => {
    setCargaCoriendo(true);
    setCargaProgreso(null);
    setCargaResultado(null);
    setEmpleadosDrive([]);
    try {
      const empleados = await leerExcelDrive();
      setEmpleadosDrive(empleados);
      if (empleados.length === 0) {
        Alert.alert('⚠️ Sin datos', 'No se encontraron empleados. Verifica que el archivo esté compartido correctamente.');
        setCargaCoriendo(false);
        return;
      }
      let actualizados = 0, creados = 0, errores = 0;
      for (let i = 0; i < empleados.length; i++) {
          const emp = empleados[i];
          try {
            const res  = await fetch(`${config.DB_URL}:runQuery?key=${config.FIREBASE_API_KEY}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ structuredQuery: {
                from: [{ collectionId: 'usuarios' }],
                where: { fieldFilter: { field: { fieldPath: 'codigo' }, op: 'EQUAL', value: { stringValue: emp.codigo } } },
                limit: 1
              }})
            });
            const data = await res.json();
            if (data[0]?.document) {
              const docId = data[0].document.name.split('/').pop();
              await fsUpdate('usuarios', docId, { fechaIngreso: emp.fechaIngreso, departamento: emp.departamento });
              actualizados++;
            } else {
              // Registro automático en Firebase Auth para empleados nuevos
              const authRes = await fetch(config.AUTH_SIGNUP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: codeToEmail(emp.codigo), password: emp.codigo, returnSecureToken: true })
              });
              const authData = await authRes.json();

              await fsAdd('usuarios', {
                codigo:            emp.codigo,
                nombre:            emp.nombre,
                cargo:             emp.cargo,
                departamento:      emp.departamento,
                rol:               emp.rol,
                password:          emp.password,
                uid:               authData.localId || '',
                dias:              emp.dias,
                fechaIngreso:      emp.fechaIngreso,
                ultimaAcumulacion: '',
              });
              creados++;
            }
          } catch (e) {
            errores++;
            console.error('Error processing employee:', e);
          }
        setCargaProgreso({ actual: i + 1, total: empleados.length, actualizados, creados, errores });
        await new Promise(r => setTimeout(r, 50));
      }
      setCargaResultado({ total: empleados.length, actualizados, creados, errores });
    } catch (e) {
      Alert.alert('❌ Error', `No se pudo leer el Excel:\n${e.message}\n\nVerifica que esté compartido como "Cualquier persona con el enlace".`);
    }
    setCargaCoriendo(false);
    await cargarDatos(); // Refresh data after import
  };

  if (pantalla === 'login') return (
    <SafeAreaView style={sa.loginBg}>
      <StatusBar barStyle="light-content" backgroundColor={AZUL} />
      <View style={sa.loginCenter}>
        <View style={sa.loginIconBox}><Text style={{ fontSize: 36 }}>🛡️</Text></View>
        <Text style={sa.loginTitulo}>Panel SuperAdmin</Text>
        <Text style={sa.loginSub}>Comercios Universales</Text>
        <TextInput style={sa.input} placeholder="Usuario" placeholderTextColor="#666"
          value={loginUser} onChangeText={setLoginUser} autoCapitalize="characters" />
        <TextInput style={sa.input} placeholder="Contraseña" placeholderTextColor="#666"
          value={loginPass} onChangeText={setLoginPass} secureTextEntry />
        {passCargando
          ? <View style={{ alignItems: 'center', marginTop: 16, gap: 8 }}>
              <ActivityIndicator color={ACENTO} />
              <Text style={{ color: '#555', fontSize: 12 }}>Verificando credenciales...</Text>
            </View>
          : passError
            ? <View style={{ backgroundColor: ROJO + '22', borderRadius: 12, padding: 14, marginTop: 8, borderWidth: 1, borderColor: ROJO, alignItems: 'center', gap: 8 }}>
                <Text style={{ color: ROJO, fontWeight: '700', fontSize: 14 }}>⚠️ Sin conexión</Text>
                <Text style={{ color: '#aaa', fontSize: 12, textAlign: 'center' }}>
                  No se puede verificar las credenciales.{`
`}Conéctate a internet e intenta de nuevo.
                </Text>
                <TouchableOpacity
                  style={[sa.btnAcceso, { backgroundColor: '#333', marginTop: 4, width: '100%' }]}
                  onPress={() => {
                    setPassError(false);
                    setPassCargando(true);
                    setPassVigente(null);
                    fetch(`${config.DB_URL}/superadmins?key=${config.FIREBASE_API_KEY}&pageSize=50`)
                      .then(r => r.json())
                      .then(data => {
                        if (data.documents && Array.isArray(data.documents)) {
                          const lista = data.documents.map(doc => ({
                            id: doc.name.split('/').pop(),
                            usuario: doc.fields?.usuario?.stringValue ?? '',
                            password: doc.fields?.password?.stringValue ?? '',
                          }));
                          setAdminsSA(lista);
                          setPassVigente(lista.length > 0 ? 'ok' : null);
                        } else { setPassVigente(null); }
                        setPassCargando(false);
                      })
                      .catch(() => { setPassError(true); setPassCargando(false); });
                  }}>
                  <Text style={sa.btnAccesoText}>🔄 Reintentar</Text>
                </TouchableOpacity>
              </View>
            : <TouchableOpacity style={sa.btnAcceso} onPress={handleLogin}>
                <Text style={sa.btnAccesoText}>Entrar al panel →</Text>
              </TouchableOpacity>
        }
        <TouchableOpacity onPress={onSalir} style={{ marginTop: 20 }}>
          <Text style={{ color: '#666', fontSize: 13 }}>← Volver a la app</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const TABS_SA = [
    { key: 'stats',        icon: '📊', label: 'Stats'      },
    { key: 'usuarios',     icon: '👥', label: 'Usuarios'   },
    { key: 'permisos',     icon: '📋', label: 'Permisos'   },
    { key: 'config',       icon: '⚙️', label: 'Config'     },
    { key: 'excel',        icon: '📂', label: 'Excel'      },
    { key: 'mantenimiento',icon: '🛠️', label: 'Mantenim.'  },
    { key: 'backup',       icon: '💾', label: 'Backup'     },
    { key: 'bitacora',     icon: '📋', label: 'Bitácora'   },
    { key: 'seguridad',    icon: '🔒', label: 'Seguridad'  },
  ];

  // ── MANTENIMIENTO: analizar qué se puede limpiar ───────────────────────────
  const analizarBaseDatos = async () => {
    setMantAnalizando(true);
    setMantAnalisis(null);
    setMantResultado(null);
    try {
      const [notifs, perms] = await Promise.all([
        fsGetAll('notificaciones'),
        fsGetAll('permisos'),
      ]);
      const ahora    = new Date();
      const hace3m   = new Date(ahora); hace3m.setMonth(hace3m.getMonth() - 3);
      const hace6m   = new Date(ahora); hace6m.setMonth(hace6m.getMonth() - 6);
      const hace1a   = new Date(ahora); hace1a.setFullYear(hace1a.getFullYear() - 1);
      const hace2a   = new Date(ahora); hace2a.setFullYear(hace2a.getFullYear() - 2);

      const notifs3m  = notifs.filter(n => n.fecha && new Date(n.fecha) < hace3m);
      const notifs6m  = notifs.filter(n => n.fecha && new Date(n.fecha) < hace6m);
      const permsRech1a = perms.filter(p => p.estado === 'Rechazado' && p.fechaInicio && (() => { try { const [d,m,y] = p.fechaInicio.split('/'); return new Date(Number(y), Number(m)-1, Number(d)) < hace1a; } catch { return false; } })());
      const permsApro2a = perms.filter(p => p.estado === 'Aprobado'  && p.fechaInicio && (() => { try { const [d,m,y] = p.fechaInicio.split('/'); return new Date(Number(y), Number(m)-1, Number(d)) < hace2a; } catch { return false; } })());

      setMantAnalisis({
        notificaciones: { total: notifs.length, antiguedad3m: notifs3m.length, antiguedad6m: notifs6m.length, ids3m: notifs3m.map(n => n.id), ids6m: notifs6m.map(n => n.id) },
        permisos:       { total: perms.length,  rechazados1a: permsRech1a.length, aprobados2a: permsApro2a.length, idsRech: permsRech1a.map(p => p.id), idsApro: permsApro2a.map(p => p.id) },
      });
    } catch(e) { Alert.alert('Error', e.message); }
    setMantAnalizando(false);
  };

  const ejecutarLimpieza = async (tipo) => {
    if (!mantAnalisis) return;
    let ids = [];
    let coleccion = '';
    let descripcion = '';

    if (tipo === 'notif3m')  { ids = mantAnalisis.notificaciones.ids3m; coleccion = 'notificaciones'; descripcion = 'notificaciones de +3 meses'; } // Corrected typo
    if (tipo === 'notif6m')  { ids = mantAnalisis.notificaciones.ids6m; coleccion = 'notificaciones'; descripcion = 'notificaciones de +6 meses'; }
    if (tipo === 'rech1a')   { ids = mantAnalisis.permisos.idsRech;     coleccion = 'permisos';       descripcion = 'permisos rechazados de +1 año'; }
    if (tipo === 'apro2a')   { ids = mantAnalisis.permisos.idsApro;     coleccion = 'permisos';       descripcion = 'permisos aprobados de +2 años'; }

    if (ids.length === 0) { Alert.alert('Sin datos', 'No hay documentos que limpiar en esta categoría.'); return; }

    Alert.alert(
      '⚠️ Confirmar limpieza',
      `¿Eliminar ${ids.length} ${descripcion}?\n\nEsta acción NO se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: '🗑️ Eliminar', style: 'destructive', onPress: async () => {
          setMantLimpiando(true);
          let eliminados = 0, errores = 0;
          // Eliminar en lotes de 20 para no saturar Firestore
          const LOTE = 20;
          for (let i = 0; i < ids.length; i += LOTE) {
            const lote = ids.slice(i, i + LOTE);
            const resultados = await Promise.all(lote.map(async id => {
              try {
                const res = await fetch(`${config.DB_URL}/${coleccion}/${id}?key=${config.FIREBASE_API_KEY}`, { method: 'DELETE' });
                return res.ok ? 'ok' : 'error';
              } catch { return 'error'; }
            }));
            resultados.forEach(r => r === 'ok' ? eliminados++ : errores++);
          }
          setMantResultado({ eliminados, errores, descripcion });
          setMantLimpiando(false);
          await analizarBaseDatos();
        }},
      ]
    );
  };

  // ── BACKUP: exportar todas las colecciones a JSON ───────────────────────────
  // ── BACKUP: cargar archivo para consulta ───────────────────────────────────
  // ── BACKUP: cargar archivo — soporta Web, Android e iOS ──────────────────
  const cargarArchivoBackup = async () => {
    setBackupCargando(true);
    try {
      if (Platform.OS === 'web') {
        // Web: usar input file nativo del navegador
        const input = document.createElement('input');
        input.type  = 'file';
        input.accept = 'application/json';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) { setBackupCargando(false); return; }
          const reader = new FileReader();
          reader.onload = (ev) => {
            try {
              const datos = JSON.parse(ev.target.result);
              if (!datos.metadata || !datos.usuarios || !datos.permisos) {
                Alert.alert('Error', 'El archivo no es un backup válido de ComerciosApp');
                setBackupCargando(false); return;
              }
              setBackupCargado(datos);
              setBackupBusqueda('');
              setBackupEmpleado(null);
              Alert.alert('✅', `Backup cargado\nFecha: ${datos.metadata.fechaLegible}\n${datos.metadata.totalUsuarios} usuarios · ${datos.metadata.totalPermisos} permisos`);
            } catch { Alert.alert('Error', 'No se pudo leer el archivo JSON'); }
            setBackupCargando(false);
          };
          reader.readAsText(file);
        };
        input.click();
        return;
      }
      // Android / iOS: usar DocumentPicker + FileSystem
      if (!DocumentPicker || !FileSystem) {
        Alert.alert('No disponible', 'Esta función requiere el APK compilado o Expo Go.');
        setBackupCargando(false); return;
      }
      const resultado = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (resultado.canceled) { setBackupCargando(false); return; }
      const uri      = resultado.assets[0].uri;
      let contenido = '';
      try {
        if (FileSystem.readAsStringAsync) {
          contenido = await FileSystem.readAsStringAsync(uri, { encoding: 'utf8' });
        } else {
          const FSLegacy = require('expo-file-system/legacy');
          contenido = await FSLegacy.readAsStringAsync(uri, { encoding: FSLegacy.EncodingType.UTF8 });
        }
      } catch {
        const FSLegacy = require('expo-file-system/legacy');
        contenido = await FSLegacy.readAsStringAsync(uri, { encoding: FSLegacy.EncodingType.UTF8 });
      }
      const datos    = JSON.parse(contenido);
      if (!datos.metadata || !datos.usuarios || !datos.permisos) {
        Alert.alert('Error', 'El archivo no es un backup válido de ComerciosApp'); setBackupCargando(false); return;
      }
      setBackupCargado(datos);
      setBackupBusqueda('');
      setBackupEmpleado(null);
      Alert.alert('✅', `Backup cargado\nFecha: ${datos.metadata.fechaLegible}\n${datos.metadata.totalUsuarios} usuarios · ${datos.metadata.totalPermisos} permisos`);
    } catch(e) { Alert.alert('Error', 'No se pudo leer el archivo: ' + e.message); }
    setBackupCargando(false);
  };

  // ── BACKUP: generar y descargar — soporta Web, Android e iOS ─────────────
  const generarBackup = async () => {
    setBackupGenerando(true);
    setBackupResultado(null);
    try {
      const [usuariosData, permisosData, notifsData, festivosData] = await Promise.all([
        fsGetAll('usuarios'),
        fsGetAll('permisos'),
        fsGetAll('notificaciones'),
        fsGetAll('festivos'),
      ]);

      const usuariosSeguros = usuariosData.map(u => ({ ...u, password: '***' }));
      const backup = {
        metadata: {
          proyecto:            'permisoapplorenti',
          fecha:               new Date().toISOString(),
          fechaLegible:        new Date().toLocaleString('es-GT'),
          version:             '1.0.0',
          totalUsuarios:       usuariosData.length,
          totalPermisos:       permisosData.length,
          totalNotificaciones: notifsData.length,
          totalFestivos:       festivosData.length,
        },
        usuarios:       usuariosSeguros,
        permisos:       permisosData,
        notificaciones: notifsData,
        festivos:       festivosData,
      };

      const json     = JSON.stringify(backup, null, 2);
      const fecha    = new Date().toISOString().split('T')[0];
      const filename = `backup_comerciosapp_${fecha}.json`;

      if (Platform.OS === 'web') {
        // Web: descargar directamente con API del navegador
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Android / iOS: usar nueva API de expo-file-system v54
        if (!FileSystem || !Sharing) {
          Alert.alert('No disponible', 'Esta función requiere el APK compilado o Expo Go.');
          setBackupGenerando(false); return;
        }
        try {
          // Intentar nueva API (expo-file-system v54+)
          const { StorageAccessFramework } = require('expo-file-system');
          const uri = `${FileSystem.cacheDirectory}${filename}`;
          // Usar legacy write si está disponible, sino nueva API
          if (FileSystem.writeAsStringAsync) {
            await FileSystem.writeAsStringAsync(uri, json, { encoding: 'utf8' });
          } else {
            const file = new FileSystem.File(uri);
            await file.write(json);
          }
          const puedeCompartir = await Sharing.isAvailableAsync();
          if (puedeCompartir) {
            await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Guardar Backup', UTI: 'public.json' });
          }
        } catch (fsError) {
          // Fallback: intentar con expo-file-system/legacy
          try {
            const FSLegacy = require('expo-file-system/legacy');
            const uri = `${FSLegacy.cacheDirectory}${filename}`;
            await FSLegacy.writeAsStringAsync(uri, json, { encoding: FSLegacy.EncodingType.UTF8 });
            const puedeCompartir = await Sharing.isAvailableAsync();
            if (puedeCompartir) {
              await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Guardar Backup', UTI: 'public.json' });
            }
          } catch (legacyError) {
            throw new Error('No se pudo guardar el archivo: ' + legacyError.message);
          }
        }
      }

      const backupRes = {
        filename,
        totalRegistros: usuariosData.length + permisosData.length + notifsData.length + festivosData.length,
        tamañoKB: Math.round(json.length / 1024),
        fecha: new Date().toLocaleString('es-GT'),
      };
      setBackupResultado(backupRes);
      fsLog('Backup generado', `Generó backup: ${filename} (${backupRes.tamañoKB} KB, ${backupRes.totalRegistros} registros)`, saActual, config.FIREBASE_API_KEY, config.DB_URL);
    } catch(e) { Alert.alert('Error', 'No se pudo generar el backup: ' + e.message); }
    setBackupGenerando(false);
  };

  const renderStats = () => (
    <ScrollView style={sa.content}>
      <Text style={sa.pageTitle}>📊 Panel de Control</Text>
      <View style={sa.statsGrid}>
        {[
          { label: 'Empleados',  val: stats.totalUsuarios,     color: '#4A9EC4' },
          { label: 'Permisos',   val: stats.totalPermisos,     color: '#7C4DCC' },
          { label: 'Pendientes', val: stats.pendientes,        color: AMARILLO  },
          { label: 'Aprobados',  val: stats.aprobados,         color: VERDE     },
          { label: 'Rechazados', val: stats.rechazados,        color: ROJO      },
          { label: 'Rate/mes',   val: `${ajustesConfig.diasPorMes}d`, color: ACENTO    },
        ].map(s => (
          <View key={s.label} style={[sa.statCard, { borderTopColor: s.color }]}>
            <Text style={[sa.statVal, { color: s.color }]}>{s.val}</Text>
            <Text style={sa.statLbl}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Text style={sa.seccion}>👥 Empleados por departamento</Text>
      {Object.entries(stats.porDpto).sort((a,b) => b[1]-a[1]).map(([dpto, cnt]) => (
        <View key={dpto} style={sa.barRow}>
          <Text style={sa.barLabel}>{dpto}</Text>
          <View style={sa.barBg}>
            <View style={[sa.barFill, { width: `${Math.min(100,(cnt/stats.totalUsuarios)*100)}%` }]} />
          </View>
          <Text style={sa.barVal}>{cnt}</Text>
        </View>
      ))}

      <Text style={sa.seccion}>🔑 Distribución por rol</Text>
      {Object.entries(stats.porRol).map(([rol, cnt]) => (
        <View key={rol} style={sa.barRow}>
          <Text style={sa.barLabel}>{rol}</Text>
          <View style={sa.barBg}>
            <View style={[sa.barFill, { width: `${Math.min(100,(cnt/stats.totalUsuarios)*100)}%`, backgroundColor: ACENTO }]} />
          </View>
          <Text style={sa.barVal}>{cnt}</Text>
        </View>
      ))}
      <TouchableOpacity style={sa.btnRefresh} onPress={cargarDatos}>
        <Text style={sa.btnRefreshText}>🔄 Actualizar datos</Text>
      </TouchableOpacity>
      <View style={{ height: 30 }} />
    </ScrollView>
  );

  const renderUsuarios = () => {
    const filtrados = usuarios.filter(u =>
      u.nombre?.toLowerCase().includes(busquedaUser.toLowerCase()) ||
      u.codigo?.includes(busquedaUser) ||
      u.departamento?.toLowerCase().includes(busquedaUser.toLowerCase())
    );
    return (
      <View style={{ flex: 1 }}>
        <View style={sa.searchRow}>
          <TextInput style={sa.searchInput} placeholder="🔍 Buscar por nombre, código o depto..."
            placeholderTextColor="#555" value={busquedaUser} onChangeText={setBusquedaUser} />
          <TouchableOpacity style={sa.btnNuevo} onPress={() => setModalUsuario({})}>
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 18 }}>＋</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={filtrados}
          keyExtractor={u => u.id}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          contentContainerStyle={[sa.content, { paddingBottom: 40 }]}
          ListHeaderComponent={<Text style={sa.pageTitle}>👥 Usuarios ({filtrados.length})</Text>}
          renderItem={({ item: u }) => (
             <TouchableOpacity style={sa.card} onPress={() => setModalUsuario(u)}>
               {u.fotoPerfil ? <Image source={{ uri: u.fotoPerfil }} style={{ width:42, height:42, borderRadius:21 }} /> : <View style={sa.cardAvatar}><Text style={sa.cardAvatarText}>{u.nombre?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</Text></View>}
               <View style={{ flex:1 }}><Text style={sa.cardNombre}>{u.nombre}</Text><Text style={sa.cardSub}>{u.codigo} · {u.departamento} · {u.rol}</Text></View>
               <Text style={{ color:'#888' }}>✏️</Text>
             </TouchableOpacity>
          )}
          ListEmptyComponent={!cargando && <Text style={{ color: '#aaa', textAlign: 'center', marginTop: 20 }}>No se encontraron usuarios</Text>}
        />
      </View>
    );
  };

  const renderPermisos = () => {
    const REGEX_F = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const parseFecha = (str) => {
      const m = str?.match(REGEX_F);
      if (!m) return null;
      return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    };
    const autoFmt = (t) => {
      const n = t.replace(/\D/g, '').slice(0, 8);
      if (n.length <= 2) return n;
      if (n.length <= 4) return `${n.slice(0,2)}/${n.slice(2)}`;
      return `${n.slice(0,2)}/${n.slice(2,4)}/${n.slice(4)}`;
    };

    const fDesde = parseFecha(filtroDesdePermSA);
    const fHasta = parseFecha(filtroHastaPermSA);
    const hayFecha = fDesde || fHasta;
    const ESTADOS_SA = ['Todos', 'Pendiente', 'Aprobado', 'Rechazado'];

    const colorEstado = (e) => e==='Aprobado' ? VERDE : e==='Rechazado' ? ROJO : AMARILLO;

    // Filtrar por búsqueda de texto
    const porTexto = permisos.filter(p =>
      p.nombre?.toLowerCase().includes(busquedaPerm.toLowerCase()) ||
      p.codigo?.includes(busquedaPerm) ||
      p.tipo?.toLowerCase().includes(busquedaPerm.toLowerCase()) ||
      p.estado?.toLowerCase().includes(busquedaPerm.toLowerCase())
    );

    // Filtrar por estado
    const porEstado = filtroEstadoSA === 'Todos'
      ? porTexto
      : porTexto.filter(p => p.estado === filtroEstadoSA);

    // Filtrar por rango de fechas
    const porFecha = hayFecha
      ? porEstado.filter(p => {
          const partes = p.fechaInicio?.split('/');
          if (!partes || partes.length !== 3) return false;
          const f = new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]));
          if (fDesde && f < fDesde) return false;
          if (fHasta && f > fHasta) return false;
          return true;
        })
      : porEstado;

    // Ordenar más recientes primero
    const ordenados = [...porFecha].sort((a, b) => {
      const pa = a.fechaInicio?.split('/'); const pb = b.fechaInicio?.split('/');
      if (!pa || !pb) return 0;
      return new Date(Number(pb[2]), Number(pb[1])-1, Number(pb[0])) -
             new Date(Number(pa[2]), Number(pa[1])-1, Number(pa[0]));
    });

    const hayMas = ordenados.length > 3 && !permisosExpandidoSA && !hayFecha && filtroEstadoSA === 'Todos' && !busquedaPerm;
    const mostrar = (permisosExpandidoSA || hayFecha || filtroEstadoSA !== 'Todos' || busquedaPerm)
      ? ordenados
      : ordenados.slice(0, 3);

    return (
      <View style={{ flex: 1 }}>
        <View style={sa.searchRow}>
          <TextInput style={[sa.searchInput, { flex: 1 }]} placeholder="🔍 Buscar por nombre, tipo, estado..."
            placeholderTextColor="#555" value={busquedaPerm} onChangeText={v => { setBusquedaPerm(v); setPermisosExpandidoSA(false); }} />
        </View>

        {/* Filtros de estado */}
        <View style={{ flexDirection:'row', paddingHorizontal:12, paddingBottom:8, gap:6, flexWrap:'wrap' }}>
          {ESTADOS_SA.map(e => (
            <TouchableOpacity key={e}
              style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:20, backgroundColor: filtroEstadoSA===e ? ACENTO : '#1e2d3d', borderWidth:1, borderColor: filtroEstadoSA===e ? ACENTO : '#333' }}
              onPress={() => { setFiltroEstadoSA(e); setPermisosExpandidoSA(false); }}>
              <Text style={{ color: filtroEstadoSA===e ? 'white' : '#aaa', fontWeight:'700', fontSize:12 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filtro por fecha */}
        <TouchableOpacity
          style={{ marginHorizontal:12, marginBottom:8, backgroundColor: hayFecha ? ACENTO : '#16213e', borderRadius:10, padding:10, flexDirection:'row', justifyContent:'space-between', borderWidth:1, borderColor: hayFecha ? ACENTO : '#333' }}
          onPress={() => setMostrarFiltroFechaSA(v => !v)}>
          <Text style={{ color: hayFecha ? 'white' : '#aaa', fontWeight:'600', fontSize:12 }}>
            {hayFecha ? `📅 ${filtroDesdePermSA||'...'} → ${filtroHastaPermSA||'...'}` : '📅 Filtrar por rango de fechas'}
          </Text>
          <Text style={{ color: hayFecha ? 'white' : '#aaa' }}>{mostrarFiltroFechaSA ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {mostrarFiltroFechaSA && (
          <View style={{ marginHorizontal:12, marginBottom:8, backgroundColor:'#16213e', borderRadius:12, padding:12, gap:8 }}>
            <View style={{ flexDirection:'row', gap:10 }}>
              <View style={{ flex:1 }}>
                <Text style={{ color:'#aaa', fontSize:11, marginBottom:4 }}>Desde</Text>
                <TextInput style={[sa.input, { marginBottom:0 }]} placeholder="DD/MM/AAAA" placeholderTextColor="#555"
                  value={filtroDesdePermSA} onChangeText={t => setFiltroDesdePermSA(autoFmt(t))} keyboardType="numeric" maxLength={10} />
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ color:'#aaa', fontSize:11, marginBottom:4 }}>Hasta</Text>
                <TextInput style={[sa.input, { marginBottom:0 }]} placeholder="DD/MM/AAAA" placeholderTextColor="#555"
                  value={filtroHastaPermSA} onChangeText={t => setFiltroHastaPermSA(autoFmt(t))} keyboardType="numeric" maxLength={10} />
              </View>
            </View>
            {hayFecha && (
              <TouchableOpacity style={{ backgroundColor:'#2a1a1a', borderRadius:8, padding:8, alignItems:'center' }}
                onPress={() => { setFiltroDesdePermSA(''); setFiltroHastaPermSA(''); }}>
                <Text style={{ color: ROJO, fontWeight:'700', fontSize:12 }}>✕ Limpiar fechas</Text>
              </TouchableOpacity>
            )}
            {hayFecha && (
              <View style={{ backgroundColor:'#1a2a3a', borderRadius:8, padding:8, alignItems:'center' }}>
                <Text style={{ color: VERDE, fontWeight:'600', fontSize:12 }}>{ordenados.length} permiso(s) en este período</Text>
              </View>
            )}
          </View>
        )}

        <FlatList
          data={mostrar}
          keyExtractor={p => p.id}
          contentContainerStyle={[sa.content, { paddingBottom: 40 }]}
          ListHeaderComponent={<Text style={sa.pageTitle}>📋 Permisos ({ordenados.length})</Text>}
          renderItem={({ item: p }) => {
            const esHoras = p.tipo === 'Horas';
            const colorE  = colorEstado(p.estado);
            return (
              <TouchableOpacity
                style={[sa.card, { flexDirection: 'column', borderLeftWidth: 3, borderLeftColor: colorE }]}
                onPress={() => setModalPermiso(p)}
              >
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={sa.cardNombre}>{p.nombre}</Text>
                    <Text style={sa.cardSub}>{p.cargo} · {p.codigo}</Text>
                    <Text style={[sa.cardSub, { color: '#4A9EC4' }]}>📁 {p.departamento}</Text>
                  </View>
                  <View style={[sa.pill, { backgroundColor: colorE + '22' }]}>
                    <Text style={[sa.pillText, { color: colorE }]}>{p.estado}</Text>
                  </View>
                </View>
                {/* Tipo + fecha */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: '#aaa', fontSize: 11 }}>
                    {esHoras ? `⏱️ ${p.tipo} · ${p.horasSolicitadas}h` : `📄 ${p.tipo}`}
                  </Text>
                  <Text style={{ color: '#aaa', fontSize: 11 }}>
                    {p.fechaInicio}{!esHoras && p.fechaFin && p.fechaFin !== p.fechaInicio ? ` → ${p.fechaFin}` : ''}
                  </Text>
                </View>
                {/* Aprobado por */}
                {p.aprobadoPor ? (
                  <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 2 }}>
                    <Text style={{ color: VERDE, fontSize: 11, fontWeight: '700' }}>
                      👤 {p.estado === 'Rechazado' ? 'Rechazado' : 'Aprobado'} por:
                    </Text>
                    <Text style={{ color: 'white', fontSize: 11 }}>{p.aprobadoPor}</Text>
                  </View>
                ) : null}
                {p.fechaAprobacion ? (
                  <Text style={{ color: '#555', fontSize: 11 }}>📅 {p.fechaAprobacion}</Text>
                ) : null}
                {/* Info específica de Horas */}
                {esHoras && (
                  <View style={{ marginTop: 6, backgroundColor: '#0f3460', borderRadius: 8, padding: 8, gap: 3 }}>
                    {p.horaAprobacion  ? <Text style={{ color: '#4CAF7D', fontSize: 11 }}>🟢 Salida: {p.horaAprobacion}</Text> : null}
                    {p.horaRegreso
                      ? <Text style={{ color: '#4A9EC4', fontSize: 11 }}>🔵 Regresó: {p.horaRegreso}</Text>
                      : <Text style={{ color: AMARILLO, fontSize: 11 }}>⏳ Aún no regresa</Text>}
                    {p.tiempoRealMinutos ? <Text style={{ color: '#aaa', fontSize: 11 }}>⏱️ Tiempo: {p.tiempoRealMinutos} min</Text> : null}
                    <Text style={{ color: '#aaa', fontSize: 11 }}>
                      💳 Descuento: {
                        p.descuentoResuelto !== 'true' ? 'Pendiente' :
                        p.diasDescontados === '0'      ? 'Sin descuento' :
                        p.diasDescontados === '0.5'    ? '½ día' : '1 día completo'
                      }
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={hayMas ? (
             <TouchableOpacity style={[sa.btnRefresh, { backgroundColor:'#16213e', borderWidth:1, borderColor:'#333', marginBottom: 20 }]}
               onPress={() => setPermisosExpandidoSA(true)}>
               <Text style={[sa.btnRefreshText, { color: ACENTO }]}>Ver todos ({ordenados.length - 3} más) →</Text>
             </TouchableOpacity>
          ) : <View style={{ height: 30 }} />}
        />
      </View>
    );
  };

  const renderConfig = () => (
    <ScrollView style={sa.content}>
      <Text style={sa.pageTitle}>⚙️ Configuración</Text>

      <View style={sa.configCard}>
        <Text style={sa.configLabel}>📅 Días acumulados por mes</Text>
        <Text style={sa.configDesc}>
          Define cuántos días de vacaciones acumula cada empleado mensualmente.{' '}
          Este valor se usa en la acumulación automática de días.
        </Text>
        <TextInput style={sa.input} value={ajustesConfig.diasPorMes} keyboardType="decimal-pad"
          onChangeText={v => setAjustesConfig(prev => ({ ...prev, diasPorMes: v }))}
          placeholderTextColor="#555" />
        {cargando
          ? <ActivityIndicator color={ACENTO} />
          : <TouchableOpacity style={sa.btnAcceso} onPress={guardarConfig}>
              <Text style={sa.btnAccesoText}>💾 Guardar configuración</Text>
            </TouchableOpacity>
        }
      </View>

      <View style={[sa.configCard, { borderLeftWidth: 3, borderLeftColor: '#4A9EC4' }]}>
        <Text style={[sa.configLabel, { color: '#4A9EC4' }]}>ℹ️ ¿Para qué sirve esto?</Text>
        <Text style={{ color: '#aaa', fontSize: 12, lineHeight: 18 }}>
          {'Actualmente: '}
          <Text style={{ color: 'white', fontWeight: '700' }}>{ajustesConfig.diasPorMes}{' días/mes'}</Text>
          {'\n\nEjemplo: con 1.25 días/mes, un empleado acumula '}
          <Text style={{ color: 'white', fontWeight: '700' }}>{'15 días al año.'}</Text>
          {'\n\nPara resetear días de un empleado, usá la pestaña '}
          <Text style={{ color: 'white', fontWeight: '700' }}>{'👥 Usuarios'}</Text>
          {' → seleccioná el empleado → botón Resetear días.'}
        </Text>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );


  // ── PLANTILLA EXCEL: procesar empleados con protección de rol/depto ────────
  const normalizarFechaSA = (fi) => {
    if (!fi) return null;
    fi = fi.toString().trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fi)) { const [d,m,y]=fi.split('/'); return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`; }
    if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(fi))  { const [d,m,y]=fi.split('/'); return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/20${y}`; }
    if (/^\d{4}-\d{2}-\d{2}/.test(fi))           { const [y,m,d]=fi.split('T')[0].split('-'); return `${d}/${m}/${y}`; }
    if (/^\d{5,6}$/.test(fi)) { const b=new Date(1899,11,30); b.setDate(b.getDate()+parseInt(fi)); return `${String(b.getDate()).padStart(2,'0')}/${String(b.getMonth()+1).padStart(2,'0')}/${b.getFullYear()}`; }
    return null;
  };

  const procesarEmpleadosSA = async (empleados, setProgreso, setResultado) => {
    let actualizados = 0, creados = 0, protegidos = 0, errores = 0;
    for (let i = 0; i < empleados.length; i++) {
      const emp = empleados[i];
      try {
        const qRes  = await fetch(`${config.DB_URL}:runQuery?key=${config.FIREBASE_API_KEY}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ structuredQuery: { from:[{collectionId:'usuarios'}], where:{fieldFilter:{field:{fieldPath:'codigo'},op:'EQUAL',value:{stringValue:emp.codigo}}}, limit:1 }}) });
        const qData = await qRes.json();
        if (qData[0]?.document) {
          const docExist = qData[0].document;
          const docId    = docExist.document.name.split('/').pop(); // Access document.name
          const fields   = docExist.fields;
          const yaRol    = fields?.rol?.stringValue && fields.rol.stringValue !== '';
          const yaDept   = fields?.departamento?.stringValue && fields.departamento.stringValue !== '';
          const datos = { fechaIngreso: emp.fechaIngreso, nombre: emp.nombre };
          if (!yaRol  || emp.fuentePlantilla) datos.rol          = emp.rol || 'auxiliar';
          if (!yaDept || emp.fuentePlantilla) datos.departamento = emp.departamento || '';
          if (emp.fuentePlantilla) {
            if (emp.cargo)            datos.cargo            = emp.cargo;
            if (emp.dias)             datos.dias             = emp.dias;
            if (emp.canAprobar)       datos.canAprobar       = emp.canAprobar;
            if (emp.canCreateUsers)   datos.canCreateUsers   = emp.canCreateUsers;
            if (emp.canGestionarFestivos) datos.canGestionarFestivos = emp.canGestionarFestivos;
            if (emp.canReporteDiario) datos.canReporteDiario = emp.canReporteDiario;
          }
          await fsUpdate('usuarios', docId, datos);
          if (yaRol && yaDept && !emp.fuentePlantilla) protegidos++;
          else actualizados++;
        } else {
          // Registro masivo en Firebase Auth
          const authRes = await fetch(config.AUTH_SIGNUP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: codeToEmail(emp.codigo), password: emp.password || emp.codigo, returnSecureToken: true })
          });
          const authData = await authRes.json();

          await fsAdd('usuarios', {
            codigo: emp.codigo, nombre: emp.nombre,
            cargo: emp.cargo || 'Empleado',
            departamento: emp.departamento || '',
            rol: emp.rol || 'auxiliar',
            password: emp.password || emp.codigo,
            uid: authData.localId || '',
            dias: emp.dias || '15',
            fechaIngreso: emp.fechaIngreso,
            ultimaAcumulacion: '',
            canAprobar: emp.canAprobar || 'false',
            canCreateUsers: emp.canCreateUsers || 'false',
            canGestionarFestivos: emp.canGestionarFestivos || 'false',
            canReporteDiario: emp.canReporteDiario || 'false',
          }); // Use fsAdd helper
          creados++;
        }
      } catch { errores++; }
      setProgreso({ actual: i+1, total: empleados.length, actualizados, creados, protegidos, errores });
      await new Promise(r => setTimeout(r, 100));
    }
    setResultado({ total: empleados.length, actualizados, creados, protegidos, errores });
  };

  const iniciarPlantillaExcel = async () => {
    setPlantillaCoriendo(true); setPlantillaProgreso(null); setPlantillaResultado(null);
    try {
      if (!DocumentPicker || !FileSystem) {
        Alert.alert('No disponible', 'Esta función requiere el APK compilado o Expo Go.');
        setPlantillaCoriendo(false); return;
      }
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) { setPlantillaCoriendo(false); return; }
      const fileUri = result.assets[0].uri;
      let base64 = '';
      try {
        base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType?.Base64 || 'base64' });
      } catch {
        const FSL = require('expo-file-system/legacy');
        base64 = await FSL.readAsStringAsync(fileUri, { encoding: FSL.EncodingType.Base64 });
      }
      let XLSX;
      try { XLSX = require('xlsx'); } catch { Alert.alert('Error', 'Instala el paquete xlsx: npm install xlsx'); setPlantillaCoriendo(false); return; }
      const workbook = XLSX.read(base64, { type: 'base64' });
      const sheet    = workbook.Sheets['Empleados'] ?? workbook.Sheets[workbook.SheetNames[0]];
      const rows     = XLSX.utils.sheet_to_json(sheet, { defval: '', range: 2 }); // range:2 = leer desde fila 3 (0-indexed)
      const empleados = rows
        .filter(r => r['codigo*'] && String(r['codigo*']).trim() !== '')
        .map(r => ({
          codigo:               String(r['codigo*']).trim(),
          nombre:               String(r['nombre*'] || '').trim(),
          cargo:                String(r['cargo*']  || 'Empleado').trim(),
          departamento:         String(r['sub_departamento'] || r['departamento*'] || '').trim(),
          rol:                  String(r['rol*'] || 'auxiliar').trim(),
          password:             String(r['password*'] || r['codigo*']).trim(),
          fechaIngreso:         normalizarFechaSA(r['fechaIngreso*']) || '',
          dias:                 String(r['dias'] || '15').trim(),
          canAprobar:           String(r['canAprobar'] || 'false').trim(),
          canCreateUsers:       String(r['canCreateUsers'] || 'false').trim(),
          canGestionarFestivos: String(r['canGestionarFestivos'] || 'false').trim(),
          canReporteDiario:     String(r['canReporteDiario'] || 'false').trim(),
          fuentePlantilla:      true,
        }));
      if (empleados.length === 0) { Alert.alert('⚠️ Sin datos', 'No se encontraron empleados. Verifica que uses la plantilla correcta.'); setPlantillaCoriendo(false); return; }
      await procesarEmpleadosSA(empleados, setPlantillaProgreso, setPlantillaResultado);
    } catch(e) { Alert.alert('❌ Error', e.message); }
    setPlantillaCoriendo(false);
  };

  const iniciarSICAFDrive = async () => {
    setPlantillaCoriendo(true); setPlantillaProgreso(null); setPlantillaResultado(null);
    try {
      const empleados = await leerExcelDrive();
      if (empleados.length === 0) { Alert.alert('⚠️ Sin datos', 'No se encontraron empleados.'); setPlantillaCoriendo(false); return; }
      await procesarEmpleadosSA(empleados.map(e => ({ ...e, fuentePlantilla: false })), setPlantillaProgreso, setPlantillaResultado);
    } catch(e) { Alert.alert('❌ Error', e.message); }
    setPlantillaCoriendo(false);
  };

  const renderExcel = () => {
    const pct    = plantillaProgreso ? Math.round((plantillaProgreso.actual / plantillaProgreso.total) * 100) : 0;
    const pctOld = cargaProgreso     ? Math.round((cargaProgreso.actual     / cargaProgreso.total)     * 100) : 0;
    return (
      <ScrollView style={sa.content}>
        <Text style={sa.pageTitle}>📂 Carga Masiva de Empleados</Text>

        {/* ── Selector de modo ── */}
        <View style={{ flexDirection:'row', gap:10, marginBottom:16 }}>
          <TouchableOpacity
            style={{ flex:1, padding:14, borderRadius:14, alignItems:'center', backgroundColor: modoExcelSA==='plantilla' ? ACENTO : '#16213e', borderWidth:2, borderColor: modoExcelSA==='plantilla' ? ACENTO : '#333' }}
            onPress={() => { setModoExcelSA('plantilla'); setPlantillaProgreso(null); setPlantillaResultado(null); }}>
            <Text style={{ fontSize:20 }}>📋</Text>
            <Text style={{ fontWeight:'700', fontSize:12, color:'white', marginTop:4 }}>Plantilla Excel</Text>
            <Text style={{ fontSize:10, color: modoExcelSA==='plantilla' ? 'rgba(255,255,255,0.8)' : '#555', textAlign:'center', marginTop:2 }}>Con roles y departamentos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex:1, padding:14, borderRadius:14, alignItems:'center', backgroundColor: modoExcelSA==='sicaf' ? ACENTO : '#16213e', borderWidth:2, borderColor: modoExcelSA==='sicaf' ? ACENTO : '#333' }}
            onPress={() => { setModoExcelSA('sicaf'); setCargaResultado(null); setCargaProgreso(null); }}>
            <Text style={{ fontSize:20 }}>🏢</Text>
            <Text style={{ fontWeight:'700', fontSize:12, color:'white', marginTop:4 }}>Reporte SICAF</Text>
            <Text style={{ fontSize:10, color: modoExcelSA==='sicaf' ? 'rgba(255,255,255,0.8)' : '#555', textAlign:'center', marginTop:2 }}>Desde Google Drive</Text>
          </TouchableOpacity>
        </View>

        {/* ── Info según modo ── */}
        {modoExcelSA === 'plantilla' ? (
          <View style={[sa.configCard, { borderLeftWidth:4, borderLeftColor: VERDE }]}>
            <Text style={{ fontWeight:'700', color: VERDE, marginBottom:6 }}>✅ Modo Plantilla Excel</Text>
            <Text style={{ fontSize:12, color:'#aaa', lineHeight:18 }}>
              {'• Sube la plantilla con los datos completos\n• Incluye sub-departamento, rol y permisos\n• 🔒 Protege datos existentes si usas SICAF\n• Con plantilla actualiza TODO incluyendo rol'}
            </Text>
          </View>
        ) : (
          <View style={[sa.configCard, { borderLeftWidth:4, borderLeftColor: AMARILLO }]}>
            <Text style={{ fontWeight:'700', color: AMARILLO, marginBottom:6 }}>⚠️ Modo SICAF (Google Drive)</Text>
            <Text style={{ fontSize:12, color:'#aaa', lineHeight:18 }}>
              {'• Lee el reporte de SICAF desde Drive\n• Solo actualiza nombre y fecha de ingreso\n• 🔒 Rol y departamento existentes NO se sobreescriben\n• Empleados nuevos se crean como auxiliar'}
            </Text>
          </View>
        )}

        {/* ── Botón de acción ── */}
        {modoExcelSA === 'plantilla' ? (
          <>
            {!plantillaCoriendo && !plantillaResultado && (
              <>
                <View style={[sa.configCard, { borderLeftWidth: 3, borderLeftColor: AMARILLO, marginBottom: 8 }]}>
                  <Text style={{ color: AMARILLO, fontWeight: '700', fontSize: 12, marginBottom: 4 }}>⚠️ Solo disponible en APK</Text>
                  <Text style={{ color: '#aaa', fontSize: 11, lineHeight: 16 }}>
                    La carga de archivos Excel desde el gestor de archivos requiere el APK compilado o Expo Go.{' '}
                    Desde el navegador web no es posible seleccionar archivos .xlsx locales con esta función.
                  </Text>
                </View>
                <TouchableOpacity style={sa.btnAcceso} onPress={iniciarPlantillaExcel}>
                  <Text style={sa.btnAccesoText}>📁 Seleccionar archivo Excel</Text>
                </TouchableOpacity>
              </>
            )}
            {plantillaCoriendo && (
              <View style={[sa.configCard, { alignItems:'center', gap:10 }]}>
                <ActivityIndicator color={ACENTO} size="large" />
                {plantillaProgreso && (
                  <>
                    <Text style={{ color:'white', fontWeight:'800', fontSize:16 }}>{plantillaProgreso.actual} / {plantillaProgreso.total} — {pct}%</Text>
                    <View style={sa.barBg}><View style={[sa.barFill, { width:`${pct}%`, backgroundColor: ACENTO }]} /></View>
                    <Text style={{ color:'#aaa', textAlign:'center' }}>✅ {plantillaProgreso.actualizados}  🆕 {plantillaProgreso.creados}  🔒 {plantillaProgreso.protegidos ?? 0}  ❌ {plantillaProgreso.errores}</Text>
                  </>
                )}
              </View>
            )}
            {plantillaResultado && (
              <View style={[sa.configCard, { borderLeftWidth:4, borderLeftColor: VERDE }]}>
                <Text style={{ color: VERDE, fontWeight:'800', fontSize:16, marginBottom:12 }}>✅ Carga completada</Text>
                {[
                  { label:'Total procesados', val: plantillaResultado.total,       color:'white'    },
                  { label:'Actualizados',      val: plantillaResultado.actualizados, color: VERDE    },
                  { label:'Creados',           val: plantillaResultado.creados,      color:'#4A9EC4' },
                  { label:'🔒 Protegidos',     val: plantillaResultado.protegidos ?? 0, color: AMARILLO },
                  { label:'Errores',           val: plantillaResultado.errores,      color: ROJO     },
                ].map(r => (
                  <View key={r.label} style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
                    <Text style={{ color:'#aaa', fontSize:13 }}>{r.label}</Text>
                    <Text style={{ color:r.color, fontWeight:'700', fontSize:13 }}>{r.val}</Text>
                  </View>
                ))}
                <TouchableOpacity style={[sa.btnAcceso, { backgroundColor:'#333', marginTop:12 }]} onPress={() => { setPlantillaResultado(null); setPlantillaProgreso(null); }}>
                  <Text style={sa.btnAccesoText}>🔄 Cargar otro archivo</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <>
            {!plantillaCoriendo && !plantillaResultado && (
              <TouchableOpacity style={sa.btnAcceso} onPress={iniciarSICAFDrive}>
                <Text style={sa.btnAccesoText}>▶ Leer SICAF desde Google Drive</Text>
              </TouchableOpacity>
            )}
            {plantillaCoriendo && (
              <View style={[sa.configCard, { alignItems:'center', gap:10 }]}>
                <ActivityIndicator color={ACENTO} size="large" />
                {plantillaProgreso && (
                  <>
                    <Text style={{ color:'white', fontWeight:'800', fontSize:16 }}>{plantillaProgreso.actual} / {plantillaProgreso.total} — {pctOld}%</Text>
                    <View style={sa.barBg}><View style={[sa.barFill, { width:`${pctOld}%`, backgroundColor: ACENTO }]} /></View>
                    <Text style={{ color:'#aaa', textAlign:'center' }}>✅ {plantillaProgreso.actualizados}  🆕 {plantillaProgreso.creados}  🔒 {plantillaProgreso.protegidos ?? 0}  ❌ {plantillaProgreso.errores}</Text>
                  </>
                )}
              </View>
            )}
            {plantillaResultado && (
              <View style={[sa.configCard, { borderLeftWidth:4, borderLeftColor: VERDE }]}>
                <Text style={{ color: VERDE, fontWeight:'800', fontSize:16, marginBottom:12 }}>✅ Carga completada</Text>
                {[
                  { label:'Total',       val: plantillaResultado.total,        color:'white'    },
                  { label:'Actualizados', val: plantillaResultado.actualizados, color: VERDE    },
                  { label:'Creados',     val: plantillaResultado.creados,       color:'#4A9EC4' },
                  { label:'🔒 Protegidos', val: plantillaResultado.protegidos ?? 0, color: AMARILLO },
                  { label:'Errores',     val: plantillaResultado.errores,       color: ROJO     },
                ].map(r => (
                  <View key={r.label} style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
                    <Text style={{ color:'#aaa', fontSize:13 }}>{r.label}</Text>
                    <Text style={{ color:r.color, fontWeight:'700', fontSize:13 }}>{r.val}</Text>
                  </View>
                ))}
                <TouchableOpacity style={[sa.btnAcceso, { backgroundColor:'#333', marginTop:12 }]} onPress={() => { setPlantillaResultado(null); setPlantillaProgreso(null); }}>
                  <Text style={sa.btnAccesoText}>🔄 Ejecutar de nuevo</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    );
  };

  const ModalUsuario = () => (
    <ModalUsuarioExterno
      modalUsuario={modalUsuario}
      setModalUsuario={setModalUsuario}
      guardarUsuario={guardarUsuario}
      resetearDias={resetearDias}
      nuevoUser={nuevoUser}
    />
  );

  const ModalPermiso = () => {
    if (!modalPermiso) return null;
    const colorE = (e) => e==='Aprobado' ? VERDE : e==='Rechazado' ? ROJO : AMARILLO;
    const esHoras = modalPermiso.tipo === 'Horas';

    const Fila = ({ label, valor, colorValor }) => (
      <View style={{ flexDirection:'row', justifyContent:'space-between', paddingVertical:8, borderBottomWidth:1, borderBottomColor:'#1e2d3d' }}>
        <Text style={{ color:'#666', fontSize:12, flex:1 }}>{label}</Text>
        <Text style={{ color: colorValor ?? 'white', fontWeight:'600', fontSize:12, flex:1.2, textAlign:'right' }}>{valor ?? '—'}</Text>
      </View>
    );

    return (
      <Modal visible={!!modalPermiso} animationType="slide" transparent>
        <View style={sa.modalOverlay}>
          <View style={sa.modalCard}>
            <Text style={sa.modalTitulo}>{esHoras ? '⏱️' : '📋'} Detalle del Permiso</Text>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* ── Empleado ── */}
              <Text style={[sa.configLabel, { marginTop: 0, marginBottom: 8, color: '#4A9EC4' }]}>👤 EMPLEADO</Text>
              <Fila label="Nombre"       valor={modalPermiso.nombre} />
              <Fila label="Código"       valor={modalPermiso.codigo} />
              <Fila label="Cargo"        valor={modalPermiso.cargo} />
              <Fila label="Departamento" valor={modalPermiso.departamento} />

              {/* ── Permiso ── */}
              <Text style={[sa.configLabel, { marginTop: 16, marginBottom: 8, color: '#4A9EC4' }]}>📄 PERMISO</Text>
              <Fila label="Tipo"   valor={modalPermiso.tipo} />
              <Fila label="Estado" valor={modalPermiso.estado} colorValor={colorE(modalPermiso.estado)} />
              {!esHoras && <Fila label="Fecha inicio" valor={modalPermiso.fechaInicio} />}
              {!esHoras && <Fila label="Fecha fin"    valor={modalPermiso.fechaFin} />}
              {esHoras  && <Fila label="Fecha"        valor={modalPermiso.fechaInicio} />}
              <Fila label="Motivo" valor={modalPermiso.motivo} />

              {/* ── Aprobación ── */}
              {(modalPermiso.aprobadoPor || modalPermiso.fechaAprobacion) && (
                <>
                  <Text style={[sa.configLabel, { marginTop: 16, marginBottom: 8, color: VERDE }]}>✅ APROBACIÓN</Text>
                  <Fila label="Aprobado por"    valor={modalPermiso.aprobadoPor}   colorValor={VERDE} />
                  <Fila label="Fecha/hora aprobación" valor={modalPermiso.fechaAprobacion} colorValor={VERDE} />
                  {!esHoras && <Fila label="Descuento" valor={modalPermiso.descuento === 'si' ? 'Sí descuenta días' : 'Sin descuento'} />}
                </>
              )}

              {/* ── Control de horas ── */}
              {esHoras && (
                <>
                  <Text style={[sa.configLabel, { marginTop: 16, marginBottom: 8, color: '#E65100' }]}>⏱️ CONTROL DE HORAS</Text>
                  <Fila label="Horas solicitadas" valor={modalPermiso.horasSolicitadas ? `${modalPermiso.horasSolicitadas}h` : null} />
                  <Fila label="Hora de salida"    valor={modalPermiso.horaAprobacion}  colorValor="#4CAF7D" />
                  <Fila label="Hora de regreso"   valor={modalPermiso.horaRegreso || 'Aún no regresa'} colorValor={modalPermiso.horaRegreso ? '#4A9EC4' : AMARILLO} />
                  {modalPermiso.tiempoRealMinutos
                    ? <Fila label="Tiempo real usado" valor={`${modalPermiso.tiempoRealMinutos} min`} />
                    : null}
                  <Fila
                    label="Descuento resuelto"
                    valor={modalPermiso.descuentoResuelto === 'true' ? 'Sí' : 'Pendiente'}
                    colorValor={modalPermiso.descuentoResuelto === 'true' ? VERDE : AMARILLO}
                  />
                  {modalPermiso.descuentoResuelto === 'true' && (
                    <Fila
                      label="Días descontados"
                      valor={
                        modalPermiso.diasDescontados === '0'   ? 'Sin descuento' :
                        modalPermiso.diasDescontados === '0.5' ? '½ día'         : '1 día completo'
                      }
                    />
                  )}
                </>
              )}

              {/* ── Botones ── */}
              {confirmandoEliminar ? (
                <View style={{ backgroundColor: ROJO + '22', borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: ROJO }}>
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 14, textAlign: 'center', marginBottom: 12 }}>¿Confirmar eliminación?</Text>
                  <Text style={{ color: '#aaa', fontSize: 12, textAlign: 'center', marginBottom: 14 }}>Esta acción no se puede deshacer.</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={[sa.btnAcceso, { flex: 1, backgroundColor: ROJO }]} onPress={() => ejecutarEliminarPermiso(modalPermiso.id)}>
                      <Text style={sa.btnAccesoText}>🗑️ Sí, eliminar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[sa.btnAcceso, { flex: 1, backgroundColor: '#333' }]} onPress={() => setConfirmandoEliminar(false)}>
                      <Text style={sa.btnAccesoText}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                  <TouchableOpacity style={[sa.btnAcceso, { flex: 1, backgroundColor: ROJO + '33' }]} onPress={() => setConfirmandoEliminar(true)}>
                    <Text style={[sa.btnAccesoText, { color: ROJO }]}>🗑️ Eliminar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[sa.btnAcceso, { flex: 1, backgroundColor: '#333' }]} onPress={() => { setConfirmandoEliminar(false); setModalPermiso(null); }}>
                    <Text style={sa.btnAccesoText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const ModalResetearDias = () => {
    if (!modalResetear) return null;
    return (
      <Modal visible={!!modalResetear} animationType="fade" transparent>
        <View style={sa.modalOverlay}>
          <View style={[sa.modalCard, { maxHeight: 300 }]}>
            <Text style={sa.modalTitulo}>🔄 Resetear días</Text>
            <Text style={{ color: '#aaa', fontSize: 13, marginBottom: 16 }}>
              Empleado: {modalResetear.nombre}
            </Text>
            <Text style={sa.configLabel}>Nuevos días disponibles</Text>
            <TextInput
              style={sa.input}
              value={diasReset}
              onChangeText={setDiasReset}
              keyboardType="numeric"
              placeholder="Ej: 15"
              placeholderTextColor="#555"
            />
            <TouchableOpacity style={sa.btnAcceso} onPress={confirmarReset}>
              <Text style={sa.btnAccesoText}>✅ Confirmar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[sa.btnAcceso, { backgroundColor: '#333', marginTop: 8 }]}
              onPress={() => setModalResetear(null)}>
              <Text style={sa.btnAccesoText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderMantenimiento = () => (
    <ScrollView style={sa.content}>
      <Text style={sa.pageTitle}>🛠️ Mantenimiento</Text>
      <Text style={sa.sub}>Analiza y limpia datos innecesarios para liberar espacio</Text>

      {!mantAnalisis && !mantAnalizando && (
        <TouchableOpacity style={sa.btnAcceso} onPress={analizarBaseDatos}>
          <Text style={sa.btnAccesoText}>🔍 Analizar base de datos</Text>
        </TouchableOpacity>
      )}

      {mantAnalizando && (
        <View style={[sa.configCard, { alignItems: 'center', gap: 12 }]}>
          <ActivityIndicator color={ACENTO} size="large" />
          <Text style={{ color: 'white' }}>Analizando base de datos...</Text>
        </View>
      )}

      {mantLimpiando && (
        <View style={[sa.configCard, { alignItems: 'center', gap: 12 }]}>
          <ActivityIndicator color={ROJO} size="large" />
          <Text style={{ color: 'white' }}>Eliminando documentos...</Text>
        </View>
      )}

      {mantResultado && (
        <View style={[sa.configCard, { borderLeftWidth: 4, borderLeftColor: VERDE, marginBottom: 16 }]}>
          <Text style={{ color: VERDE, fontWeight: '800', fontSize: 15, marginBottom: 8 }}>✅ Limpieza completada</Text>
          <Text style={{ color: 'white' }}>Eliminados: {mantResultado.eliminados} {mantResultado.descripcion}</Text>
          {mantResultado.errores > 0 && <Text style={{ color: ROJO, marginTop: 4 }}>Errores: {mantResultado.errores}</Text>}
        </View>
      )}

      {mantAnalisis && !mantLimpiando && (
        <>
          <Text style={sa.seccion}>📊 Resumen actual</Text>
          <View style={[sa.configCard, { marginBottom: 12 }]}>
            {[
              { label: 'Total notificaciones',  val: mantAnalisis.notificaciones.total,    color: 'white' },
              { label: 'Notif. +3 meses',       val: mantAnalisis.notificaciones.antiguedad3m, color: mantAnalisis.notificaciones.antiguedad3m > 0 ? AMARILLO : VERDE },
              { label: 'Notif. +6 meses',       val: mantAnalisis.notificaciones.antiguedad6m, color: mantAnalisis.notificaciones.antiguedad6m > 0 ? ROJO : VERDE },
              { label: 'Total permisos',         val: mantAnalisis.permisos.total,          color: 'white' },
              { label: 'Permisos rechazados +1 año', val: mantAnalisis.permisos.rechazados1a, color: mantAnalisis.permisos.rechazados1a > 0 ? AMARILLO : VERDE },
              { label: 'Permisos aprobados +2 años', val: mantAnalisis.permisos.aprobados2a,  color: mantAnalisis.permisos.aprobados2a  > 0 ? AMARILLO : VERDE },
            ].map(r => (
              <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#aaa', fontSize: 13 }}>{r.label}</Text>
                <Text style={{ color: r.color, fontWeight: '700', fontSize: 13 }}>{r.val}</Text>
              </View>
            ))}
          </View>

          <Text style={sa.seccion}>🗑️ Opciones de limpieza</Text>

          {[
            { tipo: 'notif3m', label: '🔔 Notificaciones de más de 3 meses', cant: mantAnalisis.notificaciones.antiguedad3m, color: AMARILLO },
            { tipo: 'notif6m', label: '🔔 Notificaciones de más de 6 meses', cant: mantAnalisis.notificaciones.antiguedad6m, color: ROJO },
            { tipo: 'rech1a',  label: '❌ Permisos rechazados de más de 1 año', cant: mantAnalisis.permisos.rechazados1a, color: AMARILLO },
            { tipo: 'apro2a',  label: '✅ Permisos aprobados de más de 2 años', cant: mantAnalisis.permisos.aprobados2a,  color: AMARILLO },
          ].map(op => (
            <View key={op.tipo} style={[sa.card, { flexDirection: 'row', alignItems: 'center', marginBottom: 10 }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>{op.label}</Text>
                <Text style={{ color: op.cant > 0 ? op.color : VERDE, fontSize: 12, marginTop: 4 }}>
                  {op.cant > 0 ? `${op.cant} documentos a eliminar` : '✓ Sin documentos para limpiar'}
                </Text>
              </View>
              {op.cant > 0 && (
                <TouchableOpacity
                  style={{ backgroundColor: ROJO + '33', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: ROJO }}
                  onPress={() => ejecutarLimpieza(op.tipo)}>
                  <Text style={{ color: ROJO, fontWeight: '700', fontSize: 12 }}>🗑️ Limpiar</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity style={[sa.btnAcceso, { backgroundColor: '#333', marginTop: 8 }]} onPress={analizarBaseDatos}>
            <Text style={sa.btnAccesoText}>🔄 Volver a analizar</Text>
          </TouchableOpacity>
        </>
      )}
      <View style={{ height: 30 }} />
    </ScrollView>
  );

  const renderBackup = () => {
    // Filtrar usuarios del backup según búsqueda
    const usuariosFiltrados = backupCargado
      ? backupCargado.usuarios.filter(u =>
          u.nombre?.toLowerCase().includes(backupBusqueda.toLowerCase()) ||
          u.codigo?.includes(backupBusqueda) ||
          u.departamento?.toLowerCase().includes(backupBusqueda.toLowerCase())
        )
      : [];

    // Permisos del empleado seleccionado
    const permisosEmpleado = backupEmpleado && backupCargado
      ? backupCargado.permisos
          .filter(p => p.codigo === backupEmpleado.codigo)
          .sort((a, b) => {
            try {
              const [d1,m1,y1] = a.fechaInicio.split('/');
              const [d2,m2,y2] = b.fechaInicio.split('/');
              return new Date(Number(y2),Number(m2)-1,Number(d2)) - new Date(Number(y1),Number(m1)-1,Number(d1));
            } catch { return 0; }
          })
      : [];

    const colorE = (e) => e === 'Aprobado' ? VERDE : e === 'Rechazado' ? ROJO : AMARILLO;

    return (
      <ScrollView style={sa.content}>
        <Text style={sa.pageTitle}>💾 Backup</Text>

        {/* ── SECCIÓN GENERAR ── */}
        <Text style={sa.seccion}>📤 Generar backup</Text>
        <View style={sa.configCard}>
          <Text style={sa.configLabel}>📦 Qué incluye</Text>
          {['👥 Usuarios (sin contraseñas)', '📋 Historial completo de permisos', '🔔 Notificaciones', '🎉 Días festivos'].map(item => (
            <Text key={item} style={{ color: '#aaa', fontSize: 12, marginTop: 5 }}>{item}</Text>
          ))}
        </View>

        {backupResultado && (
          <View style={[sa.configCard, { borderLeftWidth: 4, borderLeftColor: VERDE }]}>
            <Text style={{ color: VERDE, fontWeight: '800', fontSize: 14, marginBottom: 8 }}>✅ Backup generado</Text>
            {[
              { label: 'Archivo',   val: backupResultado.filename },
              { label: 'Registros', val: String(backupResultado.totalRegistros) },
              { label: 'Tamaño',    val: `~${backupResultado.tamañoKB} KB` },
              { label: 'Generado',  val: backupResultado.fecha },
            ].map(r => (
              <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text style={{ color: '#aaa', fontSize: 12 }}>{r.label}</Text>
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 12, flex: 1, textAlign: 'right' }}>{r.val}</Text>
              </View>
            ))}
          </View>
        )}

        {backupGenerando
          ? <View style={[sa.configCard, { alignItems: 'center', gap: 10 }]}>
              <ActivityIndicator color={ACENTO} size="large" />
              <Text style={{ color: 'white' }}>Generando backup...</Text>
            </View>
          : <TouchableOpacity style={sa.btnAcceso} onPress={generarBackup}>
              <Text style={sa.btnAccesoText}>💾 Generar y descargar backup</Text>
            </TouchableOpacity>
        }

        {/* ── SECCIÓN VISOR ── */}
        <Text style={[sa.seccion, { marginTop: 20 }]}>🔍 Consultar backup guardado</Text>
        <Text style={{ color: '#666', fontSize: 12, marginBottom: 12 }}>
          Carga un archivo de backup para consultar el historial de cualquier empleado
        </Text>

        {backupCargando
          ? <View style={[sa.configCard, { alignItems: 'center', gap: 10 }]}>
              <ActivityIndicator color={ACENTO} />
              <Text style={{ color: 'white' }}>Leyendo archivo...</Text>
            </View>
          : <TouchableOpacity style={[sa.btnAcceso, { backgroundColor: '#16213e', borderWidth: 1, borderColor: '#333' }]} onPress={cargarArchivoBackup}>
              <Text style={sa.btnAccesoText}>📂 Cargar archivo de backup</Text>
            </TouchableOpacity>
        }

        {backupCargado && (
          <>
            {/* Info del backup cargado */}
            <View style={[sa.configCard, { borderLeftWidth: 4, borderLeftColor: '#4A9EC4', marginTop: 12 }]}>
              <Text style={{ color: '#4A9EC4', fontWeight: '700', fontSize: 13, marginBottom: 6 }}>
                📅 Backup del {backupCargado.metadata.fechaLegible}
              </Text>
              <Text style={{ color: '#aaa', fontSize: 11 }}>
                {backupCargado.metadata.totalUsuarios} usuarios · {backupCargado.metadata.totalPermisos} permisos · {backupCargado.metadata.totalNotificaciones} notificaciones
              </Text>
            </View>

            {/* Buscador */}
            <View style={[sa.searchRow, { paddingHorizontal: 0, marginBottom: 8 }]}>
              <TextInput
                style={[sa.searchInput, { flex: 1 }]}
                placeholder="🔍 Buscar empleado por nombre, código o departamento..."
                placeholderTextColor="#555"
                value={backupBusqueda}
                onChangeText={v => { setBackupBusqueda(v); setBackupEmpleado(null); }}
              />
            </View>

            {/* Lista de resultados */}
            {backupBusqueda.length > 0 && !backupEmpleado && (
              <>
                {usuariosFiltrados.length === 0
                  ? <View style={[sa.configCard, { alignItems: 'center' }]}>
                      <Text style={{ color: '#666' }}>No se encontró ningún empleado</Text>
                    </View>
                  : usuariosFiltrados.slice(0, 10).map(u => (
                    <TouchableOpacity key={u.id || u.codigo} style={sa.card} onPress={() => setBackupEmpleado(u)}>
                      <View style={sa.cardAvatar}>
                        <Text style={sa.cardAvatarText}>{u.nombre?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={sa.cardNombre}>{u.nombre}</Text>
                        <Text style={sa.cardSub}>{u.codigo} · {u.departamento} · {u.rol}</Text>
                      </View>
                      <View style={[sa.pill, { backgroundColor: VERDE + '20' }]}>
                        <Text style={[sa.pillText, { color: VERDE }]}>{u.dias ?? 0} días</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                }
              </>
            )}

            {/* Detalle del empleado seleccionado */}
            {backupEmpleado && (
              <>
                <TouchableOpacity onPress={() => setBackupEmpleado(null)} style={{ marginBottom: 10 }}>
                  <Text style={{ color: ACENTO, fontWeight: '700' }}>← Volver a resultados</Text>
                </TouchableOpacity>

                {/* Card del empleado */}
                <View style={[sa.configCard, { borderLeftWidth: 4, borderLeftColor: ACENTO }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <View style={sa.cardAvatar}>
                      <Text style={sa.cardAvatarText}>{backupEmpleado.nombre?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: 'white', fontWeight: '800', fontSize: 15 }}>{backupEmpleado.nombre}</Text>
                      <Text style={{ color: '#aaa', fontSize: 12 }}>{backupEmpleado.cargo} · {backupEmpleado.codigo}</Text>
                      <Text style={{ color: '#aaa', fontSize: 12 }}>📁 {backupEmpleado.departamento}</Text>
                    </View>
                  </View>

                  {/* Días disponibles en esa fecha */}
                  <View style={{ backgroundColor: '#0d1117', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                    <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>
                      Días disponibles al {backupCargado.metadata.fechaLegible}
                    </Text>
                    <Text style={{ color: VERDE, fontWeight: '900', fontSize: 28 }}>
                      {backupEmpleado.dias ?? 0} días
                    </Text>
                    <Text style={{ color: '#555', fontSize: 10, marginTop: 2 }}>
                      Fecha ingreso: {backupEmpleado.fechaIngreso || 'No registrada'} · Última acumulación: {backupEmpleado.ultimaAcumulacion || 'Pendiente'}
                    </Text>
                  </View>
                </View>

                {/* Historial de permisos */}
                <Text style={[sa.seccion, { marginTop: 8 }]}>
                  📋 Historial de permisos ({permisosEmpleado.length})
                </Text>

                {permisosEmpleado.length === 0
                  ? <View style={[sa.configCard, { alignItems: 'center' }]}>
                      <Text style={{ color: '#666' }}>Este empleado no tiene permisos registrados</Text>
                    </View>
                  : permisosEmpleado.map((p, i) => (
                    <View key={p.id || i} style={[sa.card, { flexDirection: 'column', marginBottom: 10, borderLeftWidth: 3, borderLeftColor: colorE(p.estado) }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>{p.tipo}</Text>
                        <View style={{ backgroundColor: colorE(p.estado) + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                          <Text style={{ color: colorE(p.estado), fontWeight: '700', fontSize: 11 }}>{p.estado}</Text>
                        </View>
                      </View>
                      <Text style={{ color: '#aaa', fontSize: 12 }}>📅 {p.fechaInicio} → {p.fechaFin}</Text>
                      <Text style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>💬 {p.motivo}</Text>
                      {p.descuento === 'si' && (
                        <Text style={{ color: ROJO, fontSize: 11, marginTop: 4 }}>⚠️ Descontó días de vacaciones</Text>
                      )}
                    </View>
                  ))
                }
              </>
            )}

            <TouchableOpacity
              style={[sa.btnAcceso, { backgroundColor: '#333', marginTop: 12 }]}
              onPress={() => { setBackupCargado(null); setBackupBusqueda(''); setBackupEmpleado(null); }}>
              <Text style={sa.btnAccesoText}>✕ Cerrar backup cargado</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    );
  };


  const buscarLogs = async () => {
    if (!bitDesde && !bitHasta) {
      Alert.alert('⚠️', 'Selecciona al menos una fecha para buscar'); return;
    }
    setBitCargando(true); setBitLogs([]); setBitBuscado(false); setBitHayMas(false);

    try {
      // Construir rango de timestamps
      const parseFecha = (str, esHasta) => {
        const p = str?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!p) return null;
        const d = new Date(Number(p[3]), Number(p[2])-1, Number(p[1]));
        if (esHasta) d.setHours(23, 59, 59, 999);
        return d.getTime();
      };
      const tsDesde = bitDesde ? parseFecha(bitDesde, false) : null;
      const tsHasta = bitHasta ? parseFecha(bitHasta, true)  : null;

      // Traer logs — Firestore REST no soporta orderBy + range fácil, traemos y filtramos
      const url = `${config.DB_URL}/bitacora?key=${config.FIREBASE_API_KEY}&pageSize=300`;
      const res  = await fetch(url);
      const data = await res.json();

      if (!data.documents) { setBitLogs([]); setBitBuscado(true); setBitCargando(false); return; }

      let logs = data.documents.map(doc => {
        const f = doc.fields || {};
        return {
          id:        doc.name.split('/').pop(),
          accion:    f.accion?.stringValue    ?? '',
          detalle:   f.detalle?.stringValue   ?? '',
          usuario:   f.usuario?.stringValue   ?? '',
          fecha:     f.fecha?.stringValue     ?? '',
          hora:      f.hora?.stringValue      ?? '',
          timestamp: Number(f.timestamp?.stringValue ?? 0),
        };
      });

      // Filtrar por rango de fechas
      if (tsDesde) logs = logs.filter(l => l.timestamp >= tsDesde);
      if (tsHasta) logs = logs.filter(l => l.timestamp <= tsHasta);

      // Filtrar por usuario SA
      if (bitUsuario !== 'Todos') logs = logs.filter(l => l.usuario === bitUsuario);

      // Filtrar por tipo de acción
      if (bitAccion !== 'Todos') logs = logs.filter(l => l.accion === bitAccion);

      // Ordenar más recientes primero
      logs.sort((a, b) => b.timestamp - a.timestamp);

      setBitHayMas(logs.length > 100);
      setBitLogs(logs.slice(0, 100));
      setBitBuscado(true);
    } catch(e) { Alert.alert('Error', e.message); }
    setBitCargando(false);
  };

  const autoFmtBit = (t) => {
    const n = t.replace(/\D/g, '').slice(0, 8);
    if (n.length <= 2) return n;
    if (n.length <= 4) return `${n.slice(0,2)}/${n.slice(2)}`;
    return `${n.slice(0,2)}/${n.slice(2,4)}/${n.slice(4)}`;
  };

  const ACCIONES_BIT = ['Todos', 'Login', 'Usuario creado', 'Usuario editado', 'Permiso eliminado', 'Días reseteados', 'Backup generado', 'Contraseña cambiada', 'Admin SA creado'];
  const COLOR_ACCION = (a) => {
    if (a === 'Login')               return '#4A9EC4';
    if (a === 'Usuario creado')      return VERDE;
    if (a === 'Usuario editado')     return AMARILLO;
    if (a === 'Permiso eliminado')   return ROJO;
    if (a === 'Días reseteados')     return AMARILLO;
    if (a === 'Backup generado')     return '#7C4DCC';
    if (a === 'Contraseña cambiada') return ROJO;
    if (a === 'Admin SA creado')     return VERDE;
    return '#aaa';
  };

  const renderBitacora = () => (
    <ScrollView style={sa.content}>
      <Text style={sa.pageTitle}>📋 Bitácora</Text>
      <Text style={{ color: '#666', fontSize: 12, marginBottom: 16 }}>
        Los registros solo se cargan cuando presionás Buscar. Máximo 100 resultados por búsqueda.
      </Text>

      {/* ── Filtros ── */}
      <View style={sa.configCard}>
        <Text style={[sa.configLabel, { color: ACENTO, marginBottom: 12 }]}>🔍 Filtros de búsqueda</Text>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={sa.configLabel}>📅 Desde</Text>
            <TextInput style={[sa.input, { marginBottom: 0 }]} placeholder="DD/MM/AAAA"
              placeholderTextColor="#555" value={bitDesde}
              onChangeText={t => setBitDesde(autoFmtBit(t))} keyboardType="numeric" maxLength={10} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={sa.configLabel}>📅 Hasta</Text>
            <TextInput style={[sa.input, { marginBottom: 0 }]} placeholder="DD/MM/AAAA"
              placeholderTextColor="#555" value={bitHasta}
              onChangeText={t => setBitHasta(autoFmtBit(t))} keyboardType="numeric" maxLength={10} />
          </View>
        </View>

        <Text style={sa.configLabel}>👤 Usuario SA</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {['Todos', ...adminsSA.map(a => a.usuario)].map(u => (
            <TouchableOpacity key={u}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                backgroundColor: bitUsuario === u ? ACENTO : '#1e2d3d',
                borderWidth: 1, borderColor: bitUsuario === u ? ACENTO : '#333' }}
              onPress={() => setBitUsuario(u)}>
              <Text style={{ color: bitUsuario === u ? 'white' : '#aaa', fontWeight: '700', fontSize: 12 }}>{u}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={sa.configLabel}>⚡ Tipo de acción</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {ACCIONES_BIT.map(a => (
            <TouchableOpacity key={a}
              style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
                backgroundColor: bitAccion === a ? COLOR_ACCION(a) + '33' : '#1e2d3d',
                borderWidth: 1, borderColor: bitAccion === a ? COLOR_ACCION(a) : '#333' }}
              onPress={() => setBitAccion(a)}>
              <Text style={{ color: bitAccion === a ? COLOR_ACCION(a) : '#aaa', fontWeight: '700', fontSize: 11 }}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {bitCargando
          ? <ActivityIndicator color={ACENTO} />
          : <TouchableOpacity style={sa.btnAcceso} onPress={buscarLogs}>
              <Text style={sa.btnAccesoText}>🔍 Buscar registros</Text>
            </TouchableOpacity>
        }

        {(bitDesde || bitHasta) && (
          <TouchableOpacity style={[sa.btnAcceso, { backgroundColor: '#333', marginTop: 8 }]}
            onPress={() => { setBitDesde(''); setBitHasta(''); setBitUsuario('Todos'); setBitAccion('Todos'); setBitLogs([]); setBitBuscado(false); }}>
            <Text style={sa.btnAccesoText}>✕ Limpiar filtros</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Resultados ── */}
      {bitBuscado && (
        <>
          <Text style={sa.seccion}>
            {bitLogs.length === 0 ? 'Sin resultados' : `${bitLogs.length} registro(s)${bitHayMas ? ' (mostrando primeros 100)' : ''}`}
          </Text>

          {bitLogs.length === 0
            ? <View style={[sa.configCard, { alignItems: 'center' }]}>
                <Text style={{ color: '#666' }}>No se encontraron registros con esos filtros.</Text>
              </View>
            : bitLogs.map(log => (
              <View key={log.id} style={[sa.card, { flexDirection: 'column', borderLeftWidth: 3, borderLeftColor: COLOR_ACCION(log.accion) }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <View style={{ backgroundColor: COLOR_ACCION(log.accion) + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                    <Text style={{ color: COLOR_ACCION(log.accion), fontWeight: '700', fontSize: 11 }}>{log.accion}</Text>
                  </View>
                  <Text style={{ color: '#555', fontSize: 11 }}>{log.fecha} {log.hora}</Text>
                </View>
                <Text style={{ color: 'white', fontSize: 13, marginBottom: 2 }}>{log.detalle}</Text>
                <Text style={{ color: '#666', fontSize: 11 }}>👤 {log.usuario}</Text>
              </View>
            ))
          }

          {bitHayMas && (
            <View style={[sa.configCard, { borderLeftWidth: 3, borderLeftColor: AMARILLO }]}>
              <Text style={{ color: AMARILLO, fontWeight: '700', fontSize: 13 }}>⚠️ Hay más de 100 registros</Text>
              <Text style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
                Reducí el rango de fechas para ver resultados más específicos.
              </Text>
            </View>
          )}
        </>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );

  const crearAdminSA = async () => {
    if (!nuevoAdminUser.trim() || !nuevoAdminPass.trim()) {
      Alert.alert('Error', 'Completa usuario y contraseña'); return;
    }
    if (nuevoAdminPass.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres'); return;
    }
    const yaExiste = adminsSA.find(a => a.usuario.toUpperCase() === nuevoAdminUser.trim().toUpperCase());
    if (yaExiste) { Alert.alert('Error', 'Ya existe un administrador con ese usuario'); return; }
    setAdminGuardando(true);
    try {
      const res = await fetch(`${config.DB_URL}/superadmins?key=${config.FIREBASE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: {
          usuario:  { stringValue: nuevoAdminUser.trim().toUpperCase() },
          password: { stringValue: nuevoAdminPass.trim() },
        }})
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const newId = data.name.split('/').pop();
      const newAdmin = { id: newId, usuario: nuevoAdminUser.trim().toUpperCase(), password: nuevoAdminPass.trim() };
      setAdminsSA(prev => [...prev, newAdmin]);
      setNuevoAdminUser(''); setNuevoAdminPass('');
      fsLog('Admin SA creado', `Creó nuevo administrador: ${newAdmin.usuario}`, saActual, config.FIREBASE_API_KEY, config.DB_URL);
      Alert.alert('✅', 'Administrador creado exitosamente');
    } catch (e) { Alert.alert('Error', e.message); }
    setAdminGuardando(false);
  };

  const eliminarAdminSA = (admin) => {
    if (admin.usuario.toUpperCase() === saActual.toUpperCase()) {
      Alert.alert('Error', 'No puedes eliminar tu propio usuario'); return;
    }
    Alert.alert('⚠️ Confirmar', `¿Eliminar al administrador "${admin.usuario}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          await fetch(`${config.DB_URL}/superadmins/${admin.id}?key=${config.FIREBASE_API_KEY}`, { method: 'DELETE' });
          setAdminsSA(prev => prev.filter(a => a.id !== admin.id));
        } catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const renderSeguridad = () => (
    <ScrollView style={sa.content}>
      <Text style={sa.pageTitle}>🔒 Seguridad</Text>

      {/* ── Administradores SA ── */}
      <Text style={sa.seccion}>👤 Administradores SuperAdmin</Text>
      <Text style={{ color: '#666', fontSize: 12, marginBottom: 12 }}>
        Sesión activa: <Text style={{ color: ACENTO, fontWeight: '700' }}>{saActual}</Text>
      </Text>

      {adminsSA.map(a => (
        <View key={a.id} style={[sa.card, { alignItems: 'center' }]}>
          <View style={[sa.cardAvatar, { backgroundColor: a.usuario === saActual ? ACENTO + '33' : '#333' }]}>
            <Text style={[sa.cardAvatarText, { color: a.usuario === saActual ? ACENTO : '#aaa' }]}>
              {a.usuario.slice(0, 2)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={sa.cardNombre}>{a.usuario}</Text>
            {a.usuario.toUpperCase() === saActual.toUpperCase() && (
              <Text style={{ color: ACENTO, fontSize: 11 }}>● Sesión activa</Text>
            )}
          </View>
          {a.usuario.toUpperCase() !== saActual.toUpperCase() && (
            <TouchableOpacity
              style={{ backgroundColor: ROJO + '22', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: ROJO }}
              onPress={() => eliminarAdminSA(a)}>
              <Text style={{ color: ROJO, fontWeight: '700', fontSize: 12 }}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <View style={sa.configCard}>
        <Text style={[sa.configLabel, { color: VERDE }]}>➕ Nuevo administrador</Text>
        <Text style={sa.configLabel}>Usuario</Text>
        <TextInput style={sa.input} value={nuevoAdminUser} onChangeText={v => setNuevoAdminUser(v.toUpperCase())}
          placeholder="Ej: IT_ADMIN" placeholderTextColor="#555" autoCapitalize="characters" />
        <Text style={sa.configLabel}>Contraseña</Text>
        <TextInput style={sa.input} value={nuevoAdminPass} onChangeText={setNuevoAdminPass}
          placeholder="Mínimo 6 caracteres" placeholderTextColor="#555" secureTextEntry />
        {adminGuardando
          ? <ActivityIndicator color={VERDE} style={{ marginTop: 8 }} />
          : <TouchableOpacity style={[sa.btnAcceso, { backgroundColor: VERDE }]} onPress={crearAdminSA}>
              <Text style={sa.btnAccesoText}>➕ Crear administrador</Text>
            </TouchableOpacity>
        }
      </View>

      {/* ── Cambiar mi contraseña ── */}
      <Text style={sa.seccion}>🔑 Cambiar mi contraseña</Text>

      {passExito && (
        <View style={{ backgroundColor: VERDE + '22', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: VERDE, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 20 }}>✅</Text>
          <View>
            <Text style={{ color: VERDE, fontWeight: '700', fontSize: 14 }}>Contraseña actualizada</Text>
            <Text style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>El cambio ya aplica en todos los dispositivos.</Text>
          </View>
        </View>
      )}

      <View style={sa.configCard}>
        <Text style={sa.configLabel}>🔑 Contraseña actual</Text>
        <TextInput style={sa.input} value={passActual} onChangeText={setPassActual}
          secureTextEntry placeholder="Ingresa tu contraseña actual" placeholderTextColor="#555" />
        <Text style={[sa.configLabel, { marginTop: 8 }]}>🆕 Nueva contraseña</Text>
        <TextInput style={sa.input} value={passNueva} onChangeText={setPassNueva}
          secureTextEntry placeholder="Mínimo 6 caracteres" placeholderTextColor="#555" />
        <Text style={[sa.configLabel, { marginTop: 8 }]}>🔁 Confirmar nueva contraseña</Text>
        <TextInput
          style={[sa.input, passConfirm && passNueva && passConfirm !== passNueva && { borderColor: ROJO }]}
          value={passConfirm} onChangeText={setPassConfirm}
          secureTextEntry placeholder="Repite la nueva contraseña" placeholderTextColor="#555" />
        {passConfirm && passNueva && passConfirm !== passNueva && (
          <Text style={{ color: ROJO, fontSize: 11, marginBottom: 8, marginTop: -8 }}>⚠️ Las contraseñas no coinciden</Text>
        )}
        {passGuardando
          ? <ActivityIndicator color={ACENTO} style={{ marginTop: 12 }} />
          : <TouchableOpacity style={[sa.btnAcceso, { marginTop: 8 }]} onPress={handleCambiarPassword}>
              <Text style={sa.btnAccesoText}>💾 Guardar nueva contraseña</Text>
            </TouchableOpacity>
        }
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={sa.appContainer}>
      <StatusBar barStyle="light-content" backgroundColor={AZUL} />
      <View style={sa.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 20 }}>🛡️</Text>
          <View>
            <Text style={sa.headerTitle}>SuperAdmin</Text>
            <Text style={sa.headerSub}>Comercios Universales</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onSalir} style={sa.btnSalir}>
          <Text style={{ color: '#aaa', fontSize: 12, fontWeight: '700' }}>Salir ×</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {/* Overlay de carga para evitar renderizados incompletos */}
        {cargando && (
          <View style={{ position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(13,17,23,0.7)', justifyContent:'center', alignItems:'center', zIndex:999 }}>
            <ActivityIndicator size="large" color={ACENTO} />
            <Text style={{ color:'white', marginTop:12, fontSize:12, fontWeight:'600' }}>Sincronizando datos...</Text>
          </View>
        )}

        {tabActivo === 'stats'         && renderStats()}
        {tabActivo === 'usuarios'      && renderUsuarios()}
        {tabActivo === 'permisos'      && renderPermisos()}
        {tabActivo === 'config'        && renderConfig()}
        {tabActivo === 'excel'         && renderExcel()}
        {tabActivo === 'mantenimiento' && renderMantenimiento()}
        {tabActivo === 'backup'        && renderBackup()}
        {tabActivo === 'bitacora'     && renderBitacora()}
        {tabActivo === 'seguridad'     && renderSeguridad()}
      </View>

      <View style={sa.bottomNav}>
        {TABS_SA.map(t => (
          <TouchableOpacity key={t.key} style={sa.navItem} onPress={() => setTabActivo(t.key)}>
            <View style={[sa.navIconBox, tabActivo === t.key && sa.navIconBoxActivo]}>
              <Text style={{ fontSize: 16 }}>{t.icon}</Text>
            </View>
            <Text style={[sa.navLabel, tabActivo === t.key && sa.navLabelActivo]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ModalUsuario />
      <ModalPermiso />
      <ModalResetearDias />
    </SafeAreaView>
  );
}

const sa = StyleSheet.create({
  loginBg:         { flex: 1, backgroundColor: AZUL },
  loginCenter:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loginIconBox:    { width: 80, height: 80, borderRadius: 40, backgroundColor: ACENTO + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: ACENTO },
  loginTitulo:     { fontSize: 26, fontWeight: '900', color: 'white', marginBottom: 4 },
  loginSub:        { fontSize: 13, color: '#666', marginBottom: 32 },
  input:           { backgroundColor: '#0f3460', borderRadius: 12, padding: 14, fontSize: 14, color: 'white', marginBottom: 12, borderWidth: 1, borderColor: '#1a4a7a', width: '100%' },
  btnAcceso:       { backgroundColor: ACENTO, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  btnAccesoText:   { color: 'white', fontWeight: '700', fontSize: 14 },
  appContainer:    { flex: 1, backgroundColor: '#0d1117' },
  header:          { backgroundColor: AZUL, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: Platform.OS === 'android' ? 12 : 8, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#16213e' },
  headerTitle:     { color: 'white', fontWeight: '800', fontSize: 15 },
  headerSub:       { color: '#666', fontSize: 11 },
  btnSalir:        { backgroundColor: '#1a1a2e', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#333' },
  content:         { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  pageTitle:       { fontSize: 20, fontWeight: '800', color: 'white', marginBottom: 16 },
  seccion:         { fontSize: 14, fontWeight: '700', color: '#aaa', marginTop: 20, marginBottom: 10 },
  statsGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statCard:        { backgroundColor: '#16213e', borderRadius: 12, padding: 14, width: '30%', alignItems: 'center', borderTopWidth: 3, flex: 1 },
  statVal:         { fontSize: 22, fontWeight: '900', color: 'white' },
  statLbl:         { fontSize: 10, color: '#666', marginTop: 4, textAlign: 'center' },
  barRow:          { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  barLabel:        { color: '#aaa', fontSize: 11, width: 90 },
  barBg:           { flex: 1, height: 8, backgroundColor: '#1a2a3a', borderRadius: 4 },
  barFill:         { height: 8, backgroundColor: '#4A9EC4', borderRadius: 4 },
  barVal:          { color: 'white', fontSize: 11, fontWeight: '700', width: 28, textAlign: 'right' },
  btnRefresh:      { backgroundColor: '#16213e', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 16, borderWidth: 1, borderColor: '#333' },
  btnRefreshText:  { color: '#aaa', fontWeight: '700', fontSize: 13 },
  searchRow:       { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#0d1117' },
  searchInput:     { flex: 1, backgroundColor: '#16213e', borderRadius: 12, padding: 12, color: 'white', fontSize: 13, borderWidth: 1, borderColor: '#333' },
  btnNuevo:        { backgroundColor: ACENTO, borderRadius: 12, width: 44, alignItems: 'center', justifyContent: 'center' },
  card:            { backgroundColor: '#16213e', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12, borderWidth: 1, borderColor: '#1e2d3d' },
  cardAvatar:      { width: 40, height: 40, borderRadius: 20, backgroundColor: ACENTO + '33', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: ACENTO },
  cardAvatarText:  { color: ACENTO, fontWeight: '800', fontSize: 13 },
  cardNombre:      { color: 'white', fontWeight: '700', fontSize: 13 },
  cardSub:         { color: '#666', fontSize: 11, marginTop: 2 },
  pill:            { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillText:        { fontSize: 11, fontWeight: '700' },
  configCard:      { backgroundColor: '#16213e', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1e2d3d' },
  configLabel:     { color: '#aaa', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  configDesc:      { color: '#666', fontSize: 11, marginBottom: 12 },
  btnReset:        { backgroundColor: AMARILLO + '22', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: AMARILLO },
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard:       { backgroundColor: '#16213e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%', borderWidth: 1, borderColor: '#1e2d3d' },
  modalTitulo:     { color: 'white', fontSize: 18, fontWeight: '800', marginBottom: 20 },
  bottomNav:       { backgroundColor: AZUL, flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#16213e', paddingBottom: Platform.OS === 'ios' ? 4 : 8, paddingTop: 8 },
  navItem:         { flex: 1, alignItems: 'center', gap: 4 },
  navIconBox:      { width: 40, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navIconBoxActivo:{ backgroundColor: ACENTO + '33' }, // Use ACENTO constant
  navLabel:        { fontSize: 10, color: '#555', fontWeight: '600' },
  navLabelActivo:  { color: ACENTO },
});