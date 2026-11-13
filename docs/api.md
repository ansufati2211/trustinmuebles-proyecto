# API interna (HTTP/JSON)

Es una API interna de una sola aplicación. No hay integración externa ni adaptador estatal. La documentación interactiva
está en `http://localhost:8080/swagger-ui.html` con el backend encendido.

**Adhesión a REST (2.2.12):** usa recursos con rutas, verbos HTTP y códigos de estado, sin estado en el servidor (token JWT).
No ofrece enlaces hipermedia, así que no se afirma una adhesión completa a REST.

Todas las rutas empiezan por `/api/v1`. Salvo el login, exigen `Authorization: Bearer <token>`.

## Operaciones

| Operación | Ruta | Permiso | Respuestas |
|---|---|---|---|
| Iniciar sesión | `POST /auth/login` | Público | 200, 400, 401, 429 |
| Usuario actual | `GET /auth/me` | Sesión | 200, 401 |
| Catálogo, con filtros opcionales | `GET /casos?tipoInmueble=&estado=&estadoTecnico=&riesgoFisicoDetectado=&tipoAlerta=` | Sesión | 200, 400, 401 |
| Tipos de alerta para el filtro (v0.8) | `GET /casos/tipos-alerta` | Sesión | 200, 401 |
| Abrir un caso (por su partida simulada) | `GET /casos/{codigo}` | Sesión | 200, 401, 404 |
| Actualizar la partida y recalcular | `PUT /casos/{codigo}/expediente` | REVISOR | 200, 400, 401, 403, 404, 409 |
| Cambiar un ítem del checklist | `PATCH /casos/{codigo}/checklist/{itemId}` | REVISOR | 200, 400, 401, 403, 404 |
| Asociar un PDF propio al caso | `POST /casos/{codigo}/documento` (multipart, campo `documento`) | REVISOR | 201, 400, 401, 403, 404, 413 |
| Ver el PDF del caso | `GET /casos/{codigo}/documento` | Sesión | 200, 401, 404 |
| Solicitar la inspección técnica | `POST /casos/{codigo}/inspeccion/solicitud` | **COMPRADOR** | 201, 401, 403, 404, 409 |
| Registrar el avance o el informe técnico | `PUT /casos/{codigo}/inspeccion` | ESPECIALISTA | 200, 400, 401, 403, 404, 409, 422 |
| Ver el informe técnico en PDF | `GET /casos/{codigo}/inspeccion/documento` | Sesión | 200, 401, 404 |
| Ver la lámina o el PDF de un plano | `GET /casos/{codigo}/planos/{especialidad}/documento` | Sesión | 200, 401, 404 |
| Subir el PDF real de un plano (v0.8: también a un plano no presentado, que queda presentado) | `POST /casos/{codigo}/planos/{especialidad}/documento` | REVISOR | 201, 400, 401, 403, 404, 413, 422 |
| Ruta de regularización (v0.8) | `GET /casos/{codigo}/ruta-regularizacion` | Sesión, con la visibilidad del detalle | 200, 401, 404 |
| Registrar la decisión de captación (v0.8) | `POST /casos/{codigo}/decision-captacion` (`{"decision","motivo"}`) | **GESTOR** | 201, 400, 401, 403, 404 |
| Historial de decisiones de captación (v0.8) | `GET /casos/{codigo}/decisiones-captacion` | **GESTOR**, **REVISOR** | 200, 401, 403, 404 |
| Captar una partida transcrita o simulada | `POST /casos` | REVISOR | 201, 400, 401, 403, 409 |
| Eliminar una partida captada | `DELETE /casos/{codigo}` | REVISOR | 204, 401, 403, 404, 409 |
| Glosario cerrado | `GET /glosario` | Sesión | 200, 401 |
| Autorizar la publicación (v0.7) | `PUT /casos/{codigo}/autorizacion` | **PROPIETARIO** del caso | 200, 401, 403, 404 |
| Retirar la autorización (v0.7) | `DELETE /casos/{codigo}/autorizacion` | **PROPIETARIO** del caso | 200, 401, 403, 404 |
| Publicar un caso (v0.7) | `POST /casos/{codigo}/publicacion` | **GESTOR** | 200, 401, 403, 404, 409, 422 |
| Retirar la publicación (v0.7) | `DELETE /casos/{codigo}/publicacion` | **GESTOR** | 200, 401, 403, 404, 409 |
| Asignar especialista a una inspección (v0.7) | `PUT /casos/{codigo}/inspeccion/asignacion` (`{"especialistaCodigo"}`) | **GESTOR** | 200, 400, 401, 403, 404, 409 |
| Solicitar contacto (v0.7) | `POST /casos/{codigo}/contactos` (`{"motivo"}`) | **COMPRADOR** | 201, 400, 401, 403, 404, 409 |
| Listar contactos (v0.7) | `GET /contactos?estado=PENDIENTE\|ATENDIDA` | **GESTOR** | 200, 401, 403 |
| Marcar un contacto atendido (v0.7) | `PUT /contactos/{id}/atencion` | **GESTOR** | 200, 401, 403, 404, 409 |
| Panel de cartera (v0.7; v0.8 con tipos de alerta, esfuerzo y gestión) | `GET /cartera/panel` | **GESTOR** | 200, 401, 403 |
| Historial de evaluaciones del indicador A (v0.7) | `GET /casos/{codigo}/historial` | REVISOR, GESTOR, ESPECIALISTA, PROPIETARIO del caso | 200, 401, 403 (comprador), 404 |

