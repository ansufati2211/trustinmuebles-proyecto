# Trustinmuebles — MVP académico de orientación documental (v0.7.0)

Proyecto del curso Diseño e Implementación de Arquitectura Empresarial. Trustinmuebles es el sistema de transparencia
precompra de **una sola inmobiliaria de Ica**, que carga a mano su propia cartera (sin scraping de otros portales ni APIs
públicas, que SUNARP no ofrece). Muestra **partidas registrales simuladas** de lotes y viviendas urbanas, con documentos que se
parecen a una copia literal pero son ficticios, explica sus términos y señala qué información falta. **No certifica
saneamiento, no recomienda comprar, no consulta fuentes oficiales y no reemplaza asesoría legal.**

## Modelo de negocio

**Quién lo ofrece:** una sola inmobiliaria de Ica, que carga a mano su propia cartera. **Quién lo usa:** el comprador, y
dentro de la inmobiliaria el revisor, el gestor y los especialistas; el propietario autoriza su caso.

**Problema que reduce:** el comprador suele decidir sin entender la partida registral ni saber qué documentos faltan; el
sistema ordena esa información, la explica y señala los vacíos. **Qué NO hace:** certificar saneamiento, recomendar la
compra, consultar fuentes oficiales en línea ni reemplazar a un abogado o notario.

| | Indicador A | Indicador B |
|---|---|---|
| Servicio | Pre-evaluación documental automática por reglas | Evaluación técnica presencial de 6 pasos |
| Quién lo activa | Se calcula para todo inmueble de la cartera | El comprador, a pedido |
| Costo | Incluido | S/ 250.00 (dato de la demostración), sin pasarela de pago |
| Resultado | Verde («Sin alertas en los campos evaluados»), amarillo, rojo o gris | Informe del especialista en PDF |

B nunca cambia el color de A (RN-10): así el comprador distingue lo que dicen los documentos de lo que se vio en la visita.

### Actores y responsabilidades

| Actor | Rol en el sistema | Responsabilidad |
|---|---|---|
| Comprador | COMPRADOR | Consulta los casos publicados, pide contacto y solicita la inspección (indicador B) |
| Revisor | REVISOR | Capta el expediente indicando al propietario, mantiene partidas, planos y checklist, y subsana faltantes |
| Gestor (asesor comercial) | GESTOR | Publica y retira casos, atiende contactos, asigna inspecciones y sigue la cartera en su panel |
| Especialista | ESPECIALISTA | Visita el inmueble y emite el informe técnico; si la inspección está asignada, solo el asignado |
| Propietario | PROPIETARIO | Consulta sus casos y otorga o retira su autorización. No edita ni sube documentos |
| Abogado o notario | — (fuera del sistema) | Verificación jurídica antes de comprar |

### Flujo de nueve etapas

«Implementado» significa que existe en el backend con pruebas automáticas y en la interfaz con pruebas de sus funciones
puras; el aspecto y el comportamiento en el navegador de las vistas de la v0.7 **no se han verificado** (ver
`docs/RESUMEN-v0.7.md`).

| # | Etapa | Quién | Estado |
|---|---|---|---|
| 1 | Captación: el revisor crea el expediente e indica el código del propietario; nace en borrador | Revisor | Implementado (v0.7) |
| 2 | Autorización del propietario para evaluar y publicar | Propietario | Implementado (v0.7) |
| 3 | Pre-evaluación documental automática (indicador A) | Motor de reglas | Implementado |
| 4 | Subsanación: el revisor incorpora documentos faltantes, el motor recalcula y el historial lo registra | Revisor | Implementado (v0.7) |
| 5 | Publicación, solo con autorización vigente | Gestor | Implementado (v0.7) |
| 6 | Consulta del comprador y solicitud de contacto | Comprador, gestor | Implementado (v0.7) |
| 7 | Evaluación técnica presencial (indicador B), con asignación del especialista | Comprador, gestor, especialista | Implementado (asignación en v0.7) |
| 8 | Seguimiento de la cartera en el panel del gestor | Gestor | Implementado (v0.7) |
| 9 | Verificación jurídica con abogado o notario | Comprador | **Fuera del sistema** |

### Reglas que no deben romperse

- Verde significa exactamente «Sin alertas en los campos evaluados» (I1).
- El color de A solo cambia cuando el motor recalcula por un cambio de datos o documentos; ningún botón ni ruta lo fija, y
  publicar, retirar, autorizar, contactar o asignar no lo tocan (I8).
