# Reporte de la versión 1.0.0 de Trustinmuebles

Fecha: 15 de noviembre de 2026. Entrega: lunes 16 de noviembre de 2026. Rama de la última etapa: `v1.0-etapa-10`, creada
desde `main` en `ff573d1` (merge de la etapa 9). Material autocontenido para redactar el informe:
[PARA-INFORME-v1.0.md](PARA-INFORME-v1.0.md). Modelo de negocio único de la 1.0.0:
[MODELO-NEGOCIO-IMPLEMENTADO.md](MODELO-NEGOCIO-IMPLEMENTADO.md).

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
| 7. Kit, documentación y versión | `d88bfe1` | Partida oculta también en la tarjeta, el proyecto, la portada y los PDF de la partida matriz; «Plano de plano» corregido; kit de respaldo; `preparar-demo.mjs`; versión 1.0.0; documentación; recorrido de 15 minutos | — | D68, D69 |
| 8. Ajustes finales y verificación | `7d6f044` | Precios de mercado por rango de distrito; cifras reales en la portada; registro de interesados desde el panel con consentimiento verbal; marca LEDCONS en la barra, el pie y los PDF; `preparar-demo` con reposición; `verificar-sitio`; pasada en tableta; lista del lunes; documento para el informe | V23 | D70–D73 |
| 9. Modelo consolidado y adopción | `v1.0-etapa-9` (sin merge) | Modelo de negocio y funcionalidades en una sola descripción de la 1.0.0 (lo anterior, a `docs/historico/`); exportar a CSV para Excel la bandeja (con filtros) y los lotes de un proyecto (plantilla de ida y vuelta); dirección, enlace de mapa y «Cómo llegar»; condiciones de pago en texto; aviso de interesados nuevos en el menú; cuentas de asesor por `app.asesores`; embudo por etapa y proyecto | V24 | D74–D78 |
| 10. Primer proyecto real | `v1.0-etapa-10` (sin merge) | Sol de Carhuaz – IV etapa de LedCons (sin lotes, partida matriz interna `INT-` con indicador A gris y autorización de la inmobiliaria); lotes con letra (`10A`) en la carga, la ficha y el plano; CSV real de 214 lotes en el kit | V25 | D80 |
| 14. Plano de lotes en el catálogo | `v1.0-etapa-14` (sin merge) | Selector Lista \| Plano en `#/inmuebles`: plano con pin, zoom y los lotes que no cumplen los filtros atenuados | — | D84 |
| 11. Plano de la lotización | `v1.0-etapa-11` (sin merge) | Plano de LedCons con un pin en el lote de su ficha y de su panel, y el plano entero con un punto por lote en la página del proyecto | — | D81 |

## 2. Pruebas

### Totales ejecutados

| Momento | Backend (`./mvnw test`) | Interfaz (`vitest run`) |
|---|---|---|
| v0.9 (`d7803f8`, antes de la 1.0) | 200 | 85 (16 archivos) |
| Antes de la etapa 7 (`525deeb`) | **312**, 0 fallos | **262** (29 archivos), 0 fallos |
| Después de la etapa 7 | **318**, 0 fallos | **276** (30 archivos), 0 fallos |
| Después de la etapa 8 | **332**, 0 fallos | **290** (32 archivos), 0 fallos |
| Después de la etapa 9 | **347**, 0 fallos, 0 errores, 0 omitidas | **309** (33 archivos), 0 fallos |
| Después de la etapa 10 | **353** (medido en la rama: 346 antes, 0 fallos; ver §9), 0 fallos | **311** (33 archivos), 0 fallos |
| Después de la etapa 11 | **353**, 0 fallos | **319** (34 archivos), 0 fallos |
| Después de la etapa 14 | **353**, 0 fallos | **325** (36 archivos), 0 fallos |

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
| Etapa 8 | 331 | 286 |
| Etapa 9 | 346 | 304 |

### Pruebas de la etapa 7

- Nuevas: `KitDemoTest` (6: los tres textos del kit dan verde, amarillo y rojo con los PDF del kit; los PDF son válidos y
  no oficiales; versión 1.0.0; partida matriz oculta sin sesión y completa con sesión), `lib/kit.test.ts` (12), una de la
  versión en el pie (`limitesLegales.test.tsx`) y una de la página del proyecto con sesión (`pages/proyectos.test.tsx`).
