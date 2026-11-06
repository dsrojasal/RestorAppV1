# 05 · Referencia de la API

## 1. Convenciones

| Tema | Regla |
|---|---|
| Formato | JSON (`application/json`) |
| Autenticación | Cookie `token` **o** `Authorization: Bearer <jwt>` |
| Vigencia del token | 1 hora |
| Roles | `ADMIN`, `MESERO`, `CHEF`, `CAJERO` |
| Fecha/hora | ISO 8601 (`2026-11-06T16:28:32.961Z`) |
| Dinero | Número decimal con 2 posiciones |
| Paginación | `?page=1&limit=50` (opcional) |
| Límite global | 100 peticiones/minuto por IP |
| Login | 10 intentos/minuto por IP |

### Códigos de respuesta

| Código | Significado |
|---|---|
| `200` | Operación exitosa |
| `201` | Recurso creado |
| `400` | Datos inválidos o regla de negocio incumplida |
| `401` | Sin token, token vencido o credenciales inválidas |
| `403` | Autenticado, pero sin permiso |
| `404` | Recurso no encontrado |
| `409` | Conflicto (duplicado, caja cerrada, ya cobrado) |
| `429` | Demasiados intentos |
| `500` | Error interno (mensaje genérico) |

### Diferencia de prefijo

| Contexto | Ruta |
|---|---|
| Navegador (a través de Next) | `/api/backend/pedidos` |
| Backend directo / Swagger | `/pedidos` |

El rewrite de Next quita `/api/backend`. En esta referencia se usa la **ruta
directa del backend**.

### Formato paginado

Sin `page` ni `limit`:

```json
[ { "id": 1 }, { "id": 2 } ]
```

Con `page` o `limit`:

```json
{
  "data": [ { "id": 1 } ],
  "total": 42,
  "page": 1,
  "limit": 50,
  "pages": 1
}
```

---

## 2. Sistema

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/` | Público | Mensaje de bienvenida |
| GET | `/health-check` | Público | Estado del servicio y de la base |
| POST | `/echo` | Autenticado | Devuelve el cuerpo recibido |
| POST | `/premium-echo` | ADMIN | Igual, pero solo administrador |

**Respuesta de salud:**

```json
{ "status": "up", "database": "up", "timestamp": "2026-11-06T16:28:32.961Z" }
```

Si la base falla: `503` con `"Base de datos no disponible"`.

---

## 3. Autenticación

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/login` | Público | Inicia sesión y devuelve el token |
| POST | `/auth/register` | ADMIN | Crea un usuario (por defecto Mesero) |

### Login

```http
POST /auth/login
Content-Type: application/json

{ "email": "usuario@restorapp.co", "password": "********" }
```

```json
{ "email": "usuario@restorapp.co", "access_token": "eyJhbGciOiJSUzI1NiIs..." }
```

Errores:

| Caso | Respuesta |
|---|---|
| Credenciales inválidas | `401 Invalid credentials` |
| Cuenta desactivada | `401 Account is disabled` |
| 8 fallos acumulados | `429 Demasiados intentos fallidos...` |

> En el navegador, este endpoint se consume a través de `POST /api/auth/login`,
> que además crea la cookie httpOnly.

---

## 4. Usuarios y roles

### Usuarios

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/usuarios/me` | Autenticado | Datos del usuario de la sesión |
| POST | `/usuarios` | ADMIN | Crear usuario |
| GET | `/usuarios` | Autenticado | Listar usuarios |
| GET | `/usuarios/email/:email` | Autenticado | Buscar por correo |
| GET | `/usuarios/:id` | Autenticado | Buscar por ID |
| PATCH | `/usuarios/:id` | ADMIN | Actualizar |
| DELETE | `/usuarios/:id` | ADMIN | Eliminar (no puede eliminarse a sí mismo) |
| PATCH | `/usuarios/:id/toggle-active` | ADMIN | Activar/desactivar |

### Roles

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/roles` | ADMIN | Crear rol |
| GET | `/roles` | Autenticado | Listar |
| GET | `/roles/:id` | Autenticado | Ver uno |
| PATCH | `/roles/:id` | ADMIN | Actualizar |
| DELETE | `/roles/:id` | ADMIN | Eliminar |

---

## 5. Carta e inventario

### Categorías

| Método | Ruta | Rol |
|---|---|---|
| POST | `/categorias` | ADMIN |
| GET | `/categorias` | Autenticado |
| GET | `/categorias/:id` | Autenticado |
| PATCH | `/categorias/:id` | ADMIN |
| DELETE | `/categorias/:id` | ADMIN |

