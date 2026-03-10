import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, SafeAreaView,
  StatusBar, Platform, Modal
} from 'react-native';

const PROJECT_ID = 'permisoapplorenti';
const API_KEY    = 'AIzaSyCu8hGmT1NYWipG4pPO-QVfI_tXzRxs1eg';
const DB_URL     = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ─── Credenciales superadmin ──────────────────────────────────────────────────
const SA_USER = 'SUPERADMIN';
const SA_PASS = 'CU@dm1n2024!';

// ─── Google Drive / Sheets ────────────────────────────────────────────────────
const DRIVE_API_KEY = 'AIzaSyD39TKa2k47Ft6I2IlxhFyBUSkQQLjTQww';
const SHEET_ID      = '1oFv182U_QA7dbGQJBq3PADwUHCfZVD3KgBrstYyVDFo';
const SHEETS_URL    = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1?key=${DRIVE_API_KEY}`;

const AZUL     = '#1a1a2e';
const ACENTO   = '#e94560';
const VERDE    = '#4CAF7D';
const AMARILLO = '#F59E0B';
const ROJO     = '#EF5350';

const FECHAS_INGRESO_EXCEL = {
  "861": "01/11/2019","938": "01/05/2022","1005": "01/07/2023","1035": "09/01/2024",
  "1036": "05/01/2024","1053": "01/06/2024","1057": "22/07/2024","1089": "01/06/2025",
  "1090": "01/06/2025","1091": "01/06/2025","1104": "04/09/2025","1105": "04/09/2025",
  "1115": "07/11/2025","1117": "01/11/2025","1131": "01/02/2026","937": "07/03/2022",
  "943": "01/05/2022","948": "01/05/2022","949": "01/05/2022","950": "01/05/2022",
  "953": "01/05/2022","955": "01/05/2022","1061": "11/09/2024","1120": "21/11/2025",
  "789": "01/12/2016","982": "10/02/2023","1079": "05/03/2025","1087": "01/05/2025",
  "1097": "11/08/2025","920": "28/07/2021","935": "14/02/2022","705": "01/08/2014",
  "1018": "16/08/2023","1033": "05/12/2023","1046": "01/03/2024","1055": "11/07/2024",
  "1056": "22/07/2024","1059": "01/08/2024","1062": "07/10/2024","1074": "01/12/2024",
  "1078": "01/02/2025","1082": "22/03/2025","1086": "02/05/2025","1110": "13/10/2025",
  "1126": "19/01/2026","1130": "09/02/2026","505": "01/12/2012","731": "20/04/2015",
  "778": "14/10/2016","804": "08/05/2018","807": "01/10/2018","827": "01/11/2019",
  "830": "01/11/2019","894": "04/11/2020","904": "19/01/2021","905": "01/02/2021",
  "917": "10/05/2021","930": "03/01/2022","996": "16/05/2023","1044": "26/02/2024",
  "1080": "13/03/2025","1113": "04/11/2025","1125": "12/01/2026","697": "19/05/2014",
  "814": "06/11/2018","833": "01/11/2019","834": "01/11/2019","882": "13/07/2020",
  "941": "01/05/2022","995": "03/05/2023","1000": "09/06/2023","1006": "01/07/2023",
  "1007": "24/07/2023","1010": "21/07/2023","1022": "06/10/2023","1023": "04/10/2023",
  "1024": "02/10/2023","1025": "23/10/2023","1034": "13/12/2023","1040": "16/02/2024",
  "1042": "16/02/2024","1047": "01/03/2024","1049": "15/04/2024","1052": "27/05/2024",
  "1058": "06/08/2024","1063": "07/10/2024","1064": "07/10/2024","1067": "16/10/2024",
  "1068": "17/10/2024","1071": "07/11/2024","1075": "16/01/2025","1076": "16/01/2025",
  "1083": "05/04/2025","1084": "04/04/2025","1085": "21/04/2025","1088": "21/05/2025",
  "1092": "23/06/2025","1093": "04/07/2025","1094": "04/07/2025","1095": "24/07/2025",
  "1096": "16/07/2025","1098": "11/08/2025","1099": "11/08/2025","1100": "01/08/2025",
  "1101": "07/08/2025","1102": "04/09/2025","1103": "04/09/2025","1106": "25/09/2025",
  "1107": "25/09/2025","1108": "25/09/2025","1109": "09/10/2025","1111": "16/10/2025",
  "1112": "16/10/2025","1114": "03/11/2025","1116": "10/11/2025","1121": "01/12/2025",
  "1122": "01/12/2025","1123": "03/12/2025","1124": "06/12/2025","1129": "01/02/2026",
  "784": "26/10/2016","821": "01/03/2019","839": "01/11/2019","842": "01/11/2019",
  "856": "01/11/2019","867": "08/01/2020","880": "08/06/2020","884": "03/08/2020",
  "887": "21/09/2020","893": "03/11/2020","897": "21/11/2020","903": "01/01/2021",
  "910": "16/02/2021","921": "04/08/2021","928": "24/11/2021","931": "04/01/2022",
  "944": "01/05/2022","952": "01/05/2022","977": "17/12/2022","979": "16/01/2023",
  "983": "16/02/2023","987": "16/03/2023","992": "17/04/2023","783": "19/10/2016",
  "947": "01/05/2022","1045": "21/02/2024","1081": "25/03/2025","1118": "01/11/2025",
  "723": "01/02/2015","773": "01/08/2016","803": "01/03/2018","902": "08/01/2021",
  "915": "16/04/2021","939": "01/05/2022"
};

// ─── Firestore helpers ────────────────────────────────────────────────────────
const fsGetAll = async (col) => {
  try {
    const res  = await fetch(`${DB_URL}/${col}?key=${API_KEY}&pageSize=300`);
    const data = await res.json();
    if (!data.documents) return [];
    return data.documents.map(doc => {
      const id  = doc.name.split('/').pop();
      const f   = doc.fields;
      const obj = { id };
      for (const k in f) obj[k] = f[k].stringValue ?? f[k].integerValue ?? f[k].doubleValue ?? '';
      return obj;
    });
  } catch { return []; }
};

const fsUpdate = async (col, docId, datos) => {
  const fields = {};
  for (const k in datos) fields[k] = { stringValue: String(datos[k]) };
  const mask = Object.keys(datos).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const res  = await fetch(`${DB_URL}/${col}/${docId}?${mask}&key=${API_KEY}`, {
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
  const res  = await fetch(`${DB_URL}/${col}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
};

