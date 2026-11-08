# Guion de la demo (v0.8.0): recorrido de 15 pasos con SIM-99000404 y 6 pasos de la v0.8

Los pasos 1 a 15 siguen el orden de [recorrido-v07.mjs](../pruebas/recorrido-v07.mjs), con el paso 7 ajustado a la v0.8 (el plano
se presenta subiendo su PDF). Los pasos 16 a 21 muestran lo nuevo de la v0.8 y siguen [recorrido-v08.mjs](../pruebas/recorrido-v08.mjs)
(20 de 20 pasos correctos el 2 de noviembre de 2026). Para esta presentación, este guion reemplaza a
[partida-demo.md](partida-demo.md), que quedó desactualizado: usa el número sin `SIM-`, un perímetro de 52.00 ml y dice que el
precio no se puede ingresar.

## Antes de presentar

1. Cierra todas las terminales del backend y de la interfaz y ejecuta, desde la raíz del proyecto:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\reiniciar-demo.ps1
   ```

   Borra `trustinmuebles-backend/data/`. Hazlo también después de cada ensayo: SIM-99000404 solo se puede registrar una vez, y el
   informe del paso 12 ya no se puede repetir sobre SIM-11075836.
2. Si el script dice que el puerto 8080 está ocupado, libéralo. El backend no arranca sin ese puerto.
3. Copia los dos comandos que imprime el script, uno en cada terminal. Elige una contraseña de al menos 8 caracteres: la
   usarás en todas las cuentas. Si Maven falla por el certificado (Norton intercepta el TLS), ejecuta esto antes en esa terminal:

   ```powershell
   $env:MAVEN_OPTS = '-Djavax.net.ssl.trustStoreType=Windows-ROOT'
   ```

4. Abre `http://localhost:5173` en Chrome y deja abiertas las carpetas `docs/pruebas/capturas-v07/` y `docs/pruebas/capturas-v08/`
   para el plan B.
5. **v0.8:** genera los PDF de la demo con `node scripts/generar-pdf-demo.mjs`. Imprime dónde quedaron `plano-chico.pdf` y
   `plano-escaneado-grande.pdf` (unos 5,4 MB). Son ficticios y no quedan en el repositorio. Un plano ya no se puede marcar
   «Presentado» sin su PDF.

**Cambiar de cuenta.** Pulsa el icono «Cerrar sesión», arriba a la derecha, y ve a `http://localhost:5173/#/login`. Toca la tarjeta
de la cuenta, escribe la contraseña y pulsa **Ingresar al sistema**.

**Casos que no se editan.** No edites SIM-11048217, SIM-11052690, SIM-11061555 ni SIM-11070419. Todo cambio se hace en SIM-99000404;
SIM-11048217 solo se abre para mirar en el paso 9, y SIM-11075836 recibe la solicitud y el informe. SIM-11104029 solo se edita si hace
falta el plan B del paso 7.

**Límites para las capturas del plan B.** Son del 30 de octubre, anteriores al ajuste de textos y hechas con una partida abreviada:

- Las capturas 01 y 04 a 12 todavía dicen «ingeniero civil o arquitecto colegiado» en el indicador B. Si se ve, aclara: «La captura es
  anterior al ajuste del texto. La inspección la realiza un especialista de la inmobiliaria y los perfiles son ficticios».
- Las capturas 01 y 04 a 08 muestran solo el asiento C00001. En vivo verás 4 asientos.
- Las capturas 01 y 04 a 08, 13 y 14 son del recorrido anterior, con los planos presentados desde el registro: muestran amarillo y
  luego verde. En vivo verás gris y luego amarillo. Si se ve, aclara: «La captura usa otros planos de partida; las reglas son las mismas».
- Cada captura muestra el estado final del paso, no el momento de pulsar el botón.
- Son imágenes muy largas: amplía la zona indicada en cada paso.

## Datos de la partida