- Ajustadas conservando lo que verifican (lo pedía la etapa): la tarjeta del catálogo (`pages/proyectos.test.tsx`, antes
  exigía `N.° 11048217` sin sesión) y los documentos del proyecto (`ProyectosApiTest.documentosDelProyecto`, antes exigía
  la partida matriz completa sin sesión). Ahora exigen la partida oculta sin sesión y completa con sesión. La página del
  proyecto exige `(N.° 1111••••)` sin sesión en lugar de `(N.° 11112001)`. Ninguna prueba se borró ni se desactivó.

### Pruebas de la etapa 8

- Nuevas (backend, +14): `RegistroPanelYMarcaTest` (9: permisos, consentimiento verbal, validaciones, sin límite por IP,
  V23 sobre una base existente, cifras del sitio, empresa.json, PDF con la empresa y WhatsApp), `PreciosZonaTest` (3: rangos,
  base nueva y base existente), `ProyectosUnidadTest.precioEnRango` y `InteresUnidadTest.numeroWhatsapp`.
- Nuevas (interfaz, +14): `lib/empresa.test.ts` (6: copia idéntica de empresa.json, datos, logo, enlace wa.me, teléfonos,
  cifras de la portada) y `pages/etapa8.test.tsx` (8: barra, pie, colores sin tocar A ni el estado comercial, portada sin
  números fijos, registro desde el panel).
- **Ajustadas conservando lo que verifican** (ver D70 y D72): `ProyectosApiTest.precarga` (precio con la fórmula nueva);
  el rótulo de los PDF en `CopiaLiteralPdfTest`, `RealismoContenidoTest`, `KitDemoTest` y `lib/kit.test.ts` («LEDCONS» en
  lugar de «TRUSTINMUEBLES»); la barra en `pages/proyectos.test.tsx`; `InteresApiTest.configuracionPublica` (sin variable, el
  WhatsApp es el de la empresa y ya no nulo). **Dos aserciones exigían PDF sin ninguna imagen**
  (`CopiaLiteralPdfTest.sinElementosOficiales`, `LaminaPdfTest.unaLaminaPorEspecialidad`); la etapa pide el logo de la
  empresa, así que ahora exigen que la **única** imagen sea ese logo (mismas dimensiones que su PNG): siguen impidiendo
  escudos, sellos o QR. Ninguna prueba se borró ni se desactivó.

### Pruebas de la etapa 9

- Nuevas (backend, +15): `Etapa9Test` (base H2 propia y `app.asesores=asesor-01, asesor-02,asesor-02`): permisos y
  contenido del CSV de lotes, ida y vuelta (la vista previa del archivo exportado da todo «sin cambios»), protección contra
  fórmulas, permisos y filtros del CSV de interesados, direcciones de la precarga, permisos de «datos del proyecto»,
  ubicación en el proyecto y en el lote, enlaces inválidos (http, `javascript:`, sin dominio, con espacios), límites de 200
  y 500 caracteres, aviso de nuevos, cuentas de asesor configurables, lista de asesores y embudo (15).
- Nuevas (interfaz, +19): `pages/etapa9.test.tsx` (19 ejecutadas; 18 `it`, uno repetido para el asesor y el gestor): rutas
  de exportación, nombre del archivo, botones en Proyectos, «Cómo llegar» solo con https, página del proyecto y ficha del
  lote con y sin enlace, condiciones de pago con y sin texto, formulario y validación, aviso en la barra del asesor y del
  gestor y en el menú ☰, embudo.
- **Ajustada conservando lo que verifica:** `lib/permisos.test.ts` «cada rol ve solo sus vistas» ahora espera
  `["inicio", "casos", "cartera", "interesados"]` para el gestor (la etapa pide el aviso también en su menú). Ninguna prueba
  se borró ni se desactivó.

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

**Corrida vigente: 14/11/2026, etapa 9, base nueva — 15 de 15 pasos y 12 de 12 pantallas en tableta**, sin errores de
consola ni respuestas 409/500. Guion ejecutado por la máquina en **100,1 s** (178 s con el arranque del backend, 37,2 s).
Los pasos 1 a 13 dieron lo mismo que en la tabla de abajo (con la frase nueva del asistente, 19 resultados). Pasos nuevos de
la etapa 9:

