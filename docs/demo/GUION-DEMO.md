# Guion de la demo (versión actual, `d7803f8`): 24 pasos con SIM-99000404 y los lotes de la v0.9

Guion paso a paso de la versión actual de `main` (v0.9 + fotos + «Version real»). Los códigos, conteos y textos que aparecen en
«Debe verse» se comprobaron el **9 de noviembre de 2026** con [recorrido-v09.mjs](../pruebas/uso-v09/recorrido-v09.mjs): 27 de 27
pasos correctos, Chrome sin ventana, base nueva fuera del repositorio, sin errores de consola ni respuestas 409 o 500. Lo que el
script no comprobó dice **(no verificado)**. No se ensayó a mano con una persona frente a la pantalla ni se midió la duración.

Este guion reemplaza a [partida-demo.md](partida-demo.md), que está desactualizado.

## Qué cambió frente al guion de la v0.8

- Los casos de Ica ya no llevan `SIM-`: `11048217` (Parcona), `11052690` (La Tinguiña), `11075836` (Pueblo Nuevo), etc.
- El catálogo tiene **12 casos** (13 cuando se publica SIM-99000404), todos con foto y el rótulo «Imagen referencial».
- El login **no tiene tarjetas de cuentas**: hay que escribir el código.
- El origen «Simulada para demostración» ahora se llama **«Registro interno de cartera»**, pero **sigue exigiendo `SIM-`**.
- El informe lo firma **Arq. Valeria Sofía Paredes Rojas, CAP N.° 19432**, sin «Perfil ficticio de demostración».
- El pie y el login ya no dicen «simulado» ni «entorno académico» (paso 15).
- Pasos nuevos de la v0.9: Santiago (documentos del lote), Huarmey y Supe (lotes de la SBN) y `propietario-03` (pasos 22 a 24).

## Antes de presentar

### 1. Dejar la base limpia

Cierra todas las terminales del backend y de la interfaz. SIM-99000404 solo se puede registrar una vez y el informe del paso 12
no se puede repetir sobre `11075836`: reinicia antes de cada ensayo.

**PowerShell**, desde la raíz del proyecto:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\reiniciar-demo.ps1
```

**Git Bash**, desde la raíz del proyecto (mismo script; si prefieres hacerlo a mano, apaga el backend y borra la carpeta):

```bash
powershell -ExecutionPolicy Bypass -File scripts/reiniciar-demo.ps1
# o, a mano, con el backend apagado:
rm -rf trustinmuebles-backend/data
```

Si el script dice que el puerto 8080 está ocupado, libéralo: el backend no arranca sin ese puerto.

### 2. Arrancar backend e interfaz (una terminal para cada uno)

Elige una contraseña de al menos 8 caracteres: la usarán las 8 cuentas.

**PowerShell:**

```powershell
# Terminal 1
cd trustinmuebles-backend
$env:APP_SEED_PASSWORD = 'elige-una-clave-de-prueba'
.\mvnw.cmd spring-boot:run

# Terminal 2
cd trustinmuebles
npx pnpm@9 dev
```

**Git Bash:**

```bash
# Terminal 1
cd trustinmuebles-backend
APP_SEED_PASSWORD='elige-una-clave-de-prueba' ./mvnw spring-boot:run

# Terminal 2
cd trustinmuebles
npx pnpm@9 dev
```

Si Maven falla por el certificado (Norton intercepta el TLS), ejecuta antes en esa terminal
`$env:MAVEN_OPTS = '-Djavax.net.ssl.trustStoreType=Windows-ROOT'` (PowerShell) o
`export MAVEN_OPTS='-Djavax.net.ssl.trustStoreType=Windows-ROOT'` (Git Bash).

### 3. Preparar los PDF y el plan B

1. Genera los PDF de la demo: `node scripts/generar-pdf-demo.mjs`. Imprime dónde quedaron `plano-chico.pdf` y
   `plano-escaneado-grande.pdf` (unos 5,4 MB). No quedan en el repositorio. Un plano no se puede marcar «Presentado» sin su PDF.
2. Abre `http://localhost:5173` en Chrome.
3. Deja abierta la carpeta [docs/pruebas/uso-v09/capturas/](../pruebas/uso-v09/capturas/) para el plan B. Las capturas son de la
   versión actual (9/11/2026), muestran el estado final de cada paso y son largas: amplía la zona indicada.

