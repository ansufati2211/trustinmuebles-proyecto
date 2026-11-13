# Trustinmuebles — portal inmobiliario con orientación documental precompra (versión 1.0.0)

## Versión 1.0.0 (entrega del 16/11/2026)

Un **portal público** donde el comprador encuentra los lotes y casas de la inmobiliaria sin irse a otra, y un **panel** donde
el asesor carga inmuebles (uno a uno o por CSV) y sigue a cada interesado como en un CRM. La organización de referencia
(LedCons) vende sobre todo lotes de proyectos de urbanización en Ica y algunos inmuebles de particulares. **No hay pagos en
línea.** Lo anterior (expedientes, indicador A, ruta de regularización, semáforo interno, documentos del lote, inspección B)
se conserva. El reporte de la versión está en [docs/REPORTE-v1.0.md](docs/REPORTE-v1.0.md).

| Para quién | Qué hay | Dónde |
|---|---|---|
| Visitante, sin cuenta | Catálogo unido de casos y lotes de proyecto con filtros y orden; asistente de búsqueda por reglas (sin IA); página de cada proyecto con **plano de lotes** SVG, hitos y documentos; ficha del lote con **usos que suelen permitirse** (orientativos); **solicitud de cita** (nombre de pila y un correo o celular, con consentimiento) | `#/inmuebles`, `#/proyectos/{c}`, `#/proyectos/{c}/lotes/{A-7}`, `#/inmuebles/{c}` |
| Asesor (`asesor-01`, rol ASESOR = revisor + gestor) | Registrar inmuebles (de la inmobiliaria o de un particular), cargar lotes por **CSV** con vista previa, publicar, bandeja de **interesados** con etapas, notas, agenda de citas y demanda | Registrar, Proyectos, Expedientes, Cartera, Interesados |
| Equipo (revisor, gestor, especialistas, propietarios) | Lo de la v0.9: expedientes, indicador A, planos y documentos del lote, inspección B, autorización y publicación | Igual que antes |

**Lo que no cambia:** el color del indicador A lo calculan las reglas (`v0.5`); publicar no cambia A; B no cambia A; no se
publica sin autorización vigente registrada; el semáforo de gestión es interno; ningún texto promete compra segura ni
saneamiento, y ningún PDF se presenta como emitido por SUNARP, una municipalidad o un colegio profesional. Sin sesión, la
partida se muestra parcialmente oculta (`1105••••`) en la ficha, la tarjeta, el proyecto y sus PDF.

**Datos precargados** (para que la demo funcione sin datos reales): 4 proyectos (Altos de Ventisca 56 lotes, Rinconada del
Lúcumo 44, Terrazas de Sauzal 68, Horizonte de Los Aquijes sin lotes para cargar el CSV del kit), los 12 casos de antes
más las 4 partidas matrices, 15 interesados con correos `@example.com` y 4 citas en los próximos 7 días. Titulares
«Persona natural (datos reservados)» o empresas inventadas; sin DNI, celulares ni colegiaturas.

**Cuentas (9):** las 8 de abajo más `asesor-01` (ASESOR). Contraseña: la de `APP_SEED_PASSWORD`.

**Demo de 15 minutos:** [docs/demo/GUION-DEMO.md](docs/demo/GUION-DEMO.md) con el [kit](docs/demo/kit/LEEME-KIT.md).
Antes: `scripts/reiniciar-demo.ps1`, arrancar backend e interfaz (abajo) y
`APP_SEED_PASSWORD=<clave> node scripts/preparar-demo.mjs` (verifica por la API la precarga y completa lo que falte, sin
borrar nada). Recorrido automático: `node docs/pruebas/uso-v10/recorrido-v10.mjs` (arranca el jar con una base nueva fuera
del repositorio, la interfaz y Chrome, y apaga todo al final): 13 de 13 pasos el 13/11/2026.

**Pruebas de la 1.0.0:** backend **318** (antes de la etapa 7, 312), interfaz **276** en 30 archivos (antes, 262). La API
nueva está en [docs/api.md](docs/api.md) («Versión 1.0.0»); las decisiones, en [docs/decisiones.md](docs/decisiones.md)
(D59 a D69).

**Versión:** `1.0.0` en `trustinmuebles-backend/pom.xml`, `trustinmuebles/package.json`, el pie del sitio y
`GET /api/v1/publico/sitio`.

---

## Descripción de la v0.9 (se conserva como referencia)


