# Reporte de la versión 1.0.0 de Trustinmuebles

Fecha: 13 de noviembre de 2026. Entrega: lunes 16 de noviembre de 2026. Rama de la última etapa: `v1.0-etapa-7`, creada
desde `origin/main` en `525deeb` (sin push).

La 1.0.0 convierte el sistema de transparencia precompra en un **portal inmobiliario**: el comprador encuentra lotes y
casas de la inmobiliaria sin irse a otra (filtros, orden, plano de lotes, asistente, usos posibles del lote, solicitud de
cita) y el asesor carga inmuebles (uno a uno o por CSV) y sigue a cada interesado como en un CRM. No hay pagos en línea. Lo
anterior (expedientes, indicador A, ruta, semáforo interno, documentos del lote, inspección B) se conserva.

## 1. Cambios por etapa

| Etapa | Commit (merge en `main`) | Qué agregó | Migración | Decisión |
|---|---|---|---|---|
| 1. Actores y portal público | `06c70f3` | Rol ASESOR y `asesor-01`; titularidad comercial INMOBILIARIA/PARTICULAR con historial de autorizaciones de solo adición; portal público sin sesión (catálogo y ficha, solo publicados); menú del asesor | V17 | D59–D61 |
| 2. Filtros, orden e independización | `cccbc93` | Filtros combinables y orden en el servidor, en la URL; precio por m²; proyecto, estado comercial e independización del caso; generador de carga y prueba con 1000 lotes | V18 | D62 |
| 3a. Proyectos y plano de lotes | `b2be988` | Proyectos, hitos y lotes; catálogo unido de casos y lotes; plano SVG accesible; ficha del lote; partidas matrices con autorización | V19 | D63 |
| 3b. Carga por CSV | `339ec6e` | Plantilla, vista previa por fila, confirmación todo o nada, historial de lotes; cuarto proyecto sin lotes; kit CSV | V20 | D64 |
| 4. Interés, citas y CRM | `f8abf44` | `POST /publico/interes` con consentimiento, trampa y límite; citas; bandeja de interesados con etapas, notas, agenda y demanda; 15 interesados y 4 citas precargados | V21 | D65 |
| 5. Asistente y usos del lote | `0147b41` | Asistente por reglas (sin IA), recomendaciones con motivos, usos que suelen permitirse | — | D66 |
| 6. Realismo del contenido | `525deeb` | Sin palabras de prueba; INT-; titulares reservados; partida oculta en la ficha; ficha registral propia; PDF públicos; colegiatura vacía; créditos; no indexar; menú ☰ | V22 | D67 |
| 7. Kit, documentación y versión | `v1.0-etapa-7` (sin merge) | Partida oculta también en la tarjeta, el proyecto, la portada y los PDF de la partida matriz; «Plano de plano» corregido; kit de respaldo; `preparar-demo.mjs`; versión 1.0.0; documentación; recorrido de 15 minutos | — | D68, D69 |

## 2. Pruebas

### Totales ejecutados

| Momento | Backend (`./mvnw test`) | Interfaz (`vitest run`) |
|---|---|---|
| v0.9 (`d7803f8`, antes de la 1.0) | 200 | 85 (16 archivos) |
| Antes de la etapa 7 (`525deeb`) | **312**, 0 fallos | **262** (29 archivos), 0 fallos |
| Después de la etapa 7 | **318**, 0 fallos | **276** (30 archivos), 0 fallos |

Build de la interfaz (`tsc --noEmit && vite build`): correcto, con el aviso de tamaño del JS principal que ya existía.

### Por etapa (conteo estático)

Cuenta de `@Test` en el backend y de `it(`/`test(` en la interfaz en cada merge; puede diferir en 1 a 4 de lo ejecutado
(pruebas generadas en bucles).

| Después de | Backend | Interfaz |
|---|---|---|
| v0.9 | 200 | 85 |
| Etapa 1 | 211 | 94 |
| Etapa 2 | 234 | 105 |
| Etapa 3a | 250 | 135 |
| Etapa 3b | 272 | 152 |
| Etapa 4 | 291 | 169 |
| Etapa 5 | 291 | 236 |
| Etapa 6 | 311 | 262 |
| Etapa 7 | 317 | 272 |

### Pruebas de la etapa 7

