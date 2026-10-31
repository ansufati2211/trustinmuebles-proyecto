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
