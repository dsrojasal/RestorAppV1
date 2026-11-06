<p align="center">
  <img src="logo.svg" width="88" height="88" alt="RestorApp API">
</p>

<h1 align="center">RestorApp API</h1>

<p align="center">
  Backend REST + WebSocket de RestorApp<br>
  NestJS 11 · TypeORM · PostgreSQL · Socket.io
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-11-e0234e?style=flat-square" alt="NestJS 11">
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square" alt="TypeScript 5">
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square" alt="PostgreSQL 16">
  <img src="https://img.shields.io/badge/Socket.io-4-010101?style=flat-square" alt="Socket.io 4">
  <img src="https://img.shields.io/badge/licencia-Propietaria%20%2B%20MIT-red?style=flat-square" alt="Licencia propietaria + MIT">
</p>

---

## ¿Qué es?

API del sistema de gestión para restaurantes RestorApp. Expone endpoints REST
para pedidos, mesas, cocina, caja, facturación, inventario, compras, reportes
y usuarios, además de un gateway Socket.io para mantener las pantallas
sincronizadas en tiempo real.

El frontend vive en [`../restorapp-nextjs/`](../restorapp-nextjs/README.md) y
la documentación completa en [`../documentacion/`](../documentacion/README.md).

---

## Alcance

- Autenticación JWT **RS256** con cookie httpOnly y roles.
- CRUD de usuarios, roles, categorías, productos, ingredientes y recetas.
- Mesas, reservas y control de ocupación.
- Pedidos con líneas, estados, transferencia y cobro.
- Facturas con IVA, propina, pago mixto y anulación.
- Turnos de caja con apertura, personal, movimientos y arqueo.
- Inventario con reserva, consumo, reabastecimiento y ajustes.
- Proveedores, órdenes de compra y entradas de stock.
- Dashboard y reportes de ventas, productos, insumos y meseros.
- Notificaciones internas y tareas programadas.
- Tiempo real por Socket.io.

No incluye facturación electrónica DIAN, multi-sucursal ni 2FA en esta versión.

---

## Requisitos

| Requisito | Versión |
|---|---|
| Node.js | 20 o superior |
| npm | 10 o superior |
| PostgreSQL | 13 o superior (recomendado 16) |
| Docker + Compose v2 | Opcional, recomendado para la base |

---

## Instalación

```bash
cd prime-nestjs
npm ci --ignore-scripts
cp .env.example .env
# Edita .env con tus credenciales y claves RSA
```

### Base de datos con Docker

```bash
docker compose up -d database
npm run migration:run
```

### Base de datos externa

Configura `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`,
`POSTGRES_PASSWORD` y `POSTGRES_DB` en `.env`, y ejecuta:

```bash
npm run migration:run
```

### Arranque

```bash
npm run start:dev     # desarrollo con recarga
npm run build         # compilar
npm run start:prod    # ejecutar dist/main
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api` (solo fuera de producción)
- Salud: `http://localhost:3000/health-check`

---

## Variables de entorno

Plantilla: [`.env.example`](.env.example). Referencia completa:
[`../documentacion/09-configuracion-entornos.md`](../documentacion/09-configuracion-entornos.md).

| Grupo | Variables |
|---|---|
| Base de datos | `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_SSL`, `POSTGRES_SSL_REJECT_UNAUTHORIZED`, `POSTGRES_POOL_SIZE` |
| Servidor | `PORT`, `HOST`, `NODE_ENV`, `TRUST_PROXY`, `ALLOWED_ORIGINS` |
| Seguridad | `PRIVATE_KEY`, `PUBLIC_KEY` |
| Notificaciones | `NOTIF_INVENTORY_CRON`, `NOTIF_ABANDONADO_CRON`, `NOTIF_ABANDONADO_HORAS` |

> No subas `.env` al repositorio. Debe tener permisos `600`. Las claves RSA
> son obligatorias: sin ellas el backend no arranca.

---

## Scripts

| Script | Qué hace |
|---|---|
| `npm run start:dev` | Desarrollo con recarga |
| `npm run start:prod` | Ejecuta `dist/main` |
| `npm run build` | Compila a `dist/` |
| `npm run lint` | ESLint con autofix |
| `npm run format` | Prettier |
| `npm test` | Pruebas unitarias |
| `npm run test:watch` | Pruebas en vigilancia |
| `npm run test:cov` | Cobertura |
| `npm run test:e2e` | Pruebas e2e |
| `npm run migration:run` | Aplica migraciones |
| `npm run migration:generate -- src/migrations/Nombre` | Genera migración |
| `npm run migration:revert` | Revierte la última |
| `npm run seed:carta` | Carga carta de ejemplo |
| `npm run seed:usuarios-demo` | Crea usuarios demo |
| `npm run security:demo-off` | Desactiva cuentas demo |
| `npm run security:audit` | `npm audit` |
| `npm run docker:up` | Levanta contenedores |
| `npm run docker:down` | Detiene contenedores |

