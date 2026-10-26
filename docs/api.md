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
| Catálogo, con filtros opcionales | `GET /casos?tipoInmueble=&estado=&estadoTecnico=&riesgoFisicoDetectado=` | Sesión | 200, 400, 401 |
| Abrir un caso (por su partida simulada) | `GET /casos/{codigo}` | Sesión | 200, 401, 404 |
| Actualizar la partida y recalcular | `PUT /casos/{codigo}/expediente` | REVISOR | 200, 400, 401, 403, 404, 409 |
| Cambiar un ítem del checklist | `PATCH /casos/{codigo}/checklist/{itemId}` | REVISOR | 200, 400, 401, 403, 404 |
| Asociar un PDF propio al caso | `POST /casos/{codigo}/documento` (multipart, campo `documento`) | REVISOR | 201, 401, 403, 404, 413, 422 |
| Ver el PDF del caso | `GET /casos/{codigo}/documento` | Sesión | 200, 401, 404 |
| Solicitar la inspección técnica | `POST /casos/{codigo}/inspeccion/solicitud` | **COMPRADOR** | 201, 401, 403, 404, 409 |
| Registrar el avance o el informe técnico | `PUT /casos/{codigo}/inspeccion` | ESPECIALISTA | 200, 400, 401, 403, 404, 409, 422 |
| Ver el informe técnico en PDF | `GET /casos/{codigo}/inspeccion/documento` | Sesión | 200, 401, 404 |
| Ver la lámina o el PDF de un plano | `GET /casos/{codigo}/planos/{especialidad}/documento` | Sesión | 200, 401, 404 |
| Subir el PDF real de un plano | `POST /casos/{codigo}/planos/{especialidad}/documento` | REVISOR | 201, 401, 403, 404, 413, 422 |
| Registrar una partida transcrita | `POST /casos` | REVISOR | 201, 400, 401, 403, 409 |
| Eliminar una partida transcrita | `DELETE /casos/{codigo}` | REVISOR | 204, 401, 403, 404, 409 |
| Glosario cerrado | `GET /glosario` | Sesión | 200, 401 |
| Autorizar la evaluación y publicación (v0.7) | `PUT /casos/{codigo}/autorizacion` | **PROPIETARIO** del caso | 200, 401, 403, 404 |
| Retirar la autorización (v0.7) | `DELETE /casos/{codigo}/autorizacion` | **PROPIETARIO** del caso | 200, 401, 403, 404 |
| Publicar un caso (v0.7) | `POST /casos/{codigo}/publicacion` | **GESTOR** | 200, 401, 403, 404, 409, 422 |
| Retirar la publicación (v0.7) | `DELETE /casos/{codigo}/publicacion` | **GESTOR** | 200, 401, 403, 404, 409 |
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

El precio es informativo y no interviene en el semáforo. Las partidas transcritas no tienen precio (`null`). El detalle
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
| 409 | La versión del expediente cambió, la inspección ya fue solicitada o no hay solicitud para registrar el informe |
| 413 | El archivo supera 5 MB |
| 422 | El archivo no es un PDF válido, o la cuenta del especialista no tiene datos profesionales para firmar |
| 429 | Demasiados intentos de login |

## Partidas transcritas (solo REVISOR)

- `POST /api/v1/casos` registra una partida transcrita. Cuerpo: `numero` (ocho dígitos, con letra inicial opcional; no admite `SIM-`),
  `denominacion`, `contexto`, `fechaConsulta`, los datos del expediente, `asientos` y `confirmaSinDatosPersonales: true`.
  Responde 201 con el detalle, 409 si ya existe, 400 si falta la confirmación, el número es inválido o el texto trae un DNI,
  el estado civil o un domicilio.
- `DELETE /api/v1/casos/{codigo}` borra una partida transcrita (204). Una partida ficticia da 409.
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
  los toma de la cuenta autenticada y, si el cliente los envía, se ignoran. 409 si no hay solicitud; 400 si un informe emitido
  no trae resultado, fecha (no futura), las 4 verificaciones y conclusiones.
- `evaluacionTecnica` trae, además: `profesional`, `profesionalEspecialidad` y `colegiatura` (de la cuenta), `solicitanteCodigo`,
  `riesgoFisicoDetectado` y `servicio`, con las condiciones del servicio aunque no esté solicitado:

```json
"servicio": { "costoReferencial": 250.00, "moneda": "PEN",
  "condiciones": "Coordinado con la inmobiliaria; sin pasarela de pago en línea." }
```

El costo sale de `app.inspeccion.costo-referencial`; la interfaz no lo repite a mano.
