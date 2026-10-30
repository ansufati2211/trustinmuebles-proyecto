# Material para el informe (v0.7.0)

Tablas para pegar en Word, comprobadas el 30 de octubre de 2026 sobre la rama `mejoras-v0.7`. Lo que no se pudo comprobar lo dice.
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

Fecha: 30 de octubre de 2026. Commit del código: `c9784f4`, rama `mejoras-v0.7`. Lo posterior a ese commit es solo documentación.

| Prueba | Comando | Ejecutadas | Aprobadas | Fallos | Errores | Omitidas |
|---|---|---|---|---|---|---|
| Backend | `mvnw test` | 148 | 148 | 0 | 0 | 0 |
| Frontend | `pnpm test` | 64 | 64 | 0 | — | 0 |
| Compilación | `pnpm build` | Correcta, con aviso de tamaño del JavaScript principal | | | | |

| Prueba no ejecutada | Motivo | Último dato disponible |
|---|---|---|
| Recorrido de navegador de la v0.7 | `puppeteer-core` no estaba instalado | Ninguno para la v0.7. El de la v0.6 es anterior al rediseño |
| Rendimiento NF02 (`scripts/medir-nf02.mjs`) | Formaba parte del recorrido, que se saltó | 17 de octubre de 2026: 20 de 20, máximo 93 ms, solo la API, anterior a la v0.7 |
| Imágenes Docker | No se pidió construirlas | No se han construido ni ejecutado |

## Anexo 26. Capturas

**No hay capturas de la v0.7.0.** El recorrido que debía generarlas en `docs/pruebas/capturas-v07/` no se ejecutó. Las capturas que
existen son anteriores al rediseño del 26 de octubre y **no sirven de evidencia de esta versión**.

| Carpeta | Contenido | Uso |
|---|---|---|
| `docs/pruebas/evidencias/capturas-v06/` | 9 capturas de la v0.6 | Solo como referencia histórica |
| `docs/pruebas/evidencias/capturas/` | 7 capturas anteriores a la v0.6 | Solo como referencia histórica |
| `docs/pruebas/capturas-v07/` | No existe | Pendiente |

## Tabla 10. Pruebas por requisito funcional

La columna RF queda por completar: RF01 a RF12 no están definidos en el repositorio (ver la sección 16.1 del modelo de negocio).

| RF | Función | Clase o archivo de prueba | N.° de pruebas |
|---|---|---|---|
| Por asignar | Acceso y permisos | `SeguridadTest` | 8 |
| Por asignar | Cuentas de demostración | `CuentasDemoTest` | 3 |
| Por asignar | Captación y publicación | `CaptacionPublicacionTest` | 11 |
| Por asignar | Registro de partidas, origen y precio | `RegistrarPartidaTest` | 11 |
| Por asignar | Casos, edición y checklist | `CasosApiTest` | 23 |
| Por asignar | Catálogo, filtros e indicador B | `CatalogoYServiciosTest` | 14 |
| Por asignar | Contacto, asignación y panel | `CarteraTest` | 9 |
| Por asignar | Indicador B | `InspeccionTest` | 6 |
| Por asignar | Historial y subsanación | `HistorialEvaluacionTest` | 9 |
| Por asignar | Planos | `PlanosApiTest` | 6 |
| Por asignar | Motor de reglas | `MotorClasificacionTest`, `MotorPlanosTest` | 10 + 7 |
| Por asignar | Documentos PDF | `CopiaLiteralPdfTest`, `LaminaPdfTest`, `InformeTecnicoPdfTest` | 9 + 6 + 2 |
| Por asignar | Partida normalizada | `NormalizadorAsientosTest` | 7 |
| Por asignar | Ciclo completo | `CicloCarteraTest` | 1 |
| Por asignar | Migraciones | `MigracionV6Test`, `MigracionEspecialistaTest`, `MigracionAsignacionTest` | 1 + 1 + 1 |
| No funcional | Módulos y escucha local | `ModularityTests`, `ConfiguracionLocalTest` | 2 + 1 |
| Por asignar | Interfaz: permisos y navegación | `permisos.test.ts` | 15 |
| Por asignar | Interfaz: catálogo y cartera | `catalogo.test.ts`, `cartera.test.ts` | 7 + 7 |
| Por asignar | Interfaz: partida transcrita | `disociar.test.ts`, `leerPartida.test.ts`, `fuentes.test.ts` | 6 + 6 + 2 |
| Por asignar | Interfaz: indicador B y áreas | `etapas.test.ts`, `areas.test.ts` | 6 + 4 |
| Por asignar | Interfaz: historial y contacto | `historial.test.ts`, `contacto.test.ts` | 5 + 4 |
| Por asignar | Interfaz: pie legal (I7) | `limitesLegales.test.tsx` | 2 |