> **Modelo de negocio implementado, comprobado contra el código y las pruebas:**
> [docs/MODELO-NEGOCIO-IMPLEMENTADO.md](docs/MODELO-NEGOCIO-IMPLEMENTADO.md). Este LEEME usa sus mismos identificadores
> (ACT, ETP, RN, I). El estado de esta versión, con sus pruebas y observaciones, está en
> [docs/REPORTE-v0.9-real.md](docs/REPORTE-v0.9-real.md).

Proyecto del curso Diseño e Implementación de Arquitectura Empresarial. Trustinmuebles es el sistema de transparencia
precompra de **una sola inmobiliaria de Ica**, que carga a mano su propia cartera (sin scraping de otros portales ni APIs
públicas, que SUNARP no ofrece). Muestra partidas registrales de lotes y viviendas urbanas, con una copia informativa en PDF,
explica sus términos y señala qué información falta. **No certifica saneamiento, no recomienda comprar, no consulta fuentes
oficiales en línea y no reemplaza a un abogado o notario.**

**Versión actual.** `main` en `d7803f8` («Version real», 08/11/2026), sobre `7fc4a54` (v0.9: lotes de la SBN y documentos del
lote, reglas `v0.5`) y `43cd45d` (fotos de las viviendas). El número de versión de los paquetes **no cambió**: sigue en `0.8.0` en
el backend (`trustinmuebles-backend/pom.xml`) y en la interfaz (`trustinmuebles/package.json`). Qué cambió en cada commit:
[docs/REPORTE-v0.9-real.md](docs/REPORTE-v0.9-real.md), sección 1.

**Cómo se presenta ahora el contenido (d7803f8).** Los diez casos de Ica perdieron el prefijo `SIM-` y la interfaz, los PDF y los
especialistas dejaron de rotularse como simulados o ficticios. **Los datos siguen siendo los mismos de la demostración**: las
partidas de Ica, sus titulares y los perfiles de los especialistas fueron redactados por el equipo; solo los dos lotes de la SBN
provienen de una fuente pública. Ver las observaciones de [docs/REPORTE-v0.9-real.md](docs/REPORTE-v0.9-real.md).

**Organización de referencia del caso:** LedCons, sin acta ni acuerdo formal acreditado. Los datos del sistema no provienen de
esa organización.

## Modelo de negocio

**Quién paga (hipótesis):** la inmobiliaria. **Quién usa:** el comprador y, dentro de la inmobiliaria, el revisor, el gestor
(asesor comercial) y los especialistas; el propietario autoriza su caso.

**Problema que reduce:** el comprador suele decidir sin entender la partida registral ni saber qué documentos faltan; el
sistema ordena esa información, la explica y señala los vacíos.

| | Indicador A | Indicador B |
|---|---|---|
| Servicio | Pre-evaluación documental automática por reglas (`v0.5`, borrador pendiente de revisión especializada) | Evaluación técnica presencial de 6 pasos |
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
| ACT-02 | Revisor | REVISOR | Registra la captación indicando su origen y al propietario, mantiene partidas, planos, documentos del lote y checklist, y subsana faltantes |
| ACT-03 | Gestor (asesor comercial) | GESTOR | Publica y retira casos, atiende contactos, asigna inspecciones y sigue la cartera en su panel |
| ACT-04 | Especialista | ESPECIALISTA | Registra el avance y emite el informe técnico, solo si el gestor le asignó la inspección |
| ACT-05 | Propietario | PROPIETARIO | Consulta sus casos y otorga o retira su autorización. No edita ni sube documentos |
| ACT-06 | Abogado o notario | Externo | Verificación jurídica antes de comprar |
| ACT-07 | SUNARP (Conoce Aquí, Visor BGR) | Externo | Fuente consultada a mano; el sistema solo abre enlaces |
| ACT-08 | Municipalidad | Externo | Fuente consultada a mano (HR y PU, zonificación) |
| ACT-09 | SBN | Externo | Fuente pública de los dos lotes de la subasta (bases y plano perimétrico); el sistema solo enlaza |

### Flujo de nueve etapas

«Implementado» significa que existe en el backend con pruebas automáticas y en la interfaz con pruebas de sus funciones
puras. Las pantallas de las etapas 1 a 8 se recorrieron en Chrome con las 8 cuentas el 9 de noviembre de 2026 (ver «Pruebas»).
El detalle (pantalla, endpoint y prueba de cada etapa) está en la sección 4 del modelo de negocio.