- B nunca cambia A (I2) y el checklist, incluida la HR y PU, tampoco (I3).
- Adjuntar un plano o un PDF no levanta un rojo por embargo, bloqueo o demanda: solo una partida transcrita nueva (I9).
- Publicar y pedir contacto no dependen del color de A (I10), pero nada se publica sin autorización vigente del propietario (I14).
- Sin nombres, DNI ni teléfonos de propietarios o compradores: se identifican por su código de cuenta y el contacto usa motivos
  de una lista cerrada (I11).
- El historial de evaluaciones es de solo adición (I12) y el propietario solo autoriza sus propios casos (I13).
- La autorización la valida el servidor (I4); la interfaz solo oculta lo que el rol no puede hacer.

### Casos de demostración y propietarios

Los diez casos (ver «Casos cargados») están publicados y autorizados, repartidos entre los dos propietarios por orden de partida
(D33): **propietario-01** tiene Parcona, Subtanjalla, Pueblo Nuevo, Salas y Pachacútec; **propietario-02**, La Tinguiña, Los
Aquijes, Santiago, San José de los Molinos e Ica. Las cuentas de demostración están en «Cuentas de prueba».

### Cómo se genera valor (hipótesis por validar)

Son hipótesis de negocio, sin cifras: no se han validado con ninguna inmobiliaria.
- **Suscripción de la inmobiliaria:** la inmobiliaria pagaría por usar el sistema con su cartera, a cambio de vender con más
  transparencia y menos consultas repetidas.
- **Parte del ingreso de la inspección:** el sistema recibiría una parte de lo que se cobre por cada evaluación técnica
  presencial (indicador B).

**Validación propuesta (actividad futura):** un piloto con entre tres y cinco inmobiliarias de Ica para comprobar si la propuesta
de valor les sirve y si estarían dispuestas a pagar por ella. Ese piloto **no se ha realizado**.

### Hoja de ruta (no implementado)

- **Vigencia automática** de la información registral. Hoy no existe a propósito: RN-08 pide fecha referencial sin
  vencimiento automático.
- **Comparador** de inmuebles.
- **Posventa.**
- **Inteligencia artificial** (por ejemplo, para leer documentos). Hoy no hay OCR, visión artificial ni IA.
- La etapa 9 (verificación jurídica) sigue fuera del sistema.

**Fuentes:** gratuitas (Conoce Aquí y Visor Catastral de SUNARP, consultados a mano) frente a aportadas o pagadas (copia
literal certificada, planos, HR y PU, inspección). Sin scraping ni APIs inexistentes (ver «Fuentes de información»).

**Limitaciones:** MVP académico con datos simulados; las reglas están pendientes de revisión especializada.

El producto se llama Trustinmuebles en el código, en la documentación y en el informe (ver `docs/decisiones.md`, D2).

Dos carpetas:
- `trustinmuebles-backend/` — API de Spring Boot 4 con Java 21, modular con Spring Modulith en 9 módulos: `identidad`,
  `expediente`, `clasificacion`, `inspeccion`, `cartera`, `checklist`, `orientacion`, `almacenamiento` y `shared`. Ver su README.
- `trustinmuebles/` — interfaz de React 19 con Vite: catálogo comercial con filtros, detalle con planos e inspección, vistas
  «Cartera» (gestor) y «Mis inmuebles» (propietario), historial de evaluaciones y solicitud de contacto (v0.7), y un
  sistema visual propio (tokens en `src/index.css`). Los casos y planos usan ilustraciones SVG propias, pero la landing y el
  login (rediseño del equipo) cargan fotografías externas decorativas (Unsplash): **la demo necesita internet**. Incluye barra
  de navegación, pie con los límites legales y pantalla de carga.

Documentación en `docs/`: funcionalidades, entorno, decisiones, API, trazabilidad, pruebas con evidencias, manuales y notas para el informe. Para saber qué hace el programa, empieza por `docs/funcionalidades.md`.

## Requisitos

- Java 21. Maven no hace falta: `./mvnw` lo descarga.
- Node.js 20 o superior. Se usa `npx pnpm@9`, porque el `pnpm` del sistema puede exigir Node 22.
- No hace falta instalar ninguna base de datos: el backend usa H2 en archivo.

## Cómo correrlo (dos terminales)

El backend necesita la contraseña de las cuentas de prueba **antes del primer arranque**. No tiene valor por defecto: elige
una de al menos 8 caracteres.

**Windows PowerShell:**