### Cuentas y cómo cambiar de cuenta

Pulsa el icono «Cerrar sesión», arriba a la derecha, y ve a `http://localhost:5173/#/login`. **Escribe** el código de cuenta y la
contraseña y pulsa **Ingresar al sistema**. Cuentas: `comprador-01`, `revisor-01`, `especialista-01`, `especialista-02`,
`gestor-01`, `propietario-01`, `propietario-02` y `propietario-03` (las 8 entraron en el recorrido; captura `01-login-8-cuentas.png`).

### Casos que no se editan

No edites `11048217`, `11052690`, `11061555` ni `11070419` (instrumento del estudio). Todo cambio se hace en SIM-99000404;
`11048217` solo se abre para mirar en el paso 9, y `11075836` recibe la solicitud, el informe y la decisión de captación.
`11081204`, `11045763` y `80194645` solo se miran.

## Datos de la partida

| Campo | Valor |
|---|---|
| Origen de la partida | `Registro interno de cartera` |
| Precio referencial en soles | `150000` |
| Número de partida | `SIM-99000404` (con `SIM-`; sin él, el campo dice «Código interno de ocho dígitos.» y no deja registrar) |
| Denominación del predio | `Mz. Z Lote 4 · Hab. Urb. Demostración · Ica` |
| Código de cuenta del propietario | `propietario-02` |
| Distrito | `Ica, Ica` |
| Ubicación | `Mz. Z, Lote 4, distrito de Ica.` |
| Área (m²) | `160` (o déjalo vacío: «Leer asientos» pone `160.00` con el texto completo) |
| Tipo de predio | `Vivienda` |
| Área construida inscrita (m²) | `90.00` |
| Los cuatro planos | `No presentado` |
| Condición | `Lote urbano inscrito en el Registro de Predios.` |
| Completitud | `Completa` |
| Fecha, zona y oficina | Déjalos como vienen |

La titular es una empresa ficticia, Inmobiliaria Demo Sur S.A.C. El perímetro de 56.00 ml solo aparece en este texto.

## Texto para pegar

Copia desde `PARTIDA` hasta la última línea, sin las marcas del bloque. (El recorrido automático usó solo el asiento C00001;
con el texto completo verás 4 asientos.)

```text
PARTIDA N.° SIM-99000404 (FICTICIA, SOLO PARA DEMOSTRACIÓN)
Zona Registral N.° XI - Sede Ica · Oficina Registral de Ica · Registro de Predios

RUBRO A: ANTECEDENTE DOMINIAL
Independizado de la partida N.° 40000404, que corresponde al lote matriz de la Habilitación Urbana Demostración.

RUBRO B: DESCRIPCIÓN DEL INMUEBLE
Mz. Z Lote 4 de la Habilitación Urbana Demostración, distrito, provincia y departamento de Ica. Vivienda.
Área del terreno: 160.00 m2. Perímetro: 56.00 ml.
Linderos y medidas perimétricas:
Por el frente: con la Calle Demostración, en 8.00 ml.
Por la derecha entrando: con el Lote 5 de la Mz. Z, en 20.00 ml.
Por la izquierda entrando: con el Lote 3 de la Mz. Z, en 20.00 ml.
Por el fondo: con el Lote 15 de la Mz. Z, en 8.00 ml.

RUBRO C: TÍTULOS DE DOMINIO
C00001
COMPRAVENTA. Se inscribe el dominio del predio a favor de Inmobiliaria Demo Sur S.A.C. (100 %). Precio pactado en soles, pagado según consta en el título. Título N.° 2014-00040401. Fecha de presentación: 03/02/2014. Fecha de inscripción: 17/02/2014.

RUBRO D: GRAVÁMENES Y CARGAS
D00001
HIPOTECA. Se constituye hipoteca sobre el predio a favor de BANCO FICTICIO DEL PACÍFICO S.A., hasta por la suma de S/ 90,000.00, en garantía de un préstamo. Título N.° 2015-00040402. Fecha de presentación: 10/03/2015. Fecha de inscripción: 24/03/2015.

RUBRO E: CANCELACIONES
E00001
CANCELACIÓN DE HIPOTECA. Se cancela totalmente la hipoteca inscrita en el asiento D00001 de esta partida, por haberse pagado el préstamo garantizado. Título N.° 2022-00040403. Fecha de presentación: 05/09/2022. Fecha de inscripción: 19/09/2022.

RUBRO F: OTROS
F00001
DECLARATORIA DE FÁBRICA. Se declara la fábrica de una vivienda de dos pisos con área construida total de 90.00 m2, en albañilería confinada. Título N.° 2016-00040404. Fecha de presentación: 11/07/2016. Fecha de inscripción: 25/07/2016.
```

