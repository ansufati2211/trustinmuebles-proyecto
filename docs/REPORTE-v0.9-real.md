# Reporte de la versión actual de `main` (v0.9 + fotos + «Version real»)

**Para:** el profesor del curso y el equipo. **Fecha:** 9 de noviembre de 2026. **Rama:** `docs-v0.9-real`, creada desde
`origin/main` en `d7803f8`. **Alcance:** documentar y probar lo que hay. **No es una corrección:** no se modificó código, pruebas,
migraciones, casos, fotos, Docker ni workflows; las observaciones de la sección 4 quedan para revisarlas después.

## 1. Qué cambió en los tres commits

### `7fc4a54` — v0.9: dos lotes reales de la subasta SBN y documentos del lote (reglas v0.5)

| Área | Cambio |
|---|---|
| Código | Documentos del lote como requisitos del indicador A: `DocumentoLote`, `DocumentoDelLote`, `TipoCondicion` y `MotorClasificacion` (gris sin plano perimétrico o memoria descriptiva; amarillo **RV-07** sin certificado de zonificación; tasación informativa; RV-06 si un documento está observado). Endpoints `GET`/`POST /casos/{c}/documentos-lote/{tipo}/documento`. Precio con `moneda`, `precioNota` y `fuenteUrl` |
| Datos | Migración **V15** (`documento_lote`, moneda, nota y fuente del precio). Contenido `v0.4` → **`v0.5`** (reglas, rutas, glosario, gestión). Casos nuevos `11045763` (Huarmey) y `80194645` (Supe), transcritos de la II Subasta Pública 2026 de la SBN, con su plano perimétrico oficial en PDF y precio en US$. Cuenta `propietario-03`. Santiago recibe sus cuatro documentos |
| PDF | `DocumentoLotePdf` genera los documentos referenciales de un lote (llama a la marca de agua de `LaminaPdf`) |
| Interfaz | Panel `DocumentosDelLote` («Documentos presentados N de 4»), `VisorPdf` compartido, precio con su moneda (`lib/formato.ts`), etiqueta «Lote o terreno» |
| Pruebas | Nuevas: `DocumentosLoteApiTest` (5), `MotorDocumentosLoteTest` (9) y casos de `formato.test.ts`. Ajustes en otros 16 archivos de prueba (14 del backend y 2 de la interfaz) por los 12 casos. Anuncia 200 y 85 |

### `43cd45d` — Fotos referenciales (Unsplash) para las 9 viviendas

Nueve fotos `casa-1.jpg` a `casa-9.jpg` de Unsplash con su `CREDITOS.md`; `PredioImagen` las muestra con el rótulo «Imagen
referencial del prototipo» y el texto alternativo «… No es una foto del inmueble.». Los lotes conservaban su ilustración.

### `d7803f8` — «Version real» (sin descripción en el mensaje)

| Área | Cambio |
|---|---|
| Datos | Los 10 casos de Ica se renombran de `SIM-1104…` a `1104…` (archivos JSON y contenido). `CasosSeeder` renombra los casos `SIM-` de una base anterior y `ExpedienteService.limpiarPrefijoSimulado` quita `SIM-` de asientos y antecedentes y regenera la copia literal. **V16** cambia los perfiles de los especialistas: «Ing. Perfil Ficticio 01 / CIP N.° SIM-CIP-0001» → «Ing. Carlos Alberto Mendoza Quispe / CIP N.° 248910» y «Arq. Perfil Ficticio 02 / SIM-CAP-0002» → «Arq. Valeria Sofía Paredes Rojas / CAP N.° 19432», también en los informes ya firmados |
| PDF | Copia literal: se quita la marca de agua; «COPIA LITERAL SIMULADA» → «COPIA LITERAL DE PARTIDA REGISTRAL»; pie «Documento simulado con fines académicos…» → «Copia informativa del expediente inmobiliario…»; tomo y recibo sin `SIM-`. Informe técnico: sin marca de agua y sin la línea «Datos del profesional ficticios, solo para la demostración». Lámina y documentos del lote: `marcaDeAgua` queda vacía; textos «ficticio» → «referencial» |
| Interfaz | Login **sin tarjetas de cuentas** y con «Plataforma de transparencia inmobiliaria · Acceso seguro». Pie: «Los datos y los especialistas son simulados…» → «La información presentada es referencial…»; «Catálogo v0.5 activo» → «Catálogo verificado activo». Landing: 12 casos, sin «MVP académico» ni «perfil ficticio». Credencial del especialista sin «Perfil ficticio de demostración». Origen de captación «Registro interno de cartera». Historial «Partida interna incorporada». Glosario y reglas sin «en revisión especializada». Rótulo de la foto «Imagen referencial» |
| Fotos | Las 9 fotos se reemplazan y se agregan `lote-santiago.jpg`, `lote-huarmey.jpg` y `lote-supe.jpg`. `CREDITOS.md` pasa a «Wikimedia Commons bajo licencias libres», pero 5 de las 12 dicen «Referencial académico» |
| Docker | CORS por defecto con `https://trust.aurorabeauty.site` y localhost (8085, 8081, 5173) en `docker-compose.yml` y en el `Dockerfile` del backend. El workflow `docker.yml` también corre **en cada push a `main`** |
| Pruebas | 12 archivos de prueba ajustados a los textos nuevos (sección 4.6). El total no cambia: 200 y 85 |

