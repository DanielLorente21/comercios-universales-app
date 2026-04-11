/**
 * migrarFotosCloudinary.js
 * Migra todas las fotos base64 guardadas en Firestore hacia Cloudinary.
 * Después actualiza cada documento en Firestore con la URL de Cloudinary.
 *
 * USO:
 *   node migrarFotosCloudinary.js
 *
 * REQUIERE: Node 18+ (fetch nativo)
 * SEGURO:   Si falla a mitad, puedes volver a correrlo — detecta fotos ya migradas.
 */

// ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
const FIRESTORE_PROJECT_ID = 'permisoapplorenti';
const FIRESTORE_API_KEY    = 'AIzaSyCu8hGmT1NYWipG4pPO-QVfI_tXzRxs1eg';
const CLOUDINARY_CLOUD     = 'djejwknpe';
const CLOUDINARY_PRESET    = 'empleados_cu';
// ─────────────────────────────────────────────────────────────────────────────

const DB_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents`;

// ── Leer todos los usuarios de Firestore ──────────────────────────────────────
async function leerTodosUsuarios() {
  let todos = [], pageToken = null;
  do {
    const url = pageToken
      ? `${DB_URL}/usuarios?key=${FIRESTORE_API_KEY}&pageSize=300&pageToken=${pageToken}`
      : `${DB_URL}/usuarios?key=${FIRESTORE_API_KEY}&pageSize=300`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.documents) todos = todos.concat(data.documents);
    pageToken = data.nextPageToken ?? null;
  } while (pageToken);
  return todos;
}

// ── Subir base64 a Cloudinary ─────────────────────────────────────────────────
async function subirACloudinary(base64, publicId) {
  const formData = new FormData();
  formData.append('file', `data:image/jpeg;base64,${base64}`);
  formData.append('upload_preset', CLOUDINARY_PRESET);
  formData.append('public_id', publicId);
  formData.append('folder', 'empleados');

  const res  = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: 'POST', body: formData }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.secure_url;
}

// ── Actualizar URL en Firestore ───────────────────────────────────────────────
async function actualizarFotoEnFirestore(docId, url) {
  const mask = 'updateMask.fieldPaths=fotoPerfil';
  const res  = await fetch(`${DB_URL}/usuarios/${docId}?${mask}&key=${FIRESTORE_API_KEY}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { fotoPerfil: { stringValue: url } } }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
}

// ── Helper: extraer valor de campo Firestore ──────────────────────────────────
function getField(fields, key) {
  const f = fields?.[key];
  if (!f) return null;
  return f.stringValue ?? f.integerValue ?? f.doubleValue ?? null;
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('════════════════════════════════════════════════');
  console.log('  MIGRACIÓN DE FOTOS: Firestore → Cloudinary');
  console.log('  Comercios Universales');
  console.log('════════════════════════════════════════════════\n');

  console.log('Leyendo usuarios de Firestore...');
  const docs = await leerTodosUsuarios();
  console.log(`Total usuarios encontrados: ${docs.length}\n`);

  let migradas    = 0;
  let yaEnCloud   = 0;
  let sinFoto     = 0;
  let errores     = 0;

  for (let i = 0; i < docs.length; i++) {
    const doc    = docs[i];
    const docId  = doc.name.split('/').pop();
    const fields = doc.fields;
    const codigo = getField(fields, 'codigo') ?? docId;
    const nombre = getField(fields, 'nombre') ?? 'Sin nombre';
    const foto   = getField(fields, 'fotoPerfil');

    process.stdout.write(`[${i + 1}/${docs.length}] ${nombre.padEnd(35)} `);

    // Sin foto
    if (!foto) {
      sinFoto++;
      console.log('— sin foto');
      continue;
    }

    // Ya migrada (es una URL de Cloudinary o cualquier URL https)
    if (foto.startsWith('https://res.cloudinary.com')) {
      yaEnCloud++;
      console.log('— ya en Cloudinary, omitiendo');
      continue;
    }

    // Es una URL de Firebase Storage (no base64) — actualizar referencia pero no migrar
    if (foto.startsWith('https://firebasestorage')) {
      yaEnCloud++;
      console.log('— URL Firebase Storage, omitiendo');
      continue;
    }

    // Es base64 — migrar
    if (foto.startsWith('data:image') || foto.length > 1000) {
      try {
        // Extraer solo el base64 puro si viene con el prefijo data:image/...;base64,
        const b64 = foto.includes(',') ? foto.split(',')[1] : foto;
        const publicId = `empleado_${codigo}`;

        const url = await subirACloudinary(b64, publicId);
        await actualizarFotoEnFirestore(docId, url);

        migradas++;
        console.log(`✅ migrada → ${url.split('/').pop()}`);
      } catch (e) {
        errores++;
        console.log(`❌ ERROR: ${e.message}`);
      }

      // Pausa pequeña para no saturar Cloudinary
      await new Promise(r => setTimeout(r, 200));
      continue;
    }

    // Otro formato desconocido
    sinFoto++;
    console.log('— formato desconocido, omitiendo');
  }

  console.log('\n════════════════════════════════════════════════');
  console.log('  RESUMEN');
  console.log('════════════════════════════════════════════════');
  console.log(`  ✅ Migradas exitosamente : ${migradas}`);
  console.log(`  ☁️  Ya estaban en cloud   : ${yaEnCloud}`);
  console.log(`  👤 Sin foto              : ${sinFoto}`);
  console.log(`  ❌ Errores               : ${errores}`);
  console.log('════════════════════════════════════════════════');

  if (errores > 0) {
    console.log('\n⚠️  Hubo errores. Puedes volver a correr el script —');
    console.log('   los que ya se migraron serán omitidos automáticamente.');
  } else {
    console.log('\n🎉 Migración completa. Ya puedes limpiar los base64 de Firestore.');
    console.log('   El almacenamiento se reducirá en tu próxima factura.');
  }
}

main().catch(e => {
  console.error('Error fatal:', e.message);
  process.exit(1);
});