### Productos

| Método | Ruta | Rol |
|---|---|---|
| POST | `/productos` | ADMIN |
| GET | `/productos` | Autenticado |
| GET | `/productos/:id` | Autenticado |
| PATCH | `/productos/:id` | ADMIN |
| DELETE | `/productos/:id` | ADMIN |

### Ingredientes

| Método | Ruta | Rol |
|---|---|---|
| POST | `/ingredientes` | ADMIN |
| GET | `/ingredientes` | Autenticado |
| GET | `/ingredientes/:id` | Autenticado |
| PATCH | `/ingredientes/:id` | ADMIN |
| DELETE | `/ingredientes/:id` | ADMIN |

### Receta por producto

| Método | Ruta | Rol |
|---|---|---|
| POST | `/producto-ingrediente` | ADMIN |
| GET | `/producto-ingrediente` | Autenticado |
| GET | `/producto-ingrediente/por-producto/:productoId` | Autenticado |
| GET | `/producto-ingrediente/:id` | Autenticado |
| PATCH | `/producto-ingrediente/:id` | ADMIN |
| DELETE | `/producto-ingrediente/:id` | ADMIN |

### Recetas y disponibilidad

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/recetas/disponibilidad` | Autenticado | Cuántas unidades se pueden preparar |
| GET | `/recetas/movimientos` | Autenticado | Últimos movimientos de inventario |
| GET | `/recetas/:productoId` | Autenticado | Receta de un producto |
| PUT | `/recetas/:productoId` | ADMIN | Reemplaza la receta completa |
| DELETE | `/recetas/:productoId` | ADMIN | Elimina la receta |

**Ejemplo de disponibilidad:**

```json
[
  { "productoId": 1, "nombre": "Bandeja paisa", "tipo": "plato",
    "disponible": 12, "motivo": null, "tieneReceta": true },
  { "productoId": 5, "nombre": "Gaseosa", "tipo": "bebida",
    "disponible": 0, "motivo": "Agotado (0 und disponibles)", "tieneReceta": false }
]
```

---

## 6. Salón

### Mesas

| Método | Ruta | Rol |
|---|---|---|
| POST | `/mesas` | ADMIN |
| GET | `/mesas` | Autenticado |
| GET | `/mesas/:id` | Autenticado |
| PATCH | `/mesas/:id` | ADMIN |
| DELETE | `/mesas/:id` | ADMIN |

### Reservas

| Método | Ruta | Rol |
|---|---|---|
| POST | `/reservas` | ADMIN, MESERO, CAJERO |
| GET | `/reservas` | Autenticado |
| GET | `/reservas/:id` | Autenticado |
| PATCH | `/reservas/:id` | ADMIN, MESERO, CAJERO |
| DELETE | `/reservas/:id` | ADMIN, MESERO, CAJERO |

---

## 7. Pedidos

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/pedidos` | ADMIN, MESERO, CAJERO | Crear pedido (marca la mesa ocupada) |
| GET | `/pedidos` | Autenticado | Listar (filtros opcionales) |
| GET | `/pedidos/:id` | Autenticado | Detalle |
| POST | `/pedidos/:id/lineas` | ADMIN, MESERO, CAJERO | Agregar línea |
| PATCH | `/pedidos/:id/lineas/:lineaId/estado` | ADMIN, CHEF | Cambiar estado de preparación |
| POST | `/pedidos/:id/lineas/:lineaId/entregar` | ADMIN, MESERO, CAJERO | Marcar entregado |
| PATCH | `/pedidos/:id/lineas/:lineaId` | ADMIN, MESERO, CAJERO | Editar cantidad/observación |
| POST | `/pedidos/:id/cobrar` | ADMIN, MESERO, CAJERO | Cobrar |
| PATCH | `/pedidos/:id/transferir` | ADMIN, MESERO, CAJERO | Cambiar de mesa |
| DELETE | `/pedidos/:id/lineas/:lineaId` | ADMIN, MESERO, CAJERO | Quitar línea |
| PATCH | `/pedidos/:id` | ADMIN, MESERO, CAJERO | Actualizar pedido |
| DELETE | `/pedidos/:id` | ADMIN, MESERO, CAJERO | Eliminar pedido |

### Crear pedido

```http
POST /pedidos
Content-Type: application/json

{
  "mesaId": 4,
  "observaciones": "Sin cebolla",
  "lineas": [
    { "productoId": 1, "cantidad": 2, "observacion": "Término medio" },
    { "productoId": 5, "cantidad": 3 }
  ]
}
```

Reglas:

