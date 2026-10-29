# Modelo de negocio implementado — Trustinmuebles v0.7.0

Este documento describe lo que el **código y las pruebas** hacen hoy. Cuando la documentación anterior dice otra cosa, manda
el código, y la diferencia se anota. Lo que no se pudo comprobar dice **No verificado**.

## 0. Ficha

| Campo | Valor |
|---|---|
| Versión | Backend `0.7.0` (`trustinmuebles-backend/pom.xml`). La interfaz sigue en `0.6.0` en `trustinmuebles/package.json` (no se cambió) |
| Fecha de esta revisión | 28 de octubre de 2026, sobre `main` en `42321d1` |
| Pruebas del backend | `./mvnw test` (se definió un `APP_SEED_PASSWORD` de prueba, aunque las pruebas usan su propia contraseña de `application-test.properties`): **140 ejecutadas, 140 aprobadas**, 0 fallos, 0 errores, 0 omitidas; `BUILD SUCCESS` (9 min 44 s) |
| Pruebas del frontend | `npx pnpm@9 test`: **9 archivos, 60 pruebas, 60 aprobadas** |
| Compilación del frontend | `npx pnpm@9 build`: correcta (`tsc --noEmit` y `vite build`). Aviso de tamaño: el JS principal pesa 579,55 kB |
| Alcance | MVP académico con **datos simulados**, para **una sola inmobiliaria de Ica** |
| Verificación en navegador | **No verificado** para ninguna vista de la v0.7 ni para el rediseño del 26 de octubre (`567cbfc`) |

Las pruebas del backend son de integración (MockMvc con H2 en memoria) y unitarias; las del frontend son de funciones puras
(Vitest) y **no prueban cómo se dibujan las pantallas**.

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

## 3. Actores

**Sobre el personal:** que revisor, gestor y especialistas sean personal **de la inmobiliaria** (no de una empresa aparte)
lo dice la documentación (LEEME, D21) y es coherente con el código: no existe ninguna entidad «empresa» ni «proveedor», el
servicio de inspección dice «Coordinado con la inmobiliaria» (`InspeccionService.CONDICIONES`) y la credencial vacía dice «la
inmobiliaria coordina la visita» (`PanelEvaluacionTecnica.tsx`). El código no puede probar el vínculo laboral: es una
**afirmación de modelo**, no un dato del sistema.

| ID | Actor | Rol en el sistema | Responsabilidades | Qué NO puede hacer | Evidencia |
|---|---|---|---|---|---|
| ACT-01 | Comprador | `COMPRADOR` (`comprador-01`) | Consultar el catálogo de casos **publicados** y su detalle; solicitar contacto; solicitar la inspección técnica (único rol que puede) | Ver borradores o retirados (404); ver el historial (403); ver el código del propietario; editar nada | `ExpedienteService.visible`, `SecurityConfig`; `CaptacionPublicacionTest.visibilidadPorRol`, `CatalogoYServiciosTest.soloElCompradorSolicita`, `HistorialEvaluacionTest.accesoAlHistorial` |
| ACT-02 | Revisor | `REVISOR` (`revisor-01`) | Registrar la captación (partida transcrita con el código del propietario); editar partida, planos y checklist; subir PDF; eliminar partidas transcritas | Autorizar por el propietario; publicar; emitir el informe técnico; solicitar inspección | `SecurityConfig` (PUT/POST/PATCH/DELETE `/casos/**`); `CaptacionPublicacionTest.autorizacionSoloDelPropietario`, `soloElGestorPublica`, `CasosApiTest.checklistSoloRevisor` |
| ACT-03 | Gestor (asesor comercial) | `GESTOR` (`gestor-01`, función «Asesor comercial») — el asesor comercial **es** este rol | Publicar y retirar casos; atender contactos; asignar o reasignar el especialista; ver el panel de cartera | Editar la partida o el checklist; autorizar; emitir el informe | `DemoUsuariosSeeder.FUNCION_GESTOR`, `SecurityConfig`; `CaptacionPublicacionTest.soloElGestorPublica`, `CarteraTest.permisosPorRol` |
| ACT-04 | Especialista | `ESPECIALISTA` (`especialista-01`, `especialista-02`) | Registrar el avance y emitir el informe técnico (indicador B), firmado con los datos de su cuenta | Emitir si la inspección está asignada a otro (403); editar la partida; cambiar el color de A | `InspeccionService.registrar`; `CarteraTest.soloElAsignadoEmite`, `sinAsignacionCualquieraEmite`, `CatalogoYServiciosTest.identidadDelEspecialistaBloqueada` |
| ACT-05 | Propietario | `PROPIETARIO` (`propietario-01`, `propietario-02`) | Ver solo sus casos (también en borrador) y su historial; otorgar o retirar su autorización | Editar, subir documentos, publicar; ver casos ajenos (404); autorizar casos ajenos (403) | `ExpedienteService.casoDelPropietario`; `CaptacionPublicacionTest.propietarioSoloLectura`, `propietarioVeSoloLoSuyo`, `autorizacionSoloDelPropietario` |
| ACT-06 | Abogado o notario | Externo | Verificación jurídica antes de comprar (etapa 9) | No tiene cuenta ni función en el sistema | Texto fijo en `Expediente.tsx` (D48). Sin prueba automática |
| ACT-07 | SUNARP (Conoce Aquí, Visor BGR) | Externo, fuente consultada **a mano** | El revisor consulta Conoce Aquí y pega el texto; el comprador o el revisor abren el Visor BGR | El sistema no consulta ni lee SUNARP: solo abre enlaces | `lib/fuentes.ts`, D20. Sin conexión en el backend |
| ACT-08 | Municipalidad | Externo, fuente consultada **a mano** | Emite la declaración jurada (HR y PU) que aporta el propietario; el revisor marca el ítem del checklist | El sistema no consulta a la Municipalidad | Ítem «Declaración Jurada Municipal (HR y PU)»; `CatalogoYServiciosTest.itemHrPuEnLosDiezCasos` |

