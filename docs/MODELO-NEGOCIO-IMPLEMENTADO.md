# Modelo de negocio implementado — Trustinmuebles v0.7.0

Este documento describe lo que el **código y las pruebas** hacen hoy. Cuando la documentación anterior dice otra cosa, manda
el código, y la diferencia se anota. Lo que no se pudo comprobar dice **No verificado**.

## 0. Ficha

| Campo | Valor |
|---|---|
| Versión | `0.7.0` en el backend (`trustinmuebles-backend/pom.xml`) y en la interfaz (`trustinmuebles/package.json`) |
| Fecha de esta revisión | 30 de octubre de 2026, sobre la rama `mejoras-v0.7`, creada desde `main` en `9b155a5` |
| Pruebas del backend | `./mvnw test`: **149 ejecutadas, 149 aprobadas**, 0 fallos, 0 errores, 0 omitidas; `BUILD SUCCESS` |
| Pruebas del frontend | `npx pnpm@9 test`: **11 archivos, 66 pruebas, 66 aprobadas** |
| Compilación del frontend | `npx pnpm@9 build`: correcta (`tsc --noEmit` y `vite build`), con aviso de tamaño del JS principal |
| Organización de referencia del caso | LedCons, sin acta ni acuerdo formal acreditado |
| Alcance | MVP académico con **datos simulados**, para **una sola inmobiliaria de Ica** |
| Verificación en navegador | Recorrido de 15 pasos con los 5 roles en Chrome: **15 de 15 correctos** el 30 de octubre de 2026 (`docs/pruebas/RESULTADO-recorrido-v07.md`). No cubre lectores de pantalla ni otros navegadores |
| Rendimiento (NF02) | **20 de 20** en 2 s o menos; mediana 25,2 ms, máximo 54,3 ms. Solo la API |

Las pruebas del backend son de integración (MockMvc con H2 en memoria) y unitarias; las del frontend son de funciones puras
(Vitest), más una que renderiza el pie (`limitesLegales.test.tsx`); **no prueban cómo se dibujan las demás pantallas**.

## 1. Propuesta de valor

**Problema que reduce:** el comprador suele decidir sin entender la partida registral ni saber qué documentos faltan.
Trustinmuebles ordena la partida y los planos de cada inmueble de la cartera, explica sus términos (glosario), señala lo que
falta (faltantes y checklist) y, si el comprador lo pide, registra una evaluación técnica presencial.

**Qué NO hace** (comprobado en el código; ninguna ruta lo hace):
- No certifica saneamiento. Cada evaluación lleva el texto fijo «No certifica saneamiento ni recomienda comprar»
  (`MotorClasificacion.LIMITE`, verificado por `MotorClasificacionTest` y `CasosApiTest`).
- No recomienda comprar ni ordena casos por conveniencia (el panel no tiene rankings, D41).
- No consulta fuentes oficiales en línea: no hay cliente HTTP hacia SUNARP ni a la Municipalidad; la interfaz solo abre
  enlaces (`lib/fuentes.ts`).
- No reemplaza a un abogado o notario: la etapa 9 es un texto fijo en el detalle, no una función.

## 2. Segmentos y cliente

| | Quién | Evidencia |
|---|---|---|
| **Quién paga (hipótesis)** | La inmobiliaria de Ica que usa el sistema con su propia cartera | Solo documentación (LEEME, D21, D49). El código no tiene cobros, planes ni facturación |
| **Quién usa, externo** | El comprador | Rol `COMPRADOR` |
| **Quién usa, interno** | Personal de la inmobiliaria: revisor, gestor (asesor comercial) y especialistas | Roles `REVISOR`, `GESTOR`, `ESPECIALISTA` |
| **Quién autoriza** | El propietario del inmueble | Rol `PROPIETARIO` |

El sistema es de **una sola organización**: el código no modela empresas, sucursales ni varias inmobiliarias. No hay datos de
contacto de la inmobiliaria en el sistema.

**Organización de referencia del caso:** LedCons, sin acta ni acuerdo formal acreditado. Ningún dato del sistema proviene de esa
organización y el código no la modela.

## 3. Actores

**Sobre el personal:** que revisor, gestor y especialistas sean personal **de la inmobiliaria** (no de una empresa aparte)
lo dice la documentación (LEEME, D21) y es coherente con el código: no existe ninguna entidad «empresa» ni «proveedor», el
servicio de inspección dice «Coordinado con la inmobiliaria» (`InspeccionService.CONDICIONES`) y la credencial vacía dice «la
inmobiliaria coordina la visita» (`PanelEvaluacionTecnica.tsx`). El código no puede probar el vínculo laboral: es una
**afirmación de modelo**, no un dato del sistema.

| ID | Actor | Rol en el sistema | Responsabilidades | Qué NO puede hacer | Evidencia |
|---|---|---|---|---|---|
| ACT-01 | Comprador | `COMPRADOR` (`comprador-01`) | Consultar el catálogo de casos **publicados** y su detalle; solicitar contacto; solicitar la inspección técnica (único rol que puede) | Ver borradores o retirados (404); ver el historial (403); ver el código del propietario; editar nada | `ExpedienteService.visible`, `SecurityConfig`; `CaptacionPublicacionTest.visibilidadPorRol`, `CatalogoYServiciosTest.soloElCompradorSolicita`, `HistorialEvaluacionTest.accesoAlHistorial` |
| ACT-02 | Revisor | `REVISOR` (`revisor-01`) | Registrar la captación (partida transcrita o simulada, con el código del propietario); editar partida, planos y checklist; subir PDF; eliminar partidas captadas | Autorizar por el propietario; publicar; emitir el informe técnico; solicitar inspección | `SecurityConfig` (PUT/POST/PATCH/DELETE `/casos/**`); `CaptacionPublicacionTest.autorizacionSoloDelPropietario`, `soloElGestorPublica`, `CasosApiTest.checklistSoloRevisor` |
| ACT-03 | Gestor (asesor comercial) | `GESTOR` (`gestor-01`, función «Asesor comercial») — el asesor comercial **es** este rol | Publicar y retirar casos; atender contactos; asignar o reasignar el especialista; ver el panel de cartera | Editar la partida o el checklist; autorizar; emitir el informe | `DemoUsuariosSeeder.FUNCION_GESTOR`, `SecurityConfig`; `CaptacionPublicacionTest.soloElGestorPublica`, `CarteraTest.permisosPorRol` |
| ACT-04 | Especialista | `ESPECIALISTA` (`especialista-01`, `especialista-02`) | Registrar el avance y emitir el informe técnico (indicador B) de las inspecciones que el gestor le asignó, firmado con los datos de su cuenta | Actuar sin asignación (409) o si la inspección está asignada a otro (403); editar la partida; cambiar el color de A | `InspeccionService.registrar`; `CarteraTest.soloElAsignadoEmite`, `sinAsignacionNadieEmite`, `CatalogoYServiciosTest.identidadDelEspecialistaBloqueada` |
| ACT-05 | Propietario | `PROPIETARIO` (`propietario-01`, `propietario-02`) | Ver solo sus casos (también en borrador) y su historial; otorgar o retirar su autorización | Editar, subir documentos, publicar; ver casos ajenos (404); autorizar casos ajenos (403) | `ExpedienteService.casoDelPropietario`; `CaptacionPublicacionTest.propietarioSoloLectura`, `propietarioVeSoloLoSuyo`, `autorizacionSoloDelPropietario` |
| ACT-06 | Abogado o notario | Externo | Verificación jurídica antes de comprar (etapa 9) | No tiene cuenta ni función en el sistema | Texto fijo en `Expediente.tsx` (D48). Sin prueba automática |
| ACT-07 | SUNARP (Conoce Aquí, Visor BGR) | Externo, fuente consultada **a mano** | El revisor consulta Conoce Aquí y pega el texto; el comprador o el revisor abren el Visor BGR | El sistema no consulta ni lee SUNARP: solo abre enlaces | `lib/fuentes.ts`, D20. Sin conexión en el backend |
| ACT-08 | Municipalidad | Externo, fuente consultada **a mano** | Emite la declaración jurada (HR y PU) que aporta el propietario; el revisor marca el ítem del checklist | El sistema no consulta a la Municipalidad | Ítem «Declaración Jurada Municipal (HR y PU)»; `CatalogoYServiciosTest.itemHrPuEnLosDiezCasos` |