| ID | Etapa | Quién | Estado |
|---|---|---|---|
| ETP-1 | Captación: el propietario **inicia el proceso fuera del sistema** y el revisor registra el caso en «Registrar partida», con el código del propietario; nace en borrador y el indicador A se calcula en ese momento. El revisor elige el **origen**: «Transcrita de Conoce Aquí (SUNARP)» o «Registro interno de cartera» (este último sigue exigiendo el prefijo `SIM-`) y puede indicar un precio referencial | Propietario, revisor | Implementado |
| ETP-2 | Autorización: el propietario la confirma con su cuenta. **A ya está calculado antes de autorizar** y autorizar no lo cambia | Propietario | Implementado |
| ETP-3 | Pre-evaluación documental automática (indicador A), con los planos de una vivienda y los documentos de un lote | Motor de reglas | Implementado |
| ETP-4 | Subsanación: el revisor incorpora documentos faltantes, el motor recalcula y el historial lo registra | Revisor | Implementado |
| ETP-5 | Publicación, solo con autorización vigente. El botón «Publicar» está en el **detalle del caso** | Gestor | Implementado |
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
- Compradores y propietarios se identifican por su código de cuenta y el contacto usa motivos de una lista cerrada (I11). Los
  asientos de las partidas de demostración sí nombran titulares (ver el reporte, observaciones).
- El historial de evaluaciones es de solo adición (I12) y el propietario solo autoriza sus propios casos (I13).
- La autorización la valida el servidor (I4); la interfaz solo oculta lo que el rol no puede hacer.
- El semáforo de gestión es interno (solo gestor y revisor), no cambia A ni B, no se muestra al comprador, al propietario ni al
  especialista y no bloquea la publicación (I15).
- Un plano o un documento del lote solo queda «presentado» u «observado» con su PDF (subido o generado por el sistema).

### Novedades de la versión actual

| Commit | Qué cambia |
|---|---|
| `7fc4a54` v0.9 | **Dos lotes de la II Subasta Pública 2026 de la SBN** (`11045763` Huarmey y `80194645` Supe) de `propietario-03`, con su plano perimétrico oficial, precio base en US$, nota del precio y fuente con enlace (D57). **Documentos del lote** como requisitos del indicador A (D58, V15): plano perimétrico y memoria descriptiva (gris si faltan), certificado de zonificación (amarillo, **RV-07**) y tasación (informativa). Reglas `v0.4` → **`v0.5`**. Panel «Documentos del lote», visor de PDF compartido y precio con su moneda |
| `43cd45d` | Fotos referenciales de Unsplash para las 9 viviendas, con el rótulo «Imagen referencial del prototipo» |
| `d7803f8` «Version real» | Los 10 casos de Ica pasan de `SIM-1104…` a `1104…` (`CasosSeeder` renombra los de una base anterior). Fotos reemplazadas (Wikimedia Commons y otras fuentes) y 3 fotos nuevas de lotes. Especialistas con nombre y colegiatura sin `SIM-` (V16). Copia literal, informe técnico y lámina **sin marca de agua** y con textos «referencial» en lugar de «simulado» o «ficticio». Login **sin tarjetas de cuentas**. Textos de la landing, el pie y el detalle sin «demostración». Docker: CORS con el dominio `https://trust.aurorabeauty.site` y el flujo de imágenes también **en cada push a `main`** |

**Pendiente del equipo (D57):** consultar las partidas de los lotes de la SBN en Conoce Aquí y transcribirlas (hoy no tienen
asientos) y pedir sus memorias descriptivas.

Las novedades de la v0.8 (PDF obligatorio de cada plano, ruta de regularización, panel por tipo de alerta, semáforo de gestión,
resaltado del color de A) siguen vigentes; ver D52 a D56 en `docs/decisiones.md` y las secciones 4 y 5 del modelo de negocio.

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

**Limitaciones:** MVP académico. Las partidas de Ica y los especialistas son contenido redactado por el equipo; las reglas están
pendientes de revisión especializada.

El producto se llama Trustinmuebles en el código, en la documentación y en el informe (ver `docs/decisiones.md`, D2).

## Estructura

- `trustinmuebles-backend/` — API de Spring Boot 4 con Java 21, modular con Spring Modulith en 9 módulos: `identidad`,
  `expediente`, `clasificacion`, `inspeccion`, `cartera`, `checklist`, `orientacion`, `almacenamiento` y `shared`. Ver su README.
- `trustinmuebles/` — interfaz de React 19 con Vite. Las 12 tarjetas del catálogo muestran una fotografía local de
  `public/img/casas/` con el rótulo «Imagen referencial» (créditos y licencias en `public/img/casas/CREDITOS.md`); las láminas
  usan dibujos propios. La landing y el login usan fotografías locales de `public/img/`. La credencial del especialista usa sus
  iniciales.

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

**Git Bash, bash, zsh o fish:**

