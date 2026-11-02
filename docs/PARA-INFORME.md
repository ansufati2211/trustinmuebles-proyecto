# Material para el informe (v0.7.0 y v0.8.0)

Tablas para pegar en Word, comprobadas el 30 de octubre de 2026 sobre la rama `mejoras-v0.7`. Lo que no se pudo comprobar lo dice.
Las novedades de la v0.8.0 están en la última sección, «Feedback docente 31/10/2026 y decisiones del 02/11 (v0.8.0)».
La correspondencia con RF, RN, CUN y CP está en la sección 16 de
[MODELO-NEGOCIO-IMPLEMENTADO.md](MODELO-NEGOCIO-IMPLEMENTADO.md).

**Caso de referencia:** LedCons, sin acta ni acuerdo formal acreditado.

## Anexo 19. Módulos del backend

Spring Modulith verifica sus límites en `ModularityTests`.

| N.° | Módulo | Responsabilidad |
|---|---|---|
| 1 | `identidad` | Cuentas, roles, inicio de sesión con JWT, seguridad por ruta y perfil profesional del especialista |
| 2 | `expediente` | Casos, partida registral, captación, autorización, publicación, planos y documentos PDF |
| 3 | `clasificacion` | Motor de reglas del indicador A, evaluación vigente e historial de solo adición |
| 4 | `inspeccion` | Indicador B: solicitud, asignación del especialista e informe técnico |
| 5 | `cartera` | Solicitudes de contacto y panel de cartera del gestor |
| 6 | `checklist` | Ítems del expediente, incluida la declaración jurada HR y PU |
| 7 | `orientacion` | Glosario cerrado y términos asociados a cada expediente |
| 8 | `almacenamiento` | Archivos PDF cifrados en disco |
| 9 | `shared` | Excepciones, manejo de errores y utilidades comunes |

## Anexo 20. Versiones exactas

| Componente | Versión |
|---|---|
| Trustinmuebles (backend e interfaz) | 0.7.0 |
| Java | 21 (ejecutado con Temurin 21.0.13) |
| Maven (wrapper) | 3.10.0 |
| Spring Boot | 4.0.8 |
| Spring Modulith | 2.0.8 |
| springdoc-openapi | 3.0.3 |
| Flyway | 11.14.1 |
| H2 | 2.4.240 |
| Apache PDFBox | 3.0.7 |
| Node.js | 22.16.0 (el LEEME pide 20 o superior) |
| pnpm | 9.15.9 |
| React y React DOM | 19.2.4 |
| React Router | 8.3.1 |
| Vite | 8.0.5 |
| Vitest | 5.0.5 |
| puppeteer-core (solo el recorrido) | 25.16.0 |
| Tailwind CSS | 4.2.2 |
| TypeScript | 5.9.3 |
| lucide-react | 1.38.0 |
| Reglas de contenido activas | v0.4 (borrador pendiente de revisión especializada) |
| Sistema operativo de la prueba | Windows 11 Pro |

## Anexo 24. Endpoints

Base: `/api/v1`, en `http://127.0.0.1:8080`. Son 26 operaciones.

