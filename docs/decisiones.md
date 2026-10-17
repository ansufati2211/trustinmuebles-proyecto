# Decisiones de diseño y ajustes respecto del informe

Cada decisión indica qué sección del informe afecta y quién debe confirmarla. Ninguna se considera cerrada hasta que el
equipo y el docente la acepten.

## D1. Se usa el stack que ya existía

**Qué:** Spring Boot 4 y Java 21 en el backend, React 19 y Vite en la interfaz, H2 en archivo como base.
**Por qué:** el equipo ya tenía esa base funcional y decidió no rehacerla. La sección 6.6.2 lo contempla.
**Afecta:** 6.6.2, Tabla 49, Figura 11. **Confirma:** equipo y docente.

## D2. El producto se llama Trustinmuebles en el código

**Qué:** el informe lo llama InmoClaro. El código, la interfaz y los repositorios dicen Trustinmuebles, y se dejó así por
decisión del equipo.
**Afecta:** portada, título y todo el texto del informe. **Confirma:** equipo. Hay que unificar el nombre antes de entregar.

## D3. Se retiró todo lo que el informe excluye

**Qué:** SUNARP simulado, inspección con planos 2D, trámites con firmas, posventa, métricas, registro abierto de cuentas,
publicación en GitHub Pages, Docker y el perfil PostgreSQL.
**Por qué:** 1.7, 4.3 y 6.5.4 los excluyen. Además los datos de ejemplo usaban nombres, direcciones, partidas y fotos con
apariencia real, lo que contradice RN-01 y PA2.
**Cómo se recupera:** el código anterior sigue en el historial de Git (commit `3a97ad5`).

## D4. El contenido vive en JSON versionado, no en SQL

**Qué:** casos, reglas y glosario están en `trustinmuebles-backend/src/main/resources/contenido/v0.1/`. Al arrancar se
cargan de forma idempotente y no pisan lo que el revisor ya editó. Las migraciones de Flyway solo crean el esquema.
**Por qué:** un especialista puede revisar un JSON sin leer SQL, y la versión del contenido queda explícita.
**Migraciones:** `V1`, `V2` y `V3` anteriores se reemplazaron por una sola `V1__esquema.sql`. No existía ninguna base
desplegada. Quien tenga una base antigua debe borrar `trustinmuebles-backend/data/`.

## D5. Base H2 en archivo en lugar de MySQL

**Qué:** H2 en modo PostgreSQL, guardada en `trustinmuebles-backend/data/h2/`.
**Por qué:** no requiere instalar nada y la ejecución es local, como pide el informe. El SQL es estándar.
**Afecta:** Tabla 49 («Persistencia»). **Riesgo:** H2 no es una base de producción.

## D6. Interpretaciones de las reglas, pendientes de revisión

Estas decisiones llenan vacíos del informe. Un especialista debe confirmarlas.

| # | Situación | Decisión | Dónde está |
|---|---|---|---|
| D6.1 | «El extracto no permite descartar otras anotaciones» | Se registra como completitud incompleta, y eso produce GRIS | B-03 y RN-04 |
| D6.2 | Estado de los ítems del checklist | No cambia el color del semáforo | `ChecklistService` |
| D6.3 | Regla prioritaria y datos faltantes a la vez | Gana GRIS (RN-04) y la alerta conocida sigue visible | `MotorClasificacion` |
| D6.4 | Regla prioritaria y condición no contemplada | ROJO, con la condición añadida como motivo | `MotorClasificacion` |
| D6.5 | Regla de revisión y condición no contemplada | AMARILLO, con la condición añadida como motivo | `MotorClasificacion` |
| D6.6 | Solo hay una regla de revisión (RV-01, anotación vigente) | No hay reglas prioritarias cargadas, porque esa tabla requiere revisión jurídica. No se trata la copropiedad ni la hipoteca como defecto | `reglas.json` |

## D7. El estado de una anotación no se repite en su descripción

**Qué:** los casos cargados dejan la descripción de cada anotación vacía. El estado sale del dato estructurado, y el PDF
sintético lo genera desde ese mismo dato.
**Por qué:** una descripción escrita («Anotación B2: vigente») se contradice cuando el revisor cambia el estado. Se detectó
en el recorrido del navegador.

## D8. Roles y permisos

- Hay dos roles: COMPRADOR y REVISOR. El comprador solo consulta.
- Cualquier cuenta REVISOR puede editar cualquier caso. `responsable_id` registra quién cargó el caso y no restringe la edición.
- Las cuentas las crea el equipo con `APP_SEED_PASSWORD`. No hay registro abierto.
- El rol se verifica en `SecurityConfig` (servidor). La interfaz solo oculta lo que el rol no puede hacer.

## D9. Seguridad de una instalación local

- El backend escucha solo en `127.0.0.1` y el servidor de desarrollo de Vite solo en localhost.
- El token de sesión está en `sessionStorage`: se pierde al cerrar la pestaña, útil cuando varios participantes comparten equipo.
- Se mantiene el límite de intentos de login (5 fallos bloquean la combinación cuenta e IP durante 15 minutos).
- Las contraseñas se guardan con BCrypt. `APP_SEED_PASSWORD` no tiene valor por defecto.
- `app.jwt.secret` y `app.storage.key` traen valores de desarrollo local en `application.properties`. Son solo para este
  uso local. No usar esta configuración en un servidor accesible desde la red.
- Swagger queda abierto en local (`/swagger-ui.html`).

## D10. Bloqueo optimista obligatorio

**Qué:** la edición exige `versionEsperada`. Si otra persona guardó antes, la respuesta es 409 y no se cambia nada.
**Por qué:** REQ-NF04 pide que una entrada inválida no deje registros parciales.

## D11. Versión de reglas

La versión activa sale de `app.reglas.version` (hoy `v0.1`). Al arrancar, cada expediente cuya evaluación falte, use otra
versión o esté atrasada se recalcula. Cada evaluación guarda la versión con que se calculó (RN-06).

## D12. DEMO-01 es un caso de familiarización

Lo diseñó el equipo a partir de la Figura 8. Sirve para el paso 6 de 3.14 (familiarización con un ejemplo distinto a los
casos evaluados) y no se evalúa.

## D13. Fecha referencial

Los casos traen la fecha de carga (2026-10-17). Se muestra con la advertencia «No es una consulta de actualidad oficial».
No hay vencimiento automático ni consulta de actualidad (RN-08).