```powershell
# Terminal 1: backend en http://127.0.0.1:8080  (Swagger: /swagger-ui.html)
cd trustinmuebles-backend
$env:APP_SEED_PASSWORD = 'elige-una-clave-de-prueba'
.\mvnw.cmd spring-boot:run

# Terminal 2: interfaz en http://localhost:5173
cd trustinmuebles
npx pnpm@9 install
npx pnpm@9 dev
```

**bash, zsh o fish:**

```bash
# Terminal 1: backend en http://127.0.0.1:8080  (Swagger: /swagger-ui.html)
cd trustinmuebles-backend
env APP_SEED_PASSWORD='elige-una-clave-de-prueba' ./mvnw spring-boot:run

# Terminal 2: interfaz en http://localhost:5173
cd trustinmuebles
npx pnpm@9 install
npx pnpm@9 dev
```

Si falta `APP_SEED_PASSWORD`, el backend se detiene con un mensaje que lo explica.

## Cuentas de prueba

| Cuenta | Rol | Puede |
|---|---|---|
| `comprador-01` | COMPRADOR | Consultar la cartera y los expedientes, y **solicitar la inspección técnica** (solo este rol) |
| `revisor-01` | REVISOR | Consultar, editar expedientes y planos, cambiar el checklist, subir PDF y registrar partidas |
| `especialista-01` | ESPECIALISTA | Consultar y emitir el informe técnico de una inspección solicitada. No edita partidas |
| `especialista-02` | ESPECIALISTA | Igual que `especialista-01`; perfil ficticio «Arq. Perfil Ficticio 02», `SIM-CAP-0002` (v0.7) |
| `gestor-01` | GESTOR (asesor comercial) | Publicar y retirar casos, atender contactos, asignar inspecciones y ver el panel de cartera (v0.7) |
| `propietario-01`, `propietario-02` | PROPIETARIO | Consultar solo sus casos y otorgar o retirar su autorización; nada más (v0.7) |

**v0.7 (solo backend):** el comprador ve únicamente casos publicados; un caso nuevo nace en borrador y solo se publica con la
autorización de su propietario. La interfaz todavía no tiene pantallas para estos roles (ver `docs/RESUMEN-v0.7.md`).

El especialista de la demostración firma como **Ing. Carlos Alberto Mendoza Quispe, Ingeniero Civil, CIP N.° 248910**. Son datos
ficticios y la interfaz los rotula así; el servidor los toma de la cuenta y no del formulario (M8).

Todas las cuentas usan la contraseña de `APP_SEED_PASSWORD`. Al arrancar se crea cada cuenta que falte, también en una base ya
creada (v0.7); las que existen no se tocan: si cambias la variable con una base ya creada, su contraseña no cambia. Para empezar de cero, apaga el backend y borra la carpeta `trustinmuebles-backend/data/`. Una base de la v0.5 se actualiza
sola al arrancar (migración V5): recibe distrito, precio, el ítem HR y PU y el perfil del especialista, pero sus informes ya
guardados conservan el profesional anterior.
No hay registro abierto.

## Casos cargados

Cada caso es una partida simulada: lleva el prefijo `SIM-`, un predio en un distrito de Ica (con una habilitación inventada), su
copia literal y sus láminas de planos en PDF, y un informe técnico cuando se emitió. Todo es inventado.

| Partida | Predio | Tipo | Precio ref. | A | B | HR y PU | Qué muestra |
|---|---|---|---|---|---|---|---|
| `SIM-11048217` | Mz. F Lote 7 · Santa Elvira · Parcona | Vivienda | S/ 185,000 | Verde | Favorable | Revisado | Una titular; hipoteca cancelada; 4 planos |
| `SIM-11052690` | Mz. K Lote 12 · Rincón del Sauce · La Tinguiña | Vivienda | S/ 210,000 | Amarillo | Con observaciones | Revisado | Copropiedad; hipoteca vigente; faltan II.EE. e II.SS. |
| `SIM-11061555` | Mz. C Lote 3 · Mirador del Sol · Subtanjalla | Vivienda | S/ 120,000 | Gris | No solicitada | Observado | Extracto parcial; demanda vigente (alerta prioritaria); sin planos |
| `SIM-11070419` | Mz. B Lote 9 · Villa del Algarrobo · Los Aquijes | Vivienda | S/ 98,000 | Gris | No solicitada | Pendiente | Sin copia literal ni planos |
| `SIM-11075836` | Mz. G Lote 14 · Jardines del Pacae · Pueblo Nuevo | Vivienda | S/ 165,000 | Rojo | No solicitada | Observado | Embargo vigente; 4 planos |
| `SIM-11081204` | Mz. B Lote 5 · Campiña del Olivar · Santiago | Lote | S/ 75,000 | Verde | No solicitada | Revisado | Lote recién independizado; los planos no aplican |
| `SIM-11087751` | Mz. D Lote 22 · Los Tamarindos · Salas | Vivienda (adobe) | S/ 88,000 | Amarillo | Con riesgo | Observado | Sucesión intestada; servidumbre de paso |
| `SIM-11093320` | Mz. A Lote 3 · Puente Molino · San José de los Molinos | Vivienda | S/ 110,000 | Rojo | Solicitada | Pendiente | Bloqueo registral vigente |
| `SIM-11098467` | Mz. N Lote 8 · Mirador del Pallar · Pachacútec | Vivienda | S/ 140,000 | Amarillo | En inspección | Observado | Ampliación no declarada: plano de 98 m² contra 72 m² inscritos |
| `SIM-11104029` | Mz. M Lote 6 · Los Laureles del Sur · Ica | Vivienda | S/ 260,000 | Amarillo | Favorable | Revisado | Reserva vial; plano de estructuras observado |