```bash
# Terminal 1: backend en http://127.0.0.1:8080  (Swagger: /swagger-ui.html)
cd trustinmuebles-backend
env APP_SEED_PASSWORD='elige-una-clave-de-prueba' ./mvnw spring-boot:run

# Terminal 2: interfaz en http://localhost:5173
cd trustinmuebles
npx pnpm@9 install
npx pnpm@9 dev
```

Si falta `APP_SEED_PASSWORD` y hay cuentas por crear, el backend se detiene con un mensaje que lo explica. Para probar con una
base aparte, sin tocar `trustinmuebles-backend/data/`, define también `SPRING_DATASOURCE_URL` (con la URL H2 de
`application.properties` apuntando a otra carpeta) y `APP_STORAGE_PATH`.

### Docker y despliegue en la nube (no verificado en esta revisión)

- `docker-compose.yml` (pensado para Portainer) levanta `backend` y `frontend`. Exige `APP_SEED_PASSWORD`, `APP_JWT_SECRET` y
  `APP_STORAGE_KEY`. El frontend se publica en `127.0.0.1:${FRONTEND_PORT:-8081}` y el backend no publica puertos; dentro del
  contenedor escucha en `0.0.0.0`.
- **CORS:** por defecto `APP_CORS_ALLOWED_ORIGINS` admite `https://trust.aurorabeauty.site` y `localhost`/`127.0.0.1` en los
  puertos 8085, 8081 y 5173 (en `docker-compose.yml` y en el `Dockerfile` del backend). El dominio indica una demo publicada en
  internet, presumiblemente detrás de un proxy inverso; ese proxy no está en el repositorio.
- **GitHub Actions** (`.github/workflows/docker.yml`): construye y publica `ghcr.io/ansufati2211/trustinmuebles-backend` y
  `…-frontend` (`latest` y el SHA) **en cada push a `main`** y también a mano (`workflow_dispatch`). El comentario de la primera
  línea del flujo todavía dice «solo cuando se lanza a mano».
- Ni las imágenes ni el dominio se probaron en esta revisión. Ver I6 y D9 en «Uso local».

## Cuentas de prueba (8)

El login ya **no muestra tarjetas de cuentas**: se escribe el código de cuenta y la contraseña. Todas usan la contraseña de
`APP_SEED_PASSWORD`.

| Cuenta | Rol | Puede |
|---|---|---|
| `comprador-01` | COMPRADOR | Consultar el **catálogo de casos publicados** y su detalle, pedir contacto y **solicitar la inspección técnica** (solo este rol) |
| `revisor-01` | REVISOR | Consultar todos los casos, editar expedientes, planos y documentos del lote, cambiar el checklist, subir PDF y registrar o eliminar partidas captadas |
| `especialista-01` | ESPECIALISTA | Consultar todos los casos y registrar el avance o emitir el informe de las inspecciones que el gestor le asignó. No edita partidas |
| `especialista-02` | ESPECIALISTA | Igual que `especialista-01` |
| `gestor-01` | GESTOR (asesor comercial) | Publicar y retirar casos, atender contactos, asignar inspecciones y ver el panel de cartera |
| `propietario-01`, `propietario-02` | PROPIETARIO | Consultar solo sus casos (también en borrador) y otorgar o retirar su autorización |
| `propietario-03` | PROPIETARIO | Igual; es la cuenta de los dos lotes de la SBN. No representa a la SBN |

Cada rol tiene su menú: el comprador y el especialista ven «Expedientes»; el revisor agrega «Registrar partida»; el gestor,
«Cartera»; el propietario ve solo «Mis inmuebles».

**Especialistas** (`DemoUsuariosSeeder`, V16 en bases anteriores). El servidor toma estos datos de la cuenta y no del formulario
(M8):

| Cuenta | Nombre con el que firma | Especialidad | Colegiatura |
|---|---|---|---|
| `especialista-01` | Ing. Carlos Alberto Mendoza Quispe | Ingeniero Civil | CIP N.° 248910 |
| `especialista-02` | Arq. Valeria Sofía Paredes Rojas | Arquitecto | CAP N.° 19432 |

Desde `d7803f8` la credencial y el PDF del informe **ya no dicen** «Perfil ficticio de demostración». Son perfiles redactados
por el equipo; que esos nombres y números no correspondan a profesionales colegiados reales **no se verificó** (ver el reporte).

Al arrancar se crea cada cuenta que falte, también en una base ya creada; las que existen no se tocan: si cambias la variable
con una base ya creada, su contraseña no cambia. Para empezar de cero, apaga el backend y borra `trustinmuebles-backend/data/`
(o usa `scripts/reiniciar-demo.ps1`). Una base anterior se migra al arrancar (hasta V16) y `CasosSeeder` renombra sus casos
`SIM-…` a los códigos nuevos. No hay registro abierto.

