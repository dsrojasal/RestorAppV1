# 11 · Operación y mantenimiento

## 1. Rutina recomendada

### Diario

- [ ] Verificar `/health-check`.
- [ ] Revisar que la caja abrió y cerró correctamente.
- [ ] Confirmar que el respaldo del día existe.
- [ ] Revisar la campana de notificaciones por alertas de inventario.

### Semanal

- [ ] Revisar espacio en disco.
- [ ] Revisar logs de errores.
- [ ] Probar un cobro de punta a punta.
- [ ] Verificar que el ticket imprime.

### Mensual

- [ ] **Probar la restauración** de un respaldo en una base aparte.
- [ ] Revisar usuarios activos y permisos.
- [ ] Actualizar dependencias de seguridad (`npm audit`).
- [ ] Revisar el crecimiento de la base.

---

## 2. Estado del sistema

### Health check

```bash
curl -s http://127.0.0.1:3000/health-check
```

```json
{ "status": "up", "database": "up", "timestamp": "2026-11-06T16:28:32.961Z" }
```

- `200` → API y base funcionando.
- `503` → la API está viva pero no alcanza la base.

### Servicios

```bash
systemctl status restorapp-api
systemctl status restorapp-web
systemctl status caddy
```

### Puertos

```bash
sudo ss -ltnp | grep -E ':80|:443|:3000|:3001|:5432'
```

Esperado:

```
0.0.0.0:80      caddy
0.0.0.0:443     caddy
127.0.0.1:3000  node (API)
127.0.0.1:3001  node (Next)
127.0.0.1:5432  postgres
```

### Recursos

```bash
free -h
df -h
docker stats --no-stream
```

---

## 3. Logs

### Con systemd

```bash
# API
journalctl -u restorapp-api -f

# Frontend
journalctl -u restorapp-web -f

# Últimas 200 líneas
journalctl -u restorapp-api -n 200 --no-pager
```

### Con Docker

```bash
docker logs -f app_server
docker logs -f app_postgres_dev
```

### Qué buscar

| Patrón | Significado |
|---|---|
| `ECONNREFUSED` | Servicio destino apagado |
| `QueryFailedError` | Error de base (el filtro lo traduce) |
| `Origen no permitido` | Intento de conexión desde origen no válido |
| `Token inválido o expirado` | Sesión vencida o clave rotada |
| `No hay caja abierta` | Cobro sin turno |
| `Error no controlado` | Requiere revisión del stack |

---

## 4. Respaldos

### 4.1 Respaldo manual

```bash
mkdir -p /opt/restorapp/backups
docker exec app_postgres_dev pg_dump -U postgres -d postgres -Fc \
  > /opt/restorapp/backups/restorapp_$(date +%Y%m%d_%H%M).dump
```

Si PostgreSQL es del sistema (no Docker):

```bash
pg_dump -U postgres -Fc postgres > respaldo_$(date +%F).dump
```

### 4.2 Respaldo automático

`/opt/restorapp/scripts/backup.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

DIR=/opt/restorapp/backups
mkdir -p "$DIR"
ARCHIVO="$DIR/restorapp_$(date +%Y%m%d_%H%M).dump"

docker exec app_postgres_dev pg_dump -U postgres -d postgres -Fc > "$ARCHIVO"

# Conservar 30 días
find "$DIR" -name 'restorapp_*.dump' -mtime +30 -delete

echo "Respaldo creado: $ARCHIVO"
```

```bash
chmod +x /opt/restorapp/scripts/backup.sh
```

Cron diario a las 2:00:

```cron
0 2 * * * /opt/restorapp/scripts/backup.sh >> /var/log/restorapp-backup.log 2>&1
```

### 4.3 Restauración

```bash
# 1. Detener la API
sudo systemctl stop restorapp-api

# 2. Restaurar
docker exec -i app_postgres_dev pg_restore -U postgres -d postgres \
  --clean --if-exists < respaldo.dump

# 3. Arrancar y verificar
sudo systemctl start restorapp-api
curl -s http://127.0.0.1:3000/health-check
```

> Probar la restauración en una base de prueba, no en la real, salvo emergencia.

### 4.4 Copia fuera del servidor

```bash
rsync -av backups/ usuario@otro-equipo:/respaldos/restorapp/
```

Un respaldo en el mismo disco **no** protege de fallo de disco.

---

## 5. Migraciones

### Antes de migrar

1. Respaldo.
2. Probar en una base aparte.
3. Leer el SQL generado.

### Aplicar

```bash
cd /opt/restorapp/prime-nestjs
npm run migration:run
```

### Verificar

```bash
# Estado de migraciones
npm run typeorm migration:show

# Salud
curl -s http://127.0.0.1:3000/health-check
```

### Revertir

```bash
npm run migration:revert
```

Solo revierte la última. Si hay datos nuevos, revisar antes.

---

## 6. Diagnóstico de problemas conocidos