| Campo | Valor |
|---|---|
| Origen de la partida | `Simulada para demostración` |
| Precio referencial en soles | `150000` |
| Número de partida | `SIM-99000404` |
| Denominación del predio | `Mz. Z Lote 4 · Hab. Urb. Demostración · Ica` |
| Código de cuenta del propietario | `propietario-02` |
| Distrito | `Ica, Ica` |
| Ubicación | `Mz. Z, Lote 4, distrito de Ica.` |
| Área (m²) | No la escribas: «Leer asientos» pone `160.00` |
| Tipo de predio | `Vivienda` |
| Área construida inscrita (m²) | `90.00` |
| Los cuatro planos | `No presentado` |
| Condición | `Lote urbano inscrito en el Registro de Predios.` |
| Completitud | `Completa` |
| Fecha, zona y oficina | Déjalos como vienen |

No contiene datos personales: la titular es una empresa ficticia, Inmobiliaria Demo Sur S.A.C. El perímetro de 56.00 ml solo aparece en
este texto: la pantalla muestra los linderos (8 + 20 + 20 + 8 = 56 ml), no el perímetro.

## Texto para pegar

Copia desde `PARTIDA` hasta la última línea, sin las marcas del bloque.

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

## Recorrido

### Paso 1. El revisor registra la partida

- **Cuenta:** `revisor-01`
- **Pantalla:** menú **Registrar partida** (`#/casos/nueva`)
- **Botones, en orden:**
  1. Llena la tabla de «Datos de la partida».
  2. Pega el texto en **Texto de la partida** y pulsa **Leer asientos**.
  3. Elige **Tipo de predio** `Vivienda` y escribe **Área construida inscrita (m²)** `90.00`.
  4. Deja los cuatro planos en `No presentado`: arquitectónico, estructuras, instalaciones eléctricas e instalaciones sanitarias.
  5. Revisa que **Condición** diga `Lote urbano inscrito en el Registro de Predios.` y **Completitud**, `Completa`.
  6. Marca «Revisé la vista previa y confirmo que no contiene nombres, DNI ni domicilios de personas naturales».
  7. Pulsa **Registrar partida**.
- **Debe verse:** antes de registrar, sin «Avisos de la lectura» y con «Nombres detectados (0)». Después, el caso con **Gris:
  Información insuficiente o condición no evaluable**, precio S/ 150,000, insignia de borrador y «Sin autorización del propietario».
- **Frase:** «El revisor captura la partida y el sistema calcula el indicador A al instante. El caso nace en borrador: nadie
  más lo ve todavía».
- **Plan B:** `01-registro-borrador.png`. Amplía el encabezado y el panel «Publicación y autorización».

### Paso 2. El comprador no ve el borrador

- **Cuenta:** `comprador-01`
- **Pantalla:** menú **Expedientes** (`#/casos`), luego la dirección `#/casos/SIM-99000404`
- **Botón:** ninguno. Escribe la dirección en el navegador.
- **Debe verse:** 10 casos, sin SIM-99000404. Por dirección: «No encontramos este expediente en la cartera».
- **Frase:** «Aunque el comprador conozca el número, el servidor no le entrega un caso sin publicar».
- **Plan B:** `02-comprador-no-ve-borrador.png`. Muestra el mensaje por dirección; el catálogo no aparece en la captura.

### Paso 3. Otro propietario tampoco lo ve

- **Cuenta:** `propietario-01`
- **Pantalla:** menú **Mis inmuebles** (`#/mis-inmuebles`), luego `#/casos/SIM-99000404`
- **Botón:** ninguno.
- **Debe verse:** el caso no está en la lista. Por dirección: «No encontramos este expediente en la cartera».
- **Frase:** «Cada propietario ve solo sus casos. Este pertenece a propietario-02».
- **Plan B:** `03-propietario-ajeno.png`.

### Paso 4. El gestor no puede publicar sin autorización

- **Cuenta:** `gestor-01`
- **Pantalla:** `#/casos/SIM-99000404`, panel **Publicación y autorización**
- **Botón:** ninguno. El punto es que **Publicar** no aparece.
- **Debe verse:** «No se puede publicar hasta que el propietario autorice el caso».
- **Frase:** «El indicador no decide la publicación. Lo que falta es la autorización del propietario, y el servidor también la exige».
- **Plan B:** `04-gestor-sin-autorizacion.png`. Amplía el panel «Publicación y autorización».

### Paso 5. El propietario autoriza