Los precios son referenciales y simulados. Solo Santiago es un lote: las otras nueve tienen declaratoria de fábrica o planos y
sus reglas lo exigen (ver `docs/decisiones.md`, D23).

Los casos 5 a 10 no forman parte del instrumento del estudio: las formas A y B usan solo los 4 primeros.

Las reglas (tabla borrador v0.4), el glosario y la redacción de los documentos están **pendientes de revisión especializada**.
Si tenías una base creada con una versión anterior, apaga el backend y borra `trustinmuebles-backend/data/`: los casos
cambiaron de código.

## Partidas reales (transcritas)

El revisor puede registrar partidas reales consultadas en Conoce Aquí (SUNARP), sin nombres ni datos de personas naturales.
No hay API de SUNARP: se consulta a mano y se pega el texto. Ver `docs/guia-transcripcion.md` y `docs/decisiones.md` (D20).
Es un desvío de RN-01 y PA2 que el asesor debe aprobar.

## Pruebas

```powershell
cd trustinmuebles-backend; .\mvnw.cmd test     # 140 pruebas del backend (v0.7)
cd trustinmuebles; npx pnpm@9 test              # 60 pruebas del frontend (v0.7)
cd trustinmuebles; npx pnpm@9 build             # verifica tipos y compila
```

En bash: `./mvnw test` en lugar de `.\mvnw.cmd test`. En la v0.7 el backend pasó de 107 a **140 pruebas** y el frontend de 33 a
**60** (ejecuciones reales del 25 de octubre de 2026; los conteos finales están en `docs/RESUMEN-v0.7.md`). Las pruebas del
frontend son de funciones puras (permisos, navegación, filtros, totales del panel, historial y contacto): no prueban el dibujado
de las pantallas. El rendimiento se mide con `node scripts/medir-nf02.mjs`.

**`docs/pruebas/recorrido-v06.mjs` está obsoleto:** sus 39 verificaciones son de la v0.6, con 3 roles y el diseño anterior al
rediseño de landing y login, y no recorre las vistas de la v0.7. Se conserva como referencia; hace falta un recorrido nuevo
(**por verificar**). Resultados y evidencias en `docs/pruebas/`.

## Invariantes (todas con prueba automática salvo I7)