## 4. Flujo de vida del inmueble

Las etapas ETP-1 a ETP-8 se recorrieron en Chrome con los 5 roles (`docs/pruebas/RESULTADO-recorrido-v07.md`).

| ID | Etapa | Quién | Qué ocurre | Pantalla / ruta del frontend | Endpoint | Prueba | Estado |
|---|---|---|---|---|---|---|---|
| ETP-1 | Captación | Propietario (fuera) y revisor | El propietario **inicia el proceso fuera del sistema**: entrega sus documentos a la inmobiliaria. El revisor registra el caso con el código de cuenta del propietario; nace en `BORRADOR` y sin autorización. **El indicador A se calcula en ese mismo momento** (origen `PARTIDA_TRANSCRITA` del historial). El revisor elige un **origen obligatorio**: `TRANSCRITA_CONOCE_AQUI` (número sin `SIM-`, fuente «Conoce Aquí – SUNARP») o `SIMULADA_DEMOSTRACION` (número con `SIM-`, fuente «Partida simulada para demostración», `sintetico = true`). El **precio referencial** es opcional y `ProteccionDatos` se aplica a ambos orígenes. Los 10 casos de demostración no pasan por aquí: los carga `CasosSeeder` ya publicados | Menú «Registrar partida» → `#/casos/nueva` (`RegistrarPartida.tsx`) | `POST /api/v1/casos` | `CaptacionPublicacionTest.naceEnBorrador`, `propietarioObligatorio`; `RegistrarPartidaTest.revisorRegistra`, `origenObligatorio`, `prefijoSegunElOrigen`, `simuladaRegistrada`, `precioEnElCatalogo`, `precioInvalido` | Implementado |
| ETP-2 | Autorización | Propietario | El propietario entra con su cuenta y confirma su autorización. **El indicador A ya está calculado antes de autorizar** (desde ETP-1) y el propietario lo ve; autorizar **no** recalcula ni cambia el color. La autorización solo habilita la publicación. Retirarla de un caso publicado lo deja `RETIRADO`. Autorizar dos veces conserva la primera fecha | Panel «Publicación y autorización» (`PanelPublicacion.tsx`), botones «Autorizar publicación» y «Retirar autorización», en `#/mis-inmuebles` y en la columna lateral del detalle `#/casos/{código}` | `PUT` y `DELETE /api/v1/casos/{código}/autorizacion` | `CaptacionPublicacionTest.autorizacionSoloDelPropietario`, `autorizarNoCambiaElColor`; `CicloCarteraTest.cicloCompleto` | Implementado |
| ETP-3 | Pre-evaluación documental (indicador A) | Motor de reglas (automático) | Calcula verde, amarillo, rojo o gris con las reglas `v0.4` sobre el rubro D, los datos mínimos y los planos. Recalcula al registrar, al editar, al subir el PDF del caso o de un plano, y al arrancar si falta o cambió la versión. Cada recálculo agrega una fila al historial | Semáforo del detalle `#/casos/{código}` y de las tarjetas de `#/casos` | Sin endpoint propio: lo disparan `POST /casos`, `PUT /casos/{c}/expediente`, `POST /casos/{c}/documento`, `POST /casos/{c}/planos/{e}/documento` | `MotorClasificacionTest` (10), `MotorPlanosTest` (7), `CasosApiTest.losDiezCasosTienenSuColor`, `colorNoSeFijaAMano` | Implementado |
| ETP-4 | Subsanación | Revisor | Incorpora asientos, planos o el PDF que faltaban; el motor recalcula y el historial lo registra con su origen | Detalle: botón «Editar partida» (`EditorExpediente.tsx`) y subida de PDF en el panel de planos (`PanelPlanos.tsx`); historial en `HistorialEvaluaciones.tsx` | `PUT /casos/{c}/expediente`, `POST /casos/{c}/planos/{e}/documento`, `POST /casos/{c}/documento`, `GET /casos/{c}/historial` | `HistorialEvaluacionTest.planoFaltanteLlevaAVerde`, `cadaRecalculoAgregaUnaFila`, `pdfNoLevantaElEmbargo` | Implementado |
| ETP-5 | Publicación | Gestor | Publica solo con autorización vigente (422 sin ella; 409 si ya está publicado); puede volver a publicar un caso retirado si sigue autorizado. No mira el color de A | Botones «Publicar» y «Retirar» en el panel «Publicación y autorización» del **detalle** del caso, no en la lista de `#/cartera` (la propia pantalla lo indica) | `POST` y `DELETE /api/v1/casos/{código}/publicacion` | `CaptacionPublicacionTest.soloElGestorPublica`, `sinAutorizacionNoSePublica`, `publicarRojoNoCambiaElColor`; `MigracionV6Test.conservaLosDiezCasos` | Implementado |
| ETP-6 | Consulta y contacto | Comprador y gestor | El comprador ve el catálogo de publicados y pide contacto con un motivo de lista cerrada (sin texto libre; una pendiente por caso). El gestor la marca atendida. El comprador **no** puede consultar después si fue atendida (D46) | Comprador: `#/casos` (menú «Expedientes») y botón «Solicitar contacto» en el detalle (`SolicitudContacto.tsx`). Gestor: bandeja de `#/cartera`, botón «Marcar atendida» | `GET /casos`, `GET /casos/{c}`, `POST /casos/{c}/contactos`, `GET /contactos?estado=`, `PUT /contactos/{id}/atencion` | `CarteraTest.contactoSoloPublicado`, `motivoCerrado`, `contactoSobreRojo`; `CaptacionPublicacionTest.visibilidadPorRol`; Vitest `contacto.test.ts` | Implementado |
| ETP-7 | Evaluación técnica presencial (indicador B) | Comprador, gestor y especialista | El comprador la solicita (costo referencial S/ 250.00, sin pago en línea); el gestor **debe** asignar un especialista (lista fija `especialista-01` y `especialista-02`, D45); sin asignación nadie registra avance ni emite (409, D51); el asignado registra el avance y emite el informe, firmado con su cuenta. No cambia A | Panel de evaluación técnica del detalle (`PanelEvaluacionTecnica.tsx`): «Solicitar inspección técnica» (comprador), «Asignar especialista» / «Reasignar» (gestor), formulario del informe (especialista), «Ver informe técnico (PDF)» | `POST /casos/{c}/inspeccion/solicitud`, `PUT /casos/{c}/inspeccion/asignacion`, `PUT /casos/{c}/inspeccion`, `GET /casos/{c}/inspeccion/documento` | `InspeccionTest.flujoCompleto`, `CatalogoYServiciosTest.soloElCompradorSolicita`, `informeConRiesgoNoCambiaElColor`, `CarteraTest.soloElAsignadoEmite`, `sinAsignacionNadieEmite`, `cargaConAsignacion`, `asignacionInvalida` | Implementado |
| ETP-8 | Seguimiento de la cartera | Gestor | Totales por color de A y por publicación, casos con faltantes, inspecciones solicitadas o en curso con su asignación, contactos pendientes y lista filtrable. Solo lectura | Menú «Cartera» → `#/cartera` (`Cartera.tsx`) | `GET /cartera/panel`, `GET /casos`, `GET /contactos?estado=PENDIENTE` | `CarteraTest.panelCoherente`; Vitest `cartera.test.ts` | Implementado |
| ETP-9 | Verificación jurídica | Comprador con abogado o notario | Fuera del sistema. El detalle muestra a todos «Siguiente paso: verificación jurídica con abogado o notario, fuera del sistema» | Texto fijo en la columna lateral del detalle | — | Sin prueba | Fuera del sistema |