## Orden de la presentación

Pasos 1 a 13 → pasos 16 a 21 (v0.8) → pasos 22 a 24 (v0.9) → pasos 14 y 15 (retirar la autorización y cerrar con los límites).
Retirar la autorización va al final porque saca SIM-99000404 del catálogo.

## Recorrido

### Paso 1. El revisor registra la partida

- **Cuenta:** `revisor-01`
- **Pantalla:** menú **Registrar partida** (`#/casos/nueva`)
- **Botones, en orden:**
  1. **Origen de la partida**: `Registro interno de cartera` (las otras opciones: `Transcrita de Conoce Aquí (SUNARP)`).
  2. Llena el resto de «Datos de la partida». Escribe el número **con** `SIM-`.
  3. Pega el texto en **Texto de la partida** y pulsa **Leer asientos**.
  4. **Tipo de predio** `Vivienda` y **Área construida inscrita (m²)** `90.00`.
  5. Deja los cuatro planos en `No presentado`.
  6. Marca «Revisé la vista previa y confirmo que no contiene nombres, DNI ni domicilios de personas naturales».
  7. Pulsa **Registrar partida**.
- **Debe verse:** el caso en **borrador**, «Sin autorización del propietario», del `propietario-02`, con **Gris: Información
  insuficiente o condición no evaluable**.
- **Frase:** «El revisor captura la partida y el sistema calcula el indicador A al instante. El caso nace en borrador: nadie
  más lo ve todavía».
- **Plan B:** `03-registro-borrador.png`.

### Paso 2. El comprador no ve el borrador

- **Cuenta:** `comprador-01`
- **Pantalla:** menú **Expedientes** (`#/casos`), luego la dirección `#/casos/SIM-99000404`
- **Debe verse:** **12 casos**, sin SIM-99000404. Por dirección: «No encontramos este expediente en la cartera» (el servidor
  responde 404).
- **Frase:** «Aunque el comprador conozca el número, el servidor no le entrega un caso sin publicar».
- **Plan B:** `04-comprador-no-ve-borrador.png`. El catálogo con sus 12 fotos está en `02-catalogo-comprador.png`.

### Paso 3. Otro propietario tampoco lo ve

- **Cuenta:** `propietario-01`
- **Pantalla:** **Mis inmuebles** (`#/mis-inmuebles`), luego `#/casos/SIM-99000404`
- **Debe verse:** el caso no está en la lista. Por dirección: «No encontramos este expediente en la cartera».
- **Frase:** «Cada propietario ve solo sus casos. Este pertenece a propietario-02».
- **Plan B:** `05-propietario-ajeno.png`.

### Paso 4. El gestor no puede publicar sin autorización

- **Cuenta:** `gestor-01`
- **Pantalla:** `#/casos/SIM-99000404`, panel **Publicación y autorización**
- **Debe verse:** no hay botón **Publicar** y dice «No se puede publicar hasta que el propietario autorice el caso». El servidor
  también lo rechaza (422).