## 4. Flujo de vida del inmueble

Ninguna pantalla de este flujo se ha recorrido en un navegador: la columna «Pantalla» viene de leer el código (**No
verificado** en pantalla).

| ID | Etapa | Quién | Qué ocurre | Pantalla / ruta del frontend | Endpoint | Prueba | Estado |
|---|---|---|---|---|---|---|---|
| ETP-1 | Captación | Propietario (fuera) y revisor | El propietario **inicia el proceso fuera del sistema**: entrega sus documentos a la inmobiliaria. El revisor registra el caso con el código de cuenta del propietario; nace en `BORRADOR` y sin autorización. **El indicador A se calcula en ese mismo momento** (origen `PARTIDA_TRANSCRITA`). El único formulario de captación es el de **partida transcrita**: el número va sin `SIM-`, la fuente queda como «Conoce Aquí – SUNARP» y no hay campo de precio. Los 10 casos de demostración no pasan por aquí: los carga `CasosSeeder` ya publicados | Menú «Registrar partida» → `#/casos/nueva` (`RegistrarPartida.tsx`) | `POST /api/v1/casos` | `CaptacionPublicacionTest.naceEnBorrador`, `propietarioObligatorio`; `RegistrarPartidaTest.revisorRegistra` | Parcial |
| ETP-2 | Autorización | Propietario | El propietario entra con su cuenta y confirma su autorización. **El indicador A ya está calculado antes de autorizar** (desde ETP-1) y el propietario lo ve; autorizar **no** recalcula ni cambia el color. La autorización solo habilita la publicación. Retirarla de un caso publicado lo deja `RETIRADO`. Autorizar dos veces conserva la primera fecha | Panel «Publicación y autorización» (`PanelPublicacion.tsx`), botones «Autorizar evaluación» y «Retirar autorización», en `#/mis-inmuebles` y en la columna lateral del detalle `#/casos/{código}` | `PUT` y `DELETE /api/v1/casos/{código}/autorizacion` | `CaptacionPublicacionTest.autorizacionSoloDelPropietario`, `autorizarNoCambiaElColor`; `CicloCarteraTest.cicloCompleto` | Implementado |
| ETP-3 | Pre-evaluación documental (indicador A) | Motor de reglas (automático) | Calcula verde, amarillo, rojo o gris con las reglas `v0.4` sobre el rubro D, los datos mínimos y los planos. Recalcula al registrar, al editar, al subir el PDF del caso o de un plano, y al arrancar si falta o cambió la versión. Cada recálculo agrega una fila al historial | Semáforo del detalle `#/casos/{código}` y de las tarjetas de `#/casos` | Sin endpoint propio: lo disparan `POST /casos`, `PUT /casos/{c}/expediente`, `POST /casos/{c}/documento`, `POST /casos/{c}/planos/{e}/documento` | `MotorClasificacionTest` (10), `MotorPlanosTest` (7), `CasosApiTest.losDiezCasosTienenSuColor`, `colorNoSeFijaAMano` | Implementado |
| ETP-4 | Subsanación | Revisor | Incorpora asientos, planos o el PDF que faltaban; el motor recalcula y el historial lo registra con su origen | Detalle: botón «Editar partida» (`EditorExpediente.tsx`) y subida de PDF en el panel de planos (`PanelPlanos.tsx`); historial en `HistorialEvaluaciones.tsx` | `PUT /casos/{c}/expediente`, `POST /casos/{c}/planos/{e}/documento`, `POST /casos/{c}/documento`, `GET /casos/{c}/historial` | `HistorialEvaluacionTest.planoFaltanteLlevaAVerde`, `cadaRecalculoAgregaUnaFila`, `pdfNoLevantaElEmbargo` | Implementado |
| ETP-5 | Publicación | Gestor | Publica solo con autorización vigente (422 sin ella; 409 si ya está publicado); puede volver a publicar un caso retirado si sigue autorizado. No mira el color de A | Botones «Publicar» y «Retirar» en el panel «Publicación y autorización» del **detalle** del caso, no en la lista de `#/cartera` (la propia pantalla lo indica) | `POST` y `DELETE /api/v1/casos/{código}/publicacion` | `CaptacionPublicacionTest.soloElGestorPublica`, `sinAutorizacionNoSePublica`, `publicarRojoNoCambiaElColor`; `MigracionV6Test.conservaLosDiezCasos` | Implementado |
| ETP-6 | Consulta y contacto | Comprador y gestor | El comprador ve el catálogo de publicados y pide contacto con un motivo de lista cerrada (sin texto libre; una pendiente por caso). El gestor la marca atendida. El comprador **no** puede consultar después si fue atendida (D46) | Comprador: `#/casos` (menú «Expedientes») y botón «Solicitar contacto» en el detalle (`SolicitudContacto.tsx`). Gestor: bandeja de `#/cartera`, botón «Marcar atendida» | `GET /casos`, `GET /casos/{c}`, `POST /casos/{c}/contactos`, `GET /contactos?estado=`, `PUT /contactos/{id}/atencion` | `CarteraTest.contactoSoloPublicado`, `motivoCerrado`, `contactoSobreRojo`; `CaptacionPublicacionTest.visibilidadPorRol`; Vitest `contacto.test.ts` | Implementado |
| ETP-7 | Evaluación técnica presencial (indicador B) | Comprador, gestor y especialista | El comprador la solicita (costo referencial S/ 250.00, sin pago en línea); el gestor asigna un especialista (lista fija `especialista-01` y `especialista-02`, D45); el especialista registra el avance y emite el informe, firmado con su cuenta. No cambia A | Panel de evaluación técnica del detalle (`PanelEvaluacionTecnica.tsx`): «Solicitar inspección técnica» (comprador), «Asignar especialista» / «Reasignar» (gestor), formulario del informe (especialista), «Ver informe técnico (PDF)» | `POST /casos/{c}/inspeccion/solicitud`, `PUT /casos/{c}/inspeccion/asignacion`, `PUT /casos/{c}/inspeccion`, `GET /casos/{c}/inspeccion/documento` | `InspeccionTest.flujoCompleto`, `CatalogoYServiciosTest.soloElCompradorSolicita`, `informeConRiesgoNoCambiaElColor`, `CarteraTest.soloElAsignadoEmite`, `asignacionInvalida` | Implementado |
| ETP-8 | Seguimiento de la cartera | Gestor | Totales por color de A y por publicación, casos con faltantes, inspecciones solicitadas o en curso con su asignación, contactos pendientes y lista filtrable. Solo lectura | Menú «Cartera» → `#/cartera` (`Cartera.tsx`) | `GET /cartera/panel`, `GET /casos`, `GET /contactos?estado=PENDIENTE` | `CarteraTest.panelCoherente`; Vitest `cartera.test.ts` | Implementado |
| ETP-9 | Verificación jurídica | Comprador con abogado o notario | Fuera del sistema. El detalle muestra a todos «Siguiente paso: verificación jurídica con abogado o notario, fuera del sistema» | Texto fijo en la columna lateral del detalle | — | Sin prueba | Fuera del sistema |

