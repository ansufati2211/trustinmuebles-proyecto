# Trustinmuebles — MVP académico de orientación documental (v0.7.0)

> **Modelo de negocio implementado, comprobado contra el código y las pruebas:**
> [docs/MODELO-NEGOCIO-IMPLEMENTADO.md](docs/MODELO-NEGOCIO-IMPLEMENTADO.md). Este LEEME usa sus mismos identificadores
> (ACT, ETP, RN, I).

Proyecto del curso Diseño e Implementación de Arquitectura Empresarial. Trustinmuebles es el sistema de transparencia
precompra de **una sola inmobiliaria de Ica**, que carga a mano su propia cartera (sin scraping de otros portales ni APIs
públicas, que SUNARP no ofrece). Muestra **partidas registrales simuladas** de lotes y viviendas urbanas, con documentos que se
parecen a una copia literal pero son ficticios, explica sus términos y señala qué información falta. **No certifica
saneamiento, no recomienda comprar, no consulta fuentes oficiales en línea y no reemplaza a un abogado o notario.**

**Versión:** `0.7.0` en el backend (`trustinmuebles-backend/pom.xml`) y en la interfaz (`trustinmuebles/package.json`).

**Organización de referencia del caso:** LedCons, sin acta ni acuerdo formal acreditado. Los datos del sistema no provienen de
esa organización.

## Modelo de negocio

**Quién paga (hipótesis):** la inmobiliaria. **Quién usa:** el comprador y, dentro de la inmobiliaria, el revisor, el gestor
(asesor comercial) y los especialistas; el propietario autoriza su caso.

**Problema que reduce:** el comprador suele decidir sin entender la partida registral ni saber qué documentos faltan; el
sistema ordena esa información, la explica y señala los vacíos.

| | Indicador A | Indicador B |
|---|---|---|
| Servicio | Pre-evaluación documental automática por reglas (`v0.4`, borrador pendiente de revisión especializada) | Evaluación técnica presencial de 6 pasos |
| Quién lo activa | Nadie lo pide: se calcula para todo caso al registrarlo o cambiar sus datos | El comprador, a pedido |
| Costo | Incluido | S/ 250.00 referencial, sin pasarela de pago |
| Resultado | Verde «Sin alertas en los campos evaluados», amarillo «Requiere revisión», rojo «Alerta prioritaria» o gris «Información insuficiente o condición no evaluable» | Informe del especialista en PDF |

B nunca cambia el color de A (RN-10, I2): así el comprador distingue lo que dicen los documentos de lo que se vio en la visita.
El significado exacto de cada color está en la sección 5 del modelo de negocio.

### Actores

Revisor, gestor y especialistas son **personal de la inmobiliaria**; el código no modela otras empresas.

| ID | Actor | Rol en el sistema | Responsabilidad |
|---|---|---|---|
| ACT-01 | Comprador | COMPRADOR | Consulta el catálogo de casos **publicados**, pide contacto y solicita la inspección (indicador B) |
| ACT-02 | Revisor | REVISOR | Registra la captación indicando su origen y al propietario, mantiene partidas, planos y checklist, y subsana faltantes |
| ACT-03 | Gestor (asesor comercial) | GESTOR | Publica y retira casos, atiende contactos, asigna inspecciones y sigue la cartera en su panel |
| ACT-04 | Especialista | ESPECIALISTA | Registra el avance y emite el informe técnico, solo si el gestor le asignó la inspección |
| ACT-05 | Propietario | PROPIETARIO | Consulta sus casos y otorga o retira su autorización. No edita ni sube documentos |
| ACT-06 | Abogado o notario | Externo | Verificación jurídica antes de comprar |
| ACT-07 | SUNARP (Conoce Aquí, Visor BGR) | Externo | Fuente consultada a mano; el sistema solo abre enlaces |
| ACT-08 | Municipalidad | Externo | Fuente consultada a mano (declaración jurada HR y PU que aporta el propietario) |

### Flujo de nueve etapas

«Implementado» significa que existe en el backend con pruebas automáticas y en la interfaz con pruebas de sus funciones
puras. **Ninguna pantalla de la v0.7 se ha verificado en un navegador:** el recorrido nuevo sigue sin ejecutarse (ver
«Pruebas»). El detalle (pantalla, endpoint y prueba de cada
etapa) está en la sección 4 del modelo de negocio.