- **Frase:** «El indicador no decide la publicación. Lo que falta es la autorización del propietario».
- **Plan B:** `06-gestor-sin-autorizacion.png`.

### Paso 5. El propietario autoriza

- **Cuenta:** `propietario-02`
- **Pantalla:** **Mis inmuebles**, luego `#/casos/SIM-99000404`
- **Botón:** **Autorizar publicación**
- **Debe verse:** el caso en Mis inmuebles y «Autorización registrada.». Sigue en borrador.
- **Frase:** «Autorizar no publica: solo habilita al gestor. Y no cambia el indicador A».
- **Plan B:** `07-propietario-autoriza.png`.

### Paso 6. El revisor ve el indicador A y el historial

- **Cuenta:** `revisor-01`
- **Pantalla:** `#/casos/SIM-99000404`, indicador A y **Historial de evaluaciones**
- **Debe verse:** Gris y una sola entrada de historial, rotulada **«Partida interna incorporada»** (antes «Partida simulada
  incorporada»). Los faltantes (plano arquitectónico y de estructuras) y las alertas por los planos de instalaciones
  **(no verificado por el script; sí en la v0.8)**.
- **Frase:** «El gris no es una mala noticia: sin los planos principales, el sistema no evalúa».
- **Plan B:** `08-revisor-a-e-historial.png`.

### Paso 7. El revisor subsana subiendo los PDF de los planos

- **Cuenta:** `revisor-01`
- **Pantalla:** `#/casos/SIM-99000404`, **Expediente técnico de planos (2D)**
- **Botones:** en la tarjeta **Arquitectura**, elige `plano-chico.pdf` y pulsa **Subir PDF (queda presentado)**; repite en
  **Estructuras**.
- **Debe verse:** «Archivo guardado.», «Subido por revisor-01 …» en cada tarjeta, el indicador en **amarillo** y una entrada nueva
  del historial **de Gris a Amarillo**.
- **Frase:** «Un plano no aparece como presentado sin su archivo. El color no se elige: lo recalculan las reglas».
- **Plan B:** `09-subsanacion-planos.png`.

### Paso 8. El gestor publica

- **Cuenta:** `gestor-01`
- **Pantalla:** `#/casos/SIM-99000404`, panel **Publicación y autorización**
- **Botón:** **Publicar**
- **Debe verse:** «Caso publicado.» y el indicador A sigue en amarillo, idéntico.
- **Frase:** «Publicar cambia quién puede verlo, no lo que dice el indicador».
- **Plan B:** `10-gestor-publica.png`.

### Paso 9. El comprador consulta y pide contacto e inspección

- **Cuenta:** `comprador-01`
- **Pantalla:** `#/casos`, luego `#/casos/11048217` y `#/casos/11075836`
- **Botones:**
  1. En el catálogo (ahora **13 tarjetas**), señala SIM-99000404 con **S/ 150,000**.
  2. En `11048217`, solo para mirar: **Ver lámina** en los planos y el **Glosario** del expediente.
  3. En `11075836`: **Solicitar contacto** → **Enviar solicitud**.
  4. **Solicitar inspección técnica** → **Confirmar solicitud**.
- **Debe verse:** «Solicitud registrada el…», «… a nombre de comprador-01…», «Pendiente de asignación por el gestor» y el
  indicador A en **rojo**.
- **Frase:** «Puede pedir la inspección incluso con un rojo, y esa solicitud no cambia el color».
- **Plan B:** `11-comprador-consulta.png`.

### Paso 10. El gestor atiende y asigna

- **Cuenta:** `gestor-01`
- **Pantalla:** **Cartera** (`#/cartera`), luego `#/casos/11075836`
- **Botones:** **Marcar atendida**; en **Cuenta del especialista**, `especialista-02`; **Asignar**.
- **Debe verse:** «… marcada como atendida» e «Inspección asignada a especialista-02…».
- **Frase:** «El gestor reparte el trabajo. Sin asignación, ningún especialista puede emitir».
- **Plan B:** `12-gestor-atiende-asigna.png`.

### Paso 11. Un especialista no asignado no puede emitir