const fsDelete = async (col, docId) => {
  const res = await fetch(`${DB_URL}/${col}/${docId}?key=${API_KEY}`, { method: 'DELETE' });
  return res.ok;
};

const fsGetConfig = async () => {
  try {
    const res  = await fetch(`${DB_URL}/config/global?key=${API_KEY}`);
    const data = await res.json();
    if (data.error) return null;
    const f = data.fields;
    return { diasPorMes: f?.diasPorMes?.stringValue ?? '1.25' };
  } catch { return null; }
};

const fsSetConfig = async (datos) => {
  const fields = {};
  for (const k in datos) fields[k] = { stringValue: String(datos[k]) };
  const mask = Object.keys(datos).map(k => `updateMask.fieldPaths=${k}`).join('&');
  await fetch(`${DB_URL}/config/global?${mask}&key=${API_KEY}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
};

// ════════════════════════════════════════════════════════════════════════════
export default function SuperAdmin({ onSalir }) {
  const [pantalla,  setPantalla]  = useState('login');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [tabActivo, setTabActivo] = useState('stats');
  const [cargando,  setCargando]  = useState(false);

  // Datos
  const [usuarios, setUsuarios] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [config,   setConfig]   = useState({ diasPorMes: '1.25' });

  // Modales
  const [modalUsuario, setModalUsuario] = useState(null);
  const [modalPermiso, setModalPermiso] = useState(null);
  const [busquedaUser, setBusquedaUser] = useState('');
  const [busquedaPerm, setBusquedaPerm] = useState('');

  // ── FIX: Modal resetear días (reemplaza Alert.prompt que no funciona en Android) ──
  const [modalResetear,       setModalResetear]       = useState(null); // usuario a resetear
  const [diasReset,           setDiasReset]           = useState('15');
  // ── FIX: Confirmación eliminar permiso dentro del modal (Alert anidado no funciona en Android) ──
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);

  // ── Estados cambio de contraseña SuperAdmin ───────────────────────────────
  const [passActual,    setPassActual]    = useState('');
  const [passNueva,     setPassNueva]     = useState('');
  const [passConfirm,   setPassConfirm]   = useState('');
  const [passGuardando, setPassGuardando] = useState(false);
  const [passExito,     setPassExito]     = useState(false);
  const [passVigente,   setPassVigente]   = useState(null); // null = aún no cargó de Firestore
  const [passCargando,  setPassCargando]  = useState(true);
  const [passError,     setPassError]     = useState(false); // true = Firestore falló

  // Cargar contraseña desde Firestore al iniciar (igual en todos los dispositivos)
  useEffect(() => {
    const cargarPass = async () => {
      try {
        const res  = await fetch(`${DB_URL}/config/superadmin?key=${API_KEY}`);
        const data = await res.json();
        if (!data.error && data.fields?.saPassword?.stringValue) {
          // Ya fue cambiada antes → usar la de Firestore
          setPassVigente(data.fields.saPassword.stringValue);
        } else {
          // Primera vez, nunca se ha cambiado → usar la original del código
          setPassVigente(SA_PASS);
        }
      } catch {
        // Sin conexión → bloquear acceso, no caer a la original
        setPassError(true);
      }
      setPassCargando(false);
    };
    cargarPass();
  }, []);

  // Carga Excel
  const [cargaProgreso,  setCargaProgreso]  = useState(null);
  const [cargaResultado, setCargaResultado] = useState(null);
  const [cargaCoriendo,  setCargaCoriendo]  = useState(false);
  const [empleadosDrive, setEmpleadosDrive] = useState([]);

  // Nuevo usuario form
  const [nuevoUser] = useState({
    codigo: '', nombre: '', cargo: '', departamento: '',
    rol: 'empleado', password: '', dias: '15', fechaIngreso: ''
  });

  const cargarDatos = async () => {
    setCargando(true);
    const [u, p, c] = await Promise.all([
      fsGetAll('usuarios'),
      fsGetAll('permisos'),
      fsGetConfig()
    ]);
    setUsuarios(u);
    setPermisos(p);
    if (c) setConfig(c);
    setCargando(false);
  };

  const handleLogin = () => {
    if (passCargando) {
      Alert.alert('⏳', 'Verificando credenciales, espera un momento...'); return;
    }
    if (loginUser.toUpperCase() === SA_USER && loginPass === passVigente) {
      setPantalla('app');
      cargarDatos();
    } else {
      Alert.alert('❌ Acceso denegado', 'Credenciales incorrectas');
    }
  };

  // ─── CAMBIAR CONTRASEÑA SUPERADMIN (se guarda en Firestore → vale en todos los dispositivos) ──
  const handleCambiarPassword = async () => {
    if (!passActual || !passNueva || !passConfirm) {
      Alert.alert('Error', 'Completa todos los campos'); return;
    }
    if (passActual !== passVigente) {
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
      // Guardar en Firestore → persiste en TODOS los dispositivos
      const res  = await fetch(`${DB_URL}/config/superadmin?updateMask.fieldPaths=saPassword&key=${API_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { saPassword: { stringValue: passNueva } } })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      setPassVigente(passNueva);
      setPassActual('');
      setPassNueva('');
      setPassConfirm('');
      setPassExito(true);
      setTimeout(() => setPassExito(false), 3000);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la contraseña: ' + e.message);
    }
    setPassGuardando(false);
  };

  // ─── ESTADÍSTICAS ─────────────────────────────────────────────────────────
  const stats = {
    totalUsuarios: usuarios.length,
    totalPermisos: permisos.length,
    pendientes:    permisos.filter(p => p.estado === 'Pendiente').length,
    aprobados:     permisos.filter(p => p.estado === 'Aprobado').length,
    rechazados:    permisos.filter(p => p.estado === 'Rechazado').length,
    porDpto: usuarios.reduce((acc, u) => {
      const d = u.departamento || 'Sin dept.';
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {}),
    porRol: usuarios.reduce((acc, u) => {
      acc[u.rol || '??'] = (acc[u.rol || '??'] || 0) + 1;
      return acc;
    }, {}),
  };

  // ─── GUARDAR USUARIO ──────────────────────────────────────────────────────
  const guardarUsuario = async (datos, id) => {
    setCargando(true);
    try {
      if (id) {
        await fsUpdate('usuarios', id, datos);
        Alert.alert('✅', 'Usuario actualizado');
      } else {
        await fsAdd('usuarios', datos);
        Alert.alert('✅', 'Usuario creado');
      }
      await cargarDatos();
      setModalUsuario(null);
    } catch (e) { Alert.alert('Error', e.message); }
    setCargando(false);
  };

  // ─── ELIMINAR PERMISO ─────────────────────────────────────────────────────
  // FIX: Alert.alert con callbacks no funciona bien dentro de un Modal en Android.
  // Se usa estado confirmandoEliminar para mostrar la confirmación dentro del propio modal.
  const ejecutarEliminarPermiso = async (id) => {
    await fsDelete('permisos', id);
    setConfirmandoEliminar(false);
    setModalPermiso(null);
    await cargarDatos();
    Alert.alert('🗑️', 'Permiso eliminado');
  };

  // ─── RESETEAR DÍAS ────────────────────────────────────────────────────────
  const resetearDias = async (usuario, nuevosDias) => {
    await fsUpdate('usuarios', usuario.id, { dias: String(nuevosDias) });
    await cargarDatos();
    Alert.alert('✅', `Días de ${usuario.nombre} actualizados a ${nuevosDias}`);
  };

  // ─── CONFIRMAR RESET (desde modal) ───────────────────────────────────────
  const confirmarReset = async () => {
    if (!modalResetear) return;
    if (!diasReset || isNaN(Number(diasReset))) {
      Alert.alert('Error', 'Ingresa un número válido de días');
      return;
    }
    await resetearDias(modalResetear, diasReset);
    setModalResetear(null);
  };

  // ─── GUARDAR CONFIG ───────────────────────────────────────────────────────
  const guardarConfig = async () => {
    setCargando(true);
    await fsSetConfig({ diasPorMes: config.diasPorMes });
    Alert.alert('✅', `Rate actualizado a ${config.diasPorMes} días/mes`);
    setCargando(false);
  };

  // ─── NORMALIZAR FECHA ─────────────────────────────────────────────────────
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

  // ─── LEER GOOGLE SHEETS ───────────────────────────────────────────────────
  const leerExcelDrive = async () => {
    const url  = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1?key=${DRIVE_API_KEY}&valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;
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

  // ─── CARGA MASIVA DESDE DRIVE ─────────────────────────────────────────────
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
          const res  = await fetch(`${DB_URL}:runQuery?key=${API_KEY}`, {
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
            await fsAdd('usuarios', {
              codigo:            emp.codigo,
              nombre:            emp.nombre,
              cargo:             emp.cargo,
              departamento:      emp.departamento,
              rol:               emp.rol,
              password:          emp.password,
              dias:              emp.dias,
              fechaIngreso:      emp.fechaIngreso,
              ultimaAcumulacion: '',
            });
            creados++;
          }
        } catch { errores++; }
        setCargaProgreso({ actual: i + 1, total: empleados.length, actualizados, creados, errores });
        await new Promise(r => setTimeout(r, 120));
      }
      setCargaResultado({ total: empleados.length, actualizados, creados, errores });
    } catch (e) {
      Alert.alert('❌ Error', `No se pudo leer el Excel:\n${e.message}\n\nVerifica que esté compartido como "Cualquier persona con el enlace".`);
    }
    setCargaCoriendo(false);
  };

  // ════════════════════════════════════
  // LOGIN SUPERADMIN
  // ════════════════════════════════════
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
                  No se puede verificar las credenciales.{'\n'}Conéctate a internet e intenta de nuevo.
                </Text>
                <TouchableOpacity
                  style={[sa.btnAcceso, { backgroundColor: '#333', marginTop: 4, width: '100%' }]}
                  onPress={() => {
                    setPassError(false);
                    setPassCargando(true);
                    setPassVigente(null);
                    // Reintentar
                    fetch(`${DB_URL}/config/superadmin?key=${API_KEY}`)
                      .then(r => r.json())
                      .then(data => {
                        if (!data.error && data.fields?.saPassword?.stringValue) {
                          setPassVigente(data.fields.saPassword.stringValue);
                        } else {
                          setPassVigente(SA_PASS);
                        }
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

  // ════════════════════════════════════════════════════════════════════════════
  // APP SUPERADMIN
  // ════════════════════════════════════════════════════════════════════════════
  const TABS_SA = [
    { key: 'stats',      icon: '📊', label: 'Stats'      },
    { key: 'usuarios',   icon: '👥', label: 'Usuarios'   },
    { key: 'permisos',   icon: '📋', label: 'Permisos'   },
    { key: 'config',     icon: '⚙️', label: 'Config'     },
    { key: 'excel',      icon: '📂', label: 'Excel'      },
    { key: 'seguridad',  icon: '🔒', label: 'Seguridad'  },
  ];

  // ── STATS ─────────────────────────────────────────────────────────────────
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
          { label: 'Rate/mes',   val: `${config.diasPorMes}d`, color: ACENTO    },
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

  // ── USUARIOS ──────────────────────────────────────────────────────────────
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
        <ScrollView style={sa.content}>
          <Text style={sa.pageTitle}>👥 Usuarios ({filtrados.length})</Text>
          {cargando && <ActivityIndicator color={ACENTO} style={{ margin: 20 }} />}
          {filtrados.map(u => (
            <TouchableOpacity key={u.id} style={sa.card} onPress={() => setModalUsuario(u)}>
              <View style={sa.cardAvatar}>
                <Text style={sa.cardAvatarText}>
                  {u.nombre?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sa.cardNombre}>{u.nombre}</Text>
                <Text style={sa.cardSub}>{u.cargo} · {u.codigo}</Text>
                <Text style={sa.cardSub}>📁 {u.departamento} · {u.rol}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View style={[sa.pill, { backgroundColor: VERDE + '20' }]}>
                  <Text style={[sa.pillText, { color: VERDE }]}>{u.dias ?? 0} días</Text>
                </View>
                <Text style={{ color: '#555', fontSize: 11 }}>✏️ Editar</Text>
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    );
  };

  // ── PERMISOS ──────────────────────────────────────────────────────────────
  const renderPermisos = () => {
    const filtrados = permisos.filter(p =>
      p.nombre?.toLowerCase().includes(busquedaPerm.toLowerCase()) ||
      p.codigo?.includes(busquedaPerm) ||
      p.tipo?.toLowerCase().includes(busquedaPerm.toLowerCase()) ||
      p.estado?.toLowerCase().includes(busquedaPerm.toLowerCase())
    );
    const colorEstado = (e) => e==='Aprobado' ? VERDE : e==='Rechazado' ? ROJO : AMARILLO;
    return (
      <View style={{ flex: 1 }}>
        <View style={sa.searchRow}>
          <TextInput style={[sa.searchInput, { flex: 1 }]} placeholder="🔍 Buscar por nombre, tipo, estado..."
            placeholderTextColor="#555" value={busquedaPerm} onChangeText={setBusquedaPerm} />
        </View>
        <ScrollView style={sa.content}>
          <Text style={sa.pageTitle}>📋 Permisos ({filtrados.length})</Text>
          {filtrados.map(p => (
            <TouchableOpacity key={p.id} style={sa.card} onPress={() => setModalPermiso(p)}>
              <View style={{ flex: 1 }}>
                <Text style={sa.cardNombre}>{p.nombre}</Text>
                <Text style={sa.cardSub}>{p.tipo} · {p.fechaInicio} → {p.fechaFin}</Text>
                <Text style={sa.cardSub} numberOfLines={1}>💬 {p.motivo}</Text>
              </View>
              <View style={[sa.pill, { backgroundColor: colorEstado(p.estado) + '20' }]}>
                <Text style={[sa.pillText, { color: colorEstado(p.estado) }]}>{p.estado}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    );
  };

  // ── CONFIG ────────────────────────────────────────────────────────────────
  const renderConfig = () => (
    <ScrollView style={sa.content}>
      <Text style={sa.pageTitle}>⚙️ Configuración</Text>

      <View style={sa.configCard}>
        <Text style={sa.configLabel}>📅 Días acumulados por mes</Text>
        <Text style={sa.configDesc}>Actualmente: {config.diasPorMes} días/mes por empleado</Text>
        <TextInput style={sa.input} value={config.diasPorMes} keyboardType="decimal-pad"
          onChangeText={v => setConfig(prev => ({ ...prev, diasPorMes: v }))}
          placeholderTextColor="#555" />
        {cargando
          ? <ActivityIndicator color={ACENTO} />
          : <TouchableOpacity style={sa.btnAcceso} onPress={guardarConfig}>
              <Text style={sa.btnAccesoText}>💾 Guardar configuración</Text>
            </TouchableOpacity>
        }
      </View>

      <Text style={sa.seccion}>🔄 Resetear días de un empleado</Text>
      {usuarios.map(u => (
        <View key={u.id} style={[sa.card, { alignItems: 'center' }]}>
          <View style={{ flex: 1 }}>
            <Text style={sa.cardNombre}>{u.nombre}</Text>
            <Text style={sa.cardSub}>{u.codigo} · {u.departamento}</Text>
          </View>
          <Text style={{ color: VERDE, fontWeight: '700', marginRight: 12 }}>{u.dias ?? 0}d</Text>
          {/* FIX: Reemplazado Alert.prompt (solo iOS) por modal compatible con Android */}
          <TouchableOpacity style={sa.btnReset}
            onPress={() => {
              setDiasReset(String(u.dias ?? '15'));
              setModalResetear(u);
            }}>
            <Text style={{ color: AMARILLO, fontWeight: '700', fontSize: 12 }}>✏️ Editar</Text>
          </TouchableOpacity>
        </View>
      ))}
      <View style={{ height: 30 }} />
    </ScrollView>
  );

  // ── EXCEL ─────────────────────────────────────────────────────────────────
  const renderExcel = () => {
    const pct = cargaProgreso ? Math.round((cargaProgreso.actual / cargaProgreso.total) * 100) : 0;
    return (
      <ScrollView style={sa.content}>
        <Text style={sa.pageTitle}>📂 Carga desde Excel</Text>
        <Text style={sa.configDesc}>
          Actualiza el campo fechaIngreso para {Object.keys(FECHAS_INGRESO_EXCEL).length} empleados extraídos del Excel de la empresa.
        </Text>

        <View style={sa.configCard}>
          <Text style={sa.configLabel}>📡 Fuente de datos</Text>
          <Text style={{ color: '#4A9EC4', fontSize: 12, marginBottom: 4 }}>Google Sheets (Drive)</Text>
          <Text style={{ color: '#555', fontSize: 11, marginBottom: 12 }}>
            Lee automáticamente el archivo desde tu Drive y actualiza fechaIngreso en Firestore.
          </Text>
          <Text style={sa.configLabel}>Empleados leídos del Excel</Text>
          <Text style={[sa.statVal, { color: ACENTO, fontSize: 32, textAlign: 'center', marginVertical: 8 }]}>
            {empleadosDrive.length > 0 ? empleadosDrive.length : '—'}
          </Text>
          {!cargaCoriendo && !cargaResultado && (
            <TouchableOpacity style={sa.btnAcceso} onPress={iniciarCargaExcel}>
              <Text style={sa.btnAccesoText}>▶ Leer Excel y cargar a Firestore</Text>
            </TouchableOpacity>
          )}
          {cargaResultado && (
            <TouchableOpacity
              style={[sa.btnAcceso, { backgroundColor: '#333' }]}
              onPress={() => { setCargaResultado(null); setCargaProgreso(null); setEmpleadosDrive([]); }}>
              <Text style={sa.btnAccesoText}>🔄 Volver a ejecutar</Text>
            </TouchableOpacity>
          )}
        </View>

        {cargaCoriendo && (
          <View style={sa.configCard}>
            <ActivityIndicator color={ACENTO} size="large" style={{ marginBottom: 12 }} />
            {cargaProgreso && (
              <>
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 16, textAlign: 'center', marginBottom: 8 }}>
                  {cargaProgreso.actual} / {cargaProgreso.total} — {pct}%
                </Text>
                <View style={sa.barBg}>
                  <View style={[sa.barFill, { width: `${pct}%`, backgroundColor: ACENTO }]} />
                </View>
                <Text style={{ color: '#aaa', textAlign: 'center', marginTop: 8 }}>
                  ✅ {cargaProgreso.actualizados} actualizados  🆕 {cargaProgreso.creados} creados  ❌ {cargaProgreso.errores}
                </Text>
              </>
            )}
          </View>
        )}

        {cargaResultado && (
          <View style={[sa.configCard, { borderLeftWidth: 4, borderLeftColor: VERDE }]}>
            <Text style={{ color: VERDE, fontWeight: '800', fontSize: 18, marginBottom: 12 }}>✅ Carga completada</Text>
            {[
              { label: 'Total procesados', val: cargaResultado.total,        color: 'white'   },
              { label: 'Actualizados',     val: cargaResultado.actualizados,  color: VERDE     },
              { label: 'Usuarios creados', val: cargaResultado.creados,       color: '#4A9EC4' },
              { label: 'Errores',          val: cargaResultado.errores,       color: ROJO      },
            ].map(r => (
              <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: '#aaa', fontSize: 13 }}>{r.label}</Text>
                <Text style={{ color: r.color, fontWeight: '700', fontSize: 13 }}>{r.val}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    );
  };

  // ── MODAL EDITAR/CREAR USUARIO ────────────────────────────────────────────
  const ModalUsuario = () => {
    const esNuevo = modalUsuario && !modalUsuario.id;
    const [form, setForm] = useState(esNuevo ? nuevoUser : {
      codigo:         modalUsuario?.codigo         ?? '',
      nombre:         modalUsuario?.nombre         ?? '',
      cargo:          modalUsuario?.cargo          ?? '',
      departamento:   modalUsuario?.departamento   ?? '',
      rol:            modalUsuario?.rol            ?? 'empleado',
      password:       modalUsuario?.password       ?? '',
      dias:           modalUsuario?.dias           ?? '15',
      fechaIngreso:   modalUsuario?.fechaIngreso   ?? '',
      canCreateUsers: modalUsuario?.canCreateUsers ?? 'false',
      canLoadExcel:   modalUsuario?.canLoadExcel   ?? 'false',
      canAprobar:     modalUsuario?.canAprobar     ?? 'false',
    });

    const ROLES = ['empleado', 'auxiliar', 'jefe', 'supervisor', 'gerente'];

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
                { key: 'codigo',       label: 'Código',                    kb: 'default' },
                { key: 'nombre',       label: 'Nombre completo',           kb: 'default' },
                { key: 'cargo',        label: 'Cargo',                     kb: 'default' },
                { key: 'departamento', label: 'Departamento',              kb: 'default' },
                { key: 'password',     label: 'Contraseña',                kb: 'default' },
                { key: 'dias',         label: 'Días disponibles',          kb: 'numeric'  },
                { key: 'fechaIngreso', label: 'Fecha ingreso (DD/MM/AAAA)', kb: 'default' },
              ].map(f => (
                <View key={f.key} style={{ marginBottom: 10 }}>
                  <Text style={sa.configLabel}>{f.label}</Text>
                  <TextInput style={sa.input} value={form[f.key]} keyboardType={f.kb}
                    onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                    placeholderTextColor="#555" placeholder={f.label} />
                </View>
              ))}

              <Text style={sa.configLabel}>Rol</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {ROLES.map(r => (
                  <TouchableOpacity key={r}
                    style={[sa.pill, {
                      backgroundColor: form.rol === r ? ACENTO : '#333',
                      paddingHorizontal: 14, paddingVertical: 8
                    }]}
                    onPress={() => setForm(p => ({ ...p, rol: r }))}>
                    <Text style={[sa.pillText, { color: 'white' }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[sa.configLabel, { marginTop: 8 }]}>🔧 Permisos especiales de administración</Text>
              <Text style={{ color: '#555', fontSize: 11, marginBottom: 12 }}>
                Activa los accesos que tendrá este usuario en la app
              </Text>
              {[
                { key: 'canCreateUsers', label: '👥 Crear y editar usuarios',      desc: 'Puede crear nuevos usuarios y editar sus datos' },
                { key: 'canLoadExcel',   label: '📂 Cargar empleados desde Excel', desc: 'Puede sincronizar empleados desde Google Drive'  },
                { key: 'canAprobar',     label: '✅ Aprobar/rechazar solicitudes',  desc: 'Puede aprobar o rechazar solicitudes de cualquier empleado' },
              ].map(p => (
                <TouchableOpacity key={p.key}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: form[p.key] === 'true' ? ACENTO + '22' : '#1a1a2e',
                    borderRadius: 12, padding: 12, marginBottom: 8,
                    borderWidth: 1, borderColor: form[p.key] === 'true' ? ACENTO : '#333'
                  }}
                  onPress={() => setForm(prev => ({ ...prev, [p.key]: prev[p.key] === 'true' ? 'false' : 'true' }))}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>{p.label}</Text>
                    <Text style={{ color: '#666', fontSize: 11, marginTop: 2 }}>{p.desc}</Text>
                  </View>
                  <View style={{
                    width: 44, height: 24, borderRadius: 12,
                    backgroundColor: form[p.key] === 'true' ? ACENTO : '#333',
                    justifyContent: 'center', paddingHorizontal: 2
                  }}>
                    <View style={{
                      width: 20, height: 20, borderRadius: 10, backgroundColor: 'white',
                      alignSelf: form[p.key] === 'true' ? 'flex-end' : 'flex-start'
                    }} />
                  </View>
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={sa.btnAcceso} onPress={guardar}>
                <Text style={sa.btnAccesoText}>💾 {esNuevo ? 'Crear usuario' : 'Guardar cambios'}</Text>
              </TouchableOpacity>

              {!esNuevo && (
                <TouchableOpacity
                  style={[sa.btnAcceso, { backgroundColor: AMARILLO + '33', marginTop: 8 }]}
                  onPress={resetDias}>
                  <Text style={[sa.btnAccesoText, { color: AMARILLO }]}>🔄 Resetear días</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[sa.btnAcceso, { backgroundColor: '#333', marginTop: 8 }]}
                onPress={() => setModalUsuario(null)}>
                <Text style={sa.btnAccesoText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // ── MODAL VER/ELIMINAR PERMISO ────────────────────────────────────────────
  const ModalPermiso = () => {
    if (!modalPermiso) return null;
    const colorE = (e) => e==='Aprobado' ? VERDE : e==='Rechazado' ? ROJO : AMARILLO;
    return (
      <Modal visible={!!modalPermiso} animationType="slide" transparent>
        <View style={sa.modalOverlay}>
          <View style={sa.modalCard}>
            <Text style={sa.modalTitulo}>📋 Detalle de Permiso</Text>
            {[
              ['Empleado', modalPermiso.nombre],
              ['Código',   modalPermiso.codigo],
              ['Cargo',    modalPermiso.cargo],
              ['Depto',    modalPermiso.departamento],
              ['Tipo',     modalPermiso.tipo],
              ['Inicio',   modalPermiso.fechaInicio],
              ['Fin',      modalPermiso.fechaFin],
              ['Motivo',   modalPermiso.motivo],
              ['Estado',   modalPermiso.estado],
            ].map(([l, v]) => (
              <View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#888', fontSize: 13 }}>{l}</Text>
                <Text style={{ color: l==='Estado' ? colorE(v) : 'white', fontWeight: '600', fontSize: 13, flex: 1, textAlign: 'right' }}>{v}</Text>
              </View>
            ))}

            {/* FIX: Confirmación inline en lugar de Alert.alert anidado (no funciona en Android) */}
            {confirmandoEliminar ? (
              <View style={{ backgroundColor: ROJO + '22', borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: ROJO }}>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 14, textAlign: 'center', marginBottom: 12 }}>
                  ¿Confirmar eliminación?
                </Text>
                <Text style={{ color: '#aaa', fontSize: 12, textAlign: 'center', marginBottom: 14 }}>
                  Esta acción no se puede deshacer.
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[sa.btnAcceso, { flex: 1, backgroundColor: ROJO }]}
                    onPress={() => ejecutarEliminarPermiso(modalPermiso.id)}>
                    <Text style={sa.btnAccesoText}>🗑️ Sí, eliminar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[sa.btnAcceso, { flex: 1, backgroundColor: '#333' }]}
                    onPress={() => setConfirmandoEliminar(false)}>
                    <Text style={sa.btnAccesoText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  style={[sa.btnAcceso, { flex: 1, backgroundColor: ROJO + '33' }]}
                  onPress={() => setConfirmandoEliminar(true)}>
                  <Text style={[sa.btnAccesoText, { color: ROJO }]}>🗑️ Eliminar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[sa.btnAcceso, { flex: 1, backgroundColor: '#333' }]}
                  onPress={() => { setConfirmandoEliminar(false); setModalPermiso(null); }}>
                  <Text style={sa.btnAccesoText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // ── FIX: MODAL RESETEAR DÍAS (compatible Android e iOS) ───────────────────
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

  // ── SEGURIDAD — Cambiar contraseña SuperAdmin ─────────────────────────────
  const renderSeguridad = () => (
    <ScrollView style={sa.content}>
      <Text style={sa.pageTitle}>🔒 Seguridad</Text>
      <Text style={sa.configDesc}>
        Cambia la contraseña del SuperAdmin. El cambio aplica solo para esta sesión.{'\n'}
        Para que sea permanente, actualiza también el valor de SA_PASS en el código fuente.
      </Text>

      {/* Aviso de éxito */}
      {passExito && (
        <View style={{ backgroundColor: VERDE + '22', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: VERDE, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 20 }}>✅</Text>
          <View>
            <Text style={{ color: VERDE, fontWeight: '700', fontSize: 14 }}>Contraseña actualizada</Text>
            <Text style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>Válida para esta sesión. Recuerda actualizar el código fuente para hacerla permanente.</Text>
          </View>
        </View>
      )}

      <View style={sa.configCard}>
        <Text style={sa.configLabel}>🔑 Contraseña actual</Text>
        <TextInput
          style={sa.input}
          value={passActual}
          onChangeText={setPassActual}
          secureTextEntry
          placeholder="Ingresa tu contraseña actual"
          placeholderTextColor="#555"
        />

        <Text style={[sa.configLabel, { marginTop: 8 }]}>🆕 Nueva contraseña</Text>
        <TextInput
          style={sa.input}
          value={passNueva}
          onChangeText={setPassNueva}
          secureTextEntry
          placeholder="Mínimo 6 caracteres"
          placeholderTextColor="#555"
        />

        <Text style={[sa.configLabel, { marginTop: 8 }]}>🔁 Confirmar nueva contraseña</Text>
        <TextInput
          style={[sa.input, passConfirm && passNueva && passConfirm !== passNueva && { borderColor: ROJO }]}
          value={passConfirm}
          onChangeText={setPassConfirm}
          secureTextEntry
          placeholder="Repite la nueva contraseña"
          placeholderTextColor="#555"
        />
        {passConfirm && passNueva && passConfirm !== passNueva && (
          <Text style={{ color: ROJO, fontSize: 11, marginBottom: 8, marginTop: -8 }}>
            ⚠️ Las contraseñas no coinciden
          </Text>
        )}

        {passGuardando
          ? <ActivityIndicator color={ACENTO} style={{ marginTop: 12 }} />
          : <TouchableOpacity style={[sa.btnAcceso, { marginTop: 8 }]} onPress={handleCambiarPassword}>
              <Text style={sa.btnAccesoText}>💾 Guardar nueva contraseña</Text>
            </TouchableOpacity>
        }
      </View>

      {/* Info sobre contraseña actual */}
      <View style={[sa.configCard, { borderLeftWidth: 3, borderLeftColor: VERDE }]}>
        <Text style={[sa.configLabel, { color: VERDE }]}>☁️ Guardado en la nube</Text>
        <Text style={{ color: '#aaa', fontSize: 12, lineHeight: 18 }}>
          La contraseña se guarda en Firestore y aplica en <Text style={{ color: 'white', fontWeight: '700' }}>todos los dispositivos</Text>.{'\n\n'}
          Si cambias la contraseña desde un celular, en cualquier otro celular ya te pedirá la nueva.{'\n\n'}
          Solo si deseas recuperar el acceso de emergencia, la contraseña original del código es:{' '}
          <Text style={{ color: ACENTO, fontWeight: '700' }}>CU@dm1n2024!</Text>
        </Text>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );

  // ── RENDER PRINCIPAL ──────────────────────────────────────────────────────
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
        {tabActivo === 'stats'     && renderStats()}
        {tabActivo === 'usuarios'  && renderUsuarios()}
        {tabActivo === 'permisos'  && renderPermisos()}
        {tabActivo === 'config'    && renderConfig()}
        {tabActivo === 'excel'     && renderExcel()}
        {tabActivo === 'seguridad' && renderSeguridad()}
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

      {/* Modales — orden importante: los más frecuentes primero */}
      <ModalUsuario />
      <ModalPermiso />
      <ModalResetearDias />
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════════════════
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
  navIconBoxActivo:{ backgroundColor: ACENTO + '33' },
  navLabel:        { fontSize: 10, color: '#555', fontWeight: '600' },
  navLabelActivo:  { color: ACENTO },
});