- La mesa debe estar `libre`.
- Los platos nacen en `pendiente`; las bebidas nacen en `listo`.
- Se reserva stock de la receta.
- Si no hay stock suficiente: `400` con el detalle de lo que falta.

### Cobrar pedido

```http
POST /pedidos/12/cobrar
Content-Type: application/json

{
  "modo": "propio",
  "ivaPorcentaje": 19,
  "propinaPorcentaje": 10,
  "pagos": [
    { "tipoPagoId": 1, "monto": 30000 },
    { "tipoPagoId": 2, "monto": 12730 }
  ]
}
```

| Campo | Regla |
|---|---|
| `modo` | `"propio"` (cobra ahora) o `"caja"` (deja factura pendiente) |
| `ivaPorcentaje` | 0–100, opcional |
| `propinaPorcentaje` / `propinaMonto` | Opcional; el monto tiene prioridad |
| `pagos` | Deben sumar el total (±0.01) |
| `overrideSinCaja` | Solo ADMIN, requiere `motivoSinTurno` ≥ 10 caracteres |

Errores frecuentes:

| Mensaje | Causa |
|---|---|
| `Hay ítems pendientes o en preparación; no se puede cobrar todavía` | Falta que cocina termine |
| `Este pedido ya fue cobrado` | Factura ya pagada |
| `No hay caja abierta...` | Turno cerrado y el usuario no es admin |
| `Para cobrar sin caja abierta debes registrar el motivo` | Falta motivo o es corto |

### Líneas de pedido (CRUD administrativo)

| Método | Ruta | Rol |
|---|---|---|
| POST | `/detalle-pedido` | ADMIN |
| GET | `/detalle-pedido` | Autenticado |
| GET | `/detalle-pedido/por-pedido/:pedidoId` | Autenticado |
| GET | `/detalle-pedido/:id` | Autenticado |
| PATCH | `/detalle-pedido/:id` | ADMIN |
| DELETE | `/detalle-pedido/:id` | ADMIN |

---

## 8. Facturación

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/facturas` | ADMIN | Crear factura manual |
| GET | `/facturas` | ADMIN, CAJERO | Listar (paginado) |
| GET | `/facturas/:id` | ADMIN, CAJERO | Ver detalle |
| PATCH | `/facturas/:id` | ADMIN | Actualizar |
| POST | `/facturas/:id/pagar` | ADMIN, CAJERO | Cobrar |
| POST | `/facturas/:id/anular` | ADMIN, CAJERO | Anular (solo si no está pagada) |
| DELETE | `/facturas/:id` | ADMIN | Eliminar |

### Pagar factura

```http
POST /facturas/8/pagar
Content-Type: application/json

{
  "ivaPorcentaje": 19,
  "propinaMonto": 5000,
  "pagos": [{ "tipoPagoId": 1, "monto": 45000 }]
}
```

Reglas:

- La factura debe estar `pendiente`.
- Debe existir una caja abierta (o autorización de administrador).
- Al pagar: pedido → `entregado`, líneas → `entregado`, mesa → `libre`.
- Se registran los pagos y se vincula la factura al turno.

### Anular

```http
POST /facturas/8/anular
Content-Type: application/json

{ "motivo": "Cliente canceló antes de pagar" }
```

No se puede anular una factura ya pagada.

### Tipos de pago

| Método | Ruta | Rol |
|---|---|---|
| POST | `/tipo-pago` | ADMIN |
| GET | `/tipo-pago` | Autenticado |
| GET | `/tipo-pago/:id` | Autenticado |

---

## 9. Caja y turnos

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/turnos/estado` | Autenticado | ¿Hay caja abierta? |
| GET | `/turnos/mi-turno` | Autenticado | Roles del usuario en el turno |
| GET | `/turnos/actual` | Autenticado | Turno abierto con resumen |
| GET | `/turnos/ultimo-cierre` | Autenticado | Último turno cerrado |
| GET | `/turnos/cobros-sin-turno` | ADMIN | Cobros de emergencia |
| GET | `/turnos` | ADMIN | Historial paginado |
| GET | `/turnos/:id` | Autenticado | Detalle |
| GET | `/turnos/:id/movimientos` | Autenticado | Movimientos de caja |
| POST | `/turnos/abrir` | ADMIN | Abrir caja |
| POST | `/turnos/:id/personal` | ADMIN | Asignar personal |
| DELETE | `/turnos/:id/personal/:usuarioId/:rolTurno` | ADMIN | Quitar personal |
| POST | `/turnos/:id/movimientos` | Autenticado | Entrada/salida de efectivo |
| POST | `/turnos/:id/cerrar` | ADMIN | Cerrar y arquear |