**ETP-1 dejó de ser parcial:** la captación admite los dos orígenes y el precio referencial. La entrega de documentos del
propietario sigue ocurriendo fuera del sistema y no se registra en él.

## 5. Servicios

| | Indicador A — pre-evaluación documental | Indicador B — evaluación técnica presencial |
|---|---|---|
| Quién lo activa | Nadie lo pide: el motor lo calcula para todo caso al registrarlo o cambiar sus datos | Solo el comprador, a pedido, una vez por caso (409 a la segunda) |
| Costo | Incluido. El código no tiene precio para A | S/ 250.00 referencial (`app.inspeccion.costo-referencial`, valor por defecto en `InspeccionService`). Sin pasarela de pago ni agenda |
| Resultado | Color con motivos, alertas, faltantes, versión de reglas y el texto de límite | Estado (no solicitada, solicitada, en inspección, emitido) y, si se emite, conclusión favorable, con observaciones o con riesgo; informe en PDF |
| Reglas | Tabla `v0.4` en `contenido/v0.4/reglas.json`, rotulada «borrador del equipo, pendiente de revisión especializada» | Solo el especialista que el gestor asignó registra avance o emite; firma desde la cuenta (M8); fecha de inspección no futura |
| Relación | Nunca lo cambia B (RN-10, I2) | No lee ni escribe el módulo `clasificacion` |

### Colores del indicador A

Etiquetas exactas (`EstadoSemaforo.java`) y cuándo salen (`MotorClasificacion.evaluar`). La precedencia es, en este orden:
faltantes → gris; alerta prioritaria → rojo; alerta de revisión → amarillo; condición no contemplada → gris; si no, verde.

| Color | Etiqueta exacta | Cuándo sale |
|---|---|---|
| Verde | «Sin alertas en los campos evaluados» | Datos mínimos completos, ninguna regla aplicada y condición representada contemplada. Agrega el motivo «Esto no significa saneamiento» |
| Amarillo | «Requiere revisión» | Al menos una regla de revisión vigente: RV-01 otro acto en gravámenes, RV-02 hipoteca, RV-03 carga técnica o servidumbre, RV-04 falta plano de II.EE. o II.SS., RV-05 el área del plano difiere más de 1 % de la inscrita (o no hay inscrita), RV-06 plano observado; sin alerta prioritaria ni faltantes |
| Rojo | «Alerta prioritaria» | Al menos una regla prioritaria vigente: RP-01 embargo, RP-02 anotación de demanda o medida cautelar, RP-03 bloqueo registral; sin faltantes |
| Gris | «Información insuficiente o condición no evaluable» | Falta un dato mínimo (condición representada, titularidad, extracto completo, estado de alguna anotación del rubro D o, en una vivienda, el plano de arquitectura o de estructuras), **aunque haya un rojo**: las alertas conocidas se siguen mostrando. También sale si la condición representada no está contemplada y no hay otra alerta |

Los gravámenes cancelados y la copropiedad no generan alerta (`MotorClasificacionTest.canceladoYCopropiedadNoAlertan`). En
un lote los planos no aplican (`MotorPlanosTest.loteSinPlanos`).

## 6. Reglas de negocio

RN-01 a RN-08 vienen de `docs/trazabilidad.md`; RN-09 y RN-10, de `docs/notas-informe.md`. Algunas pruebas que cita
`trazabilidad.md` ya no existen con ese nombre (ver la entrega de esta revisión); abajo van las que existen hoy.