---

## Base de datos y migraciones

- `synchronize: false`: TypeORM **no** altera el esquema por su cuenta.
- Todo cambio de entidad requiere una migración versionada.
- La migración base está en `src/migrations/`.
- Flujo recomendado:

```bash
# 1. Crear respaldo
# 2. Editar la entidad
npm run migration:generate -- src/migrations/NombreDelCambio
# 3. Revisar el SQL generado
# 4. Probar en una base aparte
npm run migration:run
# 5. Verificar
curl http://localhost:3000/health-check
```

Nunca actives `synchronize: true` en producción.

---

## Módulos

| Área | Módulos |
|---|---|
| Seguridad | `auth`, `usuarios`, `rol` |
| Carta | `categorias`, `productos`, `ingredientes`, `producto-ingrediente`, `recetas` |
| Salón | `mesas`, `reservas`, `pedidos`, `detalle-pedido` |
| Caja y cobro | `facturas`, `turnos`, `tipo-pago` |
| Compras | `proveedores`, `ordenes-compra`, `detalle-orden-compra`, `entrada-stock` |
| Analítica | `dashboard`, `reportes` |
| Soporte | `notificaciones`, `realtime`, `seed`, `logger` |

Cada módulo sigue el patrón `controller` → `service` → `repository`.
Las reglas de negocio viven en el servicio, no en el controlador.

---

## Seguridad

- Contraseñas con **bcrypt** (costo 10).
- JWT **RS256** firmado con clave privada y verificado con clave pública.
- Cookie `httpOnly` + `sameSite=strict`.
- `JwtAuthGuard` global y `RolesGuard` por ruta.
- Validación estricta de DTOs (`whitelist`, `forbidNonWhitelisted`).
- `helmet()` y CORS validado para localhost y rangos privados.
- Rate limiting global (100/min) y login (10/min).
- Bloqueo temporal por cuenta tras 8 intentos fallidos.
- Transacciones con bloqueo pesimista en cobros y arqueos.
- Errores de base traducidos sin filtrar SQL ni stack traces.

Detalle y riesgos pendientes:
[`../documentacion/12-seguridad.md`](../documentacion/12-seguridad.md).

---

## Pruebas y calidad

```bash
npm test -- --runInBand
npx eslint "{src,test}/**/*.ts"
npm run build
```

Estado verificado el 2026-11-06:

| Comprobación | Resultado |
|---|---|
| Suites | 5 |
| Pruebas | 25/25 |
| Lint | 0 errores |
| Build | Correcto |

El CI de GitHub Actions ejecuta lint, build y pruebas en cada push/PR a `main`.
Ver [`../.github/workflows/ci.yml`](../.github/workflows/ci.yml).

---

## Estructura

```text
prime-nestjs/
├── src/
│   ├── auth/                 Login, JWT, guards y estrategias
│   ├── usuarios/             Usuarios y roles
│   ├── pedidos/              Pedidos, líneas y cobro
│   ├── facturas/             Facturas, pagos y anulación
│   ├── turnos/               Caja, personal y arqueo
│   ├── recetas/              Disponibilidad e inventario
│   ├── reportes/             Reportes
│   ├── realtime/             Gateway Socket.io
│   ├── common/               CORS, filtros, paginación
│   ├── config/               Configuración y TypeORM
│   └── migrations/           Esquema versionado
├── scripts/                  Semillas y utilidades
├── test/                     Pruebas e2e
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## Licencia

**RestorApp API es software propietario.** © 2026 Daniel Rojas.

Este backend se construyó a partir de **prime-nestjs** de Joseph Goksu,
licencia **MIT**. Las porciones derivadas conservan esa licencia.

- [`LICENSE`](LICENSE) — licencia propietaria del backend.
- [`LICENSE-MIT`](LICENSE-MIT) — licencia MIT del proyecto base.
- [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) — alcance y obligaciones.

El frontend [`../restorapp-nextjs/`](../restorapp-nextjs/README.md) es
desarrollo original y **no** deriva de prime-nestjs.

---

## Créditos

- **Base del backend:** [prime-nestjs](https://github.com/josephgoksu/prime-nestjs)
  de Joseph Goksu, MIT (2021).
- **RestorApp:** módulos de negocio, reglas, migraciones, seguridad y
  documentación por Daniel Rojas.

---

<p align="center">
  <a href="../README.md">← Volver al README principal</a>
</p>