**Visibilidad (v0.7):** el COMPRADOR solo ve casos `PUBLICADO` y el PROPIETARIO solo los suyos (listado, detalle, PDF y
solicitud de inspección); para los demás la respuesta es 404. REVISOR, GESTOR y ESPECIALISTA ven todos. `POST /casos` exige
`propietarioCodigo` (una cuenta PROPIETARIO) y el caso nace en `BORRADOR`, sin autorización. Publicar sin autorización da 422.
El detalle trae `publicacion` (`estado`, `propietarioCodigo` —nulo para el comprador—, `autorizada`, `autorizacionFecha`) y
el listado `estadoPublicacion`. Ninguna de estas operaciones cambia el color del indicador A.

**Historial (v0.7):** cada elemento trae `registradaEn`, `estadoAnterior` (nulo en la primera), `estadoNuevo`, `motivos`,
`faltantes`, `versionReglas`, `origen` (`EDICION`, `PLANO_ADJUNTO`, `PARTIDA_TRANSCRITA`, `CARGA_INICIAL`) y `cuentaCodigo`.
Es de solo adición: no existe ruta para editarlo ni borrarlo. Subir el PDF de un plano también recalcula (origen
`PLANO_ADJUNTO`), aunque el color no puede cambiar por el archivo.

## Catálogo y filtros (M13)

`GET /casos` devuelve los casos ordenados por número de partida. Los filtros son opcionales y se combinan con «y»:

| Parámetro | Valores | Filtra por |
|---|---|---|
| `tipoInmueble` | `VIVIENDA_URBANA`, `LOTE_URBANO` | Tipo de inmueble (se deriva de `tipoPredio`) |
| `estado` | `VERDE`, `AMARILLO`, `ROJO`, `GRIS` | Color del indicador A |
| `estadoTecnico` | `NO_SOLICITADA`, `SOLICITADA`, `EN_INSPECCION`, `EMITIDO` (o su alias `INFORME_EMITIDO`) | Estado del indicador B |
| `riesgoFisicoDetectado` | `true`, `false` | Informe emitido con conclusión «con riesgo» |

Un valor desconocido da 400 con la lista de valores válidos. Se filtra en el servidor porque el color y el riesgo vienen de dos
módulos distintos (decisión D25). Ejemplo: `GET /casos?estado=AMARILLO&estadoTecnico=EMITIDO`.

Cada elemento trae, además de lo anterior, `resultadoTecnico`, `riesgoFisicoDetectado` y el bloque `predio`:

```json
"predio": {
  "tipoInmueble": "VIVIENDA_URBANA", "tipoInmuebleEtiqueta": "Vivienda urbana", "distrito": "Parcona",
  "areaM2": 160.00, "areaConstruidaInscrita": 84.50, "precioReferencial": 185000.00, "moneda": "PEN",
  "precioNota": "Precio referencial e informativo; no es una oferta. Se coordina con la inmobiliaria."
}
```

El precio es informativo y no interviene en el semáforo. En una partida captada es opcional (`null` si no se indicó). El detalle
(`GET /casos/{codigo}`) también trae el bloque `predio`.

No existe ninguna ruta para fijar el color del semáforo (RN-06), para registrar cuentas ni para leer claves de respuesta.

El `codigo` de un caso es el número de su partida simulada, con el prefijo `SIM-` (por ejemplo `SIM-11052690`).

## Login

```json
POST /auth/login
{ "codigoCuenta": "comprador-01", "password": "<la de APP_SEED_PASSWORD>" }

200
{ "token": "…", "usuario": { "id": 1, "codigoCuenta": "comprador-01", "rol": "COMPRADOR" } }
```

El mensaje de error no distingue entre cuenta inexistente y contraseña errónea. Cinco fallos seguidos con la misma cuenta
y la misma IP devuelven 429 durante 15 minutos.

## Caso (`GET /casos/{codigo}`)

```json
{
  "codigo": "SIM-11061555",
  "denominacion": "Mz. C Lote 3 · Hab. Urb. Mirador del Sol · Subtanjalla, Ica",
  "contexto": "Subtanjalla, Ica",
  "sintetico": true,
  "expediente": {
    "version": 0,
    "condicionRepresentada": "Lote urbano inscrito, según el escenario.",
    "titularidad": "desconocido",
    "completitud": "INCOMPLETA",
    "fechaReferencial": "2026-10-17",
    "nota": "Extracto parcial: …",
    "zonaRegistral": "Zona Registral N.° XI - Sede Ica",
    "oficinaRegistral": "Oficina Registral de Ica",
    "ubicacion": "Mz. C, Lote 3 de la Habilitación Urbana Mirador del Sol, …",
    "areaM2": 250.00,
    "linderos": "Frente: …",
    "antecedenteDominial": "El predio proviene de la partida SIM-11044730 …",
    "tieneDocumento": true,
    "documentoGenerado": true,
    "asientos": [
      { "referencia": "D00001", "rubro": "D", "tipoActo": "ANOTACION_DEMANDA", "tipoActoEtiqueta": "Anotación de demanda",
        "estado": "VIGENTE", "fechaInscripcion": "2023-09-27", "tituloNumero": "SIM-2023-00021804",
        "fechaPresentacion": "2023-09-20", "texto": "…", "canceloNumero": null, "titulares": null }
    ]
  },
  "evaluacion": {
    "estado": "GRIS",
    "etiqueta": "Información insuficiente o condición no evaluable",
    "motivos": [ { "tipo": "FALTANTE", "texto": "…" } ],
    "faltantes": [ "Titularidad", "Completitud del extracto" ],
    "alertas": [ { "regla": "RP-02", "prioridad": "PRIORITARIA", "titulo": "…", "explicacion": "…", "referencia": "D00001", "descripcion": "Anotación de demanda" } ],
    "noDescartaOtras": true,
    "versionReglas": "v0.2",
    "reglasAplicadas": [ "RP-02" ],
    "limite": "Salida informativa sobre datos de un caso sintético. No certifica saneamiento ni recomienda comprar.",
    "calculadaEn": "…",
    "expedienteVersion": 0
  },
  "checklist": [ { "id": 7, "nombre": "…", "estado": "PENDIENTE", "observacion": null } ],
  "terminos": [ { "concepto": "Hipoteca", "explicacion": "…", "version": "v0.2", "estadoRevision": "pendiente de revisión" } ]
}
```