| ID | Regla | Estado | Evidencia en código o prueba |
|---|---|---|---|
| RN-01 | Solo casos sintéticos | Parcial: las 10 partidas ficticias y las captadas como simuladas cumplen; las partidas transcritas (D20) son un desvío **pendiente de aprobación del asesor** | Prefijo `SIM-` y `sintetico = true`; `CasosApiTest.contenidoCargado`, `sinRastrosDelEstudio`, `RegistrarPartidaTest.prefijoSegunElOrigen` |
| RN-02 | Datos mínimos; desconocido no equivale a ausencia | Implementado | `MotorClasificacion` (faltantes); `MotorClasificacionTest.desconocidoNoEsAusencia` |
| RN-03 | Clasificación y precedencia | Implementado | `MotorClasificacionTest.verde`, `amarilloYRojoPorTipoDeActo`, `demandaYMedidaCautelar` |
| RN-04 | Información insuficiente da gris y conserva las alertas | Implementado | `MotorClasificacionTest.grisConservaAlertas`; `CasosApiTest.subtanjallaGrisConservaAlerta`, `sinCopiaLiteralGris` |
| RN-05 | Límite de salida en toda evaluación | Implementado | `MotorClasificacion.LIMITE`; `MotorClasificacionTest.verde`, `CasosApiTest.parconaVerde` |
| RN-06 | El color se recalcula, no se escribe | Implementado | No hay ruta que fije el color; `CasosApiTest.colorNoSeFijaAMano`, `cancelarLaHipotecaRecalcula`; `MotorClasificacionTest.llevaVersion` |
| RN-07 | Solo el revisor modifica el checklist | Implementado | `SecurityConfig` (PATCH `/casos/**`); `CasosApiTest.checklistSoloRevisor` |
| RN-08 | Fecha referencial sin vencimiento automático | Implementado, **sin prueba automática** | Comprobado leyendo el código: no hay lógica de vencimiento. La advertencia visible en pantalla: **No verificado** tras el rediseño |
| RN-09 | La pre-evaluación documental no afirma el estado físico | Implementado por diseño, **sin prueba específica** | La entrada del motor (`EntradaClasificacion`) no tiene datos físicos; no hay regla por estado físico (D21). Fuente: `notas-informe.md`, propuesta para el informe |
| RN-10 | El informe técnico no cambia el color documental | Implementado | `CatalogoYServiciosTest.informeConRiesgoNoCambiaElColor`, `InspeccionTest.flujoCompleto`, `CicloCarteraTest.cicloCompleto` |

## 7. Invariantes

| ID | Invariante | Prueba | Estado |
|---|---|---|---|
| I1 | Verde significa exactamente «Sin alertas en los campos evaluados»; no certifica saneamiento | `CatalogoYServiciosTest.verdeSignificaSinAlertas`, `CicloCarteraTest.cicloCompleto` | Probado en el backend |
| I2 | B nunca cambia A | `CatalogoYServiciosTest.informeConRiesgoNoCambiaElColor`, `InspeccionTest.flujoCompleto`, `CicloCarteraTest.cicloCompleto` | Probado |
| I3 | El checklist (incluida HR y PU) no cambia A | `CatalogoYServiciosTest.hrPuNoCambiaElColor`, `HistorialEvaluacionTest.operacionesSinRecalculo` | Probado |
| I4 | La autorización está en el servidor | `SeguridadTest` (8), `CaptacionPublicacionTest`, `CarteraTest.permisosPorRol` | Probado |
| I5 | Los módulos solo se comunican por sus APIs públicas | `ModularityTests.respetaLosLimitesEntreModulos` | Probado |
| I6 | El backend escucha solo en `127.0.0.1` | `ConfiguracionLocalTest.soloEscuchaEnLocal` (lee `application.properties`) | Probado para la ejecución local. En Docker, dentro del contenedor el backend escucha en `0.0.0.0` (`SERVER_ADDRESS` en `trustinmuebles-backend/Dockerfile`), pero no publica puertos, y el frontend se publica en `127.0.0.1`. Esa configuración no se ha ejecutado y la prueba no la cubre |
| I7 | Los límites legales y el aviso de datos simulados se muestran en el pie; el login comunica el entorno demostrativo | `limitesLegales.test.tsx` (renderiza `components/layout/Footer.tsx`, el pie activo) | Probado para el pie. El login, sin pie, dice «Entorno académico demostrativo · Datos sintéticos»: sin prueba automática. Ninguno se ha visto en un navegador |
| I8 | El color de A solo cambia cuando el motor recalcula | `CaptacionPublicacionTest.publicarRojoNoCambiaElColor`, `autorizarNoCambiaElColor`; `HistorialEvaluacionTest.operacionesSinRecalculo`; `CarteraTest.contactoSobreRojo`, `soloElAsignadoEmite` | Probado |
| I9 | Un plano o un PDF no levanta un rojo por embargo, bloqueo o demanda | `HistorialEvaluacionTest.pdfNoLevantaElEmbargo`; `MotorPlanosTest.losPlanosNoCambianElRojo` | Probado |
| I10 | Publicar y pedir contacto no dependen del color de A | `CaptacionPublicacionTest.publicarRojoNoCambiaElColor`, `CarteraTest.contactoSobreRojo` | Probado |
| I11 | Sin nombres, DNI ni teléfonos de propietarios o compradores; contacto con motivos cerrados | `CuentasDemoTest.sinDatosPersonales`, `CarteraTest.motivoCerrado`, `CaptacionPublicacionTest.demostracionPublicada`; Vitest `contacto.test.ts` | Probado (`sinDatosPersonales` solo revisa las cuentas GESTOR y PROPIETARIO) |
| I12 | Historial de evaluaciones de solo adición | `HistorialEvaluacionTest.historialInmutable` | Probado |
| I13 | El propietario solo autoriza sus propios casos | `CaptacionPublicacionTest.autorizacionSoloDelPropietario`, `propietarioSoloLectura`; Vitest `permisos.test.ts` | Probado |
| I14 | Nada se publica sin autorización vigente | `CaptacionPublicacionTest.sinAutorizacionNoSePublica`, `MigracionV6Test.conservaLosDiezCasos`, `CicloCarteraTest.cicloCompleto`; restricción `ck_caso_publicado_autorizado` (V6) | Probado |

**Sin prueba automática:** el texto del login de I7. I6 está probada solo como propiedad de configuración, no sobre el despliegue
con Docker.

## 8. Fuentes de información

| Gratuitas (consultadas a mano) | Aportadas por el propietario o de pago |
|---|---|
| Conoce Aquí (SUNARP): el revisor transcribe el texto de la partida | Copia literal certificada (SUNARP, con costo) |
| Visor Catastral BGR (SUNARP): solo se enlaza | Planos de las 4 especialidades |
| | Declaración jurada municipal (HR y PU) |
| | Inspección presencial del especialista (S/ 250.00 referencial) |

**Sin scraping ni APIs:** el backend no hace ninguna petición a SUNARP ni a otros portales; la interfaz abre los sitios con
`abrirExterno` (`lib/fuentes.ts`). SUNARP no ofrece una API pública de partidas (D20).

## 9. Datos y privacidad

- **Identificación por código de cuenta:** compradores y propietarios se identifican solo por su código (`comprador-01`,
  `propietario-01`, …). Las cuentas GESTOR y PROPIETARIO no guardan nombre ni colegiatura (`CuentasDemoTest.sinDatosPersonales`).
  El modelo `Usuario` no tiene campos de DNI ni teléfono.