| N.° | Método | Ruta | Permiso | Respuestas |
|---|---|---|---|---|
| 1 | POST | `/auth/login` | Público | 200, 400, 401, 429 |
| 2 | GET | `/auth/me` | Sesión | 200, 401 |
| 3 | GET | `/casos` | Sesión | 200, 400, 401 |
| 4 | POST | `/casos` | REVISOR | 201, 400, 401, 403, 409 |
| 5 | GET | `/casos/{codigo}` | Sesión | 200, 401, 404 |
| 6 | DELETE | `/casos/{codigo}` | REVISOR | 204, 401, 403, 404, 409 |
| 7 | PUT | `/casos/{codigo}/expediente` | REVISOR | 200, 400, 401, 403, 404, 409 |
| 8 | PATCH | `/casos/{codigo}/checklist/{itemId}` | REVISOR | 200, 400, 401, 403, 404 |
| 9 | POST | `/casos/{codigo}/documento` | REVISOR | 201, 401, 403, 404, 413, 422 |
| 10 | GET | `/casos/{codigo}/documento` | Sesión | 200, 401, 404 |
| 11 | GET | `/casos/{codigo}/historial` | REVISOR, GESTOR, ESPECIALISTA, PROPIETARIO del caso | 200, 401, 403, 404 |
| 12 | PUT | `/casos/{codigo}/autorizacion` | PROPIETARIO del caso | 200, 401, 403, 404 |
| 13 | DELETE | `/casos/{codigo}/autorizacion` | PROPIETARIO del caso | 200, 401, 403, 404 |
| 14 | POST | `/casos/{codigo}/publicacion` | GESTOR | 200, 401, 403, 404, 409, 422 |
| 15 | DELETE | `/casos/{codigo}/publicacion` | GESTOR | 200, 401, 403, 404, 409 |
| 16 | POST | `/casos/{codigo}/inspeccion/solicitud` | COMPRADOR | 201, 401, 403, 404, 409 |
| 17 | PUT | `/casos/{codigo}/inspeccion/asignacion` | GESTOR | 200, 400, 401, 403, 404, 409 |
| 18 | PUT | `/casos/{codigo}/inspeccion` | ESPECIALISTA asignado | 200, 400, 401, 403, 404, 409, 422 |
| 19 | GET | `/casos/{codigo}/inspeccion/documento` | Sesión | 200, 401, 404 |
| 20 | GET | `/casos/{codigo}/planos/{especialidad}/documento` | Sesión | 200, 401, 404 |
| 21 | POST | `/casos/{codigo}/planos/{especialidad}/documento` | REVISOR | 201, 401, 403, 404, 413, 422 |
| 22 | POST | `/casos/{codigo}/contactos` | COMPRADOR | 201, 400, 401, 403, 404, 409 |
| 23 | GET | `/contactos` | GESTOR | 200, 401, 403 |
| 24 | PUT | `/contactos/{id}/atencion` | GESTOR | 200, 401, 403, 404, 409 |
| 25 | GET | `/cartera/panel` | GESTOR | 200, 401, 403 |
| 26 | GET | `/glosario` | Sesión | 200, 401 |

## Anexo 25. Resultados de las pruebas

Fecha: 30 de octubre de 2026. Commit del código: `36d3ba5`, rama `mejoras-v0.7`. Lo posterior a ese commit es solo documentación.

| Prueba | Comando | Ejecutadas | Aprobadas | Fallos | Errores | Omitidas |
|---|---|---|---|---|---|---|
| Backend | `mvnw test` | 149 | 149 | 0 | 0 | 0 |
| Frontend | `pnpm test` | 66 | 66 | 0 | — | 0 |
| Compilación | `pnpm build` | Correcta, con aviso de tamaño del JavaScript principal | | | | |
| Recorrido de navegador | `docs/pruebas/recorrido-v07.mjs` | 15 pasos | 15 | 0 | 0 de consola | 0 |

### Resultado de NF02

Medido con `scripts/medir-nf02.mjs` el 30 de octubre de 2026: 11 casos en la base, listado más apertura de un expediente, solo la API.

| Ejecuciones | En 2 s o menos | Mínimo | Mediana | Máximo | Meta | Resultado |
|---|---|---|---|---|---|---|
| 20 | 20 | 22,0 ms | 25,2 ms | 54,3 ms | 19 de 20 | Cumple |

Equipo: Windows 11, Intel Core i7-1165G7, 8 núcleos, 11,7 GiB de RAM, Node.js 22.16.0.

**No ejecutado:** imágenes Docker; respaldo y restauración; instalación en otro equipo.

## Anexo 26. Capturas

Carpeta `docs/pruebas/capturas-v07/`. Una captura por paso del recorrido, con 1280 px de ancho y la página completa.