### Abrir turno

```http
POST /turnos/abrir
Content-Type: application/json

{
  "montoInicial": 100000,
  "personal": [
    { "usuarioId": 5, "roles": ["mesero"] },
    { "usuarioId": 6, "roles": ["cajero"] },
    { "usuarioId": 7, "roles": ["mesero", "cajero"] }
  ]
}
```

- `personal` es obligatorio (puede ir vacío si no se asigna a nadie).
- `roles` acepta `mesero`, `cajero` y `cocinero`, sin repetir.
- Solo puede haber **un turno abierto**.
- Si ya hay uno: `409 Ya hay una caja abierta`.

### Cerrar turno

```http
POST /turnos/3/cerrar
Content-Type: application/json

{ "montoContado": 850000, "motivoDiferencia": "Faltaron 5.000 en efectivo", "notas": "Novedad de cierre" }
```

- Calcula esperado = inicial + ventas en efectivo + entradas − salidas.
- Si hay diferencia, el motivo es obligatorio (≥ 10 caracteres).
- Guarda resumen de pagos y de ventas por mesero (jsonb).

### Movimiento de caja

```http
POST /turnos/3/movimientos
Content-Type: application/json

{ "tipo": "salida", "monto": 20000, "motivo": "Pago a proveedor de verduras" }
```

No se edita ni se borra: se corrige con un movimiento inverso.

---

## 10. Compras

### Proveedores

| Método | Ruta | Rol |
|---|---|---|
| POST | `/proveedores` | ADMIN |
| GET | `/proveedores` | Autenticado |
| GET | `/proveedores/:id` | Autenticado |
| PATCH | `/proveedores/:id` | ADMIN |
| DELETE | `/proveedores/:id` | ADMIN |

### Órdenes de compra

| Método | Ruta | Rol |
|---|---|---|
| POST | `/ordenes-compra` | ADMIN |
| GET | `/ordenes-compra` | Autenticado |
| GET | `/ordenes-compra/:id` | Autenticado |
| PATCH | `/ordenes-compra/:id` | ADMIN |
| DELETE | `/ordenes-compra/:id` | ADMIN |

### Detalle de orden

| Método | Ruta | Rol |
|---|---|---|
| POST | `/detalle-orden-compra` | ADMIN |
| GET | `/detalle-orden-compra` | Autenticado |
| GET | `/detalle-orden-compra/por-oc/:ordenCompraId` | Autenticado |
| GET | `/detalle-orden-compra/:id` | Autenticado |
| PATCH | `/detalle-orden-compra/:id` | ADMIN |
| DELETE | `/detalle-orden-compra/:id` | ADMIN |

### Entradas de stock

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/entradas-stock` | ADMIN | Registra entrada y actualiza stock |
| GET | `/entradas-stock` | Autenticado | Historial |

---

## 11. Analítica

### Dashboard

| Método | Ruta | Rol |
|---|---|---|
| GET | `/dashboard/resumen` | ADMIN, MESERO, CAJERO |

Devuelve ventas del día, comparación con ayer, ventas por hora, mesas
ocupadas, pedidos por estado, insumos por agotarse y últimos movimientos.

### Reportes

| Método | Ruta | Rol | Parámetros |
|---|---|---|---|
| GET | `/reportes/ventas-dia` | ADMIN, MESERO, CAJERO | — |
| GET | `/reportes/ventas-rango` | ADMIN, MESERO, CAJERO | `desde`, `hasta` |
| GET | `/reportes/productos-vendidos` | ADMIN, MESERO, CAJERO | `desde`, `hasta` |
| GET | `/reportes/consumo-insumos` | ADMIN, MESERO, CAJERO | `desde`, `hasta` |
| GET | `/reportes/por-mesero` | ADMIN, MESERO, CAJERO | `desde`, `hasta` |

Fechas en formato `YYYY-MM-DD`.

---

## 12. Notificaciones

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/notificaciones` | Autenticado | Últimas 50 visibles para el usuario |
| POST | `/notificaciones/:id/leer` | Autenticado | Marcar una como leída |
| POST | `/notificaciones/leer-todas` | Autenticado | Marcar todas |

Visibilidad: por rol (`paraAdministrador`, `paraMesero`, `paraChef`,
`paraCajero`) o por usuario (`usuarioId`). El creador no recibe su propia
notificación.

---

## 13. Swagger

En desarrollo:

```
http://localhost:3000/api
```

Permite probar todos los endpoints. En producción se desactiva por seguridad.