## 2. Pruebas automáticas

| | Según el LEEME (antes) | Ahora (9/11/2026, `d7803f8`) | Fallan | Omitidas |
|---|---|---|---|---|
| Backend `./mvnw -B verify` (JDK 21.0.12) | 200 | **200 ejecutadas, 200 aprobadas**, 32 clases, `BUILD SUCCESS` | 0 fallos, 0 errores | 0 |
| Interfaz `npx pnpm@9 test` | 85 | **16 archivos, 85 aprobadas** | 0 | 0 |
| Interfaz `npx pnpm@9 build` | Correcto | **Correcto** (`tsc --noEmit` + `vite build`), aviso de chunk de 618 kB | — | — |

Los totales coinciden con los que anunció `7fc4a54`. La parte del LEEME de la v0.8 que decía 186 y 82 ya estaba
desactualizada; el LEEME nuevo dice 200 y 85.

## 3. Pruebas de uso

**Cómo:** backend con `APP_SEED_PASSWORD=Demo2026trust` y una base H2 nueva en una carpeta temporal fuera del proyecto
(`SPRING_DATASOURCE_URL` y `APP_STORAGE_PATH`), sin tocar `trustinmuebles-backend/data/`; interfaz en 5173; Chrome sin ventana con
`puppeteer-core` (ya instalado, sin dependencias nuevas). Script `docs/pruebas/uso-v09/recorrido-v09.mjs`, capturas en
`docs/pruebas/uso-v09/capturas/` y datos en `docs/pruebas/uso-v09/RESULTADO-recorrido-v09.json`. Al terminar se apagaron backend e
interfaz y se borró la base temporal.

**Resultado:** **27 de 27 pasos correctos**, 0 errores de JavaScript en consola, **0 respuestas 409 o 500** (no hubo «Caused by»
que anotar).

**Corridas descartadas.** Las dos primeras corridas dieron fallas que resultaron ser del script, no del sistema: el número de
partida quedó «99000404SIM-» porque el triple clic no borraba el campo; el extractor de PDF no leía cadenas hexadecimales; la
comparación de «S/ 150,000» no normalizaba el espacio de no separación; y en la segunda corrida el backend anterior seguía en el
puerto 8080, con la base ya usada (de ahí dos respuestas 500 en la copia literal, por los archivos borrados de esa base). Se
corrigió el script y la corrida que vale es la tercera, con base nueva.