## Casos cargados (12)

Diez casos de Ica (9 viviendas y el lote de Santiago) y dos lotes de la SBN. Todos nacen **publicados y autorizados**. Solo la
inspección en curso de `11098467` tiene especialista asignado (`especialista-01`); `11093320` queda solicitada y pendiente de
asignación. Los informes emitidos de la semilla los firma `especialista-01`. Colores comprobados en el recorrido del 9 de
noviembre de 2026.

| Partida | Predio | Propietario | Tipo | Precio ref. | A | B | Qué muestra |
|---|---|---|---|---|---|---|---|
| `11045763` | Parcela 2 · Playa La Pocita · Huarmey, Áncash | propietario-03 | Lote (SBN) | US$ 90,096 | Gris | No solicitada | Partida por transcribir; plano perimétrico oficial; faltan memoria (gris) y zonificación (RV-07) |
| `11048217` | Mz. F Lote 7 · Santa Elvira · Parcona | propietario-01 | Vivienda | S/ 185,000 | Verde | Favorable | Una titular; hipoteca cancelada; 4 planos |
| `11052690` | Mz. K Lote 12 · Rincón del Sauce · La Tinguiña | propietario-02 | Vivienda | S/ 210,000 | Amarillo | Con observaciones | Copropiedad; hipoteca vigente; faltan II.EE. e II.SS. |
| `11061555` | Mz. C Lote 3 · Mirador del Sol · Subtanjalla | propietario-01 | Vivienda | S/ 120,000 | Gris | No solicitada | Extracto parcial; demanda vigente; sin planos |
| `11070419` | Mz. B Lote 9 · Villa del Algarrobo · Los Aquijes | propietario-02 | Vivienda | S/ 98,000 | Gris | No solicitada | Sin copia literal ni planos |
| `11075836` | Mz. G Lote 14 · Jardines del Pacae · Pueblo Nuevo | propietario-01 | Vivienda | S/ 165,000 | Rojo | No solicitada | Embargo vigente; 4 planos |
| `11081204` | Mz. B Lote 5 · Campiña del Olivar · Santiago | propietario-02 | Lote | S/ 75,000 | Verde | No solicitada | Los 4 documentos del lote (generados); los planos no aplican |
| `11087751` | Mz. D Lote 22 · Los Tamarindos · Salas | propietario-01 | Vivienda (adobe) | S/ 88,000 | Amarillo | Con riesgo | Sucesión intestada; servidumbre de paso |
| `11093320` | Mz. A Lote 3 · Puente Molino · San José de los Molinos | propietario-02 | Vivienda | S/ 110,000 | Rojo | Solicitada (pendiente de asignación) | Bloqueo registral vigente |
| `11098467` | Mz. N Lote 8 · Mirador del Pallar · Pachacútec | propietario-01 | Vivienda | S/ 140,000 | Amarillo | En inspección (`especialista-01`) | Ampliación no declarada: plano de 98 m² contra 72 m² inscritos |
| `11104029` | Mz. M Lote 6 · Los Laureles del Sur · Ica | propietario-02 | Vivienda | S/ 260,000 | Amarillo | Favorable | Reserva vial; plano de estructuras observado |
| `80194645` | Parcela 2 · Cerro Purmacana · Supe | propietario-03 | Lote (SBN) | US$ 16,802 | Gris | No solicitada | Igual que Huarmey |

**Lotes de la SBN.** Precio base de la II Subasta Pública 2026 (venta ad corpus), con la nota «Las ofertas se presentan según
las bases; no es una oferta de la inmobiliaria» y la fuente «SBN – II Subasta Pública 2026 (Anexo 1 de las bases y plano
perimétrico oficial)», enlazada a `https://www.sbn.gob.pe/publicacion_subastas_detalles.php?item=38`. El plano perimétrico es el
PDF oficial y se abre en el visor del expediente.

**Documentos del lote** (los tres lotes): plano perimétrico y de ubicación, memoria descriptiva, certificado de zonificación y
vías, y tasación. Santiago trae los cuatro generados por el sistema (sin sello ni firma) y sigue en verde.

**Fotos.** Las 12 tarjetas llevan foto con el rótulo «Imagen referencial» (no son fotos del inmueble del expediente). Según
`CREDITOS.md`, 7 vienen de Wikimedia Commons con licencia CC (CC0, CC BY o CC BY-SA) y 5 (`casa-3`, `casa-6`, `casa-7`,
`casa-9` y `lote-huarmey`) son de anuncios o sitios comerciales con la licencia «Referencial académico», que no es una licencia
libre. `CREDITOS.md` todavía cita los casos con el prefijo `SIM-`.

