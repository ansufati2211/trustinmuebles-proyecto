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
| Listar casos | `GET /casos` | Sesión | 200, 401 |
| Abrir un caso (por su partida simulada) | `GET /casos/{codigo}` | Sesión | 200, 401, 404 |
| Actualizar la partida y recalcular | `PUT /casos/{codigo}/expediente` | REVISOR | 200, 400, 401, 403, 404, 409 |
| Cambiar un ítem del checklist | `PATCH /casos/{codigo}/checklist/{itemId}` | REVISOR | 200, 400, 401, 403, 404 |
| Asociar un PDF propio al caso | `POST /casos/{codigo}/documento` (multipart, campo `documento`) | REVISOR | 201, 401, 403, 404, 413, 422 |
| Ver el PDF del caso | `GET /casos/{codigo}/documento` | Sesión | 200, 401, 404 |
| Glosario cerrado | `GET /glosario` | Sesión | 200, 401 |

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

## Reglas del semáforo v0.2 (borrador, pendiente de revisión especializada)

Solo se evalúan los asientos del rubro D que siguen vigentes.

| Regla | Tipo de acto vigente | Prioridad | Estado |
|---|---|---|---|
| RP-01 | Embargo | Prioritaria | Rojo |
| RP-02 | Anotación de demanda, medida cautelar | Prioritaria | Rojo |
| RP-03 | Bloqueo registral | Prioritaria | Rojo |
| RV-02 | Hipoteca | Revisión | Amarillo |
| RV-03 | Carga técnica, servidumbre | Revisión | Amarillo |
| RV-01 | Otro acto | Revisión | Amarillo |

La copropiedad y los gravámenes cancelados no generan alerta. Las alertas salen en el orden de la tabla.

## Estados del semáforo

| Estado | Cuándo | Significado |
|---|---|---|
| `VERDE` | Datos mínimos completos, sin alertas y condición contemplada | Sin alertas detectadas en los campos evaluados. No es saneamiento |
| `AMARILLO` | Hay una alerta de revisión | Requiere revisión |
| `ROJO` | Hay una alerta prioritaria con datos completos | Alerta prioritaria |
| `GRIS` | Faltan datos mínimos o la condición no está contemplada | Información insuficiente. Las alertas conocidas se conservan, aunque sean prioritarias |

## Códigos de error

Las respuestas de error usan `application/problem+json` con el campo `detail`.

| Código | Cuándo |
|---|---|
| 400 | Cuerpo inválido, valor fuera de las enumeraciones, asiento que incumple las reglas de la partida |
| 401 | Sin token, token vencido o de otro emisor, credenciales incorrectas |
| 403 | El rol no permite la operación |
| 404 | Caso, ítem o documento inexistente. Un ítem de otro caso también da 404 |
| 409 | La versión del expediente cambió |
| 413 | El archivo supera 5 MB |
| 422 | El archivo no es un PDF válido |
| 429 | Demasiados intentos de login |