**Por qué ETP-1 es parcial:** el registro funciona y está probado, pero solo como partida transcrita (rotulada como fuente
SUNARP, sin precio). No hay forma de captar desde la interfaz un inmueble con partida simulada ni de registrar la entrega de
documentos del propietario.

## 5. Servicios

| | Indicador A — pre-evaluación documental | Indicador B — evaluación técnica presencial |
|---|---|---|
| Quién lo activa | Nadie lo pide: el motor lo calcula para todo caso al registrarlo o cambiar sus datos | Solo el comprador, a pedido, una vez por caso (409 a la segunda) |
| Costo | Incluido. El código no tiene precio para A | S/ 250.00 referencial (`app.inspeccion.costo-referencial`, valor por defecto en `InspeccionService`). Sin pasarela de pago ni agenda |
| Resultado | Color con motivos, alertas, faltantes, versión de reglas y el texto de límite | Estado (no solicitada, solicitada, en inspección, emitido) y, si se emite, conclusión favorable, con observaciones o con riesgo; informe en PDF |
| Reglas | Tabla `v0.4` en `contenido/v0.4/reglas.json`, rotulada «borrador del equipo, pendiente de revisión especializada» | Solo el especialista emite; con asignación, solo el asignado; firma desde la cuenta (M8); fecha de inspección no futura |
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
| RN-01 | Solo casos sintéticos | Parcial: las 10 partidas ficticias cumplen; las partidas transcritas (D20) son un desvío **pendiente de aprobación del asesor** | Prefijo `SIM-` y `sintetico = true`; `CasosApiTest.contenidoCargado`, `sinRastrosDelEstudio` |
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
| I6 | El backend escucha solo en `127.0.0.1` | `ConfiguracionLocalTest.soloEscuchaEnLocal` (lee `application.properties`) | Probado para la ejecución local. **La imagen Docker lo anula** (`SERVER_ADDRESS=0.0.0.0` en `trustinmuebles-backend/Dockerfile`); la prueba no lo detecta |
| I7 | Los límites legales y el aviso de datos simulados se muestran en el pie; el login comunica el entorno demostrativo | **Sin prueba automática** | **No se cumple en el pie actual:** `AppShell.tsx` usa `components/layout/Footer.tsx`, que no tiene esos textos; están en `components/base/Footer.tsx`, que ninguna pantalla usa desde `567cbfc`. El login sí dice «Entorno académico demostrativo · Datos sintéticos» |
| I8 | El color de A solo cambia cuando el motor recalcula | `CaptacionPublicacionTest.publicarRojoNoCambiaElColor`, `autorizarNoCambiaElColor`; `HistorialEvaluacionTest.operacionesSinRecalculo`; `CarteraTest.contactoSobreRojo`, `soloElAsignadoEmite` | Probado |
| I9 | Un plano o un PDF no levanta un rojo por embargo, bloqueo o demanda | `HistorialEvaluacionTest.pdfNoLevantaElEmbargo`; `MotorPlanosTest.losPlanosNoCambianElRojo` | Probado |
| I10 | Publicar y pedir contacto no dependen del color de A | `CaptacionPublicacionTest.publicarRojoNoCambiaElColor`, `CarteraTest.contactoSobreRojo` | Probado |
| I11 | Sin nombres, DNI ni teléfonos de propietarios o compradores; contacto con motivos cerrados | `CuentasDemoTest.sinDatosPersonales`, `CarteraTest.motivoCerrado`, `CaptacionPublicacionTest.demostracionPublicada`; Vitest `contacto.test.ts` | Probado (`sinDatosPersonales` solo revisa las cuentas GESTOR y PROPIETARIO) |
| I12 | Historial de evaluaciones de solo adición | `HistorialEvaluacionTest.historialInmutable` | Probado |
| I13 | El propietario solo autoriza sus propios casos | `CaptacionPublicacionTest.autorizacionSoloDelPropietario`, `propietarioSoloLectura`; Vitest `permisos.test.ts` | Probado |
| I14 | Nada se publica sin autorización vigente | `CaptacionPublicacionTest.sinAutorizacionNoSePublica`, `MigracionV6Test.conservaLosDiezCasos`, `CicloCarteraTest.cicloCompleto`; restricción `ck_caso_publicado_autorizado` (V6) | Probado |