| ID | Etapa | Quién | Estado |
|---|---|---|---|
| ETP-1 | Captación: el propietario **inicia el proceso fuera del sistema** (entrega sus documentos a la inmobiliaria) y el revisor registra el caso en «Registrar partida», con el código del propietario; nace en borrador y el indicador A se calcula en ese momento. El revisor elige el **origen** (transcrita de Conoce Aquí o simulada para demostración) y puede indicar un precio referencial | Propietario, revisor | Implementado |
| ETP-2 | Autorización: el propietario la confirma con su cuenta. **A ya está calculado antes de autorizar** y autorizar no lo cambia; la autorización solo habilita la publicación | Propietario | Implementado |
| ETP-3 | Pre-evaluación documental automática (indicador A) | Motor de reglas | Implementado |
| ETP-4 | Subsanación: el revisor incorpora documentos faltantes, el motor recalcula y el historial lo registra | Revisor | Implementado |
| ETP-5 | Publicación, solo con autorización vigente. El botón «Publicar» está en el **detalle del caso**, no en la lista de la cartera | Gestor | Implementado |
| ETP-6 | Consulta del catálogo y solicitud de contacto | Comprador, gestor | Implementado |
| ETP-7 | Evaluación técnica presencial (indicador B), con asignación obligatoria del especialista por el gestor | Comprador, gestor, especialista | Implementado |
| ETP-8 | Seguimiento de la cartera en el panel del gestor | Gestor | Implementado |
| ETP-9 | Verificación jurídica con abogado o notario | Comprador | **Fuera del sistema** |

### Reglas que no deben romperse

- Verde significa exactamente «Sin alertas en los campos evaluados» (I1).
- El color de A solo cambia cuando el motor recalcula por un cambio de datos o documentos; ningún botón ni ruta lo fija, y
  publicar, retirar, autorizar, contactar o asignar no lo tocan (I8).
- B nunca cambia A (I2) y el checklist, incluida la HR y PU, tampoco (I3).
- Adjuntar un plano o un PDF no levanta un rojo por embargo, bloqueo o demanda: solo un cambio en los asientos de la partida (I9).
- Publicar y pedir contacto no dependen del color de A (I10), pero nada se publica sin autorización vigente del propietario (I14).
- Sin nombres, DNI ni teléfonos de propietarios o compradores: se identifican por su código de cuenta y el contacto usa motivos
  de una lista cerrada (I11).
- El historial de evaluaciones es de solo adición (I12) y el propietario solo autoriza sus propios casos (I13).
- La autorización la valida el servidor (I4); la interfaz solo oculta lo que el rol no puede hacer.

### Cómo se genera valor (hipótesis no validadas)

Son hipótesis de negocio, sin cifras: no se han validado con ninguna inmobiliaria.
- **Suscripción de la inmobiliaria:** pagaría por usar el sistema con su cartera. El sistema no tiene cobros ni planes.
- **Parte del ingreso de la inspección:** una parte de lo que se cobre por cada evaluación técnica (S/ 250.00 referencial).
  Hoy el panel de cartera cuenta las inspecciones solicitadas o en curso, pero no suma importes ni cuenta las emitidas.

**Validación propuesta (actividad futura):** un piloto con entre tres y cinco inmobiliarias de Ica. Ese piloto **no se ha
realizado**.

### Hoja de ruta

**Planeado (no implementado):** vigencia automática de la información registral (hoy no existe a propósito, RN-08),
comparador de inmuebles, posventa e inteligencia artificial para leer documentos (hoy no hay OCR ni IA).

**Fuera de alcance:** ver «Qué no incluye». La etapa 9 (verificación jurídica) sigue fuera del sistema.

**Limitaciones:** MVP académico con datos simulados; las reglas están pendientes de revisión especializada.

El producto se llama Trustinmuebles en el código, en la documentación y en el informe (ver `docs/decisiones.md`, D2).

## Estructura

- `trustinmuebles-backend/` — API de Spring Boot 4 con Java 21, modular con Spring Modulith en 9 módulos: `identidad`,
  `expediente`, `clasificacion`, `inspeccion`, `cartera`, `checklist`, `orientacion`, `almacenamiento` y `shared`. Ver su README.
