# AGENTS.md

## Key Commands

```bash
npm run start:dev      # Hot-reload dev server
npm run start:prod     # Production (requires dist/)
npm test               # Run unit tests (jest from src/)
npm run test -- src/auth/auth.service.spec.ts  # Single test file
npm run test:e2e       # E2E tests (uses test/jest-e2e.json)
npm run lint           # ESLint --fix
npm run format         # Prettier write
npm run migration:generate -- src/migrations/Name  # Generate migration
npm run migration:run  # Apply migrations
npm run migration:revert # Revert last migration
npm run docker:up      # docker compose up -d
npm run docker:down    # Stop containers
```

> `schema:sync` existe en `package.json` por herencia del proyecto base, pero
> **no debe usarse**: el esquema se versiona solo con migraciones
> (`synchronize: false`).

## Setup (fresh clone)

```bash
npm install --ignore-scripts
cp .env.example .env          # revisar y generar claves RSA
docker compose up -d database
npm run migration:run
npm run start:dev
```

## Architecture

- NestJS modular architecture. `src/app.module.ts` is root; feature modules (auth, usuarios, rol, mesas, pedidos, facturas, turnos, recetas, reportes, realtime, etc.) are self-contained.
- JWT auth uses **RSA256** (not HS256). Keys in `PRIVATE_KEY` / `PUBLIC_KEY` env vars.
- Guards: `JwtAuthGuard` (auth), `RolesGuard` (RBAC). Roles enum at `src/common/enums/role.enum.ts`.
- Database: PostgreSQL + TypeORM. Config in `src/config/database.ts`.
- Swagger UI at `/api`.

## Quirks

- `npm install` must use `--ignore-scripts` (husky installed separately first).
- Uses `docker compose` (v2), not `docker-compose`.
- Jest rootDir is `src/`, not project root. Test files: `*.spec.ts` in same dir as source.
- `npm run migration:generate` requires `--` before path: `npm run migration:generate -- src/migrations/Name`.
- Node >= 20.0.0 required.