| Paso | Quién | Qué se comprobó | Resultado |
|---|---|---|---|
| 14 | `asesor-01` | Aviso «3» junto a «Interesados» (3 en etapa Nuevo según la API); botón «Exportar a CSV»; CSV de interesados `text/csv`, con BOM, 16 filas para 16 interesados y separador «;»; CSV de lotes de Horizonte de Los Aquijes con las columnas de la carga y 80 filas; volver a cargarlo da 80 sin cambios, 0 nuevos, 0 actualizados; «Ubicación y pago» de Altos de Ventisca con la dirección precargada, enlace de mapa y condiciones guardados | OK |
| 15 | Visitante | Ficha del lote C-12 y página del proyecto con la dirección y «Cómo llegar» (abre el enlace en otra pestaña); «Condiciones de pago» con «Consulta con un asesor»; sin mapa embebido | OK |

Capturas nuevas: `capturas/14-exportar-ubicacion.png` y `15-ubicacion-pago.png`; las demás se regeneraron.

**Corrida de la etapa 7** (13/11/2026), que dio origen a la tabla:

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

## 7. Etapa 8: verificación de la demo

**Recorrido** (`recorrido-v10.mjs`, base nueva, 13/11/2026): **13 de 13 pasos** con la frase nueva del asistente
(«lote en Subtanjalla de menos de 80 mil soles», 19 resultados) y **12 de 12 pantallas en tableta** (820 × 1180 y 1180 × 820:
portada, inmuebles, plano, ficha del lote, interesados y registrar interesado), sin desplazamiento horizontal, con el logo
de LEDCONS en la barra, sin errores de consola ni respuestas 409/500. Duración del guion ejecutado por la máquina: **70,1 s**
(159 s con el arranque del backend, 46,2 s). **La duración con una persona no se midió**: el guion está pensado para 15
minutos y hay que cronometrarlo en el ensayo. Capturas: `uso-v10/capturas/` y `uso-v10/capturas-tableta/`.

**Reposición en vivo** (`preparar-demo.mjs`, base temporal): se borraron a pedido 2 interesados (Ana, con cita confirmada, y
Luis) y se pasó el lote A-1 de Altos de Ventisca de disponible a vendido. `--solo-verificar` lo detectó (13 de 15, 3 citas, 1
lote cambiado); el script repuso los 2 interesados por el registro desde el panel (con la cita confirmada de Ana) y devolvió
A-1 a disponible; la verificación siguiente dio todo OK. El reparto de estados de la semilla se reproduce exacto: 168 de 168
lotes, y la fórmula de precios del script coincide con la del servidor en los 168.

**`verificar-sitio.mjs`** contra la instalación local (`http://localhost:8080`): 6 de 6 OK (180 inmuebles publicados, 3
proyectos, 101 lotes disponibles; robots `Disallow: /`; ficha registral `8019••••` sin el número completo). Para la nube:
`node scripts/verificar-sitio.mjs https://<dominio-de-la-demo>` (no ejecutado: la nube se reinicia y verifica el domingo,
ver `docs/demo/CHECKLIST-LUNES.md`).

**Precargado en la etapa 8:** precios de los 168 lotes con los rangos nuevos (en una base existente, solo los no editados);
`contenido/empresa.json` y el logo; el CSV del kit re-preciado; los PDF del kit regenerados con el rótulo de LEDCONS.

## 8. Etapa 9: modelo consolidado y mejoras de adopción

- **Documentación:** [MODELO-NEGOCIO-IMPLEMENTADO.md](MODELO-NEGOCIO-IMPLEMENTADO.md) y [funcionalidades.md](funcionalidades.md)
  describen una sola 1.0.0. El texto de la v0.7 a la v0.9 del modelo y el de la v0.8 de funcionalidades se movieron sin
  cambios a `docs/historico/`. Se corrigió lo que contradecía la 1.0 (datos que sí vienen de LedCons, datos de contacto que
  sí existen, especialistas sin colegiatura, conteos, despliegue en la nube).
- **Exportar a CSV** (D74): bandeja de interesados con los filtros aplicados y lotes de un proyecto; punto y coma, UTF-8 con
  BOM y CRLF; solo ASESOR y GESTOR; sin caché; protección contra fórmulas. El de lotes usa las columnas de la carga.
- **Ubicación y condiciones de pago** (D75, V24): dirección (200), enlace de mapa https (500) y condiciones (500). La página
  del proyecto y la ficha del lote muestran la dirección y «Cómo llegar» (otra pestaña); sin enlace no hay botón. Precarga:
  una dirección referencial por proyecto, sin enlace y sin condiciones.