- `trustinmuebles/` — interfaz de React 19 con Vite. Los predios y las láminas usan ilustraciones SVG propias. La landing, el
  login, el catálogo, la cartera y el registro de partida usan fotografías locales de `public/img/`: la demo no depende de
  internet para verlas. La credencial del especialista usa sus iniciales.

Documentación en `docs/`: funcionalidades, entorno, decisiones, API, trazabilidad, pruebas con evidencias, manuales y notas para
el informe. Para saber qué hace el programa, empieza por `docs/MODELO-NEGOCIO-IMPLEMENTADO.md` y `docs/funcionalidades.md`.

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

Si falta `APP_SEED_PASSWORD` y hay cuentas por crear, el backend se detiene con un mensaje que lo explica.

**Docker (no verificado):** hay `docker-compose.yml`, un `Dockerfile` por carpeta y un flujo de GitHub Actions que publica las
imágenes en GHCR **solo cuando se lanza a mano** (`workflow_dispatch`). No se ha probado. El frontend se publica en
`127.0.0.1:8081`, solo en este equipo, y el backend no publica puertos. Dentro del contenedor el backend escucha en `0.0.0.0`,
alcanzable únicamente por la red interna de Docker.

## Cuentas de prueba

| Cuenta | Rol | Puede |
|---|---|---|
| `comprador-01` | COMPRADOR | Consultar el **catálogo de casos publicados** y su detalle, pedir contacto y **solicitar la inspección técnica** (solo este rol) |
| `revisor-01` | REVISOR | Consultar todos los casos, editar expedientes y planos, cambiar el checklist, subir PDF y registrar o eliminar partidas transcritas |
| `especialista-01` | ESPECIALISTA | Consultar todos los casos y registrar el avance o emitir el informe de las inspecciones que el gestor le asignó. No edita partidas |
| `especialista-02` | ESPECIALISTA | Igual que `especialista-01`; perfil «Arq. Perfil Ficticio 02», `SIM-CAP-0002` |
| `gestor-01` | GESTOR (asesor comercial) | Publicar y retirar casos, atender contactos, asignar inspecciones y ver el panel de cartera |
| `propietario-01`, `propietario-02` | PROPIETARIO | Consultar solo sus casos (también en borrador) y otorgar o retirar su autorización; nada más |

Cada rol tiene su menú: el comprador y el especialista ven «Expedientes»; el revisor agrega «Registrar partida»; el gestor,
«Cartera»; el propietario ve solo «Mis inmuebles». Un caso nuevo nace en borrador y solo se publica con la autorización de su
propietario.

El especialista `especialista-01` firma como **Ing. Perfil Ficticio 01, Ingeniero Civil, CIP N.° SIM-CIP-0001**. Son datos
ficticios: la credencial en pantalla usa iniciales y dice «Perfil ficticio de demostración», y el PDF del informe también los
rotula así. El servidor toma esos datos de la cuenta y no del formulario (M8). **Los perfiles de especialista son ficticios y no
firman informes reales.**

Todas las cuentas usan la contraseña de `APP_SEED_PASSWORD`. Al arrancar se crea cada cuenta que falte, también en una base ya
creada; las que existen no se tocan: si cambias la variable con una base ya creada, su contraseña no cambia. Para empezar de
cero, apaga el backend y borra la carpeta `trustinmuebles-backend/data/`. Una base anterior se migra al arrancar (V5 a V10);
V6, V9 y V10 se probaron sobre bases en memoria (`MigracionV6Test`, `MigracionEspecialistaTest`, `MigracionAsignacionTest`),
**no sobre una base real en `data/`**. V9 actualiza el perfil de `especialista-01` y los informes ya firmados con el perfil
anterior. No hay registro abierto.

## Casos cargados

Cada caso es una partida simulada: lleva el prefijo `SIM-`, un predio en un distrito de Ica (con una habilitación inventada), su
copia literal y sus láminas de planos en PDF, y un informe técnico cuando se emitió. Todo es inventado. Los diez nacen
**publicados y autorizados**. Solo la inspección en curso de `SIM-11098467` tiene especialista asignado (`especialista-01`);
`SIM-11093320` queda solicitada y pendiente de asignación. Los informes emitidos los firma `especialista-01`.

