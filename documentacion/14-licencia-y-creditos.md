# 14 · Licencia y créditos

Este documento explica el modelo legal de RestorApp: qué es propietario, qué
deriva de un proyecto open source, qué obligaciones existen al distribuir y
dónde está cada aviso.

---

## 1. Resumen

| Parte | Origen | Licencia |
|---|---|---|
| Frontend `restorapp-nextjs/` | Desarrollo original de Daniel Rojas | Propietaria |
| Módulos de negocio del backend | Desarrollo original de Daniel Rojas | Propietaria |
| Base del backend `prime-nestjs/` | Derivada de `prime-nestjs` de Joseph Goksu | MIT |
| Dependencias de npm | Cada paquete | La suya propia |
| Logo, nombre e identidad de RestorApp | Daniel Rojas | Propietaria |

**Regla de oro:** la licencia MIT prevalece únicamente sobre las porciones
derivadas de `prime-nestjs`. Todo lo demás es propietario.

---

## 2. Archivos legales

| Archivo | Alcance | Qué contiene |
|---|---|---|
| [`LICENSE`](../LICENSE) | Raíz del repositorio | Licencia propietaria de RestorApp |
| [`LICENSE-MIT`](../LICENSE-MIT) | Backend base | Texto MIT original de Joseph Goksu (2021) |
| [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) | Repositorio | Alcance de terceros y obligaciones |
| [`prime-nestjs/LICENSE`](../prime-nestjs/LICENSE) | Backend | Copia de la licencia propietaria del backend |
| [`prime-nestjs/LICENSE-MIT`](../prime-nestjs/LICENSE-MIT) | Backend | Copia del MIT del proyecto base |
| [`prime-nestjs/THIRD_PARTY_NOTICES.md`](../prime-nestjs/THIRD_PARTY_NOTICES.md) | Backend | Aviso autocontenido del backend |
| [`restorapp-nextjs/LICENSE`](../restorapp-nextjs/LICENSE) | Frontend | Licencia propietaria del frontend |

Las copias dentro de cada carpeta permiten distribuir el backend o el frontend
por separado sin perder los avisos legales.

---

## 3. Qué permite la licencia MIT del backend base

`prime-nestjs` se distribuye bajo MIT. Esa licencia permite, entre otras cosas:

- Usarlo en proyectos privados y comerciales.
- Modificarlo y adaptarlo.
- Vender el producto o cobrar por el servicio.
- Cambiar el nombre, el logo y la documentación.
- Añadir código propietario encima.

La única obligación relevante es conservar el aviso de copyright y el texto de
la licencia en las copias o porciones sustanciales del software derivado.

Por eso RestorApp **no borra** el copyright de Joseph Goksu: lo conserva en
`LICENSE-MIT` y en `THIRD_PARTY_NOTICES.md`, y añade su propio copyright para
el trabajo nuevo.

---

## 4. Qué cubre la licencia propietaria

La licencia propietaria de RestorApp cubre:

- El frontend completo.
- Los módulos, reglas de negocio, DTOs, migraciones y documentación originales.
- El nombre, el logo y la identidad visual.
- Las modificaciones y añadidos sobre el backend base, en todo lo que no esté
  sujeto a MIT.

No concede permiso para copiar, redistribuir, vender o explotar el software sin
autorización escrita del titular. Tampoco permite eliminar los avisos legales.

---

## 5. Cómo distribuir correctamente

### Backend

Si entregas el backend en código fuente, binario o imagen Docker, incluye:

1. `LICENSE` (propietaria).
2. `LICENSE-MIT` (MIT de Joseph Goksu).
3. `THIRD_PARTY_NOTICES.md`.
4. Un aviso visible de que deriva de `prime-nestjs`.

No es necesario conservar el README, las imágenes ni los badges del proyecto
original: esos recursos no forman parte del código reutilizado.

### Frontend

El frontend es original. Basta con incluir su `LICENSE` propietaria y respetar
las licencias de las dependencias de npm.

### Producto completo

Al distribuir RestorApp como producto, mantén juntos los tres archivos de la
raíz (`LICENSE`, `LICENSE-MIT`, `THIRD_PARTY_NOTICES.md`). Es la forma más
simple de cumplir con todas las partes.

---

## 6. Preguntas frecuentes

**¿Puedo cobrar por RestorApp?**
Sí. La licencia propietaria es del titular; el titular puede explotarlo
comercialmente. La MIT del backend base permite uso comercial.

**¿Puedo quitar el logo y el README de `prime-nestjs`?**
Sí. La MIT no protege el branding ni la documentación como si fueran código.
Solo exige conservar el copyright y el texto de la licencia.

**¿Puedo cambiar la licencia de todo a propietaria?**
No respecto de las porciones derivadas de `prime-nestjs`. Esas siguen bajo MIT.
Sí respecto del código nuevo, el frontend y la identidad del producto.

**¿El repositorio público expone mi código?**
Sí. Una licencia propietaria no oculta el código; solo define qué se puede
hacer con él. Si el código debe ser confidencial, el repositorio debe ser
privado.

**¿Las dependencias de npm cambian mi licencia?**
No. Cada dependencia conserva su licencia; el código de RestorApp mantiene la
suya.

**¿Necesito registrar la marca RestorApp?**
La licencia no sustituye el registro de marca. Si el producto va a operar
comercialmente, conviene consultar el registro ante la autoridad competente.

---

## 7. Créditos

| Rol | Persona / proyecto |
|---|---|
| Autor de RestorApp | Daniel Rojas |
| Backend base | [prime-nestjs](https://github.com/josephgoksu/prime-nestjs) — Joseph Goksu, MIT (2021) |
| Frontend | Desarrollo original de Daniel Rojas |
| Documentación | Daniel Rojas, extraída del código real del repositorio |

RestorApp no está afiliado, patrocinado ni respaldado por Joseph Goksu ni por
el proyecto `prime-nestjs`. La referencia es únicamente de atribución por el
código base utilizado.

---

## 8. Contacto

Para permisos comerciales, distribución o consultas sobre la licencia,
contacta al titular del proyecto: **Daniel Rojas**.

- Repositorio: <https://github.com/dsrojasal/RestorAppV1>
