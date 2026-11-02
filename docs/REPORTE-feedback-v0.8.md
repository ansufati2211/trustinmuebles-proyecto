# Reporte: feedback docente y decisiones del equipo (v0.7.0 → v0.8.0)

Fecha: 2 de noviembre de 2026. Rama local `feedback-docente-v0.8`, creada desde `main`. No se hizo merge, push ni tags, salvo el tag
local de respaldo `respaldo-antes-v0.8` sobre `main`.

## Punto de partida

| Dato | Valor |
|---|---|
| Hash de `main` al inicio | `dc6b00ab7349b2e7c9716e6781f10edce19e1f27` (contiene `d7462f7`, merge de `mejoras-v0.7`) |
| Tag de respaldo | `respaldo-antes-v0.8` → `dc6b00a` |
| Línea base backend | 152 pruebas en 23 clases, 0 fallos, 0 errores, 0 omitidas |
| Línea base frontend | 66 pruebas en 11 archivos, todas aprobadas; build correcto |

## Resultado final

| Suite | Línea base | Final (FINAL y B8) |
|---|---|---|
| Backend `mvnw clean test` | 152 (23 clases) | **186** (30 clases), 0 fallos, 0 errores, 0 omitidas, `BUILD SUCCESS` |
| Frontend `pnpm test` | 66 (11 archivos) | **82** (15 archivos), todas aprobadas |
| Frontend `pnpm build` | Correcto | Correcto (con el aviso de tamaño del JS principal de siempre) |
| Recorrido de navegador v0.8 | — | **20 de 20** (segunda corrida; la primera dio 18 de 20, ver B9) |

## Bloques

| Bloque | Estado | Commit | Notas |
|---|---|---|---|
| B1 Evidencia de archivos y control de tamaño | Hecho | `237acd7` | V12; `DocumentosPdf`; regla del plano presentado; 422/400/413; origen del documento y descarga en la interfaz |
| B2 Ruta de regularización | Hecho | `d404ef0` | `rutas.json`; `RutasRegularizacion` (API pública de solo lectura); `GET /casos/{c}/ruta-regularizacion` |
| B3 Plazo del gravamen | Hecho | `22d72e6` | V13; acreedor (persona jurídica o «no consta») y plazo en el rubro D |
| B4 Panel por tipo de alerta y esfuerzo | Hecho | `9746fa0` | Panel, filtro `tipoAlerta`, `GET /casos/tipos-alerta`; D52 |
| B5 Semáforo de gestión | Hecho | `8ab3f1d` | `gestion.json`, V14, decisión de captación; D54; I15 en LEEME y MODELO |
| B6 Resaltado del color de A | Hecho | `eecac4a` | Tokens y `resaltadoA`; se restituyeron tokens de color perdidos en el rediseño |
| B7 Diagnóstico del 409 | Hecho | `64b7ca8` | Causa raíz en el log; respuesta sin cambios |
| B8 Versión 0.8.0 | Hecho | `aa8e175` | Suite completa en verde |
| B9 Recorrido v0.8 | Hecho | `c0db9e3` | 20 de 20; incluye una corrección de la interfaz (ver abajo) |
| B10 Documentación | Hecho | `9b96594` | LEEME, MODELO, funcionalidades, API, decisiones, guion, PARA-INFORME |

Ningún bloque falló ni se guardó en stash.

## Desvíos y decisiones tomadas durante la ejecución

- **Numeración de decisiones:** `docs/decisiones.md` ya tenía D50 y D51 (v0.7). Para no duplicar, las decisiones pedidas como D50,
  D51, D52 y D53 quedaron como **D52** (priorización solo en el panel del gestor), **D53** (PDF exigido y límites), **D54** (semáforo
  de gestión) y **D55** (ruta y criterios de esfuerzo). Se agregó **D56** (resaltado de A y tokens restituidos). PARA-INFORME lo explica.
- **Tokens de color ausentes (B6):** `src/index.css` no definía `sem-*`, `tinta-2`, `superficie`, `info-*`, `shadow-tarjeta`,
  `shadow-elevada` ni `ease-expo`, que los componentes usan; se perdieron en el rediseño `567cbfc`, así que esos colores no se generaban.
  Se restituyeron con los valores de la v0.6 (`31d9e6a`). Cambia el aspecto de pantallas existentes (vuelven los colores del
  semáforo, de los mensajes y las sombras).
- **Corrección en B9:** la primera corrida del recorrido dio 18 de 20. Paso 10: el script copiado había perdido el espacio de no
  separación del filtro de texto (defecto del script). Paso 16: la confirmación al publicar usaba las decisiones cargadas al abrir la
  página, así que una decisión registrada después no la disparaba (defecto real de la interfaz). `PanelPublicacion` ahora consulta las
  decisiones al pulsar «Publicar». La segunda corrida, sobre otra base nueva, dio 20 de 20.