- **El comprador no ve al propietario:** el bloque de publicación llega sin `propietarioCodigo` al comprador
  (`ExpedienteService.publicacion`).
- **Contacto:** motivos de lista cerrada (`INFORMACION_GENERAL`, `CONSULTA_DOCUMENTOS`, `CONSULTA_INSPECCION`), sin texto
  libre; un campo desconocido da 400 (`CarteraTest.motivoCerrado`).
- **Partidas transcritas:** el navegador reemplaza nombres de personas naturales por «Persona natural N» (`lib/disociar.ts`,
  heurística) y el servidor rechaza DNI, estado civil y domicilio (`ProteccionDatos`; `RegistrarPartidaTest.entradasInvalidas`).
- **Historial:** guarda códigos de cuenta, no nombres (V7).
- **Datos del especialista que usa hoy la semilla** (`DemoUsuariosSeeder`). **Los perfiles de especialista son ficticios y no
  firman informes reales:**

| Cuenta | Nombre | Especialidad | Colegiatura | ¿Prefijo `SIM-`? |
|---|---|---|---|---|
| `especialista-01` | Ing. Perfil Ficticio 01 | Ingeniero Civil | CIP N.° SIM-CIP-0001 | Sí |
| `especialista-02` | Arq. Perfil Ficticio 02 | Arquitecto | SIM-CAP-0002 | Sí |

  Los 5 informes de demostración (4 emitidos y 1 en inspección) los firma `especialista-01`. La credencial en pantalla usa
  las iniciales y dice «Perfil ficticio de demostración»; el PDF del informe también lo rotula («Datos del profesional
  ficticios, solo para la demostración», `InformeTecnicoPdf`). La migración V9 actualiza el perfil y los informes firmados
  en bases existentes (`MigracionEspecialistaTest`).

## 10. Modelo de ingresos (HIPÓTESIS NO VALIDADAS)

Ninguna de estas hipótesis se ha validado con una inmobiliaria. No hay cifras de ingresos, clientes ni pilotos.

| Hipótesis | Qué soporte da hoy el sistema |
|---|---|
| **Suscripción de la inmobiliaria** por usar el sistema con su cartera | Ninguno: no hay planes, cobros, facturación ni medición de uso. El sistema es de una sola inmobiliaria |
| **Parte del ingreso de cada inspección** (indicador B, S/ 250.00 referencial) | Registra cada solicitud con la cuenta y la fecha, y el costo referencial viaja en la respuesta. El panel de cartera **cuenta las inspecciones solicitadas o en curso** y cuántas están asignadas o sin asignar. **No** cuenta las emitidas, no suma importes y no hay pago en línea |

**Validación propuesta:** un piloto con 3 a 5 inmobiliarias de Ica para comprobar si la propuesta de valor les sirve y si
pagarían por ella. **No se ha realizado.**

## 11. Arquitectura resumida

- **Backend:** Java 21, Spring Boot 4.0.8, Spring Modulith 2.0.8, Spring Security con JWT (HS256), Flyway, H2 en archivo en
  modo PostgreSQL (`./data/h2/`), PDFBox para los PDF, Swagger en `/swagger-ui.html`.
- **Módulos** (9; `ModularityTests`): `identidad`, `expediente`, `clasificacion`, `inspeccion`, `cartera`, `checklist`,
  `orientacion`, `almacenamiento` y `shared`.
- **Migraciones:** `V1__esquema` a `V11__historial_partida_simulada`. V6 captación y publicación, V7 historial, V8 contacto y
  asignación, V9 perfil ficticio de `especialista-01`, V10 asignación de la inspección en curso de la demostración, V11 origen
  `PARTIDA_SIMULADA` en el historial.
- **Contenido:** casos, reglas y glosario en JSON versionado; versión activa `v0.4` (`app.reglas.version`).
- **Interfaz:** React 19, Vite 8, Tailwind 4, React Router 8 con rutas `#/…`. El servidor de desarrollo reenvía `/api` al
  backend.
- **Ejecución local:** el backend escucha solo en `127.0.0.1:8080` y la interfaz en `localhost:5173`.
- **Docker (agregado el 26 de octubre, `edd0bbc` y `42321d1`):** `docker-compose.yml`, un `Dockerfile` por carpeta y un flujo
  de GitHub Actions que publica las imágenes en GHCR **solo a mano** (`workflow_dispatch`). El frontend se publica en
  `127.0.0.1:8081` y el backend no publica puertos. Que funcione: **No verificado** (no se construyeron ni levantaron las
  imágenes). Ver D3.
- **Dependencias de internet:** la interfaz ya no carga fotografías externas: están en `public/img/` y ninguna muestra a una
  persona identificable. Las ilustraciones de los predios son SVG propios y la credencial del especialista usa iniciales. Los
  enlaces a SUNARP sí necesitan internet.

## 12. Casos de demostración

Estado al cargar una base nueva (`CasosSeeder`, contenido `v0.4`). Color de A y estado de B fijados por
`CasosApiTest.losDiezCasosTienenSuColor`. Todos nacen **publicados y autorizados** (`CaptacionPublicacionTest.demostracionPublicada`).
**Solo la inspección en curso de `SIM-11098467` tiene especialista asignado** (`especialista-01`, V10 en bases existentes); los
informes emitidos los firma `especialista-01`, pero eso no es una asignación.

| Partida | Distrito | Propietario | A | Reglas | B | Publicación | Especialista asignado |
|---|---|---|---|---|---|---|---|
| `SIM-11048217` | Parcona | propietario-01 | Verde | — | Emitido, favorable | Publicado | No (firma `especialista-01`) |
| `SIM-11052690` | La Tinguiña | propietario-02 | Amarillo | RV-02, RV-04 | Emitido, con observaciones | Publicado | No (firma `especialista-01`) |
| `SIM-11061555` | Subtanjalla | propietario-01 | Gris | RP-02, RV-04 | No solicitada | Publicado | No aplica |
| `SIM-11070419` | Los Aquijes | propietario-02 | Gris | RV-04 | No solicitada | Publicado | No aplica |
| `SIM-11075836` | Pueblo Nuevo | propietario-01 | Rojo | RP-01 | No solicitada | Publicado | No aplica |
| `SIM-11081204` | Santiago | propietario-02 | Verde | — | No solicitada | Publicado | No aplica |
| `SIM-11087751` | Salas | propietario-01 | Amarillo | RV-03 | Emitido, con riesgo | Publicado | No (firma `especialista-01`) |
| `SIM-11093320` | San José de los Molinos | propietario-02 | Rojo | RP-03 | Solicitada | Publicado | **No: pendiente de asignación por el gestor** |
| `SIM-11098467` | Pachacútec | propietario-01 | Amarillo | RV-05 | En inspección | Publicado | `especialista-01` |
| `SIM-11104029` | Ica | propietario-02 | Amarillo | RV-03, RV-06 | Emitido, favorable | Publicado | No (firma `especialista-01`) |