## Actualizar la partida (`PUT /casos/{codigo}/expediente`)

```json
{
  "condicionRepresentada": "Lote urbano inscrito, según el escenario.",
  "completitud": "COMPLETA",
  "fechaReferencial": "2026-10-17",
  "nota": null,
  "zonaRegistral": "Zona Registral N.° XI - Sede Ica",
  "oficinaRegistral": "Oficina Registral de Ica",
  "ubicacion": "Mz. K, Lote 12 de la Habilitación Urbana Rincón del Sauce, …",
  "areaM2": 200.00,
  "linderos": "Frente: …",
  "antecedenteDominial": "El predio proviene de la partida SIM-11040288 …",
  "asientos": [
    { "referencia": "C00001", "tipoActo": "COMPRAVENTA", "texto": "…", "titulares": "Marco Antonio Quispe Huamaní (50 %) y …" },
    { "referencia": "D00001", "tipoActo": "HIPOTECA", "estado": "VIGENTE", "texto": "…" },
    { "referencia": "E00001", "tipoActo": "CANCELACION", "canceloNumero": "D00001", "texto": "…" }
  ],
  "versionEsperada": 0
}
```

**Reglas de la partida** (todas devuelven 400 con un mensaje claro y no escriben nada):
- El número del asiento es una letra de rubro de la C a la F y cinco dígitos (`C00001`). No se repite.
- Rubro C (títulos de dominio): debe indicar `titulares`.
- Rubro D (gravámenes y cargas): debe indicar `estado` (`VIGENTE` o `DESCONOCIDO`).
- Rubro E (cancelaciones): debe ser de tipo `CANCELACION` e indicar en `canceloNumero` un asiento D que exista, y un D solo puede cancelarse una vez.
- Solo un asiento E puede tener `canceloNumero`.
- **Se derivan, no se escriben:** un asiento D figura `CANCELADA` si y solo si un asiento E lo cancela (marcarlo cancelado sin ese E se rechaza), y la titularidad del expediente es la de `titulares` del último asiento C, o `desconocido` si no hay ninguno.
- Los datos del predio (zona, oficina, ubicación, área, linderos, antecedente) son opcionales. El área admite dos decimales.
- Hasta 40 asientos. Las fechas van como `AAAA-MM-DD`.

Además:
- `versionEsperada` es obligatoria. Si ya no coincide con la versión guardada, la respuesta es 409.
- Los campos que no estén en el contrato (por ejemplo `estado` del semáforo o `titularidad`) se ignoran: el color siempre se recalcula.
- La actualización, la regeneración del PDF, el recálculo y el guardado son una sola transacción.
- Si `documentoGenerado` es verdadero, el PDF se regenera con los datos nuevos. Si el revisor subió un PDF propio, no se toca.

**Tipos de acto:** `PRIMERA_INSCRIPCION`, `INDEPENDIZACION`, `COMPRAVENTA`, `SUCESION`, `HIPOTECA`, `EMBARGO`,
`ANOTACION_DEMANDA`, `MEDIDA_CAUTELAR`, `BLOQUEO`, `CARGA_TECNICA`, `SERVIDUMBRE`, `CANCELACION` y `OTRO`.

## Reglas del semáforo v0.4 (borrador, pendiente de revisión especializada)

Las reglas RP y RV-01 a RV-03 evalúan los asientos del rubro D que siguen vigentes. RV-04 a RV-06 evalúan los planos de una
vivienda; en un lote no aplican.

| Regla | Condición | Prioridad | Estado |
|---|---|---|---|
| RP-01 | Embargo vigente | Prioritaria | Rojo |
| RP-02 | Anotación de demanda o medida cautelar vigente | Prioritaria | Rojo |
| RP-03 | Bloqueo registral vigente | Prioritaria | Rojo |
| RV-02 | Hipoteca vigente | Revisión | Amarillo |
| RV-03 | Carga técnica o servidumbre vigente | Revisión | Amarillo |
| RV-01 | Otro acto vigente | Revisión | Amarillo |
| RV-04 | Falta el plano de II.EE. o el de II.SS. | Revisión | Amarillo |
| RV-05 | El área del plano arquitectónico difiere más de 1 % de la inscrita, o no consta una inscrita | Revisión | Amarillo |
| RV-06 | Un plano está observado | Revisión | Amarillo |

Una vivienda sin plano arquitectónico o de estructuras queda en gris. La copropiedad y los gravámenes cancelados no generan
alerta. Las alertas salen en el orden de la tabla. Ni el checklist (I3) ni el informe técnico (I2) cambian el color.

## Estados del semáforo

