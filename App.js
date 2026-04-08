// ════════════════════════════════════════════════════════════════════════════
// App.js — Sistema de Permisos Laborales · Comercios Universales
// REFACTORIZADO: Solo navegación, estado global y delegación a screens.
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';
import {
  View, Text, TouchableOpacity, Image,
  StyleSheet, Alert, ActivityIndicator,
  SafeAreaView, StatusBar, Platform, Modal, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

// Screens
import IntroScreen         from './IntroScreen';
import SuperAdmin          from './SuperAdmin';
import LoginScreen         from './src/screens/LoginScreen';
import HomeScreen          from './src/screens/HomeScreen';
import HistorialScreen     from './src/screens/HistorialScreen';
import PerfilScreen        from './src/screens/PerfilScreen';
import SolicitudScreen     from './src/screens/SolicitudScreen';
import AprobarScreen       from './src/screens/AprobarScreen';
import ReporteScreen       from './src/screens/ReporteScreen';
import ReporteDiarioScreen from './src/screens/ReporteDiarioScreen';
import AdminScreen         from './src/screens/AdminScreen';

// Components
import LogoAnimado from './src/components/LogoAnimado';

// Services
import { fsGet, fsAdd, fsUpdate, fsQuery, buscarUsuario, refrescarUsuario, cargarFestivosSet } from './src/services/firestore';
import { codeToEmail, normalizarPass, guardarSesion, leerSesion, borrarSesion } from './src/services/auth';
import { registrarPushToken, enviarNotificacion, crearNotificacion } from './src/services/notifications';
import { generarPDF } from './src/services/pdf';

// Utils & Constants
import { calcularDias } from './src/utils/calcularDias';
import { formatFechaHora, formatHora12, diffMinutos, REGEX_FECHA, validarFechas } from './src/utils/fechas';
import { AZUL, AZUL_CLARO, TEMAS, PROJECT_ID, API_KEY, DB_URL, AUTH_URL, AUTH_UPDATE_URL, LOGO, TIPOS } from './src/constants/config';

// ── Jerarquía de roles ────────────────────────────────────────────────────
const JERARQUIA = { dueno: 3, contralor: 2, jefe: 1, auxiliar: 0 };

const puedeAprobarA = (aprobador, solicitante) => {
  if (aprobador.codigo === solicitante.codigo) return false;
  if (aprobador.rol === 'dueno') return true;
  if (aprobador.rol === 'contralor') return true;
  if (aprobador.rol === 'jefe')
    return aprobador.departamento === solicitante.departamento && solicitante.rol === 'auxiliar';
  return false;
};

// ── Helper: leer días del empleado desde un documento de Firestore raw ────
// Centraliza la lectura para no repetir el triple-coalescente en cada handler
const leerDiasDeDoc = (doc) => {
  const c = doc.fields?.dias;
  const v = parseFloat(c?.stringValue ?? c?.doubleValue ?? c?.integerValue ?? 'NaN');
  return isNaN(v) ? null : v;
};

// ── Helper: buscar empleado en Firestore por código y devolver { id, dias, pushToken } ──
const buscarEmpleadoFS = async (codigo) => {
  const res  = await fetch(`${DB_URL}:runQuery?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from:  [{ collectionId: 'usuarios' }],
        where: { fieldFilter: { field: { fieldPath: 'codigo' }, op: 'EQUAL', value: { stringValue: codigo } } },
        limit: 1,
      },
    }),
  });
  const data = await res.json();
  if (!data[0]?.document) return null;
  const doc  = data[0].document;
  const dias = leerDiasDeDoc(doc);
  return {
    id:        doc.name.split('/').pop(),
    dias,
    pushToken: doc.fields?.pushToken?.stringValue ?? null,
  };
};

// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  // ── Navegación ──────────────────────────────────────────────────────────
  const [modoPantalla, setModoPantalla] = useState('app');
  const [introVisible, setIntroVisible] = useState(true);
  const [pantalla,     setPantalla]     = useState('login');
  const [tabActivo,    setTabActivo]    = useState('inicio');

  // ── Sesión / Usuario ────────────────────────────────────────────────────
  const [usuario,         setUsuario]         = useState(null);
  const [usuarios,        setUsuarios]        = useState([]);
  const [loginCargando,   setLoginCargando]   = useState(false);
  const [diasDisponibles, setDiasDisponibles] = useState(15);
  const [fotoPerfil,      setFotoPerfil]      = useState(null);
  const [permisosAdmin,   setPermisosAdmin]   = useState({
    canCreateUsers: false, canLoadExcel: false, canAprobar: false,
    canGestionarFestivos: false, canReporteDiario: false,
  });

  // ── Permisos ─────────────────────────────────────────────────────────────
  const [permisos,  setPermisos]  = useState([]);
  const [cargando,  setCargando]  = useState(false);
  const ultimaCargaPermisos = useRef(0);

  // ── Formulario nueva solicitud ────────────────────────────────────────
  const [tipoSeleccionado,  setTipoSeleccionado]  = useState('');
  const [subtipoIGSS,       setSubtipoIGSS]       = useState('');
  const [fechaInicio,       setFechaInicio]       = useState('');
  const [fechaFin,          setFechaFin]          = useState('');
  const [motivo,            setMotivo]            = useState('');
  const [horasSolicitadas,  setHorasSolicitadas]  = useState('1');
  const [duracionPersonal,  setDuracionPersonal]  = useState('diaCompleto');
  const [festivosMapState,  setFestivosMapState]  = useState({});

  // ── Notificaciones ────────────────────────────────────────────────────
  const [notificaciones, setNotificaciones] = useState([]);
  const [panelNotif,     setPanelNotif]     = useState(false);
  const [notifCargando,  setNotifCargando]  = useState(false);

  // ── Tema ──────────────────────────────────────────────────────────────
  const colorSchemeDelSistema = useColorScheme();
  const [modoTema, setModoTema] = useState(null);
  const temaActual = modoTema ?? (colorSchemeDelSistema === 'dark' ? 'oscuro' : 'claro');
  const T = TEMAS[temaActual];

  // ════════════════════════════════════════════════════════════════════════
  // SESIÓN
  // ════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const recuperarSesion = async () => {
      try {
        const temaGuardado = await AsyncStorage.getItem('tema_preferido');
        if (temaGuardado === 'claro' || temaGuardado === 'oscuro') setModoTema(temaGuardado);
        const sesionGuardada = await leerSesion();
        if (sesionGuardada) {
          const uFresco       = await refrescarUsuario(sesionGuardada.codigo);
          const u             = { ...sesionGuardada, ...uFresco };
          const todosUsuarios = await fsGet('usuarios');
          setUsuarios(todosUsuarios);
          setUsuario(u);
          setDiasDisponibles(parseFloat(u.dias) || 0);
          setPermisosAdmin({
            canCreateUsers:       u.canCreateUsers       === 'true',
            canLoadExcel:         u.canLoadExcel         === 'true',
            canAprobar:           u.canAprobar           === 'true',
            canGestionarFestivos: u.canGestionarFestivos === 'true',
            canReporteDiario:     u.canReporteDiario     === 'true',
          });
          setPantalla('app');
          setTabActivo('inicio');
          cargarPermisos(u);
          cargarNotificaciones(u);
          cargarFestivosSet().then(m => setFestivosMapState(m)).catch(() => {});
          const fotoCloud = u.fotoPerfil;
          if (fotoCloud) { setFotoPerfil(fotoCloud); await AsyncStorage.setItem(`foto_perfil_${u.id}`, fotoCloud); }
          else { const fotoLocal = await AsyncStorage.getItem(`foto_perfil_${u.id}`); if (fotoLocal) setFotoPerfil(fotoLocal); }
        }
      } catch (e) { console.log('No se pudo recuperar sesión:', e.message); }
    };
    recuperarSesion();
  }, []);

  // ════════════════════════════════════════════════════════════════════════
  // CARGA DE DATOS
  // ════════════════════════════════════════════════════════════════════════
  const cargarPermisos = async (usuarioRef) => {
    setCargando(true);
    try {
      const ref = usuarioRef ?? usuario;
      const esGerente = ref?.rol === 'dueno' || ref?.rol === 'contralor';
      if (esGerente) {
        setPermisos(await fsQuery('permisos', 'estado', 'Pendiente'));
      } else {
        const [misPerms, deptoPerms] = await Promise.all([
          fsQuery('permisos', 'codigo', ref?.codigo ?? ''),
          ref?.rol === 'jefe' ? fsQuery('permisos', 'departamento', ref?.departamento ?? '') : Promise.resolve([]),
        ]);
        const mapa = {};
        [...misPerms, ...deptoPerms].forEach(p => { mapa[p.id] = p; });
        setPermisos(Object.values(mapa));
      }
    } catch (e) { console.warn('Error cargando permisos:', e.message); }
    ultimaCargaPermisos.current = Date.now();
    setCargando(false);
  };

  const cargarNotificaciones = async (usuarioParam) => {
    const ref = usuarioParam ?? usuario;
    if (!ref?.codigo) return [];
    setNotifCargando(true);
    try {
      const res  = await fetch(`${DB_URL}:runQuery?key=${API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'notificaciones' }], where: { fieldFilter: { field: { fieldPath: 'codigo' }, op: 'EQUAL', value: { stringValue: ref.codigo } } }, orderBy: [{ field: { fieldPath: 'fecha' }, direction: 'DESCENDING' }], limit: 30 } })
      });
      const data = await res.json();
      if (!data[0]?.document) { setNotificaciones([]); setNotifCargando(false); return []; }
      const lista = data.filter(r => r.document).map(r => {
        const id = r.document.name.split('/').pop();
        const f  = r.document.fields;
        return { id, codigo: f.codigo?.stringValue ?? '', titulo: f.titulo?.stringValue ?? '', cuerpo: f.cuerpo?.stringValue ?? '', leido: f.leido?.stringValue === 'true', fecha: f.fecha?.stringValue ?? '' };
      });
      setNotificaciones(lista); setNotifCargando(false); return lista;
    } catch(e) { console.log('Error notificaciones:', e.message); setNotifCargando(false); return []; }
  };

  const marcarTodasLeidas = async (lista) => {
    const noLeidas = lista.filter(n => !n.leido);
    await Promise.all(noLeidas.map(n => fsUpdate('notificaciones', n.id, { leido: 'true' }).catch(() => {})));
    setNotificaciones(prev => prev.map(n => ({ ...n, leido: true })));
  };

  const notifNoLeidas = notificaciones.filter(n => !n.leido).length;

  const abrirPanelNotif = async () => {
    setPanelNotif(true);
    const listaFresca = await cargarNotificaciones();
    await marcarTodasLeidas(listaFresca);
  };

  // ════════════════════════════════════════════════════════════════════════
  // NAVEGACIÓN
  // ════════════════════════════════════════════════════════════════════════
  const handleCambiarTab = (tab) => {
    setTabActivo(tab);
    const ahora = Date.now();
    if (ahora - ultimaCargaPermisos.current > 5 * 60 * 1000) {
      ultimaCargaPermisos.current = ahora;
      cargarPermisos(usuario);
    }
    if (tab === 'historial' || tab === 'aprobar' || tab === 'inicio') {
      cargarFestivosSet().then(m => setFestivosMapState(m)).catch(() => {});
    }
  };

  // ════════════════════════════════════════════════════════════════════════
  // LÓGICA DE PERMISOS
  // ════════════════════════════════════════════════════════════════════════

  // ── Persiste saldo de días en Firestore ───────────────────────────────
  const persistirDias = async (usuarioId, nuevoDias, extras = {}) => {
    if (isNaN(nuevoDias) || nuevoDias === null) { console.warn('persistirDias: valor inválido'); return; }
    const diasLimpios = Math.round(nuevoDias * 100) / 100;
    try { await fsUpdate('usuarios', usuarioId, { dias: String(diasLimpios), ...extras }); }
    catch (e) { console.warn('No se pudo persistir días:', e.message); }
  };

  // ── Descuenta días y actualiza estado local ───────────────────────────
  const aplicarDescuento = (codigoEmpleado, empleadoId, diasActuales, diasADescontar) => {
   const actual = parseFloat(diasActuales) || 0;
   const nuevosDias = Math.max(0, (Math.round(actual * 100) - Math.round(diasADescontar * 100)) / 100);
    persistirDias(empleadoId, nuevosDias);
    if (codigoEmpleado === usuario?.codigo) setDiasDisponibles(nuevosDias);
    setUsuarios(prev => prev.map(u => u.codigo === codigoEmpleado ? { ...u, dias: String(nuevosDias) } : u));
    return nuevosDias;
  };

  // ════════════════════════════════════════════════════════════════════════
  // HANDLER: NUEVA SOLICITUD
  // ════════════════════════════════════════════════════════════════════════
  const handleEnviar = async () => {
    if (!tipoSeleccionado) { Alert.alert('Error', 'Selecciona el tipo de permiso'); return; }

    // ── Permiso por horas ──────────────────────────────────────────────
    if (tipoSeleccionado === 'Horas') {
      if (!motivo) { Alert.alert('Error', 'Escribe el motivo'); return; }
      const hNum = parseFloat(horasSolicitadas);
      if (!hNum || hNum <= 0 || hNum > 2) { Alert.alert('Error', 'Máximo 2 horas. Ingresa 1 o 2.'); return; }
      setCargando(true);
      try {
        await fsAdd('permisos', {
          nombre: usuario.nombre, codigo: usuario.codigo, cargo: usuario.cargo,
          rol: usuario.rol, departamento: usuario.departamento || '',
          tipo: 'Horas', fechaInicio: new Date().toLocaleDateString('es-GT'),
          fechaFin: new Date().toLocaleDateString('es-GT'),
          motivo, estado: 'Pendiente',
          horasSolicitadas: String(hNum),
          horaAprobacion: '', horaRegreso: '', descuentoHoras: 'no',
        });
        const aprobadores = usuarios.filter(u => u.codigo !== usuario.codigo && puedeAprobarA(u, usuario));
        await Promise.all(aprobadores.map(apr => Promise.all([
          crearNotificacion(apr.codigo, `⏱️ Permiso por horas`, `${usuario.nombre} solicita ${hNum}h de permiso`),
          apr.pushToken ? enviarNotificacion(apr.pushToken, '⏱️ Permiso por horas', `${usuario.nombre} solicita ${hNum}h`) : Promise.resolve(),
        ])));
        Alert.alert('✅ Enviado', `Solicitud de ${hNum} hora(s) enviada`);
        setTipoSeleccionado(''); setSubtipoIGSS(''); setMotivo(''); setHorasSolicitadas('1');
        await cargarPermisos(usuario);
        setTabActivo('inicio');
      } catch (e) { Alert.alert('Error', 'No se pudo enviar: ' + e.message); }
      setCargando(false);
      return;
    }

    // ── Permiso por días ───────────────────────────────────────────────
    if (!fechaInicio || !fechaFin || !motivo) { Alert.alert('Error', 'Completa todos los campos'); return; }
    if (tipoSeleccionado === 'IGSS' && !subtipoIGSS) { Alert.alert('Error', 'Selecciona el tipo de consulta IGSS'); return; }

    const errorFecha = validarFechas(fechaInicio, fechaFin);
    if (errorFecha) { Alert.alert('Fecha inválida', errorFecha); return; }

    // BUG FIX #4: Validar que medio día sea un solo día
    if (tipoSeleccionado === 'Personal' && duracionPersonal === 'medioDia' && fechaInicio !== fechaFin) {
      Alert.alert('Fecha inválida', 'El permiso de ½ día debe tener la misma fecha de inicio y fin.');
      return;
    }

    setCargando(true);
    const tipoFinal = tipoSeleccionado === 'IGSS' ? `IGSS - ${subtipoIGSS}` : tipoSeleccionado;
    try {
      const extraDatos = tipoFinal === 'Personal' ? { duracion: duracionPersonal } : {};
      await fsAdd('permisos', {
        nombre: usuario.nombre, codigo: usuario.codigo, cargo: usuario.cargo,
        rol: usuario.rol, departamento: usuario.departamento || '',
        tipo: tipoFinal, fechaInicio, fechaFin, motivo, estado: 'Pendiente',
        ...extraDatos,
      });
      const aprobadores = usuarios.filter(u => u.codigo !== usuario.codigo && puedeAprobarA(u, usuario));
      await Promise.all(aprobadores.map(apr => Promise.all([
        crearNotificacion(apr.codigo, `📋 Nueva solicitud de permiso`, `${usuario.nombre} solicitó ${tipoFinal} del ${fechaInicio} al ${fechaFin}`),
        apr.pushToken ? enviarNotificacion(apr.pushToken, '📋 Nueva solicitud', `${usuario.nombre} solicitó ${tipoFinal}`) : Promise.resolve(),
      ])));
      Alert.alert('✅ Enviado', 'Tu solicitud fue enviada correctamente');
      setTipoSeleccionado(''); setSubtipoIGSS(''); setFechaInicio(''); setFechaFin(''); setMotivo('');
      await cargarPermisos(usuario);
      setTabActivo('inicio');
    } catch (e) { Alert.alert('Error', 'No se pudo enviar: ' + e.message); }
    setCargando(false);
  };

  // ════════════════════════════════════════════════════════════════════════
  // HANDLER: APROBAR / RECHAZAR SOLICITUDES
  // BUG FIX #1: fsUpdate de estado se mueve a DESPUÉS de validar días
  // BUG FIX #2: Override del jefe es autoritativo (no depende de duracion)
  // BUG FIX #3: Eliminado descuentaOverride === true (código muerto)
  // ════════════════════════════════════════════════════════════════════════
  const handleCambiarEstado = async (id, estado, descuentaOverride = null) => {
    setCargando(true);
    try {
      const permiso = permisos.find(p => p.id === id);
      if (!permiso) { setCargando(false); return; }

      // ── Permiso por HORAS: aprobación directa, descuento manual posterior ──
      if (permiso.tipo === 'Horas' && estado === 'Aprobado') {
        const ahoraAprobacion   = new Date();
        const horaAprobacion    = formatHora12(ahoraAprobacion);
        const horaAprobacionISO = ahoraAprobacion.toISOString();
        const fechaAprobacion   = formatFechaHora(ahoraAprobacion);
        await fsUpdate('permisos', id, {
          estado: 'Aprobado', horaAprobacion, horaAprobacionISO, fechaAprobacion,
          aprobadoPor: usuario?.nombre ?? '', aprobadoPorId: usuario?.id ?? '',
          horaRegreso: '', descuentoResuelto: 'false',
        });
        await crearNotificacion(permiso.codigo, '⏱️ Permiso por horas aprobado', `Tienes ${permiso.horasSolicitadas}h de permiso. Sal a las ${horaAprobacion}.`);
        const srq = await fetch(`${DB_URL}:runQuery?key=${API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'usuarios' }], where: { fieldFilter: { field: { fieldPath: 'codigo' }, op: 'EQUAL', value: { stringValue: permiso.codigo } } }, limit: 1 } }) });
        const sd  = await srq.json();
        if (sd[0]?.document?.fields?.pushToken?.stringValue) enviarNotificacion(sd[0].document.fields.pushToken.stringValue, '⏱️ Permiso aprobado', `Tienes ${permiso.horasSolicitadas}h. Sal a las ${horaAprobacion}.`);
        await cargarPermisos(usuario);
        Alert.alert('✅ Aprobado', `Hora de salida: ${horaAprobacion}\n\nCuando el empleado regrese y marque "Ya Regresé", podrás elegir si descontar.`);
        setCargando(false); return;
      }

      if (permiso.tipo === 'Horas' && estado === 'Rechazado') {
        await fsUpdate('permisos', id, { estado: 'Rechazado', aprobadoPor: usuario?.nombre ?? '', fechaAprobacion: new Date().toLocaleDateString('es-GT') });
        await crearNotificacion(permiso.codigo, '❌ Permiso por horas rechazado', 'Tu solicitud de permiso por horas fue rechazada.');
        await cargarPermisos(usuario);
        Alert.alert('❌ Rechazada', 'Solicitud rechazada.'); setCargando(false); return;
      }

      // ── Clasificar tipo de permiso ─────────────────────────────────────
      const esIGSS       = permiso.tipo?.startsWith('IGSS');
      const esVacaciones = permiso.tipo === 'Vacaciones';
      const esPersonal   = permiso.tipo === 'Personal';

      // El override del jefe manda para Personal.
      // descuentaOverride puede ser: null | false | 0.5 | 1
      let diasADescontarOverride = 0;
      if (esPersonal && descuentaOverride === 0.5) diasADescontarOverride = 0.5;
      else if (esPersonal && descuentaOverride === 1) diasADescontarOverride = 1;

      // IGSS normal nunca descuenta. Vacaciones siempre descuenta. Personal solo si el jefe eligió descuento.
      const debeDescontar = esVacaciones
        ? true
        : esIGSS
          ? false
          : esPersonal
            ? diasADescontarOverride > 0
            : false;

      // Calcular y validar días ANTES de escribir el estado en Firestore
      let diasUsados        = 0;
      let solicitanteId     = null;
      let diasActualesFS    = null;
      let pushTokenSolic    = null;

      if (estado === 'Aprobado' && debeDescontar) {
        // ── Calcular días a descontar ────────────────────────────────────
        if (esPersonal) {
          // FIX: Para Personal, el override del jefe es el máximo a descontar.
          // Si el jefe elige "½ día" siempre es 0.5.
          // Si el jefe elige "1 día" y el rango real de días hábiles es menor, se respeta el menor.
          // Esto evita descontar más días de los que realmente abarca el permiso.
          const festivosMap = await cargarFestivosSet();
          const diasHabilesReales = calcularDias(permiso.fechaInicio, permiso.fechaFin, festivosMap);
          if (diasADescontarOverride === 0.5) {
            diasUsados = 0.5; // ½ día: siempre 0.5
          } else {
            // 1 día: descontar el mínimo entre lo que el jefe eligió y los días hábiles reales
            diasUsados = Math.min(diasADescontarOverride, diasHabilesReales);
          }
        } else {
          // Vacaciones: calcular días hábiles reales con festivos
          const festivosMap = await cargarFestivosSet();
          diasUsados = calcularDias(permiso.fechaInicio, permiso.fechaFin, festivosMap);
        }

        if (isNaN(diasUsados) || diasUsados <= 0) {
          Alert.alert('⚠️ Aviso', 'No se pudo calcular los días a descontar. La solicitud no fue modificada.');
          setCargando(false); return;
        }

        // Leer saldo del empleado ANTES de aprobar
        try {
          const empleado = await buscarEmpleadoFS(permiso.codigo);
          if (!empleado || empleado.dias === null) throw new Error('Empleado no encontrado');
          solicitanteId  = empleado.id;
          diasActualesFS = empleado.dias;
          pushTokenSolic = empleado.pushToken;
        } catch (e) {
          Alert.alert('Error', 'No se pudo leer el saldo del empleado. La solicitud no fue modificada.');
          setCargando(false); return;
        }

        // FIX: Advertencia de saldo insuficiente para Vacaciones Y Personal con descuento
        if (diasUsados > diasActualesFS) {
          const confirmar = await new Promise((resolve) => {
            Alert.alert(
              '⚠️ Saldo insuficiente',
              `${permiso.nombre} necesita ${diasUsados} día(s) pero solo tiene ${diasActualesFS} disponibles.\n\n¿Aprobar de todas formas? El saldo quedará en 0.`,
              [
                { text: 'Cancelar',      style: 'cancel',      onPress: () => resolve(false) },
                { text: 'Aprobar igual', style: 'destructive', onPress: () => resolve(true)  },
              ],
            );
          });
          if (!confirmar) { setCargando(false); return; }
        }
      }

      // ── Todo validado: ahora sí persistir el estado en Firestore ──────
      await fsUpdate('permisos', id, {
        estado,
        descuento:      debeDescontar ? 'si' : 'no',
        aprobadoPor:    usuario?.nombre ?? '',
        aprobadoPorId:  usuario?.id ?? '',
        fechaAprobacion: formatFechaHora(new Date()),
      });

      // ── Aplicar descuento si corresponde ──────────────────────────────
      if (estado === 'Aprobado' && debeDescontar) {
        const nuevosDias = aplicarDescuento(permiso.codigo, solicitanteId, diasActualesFS, diasUsados);
        if (pushTokenSolic) enviarNotificacion(pushTokenSolic, '✅ Permiso aprobado', `Tu solicitud de ${permiso.tipo} fue aprobada.`);
        await crearNotificacion(permiso.codigo, '✅ Permiso aprobado', `Tu solicitud de ${permiso.tipo} del ${permiso.fechaInicio} al ${permiso.fechaFin} fue aprobada. Días descontados: ${diasUsados}.`);
        Alert.alert('✅ Aprobada', `Empleado: ${permiso.nombre}\nTipo: ${permiso.tipo}\nDías descontados: ${diasUsados}\nDías restantes: ${nuevosDias}`);

      } else if (estado === 'Aprobado') {
        await crearNotificacion(permiso.codigo, '✅ Permiso aprobado', `Tu solicitud de ${permiso.tipo} fue aprobada sin descuento de días.`);
        Alert.alert('✅ Aprobada', `Permiso de ${permiso.tipo} aprobado.\nNo descuenta días.`);

      } else {
        await crearNotificacion(permiso.codigo, '❌ Permiso rechazado', `Tu solicitud de ${permiso.tipo} fue rechazada.`);
        Alert.alert('❌ Rechazada', 'La solicitud fue rechazada.');
      }

      await cargarPermisos(usuario);
    } catch (e) { Alert.alert('Error', 'No se pudo actualizar: ' + e.message); }
    setCargando(false);
  };

  // ════════════════════════════════════════════════════════════════════════
  // HANDLER: MARCAR REGRESO (permisos por horas)
  // ════════════════════════════════════════════════════════════════════════
  const handleMarcarRegreso = async (permisoId) => {
    const permiso = permisos.find(p => p.id === permisoId);
    if (!permiso) return;
    const ahora             = new Date();
    const horaRegreso       = formatHora12(ahora);
    const horaRegresoISO    = ahora.toISOString();
    const tiempoRealMinutos = permiso.horaAprobacionISO ? diffMinutos(permiso.horaAprobacionISO, horaRegresoISO) : null;
    setCargando(true);
    try {
      await fsUpdate('permisos', permisoId, { horaRegreso, horaRegresoISO, ...(tiempoRealMinutos !== null ? { tiempoRealMinutos: String(tiempoRealMinutos) } : {}) });
      const aprobadores = usuarios.filter(u => u.codigo !== usuario.codigo && puedeAprobarA(u, usuario));
      await Promise.all(aprobadores.map(apr => Promise.all([
        crearNotificacion(apr.codigo, `⏱️ Regreso de permiso`, `${usuario.nombre} regresó a las ${horaRegreso}.`),
        apr.pushToken ? enviarNotificacion(apr.pushToken, '⏱️ Regreso', `${usuario.nombre} regresó`) : Promise.resolve(),
      ])));
      await cargarPermisos(usuario);
      Alert.alert('✅ Registrado', `Hora de regreso: ${horaRegreso}${tiempoRealMinutos !== null ? `\nTiempo real: ${tiempoRealMinutos} min` : ''}`);
    } catch (e) { Alert.alert('Error', e.message); }
    setCargando(false);
  };

  // ════════════════════════════════════════════════════════════════════════
  // HANDLER: DESCUENTO DE HORAS
  // ════════════════════════════════════════════════════════════════════════
  const handleDescuentoHoras = async (permisoId, descuento) => {
    const permiso = permisos.find(p => p.id === permisoId);
    if (!permiso) return;
    if (!permiso.horaRegreso) { Alert.alert('Aviso', 'Espera a que el empleado marque su regreso primero.'); return; }
    setCargando(true);
    try {
      const diasADescontar = descuento === 'medio' ? 0.5 : descuento === 'completo' ? 1 : 0;
      await fsUpdate('permisos', permisoId, {
        descuentoHoras:    descuento !== 'no' ? 'si' : 'no',
        diasDescontados:   String(diasADescontar),
        descuentoResuelto: 'true',
      });
      if (diasADescontar > 0) {
        const empleado = await buscarEmpleadoFS(permiso.codigo);
        if (!empleado || empleado.dias === null) {
          Alert.alert('Error', 'No se pudo leer el saldo del empleado. Intenta de nuevo.');
          setCargando(false); return;
        }
        const nuevosDias = aplicarDescuento(permiso.codigo, empleado.id, empleado.dias, diasADescontar);
        console.log(`Descuento horas: ${diasADescontar} días. Nuevo saldo: ${nuevosDias}`);
      }
      const labels = { no: 'sin descuento', medio: 'con descuento de ½ día', completo: 'con descuento de 1 día completo' };
      await crearNotificacion(permiso.codigo, '⏱️ Permiso por horas resuelto', `Tu permiso de horas fue resuelto ${labels[descuento]}.`);
      await cargarPermisos(usuario);
      Alert.alert('✅', `Permiso resuelto ${labels[descuento]}`);
    } catch (e) { Alert.alert('Error', e.message); }
    setCargando(false);
  };

  // ════════════════════════════════════════════════════════════════════════
  // HANDLER: SUSPENSIÓN IGSS
  // Nueva funcionalidad: registra una suspensión médica del IGSS.
  // No descuenta vacaciones. Solo queda registrado para auditoría y reportes.
  // El jefe puede aprobar, rechazar o marcar como finalizada la suspensión.
  // ════════════════════════════════════════════════════════════════════════
  const handleEnviarSuspensionIGSS = async ({
    codigoEmpleado,
    nombreEmpleado,
    cargoEmpleado,
    rolEmpleado,
    departamentoEmpleado,
    fechaInicioSuspension,
    fechaFinSuspension,
    motivoSuspension,
    numeroBoleta,         // número de boleta/constancia del IGSS (opcional)
  }) => {
    const errorFecha = validarFechas(fechaInicioSuspension, fechaFinSuspension);
    if (errorFecha) { Alert.alert('Fecha inválida', errorFecha); return; }

    setCargando(true);
    try {
      await fsAdd('permisos', {
        nombre:       nombreEmpleado,
        codigo:       codigoEmpleado,
        cargo:        cargoEmpleado,
        rol:          rolEmpleado,
        departamento: departamentoEmpleado || '',
        tipo:         'Suspensión IGSS',
        fechaInicio:  fechaInicioSuspension,
        fechaFin:     fechaFinSuspension,
        motivo:       motivoSuspension,
        numeroBoleta: numeroBoleta || '',
        estado:       'Pendiente',
        // Campos clave: sin descuento jamás
        descuento:    'no',
        diasDescontados: '0',
        esSuspension: 'true',
      });

      // Notificar a aprobadores
      const aprobadores = usuarios.filter(u => u.codigo !== codigoEmpleado && puedeAprobarA(u, { codigo: codigoEmpleado, rol: rolEmpleado, departamento: departamentoEmpleado }));
      await Promise.all(aprobadores.map(apr => Promise.all([
        crearNotificacion(apr.codigo, `🏥 Suspensión IGSS`, `${nombreEmpleado} reporta suspensión IGSS del ${fechaInicioSuspension} al ${fechaFinSuspension}`),
        apr.pushToken ? enviarNotificacion(apr.pushToken, '🏥 Suspensión IGSS', `${nombreEmpleado} suspendido del ${fechaInicioSuspension} al ${fechaFinSuspension}`) : Promise.resolve(),
      ])));

      Alert.alert('✅ Registrado', `Suspensión IGSS registrada del ${fechaInicioSuspension} al ${fechaFinSuspension}.\nNo descuenta días de vacaciones.`);
      await cargarPermisos(codigoEmpleado === usuario?.codigo ? usuario : null);
    } catch (e) { Alert.alert('Error', 'No se pudo registrar la suspensión: ' + e.message); }
    setCargando(false);
  };

  const handleAprobarSuspensionIGSS = async (id) => {
    // Aprobar = confirmar que la constancia fue verificada. No descuenta nada.
    setCargando(true);
    try {
      const permiso = permisos.find(p => p.id === id);
      if (!permiso) { setCargando(false); return; }

      await fsUpdate('permisos', id, {
        estado:         'Aprobado',
        descuento:      'no',
        diasDescontados: '0',
        aprobadoPor:    usuario?.nombre ?? '',
        aprobadoPorId:  usuario?.id ?? '',
        fechaAprobacion: formatFechaHora(new Date()),
      });

      await crearNotificacion(
        permiso.codigo,
        '🏥 Suspensión IGSS confirmada',
        `Tu suspensión IGSS del ${permiso.fechaInicio} al ${permiso.fechaFin} fue registrada y confirmada. No se descontarán días de vacaciones.`,
      );

      Alert.alert('✅ Suspensión confirmada', `Suspensión de ${permiso.nombre} registrada correctamente.\nPeriodo: ${permiso.fechaInicio} → ${permiso.fechaFin}\nSin descuento de vacaciones.`);
      await cargarPermisos(usuario);
    } catch (e) { Alert.alert('Error', e.message); }
    setCargando(false);
  };

  const handleRechazarSuspensionIGSS = async (id) => {
    // Rechazar = constancia no válida o información incorrecta
    setCargando(true);
    try {
      const permiso = permisos.find(p => p.id === id);
      if (!permiso) { setCargando(false); return; }

      await fsUpdate('permisos', id, {
        estado:         'Rechazado',
        aprobadoPor:    usuario?.nombre ?? '',
        aprobadoPorId:  usuario?.id ?? '',
        fechaAprobacion: formatFechaHora(new Date()),
      });

      await crearNotificacion(
        permiso.codigo,
        '❌ Suspensión IGSS rechazada',
        `Tu suspensión IGSS del ${permiso.fechaInicio} al ${permiso.fechaFin} fue rechazada. Contacta a tu jefe para más información.`,
      );

      Alert.alert('❌ Rechazada', 'Suspensión rechazada. El empleado fue notificado.');
      await cargarPermisos(usuario);
    } catch (e) { Alert.alert('Error', e.message); }
    setCargando(false);
  };

  // Extender suspensión IGSS: si el médico la prolonga, se actualiza la fecha fin
  const handleExtenderSuspensionIGSS = async (id, nuevaFechaFin, nuevaBoleta = '') => {
    const errorFecha = REGEX_FECHA.test(nuevaFechaFin) ? null : 'Fecha inválida (DD/MM/AAAA)';
    if (errorFecha) { Alert.alert('Error', errorFecha); return; }

    setCargando(true);
    try {
      const permiso = permisos.find(p => p.id === id);
      if (!permiso) { setCargando(false); return; }

      await fsUpdate('permisos', id, {
        fechaFin:       nuevaFechaFin,
        ...(nuevaBoleta ? { numeroBoleta: nuevaBoleta } : {}),
        estado:         'Aprobado',           // se reactiva como aprobada
        descuento:      'no',
        diasDescontados: '0',
        fechaExtension: formatFechaHora(new Date()),
        extendidaPor:   usuario?.nombre ?? '',
      });

      await crearNotificacion(
        permiso.codigo,
        '🏥 Suspensión IGSS extendida',
        `Tu suspensión IGSS fue extendida hasta el ${nuevaFechaFin}. Sin descuento de vacaciones.`,
      );

      Alert.alert('✅ Extendida', `Suspensión extendida hasta el ${nuevaFechaFin}.\nSin descuento de vacaciones.`);
      await cargarPermisos(usuario);
    } catch (e) { Alert.alert('Error', e.message); }
    setCargando(false);
  };

  // ════════════════════════════════════════════════════════════════════════
  // DERIVADOS
  // ════════════════════════════════════════════════════════════════════════
  const misPermisos = permisos.filter(p => p.codigo === usuario?.codigo);
  const permisosParaAprobar = permisos.filter(p => {
    if (p.codigo === usuario?.codigo) return false;
    if (usuario?.rol === 'dueno' || usuario?.rol === 'contralor') return true;
    const solicitante = usuarios.find(u => u.codigo === p.codigo);
    if (solicitante) return puedeAprobarA(usuario, solicitante);
    if (p.rol) return (p.departamento === usuario?.departamento && usuario?.rol === 'jefe' && p.rol === 'auxiliar');
    return p.departamento === usuario?.departamento;
  });
  const pendientesCount  = permisosParaAprobar.filter(p => p.estado === 'Pendiente').length;
  const puedeAprobar     = (JERARQUIA[usuario?.rol] ?? 0) > 0;
  const tieneAccesoAdmin = permisosAdmin.canCreateUsers || permisosAdmin.canLoadExcel || permisosAdmin.canAprobar || permisosAdmin.canGestionarFestivos;

  const TABS = puedeAprobar
    ? [
        { key: 'inicio',          icon: '🏠', label: 'Inicio'    },
        { key: 'aprobar',         icon: '👍', label: 'Aprobar'   },
        { key: 'nuevo',           icon: '📝', label: 'Solicitar' },
        { key: 'historial',       icon: '📋', label: 'Historial' },
        ...(tieneAccesoAdmin               ? [{ key: 'admin',           icon: '🔧', label: 'Admin'   }] : []),
        ...(permisosAdmin.canReporteDiario ? [{ key: 'reporte_diario', icon: '📊', label: 'Reporte' }] : []),
        { key: 'perfil',          icon: '👤', label: 'Perfil'    },
      ]
    : [
        { key: 'inicio',          icon: '🏠', label: 'Inicio'    },
        { key: 'nuevo',           icon: '📝', label: 'Solicitar' },
        { key: 'historial',       icon: '📋', label: 'Historial' },
        ...(tieneAccesoAdmin               ? [{ key: 'admin',           icon: '🔧', label: 'Admin'   }] : []),
        ...(permisosAdmin.canReporteDiario ? [{ key: 'reporte_diario', icon: '📊', label: 'Reporte' }] : []),
        { key: 'perfil',          icon: '👤', label: 'Perfil'    },
      ];

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  if (introVisible) return <IntroScreen onFinish={() => setIntroVisible(false)} />;
  if (modoPantalla === 'superadmin') return <SuperAdmin onSalir={() => setModoPantalla('app')} />;
  if (pantalla !== 'login' && !usuario) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#e94560" size="large" />
        <Text style={{ color: '#aaa', marginTop: 16, fontSize: 13 }}>Cargando sesión...</Text>
      </SafeAreaView>
    );
  }

  if (pantalla === 'login') return (
    <LoginScreen
      onLoginExitoso={(u, todosUsuarios) => {
        setUsuario(u);
        setUsuarios(todosUsuarios || []);
        setDiasDisponibles(parseFloat(u.dias) || 0);
        setFotoPerfil(u.fotoPerfil || u._fotoLocal || null);
        setPermisosAdmin({
          canCreateUsers:       u.canCreateUsers       === 'true',
          canLoadExcel:         u.canLoadExcel         === 'true',
          canAprobar:           u.canAprobar           === 'true',
          canGestionarFestivos: u.canGestionarFestivos === 'true',
          canReporteDiario:     u.canReporteDiario     === 'true',
        });
        setPantalla('app');
        setTabActivo('inicio');
        cargarPermisos(u);
        cargarNotificaciones(u);
        cargarFestivosSet().then(m => setFestivosMapState(m)).catch(() => {});
      }}
      onSuperAdmin={() => { setIntroVisible(false); setModoPantalla('superadmin'); }}
    />
  );

  return (
    <SafeAreaView style={[s.appContainer, { backgroundColor: T.fondo }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />

      {/* ── Header ── */}
      <View style={[s.appHeader, { backgroundColor: T.header, borderBottomColor: T.headerBorde }]}>
        <View style={s.appHeaderLeft}>
          <Image source={LOGO} style={{ width: 36, height: 36, borderRadius: 8 }} resizeMode="contain" />
          <View>
            <Text style={[s.appHeaderBrand, { color: AZUL }]}>comercios</Text>
            <Text style={[s.appHeaderBrandSub, { color: T.subTexto }]}>universales</Text>
          </View>
        </View>
        <View style={s.appHeaderRight}>
          <TouchableOpacity style={s.notifBtn} onPress={abrirPanelNotif}>
            <Text>🔔</Text>
            {(notifNoLeidas > 0 || pendientesCount > 0) && <View style={s.notifBadge}><Text style={s.notifBadgeText}>{notifNoLeidas || pendientesCount}</Text></View>}
          </TouchableOpacity>
          {fotoPerfil
            ? <Image source={{ uri: fotoPerfil }} style={{ width: 36, height: 36, borderRadius: 18 }} />
            : <View style={s.userChip}><Text style={s.userChipText}>{usuario.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</Text></View>
          }
        </View>
      </View>

      {/* ── Panel de notificaciones ── */}
      {panelNotif && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: T.tarjeta, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: T.borde }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: T.texto }}>🔔 Notificaciones</Text>
              <TouchableOpacity onPress={() => setPanelNotif(false)} style={{ padding: 6 }}><Text style={{ fontSize: 18, color: T.subTexto }}>✕</Text></TouchableOpacity>
            </View>
            {notifCargando ? <ActivityIndicator color={AZUL} style={{ margin: 30 }} /> : (
              <ScrollView style={{ padding: 16 }}>
                {notificaciones.length === 0 && <View style={{ alignItems: 'center', paddingVertical: 40 }}><Text style={{ fontSize: 32, marginBottom: 10 }}>🔕</Text><Text style={{ color: T.subTexto, fontSize: 14 }}>No tienes notificaciones</Text></View>}
                {notificaciones.map(n => (
                  <View key={n.id} style={{ backgroundColor: n.leido ? T.inputFondo : T.fondo, borderRadius: 14, padding: 14, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: n.leido ? T.borde : AZUL }}>
                    <Text style={{ fontWeight: '700', fontSize: 14, color: T.texto, marginBottom: 4 }}>{n.titulo}</Text>
                    <Text style={{ fontSize: 13, color: T.subTexto, marginBottom: 6 }}>{n.cuerpo}</Text>
                    <Text style={{ fontSize: 10, color: T.subTexto }}>{n.fecha ? new Date(n.fecha).toLocaleString('es-GT') : ''}{!n.leido && <Text style={{ color: AZUL, fontWeight: '700' }}>  · Nueva</Text>}</Text>
                  </View>
                ))}
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      )}

      {/* ── Contenido por tab ── */}
      <View style={{ flex: 1 }}>
        {tabActivo === 'inicio' && (
          <HomeScreen
            usuario={usuario} diasDisponibles={diasDisponibles} misPermisos={misPermisos}
            pendientesCount={pendientesCount} puedeAprobar={puedeAprobar} cargando={cargando} T={T}
            onIrANuevo={(tipo) => { setTipoSeleccionado(tipo); handleCambiarTab('nuevo'); }}
            onIrAHistorial={() => handleCambiarTab('historial')}
          />
        )}
        {tabActivo === 'nuevo' && (
          <SolicitudScreen
            tipoSeleccionado={tipoSeleccionado}   setTipoSeleccionado={setTipoSeleccionado}
            subtipoIGSS={subtipoIGSS}             setSubtipoIGSS={setSubtipoIGSS}
            fechaInicio={fechaInicio}             setFechaInicio={setFechaInicio}
            fechaFin={fechaFin}                   setFechaFin={setFechaFin}
            motivo={motivo}                       setMotivo={setMotivo}
            horasSolicitadas={horasSolicitadas}   setHorasSolicitadas={setHorasSolicitadas}
            duracionPersonal={duracionPersonal}   setDuracionPersonal={setDuracionPersonal}
            festivosMapState={festivosMapState}
            cargando={cargando} T={T}
            onEnviar={handleEnviar}
            onEnviarSuspensionIGSS={handleEnviarSuspensionIGSS}
            usuario={usuario}
          />
        )}
        {tabActivo === 'aprobar' && (
          <AprobarScreen
            usuario={usuario}
            permisosParaAprobar={permisosParaAprobar}
            cargando={cargando}
            festivosMapState={festivosMapState}
            T={T}
            onActualizar={() => cargarPermisos(usuario)}
            onCambiarEstado={handleCambiarEstado}
            onDescuentoHoras={handleDescuentoHoras}
            onAprobarSuspensionIGSS={handleAprobarSuspensionIGSS}
            onRechazarSuspensionIGSS={handleRechazarSuspensionIGSS}
            onExtenderSuspensionIGSS={handleExtenderSuspensionIGSS}
          />
        )}
        {tabActivo === 'historial' && (
          <HistorialScreen
            usuario={usuario} misPermisos={misPermisos} cargando={cargando}
            festivosMapState={festivosMapState} T={T}
            onActualizar={() => cargarPermisos(usuario)}
            onMarcarRegreso={handleMarcarRegreso}
          />
        )}
        {tabActivo === 'reporte' && (
          <ReporteScreen
            usuario={usuario} permisos={permisos} usuarios={usuarios} festivosMapState={festivosMapState}
          />
        )}
        {tabActivo === 'reporte_diario' && (
          <ReporteDiarioScreen permisos={permisos} usuarios={usuarios} />
        )}
        {tabActivo === 'admin' && (
          <AdminScreen permisosAdmin={permisosAdmin} />
        )}
        {tabActivo === 'perfil' && (
          <PerfilScreen
            usuario={usuario} diasDisponibles={diasDisponibles} fotoPerfil={fotoPerfil}
            misPermisos={misPermisos} temaActual={temaActual} T={T}
            onFotoActualizada={(url) => setFotoPerfil(url)}
            onCambiarTema={async () => {
              const nuevoTema = temaActual === 'claro' ? 'oscuro' : 'claro';
              setModoTema(nuevoTema);
              await AsyncStorage.setItem('tema_preferido', nuevoTema);
            }}
            onCerrarSesion={() => {
              AsyncStorage.removeItem('sesion_usuario');
              setUsuario(null); setPantalla('login'); setPermisos([]); setUsuarios([]); setFotoPerfil(null);
            }}
          />
        )}
      </View>

      {/* ── Bottom Nav ── */}
      <View style={[s.bottomNav, { backgroundColor: T.navFondo, borderTopColor: T.headerBorde }]}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab.key} style={s.navItem} onPress={() => handleCambiarTab(tab.key)}>
            <View style={[s.navIconBox, tabActivo === tab.key && s.navIconBoxActivo]}>
              <Text style={s.navIcon}>{tab.icon}</Text>
            </View>
            <Text style={[s.navLabel, { color: T.subTexto }, tabActivo === tab.key && s.navLabelActivo]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  appContainer:      { flex: 1, backgroundColor: '#F4F6FB', paddingBottom: 0 },
  appHeader:         { backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: Platform.OS === 'android' ? 12 : 8, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#EEF2FB' },
  appHeaderLeft:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appHeaderBrand:    { fontSize: 14, fontWeight: '800', color: AZUL, lineHeight: 16 },
  appHeaderBrandSub: { fontSize: 11, color: '#888', lineHeight: 14 },
  appHeaderRight:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifBtn:          { width: 36, height: 36, borderRadius: 10, backgroundColor: AZUL_CLARO, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notifBadge:        { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#EF5350', alignItems: 'center', justifyContent: 'center' },
  notifBadgeText:    { color: 'white', fontSize: 9, fontWeight: '700' },
  userChip:          { width: 36, height: 36, borderRadius: 18, backgroundColor: AZUL, alignItems: 'center', justifyContent: 'center' },
  userChipText:      { color: 'white', fontWeight: '700', fontSize: 13 },
  bottomNav:         { backgroundColor: 'white', flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#EEF2FB', paddingBottom: Platform.OS === 'ios' ? 4 : 40, paddingTop: 8 },
  navItem:           { flex: 1, alignItems: 'center', gap: 4 },
  navIconBox:        { width: 40, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navIconBoxActivo:  { backgroundColor: AZUL_CLARO },
  navIcon:           { fontSize: 18 },
  navLabel:          { fontSize: 10, color: '#aaa', fontWeight: '600' },
  navLabelActivo:    { color: AZUL },
});