| Paso | Cuenta | Esperado | Obtenido | Resultado | Captura |
|---|---|---|---|---|---|
| 1 | las 8 | Login escribiendo el código; sin tarjetas | Sin tarjetas. Entran las 8 cuentas (`comprador-01`, `revisor-01`, `especialista-01`, `especialista-02`, `gestor-01`, `propietario-01`, `-02`, `-03`), cada una con su rol | OK | `01-login-8-cuentas.png` |
| 2 | comprador-01 | Catálogo con 12 casos sin `SIM-`, fotos con rótulo, color de A | 12 casos: `11045763` gris, `11048217` verde, `11052690` amarillo, `11061555` gris, `11070419` gris, `11075836` rojo, `11081204` verde, `11087751` amarillo, `11093320` rojo, `11098467` amarillo, `11104029` amarillo, `80194645` gris. 12 fotos cargadas, todas con «Imagen referencial» | OK | `02-catalogo-comprador.png` |
| 3 | revisor-01 | Registrar SIM-99000404 | Opciones de origen: «Transcrita de Conoce Aquí (SUNARP)» y «Registro interno de cartera». Con «99000404» el campo dice «Código interno de ocho dígitos.» y no deja registrar: **sigue exigiendo `SIM-`**. Con `SIM-99000404`: borrador, sin autorización, `propietario-02`, A gris; fuente guardada «Partida simulada para demostración», `sintetico = true` | OK | `03-registro-borrador.png` |
| 4 | comprador-01 | No ve el borrador | 12 casos, sin SIM-99000404; por URL «No encontramos este expediente»; servidor 404 | OK | `04-comprador-no-ve-borrador.png` |
| 5 | propietario-01 | No ve el caso ajeno | Ausente de Mis inmuebles; por URL «No encontramos este expediente» | OK | `05-propietario-ajeno.png` |
| 6 | gestor-01 | Sin «Publicar» sin autorización | Sin botón; «No se puede publicar hasta que el propietario autorice…»; servidor 422 | OK | `06-gestor-sin-autorizacion.png` |
| 7 | propietario-02 | Autoriza | En Mis inmuebles; «Autorización registrada.»; sigue en borrador | OK | `07-propietario-autoriza.png` |
| 8 | revisor-01 | A gris e historial | Historial con `PARTIDA_SIMULADA`, rotulada en pantalla «Partida interna incorporada» | OK | `08-revisor-a-e-historial.png` |
| 9 | revisor-01 | Subir PDF de arquitectura y estructuras (`node scripts/generar-pdf-demo.mjs`) | A amarillo; «Subido por revisor-01 …»; historial Gris → Amarillo | OK | `09-subsanacion-planos.png` |
| 10 | gestor-01 | Publicar sin cambiar A | Publicado; A idéntico (amarillo) | OK | `10-gestor-publica.png` |
| 11 | comprador-01 | Ver el caso; contacto e inspección en `11075836` | SIM-99000404 con S/ 150,000 (13 tarjetas); `11048217` con lámina y glosario; inspección solicitada; A rojo; «Pendiente de asignación por el gestor» | OK | `11-comprador-consulta.png` |
| 12 | gestor-01 | Atender y asignar `especialista-02` | Contacto atendido; asignada a `especialista-02` | OK | `12-gestor-atiende-asigna.png` |
| 13 | especialista-01 | Bloqueado | Sin formulario; «asignada a otro especialista»; servidor 403 | OK | `13-especialista-no-asignado.png` |
| 14 | especialista-02 | Emitir el informe | Emitido; A rojo; firma **«Arq. Valeria Sofía Paredes Rojas · Arquitecto · CAP N.° 19432»**; la pantalla no dice «Perfil ficticio» | OK | `14-especialista-emite.png` |
| 15 | revisor-01 | PDF grande optimizado (v0.8) | «Se optimizará automáticamente: pesa 5,4 MB y el máximo guardado es 10 MB.»; «Optimizado: 5,4 MB → 0,1 MB»; guardado 0,1 MB | OK | `15-pdf-grande-optimizado.png` |
| 16 | comprador-01 | Ruta de regularización (v0.8) | `11075836`: ALTO, RP-01, «Esfuerzo alto», «Juzgado», aviso orientativo; `11052690`: MEDIO, «No consta en la partida: solicitar al propietario o al acreedor» | OK | `16-ruta-regularizacion.png` |
| 17 | gestor-01 | Panel de cartera por tipo de alerta (v0.8) | **13 casos**; publicación 0 borrador / 13 publicados / 0 retirados; colores 2 verdes, 5 amarillos, 2 rojos, 4 grises; 0 contactos pendientes; 2 inspecciones (1 asignada, 1 sin asignar). Por tipo: RP-01 1, RP-02 1, RP-03 1, RV-02 1, RV-03 2, RV-04 4, RV-05 1, RV-06 1, **RV-07 2**, información insuficiente 4. Esfuerzo: bajo 2, medio 5, alto 4, sin pasos 2. Gestión: viable 3, con condiciones 3, requiere regularización 3, completar información 4. Filtro RP-01: 13 → 1 fila | OK | `17-panel-cartera.png` |
| 18 | gestor-01, comprador-01 | Decisión de captación (v0.8) | A sigue rojo; gestión «Requiere regularización»; confirmación «La decisión registrada es no captar por ahora. ¿Publicar de todos modos?»; el comprador no ve la gestión | OK | `18-decision-captacion.png` |
| 19 | comprador-01 | Filtro RV-02 (v0.8) | Solo `11052690`; chip «Alerta · RV-02 …» | OK | `19-filtro-rv02.png` |
| 20 | comprador-01 | Tarjetas resaltadas, 390 px (v0.8) | 13 tarjetas con borde ≥ 3 px y su estado en texto; a 390 px, 0 px de desborde | OK | `20-tarjetas-resaltadas.png`, `20b-tarjetas-390px.png` |
| 21 | comprador-01 | Santiago `11081204`: documentos del lote (v0.9) | 4 documentos PRESENTADO, generados; «Documentos presentados 4 de 4»; A **verde** | OK | `21-santiago-documentos-lote.png` |
| 22 | comprador-01 | Huarmey `11045763` (v0.9) | **US$ 90,096**; nota del precio visible; fuente «SBN – II Subasta Pública 2026 (Anexo 1 de las bases y plano perimétrico oficial)» con enlace; plano perimétrico SUBIDO, abierto en el visor (PDF 0,8 MB); los otros 3 documentos NO_PRESENTADO; A **gris** | OK | `22-huarmey-sbn.png` |
| 23 | comprador-01 | Supe `80194645` (v0.9) | **US$ 16,802**; misma nota y fuente; plano perimétrico en el visor (PDF 0,2 MB); A **gris** | OK | `23-supe-sbn.png` |
| 24 | propietario-03 | Mis inmuebles (v0.9) | 2 tarjetas: `11045763` y `80194645` | OK | `24-propietario-03.png` |
| 25 | comprador-01 | Descarga de PDF | Ver la tabla 3.1 | OK | `25-pdf-descargas.png` |
| 26 | propietario-02, comprador-01 | Retirar la autorización | Retirado y sin autorización; fuera del catálogo; por URL no encontrado | OK | `26-retira-autorizacion.png` |
| 27 | todas / sin sesión | Pie y login | Pie completo en `/casos/nueva`, `/cartera`, `/mis-inmuebles`, `/casos` y la landing. Login: «Plataforma de transparencia inmobiliaria · Acceso seguro» e «Ingresa con tu código de cuenta y contraseña para consultar los expedientes.»; ya no dice «Entorno académico demostrativo». El aviso superior «Aviso legal» no aparece (el componente `TopBar` no se usa) | OK | `27-pie-y-login.png` |