Los casos de Ica 5 a 10 no forman parte del instrumento del estudio: las formas A y B usan solo los 4 primeros.

Las reglas (tabla borrador `v0.5`, 10 reglas), el glosario (57 términos) y la redacción de los documentos están **pendientes de
revisión especializada**.

## Captación: origen de la partida

«Registrar partida» (`#/casos/nueva`, solo el revisor) es **la única forma de captar un caso desde la interfaz** (ETP-1). El
campo **origen** es obligatorio:

| Origen en pantalla | Valor | Número | Fuente guardada | `sintetico` |
|---|---|---|---|---|
| «Transcrita de Conoce Aquí (SUNARP)» | `TRANSCRITA_CONOCE_AQUI` | Ocho dígitos, con una letra inicial opcional, sin `SIM-` | «Conoce Aquí – SUNARP» | `false` |
| «Registro interno de cartera» | `SIMULADA_DEMOSTRACION` | **Con el prefijo `SIM-`** (`SIM-` + ocho dígitos) | «Partida simulada para demostración» | `true` |

Con «Registro interno de cartera», el campo dice «Código interno de ocho dígitos.» si falta el prefijo, pero la validación de la
interfaz y del servidor sigue exigiendo `SIM-`. El historial rotula la primera evaluación como «Partida interna incorporada».

El **precio referencial** es opcional (positivo, en soles) y se muestra en el catálogo. En ambos orígenes el servidor rechaza DNI,
estado civil y domicilios (`ProteccionDatos`). No hay API de SUNARP: una partida transcrita se consulta a mano y se pega el
texto. Ver `docs/guia-transcripcion.md` y `docs/decisiones.md` (D20, D50 y D57). Las partidas transcritas y los lotes de la SBN son
un desvío de RN-01 y PA2 que el asesor debe aprobar.

## Pruebas

```powershell
cd trustinmuebles-backend; .\mvnw.cmd verify    # 200 pruebas del backend
cd trustinmuebles; npx pnpm@9 test               # 85 pruebas del frontend
cd trustinmuebles; npx pnpm@9 build              # verifica tipos y compila
```

En Git Bash: `./mvnw verify` en lugar de `.\mvnw.cmd verify`. Las pruebas del backend no necesitan `APP_SEED_PASSWORD`: usan la
contraseña de `src/test/resources/application-test.properties` y una base en memoria.

**Última ejecución real (9 de noviembre de 2026, sobre `d7803f8`, rama `docs-v0.9-real`):** backend **200 ejecutadas, 200
aprobadas**, 0 fallos, 0 errores, 0 omitidas (32 clases), `BUILD SUCCESS`; frontend **16 archivos, 85 aprobadas**; build
correcto, con el aviso de tamaño del JS principal (618 kB). Coincide con lo anunciado en `7fc4a54`. Las pruebas del frontend son
de funciones puras, más una que renderiza el pie. **Ojo:** `d7803f8` cambió aserciones de 12 archivos de prueba (10 del backend y 2 de la interfaz) para que acepten
los textos nuevos (por ejemplo, ya no exigen la marca de agua); ver el reporte.

**Recorrido de uso de la versión actual:** **27 de 27 pasos correctos** con las 8 cuentas en Chrome, el 9 de noviembre de 2026,
sobre una base nueva fuera del repositorio, sin errores de consola ni respuestas 409 o 500. Script en
`docs/pruebas/uso-v09/recorrido-v09.mjs`, capturas en `docs/pruebas/uso-v09/capturas/` y datos en
`docs/pruebas/uso-v09/RESULTADO-recorrido-v09.json`. Los recorridos anteriores (`recorrido-v08.mjs`, `recorrido-v07.mjs`) usan los
códigos `SIM-…` y quedan como registro histórico.

**Rendimiento (NF02):** 20 de 20 en 2 s o menos el 30 de octubre de 2026 (mediana 25,2 ms, máximo 54,3 ms, solo la API). No se
volvió a medir en esta versión. Se mide con `node scripts/medir-nf02.mjs`.

## Invariantes

