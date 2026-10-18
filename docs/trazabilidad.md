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
| RN-01 Solo casos sintéticos | Restricción `sintetico = true` en la base; contenido sin identidades | `contenidoCargado` | Probado |
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