- **Cuenta:** `especialista-01`
- **Pantalla:** `#/casos/11075836`, indicador B
- **Debe verse:** sin formulario de informe y el aviso «Esta inspección está asignada a otro especialista…». El servidor
  responde 403.
- **Frase:** «El permiso no depende solo del rol: depende de a quién se asignó esta inspección».
- **Plan B:** `13-especialista-no-asignado.png`.

### Paso 12. El especialista asignado emite el informe

- **Cuenta:** `especialista-02`
- **Pantalla:** `#/casos/11075836`, formulario **Informe técnico**
- **Botones:** **Estado** `Informe emitido`; **Conclusión del informe** `Favorable`; **Fecha de la inspección presencial** el día de
  ayer; las cuatro verificaciones `Conforme`; **Conclusiones sustentadas por la inspección**: `Sin observaciones físicas en la
  inspección visual.`; **Guardar informe**.
- **Debe verse:** «Informe emitido. El indicador A (documental) no cambió.», la firma **«Arq. Valeria Sofía Paredes Rojas»**,
  **Arquitecto**, **CAP N.° 19432**, y el indicador A en **rojo**. La pantalla **ya no dice** «Perfil ficticio de demostración».
- **Frase:** «Aunque el informe sea favorable, el embargo sigue en la partida: B nunca cambia A».
- **Ojo:** si preguntan por el especialista, es un perfil de la demostración redactado por el equipo (ver el reporte).
- **Plan B:** `14-especialista-emite.png`.

### Paso 13. El gestor revisa el panel de cartera

- **Cuenta:** `gestor-01`
- **Pantalla:** **Cartera** (`#/cartera`)
- **Debe verse** (medido después del paso 16): **13 casos, 13 publicados**, 0 en borrador, 0 retirados; **2 verdes, 5 amarillos,
  2 rojos y 4 grises**; **0 contactos pendientes**; **2 inspecciones**: una asignada (`11098467`, `especialista-01`) y otra
  pendiente de asignación (`11093320`). La de `11075836` ya está emitida y no cuenta.
- **Frase:** «Todo lo que hicimos se refleja en el panel. Las cifras salen de la cartera, no se cargan a mano».
- **Plan B:** `17-panel-cartera.png`.

### Paso 16. Subir un PDF pesado: límite y optimización

- **Cuenta:** `revisor-01`
- **Pantalla:** `#/casos/SIM-99000404`, tarjeta **Instalaciones eléctricas (II.EE.)**
- **Botones:** elige `plano-escaneado-grande.pdf` y pulsa **Subir PDF (queda presentado)**.
- **Debe verse:** antes de subir, «Se optimizará automáticamente: pesa 5,4 MB y el máximo guardado es 10 MB.»; después,
  «Optimizado: 5,4 MB → 0,1 MB».
- **Frase:** «Se aceptan hasta 25 MB. Si pesa más de 5 MB, el sistema reduce sus imágenes y guarda solo el resultado».
- **Plan B:** `15-pdf-grande-optimizado.png`.

### Paso 17. La ruta de regularización

- **Cuenta:** `comprador-01`
- **Pantalla:** `#/casos/11075836` y luego `#/casos/11052690`, sección **Ruta de regularización**
- **Debe verse:** en Pueblo Nuevo, el embargo (RP-01) con **Juzgado** y **Esfuerzo alto**; en La Tinguiña, esfuerzo **medio** y
  «No consta en la partida: solicitar al propietario o al acreedor.». Arriba, «Orientativo: no es asesoría legal ni recomendación
  de compra».
- **Frase:** «Para cada alerta, el sistema dice qué haría falta y quién lo gestiona. No damos plazos ni costos».
- **Plan B:** `16-ruta-regularizacion.png`.

### Paso 18. La cartera por tipo de problema