- **Registro de partidas:** como al registrar aún no hay archivos, un plano presentado u observado en `POST /casos` también da 422; los
  planos se presentan después, al subir su PDF.
- **Planos ya presentados sin archivo:** conservan su estado (es la lámina generada de los diez casos de demostración, o datos de una
  base anterior). En una partida captada se rotulan «Falta el archivo» y no generan lámina (404).
- **Precedencia del semáforo de gestión:** como en A, primero la falta de información (COMPLETAR_INFORMACION), luego ALTO, MEDIO y BAJO.
  Por eso Subtanjalla (gris con una demanda) queda en «Completar información», y Pachacútec (amarillo por diferencia de área, esfuerzo
  alto) en «Requiere regularización».
- **Recorrido v0.7:** `recorrido-v07.mjs` marca planos como presentados sin PDF, que la v0.8 rechaza; queda como registro histórico.

## Pruebas cambiadas (reemplazadas por equivalentes)

La regla nueva del plano (RN13) y la validación de PDF con PDFBox (RN14) obligaron a cambiar estas pruebas. Ninguna se borró ni se
desactivó; cada una conserva lo que verificaba.

| Prueba | Antes | Ahora |
|---|---|---|
| `CasosApiTest.cancelarLaHipotecaRecalcula` | Marcaba presentados II.EE. e II.SS. por PUT | Los presenta subiendo su PDF; mismo resultado VERDE |
| `CasosApiTest.subirDocumento` | Un falso PDF y un SVG daban 422; subía un «PDF» de pocos bytes | Dan 400 (spec v0.8: «un archivo que no es PDF → 400»); sube un PDF real generado en la prueba |
| `PlanosApiTest.subirPlano` | Falso PDF → 422; subir a un plano no presentado → 422; restauraba volviendo a marcar «Presentado» | Falso PDF → 400; subir a un lote → 422; restaura quitando el archivo por JDBC (la API ya no permite volver a presentar sin archivo) y verifica el origen SUBIDO → GENERADO |
| `EdicionPartidaCaptadaTest` (`simulada`, `transcrita`) | Presentaba arquitectura y estructuras por PUT | Comprueba el 422 y los presenta subiendo su PDF; el historial tiene una fila por plano |
| `HistorialEvaluacionTest.planoFaltanteLlevaAVerde` | Registraba con planos presentados (AMARILLO) y presentaba los demás por PUT; 3 filas | Registra sin planos (GRIS) y los presenta subiendo su PDF; 5 filas con los mismos colores finales |
| `HistorialEvaluacionTest.planosNoBastanSiHayOtraAlerta` | PUT con II.EE. e II.SS. presentados | Sube sus PDF; La Tinguiña sigue AMARILLO por RV-02 |
| `HistorialEvaluacionTest.pdfNoLevantaElEmbargo` | Registraba con los cuatro planos presentados y subía «PDF» de pocos bytes | Presenta los planos subiendo PDF reales y comprueba las dos filas nuevas (EDICION, PLANO_ADJUNTO) en ROJO; I9 igual |
| `CicloCarteraTest.cicloCompleto` | Registraba con dos planos presentados; subsanaba por PUT; historial de 3 filas | Registra sin planos, presenta con PDF (403 al propietario), verifica el 422 y subsana con PDF; historial de 5 filas con los mismos estados finales |

Además se agregaron ayudas en `BaseApiTest` (`pdf`, `subirPlano`; `peticion` copia también `acreedor` y `plazoOVencimiento`) y el
generador `PdfDePrueba`. El test temporal usado para listar las rutas de los casos semilla (sección 12 del modelo) se borró y no se versionó.

## Pruebas nuevas

| Clase o archivo | Pruebas | Qué cubre |
|---|---|---|
| `DocumentosApiTest` | 7 | 422 sin archivo (editar y registrar); subir a plano no presentado; 400 no PDF, tipo, dañado y cifrado; optimización con páginas; 413 por máximo y por entrada; descarga con huella y origen; I9 |
| `almacenamiento.DocumentosPdfTest` | 5 | Bajo el umbral sin cambios; optimización y lado máximo; conservar el original si no baja; rechazos; formato |
| `RutaRegularizacionTest` | 6 | Parcona sin pasos; La Tinguiña MEDIO; Pueblo Nuevo ALTO; un paso por motivo en los 10 casos; solo lectura; visibilidad |
| `GravamenTest` | 3 | «No consta»; guardar y leer sin cambio de color; solo personas jurídicas y solo rubro D |
| `PanelTiposAlertaTest` | 4 | Conteos de la semilla; orden de «Por regularizar»; filtro y validación; 403 |
| `GestionInmobiliariaTest` | 6 | Campo solo para gestor y revisor; 403 en decisiones; listas cerradas; no cambia A, B ni historial; no bloquea publicar; conteos y matriz |
| `shared.ManejadorErroresTest` | 3 | Causa raíz en el log sin cambiar la respuesta (integridad, concurrencia, negocio) |
| Vitest `archivos.test.ts` | 5 | Formato, aviso previo, resumen de optimización, origen, «Presentado» habilitado |
| Vitest `ruta.test.ts` | 2 | Orden por esfuerzo, etiquetas |
| Vitest `gestion.test.ts` | 3 | Visibilidad, íconos distintos de A, confirmación al publicar |
| Vitest `resaltado.test.ts` | 3 | Clases por estado, etiqueta y ícono, sin evaluar |
| Vitest `catalogo.test.ts`, `cartera.test.ts` | +3 | Filtro por tipo de alerta, nombres, filtro por estado de gestión |

