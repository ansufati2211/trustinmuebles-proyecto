# Trazabilidad de requisitos

Estados usados: **propuesto** (solo escrito en el informe), **implementado** (existe en el código), **probado** (hay una
prueba que pasó, con su evidencia). Una prueba técnica no demuestra mejora de comprensión: OE1 a OE3 se evalúan solo con
el instrumento del estudio.

Evidencias en `docs/pruebas/evidencias/`. Detalle por caso en [pruebas/registro.md](pruebas/registro.md).

## Requisitos funcionales

| Requisito | Módulo del backend | Interfaz | Pruebas | Estado |
|---|---|---|---|---|
| REQ-F01 Acceso y roles | `identidad` (`SecurityConfig`) | `Login`, `RequireAuth` | CP-01: `SeguridadTest` (8 pruebas) | Probado |
| REQ-F02 Listado de casos | `expediente` | `Casos` | CP-02: `cadaCodigoDevuelveSusDatos` | Probado |
| REQ-F03 Expediente | `expediente`, `almacenamiento` | `Expediente`, `EditorExpediente` | CP-03: `guardarPersiste`, `entradaInvalidaNoGuarda`, `versionVieja`, `NormalizadorAsientosTest`; documento: `CopiaLiteralPdfTest`, `documentoDelCaso`, `documentoDelExtractoParcial`, `documentoGeneradoSeRegenera`, `subirDocumento` | Probado |
| REQ-F04 Orientación | `orientacion` | `Glosario` (en `Expediente`) | CP-04: `glosario` y recorrido de navegador con teclado | Probado. Contenido pendiente de revisión |
| REQ-F05 Semáforo informativo | `clasificacion` | Panel del semáforo | CP-05a, c, d: `parconaVerde`, `tinguinaAmarillo`, `subtanjallaGrisConservaAlerta`, `sinCopiaLiteralGris`, `cancelarLaHipotecaRecalcula`, `condicionNoContemplada`, `MotorClasificacionTest`. CP-05b: `embargoVigenteDaRojo` | Probado con la tabla borrador v0.2. CP-05b queda pendiente de revisión especializada |
| REQ-F06 Checklist | `checklist` | Checklist del `Expediente` | CP-06: `checklistSoloRevisor`, `checklistValidaPertenenciaYEstado` | Probado |

## Requisitos no funcionales

| Requisito | Cómo se verificó | Resultado | Estado |
|---|---|---|---|
| REQ-NF01 Interacción: texto y color, glosario por selección | Recorrido en Chrome: el estado aparece con texto, ícono y color; el glosario se abre con Enter y marca `aria-expanded` | 38 de 38 verificaciones | Probado en navegador. No se probó con lector de pantalla |
| REQ-NF02 Rendimiento local (hasta 2 s en 19 de 20) | `scripts/medir-nf02.mjs` con el backend recién iniciado | 20 de 20; mediana 16,9 ms; máximo 93,0 ms | Probado, solo la API. No incluye el dibujado de la interfaz |
| REQ-NF03 Acceso | CP-01: 401 sin sesión, 403 del comprador por ruta directa, hash BCrypt, sin registro abierto | 8 de 8 | Probado |
| REQ-NF04 Integridad | CP-03: entrada inválida da 400 sin cambios, versión vieja da 409, recarga conserva lo guardado | Todas pasan | Probado |
| REQ-NF05 Reproducibilidad | Clon limpio del repositorio siguiendo el LEEME: pruebas, compilación y primer arranque | Funciona, pero en el mismo equipo donde se desarrolló | **Parcial**: falta CP-07 en otro equipo |

## Reglas de negocio