| ID | Invariante | Prueba | Estado |
|---|---|---|---|
| I1 | Verde significa exactamente «Sin alertas en los campos evaluados»; no certifica saneamiento | `CatalogoYServiciosTest.verdeSignificaSinAlertas` | Probado |
| I2 | El indicador B nunca cambia el color del indicador A (RN-10) | `CatalogoYServiciosTest.informeConRiesgoNoCambiaElColor`, `InspeccionTest.flujoCompleto` | Probado |
| I3 | El checklist no cambia el color del indicador A | `CatalogoYServiciosTest.hrPuNoCambiaElColor`, `HistorialEvaluacionTest.operacionesSinRecalculo` | Probado |
| I4 | La autorización está en el servidor | `SeguridadTest`, `CaptacionPublicacionTest`, `CarteraTest.permisosPorRol` | Probado |
| I5 | Los módulos solo se comunican por sus APIs públicas | `ModularityTests` | Probado |
| I6 | El backend escucha solo en `127.0.0.1` | `ConfiguracionLocalTest.soloEscuchaEnLocal` | Probado en local. El CORS por defecto incluye un dominio público (`trust.aurorabeauty.site`): la demo en la nube contradice el alcance «solo local» de I6 y D9 (ver el reporte) |
| I7 | Los límites legales están en el pie | `limitesLegales.test.tsx` (renderiza el pie activo) | Probado el pie y visto en el navegador. El pie y el login **ya no dicen** que los datos son simulados ni que es un entorno demostrativo |
| I8 | El color de A cambia solo cuando el motor recalcula | `CaptacionPublicacionTest.publicarRojoNoCambiaElColor`, `autorizarNoCambiaElColor`, `CarteraTest.contactoSobreRojo` | Probado |
| I9 | Un plano o PDF no levanta un rojo por embargo, bloqueo o demanda | `HistorialEvaluacionTest.pdfNoLevantaElEmbargo` | Probado |
| I10 | Publicar y pedir contacto no dependen del color de A | `CaptacionPublicacionTest.publicarRojoNoCambiaElColor`, `CarteraTest.contactoSobreRojo` | Probado |
| I11 | Compradores y propietarios sin nombres, DNI ni teléfonos; contacto con motivos cerrados | `CuentasDemoTest.sinDatosPersonales`, `CarteraTest.motivoCerrado` | Probado para las cuentas. Los asientos de los casos de Ica nombran titulares personas naturales |
| I12 | Historial de evaluaciones de solo adición | `HistorialEvaluacionTest.historialInmutable` | Probado |
| I13 | El propietario solo autoriza sus casos | `CaptacionPublicacionTest.autorizacionSoloDelPropietario`, `propietarioSoloLectura` | Probado |
| I14 | No se publica sin autorización vigente | `CaptacionPublicacionTest.sinAutorizacionNoSePublica`, `CicloCarteraTest` | Probado |
| I15 | El semáforo de gestión es interno (solo GESTOR y REVISOR): no cambia A ni B, no se muestra al comprador, al propietario ni al especialista y no bloquea la publicación (D54) | `GestionInmobiliariaTest.soloGestorYRevisorVenElCampo`, `permisosDeDecision`, `decisionNoCambiaAniB`, `decisionNoBloqueaPublicar`; `gestion.test.ts` | Probado |

**Textos actuales comprobados en el navegador (9/11/2026).**
- Pie (`lib/limitesLegales.ts`, en todas las pantallas con sesión y en la landing): «No certifica saneamiento.», «No recomienda
  comprar.», «No reemplaza asesoría legal.», «La información presentada es referencial y se basa en los documentos registrados
  en cada expediente.» y «La verificación jurídica con abogado o notario se realiza fuera del sistema.». Además: «Catálogo
  verificado activo» e «Indicador B · En Campo: Inspección presencial por un especialista colegiado de la inmobiliaria.».
- Login: «Iniciar sesión», «Ingresa con tu código de cuenta y contraseña para consultar los expedientes.» y «Plataforma de
  transparencia inmobiliaria · Acceso seguro». Ya no dice «Entorno académico demostrativo · Datos sintéticos».
- Landing: «12 expedientes en el catálogo», «plataforma tecnológica privada (PropTech) diseñada para transparentar…»,
  «Especialista colegiado de la inmobiliaria», «El catálogo reúne 12 lotes y viviendas verificados en nuestro portafolio» e
  «Inicia sesión con tu cuenta asignada…». No dice «MVP académico», «ficticio» ni «simulado».
- El aviso superior «Aviso legal: …» (`components/base/TopBar.tsx`) existe en el código pero ninguna pantalla lo usa.
- Cada resultado de A sigue mostrando «No certifica saneamiento ni recomienda comprar».

## Funcionalidades implementadas

- **Acceso por rol:** cinco roles y ocho cuentas, ingreso escribiendo el código de cuenta, menú y guarda de rutas por rol; el
  servidor vuelve a comprobar cada permiso (403) y oculta los casos que no corresponden (404).
