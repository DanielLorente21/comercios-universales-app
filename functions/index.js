// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const serviceAccount = require("./permisoapplorenti-3299b5f2d4f6.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const DIAS_POR_MES = 1.25;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: avanzar exactamente un mes respetando el día de ingreso.
// Evita overflow de setMonth() en meses cortos.
// Ej: avanzarUnMes(2026,1,31) → { anio:2026, mes:2, dia:28 }  (NO 3 de marzo)
// ═══════════════════════════════════════════════════════════════════════════
function avanzarUnMes(anio, mes, diaIngreso) {
  let nuevoMes  = mes + 1;
  let nuevoAnio = anio;
  if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio++; }
  const ultimoDiaDestino = new Date(nuevoAnio, nuevoMes, 0).getDate();
  const diaReal          = Math.min(diaIngreso, ultimoDiaDestino);
  return { anio: nuevoAnio, mes: nuevoMes, dia: diaReal };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: suma de días sin errores de punto flotante.
// ═══════════════════════════════════════════════════════════════════════════
function sumarDias(actual, ganados) {
  return (Math.round(actual * 100) + Math.round(ganados * 100)) / 100;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: parsear fechaIngreso "DD/MM/YYYY" → { dia, mes, anio } | null
// ═══════════════════════════════════════════════════════════════════════════
function parsearFechaIngreso(fechaStr) {
  if (!fechaStr) return null;
  const partes = String(fechaStr).split("/");
  if (partes.length !== 3) return null;
  const dia  = parseInt(partes[0], 10);
  const mes  = parseInt(partes[1], 10);
  const anio = parseInt(partes[2], 10);
  if (isNaN(dia) || isNaN(mes) || isNaN(anio)) return null;
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12 || anio < 2000) return null;
  return { dia, mes, anio };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: parsear ultimaAcumulacion "YYYY-MM" o "YYYY-MM-DD" → { anio, mes }
// ═══════════════════════════════════════════════════════════════════════════
function parsearUltimaAcumulacion(str) {
  if (!str) return null;
  const partes = String(str).split("-");
  if (partes.length < 2) return null;
  const anio = parseInt(partes[0], 10);
  const mes  = parseInt(partes[1], 10);
  if (isNaN(anio) || isNaN(mes) || mes < 1 || mes > 12) return null;
  return { anio, mes };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Notificar a aprobadores cuando se crea un nuevo permiso
// ═══════════════════════════════════════════════════════════════════════════
exports.notificarNuevoPermiso = functions.firestore
  .document("permisos/{permisoId}")
  .onCreate(async (snap, context) => {
    try {
      const permiso = snap.data();
      const usuariosSnap = await db.collection("usuarios")
        .where("rol", "in", ["dueno", "contralor", "jefe"])
        .get();
      const aprobadores = usuariosSnap.docs
        .map((doc) => doc.data())
        .filter((u) =>
          u.pushToken &&
          u.codigo !== permiso.codigo &&
          (u.rol !== "jefe" || u.departamento === permiso.departamento)
        );
      await Promise.all(aprobadores.map((apr) =>
        admin.messaging().send({
          token: apr.pushToken,
          notification: {
            title: "📋 Nueva solicitud de permiso",
            body: `${permiso.nombre} solicitó ${permiso.tipo}`,
          },
          android: { priority: "high" },
        }).catch((e) => console.log("Error push aprobador", apr.codigo, ":", e.message))
      ));
    } catch (e) {
      console.error("notificarNuevoPermiso ERROR:", e.message);
    }
    return null;
  });

// ═══════════════════════════════════════════════════════════════════════════
// 2. Notificar al empleado cuando cambia el estado de su permiso
// ═══════════════════════════════════════════════════════════════════════════
exports.notificarCambioEstado = functions.firestore
  .document("permisos/{permisoId}")
  .onUpdate(async (change, context) => {
    try {
      const antes   = change.before.data();
      const despues = change.after.data();
      if (antes.estado === despues.estado) return null;
      const usuariosSnap = await db.collection("usuarios")
        .where("codigo", "==", despues.codigo)
        .limit(1)
        .get();
      if (usuariosSnap.empty) return null;
      const solicitante = usuariosSnap.docs[0].data();
      if (!solicitante.pushToken) return null;
      const emoji   = despues.estado === "Aprobado" ? "✅" : "❌";
      const mensaje = despues.estado === "Aprobado"
        ? `Tu solicitud de ${despues.tipo} fue aprobada`
        : `Tu solicitud de ${despues.tipo} fue rechazada`;
      await admin.messaging().send({
        token: solicitante.pushToken,
        notification: { title: `${emoji} Permiso ${despues.estado}`, body: mensaje },
        android: { priority: "high" },
      }).catch((e) => console.log("Error push empleado:", e.message));
    } catch (e) {
      console.error("notificarCambioEstado ERROR:", e.message);
    }
    return null;
  });

// ═══════════════════════════════════════════════════════════════════════════
// 3. Gestión de usuarios con privilegios de administrador
// ═══════════════════════════════════════════════════════════════════════════
exports.gestionarUsuarioAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debe estar autenticado.");
  }
  const { uid, email, password, nombre, codigo, rol, departamento, dias } = data;
  try {
    let userRecord;
    if (uid) {
      userRecord = await admin.auth().updateUser(uid, { password });
    } else {
      userRecord = await admin.auth().createUser({ email, password, displayName: nombre });
    }
    await db.collection("usuarios").doc(userRecord.uid).set({
      nombre, codigo, rol, departamento, dias,
      uid: userRecord.uid,
      ultimaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { success: true, uid: userRecord.uid };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Acumulación automática de días por aniversario mensual individual
//    Corre todos los días a las 06:00 hora Guatemala.
//
// LÓGICA:
//   • Cada empleado acumula 1.25 días el día del mes en que ingresó.
//   • Si su día de ingreso no existe en el mes actual (ej. ingresó el 31
//     y el mes tiene 28 días), acumula el último día real del mes.
//   • Si ya acumuló este mes, no vuelve a acumular (idempotente).
//   • Si se saltó meses por downtime, los recupera todos de una vez.
//
// FIXES aplicados:
//   FIX-1: ultimaAcumulacion se guarda YYYY-MM-DD para lectura exacta.
//   FIX-2: avanzarUnMes() evita overflow de setMonth() en meses cortos.
//   FIX-3: sumarDias() usa aritmética ×100 para evitar errores flotantes.
//   FIX-4: try/catch por empleado → error en uno NO aborta a los demás.
//   FIX-5: Hora 06:00 GT (= 12:00 UTC) evita ambigüedad de fecha en UTC.
//   FIX-6: Helpers de parsing con validación robusta contra NaN silencioso.
//   FIX-7: Log de auditoría en try/catch propio para no revertir el batch.
// ═══════════════════════════════════════════════════════════════════════════
exports.acumularDiasIndividualAuto = functions.pubsub
  .schedule("every day 06:00")           // FIX-5: 06:00 GT = 12:00 UTC, fecha segura
  .timeZone("America/Guatemala")
  .onRun(async (context) => {
    console.log("📅 Iniciando acumulación de días...");

    const hoy          = new Date();
    const diaHoy       = hoy.getDate();
    const mesHoy       = hoy.getMonth() + 1;   // 1–12
    const anioHoy      = hoy.getFullYear();
    const ultimoDiaMes = new Date(anioHoy, mesHoy, 0).getDate();

    // Candidatos: el día exacto + días 29/30/31 si hoy es fin de mes
    // (para procesar empleados cuyo día de ingreso no existe este mes)
    const diasCandidatos = [diaHoy];
    if (diaHoy === ultimoDiaMes) {
      for (let d = ultimoDiaMes + 1; d <= 31; d++) diasCandidatos.push(d);
    }

    // Filtro optimizado por diaIngreso. Fallback a todos si el índice no existe.
    let usuariosSnapshot;
    try {
  usuariosSnapshot = await db.collection("usuarios")
    .where("diaIngreso", "in", diasCandidatos)
    .get();
  console.log(`🎯 Filtrado por diaIngreso: ${usuariosSnapshot.size} candidatos`);
  if (usuariosSnapshot.size === 0) {
    console.log("⚠️ Sin candidatos por diaIngreso — fallback a todos los usuarios");
    usuariosSnapshot = await db.collection("usuarios").get();
  }
} catch (e) {
  console.log("⚠️ Fallback — leyendo todos los usuarios:", e.message);
  usuariosSnapshot = await db.collection("usuarios").get();
}try {
  usuariosSnapshot = await db.collection("usuarios")
    .where("diaIngreso", "in", diasCandidatos)
    .get();
  console.log(`🎯 Filtrado por diaIngreso: ${usuariosSnapshot.size} candidatos`);
  if (usuariosSnapshot.size === 0) {
    console.log("⚠️ Sin candidatos por diaIngreso — fallback a todos los usuarios");
    usuariosSnapshot = await db.collection("usuarios").get();
  }
} catch (e) {
  console.log("⚠️ Fallback — leyendo todos los usuarios:", e.message);
  usuariosSnapshot = await db.collection("usuarios").get();
}
    let batch           = db.batch();
    let totalProcesados = 0;
    let totalOmitidos   = 0;
    let totalErrores    = 0;
    let counter         = 0;

    for (const doc of usuariosSnapshot.docs) {
      const u = doc.data();

      try {
        // ── FIX-6: Parsear fecha de ingreso con validación robusta ───────
        const fi = parsearFechaIngreso(u.fechaIngreso);
        if (!fi) {
          console.log(`⚠️ ${u.nombre || u.codigo}: fechaIngreso inválida → "${u.fechaIngreso}", omitido`);
          totalOmitidos++;
          continue;
        }
        const { dia: diaIng, mes: mesIng, anio: anioIng } = fi;

        // ── Verificar si hoy es el día de aniversario de este empleado ───
        const diaEfectivo = Math.min(diaIng, ultimoDiaMes);
        if (diaHoy !== diaEfectivo) continue;

        // ── No acumular en el mismo mes de ingreso ───────────────────────
        if (anioHoy === anioIng && mesHoy === mesIng) {
          console.log(`📅 ${u.nombre || u.codigo}: ingresó este mes, aún no acumula`);
          totalOmitidos++;
          continue;
        }

        // ── Determinar desde qué mes empezar a contar ────────────────────
        let cursorAnio, cursorMes;
        const ult = parsearUltimaAcumulacion(u.ultimaAcumulacion);
        if (ult) {
          // Siguiente mes después de la última acumulación registrada
          const sig  = avanzarUnMes(ult.anio, ult.mes, diaIng);
          cursorAnio = sig.anio;
          cursorMes  = sig.mes;
        } else {
          // Primera vez: empezar desde el mes siguiente al de ingreso
          const sig  = avanzarUnMes(anioIng, mesIng, diaIng);
          cursorAnio = sig.anio;
          cursorMes  = sig.mes;
        }

        // ── Contar meses pendientes hasta hoy (inclusive) ────────────────
        let mesesPendientes = 0;
        let tempAnio        = cursorAnio;
        let tempMes         = cursorMes;

        while (true) {
          if (tempAnio > anioHoy) break;
          if (tempAnio === anioHoy && tempMes > mesHoy) break;
          mesesPendientes++;
          const sig = avanzarUnMes(tempAnio, tempMes, diaIng);
          tempAnio  = sig.anio;
          tempMes   = sig.mes;
        }

        if (mesesPendientes <= 0) {
          console.log(`📅 ${u.nombre || u.codigo}: ya está al día, sin meses pendientes`);
          totalOmitidos++;
          continue;
        }

        // ── FIX-6: Validar que el campo dias sea numérico ────────────────
        const diasActuales = parseFloat(u.dias);
        if (isNaN(diasActuales)) {
          console.log(`⚠️ ${u.nombre || u.codigo}: campo "dias" inválido → "${u.dias}", omitido`);
          totalOmitidos++;
          continue;
        }

        // ── FIX-3: Calcular con aritmética ×100 para evitar flotantes ────
        const diasGanados = mesesPendientes * DIAS_POR_MES;
        const nuevosDias  = sumarDias(diasActuales, diasGanados);

        // ── FIX-1: Guardar ultimaAcumulacion con día exacto YYYY-MM-DD ───
        const nuevaUltimaAcum =
          `${anioHoy}-${String(mesHoy).padStart(2, "0")}-${String(diaEfectivo).padStart(2, "0")}`;

        batch.update(doc.ref, {
          dias:              nuevosDias,
          ultimaAcumulacion: nuevaUltimaAcum,
          diaIngreso:        diaIng,   // asegurar campo para consultas optimizadas futuras
        });

        totalProcesados++;
        counter++;

        console.log(
          `✅ ${u.nombre || u.codigo}` +
          ` | ingreso: ${u.fechaIngreso}` +
          ` | +${diasGanados} días (${mesesPendientes} mes${mesesPendientes !== 1 ? "es" : ""})` +
          ` | ${diasActuales} → ${nuevosDias}` +
          ` | ultimaAcum: ${nuevaUltimaAcum}`
        );

        // Firestore: máx 500 ops por batch, usamos 450 como límite seguro
        if (counter >= 450) {
          await batch.commit();
          console.log(`💾 Batch parcial commiteado: ${counter} operaciones`);
          batch   = db.batch();
          counter = 0;
        }

      } catch (errEmpleado) {
        // FIX-4: Error en un empleado no aborta al resto
        console.error(`❌ Error procesando empleado ${u.nombre || u.codigo}:`, errEmpleado.message);
        totalErrores++;
      }
    }

    // Commit del batch final
    if (counter > 0) {
      await batch.commit();
      console.log(`💾 Batch final commiteado: ${counter} operaciones`);
    }

    console.log(
      `📊 Acumulación completada` +
      ` | ✅ Procesados: ${totalProcesados}` +
      ` | ⏭️  Omitidos: ${totalOmitidos}` +
      ` | ❌ Errores: ${totalErrores}`
    );

    // FIX-7: Log de auditoría en try/catch propio — no revierte el batch si falla
    try {
      await db.collection("logs_acumulacion").add({
        fecha:        admin.firestore.FieldValue.serverTimestamp(),
        fechaLegible: `${String(diaHoy).padStart(2, "0")}/${String(mesHoy).padStart(2, "0")}/${anioHoy}`,
        procesados:   totalProcesados,
        omitidos:     totalOmitidos,
        errores:      totalErrores,
        tipo:         "acumulacion_aniversario",
      });
    } catch (logErr) {
      console.error("⚠️ No se pudo guardar log de auditoría:", logErr.message);
    }

    return null;
  });