- **Aviso de nuevos** (D76): `GET /interesados/nuevos`; burbuja junto a «Interesados» en la barra y en el menú ☰, con texto
  para lectores de pantalla; el gestor tiene ahora «Interesados» en su menú.
- **Cuentas de asesor** (D77): `app.asesores` / `APP_ASESORES` (por omisión `asesor-01`); los responsables posibles son todas
  las cuentas ASESOR y GESTOR. `docker-compose.yml` pasa la variable. CHECKLIST-LUNES: contraseña propia en la nube.
- **Embudo** (D78): `GET /interesados/embudo` y pestaña «Embudo» en Interesados.
- **Sin «colegiado» en textos:** el pie, la portada, el ingreso, el panel del indicador B, el informe técnico en PDF y el
  glosario `v0.5` decían «especialista colegiado» o «profesional colegiado»; ahora dicen «especialista de la inmobiliaria»
  o «profesional responsable», porque los especialistas no tienen colegiatura registrada (D67). `limitesLegales.test.tsx`
  sigue exigiendo el texto del pie y además que no diga «colegiado».

## 9. Etapa 10: primer proyecto real de LedCons (Sol de Carhuaz – IV etapa)

Rama `v1.0-etapa-10`, creada desde `main` en `ff573d1` (la etapa 9 ya estaba unida a `main`). Decisión: D80. Migración: V25.

- **Cómo se precargan los proyectos (investigado antes de cambiar nada).** Los cuatro de demostración se definen en
  `contenido/proyectos.json` (nombre, distrito, dirección, partida matriz, semilla, manzanas, hitos) y su partida matriz en
  `contenido/v0.5/casos/1111200N.json`. Al arrancar, `CasosSeeder` (orden 40) crea los casos que faltan (la partida matriz de
  la inmobiliaria con su `HistorialAutorizacion` OTORGADA y la autorización vigente, en borrador) y `ProyectosSeeder` (orden
  45) crea el proyecto, sus hitos y sus lotes solo si faltan. No es una migración: en una base existente, como la de la
  nube, el arranque agrega lo que falta sin reiniciarla ni duplicar, y no pisa lo editado.
- **Sol de Carhuaz – IV etapa** entra por ese mismo mecanismo, sin lotes (`sol-de-carhuaz-iv-etapa`): dirección y
  condiciones de pago de LedCons, sin enlace de mapa, y los hitos «Lanzamiento de la IV etapa (preventa)» (en curso) y «Luz»,
  «Agua», «Desagüe» (pendientes), sin fechas. Un proyecto que **nace** ahora trae su dirección y sus condiciones de pago (antes
  solo la dirección, una vez por base).
- **Partida matriz `INT-99000700`:** registro interno de cartera, sin asientos ni documentos; indicador A **gris**;
  autorización vigente de la inmobiliaria (verbal), registrada por el asesor. No es un número de SUNARP.
- **Lotes con letra:** la carga **no** los aceptaba (el lote era un entero). V25 agrega `lote_proyecto.sufijo`; la validación
  acepta un número de 1 a 9999 más una o dos letras (`10A`, `15C`), la clave es `228A-10A` y la ficha, el plano, el historial,
  la exportación y el catálogo la usan. Los lotes numéricos no cambian.
- **Carga real:** `docs/demo/kit/sol-de-carhuaz-iv-etapa-lotes.csv` (214 lotes, 32 manzanas, 94,15 a 172 m², todos
  `DISPONIBLE` y `NO_CONSTA`): 214 nuevos, 0 errores; la segunda carga da «sin cambios» en las 214 filas.
- **Pruebas:** backend 346 → **353** (`Etapa10Test`: 7 pruebas); interfaz 309 → **311** (2 pruebas de lotes con letra). Se
  actualizaron 3 constantes de conteo del contenido sembrado (16 → 17 casos; 4 → 5 partidas matrices; 4 → 5 casos grises);
  ninguna prueba se borró, se desactivó ni se debilitó. Build de la interfaz correcto.
- **Recorrido `recorrido-v10.mjs`:** **15 de 15** pasos, tableta 12 de 12, 0 errores de consola, 0 respuestas 409/500. El
  script ahora acepta `CHROME_PATH` (antes solo la ruta de Chrome de Windows); no se agregó ningún paso.
  `preparar-demo.mjs` reconoce el quinto proyecto («0 lotes, va sin lotes») y puede reponer sus lotes con el CSV.
