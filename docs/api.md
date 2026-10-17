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
| Abrir un caso | `GET /casos/{codigo}` | Sesión | 200, 401, 404 |
| Actualizar expediente y recalcular | `PUT /casos/{codigo}/expediente` | REVISOR | 200, 400, 401, 403, 404, 409 |
| Cambiar un ítem del checklist | `PATCH /casos/{codigo}/checklist/{itemId}` | REVISOR | 200, 400, 401, 403, 404 |
| Asociar el PDF del caso | `POST /casos/{codigo}/documento` (multipart, campo `documento`) | REVISOR | 201, 401, 403, 404, 413, 422 |
| Ver el PDF del caso | `GET /casos/{codigo}/documento` | Sesión | 200, 401, 404 |
| Glosario cerrado | `GET /glosario` | Sesión | 200, 401 |

No existe ninguna ruta para fijar el color del semáforo (RN-06), para registrar cuentas ni para leer claves de respuesta.

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
  "codigo": "B-03",
  "contexto": "…",
  "sintetico": true,
  "expediente": {
    "version": 0,
    "condicionRepresentada": "Lote urbano inscrito, según el escenario.",
    "titularidad": "desconocido",
    "completitud": "INCOMPLETA",
    "fechaReferencial": "2026-10-17",
    "nota": "…",
    "tieneDocumento": true,
    "anotaciones": [ { "referencia": "B4", "estado": "VIGENTE", "descripcion": null } ]
  },
  "evaluacion": {
    "estado": "GRIS",
    "etiqueta": "Información insuficiente o condición no evaluable",
    "motivos": [ { "tipo": "FALTANTE", "texto": "…" } ],
    "faltantes": [ "Titularidad", "Completitud del extracto" ],
    "alertas": [ { "regla": "RV-01", "prioridad": "REVISION", "titulo": "…", "explicacion": "…", "referencia": "B4", "descripcion": null } ],
    "noDescartaOtras": true,
    "versionReglas": "v0.1",
    "reglasAplicadas": [ "RV-01" ],
    "limite": "Salida informativa sobre datos de un caso sintético. No certifica saneamiento ni recomienda comprar.",
    "calculadaEn": "…",
    "expedienteVersion": 0
  },
  "checklist": [ { "id": 7, "nombre": "…", "estado": "PENDIENTE", "observacion": null } ],
  "terminos": [ { "concepto": "Anotación", "explicacion": "…", "version": "v0.1", "estadoRevision": "pendiente de revisión" } ]
}
```

## Actualizar el expediente (`PUT /casos/{codigo}/expediente`)

```json
{
  "condicionRepresentada": "Lote urbano inscrito, según el escenario.",
  "titularidad": "Titular Épsilon y Titular Zeta",
  "completitud": "COMPLETA",
  "fechaReferencial": "2026-10-17",
  "nota": null,
  "anotaciones": [ { "referencia": "B2", "estado": "CANCELADA", "descripcion": null } ],
  "versionEsperada": 0
}
```

- Todo se valida antes de escribir. Una entrada inválida da 400 y no cambia nada.
- `versionEsperada` es obligatoria. Si ya no coincide con la versión guardada, la respuesta es 409.
- Valores permitidos: `completitud` = COMPLETA, INCOMPLETA o DESCONOCIDA; `estado` de anotación = VIGENTE, CANCELADA o DESCONOCIDO.
- Hasta 20 anotaciones, con referencias únicas de 1 a 20 caracteres alfanuméricos o guion.
- Los campos que no estén en el contrato (por ejemplo `estado`) se ignoran: el color siempre se recalcula.
- La actualización, el recálculo y el guardado son una sola transacción.

## Estados del semáforo

| Estado | Cuándo | Significado |
|---|---|---|
| `VERDE` | Datos mínimos completos, sin alertas y condición contemplada | Sin alertas detectadas en los campos evaluados. No es saneamiento |
| `AMARILLO` | Hay una alerta de revisión | Requiere revisión |
| `ROJO` | Hay una alerta prioritaria con datos completos | Alerta prioritaria. Hoy no hay reglas prioritarias cargadas |
| `GRIS` | Faltan datos mínimos o la condición no está contemplada | Información insuficiente. Las alertas conocidas se conservan |

## Códigos de error

Las respuestas de error usan `application/problem+json` con el campo `detail`.

| Código | Cuándo |
|---|---|
| 400 | Cuerpo inválido, valor fuera de las enumeraciones, referencia repetida |
| 401 | Sin token, token vencido o de otro emisor, credenciales incorrectas |
| 403 | El rol no permite la operación |
| 404 | Caso, ítem o documento inexistente. Un ítem de otro caso también da 404 |
| 409 | La versión del expediente cambió |
| 413 | El archivo supera 5 MB |
| 422 | El archivo no es un PDF válido |
| 429 | Demasiados intentos de login |