### 6.1 CSS/JS dan 404 y la página se ve sin estilos

**Causa:** se ejecutó `next build` con `next dev` encendido. En Next 14 ambos
comparten `.next`.

**Solución:**

```bash
pkill -f "next dev"
rm -rf .next
npm run dev
```

Regla: nunca compilar con el servidor de desarrollo encendido.

### 6.2 `ECONNREFUSED 127.0.0.1:3000`

**Causa:** el backend no está corriendo o está en otro puerto.

**Solución:**

```bash
ss -ltnp | grep 3000
systemctl status restorapp-api
journalctl -u restorapp-api -n 50
```

### 6.3 `EHOSTUNREACH` o el frontend no llega a la API

**Causa:** `API_URL` apunta a una IP vieja o inalcanzable.

**Solución:** en el frontend, `API_URL=http://127.0.0.1:3000`.

### 6.4 "Sin conexión en vivo"

**Causa:** el socket apunta a un host distinto al de la página.

**Solución:**

- Desarrollo: `NEXT_PUBLIC_SOCKET_SAME_ORIGIN=false` y
  `NEXT_PUBLIC_API_URL=http://localhost:3000`.
- Producción con proxy: `NEXT_PUBLIC_SOCKET_SAME_ORIGIN=true` y
  `NEXT_PUBLIC_API_URL=` (vacío).

### 6.5 El login devuelve 401

| Causa | Solución |
|---|---|
| Contraseña incorrecta | Verificar credenciales |
| Cuenta desactivada | Activarla en Usuarios |
| 8 intentos fallidos | Esperar 5 minutos |
| Base restaurada con otras claves | Revisar `PRIVATE_KEY`/`PUBLIC_KEY` |
| Cookie no se guarda | `COOKIE_SECURE=false` sobre HTTP |

### 6.6 `409 CAJA_CERRADA` al cobrar

**Causa:** no hay turno abierto.

**Solución:** un administrador debe abrir caja. Si es una emergencia, el
administrador puede cobrar con motivo.

### 6.7 El puerto está ocupado

```bash
sudo ss -ltnp | grep :3001
sudo kill <PID>
```

### 6.8 La base no arranca

```bash
docker ps -a | grep postgres
docker logs app_postgres_dev --tail 100
df -h   # ¿disco lleno?
```

### 6.9 Todo va lento

Revisar en este orden:

1. ¿Está corriendo `next dev` en lugar de producción?
2. ¿El disco está lleno?
3. ¿La API responde rápido? (`curl -w "%{time_total}"`)
4. ¿Hay consultas pesadas? (revisar logs de PostgreSQL)
5. ¿El equipo cliente está en WiFi débil?

---

## 7. Rendimiento

### Síntomas y causas

| Síntoma | Causa | Solución |
|---|---|---|
| Primera carga lenta | `next dev` compila | Usar build de producción |
| Navegación lenta | Sin caché ni compresión | Activar gzip en el proxy |
| Muchas llamadas API | React StrictMode en desarrollo | Es normal en dev; en producción se reduce |
| Fuentes tardan | Google Fonts externo | Servir fuentes localmente |
| Base lenta | Falta de índices o tabla grande | Revisar `EXPLAIN ANALYZE` |

### Medición rápida

```bash
curl -s -o /dev/null -w "API: %{time_total}s\n" http://127.0.0.1:3000/health-check
curl -s -o /dev/null -w "Web: %{time_total}s\n" http://127.0.0.1:3001/login
```

---

## 8. Mantenimiento de la base

### Tamaño de tablas

```sql
SELECT relname AS tabla,
       pg_size_pretty(pg_total_relation_size(relid)) AS tamano
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 15;
```

### Conexiones activas

```sql
SELECT count(*) FROM pg_stat_activity;
```

### Actividad lenta

```sql
SELECT pid, now() - query_start AS duracion, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '5 seconds';
```

### Limpieza

`VACUUM` y `ANALYZE` se ejecutan automáticamente. No desactivar el autovacuum.

---

## 9. Rotación de claves JWT

Si se filtran las claves:

1. Generar un nuevo par RSA.
2. Actualizar `PRIVATE_KEY` y `PUBLIC_KEY`.
3. Reiniciar el backend.
4. **Todos los usuarios deberán iniciar sesión de nuevo.**

```bash
sudo systemctl restart restorapp-api
```

---

## 10. Reinicio completo

```bash
sudo systemctl restart restorapp-api restorapp-web caddy
```

Verificar:

```bash
curl -s http://127.0.0.1:3000/health-check
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/login
```

---

## 11. Contacto de emergencia (plantilla)

| Rol | Nombre | Teléfono |
|---|---|---|
| Responsable del sistema | | |
| Administrador del restaurante | | |
| Soporte técnico | | |
| Proveedor de internet | | |

Completar esta tabla al instalar y dejarla impresa en el local.