| N.° | Archivo | Cuenta | Qué muestra |
|---|---|---|---|
| 1 | `01-registro-borrador.png` | revisor-01 | `SIM-99000404` registrada con origen simulado, en borrador |
| 2 | `02-comprador-no-ve-borrador.png` | comprador-01 | El borrador no aparece por URL |
| 3 | `03-propietario-ajeno.png` | propietario-01 | Un caso ajeno no aparece |
| 4 | `04-gestor-sin-autorizacion.png` | gestor-01 | Sin botón «Publicar» y con el aviso de autorización |
| 5 | `05-propietario-autoriza.png` | propietario-02 | Autorización registrada |
| 6 | `06-revisor-a-e-historial.png` | revisor-01 | Indicador A e historial, con «Partida simulada incorporada» |
| 7 | `07-subsanacion.png` | revisor-01 | Planos incorporados: de amarillo a verde, con entrada nueva |
| 8 | `08-gestor-publica.png` | gestor-01 | Caso publicado, con A sin cambios |
| 9 | `09-comprador-consulta.png` | comprador-01 | Contacto e inspección solicitados en `SIM-11075836` |
| 10 | `10-gestor-atiende-asigna.png` | gestor-01 | Inspección asignada a `especialista-02` |
| 11 | `11-especialista-no-asignado.png` | especialista-01 | Sin formulario: asignada a otro especialista |
| 12 | `12-especialista-emite.png` | especialista-02 | Informe emitido y A sigue en rojo |
| 13 | `13-panel-cartera.png` | gestor-01 | Panel de cartera con 11 casos |
| 14 | `14-retira-autorizacion.png` | comprador-01 | Tras el retiro, el caso ya no aparece |
| 15 | `15-pie-y-login.png` | Sin sesión | Login con el aviso de entorno demostrativo |

Las capturas muestran datos simulados. Solo la 15 corresponde a la pantalla de login; el pie legal se ve en las demás capturas con pie.

## Tabla 10. Pruebas por requisito funcional

Una clase de prueba puede cubrir más de un RF, por eso esta tabla no suma el total. Los totales están en la tabla siguiente.

| RF | Requisito | Pruebas automáticas principales | Recorrido | Estado |
|---|---|---|---|---|
| RF01 | Acceso | `SeguridadTest`, `CuentasDemoTest`, `CarteraTest.permisosPorRol` | Pasos 2, 3, 4 y 11 | Implementado |
| RF02 | Captación | `CaptacionPublicacionTest.naceEnBorrador`, `propietarioObligatorio`; `RegistrarPartidaTest` | Paso 1 | Implementado |
| RF03 | Autorización | `CaptacionPublicacionTest.autorizacionSoloDelPropietario`, `autorizarNoCambiaElColor` | Pasos 5 y 14 | Implementado |
| RF04 | Expediente | `CasosApiTest`, `PlanosApiTest`, `NormalizadorAsientosTest` | Paso 7 | Implementado |
| RF05 | Indicador A | `MotorClasificacionTest`, `MotorPlanosTest` | Pasos 1, 6 y 7 | Implementado |
| RF06 | Historial | `HistorialEvaluacionTest` | Pasos 6 y 7 | Implementado |
| RF07 | Publicación | `CaptacionPublicacionTest.soloElGestorPublica`, `sinAutorizacionNoSePublica`, `visibilidadPorRol` | Pasos 2, 4, 8 y 14 | Implementado |
| RF08 | Consulta | `CatalogoYServiciosTest.filtrosCombinados`, `CasosApiTest.glosario`, `CopiaLiteralPdfTest`, `LaminaPdfTest`; `catalogo.test.ts` | Paso 9 | Implementado |
| RF09 | Contacto | `CarteraTest.contactoSobreRojo`, `motivoCerrado`, `contactoSoloPublicado`; `contacto.test.ts` | Pasos 9 y 10 | Implementado |
| RF10 | Inspección B | `InspeccionTest`, `CarteraTest.soloElAsignadoEmite`, `sinAsignacionNadieEmite`, `InformeTecnicoPdfTest`; `etapas.test.ts` | Pasos 9 a 12 | Implementado |
| RF11 | Propietario | `CaptacionPublicacionTest.propietarioVeSoloLoSuyo`, `propietarioSoloLectura` | Pasos 3 y 5 | Implementado |
| RF12 | Cartera | `CarteraTest.panelCoherente`; `cartera.test.ts` | Paso 13 | Implementado |

### Pruebas por clase o archivo