- Nuevas: `KitDemoTest` (6: los tres textos del kit dan verde, amarillo y rojo con los PDF del kit; los PDF son válidos y
  no oficiales; versión 1.0.0; partida matriz oculta sin sesión y completa con sesión), `lib/kit.test.ts` (12), una de la
  versión en el pie (`limitesLegales.test.tsx`) y una de la página del proyecto con sesión (`pages/proyectos.test.tsx`).
- Ajustadas conservando lo que verifican (lo pedía la etapa): la tarjeta del catálogo (`pages/proyectos.test.tsx`, antes
  exigía `N.° 11048217` sin sesión) y los documentos del proyecto (`ProyectosApiTest.documentosDelProyecto`, antes exigía
  la partida matriz completa sin sesión). Ahora exigen la partida oculta sin sesión y completa con sesión. La página del
  proyecto exige `(N.° 1111••••)` sin sesión en lugar de `(N.° 11112001)`. Ninguna prueba se borró ni se desactivó.

## 3. Tiempo con 1000 lotes

`CargaCatalogoTest.milLotes` (etapa 2) genera 1000 lotes publicados además de la precarga y mide cada consulta del catálogo
público por la API (MockMvc, H2 en memoria, sin dibujar la interfaz). Límite: 2 s por consulta. Resultado de la corrida de
la etapa 7:

| Consulta (catálogo público con más de 1000 lotes) | Tiempo |
|---|---|
| Primera página, sin filtros (en frío) | 189 ms |
| Primera página, sin filtros | 104 ms |
| Última página | 65 ms |
| Indicador A VERDE | 182 ms |
| Tipo de alerta, ordenado por precio por m² | 248 ms |
| Proyecto + distrito + precio + área + estado comercial, por área | 73 ms |
| Orden por precio descendente, página 3 | 114 ms |
| Un proyecto | 66 ms |

Todas por debajo del límite de 2 s; la más lenta, 248 ms. Es tiempo de la API en la máquina de desarrollo, no de la
interfaz ni de un servidor en la nube.

## 4. Recorrido de 15 minutos

`docs/pruebas/uso-v10/recorrido-v10.mjs`, ejecutado el 13/11/2026: arranca `backend-1.0.0.jar` con una **base nueva en
una carpeta temporal fuera del repositorio**, la interfaz con Vite y Chrome sin ventana; corre `scripts/preparar-demo.mjs`;
recorre el guion con el kit; apaga backend, interfaz y navegador y borra la base temporal.

| Paso | Quién | Qué se comprobó | Resultado |
|---|---|---|---|
| — | `preparar-demo.mjs` | 4 proyectos, 15 de 15 interesados, 4 citas, 180 publicados, versión 1.0.0 | OK, sin cargar nada |
| 1 | Visitante | Asistente: 3 etiquetas, 56 resultados | OK |
| 2 | Visitante | Disponible + «Precio: de menor a mayor» en la URL; 0 tarjetas con la partida completa | OK |
| 3 | Visitante | Plano de Altos de Ventisca, `1111••••`, lote C-12 con precio y área; PDF de la matriz oculto sin sesión | OK |
| 4 | Visitante | Ficha del lote: usos, aviso de parámetros, indicador de la matriz, «Solicitar cita» | OK |
| 5 | Visitante | Cita de Carla (visita al lote, pasado mañana, correo `@example.com`) recibida | OK |
| 6 | `asesor-01` | CSV del kit: 80 nuevos, 0 errores, 80 lotes en el proyecto y en su página pública | OK |
| 7 | `asesor-01` | `INT-99000611` con el texto del kit: sin avisos, sin nombres, borrador, gris | OK |
| 8 | `asesor-01` | 4 láminas del kit presentadas: A verde | OK |
| 9 | `propietario-02` | Autoriza; sigue en borrador | OK |
| 10 | `asesor-01` | Publica; A no cambia; ficha pública `INT-••••`; ficha registral pública sin el número | OK |
| 11 | `asesor-01` | Carla: cita confirmada, etapa Cita agendada, vinculada a Altos de Ventisca C-12 | OK |
| 12 | `asesor-01` | Visita realizada → Separación, 5 notas, lote C-12 Separado en el plano, A de la matriz sigue verde | OK |
| 13 | Visitante | Aviso legal en el pie, «versión 1.0.0», `/publico/sitio` no indexable | OK |

**13 de 13 pasos correctos** en 130 s (incluido el arranque del backend, 48,6 s), sin errores de consola ni respuestas 409
o 500.