Solo Santiago es un lote; las otras nueve son viviendas (D23). Los casos 1 a 4 son los del instrumento del estudio (D22).

## 13. Lo que NO incluye y hoja de ruta

**Fuera de alcance** (decidido; no se piensa hacer en este MVP): integraciones estatales, scraping de portales, OCR,
inteligencia artificial o visión artificial, autenticidad documental, dictámenes jurídicos, pagos en línea, contratos, firmas,
agenda de visitas, tours, reportes descargables y búsquedas avanzadas (sección 1.7 del informe). La verificación jurídica
(ETP-9) queda fuera del sistema.

**Planeado** (hoja de ruta, sin fecha ni código):
- Vigencia automática de la información registral (hoy no existe a propósito: RN-08).
- Comparador de inmuebles.
- Posventa.
- Uso de IA para leer documentos (hoy no hay OCR ni IA).

**Huecos del flujo actual que piden una ruta nueva** (no planeados formalmente): consulta del estado del contacto por el
comprador (D46) y listado de especialistas para la asignación (D45).

## 14. Limitaciones y pendientes reales

- **Revisión especializada** de las reglas `v0.4`, el glosario y la redacción de los casos: pendiente (CP-05b no se da por
  aprobado).
- **Aprobación de D20** (partidas transcritas, desvío de RN-01 y PA2) por el asesor: pendiente.
- **Supuestos D32 a D49** por confirmar con el equipo y el docente.
- **Respaldo y restauración (CP13):** sin ejecutar.
- **Separación de demostración, estudio y operación (CP15) e inspección presencial real (CP16):** pendientes.
- **Docker** no se ha probado: ni las imágenes ni el enlace a `127.0.0.1` se ejecutaron.
- **Instalación en otro equipo (CP-07)**, piloto, reclutamiento, consentimientos y aplicación del estudio: pendientes.
- **Accesibilidad** con teclado y lector de pantalla de los componentes de la v0.7 y del rediseño: No verificado.
- **Tamaño del paquete** del frontend: supera los 500 kB del aviso de Vite.
- **Archivos de datos en el historial:** el commit `567cbfc` agregó `data/h2/trustinmuebles.mv.db` y 10 archivos de `data/uploads/`
  en la raíz. La rama `mejoras-v0.7` dejó de rastrearlos e ignora `data/`, pero **siguen en el historial de Git**. Qué contienen:
  **No verificado**.

## 15. Matriz de trazabilidad

| ID | Componente de código | Prueba | Estado |
|---|---|---|---|
| ACT-01 | `Rol.COMPRADOR`, `ExpedienteService.visible`, `SecurityConfig` | `CaptacionPublicacionTest.visibilidadPorRol`, `CatalogoYServiciosTest.soloElCompradorSolicita` | Implementado |
| ACT-02 | `Rol.REVISOR`, `SecurityConfig`, `ExpedienteService.registrar`/`actualizar` | `CasosApiTest.checklistSoloRevisor`, `RegistrarPartidaTest.permisos` | Implementado |
| ACT-03 | `Rol.GESTOR`, `DemoUsuariosSeeder.FUNCION_GESTOR`, `CarteraService` | `CaptacionPublicacionTest.soloElGestorPublica`, `CarteraTest.permisosPorRol` | Implementado |
| ACT-04 | `Rol.ESPECIALISTA`, `InspeccionService.registrar` | `CarteraTest.soloElAsignadoEmite`, `CatalogoYServiciosTest.otroRolNoEmite` | Implementado |
| ACT-05 | `Rol.PROPIETARIO`, `ExpedienteService.casoDelPropietario` | `CaptacionPublicacionTest.propietarioSoloLectura`, `propietarioVeSoloLoSuyo` | Implementado |
| ACT-06 | Texto fijo en `Expediente.tsx` | — | Fuera del sistema |
| ACT-07 | `lib/fuentes.ts`, `ExpedienteService.FUENTE_CONOCE_AQUI` | — | Fuente externa manual |
| ACT-08 | Ítem HR y PU del checklist | `CatalogoYServiciosTest.itemHrPuEnLosDiezCasos` | Fuente externa manual |
| ETP-1 | `ExpedienteService.registrar`, `OrigenCaptacion`, `RegistrarPartida.tsx` | `CaptacionPublicacionTest.naceEnBorrador`, `propietarioObligatorio`; `RegistrarPartidaTest.prefijoSegunElOrigen` | Implementado |
| ETP-2 | `ExpedienteService.autorizar`/`retirarAutorizacion`, `PanelPublicacion.tsx`, `MisInmuebles.tsx` | `CaptacionPublicacionTest.autorizacionSoloDelPropietario`, `autorizarNoCambiaElColor` | Implementado |
| ETP-3 | `MotorClasificacion`, `ClasificacionService`, `reglas.json` v0.4 | `MotorClasificacionTest`, `MotorPlanosTest`, `CasosApiTest.losDiezCasosTienenSuColor` | Implementado |
| ETP-4 | `ExpedienteService.actualizar`/`asociarDocumentoPlano`, `HistorialEvaluacion` | `HistorialEvaluacionTest.planoFaltanteLlevaAVerde`, `cadaRecalculoAgregaUnaFila` | Implementado |
| ETP-5 | `ExpedienteService.publicar`/`retirarPublicacion`, `PanelPublicacion.tsx` | `CaptacionPublicacionTest.sinAutorizacionNoSePublica`, `soloElGestorPublica` | Implementado |
| ETP-6 | `CarteraService` (contacto), `SolicitudContacto.tsx`, `Cartera.tsx` | `CarteraTest.contactoSoloPublicado`, `motivoCerrado`; Vitest `contacto.test.ts` | Implementado |
| ETP-7 | `InspeccionService`, `PanelEvaluacionTecnica.tsx`, `InformeTecnicoPdf` | `InspeccionTest.flujoCompleto`, `CarteraTest.soloElAsignadoEmite`, `sinAsignacionNadieEmite` | Implementado |
| ETP-8 | `CarteraService.panel`, `Cartera.tsx` | `CarteraTest.panelCoherente`; Vitest `cartera.test.ts` | Implementado |
| ETP-9 | Texto fijo en `Expediente.tsx` | — | Fuera del sistema |
| RN-01 | Prefijo `SIM-`, `CasoLote.sintetico` | `CasosApiTest.contenidoCargado` | Parcial (desvío D20) |
| RN-02 | `MotorClasificacion` (faltantes) | `MotorClasificacionTest.desconocidoNoEsAusencia` | Implementado |
| RN-03 | `MotorClasificacion` (precedencia) | `MotorClasificacionTest.amarilloYRojoPorTipoDeActo` | Implementado |
| RN-04 | `MotorClasificacion` (gris conserva alertas) | `MotorClasificacionTest.grisConservaAlertas` | Implementado |
| RN-05 | `MotorClasificacion.LIMITE` | `MotorClasificacionTest.verde` | Implementado |
| RN-06 | Sin ruta para fijar el color | `CasosApiTest.colorNoSeFijaAMano` | Implementado |
| RN-07 | `SecurityConfig` | `CasosApiTest.checklistSoloRevisor` | Implementado |
| RN-08 | Sin lógica de vencimiento | — | Implementado, sin prueba |
| RN-09 | `EntradaClasificacion` sin datos físicos | — | Implementado, sin prueba |
| RN-10 | `InspeccionService` no escribe en `clasificacion` | `CatalogoYServiciosTest.informeConRiesgoNoCambiaElColor` | Implementado |
| I1 | `EstadoSemaforo.VERDE` | `CatalogoYServiciosTest.verdeSignificaSinAlertas` | Probado |
| I2 | `InspeccionService` | `CatalogoYServiciosTest.informeConRiesgoNoCambiaElColor` | Probado |
| I3 | `ChecklistService` | `CatalogoYServiciosTest.hrPuNoCambiaElColor` | Probado |
| I4 | `SecurityConfig`, `ExpedienteService.exigirRol` | `SeguridadTest` | Probado |
| I5 | Spring Modulith | `ModularityTests` | Probado |
| I6 | `application.properties` (`server.address`), `docker-compose.yml` | `ConfiguracionLocalTest.soloEscuchaEnLocal` | Probado en local; Docker sin ejecutar |
| I7 | `layout/Footer.tsx` (activo), `lib/limitesLegales.ts`, `Login.tsx` | `limitesLegales.test.tsx` | Probado el pie |
| I8 | `ExpedienteService.recalcular` (único punto) | `CaptacionPublicacionTest.publicarRojoNoCambiaElColor` | Probado |
| I9 | `ExpedienteService.origenDeLaEdicion` | `HistorialEvaluacionTest.pdfNoLevantaElEmbargo` | Probado |
| I10 | `ExpedienteService.publicar`, `CarteraService` | `CarteraTest.contactoSobreRojo` | Probado |
| I11 | `Usuario`, `MotivoContacto`, `ExpedienteService.publicacion` | `CuentasDemoTest.sinDatosPersonales`, `CarteraTest.motivoCerrado` | Probado |
| I12 | `HistorialEvaluacion` (`@Immutable`) | `HistorialEvaluacionTest.historialInmutable` | Probado |
| I13 | `ExpedienteService.casoDelPropietario` | `CaptacionPublicacionTest.autorizacionSoloDelPropietario` | Probado |
| I14 | `ExpedienteService.publicar`, restricción V6 | `CaptacionPublicacionTest.sinAutorizacionNoSePublica` | Probado |