- **Cuenta:** `gestor-01`
- **Pantalla:** **Cartera** (`#/cartera`)
- **Botón:** en **Casos por tipo de alerta**, pulsa **RP-01 · Embargo vigente**.
- **Debe verse:** «Casos por tipo de alerta», «Esfuerzo de regularización», «Por regularizar» y «Priorización interna de la
  inmobiliaria; no es una recomendación de compra». Conteo por tipo: RP-01 = 1, RP-02 = 1, RP-03 = 1, RV-02 = 1, RV-03 = 2, RV-04
  = 4, RV-05 = 1, RV-06 = 1, **RV-07 = 2** (lotes de la SBN) e información insuficiente = 4. Esfuerzo: bajo 2, medio 5, alto 4,
  sin pasos 2. Gestión: viable 3, viable con condiciones 3, requiere regularización 3, completar información 4. Al pulsar RP-01,
  la lista pasa de 13 a 1 fila.
- **Frase:** «De toda la cartera, cuántos tienen hipoteca, cuántos embargo, cuáles son más viables. Es para organizar el trabajo
  de la inmobiliaria, no para recomendar una compra».
- **Plan B:** `17-panel-cartera.png`.

### Paso 19. El semáforo de gestión y la decisión de captación

- **Cuenta:** `gestor-01`, luego `comprador-01`
- **Pantalla:** `#/casos/11075836`, sección **Gestión inmobiliaria (interno)**
- **Botones:** **Decisión** `No captar por ahora`, **Motivo** `Proceso judicial`, **Registrar decisión**; en **Publicación y
  autorización**, **Retirar** y luego **Publicar** (acepta la confirmación); con `comprador-01`, abre el mismo caso.
- **Debe verse:** «Decisión registrada: No captar por ahora (Proceso judicial).», gestión «Requiere regularización», el indicador A
  todavía en rojo, «Publicación retirada.», la confirmación «La decisión registrada es no captar por ahora. ¿Publicar de todos
  modos?» y «Caso publicado.». El comprador no ve el panel de gestión.
- **Frase:** «El semáforo de gestión es interno: no cambia los indicadores, no lo ve el comprador y no impide publicar».
- **Plan B:** `18-decision-captacion.png`.

### Paso 20. Filtrar el catálogo por tipo de alerta

- **Cuenta:** `comprador-01`
- **Pantalla:** `#/casos`, botón **Filtros** → **Tipo de alerta del indicador A** → `RV-02 · Hipoteca vigente`
- **Debe verse:** solo `11052690` (La Tinguiña) y el chip «Alerta · RV-02 · Hipoteca vigente».
- **Plan B:** `19-filtro-rv02.png`.

### Paso 21. El color de A, resaltado y siempre con texto

- **Cuenta:** `comprador-01`
- **Pantalla:** `#/casos`; si se puede, con el ancho de un celular (herramientas de Chrome, 390 px)
- **Debe verse:** las 13 tarjetas con borde izquierdo y fondo tenue de su color y la etiqueta «Indicador A: …»; a 390 px, sin
  desplazamiento horizontal.
- **Frase:** «El color ayuda a ubicar los casos de un vistazo, pero nunca va solo: siempre lo acompaña un texto».
- **Plan B:** `20-tarjetas-resaltadas.png` y `20b-tarjetas-390px.png`.

## Pasos de la v0.9

### Paso 22. Santiago: los documentos del lote

- **Cuenta:** `comprador-01`
- **Pantalla:** `#/casos/11081204`, sección de documentos del lote
- **Debe verse:** «Documentos presentados **4 de 4**» y cuatro tarjetas: plano perimétrico y de ubicación, memoria descriptiva,
  certificado de zonificación y vías, y tasación, generados por el sistema. Indicador A **verde**: «No se detectaron alertas en los
  campos evaluados (0 anotación(es) revisada(s)). Esto no significa saneamiento.».
- **Frase:** «En un lote no hay planos de vivienda: cuentan sus documentos. Sin plano perimétrico o memoria, gris; sin
  zonificación, amarillo; la tasación es informativa».
- **Plan B:** `21-santiago-documentos-lote.png`.

### Paso 23. Huarmey y Supe: lotes de una subasta de la SBN