- **Falta de LedCons:** enlace de mapa; zonificación; independización de cada lote (hoy «No consta»); copia literal de la
  partida matriz (con ella se registra el número real y los asientos, y el indicador A deja de ser gris); confirmar el
  distrito «Ica»; fechas de los hitos.

## 10. Etapa 11: plano de la lotización con la ubicación de cada lote

Rama `v1.0-etapa-11` (desde `v1.0-etapa-10`). Decisión: D81. Sin migración.

- **Qué hace:** en la página del proyecto, el plano de la lotización de LedCons se muestra entero con un punto por lote (se
  toca uno para elegirlo). Al elegir un lote, su panel y su ficha (`#/proyectos/{c}/lotes/{mz-lote}`) muestran el plano
  acercado a su zona con un pin sobre el lote, con «Ver plano completo» y «Abrir el plano completo». Un proyecto sin plano no
  muestra nada nuevo.
- **De dónde sale la posición:** de la imagen del plano (11 589 × 13 205 px) y del CSV, sin servicios externos ni Google
  Maps: se detectaron las celdas del plano, se siguió la numeración de cada manzana y se verificó contra los números
  impresos en el plano (lectura por OCR en una herramienta temporal, que no es dependencia del proyecto) y a ojo, con las 214
  posiciones dibujadas sobre el plano. Está en `public/planos/sol-de-carhuaz-iv-etapa.json` (fracciones de la imagen) y la
  imagen web (4000 px, 3,3 MB) en `public/planos/sol-de-carhuaz-iv-etapa.jpg`. Es **referencial**: así lo dice la pantalla.
- **El «Cómo llegar» de Google Maps** sigue siendo el del proyecto: el enlace de Google es un solo punto (no tiene lotes).
- **Pruebas de la interfaz:** 311 → **319** (8 nuevas: ventana y pin, lectura del plano y que el archivo publicado tenga los
  214 lotes del CSV, sin repetir posiciones). Build correcto. El backend no cambió salvo el texto de la descripción del
  proyecto (353 pruebas, sin cambios).
- **Para revisar con LedCons (el plano y el CSV no coinciden en 13 lotes):**
  - 12 lotes del CSV aparecen **en blanco** en el plano (no amarillos): `219-8`, `219-9`, `219-13`, `225-22`, `230-5`,
    `231-12`, `238A-1`, `239-5` y `242A-8`, `242A-9`, `242A-10`, `242A-11`. Están en el CSV como disponibles; el plano
    amarillo los muestra como no disponibles (o el plano está desactualizado).
  - Un lote **amarillo** del plano no está en el CSV: `225-2`. Parece que el CSV trae `225-22` donde debía decir `225-2`
    (confirmarlo antes de corregir; no se tocó el CSV).

## 11. Etapa 14: plano de lotes en el catálogo

Rama `v1.0-etapa-14` (desde `v1.0-etapa-11`; las ramas `v1.0-etapa-12` y `-13`, con un catálogo por proyectos y una tabla de
Expedientes, quedaron guardadas sin usar a pedido del equipo). Decisión: D84. Sin backend nuevo ni migración.

- **Qué hace:** el catálogo (`#/inmuebles`) tiene un selector **Lista | Plano** (`?vista=plano` en la URL). En «Plano» se elige un
  proyecto entre los que tienen lotes que cumplen los filtros y se ve su plano: el de la lotización de LedCons (Sol de Carhuaz –
  IV etapa) con un punto por lote, **pin** y botones **+ / −** (hasta 3×), o el plano de manzanas de los demás proyectos. Tocar un
  lote pone el pin y abre a un costado su detalle (área, precio, estado, «Ver ficha», «Solicitar cita» y el acercamiento).
- **Filtros:** siguen funcionando; los lotes que no cumplen se ven atenuados y el selector dice cuántos lotes cumplen en cada proyecto.
- **Cómo:** reutiliza `GET /publico/inmuebles/recomendables` (los lotes que cumplen), `GET /publico/proyectos/{c}`, `PlanoLotizacion`,
  `PlanoLotes` y `PanelLote`. Lógica pura en `src/lib/planoCatalogo.ts`.