Capturas: `docs/pruebas/uso-v10/capturas/01-asistente.png` a `13-pie-version.png`. Datos: `RESULTADO-recorrido-v10.json`.

Durante las primeras corridas, el recorrido encontró un error real de texto: la ficha pública decía «Plano de plano
arquitectónico». Se corrigió (`nombrePlano`) con su prueba. Los demás fallos de esas corridas eran de selectores del
script y se corrigieron en el script.

## 5. Kit de respaldo (`docs/demo/kit/`)

| Archivo | Contenido |
|---|---|
| `LEEME-KIT.md` | Qué es cada archivo y en qué paso del guion se usa |
| `partidas/INT-99000611-vivienda-sin-cargas.txt` | Vivienda de un particular, sin cargas: gris sin planos, **verde** con sus 4 láminas |
| `partidas/INT-99000612-lote-con-hipoteca.txt` | Lote con hipoteca vigente: **amarillo** (RV-02) con sus 4 documentos |
| `partidas/INT-99000613-lote-con-embargo.txt` | Lote con embargo vigente: **rojo** (RP-01) con sus 4 documentos |
| `pdf/INT-99000611/` | 4 láminas (arquitectura, estructuras, eléctricas, sanitarias) con cajetín de la inmobiliaria |
| `pdf/INT-99000612/`, `pdf/INT-99000613/` | Plano perimétrico, memoria descriptiva, resumen de zonificación y tasación referencial |
| `datos-cita.md` | Lo que se escribe en «Solicitar cita» (`Carla`, `carla.visita@example.com`) |
| `proyecto-nuevo-80-lotes.csv`, `proyecto-con-errores.csv` | CSV de la etapa 3b |
| `frases-asistente.md` | 10 frases del asistente (etapa 5) |

Sin nombres de personas: titulares «Persona natural (datos reservados)» o empresas inventadas; correos `@example.com`; sin
DNI, celulares ni colegiaturas. Los PDF los genera `scripts/generar-pdf-demo.mjs` sin dependencias, con rótulo y autor de
la inmobiliaria, marca de agua «REFERENCIAL» y sin sellos, firmas ni códigos de verificación.

## 6. Precarga verificada por `preparar-demo.mjs` (base nueva)

| Grupo | Resultado |
|---|---|
| Proyectos | Altos de Ventisca 56 lotes, Rinconada del Lúcumo 44, Terrazas de Sauzal 68 (todos publicados, autorización vigente); Horizonte de Los Aquijes sin lotes (para el CSV del kit) |
| Interesados | 15 de 15: Nuevo 3, Contactado 3, Cita agendada 3, Visita realizada 2, Separación 2, Venta 1, Descartado 1 |
| Citas | 4 en los próximos 7 días: 2 confirmadas, 1 por confirmar, 1 reprogramada |
| Catálogo | 180 inmuebles publicados en el portal |
| Versión | 1.0.0, sitio no indexable |

## 7. Pendientes y límites conocidos

- **Sin push ni merge** de `v1.0-etapa-7`: lo decide el equipo.
- `preparar-demo.mjs` no puede **crear un proyecto** que falte (no hay endpoint): lo informa y pide reiniciar la base. Los
  lotes que repone llegan como **disponibles** (no reproduce el reparto aleatorio de vendidos y separados de la semilla).
  Si faltan interesados, el formulario público admite 10 envíos por hora: con más de 10 faltantes hay que volver a correrlo.
- En la base nueva no se probó `preparar-demo.mjs` reponiendo datos (siempre encontró la precarga completa); la reposición
  usa los mismos endpoints que cubren las pruebas de las etapas 3b y 4.
- Los PDF de la partida matriz con sesión se abren con `abrirPdf` (fetch con el token): un bloqueador de ventanas
  emergentes puede impedir que se abra la pestaña.
- El recorrido usa la ruta de Chrome de Windows (`C:/Program Files/Google/Chrome/Application/chrome.exe`) y no se probó en
  otros navegadores ni con lectores de pantalla. No se ensayó el guion a mano con público ni se cronometró con una persona.
- El aviso de tamaño del JS principal de la interfaz sigue (no se partió el paquete).
- La demo en la nube no se verificó en esta etapa.
- Los textos de la portada todavía hablan del «catálogo de 12 lotes y viviendas»; no se cambiaron en esta etapa.