- **Cuenta:** `propietario-02`
- **Pantalla:** menú **Mis inmuebles**, luego `#/casos/SIM-99000404`
- **Botón:** **Autorizar publicación**
- **Debe verse:** el caso en Mis inmuebles y, tras pulsar, «Autorización registrada.». Sigue en borrador.
- **Frase:** «Autorizar no publica: solo habilita al gestor. Y no cambia el indicador A».
- **Plan B:** `05-propietario-autoriza.png`. Amplía el panel «Publicación y autorización».

### Paso 6. El revisor ve el indicador A y el historial

- **Cuenta:** `revisor-01`
- **Pantalla:** `#/casos/SIM-99000404`, secciones del indicador A y **Historial de evaluaciones**
- **Botón:** ninguno.
- **Debe verse:** Gris, con el plano arquitectónico y el de estructuras como datos faltantes, dos alertas por los planos de
  instalaciones y una entrada de historial «Partida simulada incorporada».
- **Frase:** «El gris no es una mala noticia: sin los planos principales, el sistema no evalúa. La hipoteca no alerta porque su
  cancelación está inscrita».
- **Plan B:** `06-revisor-a-e-historial.png`. Amplía los motivos y el historial.

### Paso 7. El revisor subsana subiendo los PDF de los planos

- **Cuenta:** `revisor-01`
- **Pantalla:** `#/casos/SIM-99000404`, sección **Expediente técnico de planos (2D)**
- **Botones:**
  1. En **Editar partida**, muestra que en **Plano arquitectónico** las opciones `Presentado` y `Observado` dicen «(sube el PDF
     primero)» y no se pueden elegir.
  2. En la tarjeta **Arquitectura** del panel de planos, elige `plano-chico.pdf` y pulsa **Subir PDF (queda presentado)**.
  3. Repite con la tarjeta **Estructuras**.
- **Debe verse:** «Archivo guardado.», cada tarjeta en **Presentado** con «Subido por revisor-01 el …» y **Descargar**, el indicador en
  amarillo con las dos alertas de instalaciones y dos entradas nuevas «Plano incorporado o adjuntado» (la segunda, de Gris a Amarillo).
  La entrada anterior se conserva.
- **Frase:** «Un plano ya no aparece como presentado sin su archivo: lo que se ve tiene respaldo. El color no se elige: lo recalculan
  las reglas. Pasó de gris a amarillo porque ya se puede evaluar, y aún faltan los planos de instalaciones».
- **Plan B:** edita SIM-11104029. En **Plano de estructuras**, cambia Estado de `Observado` a `Presentado` y pulsa **Guardar y
  recalcular**. Debe verse el mensaje «Guardado…», una entrada nueva en el historial y el indicador en amarillo por la carga técnica
  vigente (D00001): corregir un plano no levanta esa carga. Después sigue con la captura `07-subsanacion.png`.

### Paso 8. El gestor publica

- **Cuenta:** `gestor-01`
- **Pantalla:** `#/casos/SIM-99000404`, panel **Publicación y autorización**
- **Botón:** **Publicar**
- **Debe verse:** «Caso publicado.» y el indicador A sigue en amarillo.
- **Frase:** «Publicar cambia quién puede verlo, no lo que dice el indicador».
- **Plan B:** `08-gestor-publica.png`. Amplía el panel «Publicación y autorización».

### Paso 9. El comprador consulta y pide contacto e inspección

- **Cuenta:** `comprador-01`
- **Pantalla:** `#/casos`, luego `#/casos/SIM-11048217` y `#/casos/SIM-11075836`
- **Botones:**
  1. En el catálogo, señala la tarjeta de SIM-99000404.
  2. En SIM-11048217, solo para mirar: muestra **Ver lámina** en la sección de planos y toca el término **Albañilería confinada** en
     **Glosario de este expediente**.
  3. En SIM-11075836: **Solicitar contacto**, deja el motivo `Información general` y pulsa **Enviar solicitud**.
  4. **Solicitar inspección técnica**, luego **Confirmar solicitud**.
- **Debe verse:** SIM-99000404 con S/ 150,000 en el catálogo. En SIM-11075836: «Solicitud registrada el…», «Solicitud registrada a
  nombre de comprador-01…», «Pendiente de asignación por el gestor» y el indicador A en rojo.