| Clase o archivo | N.° | Clase o archivo | N.° |
|---|---|---|---|
| `CasosApiTest` | 23 | `ModularityTests` | 2 |
| `CatalogoYServiciosTest` | 14 | `InformeTecnicoPdfTest` | 2 |
| `RegistrarPartidaTest` | 12 | `CicloCarteraTest` | 1 |
| `CaptacionPublicacionTest` | 11 | `ConfiguracionLocalTest` | 1 |
| `MotorClasificacionTest` | 10 | `MigracionV6Test` | 1 |
| `CarteraTest` | 9 | `MigracionEspecialistaTest` | 1 |
| `HistorialEvaluacionTest` | 9 | `MigracionAsignacionTest` | 1 |
| `CopiaLiteralPdfTest` | 9 | **Total backend** | **149** |
| `SeguridadTest` | 8 | `permisos.test.ts` | 15 |
| `MotorPlanosTest` | 7 | `catalogo.test.ts`, `cartera.test.ts` | 7 + 7 |
| `NormalizadorAsientosTest` | 7 | `disociar.test.ts`, `etapas.test.ts`, `leerPartida.test.ts`, `historial.test.ts` | 6 + 6 + 6 + 6 |
| `InspeccionTest` | 6 | `areas.test.ts`, `contacto.test.ts` | 4 + 4 |
| `LaminaPdfTest` | 6 | `limitesLegales.test.tsx`, `fuentes.test.ts` | 3 + 2 |
| `PlanosApiTest` | 6 | **Total frontend** | **66** |
| `CuentasDemoTest` | 3 | | |

## Feedback docente 31/10/2026 y decisiones del 02/11 (v0.8.0)

Tablas comprobadas el 2 de noviembre de 2026 sobre la rama `feedback-docente-v0.8`. Pruebas: backend 186 de 186, frontend 82 de 82,
build correcto y recorrido de navegador v0.8 con 20 de 20 pasos (`docs/pruebas/RESULTADO-recorrido-v08.md`). «Paso v08-n» es un paso de
ese recorrido. Las decisiones que el plan llamaba D50 a D53 quedaron como **D52 a D55** porque D50 y D51 ya existían (v0.7).

### Origen de los cambios

| Fuente | Pedido | Respuesta en la v0.8.0 |
|---|---|---|
| Feedback docente (a) | Ver la cartera por tipo de problema y cuáles casos son más viables o tomarán más tiempo | Panel del gestor por tipo de alerta, por esfuerzo y por estado de gestión; lista «Por regularizar»; filtro por tipo de alerta (RF14, D52) |
| Feedback docente (b) | Ruta de regularización por caso y, si consta, cuánto plazo le falta a la hipoteca | Ruta de regularización (RF13, D55) y acreedor y plazo del gravamen en el rubro D |
| Feedback docente (c) | Un plano aparece «Presentado» sin archivo; exigir el archivo real | Un plano presentado u observado exige su PDF (RF04 modificado, RN13, D53) |
| Decisión del equipo 1 | El estudio usará la v0.8.0 | Versión 0.8.0; congelar con el tag `v0.8.0` antes del piloto |
| Decisión del equipo 2 | Semáforo de gestión interno para decidir la captación | Semáforo de gestión y decisión de captación (RF15, RN17, I15, D54) |
| Decisión del equipo 3 | Criterios de esfuerzo del equipo, rotulados como borrador | `rutas.json` y `gestion.json` rotulados «borrador del equipo, pendiente de revisión especializada» (D55) |
| Decisión del equipo 4 | PDF: entrada hasta 25 MB, optimización sobre 5 MB, máximo almacenado 10 MB | `DocumentosPdf` y propiedades `app.archivos.*` (NF09, RN14, D53) |

### Requisitos funcionales nuevos o modificados

| RF | Requisito | Actor | Prueba automática | Recorrido | Estado |
|---|---|---|---|---|---|
| RF04 (modificado) | Mantener partida, planos y checklist; un plano solo queda presentado u observado con su PDF real (o la lámina generada de la demostración); cada documento muestra su origen y se puede descargar | Revisor | `DocumentosApiTest`, `PlanosApiTest`; Vitest `archivos.test.ts` | Pasos v08-1 a v08-3 | Implementado |
| RF12 (ampliado) | El gestor consulta la cartera también por tipo de alerta, esfuerzo y estado de gestión, con la lista «Por regularizar» | Gestor | `PanelTiposAlertaTest`, `GestionInmobiliariaTest.conteosDelPanel` | Paso v08-15 | Implementado |
| RF13 | Ruta de regularización por caso: pasos por motivo, quién gestiona, documento, esfuerzo y plazo del gravamen si consta | Todos los que ven el detalle | `RutaRegularizacionTest`, `GravamenTest`; Vitest `ruta.test.ts` | Pasos v08-8 y v08-14 | Implementado (criterios en borrador) |
| RF14 | Cartera por tipo de alerta y esfuerzo; filtro por tipo de alerta en el catálogo y en Cartera | Gestor; filtro: todos | `PanelTiposAlertaTest`; Vitest `catalogo.test.ts`, `cartera.test.ts` | Pasos v08-15 y v08-17 | Implementado |
| RF15 | Semáforo de gestión interno y decisión de captación con historial de solo adición | Gestor (decide), revisor (consulta) | `GestionInmobiliariaTest`; Vitest `gestion.test.ts` | Pasos v08-12, v08-16 y v08-18 | Implementado |

