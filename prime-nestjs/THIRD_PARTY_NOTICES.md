# Avisos de terceros — RestorApp API

## prime-nestjs

| Campo | Valor |
|---|---|
| Proyecto | prime-nestjs |
| Autor | Joseph Goksu |
| Repositorio | <https://github.com/josephgoksu/prime-nestjs> |
| Licencia | MIT |
| Copyright | (c) 2021 Joseph Goksu |

Este backend se construyó a partir de prime-nestjs. Las porciones derivadas
de ese proyecto siguen sujetas a la licencia MIT. El texto completo está en
[`LICENSE-MIT`](LICENSE-MIT).

### Qué se reutiliza

- Estructura base de NestJS.
- Autenticación JWT con claves RSA.
- Configuración de TypeORM y PostgreSQL.
- Docker Compose y utilidades de arranque.
- Base de estilos y configuración de calidad (ESLint, Prettier, Jest).

### Qué es original de RestorApp

- Módulos de pedidos, mesas, cocina, caja, facturación, inventario,
  compras, reportes, notificaciones y tiempo real.
- Reglas de negocio, DTOs, migraciones y documentación.
- Ajustes de seguridad, CORS portable y validación de origen del socket.

## Dependencias de npm

Cada dependencia conserva su propia licencia. Consulta
`node_modules/<paquete>/LICENSE`.

## Distribución

Si distribuyes este backend, incluye siempre:

1. [`LICENSE-MIT`](LICENSE-MIT)
2. Este archivo `THIRD_PARTY_NOTICES.md`
3. Un aviso visible de que deriva de prime-nestjs

No es necesario conservar el logotipo, las imágenes ni el README original
de prime-nestjs.