- **Catálogo (`#/casos`):** tarjetas con foto referencial, tipo, distrito, área, precio en su moneda (S/ o US$) y los dos
  indicadores, resaltadas por el color de A. Filtros combinables por tipo, indicador A, indicador B y tipo de alerta, resueltos en
  el servidor y reflejados en la URL. El comprador solo ve los publicados.
- **Indicador A:** semáforo automático por reglas versionadas (`v0.5`) sobre el rubro D, los datos mínimos, los 4 planos de una
  vivienda y los 4 documentos de un lote, con motivos, alertas y faltantes.
- **Expediente técnico de 4 planos** con lámina 2D referencial en PDF; el revisor sube el PDF real de cada plano.
- **Documentos del lote** (v0.9): panel con «Documentos presentados N de 4», visor de PDF dentro del expediente y subida por el
  revisor.
- **Indicador B:** solo el comprador lo solicita (S/ 250.00 referencial, sin pago en línea); el especialista asignado emite el
  informe en 6 pasos, firmado con los datos de su cuenta, también en PDF. Nunca cambia A.
- **Checklist** con la declaración jurada municipal (HR y PU); solo el revisor lo cambia.
- **Copia literal en PDF** (copia informativa del expediente; en los lotes de la SBN, transcripción referencial), glosario
  cerrado, edición transaccional del revisor y partidas captadas.
- **Ciclo de cartera (v0.7):** captación en borrador, autorización del propietario desde «Mis inmuebles», publicación y retiro
  por el gestor, historial de solo adición, contacto con motivo cerrado, asignación obligatoria del especialista, panel
  «Cartera» y texto fijo de la etapa 9.
- **v0.8:** PDF obligatorio por plano (hasta 25 MB, optimizado si pasa de 5 MB, máximo guardado 10 MB), ruta de regularización,
  panel del gestor por tipo de alerta, esfuerzo y estado de gestión, decisión de captación con confirmación al publicar y
  resaltado del color de A.
- **v0.9:** lotes de la SBN con precio en US$, nota y fuente; documentos del lote y regla RV-07; cuenta `propietario-03`.

El detalle por pantalla está en `docs/funcionalidades.md` (redactado para la v0.8; no se actualizó en esta revisión).

## Fuentes de información

| Fuentes gratuitas | Aportadas por el propietario o de pago |
|---|---|
| Conoce Aquí (SUNARP): texto de la partida, que el revisor transcribe | Copia literal certificada (SUNARP, con costo) |
| Visor Catastral BGR (SUNARP): ubicación gráfica, solo enlazada | Planos de las 4 especialidades |
| SBN: bases de la subasta y plano perimétrico de los dos lotes, enlazados | Memoria descriptiva, certificado de zonificación y tasación de un lote |
| | Declaración jurada municipal (HR y PU) |
| | Inspección presencial del especialista (costo referencial) |

Sin scraping de portales ni APIs inexistentes: SUNARP no ofrece una API pública de partidas y copiar otros portales incumple
sus condiciones de uso.

## Qué no incluye

Integraciones estatales, scraping de portales, OCR, inteligencia artificial o visión artificial, autenticidad documental,
dictámenes jurídicos, pagos en línea, contratos, firmas, agenda de visitas, tours, posventa y reportes descargables
(sección 1.7 del informe). Los filtros del catálogo son simples, no búsquedas avanzadas. El comprador no puede consultar después
el estado de su solicitud de contacto (D46).

## Pendiente fuera del código

Revisión especializada del contenido, aprobación de D20 y D57 por el asesor, confirmación de los supuestos D32 a D49, decisión
sobre las observaciones de [docs/REPORTE-v0.9-real.md](docs/REPORTE-v0.9-real.md), piloto, reclutamiento, consentimientos y
aplicación del estudio, fechas y presupuesto. Los materiales del estudio (formas A y B, claves y bases vacías) están en la
carpeta `estudio/`, que se mantiene **fuera de este repositorio** a propósito. La lista completa está en la sección 14 del modelo
de negocio.

## Uso local

En local, el backend escucha solo en `127.0.0.1` y la interfaz solo en localhost. La configuración de seguridad es de desarrollo
local; `docs/decisiones.md` (D9) pide no usarla en un servidor accesible desde la red. La configuración actual de Docker incluye
un dominio público en CORS y un flujo que publica las imágenes en cada push a `main`: si la demo está en internet, eso es un
cambio de alcance frente a D9 que el equipo debe documentar (ver el reporte).

La carpeta `data/` no se versiona, ni en la raíz ni en `trustinmuebles-backend/`. Los archivos de `data/` de la raíz que se
versionaron por error en `567cbfc` siguen en el historial de Git.
