# Resumen de la v0.7.0 «Ciclo de cartera» — sesión 1 (backend y pruebas)

Rama `feature/v0.7-ciclo-cartera`, sobre `main` (`9a7c65b`, con el rediseño de landing y login). Sin push.

## Resultado

El backend cubre el ciclo de cartera completo: captación con propietario, autorización del propietario, publicación por el
gestor, visibilidad por rol, historial de evaluaciones de solo adición, subsanación con recálculo, contacto del comprador,
asignación del especialista y panel de cartera. El ciclo se comprobó de punta a punta con `CicloCarteraTest`, sobre una base
H2 en memoria propia y con las reglas reales del motor. **No se modificó el frontend** (`git diff 9a7c65b..HEAD --
trustinmuebles/` está vacío).

## Fases

| Fase | Estado | Commit | `mvnw test` al cerrar la fase |
|---|---|---|---|
| F0. Línea base y versión 0.7.0 | Completa | `56c001f` | 107 ejecutadas, 107 aprobadas, 0 fallos, 0 errores, 0 omitidas (antes y después) |
| F1. Actores, captación y publicación | Completa | `5f822f0` | 122 / 0 / 0 / 0 |
| F2. Subsanación e historial | Completa | `e0d41fd` | 131 / 0 / 0 / 0 |
| F3. Contacto, asignación y panel | Completa | `c2ea59c` | 139 / 0 / 0 / 0 |
| F6. Ciclo completo (`CicloCarteraTest`) | Completa | `9c23269` | 140 / 0 / 0 / 0 |
| F7. Cierre | Completa | este commit | 140 / 0 / 0 / 0 (ejecución final, ver abajo) |

F4 y F5 no forman parte de esta sesión (son de la sesión 2, la interfaz).

**Conteo final real:** 140 pruebas ejecutadas, 140 aprobadas, 0 fallos, 0 errores, 0 omitidas (`mvnw test` del cierre). La
línea base coincidió con las 107 esperadas. Pruebas nuevas: `CaptacionPublicacionTest` (11), `MigracionV6Test` (1),
`CuentasDemoTest` (3), `HistorialEvaluacionTest` (9), `CarteraTest` (8) y `CicloCarteraTest` (1).

## Endpoints nuevos

Todas las rutas empiezan por `/api/v1` y exigen sesión.

| Ruta | Rol autorizado | Respuesta esperada |
|---|---|---|
| `PUT /casos/{codigo}/autorizacion` | PROPIETARIO del caso | 200 con `publicacion`; 403 a otro rol o a otro propietario |
| `DELETE /casos/{codigo}/autorizacion` | PROPIETARIO del caso | 200; un caso publicado pasa a `RETIRADO` |
| `POST /casos/{codigo}/publicacion` | GESTOR | 200; 422 sin autorización vigente; 409 si ya está publicado |
| `DELETE /casos/{codigo}/publicacion` | GESTOR | 200; 409 si no está publicado |
| `GET /casos/{codigo}/historial` | REVISOR, GESTOR, ESPECIALISTA, PROPIETARIO del caso | 200 con las filas; 403 al comprador; 404 al propietario ajeno |
| `PUT /casos/{codigo}/inspeccion/asignacion` | GESTOR | 200; 400 especialista inválido; 409 sin solicitud o ya emitida |
| `POST /casos/{codigo}/contactos` | COMPRADOR | 201; 400 motivo inválido o texto libre; 404 no publicado; 409 pendiente duplicada |
| `GET /contactos?estado=` | GESTOR | 200 |
| `PUT /contactos/{id}/atencion` | GESTOR | 200; 404 inexistente; 409 ya atendida |
| `GET /cartera/panel` | GESTOR | 200 (solo lectura) |

Cambios en rutas existentes: `POST /casos` exige `propietarioCodigo` y crea en `BORRADOR`; el comprador solo ve casos publicados
y el propietario solo los suyos (404 en otro caso); `PUT /casos/{c}/inspeccion` da 403 al especialista no asignado; subir el
PDF de un plano recalcula (origen `PLANO_ADJUNTO`). Detalle en `docs/api.md`.

## Migraciones y cuentas

- `V6__captacion_y_publicacion.sql`: roles GESTOR y PROPIETARIO, `usuario.funcion`, y por caso `propietario_codigo`,
  `autorizacion_fecha` y `estado_publicacion`, con la restricción «publicado ⇒ autorizado». Los 10 casos quedan publicados,
  autorizados y repartidos 5 y 5.
