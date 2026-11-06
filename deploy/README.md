# Despliegue de RestorApp en red local

Guía corta para instalar el sistema en otra máquina y dejarlo funcionando con
la mínima configuración posible.

## Dos modos de uso

### A) Desarrollo (sin proxy)

```bash
cd prime-nestjs && npm run start:dev      # backend  :3000
cd restorapp-nextjs && npm run dev        # frontend :3001
```

Abrir `http://localhost:3001` o `http://IP-DEL-EQUIPO:3001`.

- El navegador llama a `/api/backend/*`, que Next reenvía al backend.
- Socket.io va directo al backend usando el **mismo host** de la página.
- No hay que poner la IP en ningún `.env`.

### B) Producción en red local (recomendado)

Un solo origen con Caddy o Nginx. El navegador solo habla con el proxy y este
reparte las rutas:

```
http://IP-DEL-SERVIDOR/
  ├─ /api/backend/* → 127.0.0.1:3000
  ├─ /socket.io/*   → 127.0.0.1:3000
  └─ /*             → 127.0.0.1:3001
```

Ventajas: sin CORS, la cookie y el socket comparten host, el backend no queda
expuesto a la red y la IP solo se usa para abrir la página.

## Configuración

### Backend (`prime-nestjs/.env`)

```env
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=...
POSTGRES_DB=postgres
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
ALLOWED_ORIGINS=http://localhost
TRUST_PROXY=true
```

`ALLOWED_ORIGINS` no necesita la IP: el backend acepta automáticamente
`localhost` y cualquier IP privada (`192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`)
en cualquier puerto. Los orígenes públicos se rechazan.

### Frontend (`restorapp-nextjs/.env`)

```env
API_URL=http://127.0.0.1:3000
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SOCKET_SAME_ORIGIN=true
COOKIE_SECURE=false        # true cuando se sirva por HTTPS
```

## Instalación en otra máquina

```bash
# 1. Dependencias
cd prime-nestjs && npm ci --ignore-scripts
cd ../restorapp-nextjs && npm ci --ignore-scripts

# 2. Crear los .env de arriba

# 3. Base de datos
#    Nueva:      crear la base y aplicar migraciones
cd ../prime-nestjs && npm run migration:run
#    Existente:  restaurar un pg_dump y luego npm run migration:run

# 4. Compilar (con los servidores de desarrollo DETENIDOS)
npm run build
cd ../restorapp-nextjs && npm run build

# 5. Arrancar
cd ../prime-nestjs && npm run start:prod        # 127.0.0.1:3000
cd ../restorapp-nextjs && npm run start         # :3001

# 6. Proxy
#    Caddy: cp deploy/Caddyfile.example /etc/caddy/Caddyfile && caddy run
#    Nginx: ver deploy/nginx.restorapp.conf.example

# 7. Verificar
curl http://127.0.0.1:3000/health-check
curl http://IP-DEL-SERVIDOR/
```

## Seguridad

- Abrir solo el puerto del proxy (80/443). No exponer `3000`, `3001` ni `5432`.
- Backend y frontend en `127.0.0.1` (HOST) cuando se use proxy.
- Red WiFi del local con clave fuerte; si hay WiFi de invitados, separar el
  sistema en otra red o usar HTTPS.
- Contraseñas reales y cuentas demo desactivadas:
  `npm run security:demo-off` (desde `prime-nestjs`).
- Acceso desde fuera del local: VPN (Tailscale/WireGuard), **nunca** abrir
  puertos al internet sin HTTPS.
- Respaldos periódicos con `pg_dump`.

## Problemas conocidos y solución

| Síntoma | Causa | Solución |
|---|---|---|
| CSS/JS dan 404 y la página se ve sin estilos | Se ejecutó `next build` con `next dev` encendido; comparten `.next` | Detener dev, borrar `.next`, volver a arrancar dev |
| «Sin conexión en vivo» | El socket apuntaba a otra IP que la cookie de sesión | Ya resuelto: el socket usa el host de la página |
| `EHOSTUNREACH` o `ECONNREFUSED` al backend | `API_URL` apunta a una IP/equipo incorrecto | Usar `API_URL=http://127.0.0.1:3000` |
| Cambió la IP del servidor | DHCP | Reserva DHCP/IP fija; con proxy no hay que editar `.env` |

## Regla de oro

- Desarrollo: `npm run dev` / `npm run start:dev`.
- Producción: `npm run build` una vez y `npm run start` / `npm run start:prod`.
- **Nunca** compilar mientras el servidor de desarrollo está encendido.
