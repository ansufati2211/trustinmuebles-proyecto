# Trustinmuebles — MVP académico de orientación documental

Proyecto del curso Diseño e Implementación de Arquitectura Empresarial. Es un MVP que muestra **partidas registrales
simuladas** de lotes urbanos de Ica, con documentos que se parecen a una copia literal pero son ficticios, explica sus
términos y señala qué información falta. **No certifica saneamiento, no recomienda comprar, no
consulta fuentes oficiales y no reemplaza asesoría legal.** El informe lo llama InmoClaro (ver `docs/decisiones.md`, D2).

Dos carpetas:
- `trustinmuebles-backend/` — API de Spring Boot 4 con Java 21. Ver su README.
- `trustinmuebles/` — interfaz de React 19 con Vite.

Documentación en `docs/`: funcionalidades, entorno, decisiones, API, trazabilidad, pruebas con evidencias, manuales y notas para el informe. Para saber qué hace el programa, empieza por `docs/funcionalidades.md`.

## Requisitos

- Java 21. Maven no hace falta: `./mvnw` lo descarga.
- Node.js 20 o superior. Se usa `npx pnpm@9`, porque el `pnpm` del sistema puede exigir Node 22.
- No hace falta instalar ninguna base de datos: el backend usa H2 en archivo.

## Cómo correrlo (dos terminales)

El backend necesita la contraseña de las cuentas de prueba **antes del primer arranque**. No tiene valor por defecto: elige
una de al menos 8 caracteres.

```bash
# Terminal 1: backend en http://127.0.0.1:8080  (Swagger: /swagger-ui.html)
cd trustinmuebles-backend
env APP_SEED_PASSWORD='elige-una-clave-de-prueba' ./mvnw spring-boot:run

# Terminal 2: interfaz en http://localhost:5173
cd trustinmuebles
npx pnpm@9 install
npx pnpm@9 dev
```

Si falta `APP_SEED_PASSWORD`, el backend se detiene con un mensaje que lo explica. Los comandos funcionan en bash, zsh y fish.

## Cuentas de prueba

| Cuenta | Rol | Puede |
|---|---|---|
| `comprador-01` | Comprador | Consultar casos, glosario, checklist y documento |
| `revisor-01` | Revisor | Lo anterior, más editar expedientes, cambiar el checklist y asociar el PDF |

Las dos usan la contraseña de `APP_SEED_PASSWORD`. Se crean solo cuando la base está vacía: si cambias la variable con una base
ya creada, la contraseña no cambia. Para empezar de cero, apaga el backend y borra la carpeta `trustinmuebles-backend/data/`.
No hay registro abierto.

## Casos cargados

Cada caso es una partida simulada: lleva el prefijo `SIM-`, un nombre de predio en un distrito de Ica y una copia literal en
PDF generada por el sistema. Todo es inventado.

| Partida | Predio | Estado esperado | Qué muestra |
|---|---|---|---|
| `SIM-11048217` | Mz. F Lote 7 · Santa Elvira · Parcona | Verde | Una titular; hipoteca cancelada |
| `SIM-11052690` | Mz. K Lote 12 · Rincón del Sauce · La Tinguiña | Amarillo | Copropiedad; hipoteca vigente; embargo cancelado |
| `SIM-11061555` | Mz. C Lote 3 · Mirador del Sol · Subtanjalla | Gris | Extracto parcial sin títulos de dominio; demanda vigente (alerta prioritaria) |
| `SIM-11070419` | Mz. B Lote 9 · Villa del Algarrobo · Los Aquijes | Gris | Sin copia literal: titularidad y cargas no constan |

Las reglas (tabla borrador v0.2), el glosario y la redacción de los documentos están **pendientes de revisión especializada**.
Si tenías una base creada con una versión anterior, apaga el backend y borra `trustinmuebles-backend/data/`: los casos
cambiaron de código.

## Partidas reales (transcritas)

El revisor puede registrar partidas reales consultadas en Conoce Aquí (SUNARP), sin nombres ni datos de personas naturales.
No hay API de SUNARP: se consulta a mano y se pega el texto. Ver `docs/guia-transcripcion.md` y `docs/decisiones.md` (D20).
Es un desvío de RN-01 y PA2 que el asesor debe aprobar.

## Pruebas

```bash
cd trustinmuebles-backend && ./mvnw test        # 62 pruebas
cd trustinmuebles && npx pnpm@9 build           # verifica tipos y compila
cd trustinmuebles && npx pnpm@9 test            # 12 pruebas de la limpieza de datos personales
env APP_SEED_PASSWORD='…' node scripts/medir-nf02.mjs   # rendimiento (con el backend encendido)
```

Resultados y evidencias en `docs/pruebas/`. El recorrido de navegador se explica en `docs/pruebas/recorrido-manual.md`.

## Qué no incluye

Integraciones estatales, OCR, inteligencia artificial, autenticidad documental, dictámenes jurídicos, pagos, contratos,
firmas, inspección, planos, tours, posventa, filtros avanzados y reportes descargables (sección 1.7 del informe).

## Pendiente fuera del código

Revisión especializada del contenido, piloto, reclutamiento, consentimientos y aplicación del estudio, fechas y
presupuesto. Los materiales del estudio (formas A y B, claves y bases vacías) están en la carpeta `estudio/` que se
mantiene **fuera de este repositorio** a propósito.

## Uso local

El backend escucha solo en `127.0.0.1` y la interfaz solo en localhost. La configuración de seguridad es de desarrollo
local. No la uses en un servidor accesible desde la red (ver `docs/decisiones.md`, D9).