Backend: +34 pruebas (152 → 186). Frontend: +16 (66 → 82). `CasosApiTest.losDiezCasosTienenSuColor` no se tocó y sigue en verde.

## Migraciones nuevas

| Migración | Qué hace |
|---|---|
| `V12__evidencia_documentos.sql` | `archivo`: `tamano_original`, `optimizado`, `subido_por` (la huella, el tamaño final y la fecha ya existían) |
| `V13__gravamen_acreedor_plazo.sql` | `asiento`: `acreedor`, `plazo_vencimiento` |
| `V14__decision_captacion.sql` | Tabla `decision_captacion` (solo adición) con restricciones de lista cerrada |

No se modificó ninguna migración existente.

## Propiedades nuevas o cambiadas

| Propiedad | Valor | Nota |
|---|---|---|
| `app.archivos.max-entrada-mb` | 25 | Pruebas: 3 |
| `app.archivos.umbral-optimizacion-mb` | 5 | Pruebas: 0.25 |
| `app.archivos.max-almacenado-mb` | 10 | Pruebas: 1 |
| `spring.servlet.multipart.max-file-size` | 25MB | Antes 5MB |
| `spring.servlet.multipart.max-request-size` | 26MB | Antes 6MB |
| `server.tomcat.max-swallow-size` | 30MB | Para poder responder 413 en lugar de cortar la conexión |

## Reglas respetadas

- Sin commits, merges, rebases ni resets sobre `main`; sin push; sin `--force`, `git clean` ni borrado de ramas o tags.
- Motor (`MotorClasificacion`), `reglas.json` y contenido de los casos C1 a C4 sin cambios; los diez casos conservan su color.
- Sin dependencias nuevas (PDFBox y `javax.imageio`).
- Invariantes I1, I2, I3, I8, I9, I10, I11, I12, I13 e I14 con sus pruebas en verde; I15 nueva y probada.
- El recorrido usó una carpeta de datos nueva fuera del repositorio (no se tocó `trustinmuebles-backend/data`) y una contraseña temporal;
  el backend y la interfaz se detuvieron al final.

## Recorrido v0.8

`docs/pruebas/recorrido-v08.mjs`, resultado en `docs/pruebas/RESULTADO-recorrido-v08.md` y capturas en `docs/pruebas/capturas-v08/`:
**20 de 20 pasos correctos**, 0 errores de consola. Cubre (i) «Presentado» sin PDF rechazado, subida que presenta y un PDF de 5,4 MB
optimizado a 0,1 MB con su aviso; (ii) la ruta de Pueblo Nuevo (ALTO) y de La Tinguiña (MEDIO) sin editar La Tinguiña; (iii) el panel con
los conteos; (iv) NO_CAPTAR_POR_AHORA (PROCESO_JUDICIAL) en Pueblo Nuevo, la confirmación al volver a publicar y el comprador sin el
semáforo de gestión; (v) el filtro por tipo de alerta; (vi) las tarjetas resaltadas, también a 390 px sin desborde.

## Pendiente (fuera de este trabajo)

- Crear el tag `v0.8.0` y hacer el merge a `main` cuando el equipo lo apruebe.
- Revisión especializada de los criterios de esfuerzo (`rutas.json`) y de gestión (`gestion.json`).
- Ensayo a mano del guion con una persona frente a la pantalla.

## `git log --oneline main..feedback-docente-v0.8`

```
9b96594 B10: documentación de la v0.8.0 y bloques para el informe
c0db9e3 B9: recorrido de navegador v0.8 (20 de 20)
aa8e175 B8: versión 0.8.0
64b7ca8 B7: diagnóstico del 409 en el log del servidor
eecac4a B6: resaltado visual del color de A
8ab3f1d B5: semáforo de gestión interno y decisión de captación
9746fa0 B4: panel de cartera por tipo de alerta y esfuerzo
22d72e6 B3: acreedor y plazo del gravamen
d404ef0 B2: ruta de regularización por caso
237acd7 B1: evidencia de archivos y control de tamaño de PDF
```

(Más el commit de este reporte.)