| Partida | Predio | Propietario | Tipo | Precio ref. | A | B | HR y PU | Qué muestra |
|---|---|---|---|---|---|---|---|---|
| `SIM-11048217` | Mz. F Lote 7 · Santa Elvira · Parcona | propietario-01 | Vivienda | S/ 185,000 | Verde | Favorable | Revisado | Una titular; hipoteca cancelada; 4 planos |
| `SIM-11052690` | Mz. K Lote 12 · Rincón del Sauce · La Tinguiña | propietario-02 | Vivienda | S/ 210,000 | Amarillo | Con observaciones | Revisado | Copropiedad; hipoteca vigente; faltan II.EE. e II.SS. |
| `SIM-11061555` | Mz. C Lote 3 · Mirador del Sol · Subtanjalla | propietario-01 | Vivienda | S/ 120,000 | Gris | No solicitada | Observado | Extracto parcial; demanda vigente (alerta prioritaria); sin planos |
| `SIM-11070419` | Mz. B Lote 9 · Villa del Algarrobo · Los Aquijes | propietario-02 | Vivienda | S/ 98,000 | Gris | No solicitada | Pendiente | Sin copia literal ni planos |
| `SIM-11075836` | Mz. G Lote 14 · Jardines del Pacae · Pueblo Nuevo | propietario-01 | Vivienda | S/ 165,000 | Rojo | No solicitada | Observado | Embargo vigente; 4 planos |
| `SIM-11081204` | Mz. B Lote 5 · Campiña del Olivar · Santiago | propietario-02 | Lote | S/ 75,000 | Verde | No solicitada | Revisado | Lote recién independizado; los planos no aplican |
| `SIM-11087751` | Mz. D Lote 22 · Los Tamarindos · Salas | propietario-01 | Vivienda (adobe) | S/ 88,000 | Amarillo | Con riesgo | Observado | Sucesión intestada; servidumbre de paso |
| `SIM-11093320` | Mz. A Lote 3 · Puente Molino · San José de los Molinos | propietario-02 | Vivienda | S/ 110,000 | Rojo | Solicitada (pendiente de asignación) | Pendiente | Bloqueo registral vigente |
| `SIM-11098467` | Mz. N Lote 8 · Mirador del Pallar · Pachacútec | propietario-01 | Vivienda | S/ 140,000 | Amarillo | En inspección (`especialista-01`) | Observado | Ampliación no declarada: plano de 98 m² contra 72 m² inscritos |
| `SIM-11104029` | Mz. M Lote 6 · Los Laureles del Sur · Ica | propietario-02 | Vivienda | S/ 260,000 | Amarillo | Favorable | Revisado | Reserva vial; plano de estructuras observado |

Los precios son referenciales y simulados. Solo Santiago es un lote: las otras nueve tienen declaratoria de fábrica o planos y
sus reglas lo exigen (ver `docs/decisiones.md`, D23).

Los casos 5 a 10 no forman parte del instrumento del estudio: las formas A y B usan solo los 4 primeros.

Las reglas (tabla borrador v0.4), el glosario y la redacción de los documentos están **pendientes de revisión especializada**.
Si tenías una base creada con una versión anterior a la v0.4, apaga el backend y borra `trustinmuebles-backend/data/`: los casos
cambiaron de código.

## Captación: partidas transcritas y simuladas

«Registrar partida» (`#/casos/nueva`, solo el revisor) es **la única forma de captar un caso desde la interfaz** (ETP-1). El
campo **origen** es obligatorio:

| Origen | Número | Fuente | `sintetico` |
|---|---|---|---|
| `TRANSCRITA_CONOCE_AQUI` | Sin el prefijo `SIM-` | «Conoce Aquí – SUNARP» | `false` |
| `SIMULADA_DEMOSTRACION` | Con el prefijo `SIM-` | «Partida simulada para demostración» | `true` |

El **precio referencial** es opcional (positivo, en soles) y se muestra en el catálogo. En ambos orígenes el servidor rechaza DNI,
estado civil y domicilios (`ProteccionDatos`), y los dos se pueden eliminar; los diez casos de demostración, no. No hay API de
SUNARP: una partida transcrita se consulta a mano y se pega el texto, sin nombres ni datos de personas naturales. Ver
`docs/guia-transcripcion.md` y `docs/decisiones.md` (D20 y D50). La partida transcrita es un desvío de RN-01 y PA2 que el asesor
debe aprobar.