- **Frase:** «El comprador entiende los términos sin salir del expediente. Puede pedir la inspección incluso con un rojo, y esa
  solicitud no cambia el color».
- **Plan B:** `09-comprador-consulta.png`. Muestra SIM-11075836 al final del paso: amplía el indicador B y «Contacto con la
  inmobiliaria». El catálogo y SIM-11048217 no aparecen en la captura.

### Paso 10. El gestor atiende y asigna

- **Cuenta:** `gestor-01`
- **Pantalla:** menú **Cartera** (`#/cartera`), luego `#/casos/SIM-11075836`
- **Botones:**
  1. **Marcar atendida**
  2. En **Cuenta del especialista**, elige `especialista-02`.
  3. **Asignar**
- **Debe verse:** «Solicitud de comprador-01 sobre SIM-11075836 marcada como atendida.» y «Inspección asignada a especialista-02. El
  indicador A no cambió.»
- **Frase:** «El gestor reparte el trabajo. Sin asignación, ningún especialista puede emitir».
- **Plan B:** `10-gestor-atiende-asigna.png`. Amplía «Asignar especialista»; la bandeja de contactos no aparece en la captura.

### Paso 11. Un especialista no asignado no puede emitir

- **Cuenta:** `especialista-01`
- **Pantalla:** `#/casos/SIM-11075836`, sección del indicador B
- **Botón:** ninguno. No hay formulario de informe.
- **Debe verse:** «Esta inspección está asignada a otro especialista: solo esa cuenta puede emitir el informe.»
- **Frase:** «El permiso no depende solo del rol: depende de a quién se asignó esta inspección».
- **Plan B:** `11-especialista-no-asignado.png`. Amplía el aviso.

### Paso 12. El especialista asignado emite el informe

- **Cuenta:** `especialista-02`
- **Pantalla:** `#/casos/SIM-11075836`, formulario **Informe técnico**
- **Botones:**
  1. **Estado**: `Informe emitido`.
  2. **Conclusión del informe**: `Favorable`.
  3. **Fecha de la inspección presencial**: el día de ayer.
  4. Las cuatro verificaciones por especialidad: `Conforme`, una por una.
  5. **Conclusiones sustentadas por la inspección**: `Sin observaciones físicas en la inspección visual.`
  6. **Guardar informe**
- **Debe verse:** «Informe emitido. El indicador A (documental) no cambió.», firma «Arq. Perfil Ficticio 02», «Perfil ficticio de
  demostración» y el indicador A en rojo.
- **Frase:** «La inspección la realiza un especialista de la inmobiliaria y este perfil es ficticio. Aunque el informe sea favorable,
  el embargo sigue en la partida: B nunca cambia A».
- **Plan B:** `12-especialista-emite.png`. Amplía la credencial y el mensaje del formulario.

### Paso 13. El gestor revisa el panel de cartera

- **Cuenta:** `gestor-01`
- **Pantalla:** menú **Cartera** (`#/cartera`)
- **Botón:** ninguno.
- **Debe verse:** 11 casos, 11 publicados, 2 verdes, 0 contactos pendientes y 2 inspecciones: una asignada a `especialista-01` y otra
  «Pendiente de asignación por el gestor».
- **Frase:** «Todo lo que hicimos se refleja en el panel. Las cifras salen de la cartera, no se cargan a mano».
- **Plan B:** `13-panel-cartera.png`.

### Paso 14. El propietario retira la autorización

- **Cuenta:** `propietario-02`, luego `comprador-01`
- **Pantalla:** `#/casos/SIM-99000404`. Con el comprador, `#/casos` y la misma dirección del caso
- **Botón:** **Retirar autorización**
- **Debe verse:** «Autorización retirada.», el caso retirado y el indicador A en amarillo. El comprador ya no lo ve en el catálogo y, por
  dirección, recibe «No encontramos este expediente en la cartera».
- **Frase:** «El propietario conserva el control: si retira su autorización, el caso sale del catálogo. El indicador no cambia».
- **Plan B:** `14-retira-autorizacion.png`. Muestra lo que ve el comprador al final; el botón no aparece en la captura.

### Paso 15. Los límites siempre están a la vista