- `V7__historial_evaluacion.sql`: historial de evaluaciones.
- `V8__contacto_y_asignacion.sql`: `solicitud_contacto` y `evaluacion_tecnica.especialista_asignado_codigo`.
- V1 a V5 no se tocaron.
- Cuentas nuevas (contraseña `APP_SEED_PASSWORD`, creadas también en una base existente): `gestor-01` (GESTOR, asesor
  comercial), `propietario-01`, `propietario-02` y `especialista-02` (Arq. Perfil Ficticio 02, `SIM-CAP-0002`).

## Invariantes y dónde se prueban

| | Invariante | Pruebas |
|---|---|---|
| I1 | Verde = «Sin alertas en los campos evaluados» | `CatalogoYServiciosTest.verdeSignificaSinAlertas`, `CicloCarteraTest` |
| I2 | B nunca cambia A | `CatalogoYServiciosTest.informeConRiesgoNoCambiaElColor`, `CicloCarteraTest` |
| I3 | El checklist (HR y PU) no cambia A | `CatalogoYServiciosTest.hrPuNoCambiaElColor`, `HistorialEvaluacionTest.operacionesSinRecalculo`, `CicloCarteraTest` |
| I4 | Autorización en el servidor | `SeguridadTest`, `CaptacionPublicacionTest`, `CarteraTest.permisosPorRol`, `CicloCarteraTest` |
| I5 | `ModularityTests` en verde | `ModularityTests` (con el nuevo módulo `cartera`), `CicloCarteraTest` |
| I6 | Solo `127.0.0.1` | `ConfiguracionLocalTest`, `CicloCarteraTest` |
| I8 | El color solo cambia por un recálculo | `CaptacionPublicacionTest.publicarRojoNoCambiaElColor`, `autorizarNoCambiaElColor`, `HistorialEvaluacionTest`, `CarteraTest` |
| I9 | Un plano o PDF no levanta un rojo registral | `HistorialEvaluacionTest.pdfNoLevantaElEmbargo` |
| I10 | Publicar y contactar no dependen del color | `CaptacionPublicacionTest.publicarRojoNoCambiaElColor`, `CarteraTest.contactoSobreRojo` |
| I11 | Sin nombres, DNI ni teléfonos; motivos cerrados | `CuentasDemoTest.sinDatosPersonales`, `CarteraTest.motivoCerrado`, `CaptacionPublicacionTest.demostracionPublicada` |
| I12 | Historial de solo adición | `HistorialEvaluacionTest.historialInmutable`, `CicloCarteraTest` |
| I13 | El propietario solo autoriza lo suyo | `CaptacionPublicacionTest.autorizacionSoloDelPropietario`, `propietarioSoloLectura` |
| I14 | Sin autorización no se publica | `CaptacionPublicacionTest.sinAutorizacionNoSePublica`, `MigracionV6Test`, `CicloCarteraTest` |

## Supuestos registrados

D32 a D42 en `docs/decisiones.md`. Los principales: el reparto alternado de los casos entre propietarios (D33); retirar la
autorización despublica (D34); 404 en lugar de 403 para casos no visibles (D35); historial sin clave foránea, que se conserva al
borrar una transcrita (D36); el origen de cada recálculo y que subir el PDF de un plano recalcule (D37); el módulo `cartera`, el
listado de contactos y el rechazo de campos desconocidos (D39); la reasignación mientras no esté emitida y el perfil de
`especialista-02` (D40).

## Desvíos respecto del plan

- **Pruebas existentes adaptadas (sin debilitarlas):** el conteo de cuentas en `CasosApiTest` y `SeguridadTest` pasó de 3 a la
  constante `CUENTAS_DEMO` (7); en `RegistrarPartidaTest` la partida lleva `propietarioCodigo` y se autoriza y publica antes de
  que el comprador la vea, porque ahora nace en borrador (D32, D34).
- **Ruta adicional** `GET /contactos` para que el gestor encuentre la solicitud que atiende (D39).
- **Rechazo de campos desconocidos en el contacto:** la anotación de Jackson no bastó (la configuración global ignora campos
  desconocidos); el cuerpo se valida a mano. Fue el único problema que necesitó más de un intento (resuelto en el segundo).
- **Comparación de áreas por valor** en el origen del recálculo: 84.5 y 84.50 se trataban como distintos (corregido en F2).

## Pendientes y no verificado

Ver `docs/PENDIENTES.md`. No se verificó: la interfaz (no se tocó), el arranque real del backend contra una base en archivo
(`data/`) existente de la v0.6 —la migración V6 se probó con `MigracionV6Test` sobre una base en memoria con datos v0.6, no sobre
la base real—, el recorrido de navegador y la documentación Swagger de las rutas nuevas. No hay errores sin resolver.

**Confirmación:** no se modificó ningún archivo del frontend (`trustinmuebles/`).