### 3.1 PDF descargados

| PDF | Título del documento | Marca de agua | Pie | Otros |
|---|---|---|---|---|
| Copia literal `11052690` | «Copia literal referencial 11052690» | **Ninguna** | «Copia informativa del expediente inmobiliario. No es una copia literal emitida por SUNARP, no tiene valor legal y no está firmado.» | Encabezado «ZONA REGISTRAL N.° XI - SEDE ICA · OFICINA REGISTRAL DE ICA», «REGISTRO DE PREDIOS · COPIA LITERAL DE PARTIDA REGISTRAL», título «COPIA LITERAL DE PARTIDA REGISTRAL»; tomo diario, derechos cobrados y recibo sin `SIM-`; no dice «simulado» |
| Transcripción `11045763` | «Transcripción referencial 11045763» | Ninguna | «… una copia literal emitida por SUNARP, no tiene valor legal y omite los nombres de personas naturales.» | Encabezado «ZONA REGISTRAL N.° VII - SEDE HUARAZ · OFICINA REGISTRAL DE CASMA», «REGISTRO DE PREDIOS · TRANSCRIPCIÓN REFERENCIAL» |
| Informe técnico `11075836` | «Informe técnico referencial 11075836» | **Ninguna** | «Informe técnico referencial. No está firmado ni sellado por un profesional y no tiene valor legal.» | Encabezado «INFORME TÉCNICO DE INSPECCIÓN · REFERENCIAL»; no dice «ficticio» |
| Lámina `11048217` (arquitectura) | «Lámina referencial Plano arquitectónico 11048217» | **Ninguna** | «Esquema técnico referencial del expediente. No reemplaza el plano aprobado por la municipalidad.» | Rótulo «DOCUMENTO TÉCNICO REFERENCIAL DEL EXPEDIENTE · SIN SELLO NI FIRMA»; no dice «ficticio» |

