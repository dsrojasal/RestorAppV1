/* Usuarios demo con contraseña conocida (idempotente, no modifica los existentes).
 * Uso: npm run seed:usuarios-demo
 *  admin@restorapp.co   / Admin1234   (rol Administrador)
 *  mesero@restorapp.co  / Mesero1234  (rol Mesero)
 *  chef@restorapp.co    / Chef1234    (rol Chef)
 *  cajero@restorapp.co  / Cajero1234  (rol Cajero)
 */
const path = require('path');
const { config } = require('dotenv');
const { hashSync } = require('bcryptjs');
const { Client } = require('pg');

config({ path: path.join(__dirname, '..', '.env') });

const USUARIOS = [
  ['Admin Demo', 'admin.demo@restorapp.co', 'Admin1234!', 'Administrador'],
  ['Mesero Demo', 'mesero@restorapp.co', 'Mesero1234!', 'Mesero'],
  ['Chef Demo', 'chef@restorapp.co', 'Chef1234!', 'Chef'],
  ['Cajero Demo', 'cajero@restorapp.co', 'Cajero1234!', 'Cajero'],
];

async function findRoleId(client, nombre) {
  const res = await client.query('SELECT id FROM rol WHERE nombre = $1 LIMIT 1', [nombre]);
  return res.rows.length ? res.rows[0].id : null;
}

async function main() {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT) || 5432,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    connectionTimeoutMillis: 8000,
  });

  await client.connect();

  const creados = [];
  for (const [name, email, password, rolNombre] of USUARIOS) {
    const existe = await client.query('SELECT id FROM usuario WHERE email = $1 LIMIT 1', [email]);
    if (existe.rows.length) {
      console.log(`  = ${email} ya existe (se omite)`);
      continue;
    }
    const rolId = await findRoleId(client, rolNombre);
    if (!rolId) {
      console.log(`  ! No existe el rol '${rolNombre}', se omite ${email}`);
      continue;
    }
    await client.query(
      'INSERT INTO usuario (name, email, password, "isActive", "rolId") VALUES ($1, $2, $3, true, $4)',
      [name, email, hashSync(password, 10), rolId],
    );
    creados.push(`${email} / ${password} (${rolNombre})`);
  }

  console.log('Usuarios demo:');
  if (creados.length) creados.forEach((c) => console.log('  + ' + c));
  else console.log('  (no se creó ninguno, ya todos existían)');

  await client.end();
}

main().catch((err) => {
  console.error('Error en seed de usuarios:', err.message);
  process.exit(1);
});