| Regla | Dónde se cumple | Prueba | Estado |
|---|---|---|---|
| RN-01 Solo casos sintéticos | Las partidas ficticias llevan `SIM-` y `sintetico = true`; contenido sin identidades. Las transcritas (v0.3) son la excepción pendiente de aprobación | `contenidoCargado` | Probado para las ficticias |
| RN-02 Datos mínimos; desconocido no es ausencia | `MotorClasificacion` | `desconocidoNoEsAusencia` | Probado |
| RN-03 Clasificación y precedencia | `MotorClasificacion` | `b01Verde`, `b02Amarillo`, `amarilloYRojoPorPrecedencia` | Probado. El rojo se probó con una regla ficticia |
| RN-04 Información insuficiente da gris y conserva alertas | `MotorClasificacion` | `b03GrisConservaAlerta`, `grisConservaAlertas`, `faltantesGanaAPrioritaria` | Probado |
| RN-05 Límite de salida | `limite` en toda evaluación y aviso fijo | `b01Verde` y recorrido | Probado |
| RN-06 El color se recalcula, no se escribe | No existe ruta para fijarlo; versión de reglas guardada | `cambioValidoRecalcula`, `colorNoSeFijaAMano` | Probado |
| RN-07 Checklist: solo el revisor modifica | `SecurityConfig` | `checklistSoloRevisor` | Probado |
| RN-08 Fecha referencial sin vencimiento | Se muestra con advertencia; no hay lógica de vencimiento | Recorrido de navegador (advertencia visible) | Implementado. La ausencia de vencimiento se verificó leyendo el código |

## Partidas transcritas (v0.3, desvío de RN-01 y PA2 pendiente de aprobación)

| Elemento | Dónde | Prueba | Estado |
|---|---|---|---|
| Registro y eliminación por el revisor | `ExpedienteService.registrar` y `eliminar` | `RegistrarPartidaTest` (6) | Probado |
| Sin DNI, estado civil ni domicilio en el servidor | `ProteccionDatos` | `entradasInvalidas`, `edicionProtegida` | Probado |
| Limpieza de nombres en el navegador | `lib/disociar.ts`, `lib/leerPartida.ts` | 12 pruebas con vitest; recorrido de navegador | Probado. Es una heurística |
| PDF de transcripción | `CopiaLiteralPdf.Procedencia` | `CopiaLiteralPdfTest.transcripcion` | Probado |

## Planos y evaluación técnica (v0.4)

| Elemento | Dónde | Prueba | Estado |
|---|---|---|---|
| Reglas RV-04, RV-05 y RV-06 | `MotorClasificacion` | `MotorPlanosTest` (7) | Probado. Reglas pendientes de revisión especializada |
| Planos por especialidad y su guardado | `ExpedienteService`, `PlanoTecnico` | `PlanosApiTest` (6) | Probado |
| Lámina 2D referencial | `LaminaPdf` | `LaminaPdfTest` (2), `laminaReferencial` | Probado |
| Solicitud e informe técnico, solo del especialista | `inspeccion`, `SecurityConfig` | `InspeccionTest` (5) | Probado |
| El informe no cambia el color documental | `InspeccionTest.flujoCompleto` | Recorrido de navegador | Probado |

## Realismo de los documentos (v0.5)

| Elemento | Dónde | Prueba | Estado |
|---|---|---|---|
| 10 expedientes con el color esperado | `contenido/v0.4` | `CasosApiTest.losDiezCasosTienenSuColor` | Probado |
| Copia literal: asientos justificados y cierre registral derivado | `CopiaLiteralPdf` | `CopiaLiteralPdfTest` (10 casos, cierre solo en ficticias) | Probado |
| Láminas a escala con las medidas del caso | `LaminaPdf` | `LaminaPdfTest` (medidas, cotas, dos pisos, adobe) | Probado |
| Informe técnico en PDF | `InformeTecnicoPdf` | `InformeTecnicoPdfTest`, `InspeccionTest.informeEnPdf` | Probado |
| Ningún PDF con firma, sello, QR ni imágenes | los 41 PDF del sistema | Revisión con `pdftotext` y `pdfimages` | Probado, 0 problemas |

## Principios de arquitectura

| Principio | Verificación | Estado |
|---|---|---|
| PA1 Alcance mínimo | No hay módulos de la lista de exclusión (1.7). `ModularityTests` verifica los límites entre módulos | Probado |
| PA2 Datos sintéticos | `contenidoCargado`; búsqueda en el código de nombres, fotos y partidas anteriores sin resultados | Probado |
| PA3 Explicación visible | Aviso fijo, motivos, faltantes y límite en cada evaluación | Probado en navegador |
| PA4 Permisos explícitos | `SeguridadTest` por rol y por ruta | Probado |
| PA5 Evidencia antes de afirmar | Este documento y el registro de pruebas | Vigente |