- **Cuenta:** `comprador-01`, luego sin sesión
- **Pantalla:** el pie de `#/casos`, y después `#/login`
- **Botón:** icono **Cerrar sesión**
- **Debe verse:** en el pie, «No certifica saneamiento.», «No recomienda comprar.», «No reemplaza asesoría legal.», «Los datos y los
  especialistas son simulados.» y «La verificación jurídica con abogado o notario se realiza fuera del sistema.». En el login: «Entorno
  académico demostrativo».
- **Frase:** «Esto es una orientación, no una certificación. La verificación jurídica con abogado o notario sigue fuera del sistema».
- **Plan B:** `15-pie-y-login.png`. Muestra solo el login. Para el pie, usa el final de `13-panel-cartera.png`.

## Pasos de la v0.8

Hazlos después del paso 13 (antes de retirar la autorización). No edites La Tinguiña: solo se mira.

### Paso 16. Subir un PDF pesado: límite y optimización

- **Cuenta:** `revisor-01`
- **Pantalla:** `#/casos/SIM-99000404`, tarjeta **Instalaciones eléctricas (II.EE.)**
- **Botones:** elige `plano-escaneado-grande.pdf` y pulsa **Subir PDF (queda presentado)**.
- **Debe verse:** antes de subir, «Se optimizará automáticamente: pesa 5,4 MB y el máximo guardado es 10 MB.»; después, «Optimizado:
  5,4 MB → 0,1 MB» y el origen «Subido por revisor-01 …, 0,1 MB (optimizado desde 5,4 MB)».
- **Frase:** «Se aceptan hasta 25 MB. Si el PDF pesa más de 5 MB, el sistema reduce sus imágenes y guarda solo el resultado, con su
  huella; si aun así pasa de 10 MB, lo rechaza con un mensaje claro. Más de 25 MB ni siquiera se envía».
- **Plan B:** `03-pdf-grande-optimizado.png` y, para el rechazo sin archivo, `02-plano-sin-pdf-y-subida.png`.

### Paso 17. La ruta de regularización

- **Cuenta:** `comprador-01`
- **Pantalla:** `#/casos/SIM-11075836` y luego `#/casos/SIM-11052690`, sección **Ruta de regularización**
- **Botón:** ninguno.
- **Debe verse:** en Pueblo Nuevo, «Levantar el embargo vigente», **Gestiona: Juzgado** y **Esfuerzo alto**; en La Tinguiña, la
  hipoteca con **Esfuerzo medio**, «Acreedor: No consta. No consta en la partida: solicitar al propietario o al acreedor.» y los dos
  planos de instalaciones con esfuerzo bajo. Arriba, «Orientativo: no es asesoría legal ni recomendación de compra».
- **Frase:** «Para cada alerta, el sistema dice qué haría falta, quién lo gestiona y qué documento se necesita. No damos plazos ni
  costos: dependen del trámite y se consultan con un abogado o notario».
- **Plan B:** `14-ruta-regularizacion.png`.

### Paso 18. La cartera por tipo de problema

- **Cuenta:** `gestor-01`
- **Pantalla:** menú **Cartera** (`#/cartera`)
- **Botón:** en **Casos por tipo de alerta**, pulsa **RP-01 · Embargo vigente**.
- **Debe verse:** las tarjetas «Casos por tipo de alerta», «Esfuerzo de regularización» y «Gestión inmobiliaria (interno)» con la matriz,
  la tabla «Por regularizar» y el aviso «Priorización interna de la inmobiliaria; no es una recomendación de compra». Al pulsar el tipo,
  la lista de casos queda filtrada.
- **Frase:** «Es lo que pidió el docente: de toda la cartera, cuántos tienen hipoteca, cuántos embargo, cuáles son más viables y
  cuáles tomarán más gestión. Es para organizar el trabajo de la inmobiliaria, no para recomendar una compra».
- **Plan B:** `15-panel-cartera.png`.

### Paso 19. El semáforo de gestión y la decisión de captación

- **Cuenta:** `gestor-01`, luego `comprador-01`
- **Pantalla:** `#/casos/SIM-11075836`, sección **Gestión inmobiliaria (interno)**
- **Botones:**
  1. **Decisión** `No captar por ahora`, **Motivo** `Proceso judicial` y **Registrar decisión**.
  2. En **Publicación y autorización**, **Retirar** y luego **Publicar**: acepta la confirmación.
  3. Con `comprador-01`, abre el mismo caso.