## 16. Correspondencia con el informe

Relaciona los identificadores del informe del curso con los de este documento. Las pruebas son automáticas salvo «Paso n», que es un
paso del recorrido de navegador (`docs/pruebas/RESULTADO-recorrido-v07.md`, 15 de 15 correctos el 30 de octubre de 2026).

### 16.1 Requisitos funcionales

| RF | Requisito | ETP | Prueba | Recorrido | Estado |
|---|---|---|---|---|---|
| RF01 | Acceso: autenticar y autorizar cinco roles en el servidor | Transversal | `SeguridadTest`, `CuentasDemoTest`, `CarteraTest.permisosPorRol` | Pasos 2, 3, 4 y 11 | Implementado |
| RF02 | Captación: crear expediente en borrador vinculado al propietario por código | ETP-1 | `CaptacionPublicacionTest.naceEnBorrador`, `propietarioObligatorio`; `RegistrarPartidaTest.prefijoSegunElOrigen` | Paso 1 | Implementado |
| RF03 | Autorización: otorgar o retirar autorización solo sobre casos propios | ETP-2 | `CaptacionPublicacionTest.autorizacionSoloDelPropietario`, `autorizarNoCambiaElColor` | Pasos 5 y 14 | Implementado |
| RF04 | Expediente: mantener partida transcrita, planos y checklist | ETP-1, ETP-4 | `CasosApiTest.guardarPersiste`, `checklistSoloRevisor`; `PlanosApiTest` | Paso 7 | Implementado |
| RF05 | Indicador A: calcular color, motivos y faltantes por reglas | ETP-3 | `MotorClasificacionTest`, `MotorPlanosTest`, `CasosApiTest.losDiezCasosTienenSuColor` | Pasos 1, 6 y 7 | Implementado. Reglas pendientes de revisión especializada |
| RF06 | Historial: registrar recálculos de A por adición | ETP-3, ETP-4 | `HistorialEvaluacionTest.cadaRecalculoAgregaUnaFila`, `historialInmutable` | Pasos 6 y 7 | Implementado |
| RF07 | Publicación: el gestor publica o retira y el comprador ve publicados | ETP-5 | `CaptacionPublicacionTest.soloElGestorPublica`, `sinAutorizacionNoSePublica`, `visibilidadPorRol` | Pasos 2, 4, 8 y 14 | Implementado |
| RF08 | Consulta: expediente, glosario, documentos y filtros simples | ETP-6 | `CatalogoYServiciosTest.filtrosCombinados`, `CasosApiTest.glosario`; `CopiaLiteralPdfTest`; Vitest `catalogo.test.ts` | Paso 9 | Implementado |
| RF09 | Contacto: el comprador solicita con motivo cerrado; el gestor atiende | ETP-6 | `CarteraTest.contactoSobreRojo`, `motivoCerrado`, `contactoSoloPublicado` | Pasos 9 y 10 | Implementado |
| RF10 | Inspección B: solicitar, asignar y registrar informe de seis pasos | ETP-7 | `InspeccionTest.flujoCompleto`, `CarteraTest.soloElAsignadoEmite`, `sinAsignacionNadieEmite` | Pasos 9 a 12 | Implementado |
| RF11 | Propietario: consultar casos propios sin editar | ETP-2 | `CaptacionPublicacionTest.propietarioVeSoloLoSuyo`, `propietarioSoloLectura` | Pasos 3 y 5 | Implementado |
| RF12 | Cartera: el gestor consulta estados, contactos e inspecciones | ETP-8 | `CarteraTest.panelCoherente`; Vitest `cartera.test.ts` | Paso 13 | Implementado |

### 16.2 Reglas de negocio