### Requisitos no funcionales

| NF | Requisito | Cómo se cumple | Prueba | Estado |
|---|---|---|---|---|
| NF01 (ampliado) | Accesibilidad: nunca solo color | El resaltado de A (borde, fondo tenue) siempre va con ícono y la etiqueta del estado; el semáforo de gestión usa contorno sin relleno y otros íconos; el esfuerzo se escribe con palabras; contraste AA del texto sobre el fondo tenue | Vitest `resaltado.test.ts`, `gestion.test.ts`; paso v08-18 (también a 390 px, sin desborde) | Cumple técnicamente; sin prueba con lectores de pantalla |
| NF09 | Archivos: PDF de hasta 25 MB, optimización automática sobre 5 MB, máximo almacenado 10 MB, rechazo con mensaje claro; evidencia (tamaños, huella SHA-256, cuenta y fecha) | `DocumentosPdf` (PDFBox y `javax.imageio`, sin dependencias nuevas), migración V12, aviso previo en la interfaz | `DocumentosApiTest`, `DocumentosPdfTest`; Vitest `archivos.test.ts`; paso v08-3 | Cumple |

### Reglas de negocio nuevas

| RN | Regla | Prueba | Estado |
|---|---|---|---|
| RN13 | Un plano solo queda presentado u observado si tiene su PDF; intentarlo sin archivo da 422 | `DocumentosApiTest.presentadoSinArchivoDa422`, `subirAPlanoNoPresentado` | Probado |
| RN14 | PDF: cabecera, tipo y apertura con PDFBox (400 si no); hasta 25 MB de entrada; optimización sobre 5 MB conservando las páginas; si no baja de 10 MB, 413 | `DocumentosApiTest.validacion`, `optimiza`, `rechazaPorTamano`; `DocumentosPdfTest` | Probado |
| RN15 | La ruta de regularización es orientativa, de solo lectura, sin plazos ni costos inventados, y no cambia A | `RutaRegularizacionTest.soloLectura`, `GravamenTest.guardarYLeerSinCambiarElColor` | Probado |
| RN16 | La priorización por esfuerzo solo existe en el panel del gestor y no es una recomendación de compra (D52, matiza D41) | `PanelTiposAlertaTest.soloGestor`, `porRegularizarOrdenada` | Probado |
| RN17 | El semáforo de gestión es interno, no cambia A ni B y no bloquea publicar (I15) | `GestionInmobiliariaTest` | Probado |

### Casos de uso de negocio nuevos

| CUN | Nombre | Actores | Flujo principal | Prueba | Recorrido |
|---|---|---|---|---|---|
| CUN06 | Priorizar y regularizar la cartera | Gestor, revisor, propietario (fuera) | El gestor ve la cartera por tipo de alerta y esfuerzo; abre la ruta del caso; el revisor sube los PDF que aporta el propietario; el motor recalcula y el historial lo registra | `PanelTiposAlertaTest`, `RutaRegularizacionTest`, `DocumentosApiTest` | Pasos v08-2, v08-3, v08-8, v08-14 y v08-15 |
| CUN07 | Decidir la captación con el semáforo de gestión | Gestor | El gestor revisa el estado de gestión, los tipos de alerta y la ruta; registra la decisión y el motivo; si la última es «no captar por ahora», confirma antes de publicar | `GestionInmobiliariaTest.decisionNoCambiaAniB`, `decisionNoBloqueaPublicar` | Paso v08-16 |

### Casos de prueba nuevos