| Estado | Cuándo | Significado |
|---|---|---|
| `VERDE` | Datos mínimos completos, sin alertas y condición contemplada | Exactamente «Sin alertas en los campos evaluados» (I1). No es saneamiento |
| `AMARILLO` | Hay una alerta de revisión | Requiere revisión |
| `ROJO` | Hay una alerta prioritaria con datos completos | Alerta prioritaria |
| `GRIS` | Faltan datos mínimos o la condición no está contemplada | Información insuficiente. Las alertas conocidas se conservan, aunque sean prioritarias |

## Códigos de error

Las respuestas de error usan `application/problem+json` con el campo `detail`.

| Código | Cuándo |
|---|---|
| 400 | Cuerpo inválido, valor fuera de las enumeraciones, asiento que incumple las reglas de la partida |
| 401 | Sin token, token vencido o de otro emisor, credenciales incorrectas |
| 403 | El rol no permite la operación (por ejemplo, un revisor o un especialista que solicita la inspección) |
| 404 | Caso, ítem o documento inexistente. Un ítem de otro caso también da 404 |
| 400 (v0.8) | El archivo no es un PDF (cabecera, tipo `application/pdf`), está cifrado o dañado; `tipoAlerta` desconocido; acreedor que no es persona jurídica ni «no consta»; decisión o motivo fuera de la lista o con otros campos |
| 409 | La versión del expediente cambió, la inspección ya fue solicitada o no hay solicitud para registrar el informe. v0.8: si viene de la base de datos, el servidor registra la causa raíz en su log; la respuesta no cambia |
| 413 | v0.8: «El archivo supera 25 MB» o «El PDF pesa X MB incluso optimizado; el máximo es 10 MB. Reduce su resolución o divídelo» |
| 422 | La cuenta del especialista no tiene datos profesionales para firmar. v0.8: «Sube el PDF del plano antes de marcarlo como presentado» (plano presentado u observado sin archivo, al editar o al registrar) o el plano no aplica al predio |
| 429 | Demasiados intentos de login |

## Captación de partidas (solo REVISOR)

- `POST /api/v1/casos` capta una partida. Cuerpo: `origen` (obligatorio: `TRANSCRITA_CONOCE_AQUI` o `SIMULADA_DEMOSTRACION`),
  `numero` (transcrita: ocho dígitos, con letra inicial opcional, sin `SIM-`; simulada: `SIM-` y ocho dígitos), `precioReferencial`
  (opcional, positivo, hasta dos decimales, en soles), `denominacion`, `contexto`, `fechaConsulta`, los datos del expediente,
  `asientos` y `confirmaSinDatosPersonales: true`. Responde 201 con el detalle, 409 si ya existe, 400 si falta el origen o la
  confirmación, el número no corresponde al origen, el precio es inválido o el texto trae un DNI, el estado civil o un domicilio.
- `DELETE /api/v1/casos/{codigo}` borra una partida captada (204). Un caso de demostración da 409.
- `ResumenCaso` y `DetalleCaso` incluyen `origen` (`SINTETICO` o `TRANSCRITA`), `fuente` y `fechaConsulta`.

## Planos e inspección técnica

- `ExpedienteDto` incluye `tipoPredio` (`LOTE` o `VIVIENDA`), `areaConstruidaInscrita` y `planos[]`. Cada plano trae su `especialidad`,
  `estado`, `areaConstruida`, `sistemaConstructivo`, `observacion`, `tieneDocumentoPropio` y, en el arquitectónico, `coincideArea`.
- `DetalleCaso` incluye `evaluacionTecnica` (indicador B) y `ResumenCaso` incluye `estadoTecnico`, `resultadoTecnico` y
  `riesgoFisicoDetectado`.
- `PUT /casos/{c}/expediente` acepta `tipoPredio`, `areaConstruidaInscrita` y `planos`. Si no viene `tipoPredio`, el bloque técnico no se toca.
  Un plano repetido, el área fuera del plano arquitectónico o el sistema constructivo fuera del de estructuras dan 400.
- `GET /casos/{c}/planos/{especialidad}/documento`: el PDF que subió el revisor o, si no hay, una lámina 2D referencial. 404 si el plano no está presentado.
- `POST /casos/{c}/planos/{especialidad}/documento` (REVISOR, multipart): sube el PDF real. 422 si no es un PDF o el plano no está presentado.
- `POST /casos/{c}/inspeccion/solicitud` (**solo COMPRADOR**, M5; sin cuerpo): 201; 403 para los demás roles; 409 si ya fue
  solicitada. El servidor guarda `solicitanteCodigo` (de la sesión, nunca del cuerpo) y `fechaSolicitud` (hoy).
- `PUT /casos/{c}/inspeccion` (solo ESPECIALISTA): guarda el avance (`EN_INSPECCION`) o el informe (`EMITIDO`). Cuerpo: `estado`,
  `resultado`, `fechaInspeccion`, `verifArquitectura`, `verifEstructuras`, `verifElectricas`, `verifSanitarias`,
  `observaciones`, `conclusiones` y `estudiosAdicionales`. **No lleva** nombre, especialidad ni colegiatura (M8): el servidor
  los toma de la cuenta autenticada y, si el cliente los envía, se ignoran. 409 si no hay solicitud o el gestor no asignó un
  especialista («El gestor debe asignar un especialista»); 403 si está asignada a otro; 400 si un informe emitido
  no trae resultado, fecha (no futura), las 4 verificaciones y conclusiones.