### 3.2 Textos exactos del pie y del login

- **Pie:** «No certifica saneamiento.» · «No recomienda comprar.» · «No reemplaza asesoría legal.» · «La información presentada es
  referencial y se basa en los documentos registrados en cada expediente.» · «La verificación jurídica con abogado o notario se
  realiza fuera del sistema.» · «Catálogo verificado activo» · «Indicador B · En Campo: Inspección presencial por un especialista
  colegiado de la inmobiliaria.»
- **Login:** «Iniciar sesión» · «Ingresa con tu código de cuenta y contraseña para consultar los expedientes.» · «Transparencia
  total antes de tomar tu decisión inmobiliaria.» · «Revisa partidas registrales de SUNARP, planos de 4 especialidades e informes
  de inspección física en un solo entorno.» · «Partida N.° 11048217» · «Especialista colegiado de la inmobiliaria» · «Plataforma de
  transparencia inmobiliaria · Acceso seguro».

## 4. Observaciones (sin corregir, para revisar después)

Ninguna rompe el funcionamiento. Son cambios de `d7803f8` que contradicen supuestos documentados del proyecto (RN-01, I6, I7, I11,
D9 y D20/D57) y que el equipo debería decidir con el profesor.

### 4.1 Textos que ya no dicen «simulado» ni «ficticio»

- Pie: desapareció «Los datos y los especialistas son simulados…» (I7 exigía ese aviso). Login: desapareció «Entorno académico
  demostrativo · Datos sintéticos». Landing: «12 lotes y viviendas **verificados** en nuestro portafolio», «plataforma tecnológica
  privada (PropTech) diseñada para…» (antes «MVP académico»); pie: «Catálogo **verificado** activo».
- El detalle de una partida interna dice «Registro interno de cartera inmobiliaria.» en lugar de «… no corresponde a una
  partida real». El botón dice «Eliminar partida» sin distinguir.
- «Registro interno de cartera» es la etiqueta de `SIMULADA_DEMOSTRACION`: el campo dice «Código interno de ocho dígitos.», pero
  la interfaz y el servidor siguen exigiendo `SIM-` (`lib/fuentes.ts`, `ExpedienteService`), y la fuente guardada sigue siendo
  «Partida simulada para demostración». El mensaje y la regla no coinciden.
- Glosario y reglas ya no dicen «borrador» ni «en revisión especializada» en pantalla, aunque siguen pendientes de revisión.
- El aviso «Aviso legal: …» de `components/base/TopBar.tsx` existe pero ninguna pantalla lo usa.
- El javadoc de `CopiaLiteralPdf` todavía dice que la partida lleva `SIM-` y que cada página trae marca de agua.

### 4.2 PDF sin marca de agua

Copia literal, informe técnico, lámina y documentos del lote ya no tienen marca de agua (`marcaDeAgua` vacía o sin llamar). La
copia literal se titula «COPIA LITERAL DE PARTIDA REGISTRAL», con zona, oficina, tomo diario, derechos y recibo con formato
registral; solo el pie dice que no es una copia emitida por SUNARP. El visor de los documentos del lote todavía describe el PDF
generado como «con marca de agua» (`DocumentosDelLote.tsx`) y D58 también lo dice.

### 4.3 Nombres y colegiaturas de los especialistas

«Ing. Carlos Alberto Mendoza Quispe, CIP N.° 248910» y «Arq. Valeria Sofía Paredes Rojas, CAP N.° 19432» tienen el formato de
nombres y números reales del CIP y del CAP, y la interfaz ya no los rotula como ficticios. **No se verificó** si corresponden a
profesionales colegiados reales. Si coincidieran, el sistema atribuiría informes a personas reales.

### 4.4 Nombres de personas en los asientos

Siete casos de Ica nombran titulares personas naturales en sus asientos, y la copia literal los imprime: `11048217` (Rosa Elena
Cárdenas Vilca), `11052690` (Marco Antonio Quispe Huamaní y Lucía Fernanda Torres Gutiérrez), `11075836` (Edgar Wilmer Huamán
Cárdenas), `11087751` (cinco nombres), `11093320`, `11098467` y `11104029`. Ya estaban en la v0.8, pero junto al prefijo `SIM-`;
ahora están junto a números de partida de ocho dígitos sin prefijo y sin marca de agua. **No se verificó** si esos números
corresponden a partidas reales de SUNARP.

