# Guion de la demo: recorrido de 15 pasos con SIM-99000404

Sigue el orden de [recorrido-v07.mjs](../pruebas/recorrido-v07.mjs). Para esta presentación, este guion reemplaza a
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

4. Abre `http://localhost:5173` en Chrome y deja abierta la carpeta `docs/pruebas/capturas-v07/` para el plan B.

**Cambiar de cuenta.** Pulsa el icono «Cerrar sesión», arriba a la derecha, y ve a `http://localhost:5173/#/login`. Toca la tarjeta
de la cuenta, escribe la contraseña y pulsa **Ingresar al sistema**.

**Casos que no se editan.** No edites SIM-11048217, SIM-11052690, SIM-11061555 ni SIM-11070419. Todo cambio se hace en SIM-99000404;
SIM-11048217 solo se abre para mirar en el paso 9, y SIM-11075836 recibe la solicitud y el informe.

**Límites para las capturas del plan B.** Son del 30 de octubre, anteriores al ajuste de textos y hechas con una partida abreviada:

- Las capturas 01 y 04 a 12 todavía dicen «ingeniero civil o arquitecto colegiado» en el indicador B. Si se ve, aclara: «La captura es
  anterior al ajuste del texto. La inspección la realiza un especialista de la inmobiliaria y los perfiles son ficticios».
- Las capturas 01 y 04 a 08 muestran solo el asiento C00001. En vivo verás 4 asientos.
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
| Fecha, completitud, condición, zona y oficina | Déjalos como vienen |

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
  3. Elige **Tipo de predio** `Vivienda` y escribe **Área construida inscrita (m²)** `90`.
  4. En **Plano arquitectónico**: Estado `Presentado` y **Área construida del plano (m²)** `90`.
  5. En **Plano de estructuras**: Estado `Presentado`.
  6. Deja los dos planos de instalaciones en `No presentado`.
  7. Marca «Revisé la vista previa y confirmo que no contiene nombres, DNI ni domicilios de personas naturales».
  8. Pulsa **Registrar partida**.
- **Debe verse:** antes de registrar, sin «Avisos de la lectura» y con «Nombres detectados (0)». Después, el caso con **Amarillo:
  Requiere revisión**, precio S/ 150,000, insignia de borrador y «Sin autorización del propietario».
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
- **Debe verse:** Amarillo, con dos alertas por los planos de instalaciones faltantes, y una entrada de historial «Partida simulada
  incorporada».
- **Frase:** «El amarillo tiene motivos concretos: faltan dos planos. La hipoteca no alerta porque su cancelación está inscrita».
- **Plan B:** `06-revisor-a-e-historial.png`. Amplía los motivos y el historial.

### Paso 7. El revisor subsana

- **Cuenta:** `revisor-01`
- **Pantalla:** `#/casos/SIM-99000404`, tarjeta **Editar partida**, al final de la página
- **Botones:**
  1. **Plano de instalaciones eléctricas (II.EE.)**: Estado `Presentado`.
  2. **Plano de instalaciones sanitarias (II.SS.)**: Estado `Presentado`.
  3. **Guardar y recalcular**
- **Debe verse:** «Guardado. El estado se recalculó con las reglas…», el indicador en verde y una entrada nueva, «Plano incorporado o
  adjuntado», de Amarillo a Verde. La entrada anterior se conserva.
- **Frase:** «El color no se elige: lo recalculan las reglas. Verde significa sin alertas en los campos evaluados; no certifica
  saneamiento. Y el historial solo agrega, nunca borra».
- **Plan B:** `07-subsanacion.png`. Amplía el indicador A y el historial.

### Paso 8. El gestor publica

- **Cuenta:** `gestor-01`
- **Pantalla:** `#/casos/SIM-99000404`, panel **Publicación y autorización**
- **Botón:** **Publicar**
- **Debe verse:** «Caso publicado.» y el indicador A sigue en verde.
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
- **Debe verse:** 11 casos, 11 publicados, 3 verdes, 0 contactos pendientes y 2 inspecciones: una asignada a `especialista-01` y otra
  «Pendiente de asignación por el gestor».
- **Frase:** «Todo lo que hicimos se refleja en el panel. Las cifras salen de la cartera, no se cargan a mano».
- **Plan B:** `13-panel-cartera.png`.

### Paso 14. El propietario retira la autorización

- **Cuenta:** `propietario-02`, luego `comprador-01`
- **Pantalla:** `#/casos/SIM-99000404`. Con el comprador, `#/casos` y la misma dirección del caso
- **Botón:** **Retirar autorización**
- **Debe verse:** «Autorización retirada.», el caso retirado y el indicador A en verde. El comprador ya no lo ve en el catálogo y, por
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

## Si algo falla en vivo

| Síntoma | Qué hacer |
|---|---|
| «La partida … ya está registrada» | La base no está limpia. Sigue con el plan B y reinicia después de la presentación |
| Código de cuenta o contraseña incorrectos | Si la base es anterior, la contraseña nueva no aplica. Sigue con el plan B |
| Aparece «Avisos de la lectura» | Pegaste el texto incompleto. Vuelve a copiar el bloque y pulsa **Leer asientos** |
| «No se registró la partida» | Revisa origen, número con `SIM-` y propietario. Si persiste, usa el plan B del paso 1 |
| La aplicación no responde | Continúa todo el recorrido con las capturas |

## Verificación del guion

Ensayado el 31 de octubre de 2026 sobre el commit `8ba1600`, con Chrome automatizado y una base nueva fuera del repositorio. Usó el texto
y los datos de este guion. Los 15 pasos dieron el resultado esperado. En el paso 1, el script leyó la pantalla antes de terminar la
carga; al abrir el caso con espera se confirmó que muestra «Sin autorización del propietario».

No se ensayó a mano con una persona frente a la pantalla ni se midió la duración.