- `evaluacionTecnica` trae, además: `profesional`, `profesionalEspecialidad` y `colegiatura` (de la cuenta), `solicitanteCodigo`,
  `riesgoFisicoDetectado` y `servicio`, con las condiciones del servicio aunque no esté solicitado:

```json
"servicio": { "costoReferencial": 250.00, "moneda": "PEN",
  "condiciones": "Coordinado con la inmobiliaria; sin pasarela de pago en línea." }
```

El costo sale de `app.inspeccion.costo-referencial`; la interfaz no lo repite a mano.

## Ciclo de cartera (v0.7)

Rutas reales del backend de la v0.7, con el rol que exige `SecurityConfig` (y que el servicio vuelve a comprobar). Las consume
la interfaz desde `PanelPublicacion`, `HistorialEvaluaciones`, `SolicitudContacto`, `PanelEvaluacionTecnica`, `Cartera` y
`MisInmuebles`.

### Captación

`POST /casos` (REVISOR) exige además `"propietarioCodigo": "propietario-01"` (texto, hasta 40 caracteres, una cuenta con rol
PROPIETARIO). 400 si falta o no es un propietario. El caso nace con `publicacion.estado = "BORRADOR"` y `autorizada = false`.

### Autorización y publicación

| Ruta | Rol | Cuerpo | Respuesta | Errores |
|---|---|---|---|---|
| `PUT /casos/{codigo}/autorizacion` | PROPIETARIO de ese caso | — | 200 `Publicacion` | 403 otro rol u otro propietario; 404 caso inexistente |
| `DELETE /casos/{codigo}/autorizacion` | PROPIETARIO de ese caso | — | 200 `Publicacion` (un caso publicado pasa a `RETIRADO`) | 403, 404 |
| `POST /casos/{codigo}/publicacion` | GESTOR | — | 200 `Publicacion` con `estado = "PUBLICADO"` | 403; 404; 409 ya publicado; 422 sin autorización vigente |
| `DELETE /casos/{codigo}/publicacion` | GESTOR | — | 200 `Publicacion` con `estado = "RETIRADO"` | 403; 404; 409 no está publicado |

```json
"publicacion": { "estado": "PUBLICADO", "propietarioCodigo": "propietario-01", "autorizada": true,
  "autorizacionFecha": "2026-10-25T20:15:03.120Z" }
```

`propietarioCodigo` llega en `null` al comprador (I11). El listado trae `estadoPublicacion` en cada elemento.

### Historial de evaluaciones

`GET /casos/{codigo}/historial` (REVISOR, GESTOR, ESPECIALISTA o PROPIETARIO del caso): 200 con la lista de la más antigua a la
más reciente. 403 al comprador, 404 al propietario de otro caso o a un caso inexistente. No hay rutas para editar ni borrar.

```json
[ { "registradaEn": "2026-10-25T20:20:11.400Z", "estadoAnterior": "AMARILLO", "estadoNuevo": "VERDE",
    "motivos": [ { "tipo": "LIMITE", "texto": "No se detectaron alertas en los campos evaluados (1 anotación(es) revisada(s)). …" } ],
    "faltantes": [], "versionReglas": "v0.4", "origen": "PLANO_ADJUNTO", "cuentaCodigo": "revisor-01" } ]
```

`origen`: `EDICION`, `PLANO_ADJUNTO`, `PARTIDA_TRANSCRITA` o `CARGA_INICIAL` (esta última con `cuentaCodigo = "sistema"`).

### Contacto

| Ruta | Rol | Cuerpo | Respuesta | Errores |
|---|---|---|---|---|
| `POST /casos/{codigo}/contactos` | COMPRADOR | `{"motivo": "INFORMACION_GENERAL" \| "CONSULTA_DOCUMENTOS" \| "CONSULTA_INSPECCION"}` | 201 `Contacto` | 400 motivo inválido, ausente o cualquier otro campo (sin texto libre); 403; 404 caso no publicado o inexistente; 409 ya hay una pendiente del mismo comprador |
| `GET /contactos?estado=PENDIENTE\|ATENDIDA` | GESTOR | — | 200 lista (sin `estado`, todas) | 403 |
| `PUT /contactos/{id}/atencion` | GESTOR | — | 200 `Contacto` con `estado = "ATENDIDA"` | 403; 404; 409 ya atendida |

```json
{ "id": 3, "casoCodigo": "SIM-11075836", "compradorCodigo": "comprador-01", "motivo": "CONSULTA_DOCUMENTOS",
  "estado": "PENDIENTE", "creadaEn": "2026-10-25T20:25:40.000Z", "atendidaEn": null, "atendidaPor": null }
```

El comprador no tiene una ruta para consultar después sus solicitudes (D46).

### Asignación de especialista

`PUT /casos/{codigo}/inspeccion/asignacion` (GESTOR), cuerpo `{"especialistaCodigo": "especialista-02"}`: 200 con la
`evaluacionTecnica` y `especialistaAsignadoCodigo`. 400 si la cuenta no es un especialista con datos profesionales o falta el
campo; 403 otro rol; 404 caso inexistente; 409 sin solicitud o informe ya emitido. `PUT /casos/{codigo}/inspeccion` da 409 sin
asignación y 403 a cualquier otro especialista.

### Panel de cartera

`GET /cartera/panel` (GESTOR), solo lectura:

```json
{ "totalCasos": 10, "porColor": { "VERDE": 2, "AMARILLO": 4, "ROJO": 2, "GRIS": 2 },
  "porEstadoPublicacion": { "BORRADOR": 0, "PUBLICADO": 10, "RETIRADO": 0 },
  "casosConFaltantes": [ { "codigo": "SIM-11061555", "estado": "GRIS", "faltantes": [ "Titularidad", "…" ] } ],
  "inspecciones": [ { "codigo": "SIM-11093320", "estado": "SOLICITADA", "especialistaAsignadoCodigo": null, "asignada": false } ],
  "inspeccionesAsignadas": 0, "inspeccionesSinAsignar": 2, "contactosPendientes": [] }
```

Los totales de este ejemplo son los del contenido de demostración recién cargado (`CarteraTest.panelCoherente`).

## Novedades de la v0.8

### Documentos PDF

`POST /casos/{c}/documento` y `POST /casos/{c}/planos/{esp}/documento` validan y, si pasa de 5 MB, optimizan el PDF. Respuesta:

```json
{ "codigo": "SIM-99000404", "sha256": "…", "tamanoOriginalBytes": 5610250, "tamanoBytes": 391884, "optimizado": true }
```

El detalle agrega `expediente.documento` y `expediente.planos[].documento` (nulo si el plano no está presentado ni observado):
`{ "origen": "SUBIDO" | "GENERADO" | "FALTA", "subidoPor", "subidoEn", "tamanoBytes", "tamanoOriginalBytes", "optimizado", "sha256" }`.
Límites en `app.archivos.max-entrada-mb` (25), `app.archivos.umbral-optimizacion-mb` (5) y `app.archivos.max-almacenado-mb` (10).

### Asientos del rubro D

`AsientoRequest` y el detalle agregan `acreedor` (solo persona jurídica o «no consta») y `plazoOVencimiento`. En otro rubro dan
400. No intervienen en el color.

### Ruta de regularización

`GET /casos/{c}/ruta-regularizacion`:

```json
{ "codigo": "SIM-11052690", "estado": "AMARILLO", "esfuerzo": "MEDIO", "esfuerzoEtiqueta": "Medio: requiere a un tercero, sin proceso judicial",
  "items": [ { "tipo": "ALERTA", "clave": "RV-02", "referencia": "D00001", "titulo": "Levantar la hipoteca vigente",
               "pasos": [ "…" ], "gestiona": "acreedor", "documentoRequerido": "…", "esfuerzo": "MEDIO", "nota": "…",
               "gravamen": { "acreedor": "No consta", "plazoOVencimiento": null,
                             "plazo": "No consta en la partida: solicitar al propietario o al acreedor" } } ],
  "tiposAlerta": [ "RV-02", "RV-04" ], "mensaje": null,
  "aviso": "Orientativo: no es asesoría legal ni recomendación de compra",
  "plazoGeneral": "El plazo depende del trámite; consultar con abogado o notario.",
  "estadoRevision": "borrador del equipo, pendiente de revisión especializada", "versionContenido": "v0.4" }
```

En un caso verde, `items` está vacío y `mensaje` dice «Sin alertas en los campos evaluados: no hay pasos de regularización».

### Filtro por tipo de alerta y panel

`GET /casos?tipoAlerta=RV-02` (o `INFORMACION_INSUFICIENTE`) se combina con los demás filtros; cada resumen trae `tiposAlerta`.
`GET /cartera/panel` agrega `porTipoAlerta` (`codigo`, `nombre`, `casos`), `porEsfuerzo` (`BAJO`, `MEDIO`, `ALTO`, `SIN_PASOS`),
`porRegularizar` (`codigo`, `denominacion`, `color`, `tiposAlerta`, `esfuerzo`, `estadoGestion`; orden por esfuerzo y código),
`porEstadoGestion`, `matrizGestion` (`codigo`, `nombre`, `porEstadoGestion`) y los avisos `avisoPriorizacion` y `avisoGestion`.

### Semáforo de gestión y decisión de captación (I15)

Solo para GESTOR y REVISOR, el detalle y cada resumen de `GET /casos` traen `gestion`:
`{ "estado": "REQUIERE_REGULARIZACION", "etiqueta", "explicacion", "sugerencia", "esfuerzo", "aviso" }`. Para los demás roles el
campo no existe en la respuesta.

`POST /casos/{c}/decision-captacion` (GESTOR) con `{"decision": "NO_CAPTAR_POR_AHORA", "motivo": "PROCESO_JUDICIAL"}`.
Decisiones: `CAPTAR`, `CAPTAR_CON_CONDICIONES`, `NO_CAPTAR_POR_AHORA`. Motivos: `DOCUMENTACION_COMPLETA`, `REGULARIZACION_EN_CURSO`,
`CARGA_VIGENTE`, `PROCESO_JUDICIAL`, `INFORMACION_INSUFICIENTE`, `OTRO_MOTIVO_COMERCIAL`. Otro campo da 400. Respuesta 201:
`{ "id", "casoCodigo", "decision", "decisionEtiqueta", "motivo", "motivoEtiqueta", "cuentaCodigo", "registradaEn" }`. No cambia A ni
B ni bloquea publicar. `GET /casos/{c}/decisiones-captacion` (GESTOR, REVISOR) devuelve el historial, del más antiguo al más
reciente; no hay rutas para editarlo ni borrarlo.

## v1.0 (etapa 6): realismo del contenido