**Sin prueba automática:** I7 (y hoy incumplida en el pie). I6 está probada solo como propiedad de configuración, no sobre
el despliegue con Docker.

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
- **Datos del especialista que usa hoy la semilla** (`DemoUsuariosSeeder`):

| Cuenta | Nombre | Especialidad | Colegiatura | ¿Prefijo `SIM-`? |
|---|---|---|---|---|
| `especialista-01` | Ing. Carlos Alberto Mendoza Quispe | Ingeniero Civil | CIP N.° 248910 | **No** |
| `especialista-02` | Arq. Perfil Ficticio 02 | Arquitecto | SIM-CAP-0002 | Sí |

  Los 5 informes de demostración (4 emitidos y 1 en inspección) los firma `especialista-01`. **En pantalla, la credencial
  del especialista no los rotula como ficticios** (el rótulo se quitó en D47) y muestra una **fotografía de stock de
  Unsplash** de una persona real como avatar. Solo el PDF del informe lo dice («Datos del profesional ficticios, solo para la
  demostración», `InformeTecnicoPdf`). Que «CIP N.° 248910» no pertenezca a un ingeniero real: **No verificado**.

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
- **Migraciones:** `V1__esquema` a `V8__contacto_y_asignacion`. V6 captación y publicación, V7 historial, V8 contacto y
  asignación.