- **Cuenta:** `comprador-01`
- **Pantalla:** `#/casos/11045763` y `#/casos/80194645`
- **Botón:** en la tarjeta del **plano perimétrico**, **Ver documento**.
- **Debe verse:** el precio **US$ 90,096** (Huarmey) y **US$ 16,802** (Supe), con la nota «Precio base de la II Subasta Pública 2026
  de la SBN (venta ad corpus). Las ofertas se presentan según las bases; no es una oferta de la inmobiliaria.»; la fuente «SBN – II
  Subasta Pública 2026 (Anexo 1 de las bases y plano perimétrico oficial)» con su enlace; el plano perimétrico oficial abierto en
  el visor; memoria, zonificación y tasación «No presentado»; indicador A **gris**.
- **Frase:** «Estos dos lotes vienen de una fuente pública. El sistema no inventa lo que falta: sin partida transcrita ni memoria
  descriptiva, el indicador dice que la información es insuficiente».
- **Plan B:** `22-huarmey-sbn.png` y `23-supe-sbn.png`.

### Paso 24. La propietaria de los lotes

- **Cuenta:** `propietario-03`
- **Pantalla:** **Mis inmuebles** (`#/mis-inmuebles`)
- **Debe verse:** dos tarjetas, `11045763` y `80194645`.
- **Frase:** «La cuenta de demostración propietario-03 representa al dueño de estos lotes; no representa a la SBN».
- **Plan B:** `24-propietario-03.png`.

## Cierre

### Paso 14. El propietario retira la autorización

- **Cuenta:** `propietario-02`, luego `comprador-01`
- **Pantalla:** `#/casos/SIM-99000404`; con el comprador, `#/casos` y la misma dirección
- **Botón:** **Retirar autorización**
- **Debe verse:** «Autorización retirada.» y el caso retirado; el comprador ya no lo ve en el catálogo y, por dirección, recibe
  «No encontramos este expediente en la cartera».
- **Frase:** «El propietario conserva el control: si retira su autorización, el caso sale del catálogo».
- **Plan B:** `26-retira-autorizacion.png`.

### Paso 15. Los límites siempre están a la vista

- **Cuenta:** `comprador-01`, luego sin sesión
- **Pantalla:** el pie de `#/casos`, y después `#/login`
- **Botón:** icono **Cerrar sesión**
- **Debe verse**, en el pie (textos exactos): «No certifica saneamiento.», «No recomienda comprar.», «No reemplaza asesoría
  legal.», «La información presentada es referencial y se basa en los documentos registrados en cada expediente.» y «La
  verificación jurídica con abogado o notario se realiza fuera del sistema.». En el login: «Iniciar sesión», «Ingresa con tu código
  de cuenta y contraseña para consultar los expedientes.» y «Plataforma de transparencia inmobiliaria · Acceso seguro».
- **Ojo:** el pie ya no dice «Los datos y los especialistas son simulados» y el login ya no dice «Entorno académico demostrativo».
- **Frase:** «Esto es una orientación, no una certificación. La verificación jurídica con abogado o notario sigue fuera del
  sistema».
- **Plan B:** `27-pie-y-login.png` (pie) y `01-login-8-cuentas.png` (login).

### Opcional. Los PDF del expediente

Desde el detalle se descargan la copia literal, la lámina de cada plano y el informe técnico. Comprobado el 9/11/2026:

| PDF | Título del archivo | Marca de agua | Pie |
|---|---|---|---|
| Copia literal (`11052690`) | «Copia literal referencial 11052690»; encabezado «COPIA LITERAL DE PARTIDA REGISTRAL» | Ninguna | «Copia informativa del expediente inmobiliario. No es una copia literal emitida por SUNARP, no tiene valor legal y no está firmado.» |
| Transcripción (`11045763`) | «Transcripción referencial 11045763» | Ninguna | «… una copia literal emitida por SUNARP, no tiene valor legal y omite los nombres de personas naturales.» |
| Informe técnico (`11075836`) | «Informe técnico referencial 11075836»; encabezado «INFORME TÉCNICO DE INSPECCIÓN · REFERENCIAL» | Ninguna | «Informe técnico referencial. No está firmado ni sellado por un profesional y no tiene valor legal.» |
| Lámina (`11048217`, arquitectura) | «Lámina referencial Plano arquitectónico 11048217» | Ninguna; rótulo «DOCUMENTO TÉCNICO REFERENCIAL DEL EXPEDIENTE · SIN SELLO NI FIRMA» | «Esquema técnico referencial del expediente. No reemplaza el plano aprobado por la municipalidad.» |