## Pruebas que no se pueden dar por aprobadas

- **CP-05b** (amarillo o rojo según la tabla especializada): se ejecutó con una regla prioritaria ficticia que existe solo
  dentro del test. No se marca aprobada hasta que haya una tabla jurídica revisada con entradas y salidas esperadas.
- **CP-07** (instalación reproducible): falta que otra persona la haga en otro equipo y registre las incidencias.
- **Revisión de contenido** (casos, reglas, glosario, claves): pendiente. Ver [revision/](revision/).

## Interfaz comercial y servicios (v0.6)

| Elemento | Dónde | Prueba | Estado |
|---|---|---|---|
| Datos del predio: tipo, distrito, área y precio referencial | `CasoLote`, `TipoInmueble`, `ExpedienteService.predio`, migración V5 | `CatalogoYServiciosTest.datosDelPredio` | Probado |
| M5 Solicitud solo del comprador, con solicitante y fecha de la sesión, sin duplicar | `SecurityConfig`, `ExpedienteService.solicitarInspeccion`, `InspeccionService.solicitar` | `soloElCompradorSolicita`, `solicitudRegistraSolicitanteYFecha`, `InspeccionTest.flujoCompleto` | Probado |
| M5 Costo referencial S/ 250.00 desde la configuración | `app.inspeccion.costo-referencial`, `ServicioInspeccion` | `solicitudRegistraSolicitanteYFecha`, `costoAntesDeSolicitar` | Probado |
| M8 Identidad del especialista desde su cuenta, sin aceptar la del cliente | `AuthService.perfilProfesional` (API pública de `identidad`), `InspeccionService.registrar` | `identidadDelEspecialistaBloqueada`, `otroRolNoEmite`, `informesDeDemostracionFirmados` | Probado |
| M9 Ítem «Declaración Jurada Municipal (HR y PU)» en los 10 casos | Contenido v0.4, `CasosSeeder.completar` | `itemHrPuEnLosDiezCasos` | Probado |
| M13 Filtros combinables del catálogo | `FiltroCatalogo`, `GET /casos` | `filtrosCombinados`, `filtroInvalido`, `filtroDeRiesgoSeActualiza`; Vitest `catalogo.test.ts` (URL) | Probado |
| Visibilidad por rol en la interfaz | `lib/permisos.ts` | Vitest `permisos.test.ts` | Probado (la protección real es el servidor, I4) |
| Stepper del indicador B y avance de los 6 pasos | `lib/etapas.ts` | Vitest `etapas.test.ts` | Probado |
| Comparador de áreas del plano arquitectónico | `lib/areas.ts` | Vitest `areas.test.ts` (98 contra 72 m²) | Probado |
| Sistema visual, ilustraciones SVG propias y accesibilidad básica | `src/index.css`, `components/base/` | Recorrido `docs/pruebas/recorrido-v06.mjs` (39 de 39) | Probado en Chrome. No se probó con lector de pantalla |

## Invariantes de la v0.6

| Invariante | Prueba automática |
|---|---|
| I1 Verde significa exactamente «Sin alertas en los campos evaluados» | `CatalogoYServiciosTest.verdeSignificaSinAlertas` |
| I2 El indicador B nunca cambia el color del indicador A (RN-10) | `CatalogoYServiciosTest.informeConRiesgoNoCambiaElColor`, `InspeccionTest.flujoCompleto` |
| I3 El checklist no cambia el color del indicador A | `CatalogoYServiciosTest.hrPuNoCambiaElColor`, `CasosApiTest.checklistSoloRevisor` |
| I4 Autorización en el servidor (403 por rol) | `soloElCompradorSolicita`, `otroRolNoEmite`, `InspeccionTest.permisos`, `SeguridadTest` |
| I5 Límites de módulos de Spring Modulith | `ModularityTests` |
| I6 El backend escucha solo en `127.0.0.1` | `ConfiguracionLocalTest.soloEscuchaEnLocal` |
| I7 Personas, precios y colegiatura rotulados como simulados | Recorrido `recorrido-v06.mjs` («Precio referencial · dato simulado», «Datos ficticios de demostración») |