- **Contenido:** casos, reglas y glosario en JSON versionado; versión activa `v0.4` (`app.reglas.version`).
- **Interfaz:** React 19, Vite 8, Tailwind 4, React Router 8 con rutas `#/…`. El servidor de desarrollo reenvía `/api` al
  backend.
- **Ejecución local:** el backend escucha solo en `127.0.0.1:8080` y la interfaz en `localhost:5173`.
- **Docker (agregado el 26 de octubre, `edd0bbc` y `42321d1`):** `docker-compose.yml`, un `Dockerfile` por carpeta y un flujo
  de GitHub Actions que publica las imágenes en GHCR en cada push a `main`. En el contenedor el backend escucha en `0.0.0.0` y
  el frontend se publica en el puerto `8081`. Contradice D3 («se retiró Docker») y D9/I6 (solo uso local). Que funcione:
  **No verificado** (no se construyeron ni levantaron las imágenes).
- **Dependencias de internet:** siguen. La interfaz carga fotografías de Unsplash en la landing, el login, el catálogo
  (`Casos.tsx`), la cartera, el registro de partida y la credencial del especialista. Las ilustraciones de los predios son
  SVG propios. Si no hay internet, esas imágenes no cargan (el avatar del especialista cae a sus iniciales); el resto: **No
  verificado**.

## 12. Casos de demostración

Estado al cargar una base nueva (`CasosSeeder`, contenido `v0.4`). Color de A y estado de B fijados por
`CasosApiTest.losDiezCasosTienenSuColor`. Todos nacen **publicados y autorizados** (`CaptacionPublicacionTest.demostracionPublicada`).
**Ninguna inspección tiene especialista asignado:** la carga no fija `especialista_asignado_codigo`; los informes los firma
`especialista-01`, pero eso no es una asignación.

| Partida | Distrito | Propietario | A | Reglas | B | Publicación | Especialista asignado |
|---|---|---|---|---|---|---|---|
| `SIM-11048217` | Parcona | propietario-01 | Verde | — | Emitido, favorable | Publicado | No (firma `especialista-01`) |
| `SIM-11052690` | La Tinguiña | propietario-02 | Amarillo | RV-02, RV-04 | Emitido, con observaciones | Publicado | No (firma `especialista-01`) |
| `SIM-11061555` | Subtanjalla | propietario-01 | Gris | RP-02, RV-04 | No solicitada | Publicado | No aplica |
| `SIM-11070419` | Los Aquijes | propietario-02 | Gris | RV-04 | No solicitada | Publicado | No aplica |
| `SIM-11075836` | Pueblo Nuevo | propietario-01 | Rojo | RP-01 | No solicitada | Publicado | No aplica |
| `SIM-11081204` | Santiago | propietario-02 | Verde | — | No solicitada | Publicado | No aplica |
| `SIM-11087751` | Salas | propietario-01 | Amarillo | RV-03 | Emitido, con riesgo | Publicado | No (firma `especialista-01`) |
| `SIM-11093320` | San José de los Molinos | propietario-02 | Rojo | RP-03 | Solicitada | Publicado | **No: pendiente de asignar** |
| `SIM-11098467` | Pachacútec | propietario-01 | Amarillo | RV-05 | En inspección | Publicado | **No** (avance cargado por `especialista-01`) |
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
comprador (D46), listado de especialistas para la asignación (D45) y precio en la captación (no hay campo).

## 14. Limitaciones y pendientes reales

- **Revisión especializada** de las reglas `v0.4`, el glosario y la redacción de los casos: pendiente (CP-05b no se da por
  aprobado).