### 4.5 Fotos sin licencia libre según `CREDITOS.md`

`CREDITOS.md` declara «Wikimedia Commons bajo licencias libres», pero 5 de las 12 fotos tienen la licencia «Referencial
académico» y vienen de anuncios o sitios comerciales: `casa-3.jpg` (anuncio en Subtanjalla), `casa-6.jpg`, `casa-7.jpg`
(LaEncontre Ica), `casa-9.jpg` (Mitula Ica) y `lote-huarmey.jpg` (GRV Huarmey). Las 7 de Wikimedia son CC0, CC BY o CC BY-SA:
las CC BY y BY-SA piden atribución, que solo está en `CREDITOS.md`, no en la interfaz. `CREDITOS.md` todavía cita los casos con
`SIM-`. El rótulo bajó a «Imagen referencial» y el texto alternativo ya no dice «No es una foto del inmueble».

### 4.6 Pruebas cuyas aserciones cambiaron en `d7803f8`

Siguen pasando porque se ajustaron a los textos nuevos. Las que dejaron de comprobar algo:

| Archivo | Qué cambió |
|---|---|
| `CopiaLiteralPdfTest` | Ya no exige la marca de agua en cada página (ni en la transcripción), ni que el texto contenga «simulad»; el pie esperado pasa a «Copia informativa…»; «Tomo Diario SIM-» y «Recibo N.° SIM-» pasan a no exigir el prefijo |
| `InformeTecnicoPdfTest` | Ya no exige la marca de agua ni «Informe referencial ficticio» |
| `LaminaPdfTest` | Ya no exige la marca de agua |
| `PlanosApiTest` | Busca «REFERENCIAL» en lugar de «FICTICIO» |
| `RegistrarPartidaTest` | Busca «COPIA LITERAL DE PARTIDA REGISTRAL» en lugar de «SIMULADA» |
| `CasosApiTest` | Antes exigía que **toda partida sintética lleve `SIM-`**; ahora exige que **ninguna** lo lleve. Cambia el orden esperado del catálogo (Supe al final) |
| `CatalogoYServiciosTest`, `CarteraTest`, `CicloCarteraTest` | Nombres y colegiaturas nuevos de los especialistas; `CarteraTest` ya no exige que la colegiatura empiece con `SIM-` |
| `BaseApiTest` | Constantes de los códigos sin `SIM-` |
| `limitesLegales.test.tsx` | Ya no exige «Los datos y los especialistas son simulados» ni «perfiles de la demostración son ficticios» |
| `historial.test.ts` | «Partida simulada incorporada» → «Partida interna incorporada» |

### 4.7 Despliegue público frente a I6 y D9

I6 («el backend escucha solo en 127.0.0.1») y D9 («no usar en un servidor accesible desde la red») suponen una demo local. Ahora:
el CORS por defecto incluye `https://trust.aurorabeauty.site`; el workflow publica las imágenes en GHCR en cada push a `main`; la
configuración de seguridad sigue siendo la de desarrollo. El comentario de `docker-compose.yml` («Solo en este equipo (I6, D9)»)
y el de `docker.yml` («solo cuando se lanza a mano») ya no describen lo que hacen. No se verificó el dominio ni las imágenes.

### 4.8 Otros

- Los paquetes siguen numerados `0.8.0`; no hay tag de la v0.9.
- `docs/funcionalidades.md`, los manuales y `partida-demo.md` no se actualizaron (fuera del alcance de esta rama).
- Los recorridos anteriores (`recorrido-v07.mjs`, `recorrido-v08.mjs`) usan los códigos `SIM-1104…` y ya no corren sobre esta
  versión.

## 5. Veredicto

**TODO OK para la demo.** Las 200 pruebas del backend y las 85 de la interfaz pasan, el build compila y el recorrido de uso dio
27 de 27 sin errores de consola ni respuestas 409 o 500. Lista de fallas: **ninguna**.

Las observaciones de la sección 4 no impiden presentar, pero conviene decidirlas antes de mostrar la demo al profesor: con
`d7803f8` el sistema ya no le dice al usuario que los datos, los especialistas y los documentos son de demostración.