| | Invariante | Prueba |
|---|---|---|
| I1 | Verde significa exactamente «Sin alertas en los campos evaluados»; no certifica saneamiento ni reemplaza asesoría legal | `CatalogoYServiciosTest.verdeSignificaSinAlertas` |
| I2 | El indicador B nunca cambia el color del indicador A (RN-10) | `CatalogoYServiciosTest.informeConRiesgoNoCambiaElColor`, `InspeccionTest.flujoCompleto` |
| I3 | El checklist no cambia el color del indicador A | `CatalogoYServiciosTest.hrPuNoCambiaElColor`, `CasosApiTest.checklistSoloRevisor` |
| I4 | La autorización está en el servidor (403 por rol) | `CatalogoYServiciosTest.soloElCompradorSolicita`, `otroRolNoEmite`, `SeguridadTest` |
| I5 | Los módulos solo se comunican por sus APIs públicas | `ModularityTests` |
| I6 | El backend escucha solo en `127.0.0.1` | `ConfiguracionLocalTest.soloEscuchaEnLocal` |
| I7 | Los límites legales se muestran en el pie de página (incluido que los datos de la demostración son simulados) y el login comunica que es un entorno demostrativo; ya no se repiten rótulos por tarjeta o panel (D47) | Lectura del código de `Footer.tsx` y `Login.tsx`. Sin prueba automática ni recorrido de navegador en la v0.7: **por verificar** |
| I8 | El color de A cambia solo cuando el motor recalcula; publicar, retirar, asignar, contactar o el historial no lo fijan | `CaptacionPublicacionTest`, `HistorialEvaluacionTest`, `CarteraTest` |
| I9 | Un plano o PDF no levanta un rojo por embargo, bloqueo o demanda | `HistorialEvaluacionTest.pdfNoLevantaElEmbargo` |
| I10 | Publicar y pedir contacto no dependen del color de A | `CaptacionPublicacionTest.publicarRojoNoCambiaElColor`, `CarteraTest.contactoSobreRojo` |
| I11 | Sin nombres, DNI ni teléfonos; contacto con motivos cerrados | `CuentasDemoTest`, `CarteraTest.motivoCerrado` |
| I12 | Historial de evaluaciones de solo adición | `HistorialEvaluacionTest.historialInmutable` |
| I13 | El propietario solo autoriza sus casos | `CaptacionPublicacionTest.autorizacionSoloDelPropietario`, `propietarioSoloLectura` |
| I14 | No se publica sin autorización vigente | `CaptacionPublicacionTest.sinAutorizacionNoSePublica`, `CicloCarteraTest` |

## Funcionalidades implementadas

- **Catálogo comercial (`#/casos`):** tarjetas con ilustración, tipo de inmueble, distrito, área, precio referencial y los dos
  indicadores. Filtros combinables por tipo, indicador A e indicador B (incluido «con riesgo físico detectado»), resueltos en el
  servidor y reflejados en la URL.
- **Indicador A, pre-evaluación documental:** semáforo automático por reglas versionadas sobre la partida (rubros C, D, E y F)
  y los 4 planos de la vivienda, con motivos, alertas y faltantes.
- **Expediente técnico de 4 planos:** arquitectura, estructuras, instalaciones eléctricas (II.EE.) e instalaciones sanitarias
  (II.SS.), con una lámina 2D a escala por plano generada en PDF con PDFBox. El revisor puede subir el PDF real de cada plano.
- **Indicador B, evaluación técnica presencial:** solo el comprador la solicita (costo referencial S/ 250.00, sin pago en
  línea), con su cuenta y la fecha registradas. El especialista emite el informe en 6 pasos, firmado con los datos de su
  cuenta, también en PDF. Nunca cambia el color del indicador A (RN-10).
- **Checklist con la declaración jurada municipal (HR y PU)** en los 10 casos.
- Copia literal simulada en PDF, glosario cerrado, checklist, edición transaccional del revisor y partidas transcritas sin
  datos personales. El detalle está en `docs/funcionalidades.md`.

## Fuentes de información

| Fuentes gratuitas | Aportadas por el propietario o de pago |
|---|---|
| Conoce Aquí (SUNARP): texto de la partida, que el revisor transcribe | Copia literal certificada (SUNARP, con costo) |
| Visor Catastral BGR (SUNARP): ubicación gráfica, solo enlazada | Planos de las 4 especialidades |
| | Declaración jurada municipal (HR y PU) |
| | Inspección presencial del especialista (costo referencial) |

Sin scraping de portales ni APIs inexistentes: SUNARP no ofrece una API pública de partidas y copiar otros portales incumple
sus condiciones de uso.

## Qué no incluye

Integraciones estatales, scraping de portales, OCR, inteligencia artificial o visión artificial, autenticidad documental,
dictámenes jurídicos, pagos en línea, contratos, firmas, agenda de visitas, tours, posventa y reportes descargables
(sección 1.7 del informe). Los filtros del catálogo son simples (tipo e indicadores), no búsquedas avanzadas.

## Pendiente fuera del código

Revisión especializada del contenido, piloto, reclutamiento, consentimientos y aplicación del estudio, fechas y
presupuesto. Los materiales del estudio (formas A y B, claves y bases vacías) están en la carpeta `estudio/` que se
mantiene **fuera de este repositorio** a propósito.
El CIP N.° 248910 del especialista no lleva el prefijo `SIM-`: **por verificar** que no pertenezca a un profesional real.

## Uso local

El backend escucha solo en `127.0.0.1` y la interfaz solo en localhost. La configuración de seguridad es de desarrollo
local. No la uses en un servidor accesible desde la red (ver `docs/decisiones.md`, D9).
