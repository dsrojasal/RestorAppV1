# 09 · Configuración y entornos

## 1. Archivos de configuración

| Archivo | Se versiona | Contenido |
|---|---|---|
| `prime-nestjs/.env` | **No** | Configuración real del backend |
| `prime-nestjs/.env.example` | Sí | Plantilla sin secretos |
| `restorapp-nextjs/.env` | **No** | Configuración real del frontend |
| `restorapp-nextjs/.env.example` | Sí | Plantilla sin secretos |

Los archivos reales deben tener permisos `600`:

```bash
chmod 600 prime-nestjs/.env restorapp-nextjs/.env
```

> **Nunca** subas `.env` al repositorio ni pegues sus valores en documentos,
> chats o capturas.

---

## 2. Backend (`prime-nestjs/.env`)

### 2.1 Base de datos

| Variable | Obligatoria | Por defecto | Descripción |
|---|---|---|---|
| `POSTGRES_HOST` | Sí | — | Host de PostgreSQL |
| `POSTGRES_PORT` | No | `5432` | Puerto |
| `POSTGRES_USER` | Sí | — | Usuario |
| `POSTGRES_PASSWORD` | Sí | — | Contraseña |
| `POSTGRES_DB` | Sí | — | Nombre de la base |
| `POSTGRES_SSL` | No | `false` | `true` si el proveedor exige SSL |
| `POSTGRES_SSL_REJECT_UNAUTHORIZED` | No | `true` | Validar certificado |
| `POSTGRES_POOL_SIZE` | No | `10` | Conexiones simultáneas |

### 2.2 Servidor

| Variable | Obligatoria | Por defecto | Descripción |
|---|---|---|---|
| `PORT` | No | `3000` | Puerto de la API |
| `HOST` | No | `0.0.0.0` | Interfaz de escucha |
| `NODE_ENV` | No | `development` | `production` desactiva Swagger |
| `TRUST_PROXY` | No | `false` | `true` detrás de Nginx/Caddy |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000` | Orígenes extra permitidos |

### 2.3 Seguridad

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PRIVATE_KEY` | **Sí** | Clave RSA privada (firma JWT). Con `\n` escapados |
| `PUBLIC_KEY` | **Sí** | Clave RSA pública (verificación) |

Sin estas dos claves el backend **no arranca**. Formato:

```env
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n"
```

### 2.4 Notificaciones programadas

| Variable | Por defecto | Descripción |
|---|---|---|
| `NOTIF_INVENTORY_CRON` | `*/5 * * * *` | Revisión de stock bajo |
| `NOTIF_ABANDONADO_CRON` | `0 */30 * * * *` | Revisión de pedidos abandonados |
| `NOTIF_ABANDONADO_HORAS` | `3` | Horas sin actividad para alertar |

---

## 3. Frontend (`restorapp-nextjs/.env`)

| Variable | Obligatoria | Ejemplo | Descripción |
|---|---|---|---|
| `API_URL` | Sí | `http://127.0.0.1:3000` | URL interna del rewrite |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3000` | Base del socket (protocolo y puerto) |
| `NEXT_PUBLIC_SOCKET_SAME_ORIGIN` | No | `false` | `true` detrás de proxy |
| `COOKIE_SECURE` | No | `false` | `true` solo con HTTPS |

### Nota sobre `JWT_SECRET`

`src/lib/auth.ts` menciona `JWT_SECRET`, pero **no se usa** en el flujo real:
la verificación la hace el backend con RS256. No es necesario configurarlo y no
debe confundirse con `PRIVATE_KEY`/`PUBLIC_KEY`.

---

## 4. Perfiles de configuración

### 4.1 Desarrollo (sin proxy)

**Backend**

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<contraseña>
POSTGRES_DB=postgres
POSTGRES_SSL=false
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
TRUST_PROXY=false
PRIVATE_KEY="..."
PUBLIC_KEY="..."
```

**Frontend**

```env
API_URL=http://127.0.0.1:3000
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_SAME_ORIGIN=false
COOKIE_SECURE=false
```

Funciona abriendo `http://localhost:3001`, `http://127.0.0.1:3001` o
`http://IP-DEL-EQUIPO:3001`. El socket toma el host de la página.