## Pruebas

```powershell
cd trustinmuebles-backend; .\mvnw.cmd test     # 148 pruebas del backend
cd trustinmuebles; npx pnpm@9 test              # 64 pruebas del frontend
cd trustinmuebles; npx pnpm@9 build             # verifica tipos y compila
```

En bash: `./mvnw test` en lugar de `.\mvnw.cmd test`. Las pruebas del backend no necesitan `APP_SEED_PASSWORD`: usan la
contraseña de `src/test/resources/application-test.properties` y una base en memoria.

**Última ejecución real (30 de octubre de 2026, rama `mejoras-v0.7`):** backend 148 ejecutadas, 148 aprobadas, 0 fallos, 0
errores, 0 omitidas; frontend 11 archivos, 64 aprobadas; build correcto, con aviso de tamaño del JS principal. Las pruebas del
frontend son de funciones puras (permisos, navegación, filtros, totales del panel, historial y contacto), más una que renderiza el
pie: no prueban el dibujado de las demás pantallas.

**Recorrido de navegador de la v0.7: no ejecutado.** `docs/pruebas/recorrido-v06.mjs` está obsoleto y el recorrido nuevo se saltó
porque `puppeteer-core`, su herramienta, no estaba instalada en el equipo. Por lo mismo no hay capturas de la v0.7.

**Rendimiento (NF02):** la última medición es la del 17 de octubre de 2026 (20 de 20; máximo 93 ms, solo la API), anterior a la
v0.7. No se repitió sobre esta versión; se mide con `node scripts/medir-nf02.mjs`.

## Invariantes

| ID | Invariante | Prueba | Estado |
|---|---|---|---|
| I1 | Verde significa exactamente «Sin alertas en los campos evaluados»; no certifica saneamiento | `CatalogoYServiciosTest.verdeSignificaSinAlertas` | Probado |
| I2 | El indicador B nunca cambia el color del indicador A (RN-10) | `CatalogoYServiciosTest.informeConRiesgoNoCambiaElColor`, `InspeccionTest.flujoCompleto` | Probado |
| I3 | El checklist no cambia el color del indicador A | `CatalogoYServiciosTest.hrPuNoCambiaElColor`, `HistorialEvaluacionTest.operacionesSinRecalculo` | Probado |
| I4 | La autorización está en el servidor | `SeguridadTest`, `CaptacionPublicacionTest`, `CarteraTest.permisosPorRol` | Probado |
| I5 | Los módulos solo se comunican por sus APIs públicas | `ModularityTests` | Probado |
| I6 | El backend escucha solo en `127.0.0.1` | `ConfiguracionLocalTest.soloEscuchaEnLocal` | Probado en local. En Docker el puerto publicado queda ligado a `127.0.0.1` y el backend no publica puertos (configuración, no verificada en ejecución) |
| I7 | Los límites legales y el aviso de datos simulados están en el pie; el login comunica el entorno demostrativo | `limitesLegales.test.tsx` (renderiza el pie activo) | Probado el pie; el login, sin prueba automática ni verificación en navegador |
| I8 | El color de A cambia solo cuando el motor recalcula | `CaptacionPublicacionTest.publicarRojoNoCambiaElColor`, `autorizarNoCambiaElColor`, `CarteraTest.contactoSobreRojo` | Probado |
| I9 | Un plano o PDF no levanta un rojo por embargo, bloqueo o demanda | `HistorialEvaluacionTest.pdfNoLevantaElEmbargo` | Probado |
| I10 | Publicar y pedir contacto no dependen del color de A | `CaptacionPublicacionTest.publicarRojoNoCambiaElColor`, `CarteraTest.contactoSobreRojo` | Probado |
| I11 | Sin nombres, DNI ni teléfonos; contacto con motivos cerrados | `CuentasDemoTest.sinDatosPersonales`, `CarteraTest.motivoCerrado` | Probado |
| I12 | Historial de evaluaciones de solo adición | `HistorialEvaluacionTest.historialInmutable` | Probado |
| I13 | El propietario solo autoriza sus casos | `CaptacionPublicacionTest.autorizacionSoloDelPropietario`, `propietarioSoloLectura` | Probado |
| I14 | No se publica sin autorización vigente | `CaptacionPublicacionTest.sinAutorizacionNoSePublica`, `CicloCarteraTest` | Probado |