Plan B: `25-pdf-descargas.png` (solo la pantalla; los PDF no se guardaron en el repositorio).

## Si algo falla en vivo

| Síntoma | Qué hacer |
|---|---|
| Error **409** (conflicto) al guardar, publicar o subir | Reinicia el backend: Ctrl+C en su terminal y vuelve a lanzar `spring-boot:run`. Anota la línea «Caused by» que deja el log. En el recorrido del 9/11/2026 no apareció ningún 409 |
| «La partida … ya está registrada» | La base no está limpia. Sigue con el plan B y reinicia después de la presentación |
| Código de cuenta o contraseña incorrectos | Revisa que escribiste el código completo (el login no tiene tarjetas). Si la base es anterior, la contraseña nueva no aplica: plan B |
| «Código interno de ocho dígitos.» bajo el número | Falta el prefijo: escribe `SIM-99000404` |
| Aparece «Avisos de la lectura» | Pegaste el texto incompleto. Vuelve a copiar el bloque y pulsa **Leer asientos** |
| «No se registró la partida» | Revisa origen, número con `SIM-` y propietario. Si persiste, plan B del paso 1 |
| Las fotos del catálogo no aparecen | Se cargan al desplazarse; baja por el catálogo. Están en `trustinmuebles/public/img/casas/` y no necesitan internet |
| El visor del plano perimétrico no abre | Usa el botón **PDF** de la tarjeta (otra pestaña) o el plan B del paso 23 |
| La aplicación no responde | Continúa todo el recorrido con las capturas |
| «Sube el PDF del plano antes de marcarlo como presentado» | Es la regla de la v0.8: sube el PDF desde la tarjeta del plano |
| «El PDF pesa X MB incluso optimizado…» o «El archivo supera 25 MB» | Usa `plano-escaneado-grande.pdf` de `scripts/generar-pdf-demo.mjs` o el plan B del paso 16 |
| No aparece la confirmación al publicar | Recarga el caso y vuelve a pulsar **Publicar**; si no, plan B del paso 19 |

## Correspondencia con el recorrido automático

| Paso del guion | Paso de `recorrido-v09.mjs` | Captura |
|---|---|---|
| Login de las 8 cuentas | 1 | `01-login-8-cuentas.png` |
| Catálogo | 2 | `02-catalogo-comprador.png` |
| 1 a 12 | 3 a 14 | `03-…` a `14-…` |
| 16 | 15 | `15-pdf-grande-optimizado.png` |
| 17 | 16 | `16-ruta-regularizacion.png` |
| 13 y 18 | 17 | `17-panel-cartera.png` |
| 19 | 18 | `18-decision-captacion.png` |
| 20 | 19 | `19-filtro-rv02.png` |
| 21 | 20 | `20-tarjetas-resaltadas.png`, `20b-tarjetas-390px.png` |
| 22 | 21 | `21-santiago-documentos-lote.png` |
| 23 | 22 y 23 | `22-huarmey-sbn.png`, `23-supe-sbn.png` |
| 24 | 24 | `24-propietario-03.png` |
| PDF | 25 | `25-pdf-descargas.png` |
| 14 | 26 | `26-retira-autorizacion.png` |
| 15 | 27 | `27-pie-y-login.png` |

Para repetir la verificación: con el backend en una base nueva y la interfaz en 5173,
`APP_SEED_PASSWORD=<la del backend> node docs/pruebas/uso-v09/recorrido-v09.mjs` (Git Bash) o
`$env:APP_SEED_PASSWORD='<la del backend>'; node docs/pruebas/uso-v09/recorrido-v09.mjs` (PowerShell).