### 4.2 Producción en red local (con proxy)

**Backend**

```env
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
POSTGRES_HOST=127.0.0.1
TRUST_PROXY=true
ALLOWED_ORIGINS=http://localhost
```

**Frontend**

```env
API_URL=http://127.0.0.1:3000
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SOCKET_SAME_ORIGIN=true
COOKIE_SECURE=false
```

Con HTTPS cambiar `COOKIE_SECURE=true` y usar el dominio/IP con `https://`.

### 4.3 Docker Compose

`prime-nestjs/docker-compose.yml` levanta:

| Servicio | Contenedor | Puerto publicado |
|---|---|---|
| `app_server` | `app_server` | `127.0.0.1:3000` |
| `database` | `app_postgres_dev` | `127.0.0.1:5432` |

Buena práctica ya aplicada: **solo escucha en `127.0.0.1`**, no en toda la red.

---

## 5. Cómo generar las claves RSA

```bash
cd prime-nestjs
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

Luego pegar el contenido en el `.env`, escapando los saltos de línea (`\n`).
Alternativa con Node:

```bash
node -e "
const fs=require('fs');
const priv=fs.readFileSync('private.pem','utf8').replace(/\n/g,'\\\\n');
const pub=fs.readFileSync('public.pem','utf8').replace(/\n/g,'\\\\n');
console.log('PRIVATE_KEY=\"'+priv+'\"');
console.log('PUBLIC_KEY=\"'+pub+'\"');
"
```

> Guarda `private.pem` y `public.pem` fuera del repositorio y con permisos
> restringidos. Si se filtran, hay que rotarlas y todos los usuarios deberán
> volver a iniciar sesión.

---

## 6. Cambiar de máquina o de IP

Con la configuración recomendada **no hay que tocar nada**:

1. El frontend usa rutas relativas (`/api/backend`).
2. El socket toma el host de la página.
3. El backend acepta `localhost` y rangos privados.
4. El proxy escucha en todas las interfaces y enruta a `127.0.0.1`.

Solo hay que:

- Copiar el proyecto.
- Crear los `.env` con los datos de la nueva base.
- Compilar y arrancar.
- Abrir `http://IP-NUEVA`.

### Si cambia la IP del servidor

| Situación | Acción |
|---|---|
| Acceso por IP | Nada; solo abrir la IP nueva |
| Acceso por nombre DNS | Actualizar el DNS o el archivo `hosts` |
| HTTPS con certificado por IP | Regenerar el certificado |
| Firewall | Abrir solo el puerto del proxy |

---

## 7. Verificación de la configuración

```bash
# 1. El backend arranca y ve la base
curl http://127.0.0.1:3000/health-check

# 2. El frontend responde
curl -I http://127.0.0.1:3001/login

# 3. La API responde a través del frontend
curl -i http://127.0.0.1:3001/api/backend/health-check

# 4. El socket responde
curl -i "http://127.0.0.1:3000/socket.io/?EIO=4&transport=polling"

# 5. La cookie se crea
curl -i -X POST http://127.0.0.1:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"...","password":"..."}'
```

---

## 8. Errores de configuración frecuentes

| Error | Causa | Solución |
|---|---|---|
| `Missing required environment variable: PRIVATE_KEY` | Falta la clave | Agregarla al `.env` |
| `ECONNREFUSED 127.0.0.1:3000` | Backend apagado o en otro puerto | Revisar `PORT` y arrancar |
| `ECONNREFUSED 5432` | PostgreSQL apagado | Levantar la base |
| `password authentication failed` | Credenciales incorrectas | Revisar usuario/contraseña |
| `database "x" does not exist` | Nombre de base incorrecto | Crear la base o corregir `POSTGRES_DB` |
| CORS bloqueado | Origen público | Usar LAN o configurar `ALLOWED_ORIGINS` |
| Socket sin conexión | `NEXT_PUBLIC_API_URL` apunta a otro host | Vaciar la variable o usar el mismo origen |
| Cookie no se guarda | `COOKIE_SECURE=true` sobre HTTP | Poner `COOKIE_SECURE=false` |