| CP | Caso | Prueba automática | Paso del recorrido v0.8 | Resultado |
|---|---|---|---|---|
| CP18 | Plano presentado sin PDF da 422; subir el PDF a un plano no presentado lo presenta y agrega una fila al historial | `DocumentosApiTest.presentadoSinArchivoDa422`, `subirAPlanoNoPresentado` | v08-1 y v08-2 | Aprobado |
| CP19 | Un archivo que no es PDF, cifrado o dañado da 400; una entrada sobre el límite o un PDF que no baja del máximo da 413 | `DocumentosApiTest.validacion`, `rechazaPorTamano`; `DocumentosPdfTest.rechazos`, `noReducible` | v08-3 (aviso previo); el 413 solo en prueba automática | Aprobado |
| CP20 | Un PDF con imágenes grandes se optimiza, baja de tamaño y conserva sus páginas; la descarga tiene la misma huella; el documento dice su origen; I9 se mantiene | `DocumentosApiTest.optimiza`, `descargaYOrigen`, `pdfNoLevantaUnRojo`; `DocumentosPdfTest.optimizaImagenes` | v08-3 y v08-10 | Aprobado |
| CP21 | La ruta corresponde a las reglas de los casos semilla (Parcona sin pasos, La Tinguiña MEDIO, Pueblo Nuevo ALTO), no cambia el color ni el historial y el comprador recibe 404 en un borrador | `RutaRegularizacionTest` | v08-4, v08-8 y v08-14 | Aprobado |
| CP22 | Acreedor y plazo del gravamen: guardar y leer, vacío «No consta», sin cambio de color; solo personas jurídicas y solo en el rubro D | `GravamenTest` | v08-14 | Aprobado |
| CP23 | Los conteos por tipo de alerta y por esfuerzo coinciden con los 10 casos semilla; el filtro devuelve los casos correctos; el panel da 403 a los demás roles | `PanelTiposAlertaTest` | v08-15 y v08-17 | Aprobado |
| CP24 | Comprador, propietario y especialista no reciben el semáforo de gestión y reciben 403 en los endpoints de decisión; la decisión no cambia A, B ni el historial de A; historial de decisiones de solo adición; publicar funciona con cualquier decisión | `GestionInmobiliariaTest`; Vitest `gestion.test.ts` | v08-7, v08-12, v08-14, v08-16 y v08-18 | Aprobado |
| CP25 | Resaltado de A con borde, fondo tenue, ícono y texto (nunca solo color), también en celular; el 409 por base de datos registra la causa raíz en el log sin cambiar la respuesta | Vitest `resaltado.test.ts`; `ManejadorErroresTest` | v08-7 y v08-18 (el log del 409 no se recorre) | Aprobado |

### Decisiones

| N.° | Decisión | Motivo |
|---|---|---|
| D52 | La priorización por esfuerzo solo existe en el panel del gestor, con el aviso «Priorización interna de la inmobiliaria; no es una recomendación de compra». Matiza D41 (sin rankings) | Feedback (a) sin convertir el sistema en un recomendador de compra |
| D53 | Un plano presentado exige su PDF; validación con PDFBox, entrada hasta 25 MB, optimización sobre 5 MB y máximo almacenado 10 MB, con evidencia del archivo | Feedback (c) y decisión 4 |
| D54 | Semáforo de gestión interno (cuatro estados derivados de la ruta) y decisión de captación con listas cerradas e historial de solo adición; solo gestor y revisor | Decisión 2; protege I15 |
| D55 | Ruta de regularización con criterios de esfuerzo del equipo (BAJO, MEDIO, ALTO) rotulados como borrador; sin plazos ni costos; acreedor y plazo del gravamen opcionales | Feedback (b) y decisión 3 |

(D56, de la interfaz, documenta el resaltado de A y la restitución de los tokens de color que el rediseño había quitado de `index.css`.)

### Invariante nueva

| ID | Invariante | Prueba | Estado |
|---|---|---|---|
| I15 | El semáforo de gestión es interno (solo GESTOR y REVISOR): no cambia A ni B, no se muestra al comprador, al propietario ni al especialista y no bloquea la publicación | `GestionInmobiliariaTest.soloGestorYRevisorVenElCampo`, `permisosDeDecision`, `decisionNoCambiaAniB`, `decisionNoBloqueaPublicar`; Vitest `gestion.test.ts`; pasos v08-12 y v08-16 | Probado |

Las invariantes I1, I2, I3, I8, I9, I10, I11, I12, I13 e I14 siguen en verde con sus pruebas; el motor y `reglas.json` no cambiaron y
los diez casos semilla conservan su color (`CasosApiTest.losDiezCasosTienenSuColor`).

### Cambios para la sección 6.4.2 (flujo y propuesta de valor)