- **Aprobación de D20** (partidas transcritas, desvío de RN-01 y PA2) por el asesor: pendiente.
- **Supuestos D32 a D49** por confirmar con el equipo y el docente.
- **Recorrido de navegador de la v0.7:** no existe; `docs/pruebas/recorrido-v06.mjs` está obsoleto. Ninguna vista de la v0.7
  ni el rediseño `567cbfc` se ha comprobado en un navegador.
- **I7 incumplida en el pie** desde el rediseño `567cbfc` (ver sección 7).
- **Credencial del especialista** sin rótulo de ficticio y con foto de una persona real (ver sección 9); CIP sin `SIM-`.
- **Docker** contradice el uso solo local (I6, D9) y D3; no se ha probado.
- **Instalación en otro equipo (CP-07)**, piloto, reclutamiento, consentimientos y aplicación del estudio: pendientes.
- **Accesibilidad** con teclado y lector de pantalla de los componentes de la v0.7 y del rediseño: No verificado.
- **Tamaño del paquete** del frontend: 579,55 kB (aviso de Vite).
- **Archivos de datos versionados:** el commit `567cbfc` agregó al repositorio `data/h2/trustinmuebles.mv.db` y 10 archivos de
  `data/uploads/` en la raíz. Qué contienen: **No verificado**.

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
| ETP-1 | `ExpedienteService.registrar`, `RegistrarPartida.tsx` | `CaptacionPublicacionTest.naceEnBorrador`, `propietarioObligatorio` | Parcial |
| ETP-2 | `ExpedienteService.autorizar`/`retirarAutorizacion`, `PanelPublicacion.tsx`, `MisInmuebles.tsx` | `CaptacionPublicacionTest.autorizacionSoloDelPropietario`, `autorizarNoCambiaElColor` | Implementado |
| ETP-3 | `MotorClasificacion`, `ClasificacionService`, `reglas.json` v0.4 | `MotorClasificacionTest`, `MotorPlanosTest`, `CasosApiTest.losDiezCasosTienenSuColor` | Implementado |
| ETP-4 | `ExpedienteService.actualizar`/`asociarDocumentoPlano`, `HistorialEvaluacion` | `HistorialEvaluacionTest.planoFaltanteLlevaAVerde`, `cadaRecalculoAgregaUnaFila` | Implementado |
| ETP-5 | `ExpedienteService.publicar`/`retirarPublicacion`, `PanelPublicacion.tsx` | `CaptacionPublicacionTest.sinAutorizacionNoSePublica`, `soloElGestorPublica` | Implementado |
| ETP-6 | `CarteraService` (contacto), `SolicitudContacto.tsx`, `Cartera.tsx` | `CarteraTest.contactoSoloPublicado`, `motivoCerrado`; Vitest `contacto.test.ts` | Implementado |
| ETP-7 | `InspeccionService`, `PanelEvaluacionTecnica.tsx`, `InformeTecnicoPdf` | `InspeccionTest.flujoCompleto`, `CarteraTest.soloElAsignadoEmite` | Implementado |
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
| I6 | `application.properties` (`server.address`) | `ConfiguracionLocalTest.soloEscuchaEnLocal` | Probado en local; anulado en Docker |
| I7 | `layout/Footer.tsx` (activo), `Login.tsx` | — | **No se cumple en el pie** |
| I8 | `ExpedienteService.recalcular` (único punto) | `CaptacionPublicacionTest.publicarRojoNoCambiaElColor` | Probado |
| I9 | `ExpedienteService.origenDeLaEdicion` | `HistorialEvaluacionTest.pdfNoLevantaElEmbargo` | Probado |
| I10 | `ExpedienteService.publicar`, `CarteraService` | `CarteraTest.contactoSobreRojo` | Probado |
| I11 | `Usuario`, `MotivoContacto`, `ExpedienteService.publicacion` | `CuentasDemoTest.sinDatosPersonales`, `CarteraTest.motivoCerrado` | Probado |
| I12 | `HistorialEvaluacion` (`@Immutable`) | `HistorialEvaluacionTest.historialInmutable` | Probado |
| I13 | `ExpedienteService.casoDelPropietario` | `CaptacionPublicacionTest.autorizacionSoloDelPropietario` | Probado |
| I14 | `ExpedienteService.publicar`, restricción V6 | `CaptacionPublicacionTest.sinAutorizacionNoSePublica` | Probado |
