# Avisos de terceros

RestorApp usa y deriva código de proyectos de terceros. Este archivo
documenta el alcance de esas licencias para que la distribución sea legal
y transparente.

## prime-nestjs — solo backend

| Campo | Valor |
|---|---|
| Proyecto | prime-nestjs |
| Autor | Joseph Goksu |
| Repositorio | <https://github.com/josephgoksu/prime-nestjs> |
| Licencia | MIT |
| Copyright | (c) 2021 Joseph Goksu |
| Alcance en RestorApp | Backend `prime-nestjs/` (autenticación, configuración, base de datos, Docker, etc.) |

El backend de RestorApp se construyó a partir de prime-nestjs. Las porciones
derivadas de ese proyecto siguen sujetas a la licencia MIT. El texto completo
está en [`LICENSE-MIT`](LICENSE-MIT).

**El frontend `restorapp-nextjs/` no deriva de prime-nestjs.** Es desarrollo
original de Daniel Rojas y se rige por la licencia propietaria del proyecto.

## Dependencias de npm

Cada dependencia conserva su propia licencia. El texto de cada una está en
`node_modules/<paquete>/LICENSE` (o el archivo equivalente). Las licencias de
las dependencias no cambian la licencia del código de RestorApp.

## Cómo distribuir el backend

Si distribuyes el backend en código fuente, binario o imagen Docker, debes
incluir:

1. El archivo [`LICENSE-MIT`](LICENSE-MIT) con el copyright de Joseph Goksu.
2. Este archivo `THIRD_PARTY_NOTICES.md`.
3. Un aviso visible de que el backend deriva de prime-nestjs.

No es necesario conservar el logotipo, las imágenes ni el README original de
prime-nestjs. Esos recursos no forman parte del código que se reutiliza.

## Cómo distribuir el frontend

El frontend es original. Se rige por el archivo [`LICENSE`](LICENSE) del
proyecto. No requiere el aviso MIT de prime-nestjs.

## Contacto

Para permisos comerciales o consultas sobre la licencia propietaria, contacta
al titular del proyecto: Daniel Rojas.