| Elemento | Antes (v0.7) | Ahora (v0.8) |
|---|---|---|
| ETP-1 Captación | El revisor registra el caso y podía marcar planos presentados | Los planos se registran no presentados y se presentan al subir su PDF. El gestor puede registrar la decisión de captación con el semáforo de gestión, sin bloquear la publicación |
| ETP-4 Subsanación | El revisor edita y el motor recalcula | Además, la ruta de regularización dice qué falta por cada motivo, quién lo gestiona, qué documento se necesita y el esfuerzo; el revisor sube el PDF real de cada plano (validado y optimizado) |
| ETP-8 Seguimiento | Totales por color y publicación, faltantes, inspecciones y contactos | Además, casos por tipo de alerta, por esfuerzo y por estado de gestión, matriz tipo de alerta × estado de gestión y lista «Por regularizar» |
| Propuesta de valor para la inmobiliaria | Ordenar la información del comprador | Además, ver su cartera por tipo de problema, cuáles casos son más viables o requerirán más gestión y qué falta para regularizar cada uno, y dejar constancia de su decisión de captación (hipótesis no validada) |

### Cambios para la sección 6.5.2 y el anexo 18 (contenido y datos)

| Elemento | Archivo o tabla | Contenido |
|---|---|---|
| Rutas de regularización | `contenido/v0.4/rutas.json` | Por regla (RP-01 a RP-03, RV-01 a RV-06) y por faltante que da gris: título, pasos, quién gestiona, documento requerido, esfuerzo y nota. Borrador del equipo |
| Reglas de gestión | `contenido/v0.4/gestion.json` | Cuatro estados (VIABLE, VIABLE_CON_CONDICIONES, REQUIERE_REGULARIZACION, COMPLETAR_INFORMACION) con etiqueta, explicación y sugerencia, sin plazos ni costos. Borrador del equipo |
| Metadatos de documentos | Tabla `archivo` (V12) | Tamaño original y final, si se optimizó, huella SHA-256 del archivo guardado, cuenta que lo subió y fecha |
| Gravamen | Tabla `asiento` (V13) | `acreedor` (persona jurídica o «no consta») y `plazo_vencimiento`, solo en el rubro D |
| Decisiones de captación | Tabla `decision_captacion` (V14) | Caso, decisión, motivo (listas cerradas), cuenta y fecha. Solo adición |

### Anexo 23. Servicios (agregar)

| Servicio | Módulo | Responsabilidad |
|---|---|---|
| `DocumentosPdf` | `almacenamiento` | Valida, optimiza y limita los PDF que sube una persona |
| `RutasRegularizacion` | `expediente` (API pública) | Calcula la ruta de regularización desde la evaluación vigente; solo lectura |
| `SemaforoGestion` | `expediente` (API pública) | Deriva el estado de gestión de la ruta; solo lectura |
| `CarteraService` (ampliado) | `cartera` | Panel por tipo de alerta, esfuerzo y gestión; decisiones de captación |
| `ClasificacionService.tiposDeAlerta` | `clasificacion` | Lista los tipos de alerta de la versión de reglas activa (no toca el motor) |

### Anexo 24. Endpoints nuevos de la v0.8

| N.° | Método | Ruta | Permiso | Respuestas |
|---|---|---|---|---|
| 27 | GET | `/casos/tipos-alerta` | Sesión | 200, 401 |
| 28 | GET | `/casos/{codigo}/ruta-regularizacion` | Sesión, con la visibilidad del detalle | 200, 401, 404 |
| 29 | POST | `/casos/{codigo}/decision-captacion` | GESTOR | 201, 400, 401, 403, 404 |
| 30 | GET | `/casos/{codigo}/decisiones-captacion` | GESTOR, REVISOR | 200, 401, 403, 404 |

Cambiaron: `GET /casos` (filtro `tipoAlerta`; campos `tiposAlerta` y, para gestor y revisor, `gestion`), `GET /casos/{codigo}` (campos
`documento` y `gestion`), `PUT /casos/{codigo}/expediente` y `POST /casos` (422 si un plano presentado no tiene archivo; acreedor y plazo
en el rubro D), `POST /casos/{codigo}/documento` y `POST /casos/{codigo}/planos/{especialidad}/documento` (400 y 413 nuevos; respuesta con
tamaños y `optimizado`) y `GET /cartera/panel` (conteos nuevos).

### Anexo 26. Capturas de la v0.8

Carpeta `docs/pruebas/capturas-v08/`, 1280 px de ancho y página completa salvo las indicadas.

