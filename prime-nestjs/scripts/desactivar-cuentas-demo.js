/*
 * Desactiva las cuentas demo (correos terminados en .demo@restorapp.co).
 *
 * Por defecto SOLO muestra lo que haría (modo simulación).
 * Para aplicarlo de verdad:
 *
 *   node scripts/desactivar-cuentas-demo.js --aplicar
 *
 * No borra usuarios: solo pone isActive = false. Se pueden reactivar desde
 * la pantalla Usuarios o con el endpoint /usuarios/:id/toggle-active.
 */
const path = require('path');
const { config } = require('dotenv');
const { Client } = require('pg');

config({ path: path.join(__dirname, '..', '.env') });

const APLICAR = process.argv.includes('--aplicar');
const PATRON = '%.demo@restorapp.co';

async function main() {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT) || 5432,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  await client.connect();
  try {
    const { rows } = await client.query(
      'SELECT id, email FROM usuario WHERE email LIKE $1 AND "isActive" = true ORDER BY id',
      [PATRON],
    );

    if (rows.length === 0) {
      console.log('No hay cuentas demo activas. Nada que hacer.');
      return;
    }

    console.log(`Cuentas demo activas encontradas: ${rows.length}`);
    for (const r of rows) console.log(`  #${r.id} ${r.email}`);

    if (!APLICAR) {
      console.log('\nModo simulación. No se cambió nada.');
      console.log('Para desactivarlas ejecuta: node scripts/desactivar-cuentas-demo.js --aplicar');
      return;
    }

    const ids = rows.map((r) => r.id);
    await client.query('UPDATE usuario SET "isActive" = false WHERE id = ANY($1::int[])', [ids]);
    console.log(`\nDesactivadas ${ids.length} cuentas demo.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