- **Pruebas:** interfaz 319 → **325** (6 nuevas: agrupar proyectos, claves que cumplen, proyecto inicial, vista en la URL y el
  selector en pantalla). Build y recorrido (15/15) correctos.

## 12. Etapa 10 (cierre): portal con los proyectos de LedCons

Rama `v1.0-etapa-10`. Decisión: D85. Sin migración.

- **Vista Alegre** se agregó como proyecto solo con su nombre (`vista-alegre`): no hay datos de LedCons todavía, así que no
  tiene distrito, dirección, pago, plano, hitos, lotes ni partida matriz. No se ve en el portal hasta tener lotes ofrecidos.
- **Proyectos de demostración fuera del portal:** `app.proyectos.retirados` (por omisión Rinconada del Lúcumo, Terrazas de
  Sauzal y Horizonte de Los Aquijes) retira, una sola vez por base y después de precargar los interesados, la autorización de
  su partida matriz, con su fila RETIRADA en el historial. No se borra nada; si el equipo vuelve a autorizar uno, no se retira
  otra vez. Queda en línea Altos de Ventisca, que usa la guía de la demo.
- **Selector «Proyecto»:** ofrece solo proyectos con lotes en línea. Las urbanizaciones de las casas (Santa Elvira, Rincón del
  Sauce, etc.) ya no aparecen ahí, pero las casas siguen en el catálogo, incluidas C1–C4 del estudio.
- **Guía de la demo:** el paso del CSV en vivo usa la lista real de Sol de Carhuaz (214 lotes) en lugar de Horizonte (80).
  `recorrido-v10.mjs` y `preparar-demo.mjs` se ajustaron.
- **Pruebas:** las existentes corren con todos los proyectos en línea (`src/test/resources/config/application.properties`);
  `RetiroProyectosDemoTest` (4) prueba el retiro y `Etapa10Test` suma 2 (Vista Alegre y el selector).

## 13. Pendientes y límites conocidos

- **Etapa 14:** sin push ni merge de `v1.0-etapa-14`. La vista «Plano» solo muestra los lotes que el catálogo ofrece (no incluye vendidos).
- **Etapa 11:** sin push ni merge de `v1.0-etapa-11`. Las posiciones del plano son una lectura de la imagen, no coordenadas
  topográficas: no sirven para un «Cómo llegar» exacto por lote (para eso LedCons tendría que entregar el DWG o un KML).
- **Etapa 10:** sin push ni merge de `v1.0-etapa-10`. El proyecto nuevo no se probó en la nube ni con la base de la nube.

- **Sin push ni merge** de `v1.0-etapa-9`: lo decide el equipo.
- `preparar-demo.mjs` no puede **crear un proyecto** que falte (no hay endpoint): lo informa y pide reiniciar la base.
  Desde la etapa 8 repone lotes con el estado de la semilla y los interesados por el panel (sin límite por IP). No hay un
  endpoint para borrar lotes, así que la carga de lotes **faltantes** por CSV no se ensayó en vivo (sí el cambio de estado).
- Los PDF de la partida matriz con sesión se abren con `abrirPdf` (fetch con el token): un bloqueador de ventanas
  emergentes puede impedir que se abra la pestaña.
- El recorrido usa por omisión la ruta de Chrome de Windows (`C:/Program Files/Google/Chrome/Application/chrome.exe`; con `CHROME_PATH` se cambia, y la etapa 10 lo corrió en Linux) y no se probó en
  otros navegadores ni con lectores de pantalla. No se ensayó el guion a mano con público ni se cronometró con una persona.
- El aviso de tamaño del JS principal de la interfaz sigue (no se partió el paquete).
- La demo en la nube no se verificó en esta etapa.
- Etapa 9: el enlace de «Cómo llegar» lo pega una persona; el sistema comprueba que sea https con dominio, no que lleve al
  lugar correcto. Las direcciones de la precarga son referenciales: hay que reemplazarlas por las reales de LedCons. El CSV
  de interesados lleva datos de contacto: quien lo descarga es responsable de no difundirlo. No se probó abrir los CSV en
  Excel de escritorio (sí su formato: BOM, «;», CRLF y la vuelta por la carga).
- Etapa 8: la autorización **escrita** de LedCons para su marca está pendiente (hoy verbal). Los PDF del kit llevan el
  rótulo de LEDCONS pero no el logo (el generador sin dependencias no incrusta imágenes).