- `GET /api/v1/publico/inmuebles` acepta además `zonificacion` (códigos de la guía de usos separados por coma: RDB, RDM,
  RDA, CV, CZ, I1, I2; un alias como R4 vale por su zona), `uso` (`CASA`, `NEGOCIO`, `ALQUILAR` o `ALMACEN`: la zonificación
  debe soler permitirlo con el área del inmueble, según `contenido/usos-lote.json`) e `incluirSinZonificacion` (`true` o
  `false`, por omisión `false`). Un valor no válido da 400 con los aceptados.
- `GET /api/v1/publico/inmuebles/recomendables` (sin sesión, mismos filtros): todos los que cumplen el filtro, sin vendidos,
  en forma compacta (`codigo`, `denominacion`, `clase`, `proyectoCodigo`, `lote`, `estado`, `fuenteIndicadorA`, `predio`),
  con `total` y `truncado` (a lo sumo 2000).
- PDF sin sesión de un caso PUBLICADO (borrador, retirado o inexistente: 404): `GET /api/v1/publico/inmuebles/{c}/documento`
  (ficha registral generada al momento, con la partida parcialmente oculta), `.../planos/{especialidad}/documento` y
  `.../documentos-lote/{tipo}/documento`. El informe técnico B sigue en `GET /casos/{c}/inspeccion/documento`, con sesión.
- `GET /robots.txt` (sin sesión): `Disallow: /` mientras `app.sitio.indexable` sea `false` (por omisión; variable
  `APP_SITIO_INDEXABLE`). `GET /api/v1/publico/sitio` → `{ "indexable": false }`.
- `POST /casos` con origen `SIMULADA_DEMOSTRACION` («Registro interno de cartera») acepta `INT-########` y, como antes,
  `SIM-########`; la fuente del caso es «Registro interno de cartera».

## Versión 1.0.0: resumen de los endpoints nuevos (etapas 1 a 7)

Todas las rutas empiezan por `/api/v1`. Lo que está bajo `/publico` se lee **sin sesión** y solo muestra lo publicado; la
única escritura sin sesión es `POST /publico/interes`. Ninguna de estas operaciones cambia el color del indicador A.

### Portal público (`/publico`, sin sesión)

| Operación | Ruta | Respuestas |
|---|---|---|
| Catálogo unido (casos publicados y lotes de proyecto ofrecidos), 24 por página | `GET /publico/inmuebles?pagina=&proyecto=&distrito=&tipo=LOTE\|VIVIENDA&estadoComercial=&moneda=PEN\|USD&precioMin=&precioMax=&precioM2Min=&precioM2Max=&areaMin=&areaMax=&indicadorA=&tipoAlerta=&orden=&sentido=&clase=CASO\|LOTE_PROYECTO&zonificacion=&uso=&incluirSinZonificacion=` | 200, 400 |
| Opciones de los filtros (proyectos y distritos con inmuebles) | `GET /publico/filtros` | 200 |
| Todos los que cumplen el filtro, compactos, para el asistente (tope 2000) | `GET /publico/inmuebles/recomendables` (mismos filtros) | 200, 400 |
| Ficha pública de un caso publicado (sin semáforo de gestión ni propietario) | `GET /publico/inmuebles/{codigo}` | 200, 404 |
| Ficha registral del inmueble en PDF, generada al momento con la partida oculta | `GET /publico/inmuebles/{codigo}/documento` | 200, 404 |
| Lámina de un plano / documento del lote de un caso publicado | `GET /publico/inmuebles/{codigo}/planos/{especialidad}/documento`, `.../documentos-lote/{tipo}/documento` | 200, 400, 404 |
| Página de un proyecto (plano de lotes, hitos, indicador A de la partida matriz, documentos) | `GET /publico/proyectos/{codigo}` | 200, 404 |
| Ficha de un lote de proyecto | `GET /publico/proyectos/{codigo}/lotes/{A-7}` | 200, 404 |
| Documento de la partida matriz del proyecto. **Etapa 7:** sin sesión, la partida sale parcialmente oculta (`1111••••`); con un token válido, completa | `GET /publico/proyectos/{codigo}/documentos/{tipo}` | 200, 400, 404 |
| Texto de consentimiento vigente y WhatsApp (nulo si no está configurado) | `GET /publico/contacto` | 200 |
| Interés del visitante con cita opcional | `POST /publico/interes` | 201, 400, 404, 429 |
| Indexación y versión del sistema (**etapa 7:** `version`) | `GET /publico/sitio` → `{"indexable": false, "version": "1.0.0"}` | 200 |
| robots.txt | `GET /robots.txt` (fuera de `/api/v1`) | 200 |

`POST /publico/interes` acepta solo estos campos (otro da 400, como I11): `casoCodigo`, `proyectoCodigo`, `lote`, `zona`,
`tipo`, `presupuestoMin`, `presupuestoMax`, `moneda`, `areaDeseada`, `formaPago` (`CONTADO`, `FINANCIADO`, `POR_DEFINIR`),
`mensaje` (≤ 300, sin 8 dígitos seguidos), `nombre` (de pila), `medio` (`CELULAR` o `CORREO`), `contacto`,
`consentimiento` (`true`), `consentimientoVersion`, `sitioWeb` (trampa) y `cita`
(`{"modalidad": "VISITA_AL_LOTE"|"REUNION_EN_OFICINA"|"LLAMADA", "opciones": [{"fecha": "AAAA-MM-DD", "franja": "MANANA"|"TARDE"}]}`,
una o dos fechas, desde mañana y hasta 90 días). 10 envíos por hora por IP.

### Expedientes: datos comerciales y autorización (etapas 1 y 2)