| N.° | Archivo | Cuenta | Qué muestra |
|---|---|---|---|
| 1 | `01-registro-borrador.png` | revisor-01 | Registro con los planos sin presentar: «Presentado» deshabilitado sin PDF; caso en gris |
| 2 | `02-plano-sin-pdf-y-subida.png` | revisor-01 | Rechazo de «Presentado» sin PDF y planos presentados al subir su PDF, con «Subido por revisor-01» |
| 3 | `03-pdf-grande-optimizado.png` | revisor-01 | Aviso «Se optimizará automáticamente» y «Optimizado: 5,4 MB → 0,1 MB» |
| 4 | `04-comprador-no-ve-borrador.png` | comprador-01 | El borrador no aparece por URL |
| 5 | `05-propietario-ajeno.png` | propietario-01 | Un caso ajeno no aparece |
| 6 | `06-gestor-sin-autorizacion.png` | gestor-01 | Sin botón «Publicar» |
| 7 | `07-propietario-autoriza.png` | propietario-02 | Autorización registrada; Mis inmuebles con resaltado |
| 8 | `08-subsanacion.png` | revisor-01 | Último plano subido: de amarillo a verde; ruta sin pasos |
| 9 | `09-gestor-publica.png` | gestor-01 | Caso publicado, con A sin cambios |
| 10 | `10-comprador-consulta.png` | comprador-01 | Contacto e inspección solicitados en `SIM-11075836` |
| 11 | `11-gestor-atiende-asigna.png` | gestor-01 | Inspección asignada a `especialista-02` |
| 12 | `12-especialista-no-asignado.png` | especialista-01 | Sin formulario y sin panel de gestión |
| 13 | `13-especialista-emite.png` | especialista-02 | Informe emitido; A sigue en rojo |
| 14 | `14-ruta-regularizacion.png` | comprador-01 | Ruta de La Tinguiña (medio, «No consta en la partida») tras ver la de Pueblo Nuevo (alto) |
| 15 | `15-panel-cartera.png` | gestor-01 | Casos por tipo de alerta, esfuerzo, gestión (interno), matriz y «Por regularizar» |
| 16 | `16-decision-captacion.png` | comprador-01 | Tras la decisión del gestor, el comprador no ve el semáforo de gestión |
| 17 | `16b-panel-gestion.png` | gestor-01 | Panel «Gestión inmobiliaria (interno)» de Pueblo Nuevo (vista de pantalla) |
| 18 | `17-filtro-tipo-alerta.png` | comprador-01 | Catálogo filtrado por RV-02 |
| 19 | `18-tarjetas-resaltadas.png` | gestor-01 | Lista de Cartera con chips de A, gestión y esfuerzo |
| 20 | `18b-tarjetas-celular.png` | comprador-01 | Catálogo a 390 px (vista inicial) |
| 21 | `18c-cartera-chips.png` | gestor-01 | Lista de Cartera con chips (vista de pantalla) |
| 22 | `19-retira-autorizacion.png` | comprador-01 | Tras el retiro, el caso ya no aparece |
| 23 | `20-pie-y-login.png` | Sin sesión | Login con el aviso de entorno demostrativo |

### Fila para la Tabla 49 (control de cambios)

| Origen | Versión | Fecha | Cambios | Evidencia |
|---|---|---|---|---|
| Feedback docente 31/10/2026 → v0.8.0 | 0.8.0 | 02/11/2026 | Plano presentado con PDF real y control de tamaño; ruta de regularización y plazo del gravamen; cartera por tipo de alerta y esfuerzo; semáforo de gestión interno con decisión de captación; resaltado del color de A; diagnóstico del 409 | Rama `feedback-docente-v0.8`; backend 186/186, frontend 82/82, recorrido v0.8 20/20; `docs/REPORTE-feedback-v0.8.md` |

### Para la metodología

- **Condición asistida de la v0.8.0:** incluye la ruta de regularización, porque el participante con rol de comprador la ve en el
  detalle. **No incluye el semáforo de gestión**, porque el comprador no lo ve (I15).
- **Congelamiento:** la versión del estudio debe congelarse con el tag `v0.8.0` antes del piloto, para que todos los participantes usen
  exactamente el mismo comportamiento. Este trabajo no creó ese tag.
- Los criterios de esfuerzo y de gestión son un borrador del equipo pendiente de revisión especializada; si cambian, la versión del
  estudio debe cambiar.
