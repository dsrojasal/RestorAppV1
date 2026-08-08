/* Seed de datos demo para la Carta (idempotente, no borra nada).
 * Inserta categorias, productos, ingredientes y recetas SOLO si no existen.
 * Uso: npm run seed:carta
 */
const path = require('path');
const { config } = require('dotenv');
const { Client } = require('pg');

config({ path: path.join(__dirname, '..', '.env') });

async function findId(client, table, column, value) {
  const res = await client.query(
    `SELECT id FROM ${table} WHERE ${column} = $1 LIMIT 1`,
    [value],
  );
  return res.rows.length ? res.rows[0].id : null;
}

const CATEGORIAS = ['Bebidas', 'Entradas', 'Fuertes', 'Postres'];

const INGREDIENTES = [
  ['Carne de res', 40, 10, 'kg'],
  ['Pollo', 30, 8, 'kg'],
  ['Arroz', 50, 12, 'kg'],
  ['Tomate', 20, 5, 'kg'],
  ['Cebolla', 25, 5, 'kg'],
  ['Papa', 35, 8, 'kg'],
  ['Lechuga', 12, 4, 'kg'],
  ['Pan de hamburguesa', 60, 15, 'und'],
  ['Queso', 15, 5, 'kg'],
  ['Crema de leche', 10, 3, 'lt'],
  ['Harina', 25, 8, 'kg'],
];

const PRODUCTOS = [
  ['Lomo Saltado', 25000, 'plato', 'Fuertes', 30, 5, true],
  ['Hamburguesa Clásica', 18000, 'plato', 'Fuertes', 25, 4, true],
  ['Papas Fritas', 12000, 'plato', 'Entradas', 4, 5, true], // stock bajo de ejemplo
  ['Ensalada César', 14000, 'plato', 'Entradas', 10, 3, true],
  ['Coca-Cola 1L', 5000, 'bebida', 'Bebidas', 12, 5, true], // sin receta
  ['Limonada', 4000, 'bebida', 'Bebidas', 10, 4, true],
  ['Agua 500 ml', 2500, 'bebida', 'Bebidas', 20, 6, true],
  ['Helado de Vainilla', 6000, 'postre', 'Postres', 8, 3, true], // sin receta
  ['Flan', 5500, 'postre', 'Postres', 12, 3, true],
];

// Recetas: [nombreProducto, nombreIngrediente, cantidad]  — opcionales por plato
const RECETAS = [
  ['Lomo Saltado', 'Carne de res', 0.25],
  ['Lomo Saltado', 'Cebolla', 0.1],
  ['Lomo Saltado', 'Tomate', 0.05],
  ['Lomo Saltado', 'Arroz', 0.12],
  ['Hamburguesa Clásica', 'Carne de res', 0.2],
  ['Hamburguesa Clásica', 'Pan de hamburguesa', 1],
  ['Hamburguesa Clásica', 'Queso', 0.05],
  ['Hamburguesa Clásica', 'Tomate', 0.02],
  ['Hamburguesa Clásica', 'Lechuga', 0.03],
  ['Papas Fritas', 'Papa', 0.15],
];

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
  console.log('Conectado a la base de datos.');

  const creados = [];

  // Categorias
  for (const nombre of CATEGORIAS) {
    let id = await findId(client, 'categoria', 'nombre', nombre);
    if (!id) {
      const r = await client.query(
        'INSERT INTO categoria (nombre, descripcion, "isActive") VALUES ($1, $2, true) RETURNING id',
        [nombre, null],
      );
      id = r.rows[0].id;
      creados.push(`categoria: ${nombre}`);
    }
  }

  // Ingredientes
  for (const [nombre, stock, min, unidad] of INGREDIENTES) {
    const id = await findId(client, 'ingrediente', 'nombre', nombre);
    if (!id) {
      await client.query(
        'INSERT INTO ingrediente (nombre, stock, "stockMinimo", unidad) VALUES ($1, $2, $3, $4)',
        [nombre, stock, min, unidad],
      );
      creados.push(`ingrediente: ${nombre}`);
    }
  }

  // Productos
  for (const [nombre, precio, tipo, categoriaNombre, stock, min, active] of PRODUCTOS) {
    const id = await findId(client, 'producto', 'nombre', nombre);
    if (!id) {
      const catId = await findId(client, 'categoria', 'nombre', categoriaNombre);
      await client.query(
        `INSERT INTO producto (nombre, precio, tipo, stock, "stockMinimo", "isActive", "categoriaId")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [nombre, precio, tipo, stock, min, active, catId],
      );
      creados.push(`producto: ${nombre}`);
    }
  }

  // Recetas (identificador único compuesto productoId + ingredienteId)
  for (const [productoNombre, ingredienteNombre, cantidad] of RECETAS) {
    const productoId = await findId(client, 'producto', 'nombre', productoNombre);
    const ingredienteId = await findId(client, 'ingrediente', 'nombre', ingredienteNombre);
    if (!productoId || !ingredienteId) continue;
    const existe = await client.query(
      'SELECT id FROM producto_ingrediente WHERE "productoId" = $1 AND "ingredienteId" = $2 LIMIT 1',
      [productoId, ingredienteId],
    );
    if (!existe.rows.length) {
      await client.query(
        'INSERT INTO producto_ingrediente ("productoId", "ingredienteId", cantidad) VALUES ($1, $2, $3)',
        [productoId, ingredienteId, cantidad],
      );
      creados.push(`receta: ${productoNombre} -> ${ingredienteNombre} (${cantidad})`);
    }
  }

  const count = await client.query(
    'SELECT (SELECT count(*) FROM categoria) AS c, (SELECT count(*) FROM producto) AS p, (SELECT count(*) FROM ingrediente) AS i, (SELECT count(*) FROM producto_ingrediente) AS r',
  );
  const c = count.rows[0];

  console.log(`\nResumen en base de datos: ${c.c} categorias, ${c.p} productos, ${c.i} ingredientes, ${c.r} recetas.`);
  if (creados.length) {
    console.log(`Creados ahora (${creados.length}):`);
    creados.forEach((x) => console.log('  + ' + x));
  } else {
    console.log('Nada que crear: todos los datos demo ya existian.');
  }

  await client.end();
}

main().catch((err) => {
  console.error('Error en el seed:', err.message);
  process.exit(1);
});