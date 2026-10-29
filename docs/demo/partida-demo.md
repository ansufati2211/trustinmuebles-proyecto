# Partida de demostración (FICTICIA): captación en vivo con revisor-01

> **Todo en esta partida es inventado**: número, predio, títulos, montos y banco. No corresponde a ningún predio real
> ni a ninguna persona. No contiene nombres, DNI, teléfonos ni domicilios de personas naturales: el titular figura como
> «persona natural, datos omitidos».

- **Número:** `99000404`, sin prefijo `SIM-`. El servidor rechaza el prefijo en una partida transcrita: exige
  `[A-Z]?[0-9]{8}` ([CasoDtos.java:133](../../trustinmuebles-backend/src/main/java/pe/trustinmuebles/expediente/CasoDtos.java#L133)),
  y el formulario lo quita al escribir (`normalizarNumero`). No coincide con los 10 casos semilla (`SIM-11048217` …
  `SIM-11104029`), ni con los números de las pruebas o de la documentación, ni con la base local `data/h2`.
- **Cuenta:** iniciar sesión como `revisor-01` → Expedientes → «Registrar partida» (o `#/casos/nueva`).
- **Para repetir la demo:** abrir la partida y usar «Eliminar partida transcrita»; si no, el segundo registro da
  «La partida 99000404 ya está registrada».

> **Precio referencial (150000):** no se puede ingresar. Ni el formulario ni `POST /casos` tienen ese campo: hoy solo lo
> cargan los casos semilla desde su JSON ([CasosSeeder.java:94](../../trustinmuebles-backend/src/main/java/pe/trustinmuebles/expediente/CasosSeeder.java#L94)).
> El caso se verá sin precio en el catálogo. El precio no interviene en el semáforo.

## 1. Campos del formulario, en el orden de la pantalla

### Paso 1 · Datos de la partida

| Campo del formulario | Valor exacto a ingresar |
|---|---|
| Número de partida | `99000404` |
| Denominación del predio | `Mz. P Lote 4 · Hab. Urb. Brisas del Tacaraca · Ica` |
| Código de cuenta del propietario | `propietario-02` |
| Distrito | `Ica, Ica` (el servidor guarda «Ica» como distrito) |
| Fecha de la consulta | Dejar la de hoy (viene por defecto; no admite fechas futuras) |
| Completitud | `Completa` (por defecto) |
| Condición representada | `Lote urbano inscrito en el Registro de Predios.` (por defecto; ver nota en §3) |
| Zona registral | `Zona Registral N.° XI - Sede Ica` (por defecto) |
| Oficina registral | `Oficina Registral de Ica` (por defecto) |
| Ubicación | `Mz. P Lote 4, Habilitación Urbana Brisas del Tacaraca, distrito, provincia y departamento de Ica` |
| Área (m²) | `160.00` (se completa sola al pulsar «Leer asientos») |

### Paso 2 · Pega el texto de la partida

| Campo del formulario | Valor exacto a ingresar |
|---|---|
| Texto de la partida | Pegar el bloque de la §2 completo |
| Botón «Leer asientos» | Pulsarlo. No debe aparecer el recuadro «Avisos de la lectura» |

### Paso 3 · Corrige los asientos y la descripción

| Campo del formulario | Valor exacto a ingresar |
|---|---|
| Tipo de predio | `Vivienda` |
| Área construida inscrita (m²) | `120.00` (la que declara el asiento F00001) |
| Plano arquitectónico → Estado | `No presentado` (por defecto, no tocar) |
| Plano de estructuras → Estado | `No presentado` (por defecto, no tocar) |
| Plano de instalaciones eléctricas → Estado | `No presentado` (por defecto, no tocar) |
| Plano de instalaciones sanitarias → Estado | `No presentado` (por defecto, no tocar) |
| Asientos | Los cuatro se llenan solos; comprobar que queden así (no editar): |
| · C00001 | Tipo `Compraventa` · Titulares `persona natural, datos omitidos` · Título `2014-00040401` · Presentación 03/02/2014 · Inscripción 17/02/2014 |
| · D00001 | Tipo `Hipoteca` · aparece como cancelada por E00001 · Título `2015-00040402` · Presentación 10/03/2015 · Inscripción 24/03/2015 |
| · E00001 | Tipo `Cancelación` · Asiento que cancela `D00001` · Título `2022-00040403` · Presentación 05/09/2022 · Inscripción 19/09/2022 |
| · F00001 | Tipo `Otro acto` (declaratoria de fábrica) · Título `2016-00040404` · Presentación 11/07/2016 · Inscripción 25/07/2016 |
| Linderos y medidas perimétricas | Se llena solo («Por el frente: con la Calle Los Huarangos, en 8.00 ml. …») |
| Antecedente dominial | Se llena solo («Independizado de la partida N.° 40000404, …») |
| Nota (opcional) | Vacío |

### Paso 4 · Vista previa sin datos personales

| Campo del formulario | Valor exacto a ingresar |
|---|---|
| Nombres detectados | Debe decir `(0)` y «No se detectó ningún nombre de persona.» |
| ¿Quedó un nombre sin ocultar? | Vacío |
| Casilla «Revisé la vista previa y confirmo que no contiene nombres, DNI ni domicilios de personas naturales.» | **Marcar** |
| Botón «Registrar partida» | Pulsar. Lleva a `#/casos/99000404` |

El caso nace en **borrador**, asignado a `propietario-02` y sin autorización. Para publicarlo, `propietario-02` autoriza
y luego el gestor publica; el color del indicador A no lo impide.

## 2. Texto para copiar

```text
PARTIDA N.° 99000404 (FICTICIA, SOLO PARA DEMOSTRACIÓN)
Zona Registral N.° XI - Sede Ica · Oficina Registral de Ica · Registro de Predios

RUBRO A: ANTECEDENTE DOMINIAL
Independizado de la partida N.° 40000404, que corresponde al lote matriz de la Habilitación Urbana Brisas del Tacaraca.

RUBRO B: DESCRIPCIÓN DEL INMUEBLE
Mz. P Lote 4 de la Habilitación Urbana Brisas del Tacaraca, distrito, provincia y departamento de Ica. Vivienda.
Área del terreno: 160.00 m2. Perímetro: 52.00 ml.
Linderos y medidas perimétricas:
Por el frente: con la Calle Los Huarangos, en 8.00 ml.
Por la derecha entrando: con el Lote 5 de la Mz. P, en 20.00 ml.
Por la izquierda entrando: con el Lote 3 de la Mz. P, en 20.00 ml.
Por el fondo: con el Lote 15 de la Mz. P, en 4.00 ml y 4.00 ml.

RUBRO C: TÍTULOS DE DOMINIO
C00001
COMPRAVENTA. Se inscribe el dominio del predio a favor de persona natural, datos omitidos. Precio pactado en soles, pagado según consta en el título. Título N.° 2014-00040401. Fecha de presentación: 03/02/2014. Fecha de inscripción: 17/02/2014.

RUBRO D: GRAVÁMENES Y CARGAS
D00001
HIPOTECA. Se constituye hipoteca sobre el predio a favor de BANCO FICTICIO DEL PACÍFICO S.A., hasta por la suma de S/ 90,000.00, en garantía de un préstamo. Título N.° 2015-00040402. Fecha de presentación: 10/03/2015. Fecha de inscripción: 24/03/2015.

RUBRO E: CANCELACIONES
E00001
CANCELACIÓN DE HIPOTECA. Se cancela totalmente la hipoteca inscrita en el asiento D00001 de esta partida, por haberse pagado el préstamo garantizado. Título N.° 2022-00040403. Fecha de presentación: 05/09/2022. Fecha de inscripción: 19/09/2022.

RUBRO F: OTROS
F00001
DECLARATORIA DE FÁBRICA. Se declara la fábrica de una vivienda de dos pisos con área construida total de 120.00 m2, en albañilería confinada. Título N.° 2016-00040404. Fecha de presentación: 11/07/2016. Fecha de inscripción: 25/07/2016.
```

No hay ninguna carga vigente: no aparece embargo, bloqueo, demanda, medida cautelar, servidumbre ni carga técnica. La
única hipoteca (D00001) está cancelada por E00001.

## 3. Resultado esperado del indicador A: **GRIS** («información insuficiente»)

Base: reglas `v0.4` (`app.reglas.version` en `application.properties`), motor
[MotorClasificacion.java](../../trustinmuebles-backend/src/main/java/pe/trustinmuebles/clasificacion/MotorClasificacion.java)
y reglas en [contenido/v0.4/reglas.json](../../trustinmuebles-backend/src/main/resources/contenido/v0.4/reglas.json).

**Por qué GRIS.** El predio es una vivienda y no tiene presentados los planos de arquitectura ni de estructuras. El
motor los cuenta como datos mínimos faltantes
([MotorClasificacion.java:50](../../trustinmuebles-backend/src/main/java/pe/trustinmuebles/clasificacion/MotorClasificacion.java#L50)).
Con cualquier faltante, el estado es GRIS antes de mirar las alertas
([línea 66](../../trustinmuebles-backend/src/main/java/pe/trustinmuebles/clasificacion/MotorClasificacion.java#L66)).

**Faltantes que mostrará:**
- Plano arquitectónico
- Plano de estructuras

**Motivos que mostrará, en este orden:**
1. *FALTANTE* · «Faltan datos mínimos para evaluar el caso: Plano arquitectónico, Plano de estructuras.»
2. *ALERTA* (RV-04) · «Falta un plano de instalaciones (Plano de instalaciones eléctricas (II.EE.)): El expediente
   técnico de la vivienda no incluye este plano. Sin él no se puede contrastar lo construido con lo proyectado; una
   inspección presencial ayuda a suplirlo.»
3. *ALERTA* (RV-04) · Lo mismo para «Plano de instalaciones sanitarias (II.SS.)».
4. *LIMITE* · «Las alertas conocidas se conservan. Con información incompleta no se descartan otras alertas.»

Reglas aplicadas: `RV-04` (regla `PLANO_NO_PRESENTADO`,
[MotorClasificacion.java:112](../../trustinmuebles-backend/src/main/java/pe/trustinmuebles/clasificacion/MotorClasificacion.java#L112)).

**Por qué la hipoteca no cuenta.** El servidor marca D00001 como `CANCELADA` porque E00001 la cancela
([NormalizadorAsientos.java:69](../../trustinmuebles-backend/src/main/java/pe/trustinmuebles/expediente/NormalizadorAsientos.java#L69)).
RV-02 «Hipoteca vigente» solo se aplica a anotaciones `VIGENTE`
([MotorClasificacion.java:105](../../trustinmuebles-backend/src/main/java/pe/trustinmuebles/clasificacion/MotorClasificacion.java#L105)).

**Nota sobre la condición.** Las reglas v0.4 solo contemplan los dos textos de «Lote urbano…», que son las dos
opciones del formulario. Se deja la opción por defecto, aunque el predio sea vivienda, para que la condición no sume
otro GRIS (ver paso 4 de la §4).

## 4. Subsanación en el editor del expediente (para mostrar el cambio de color)

Abrir `#/casos/99000404` como `revisor-01` → tarjeta «Editar partida». Tras cada paso, pulsar
**«Guardar y recalcular»**. Cada guardado queda en el historial de evaluaciones.

| Paso | Qué cambiar en el editor | Color resultante | Qué muestra |
|---|---|---|---|
| 0 | (estado tras registrar) | **GRIS** | Faltantes de arquitectura y estructuras + 2 alertas RV-04 |
| 1 | Plano arquitectónico → `Presentado`, área construida del plano `120.00`. Plano de estructuras → `Presentado`, sistema `Albañilería confinada` | **AMARILLO** | Sin faltantes; quedan las 2 alertas RV-04 (II.EE. y II.SS.) |
| 2 | Plano de instalaciones eléctricas → `Presentado`. Plano de instalaciones sanitarias → `Presentado` | **VERDE** | «No se detectaron alertas en los campos evaluados (1 anotación(es) revisada(s)). Esto no significa saneamiento.» |

Variantes opcionales para mostrar otras reglas (partiendo de VERDE):

| Paso | Qué cambiar | Color | Regla |
|---|---|---|---|
| 3 | Área construida del plano arquitectónico → `135.00` (difiere más de 1 % de la inscrita, 120.00) | **AMARILLO** | RV-05 «El plano y la partida no coinciden en el área construida». Volver a `120.00` → VERDE |
| 4 | Condición representada → `Vivienda urbana inscrita en el Registro de Predios.` | **GRIS** | Motivo CONDICION: «La condición representada del caso no está contemplada por la versión de reglas aplicada.» Restaurar el texto original → VERDE |
| 5 | Quitar el asiento E00001 (icono de papelera) | **AMARILLO** | RV-02 «Hipoteca vigente (D00001)». Para volver a VERDE, agregar de nuevo E00001 (Cancelación, cancela D00001) |
| 6 | Cualquier plano → `Observado` | **AMARILLO** | RV-06 «Plano observado por el revisor» |

## 5. Verificación realizada (2026-10-27)

- **Formulario:** el texto se probó con el código real de `leerPartida.ts` y `disociar.ts`. Resultado: 4 asientos, 0
  avisos, 0 nombres detectados, ningún texto alterado por la limpieza, área 160.00 y linderos y antecedente
  reconocidos.
- **Servidor:** una prueba temporal de integración (perfil `test`, H2 en memoria) envió el mismo cuerpo que arma el
  formulario. Respuestas:
  - `POST /api/v1/casos`: 201, titularidad «persona natural, datos omitidos», D00001 `CANCELADA`, publicación
    `BORRADOR` con `propietario-02`.
  - Indicador A: GRIS con los motivos de la §3.
  - Pasos 1 a 5 de la §4: AMARILLO → VERDE → AMARILLO (RV-05) → VERDE → GRIS (condición) → VERDE → AMARILLO (RV-02).

  La prueba (1 ejecutada, 0 fallos) y sus reportes se borraron. El repositorio quedó sin cambios aparte de este
  documento. El paso 6 no se ejecutó; se deduce de la regla `PLANO_OBSERVADO`.
