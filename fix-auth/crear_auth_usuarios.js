/**
 * crear_auth_usuarios.js (v3)
 * ──────────────────────────
 * Crea usuarios en Firebase Auth usando la contraseña de Firestore.
 * Si tiene menos de 6 chars, rellena con "0" automáticamente.
 * La app hace lo mismo al login, así siempre coinciden.
 */

admin.initializeApp(); // Firebase lee el .env automáticamente

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db   = admin.firestore();
const auth = admin.auth();

const codeToEmail     = (code) => `${code.toLowerCase().trim()}@comercios.app`;
const normalizarPass  = (pass) => String(pass || '').trim().padEnd(6, '0');

async function crearUsuarios() {
  console.log('📋 Leyendo usuarios de Firestore...');
  const snapshot = await db.collection('usuarios').get();
  const usuarios = [];
  snapshot.forEach(doc => usuarios.push({ id: doc.id, ...doc.data() }));
  console.log(`✅ ${usuarios.length} usuarios encontrados\n`);

  let creados = 0, existentes = 0, errores = 0;

  for (const u of usuarios) {
    const email    = codeToEmail(u.codigo);
    const password = normalizarPass(u.password);

    try {
      await auth.createUser({ email, password, displayName: u.nombre || u.codigo });
      console.log(`✅ Creado: ${u.codigo} (pass Auth: "${password}")`);
      creados++;
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        // Ya existe — actualizar contraseña por si cambió
        try {
          const existing = await auth.getUserByEmail(email);
          await auth.updateUser(existing.uid, { password });
          console.log(`🔄 Actualizado: ${u.codigo}`);
          existentes++;
        } catch (e2) {
          console.log(`❌ Error actualizando ${u.codigo}: ${e2.message}`);
          errores++;
        }
      } else {
        console.log(`❌ Error con ${u.codigo}: ${err.message}`);
        errores++;
      }
    }
  }

  console.log('\n══════════════════════════════════');
  console.log(`✅ Creados:     ${creados}`);
  console.log(`🔄 Actualizados: ${existentes}`);
  console.log(`❌ Errores:     ${errores}`);
  console.log('══════════════════════════════════');
  console.log('\n🎉 Listo. Todos los usuarios pueden ingresar con su contraseña normal.');
  process.exit(0);
}

crearUsuarios().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