| Informe | Identificador aquí | Prueba | Estado |
|---|---|---|---|
| RN01 | I1 | `CatalogoYServiciosTest.verdeSignificaSinAlertas` | Probado |
| RN02 | I8 | `CaptacionPublicacionTest.publicarRojoNoCambiaElColor`, `autorizarNoCambiaElColor` | Probado |
| RN03 | I2 + I3 | `CatalogoYServiciosTest.informeConRiesgoNoCambiaElColor`, `hrPuNoCambiaElColor` | Probado |
| RN04 | I9 | `HistorialEvaluacionTest.pdfNoLevantaElEmbargo` | Probado |
| RN05 | I10 + I14 | `CaptacionPublicacionTest.publicarRojoNoCambiaElColor`, `sinAutorizacionNoSePublica` | Probado |
| RN06 | I13 | `CaptacionPublicacionTest.autorizacionSoloDelPropietario` | Probado |
| RN07 | I12 | `HistorialEvaluacionTest.historialInmutable` | Probado |
| RN08 | RN-08 | Sin prueba automática | Implementado, sin prueba |
| RN09 | M8 | `CatalogoYServiciosTest.identidadDelEspecialistaBloqueada` | Probado |
| RN10 | RN-10 | `CatalogoYServiciosTest.informeConRiesgoNoCambiaElColor`, `InspeccionTest.flujoCompleto` | Probado |
| RN11 | RN-04 | `MotorClasificacionTest.grisConservaAlertas` | Probado |
| RN12 | Fuera de alcance | — | Fuera de alcance |

### 16.3 Casos de uso de negocio

| Informe | Etapas | Prueba de punta a punta | Recorrido | Estado |
|---|---|---|---|---|
| CUN01 | ETP-1, ETP-2, ETP-4 | `CicloCarteraTest.cicloCompleto` | Pasos 1, 5 y 7 | Implementado |
| CUN02 | ETP-3, ETP-5, ETP-6 | `CicloCarteraTest.cicloCompleto` | Pasos 6, 8 y 9 | Implementado |
| CUN03 | ETP-6 | `CicloCarteraTest.cicloCompleto`, `CarteraTest.contactoSobreRojo` | Pasos 9 y 10 | Implementado |
| CUN04 | ETP-7 | `CicloCarteraTest.cicloCompleto`, `InspeccionTest.flujoCompleto` | Pasos 10 a 12 | Implementado |
| CUN05 | ETP-8 | `CicloCarteraTest.cicloCompleto`, `CarteraTest.panelCoherente` | Paso 13 | Implementado |

### 16.4 Casos de prueba

**Nota sobre la numeración:** los CP-01 a CP-07 de `docs/pruebas/registro.md` y `docs/trazabilidad.md` son de una etapa anterior y **no
coinciden** con los CP01 a CP07 del informe: por ejemplo, allí CP-04 es orientación y CP-07 es la instalación en otro equipo. Esta tabla usa
la numeración del informe. CP-05b (reglas con tabla especializada) sigue sin aprobarse, y CP-07 del repositorio equivale en parte a CP13.

| Informe | Caso | Prueba | Recorrido | Estado |
|---|---|---|---|---|
| CP01 | Permisos por cinco roles | `SeguridadTest`, `CarteraTest.permisosPorRol` | Pasos 2, 3, 4 y 11 | Aprobado |
| CP02 | Crear expediente y vincular propietario; borrador no visible al comprador | `CaptacionPublicacionTest.naceEnBorrador`, `propietarioObligatorio`, `visibilidadPorRol` | Pasos 1 y 2 | Aprobado |
| CP03 | Autorizar o retirar, y acceso a caso ajeno | `CaptacionPublicacionTest.autorizacionSoloDelPropietario`, `propietarioVeSoloLoSuyo` | Pasos 3, 5 y 14 | Aprobado |
| CP04 | Editar partida, planos y HR/PU; el checklist no cambia A | `CasosApiTest.guardarPersiste`, `PlanosApiTest`, `CatalogoYServiciosTest.hrPuNoCambiaElColor` | Paso 7 (planos) | Aprobado |
| CP05 | Recalcular A: motivos y faltantes, sin color manual | `CasosApiTest.cancelarLaHipotecaRecalcula`, `colorNoSeFijaAMano`; `MotorClasificacionTest` | Paso 7 | Aprobado. Reglas pendientes de revisión especializada |
| CP06 | Historial: entrada nueva y anterior conservada | `HistorialEvaluacionTest.cadaRecalculoAgregaUnaFila`, `historialInmutable` | Pasos 6 y 7 | Aprobado |
| CP07 | Publicar sin autorización y con distintos colores | `CaptacionPublicacionTest.sinAutorizacionNoSePublica`, `publicarRojoNoCambiaElColor` | Pasos 4 y 8 | Aprobado |
| CP08 | Consulta de casos y glosario por el comprador | `CasosApiTest.glosario`, `CatalogoYServiciosTest.filtrosCombinados` | Paso 9 | Aprobado |
| CP09 | Solicitar contacto y atender | `CarteraTest.contactoSobreRojo`, `motivoCerrado` | Pasos 9 y 10 | Aprobado |
| CP10 | Asignar B, emitir y comparar A | `CarteraTest.soloElAsignadoEmite`, `sinAsignacionNadieEmite`; `CatalogoYServiciosTest.informeConRiesgoNoCambiaElColor` | Pasos 10 a 12 | Aprobado |
| CP11 | El propietario consulta e intenta editar | `CaptacionPublicacionTest.propietarioSoloLectura` | Paso 5 (consulta). El intento de editar se probó solo en el backend | Aprobado |
| CP12 | Panel de cartera | `CarteraTest.panelCoherente`; Vitest `cartera.test.ts` | Paso 13 | Aprobado |
| CP13 | Versiones, arranque, respaldo y restauración, y localhost | `ConfiguracionLocalTest.soloEscuchaEnLocal`; versiones en `docs/PARA-INFORME.md` | Arranque local correcto | **Parcial:** respaldo y restauración sin ejecutar, y sin prueba en otro equipo |
| CP14 | NF02: 20 mediciones, 19 de 20 en 2 s o menos | `scripts/medir-nf02.mjs` | Tras el paso 15 | Aprobado: 20 de 20, máximo 54,3 ms, solo la API |
| CP15 | Separación de demostración, estudio y operación | Sin prueba | — | **Pendiente:** los materiales del estudio están fuera del repositorio, pero no se comprobó la separación |
| CP16 | Inspección presencial real | Fuera del software | — | **Pendiente:** no se ha realizado |
| CP17 | Textos, motivos, faltantes y distinción A/B | Vitest `limitesLegales.test.tsx`; `CatalogoYServiciosTest.verdeSignificaSinAlertas` | Pasos 6, 12 y 15 | Aprobado técnicamente. Contenido pendiente de revisión especializada |