- **Debe verse:** «Gestión: Requiere regularización» con contorno discontinuo, la decisión en el historial con `gestor-01` y la fecha, el
  indicador A todavía en rojo, la confirmación «La decisión registrada es no captar por ahora. ¿Publicar de todos modos?» y el caso
  publicado. El comprador no ve el panel de gestión.
- **Frase:** «El semáforo de gestión es interno: ayuda a decidir si captar, pero no cambia los indicadores, no se le muestra al
  comprador y no impide publicar».
- **Plan B:** `16-decision-captacion.png` y `16b-panel-gestion.png`.

### Paso 20. Filtrar el catálogo por tipo de alerta

- **Cuenta:** `comprador-01`
- **Pantalla:** `#/casos`, botón **Filtros**
- **Botón:** **Tipo de alerta del indicador A** → `RV-02 · Hipoteca vigente`.
- **Debe verse:** solo La Tinguiña y el chip «Alerta · RV-02 · Hipoteca vigente».
- **Frase:** «El comprador también puede filtrar por el tipo de alerta del semáforo documental».
- **Plan B:** `17-filtro-tipo-alerta.png`.

### Paso 21. El color de A, resaltado y siempre con texto

- **Cuenta:** `comprador-01`
- **Pantalla:** `#/casos`; si se puede, con el ancho de un celular (herramientas de Chrome, 390 px)
- **Botón:** ninguno.
- **Debe verse:** cada tarjeta con un borde izquierdo y un fondo tenue de su color y la etiqueta «Indicador A: …» con ícono.
- **Frase:** «El color ayuda a ubicar los casos de un vistazo, pero nunca va solo: siempre lo acompaña un texto».
- **Plan B:** `18-tarjetas-resaltadas.png` y `18b-tarjetas-celular.png`.

## Si algo falla en vivo

| Síntoma | Qué hacer |
|---|---|
| «La partida … ya está registrada» | La base no está limpia. Sigue con el plan B y reinicia después de la presentación |
| Código de cuenta o contraseña incorrectos | Si la base es anterior, la contraseña nueva no aplica. Sigue con el plan B |
| Aparece «Avisos de la lectura» | Pegaste el texto incompleto. Vuelve a copiar el bloque y pulsa **Leer asientos** |
| «No se registró la partida» | Revisa origen, número con `SIM-` y propietario. Si persiste, usa el plan B del paso 1 |
| La aplicación no responde | Continúa todo el recorrido con las capturas |
| «Sube el PDF del plano antes de marcarlo como presentado» | Es la regla de la v0.8: sube el PDF desde la tarjeta del plano |
| «El PDF pesa X MB incluso optimizado…» o «El archivo supera 25 MB» | Usa `plano-escaneado-grande.pdf` de `scripts/generar-pdf-demo.mjs` o el plan B del paso 16 |
| No aparece la confirmación al publicar | Recarga el caso y vuelve a pulsar **Publicar**; si no, plan B del paso 19 |

## Verificación del guion

**v0.8:** los pasos 7 (nueva versión) y 16 a 21 se comprobaron con `recorrido-v08.mjs` el 2 de noviembre de 2026 (20 de 20, base nueva
fuera del repositorio). No se ensayaron a mano frente a la pantalla.

Ensayado el 31 de octubre de 2026 sobre el commit `8ba1600`, con Chrome automatizado y una base nueva fuera del repositorio. Usó el texto
y los datos de este guion. Los 15 pasos dieron el resultado esperado. En el paso 1, el script leyó la pantalla antes de terminar la
carga; al abrir el caso con espera se confirmó que muestra «Sin autorización del propietario».

No se ensayó a mano con una persona frente a la pantalla ni se midió la duración.

Ese ensayo es anterior al cambio de los pasos 1, 6, 7, 8, 13 y 14, y `recorrido-v07.mjs` conserva el recorrido anterior (amarillo a
verde). Los colores nuevos, gris a amarillo, y el plan B del paso 7 se comprobaron contra la API con una partida equivalente, no en
pantalla con este guion completo.