| Operación | Ruta | Permiso | Respuestas |
|---|---|---|---|
| Registrar una partida con titularidad comercial, proyecto, estado comercial, independización y precio | `POST /casos` (`titularidadComercial`: `INMOBILIARIA` o `PARTICULAR`; `propietarioCodigo` obligatorio solo en PARTICULAR) | REVISOR, ASESOR | 201, 400, 401, 403, 409 |
| Cambiar los datos comerciales (proyecto, estado comercial, independización, precio) | `PUT /casos/{codigo}/datos-comerciales` | REVISOR, ASESOR | 200, 400, 401, 403, 404 |
| Autorizar o retirar en nombre de la inmobiliaria (caso INMOBILIARIA) | `PUT` / `DELETE /casos/{codigo}/autorizacion` | GESTOR, ASESOR (en un caso PARTICULAR, solo su PROPIETARIO) | 200, 401, 403, 404 |
| Historial de autorizaciones (solo adición) | `GET /casos/{codigo}/autorizaciones` | Equipo y propietario del caso | 200, 401, 403, 404 |
| Publicar o retirar | `POST` / `DELETE /casos/{codigo}/publicacion` | GESTOR, ASESOR | 200, 401, 403, 404, 409, 422 |

El rol **ASESOR** (cuenta `asesor-01`) reúne los permisos del REVISOR y del GESTOR (D59).

### Proyectos y carga por CSV (etapas 3a y 3b)

| Operación | Ruta | Permiso | Respuestas |
|---|---|---|---|
| Lista de proyectos del equipo (lotes, publicados, autorización de la matriz, conteo por estado) | `GET /proyectos` | REVISOR, GESTOR, ASESOR | 200, 401, 403 |
| Publicar o retirar un lote sin caso propio | `POST` / `DELETE /proyectos/{c}/lotes/{A-7}/publicacion` | GESTOR, ASESOR | 200, 401, 403, 404, 422 |
| Cambiar el estado comercial de un lote | `PUT /proyectos/{c}/lotes/{A-7}/estado-comercial` (`{"estadoComercial"}`) | GESTOR, ASESOR | 200, 400, 401, 403, 404 |
| Plantilla CSV | `GET /proyectos/{c}/lotes/plantilla.csv` | GESTOR, ASESOR | 200, 401, 403 |
| Vista previa de la carga (no guarda) | `POST /proyectos/{c}/lotes/carga/vista-previa` (multipart, campo `archivo`) | GESTOR, ASESOR | 200, 400, 401, 403, 404, 413 |
| Confirmar la carga (todo o nada) | `POST /proyectos/{c}/lotes/carga` (multipart, campo `archivo`) | GESTOR, ASESOR | 200, 400, 401, 403, 404, 413, 422 |
| Historial de un lote (solo adición) | `GET /proyectos/{c}/lotes/{A-7}/historial` | REVISOR, GESTOR, ASESOR | 200, 401, 403, 404 |

Columnas del CSV: `manzana,lote,area_m2,precio,moneda,estado,independizacion,zonificacion,codigo_caso` (D64).

### Interesados y citas (etapa 4, GESTOR y ASESOR)

| Operación | Ruta | Respuestas |
|---|---|---|
| Bandeja, con filtros | `GET /interesados?etapa=&proyecto=&responsable=SIN_ASIGNAR\|<cuenta>&vencidos=true` | 200, 400, 401, 403 |
| Resumen de demanda | `GET /interesados/resumen` | 200, 401, 403 |
| Opciones de los filtros | `GET /interesados/opciones` | 200, 401, 403 |
| Detalle con notas y citas | `GET /interesados/{id}` | 200, 401, 403, 404 |
| Cambiar la etapa (deja una nota) | `PUT /interesados/{id}/etapa` (`{"etapa"}`) | 200, 400, 401, 403, 404, 409 |
| Responsable y próxima acción | `PUT /interesados/{id}/seguimiento` (`{"responsable","proximaAccion","proximaAccionFecha"}`) | 200, 400, 401, 403, 404 |
| Agregar una nota (solo adición) | `POST /interesados/{id}/notas` (`{"texto"}`) | 201, 400, 401, 403, 404 |
| Marcar el lote o inmueble SEPARADO o VENDIDO (en Separación o Venta) | `PUT /interesados/{id}/estado-lote` (`{"estado"}`) | 200, 400, 401, 403, 404, 409 |
| Eliminar el registro a pedido (con sus notas y citas) | `DELETE /interesados/{id}` | 204, 401, 403, 404 |
| Agenda de 7 días | `GET /citas/agenda?desde=AAAA-MM-DD` | 200, 401, 403 |
| Confirmar una de las fechas propuestas | `PUT /citas/{id}/confirmacion` (`{"opcion": 1\|2}`) | 200, 400, 401, 403, 404, 409 |
| Reprogramar | `PUT /citas/{id}/reprogramacion` (`{"fecha","franja"}`) | 200, 400, 401, 403, 404, 409 |
| Rechazar con motivo | `PUT /citas/{id}/rechazo` (`{"motivo"}`) | 200, 400, 401, 403, 404, 409 |

### Etapa 7

- `GET /publico/proyectos/{c}/documentos/{tipo}`: sin sesión, la partida matriz sale como `1111••••`; con sesión, completa.
- `GET /publico/sitio` agrega `version` (`1.0.0`, tomada del `pom.xml` al compilar: `app.version=@project.version@`).
- Sin endpoints nuevos de escritura. `scripts/preparar-demo.mjs` usa solo los endpoints de esta página.