**I7:** el pie activo (`components/layout/Footer.tsx`, usado por `AppShell.tsx`) muestra los textos de `lib/limitesLegales.ts`: no
certifica saneamiento, no recomienda comprar, no reemplaza asesoría legal, datos y especialistas simulados, y verificación
jurídica con abogado o notario fuera del sistema. La pantalla de login no lleva pie: dice «Entorno académico demostrativo ·
Datos sintéticos». Cada resultado de A muestra «No certifica saneamiento ni recomienda comprar».

## Funcionalidades implementadas

- **Acceso por rol:** cinco roles, ingreso con código de cuenta, menú y guarda de rutas por rol; el servidor vuelve a comprobar
  cada permiso (403) y oculta los casos que no corresponden (404).
- **Catálogo (`#/casos`):** tarjetas con ilustración, tipo, distrito, área, precio referencial y los dos indicadores. Filtros
  combinables por tipo, indicador A e indicador B (incluido «con riesgo físico detectado»), resueltos en el servidor y
  reflejados en la URL. El comprador solo ve los publicados.
- **Indicador A:** semáforo automático por reglas versionadas (`v0.4`) sobre el rubro D, los datos mínimos y los 4 planos de la
  vivienda, con motivos, alertas y faltantes.
- **Expediente técnico de 4 planos** (arquitectura, estructuras, II.EE. e II.SS.) con lámina 2D referencial en PDF; el revisor
  puede subir el PDF real de cada plano.
- **Indicador B:** solo el comprador lo solicita (S/ 250.00 referencial, sin pago en línea); el especialista emite el informe
  en 6 pasos, firmado con los datos de su cuenta, también en PDF. Nunca cambia A.
- **Checklist** con la declaración jurada municipal (HR y PU) en los 10 casos; solo el revisor lo cambia.
- **Copia literal simulada en PDF, glosario cerrado, edición transaccional del revisor y partidas transcritas** sin datos
  personales.
- **v0.7, ciclo de cartera:**
  - Captación con origen obligatorio, código del propietario y precio opcional; el caso nace en borrador (ETP-1).
  - Autorización del propietario desde «Mis inmuebles» (`#/mis-inmuebles`) o el detalle; retirarla despublica (ETP-2).
  - Publicación y retiro por el gestor desde el panel «Publicación y autorización» del detalle (ETP-5).
  - Historial de evaluaciones de solo adición en el detalle, salvo para el comprador (ETP-4).
  - Solicitud de contacto del comprador con motivo de lista cerrada y bandeja del gestor con «Marcar atendida» (ETP-6).
  - Asignación obligatoria del especialista por el gestor en el panel de evaluación técnica del detalle; sin ella nadie registra
    avance ni emite (ETP-7).
  - Panel «Cartera» (`#/cartera`) con totales por color y publicación, faltantes, inspecciones, contactos y lista filtrable
    (ETP-8).
  - Texto fijo de la etapa 9 en el detalle (ETP-9).

El detalle por pantalla está en `docs/funcionalidades.md`; las pantallas de la v0.7 no se han verificado en un navegador.

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
(sección 1.7 del informe). Los filtros del catálogo son simples (tipo e indicadores), no búsquedas avanzadas. El comprador no
puede consultar después el estado de su solicitud de contacto (D46).

## Pendiente fuera del código

Revisión especializada del contenido, aprobación de D20 por el asesor, confirmación de los supuestos D32 a D49, recorrido de
navegador de la v0.7, piloto, reclutamiento, consentimientos y aplicación del estudio, fechas y presupuesto. Los materiales del
estudio (formas A y B, claves y bases vacías) están en la carpeta `estudio/`, que se mantiene **fuera de este repositorio** a
propósito. La lista completa está en la sección 14 del modelo de negocio.

## Uso local

El backend escucha solo en `127.0.0.1` y la interfaz solo en localhost. La configuración de seguridad es de desarrollo
local. No la uses en un servidor accesible desde la red (ver `docs/decisiones.md`, D9). En Docker, el puerto publicado queda ligado
a `127.0.0.1`.

La carpeta `data/` no se versiona, ni en la raíz ni en `trustinmuebles-backend/`. Los archivos de `data/` de la raíz que se
versionaron por error en `567cbfc` siguen en el historial de Git.
