# Trustinmuebles — MVP académico de orientación documental (v0.5.1)

Proyecto del curso Diseño e Implementación de Arquitectura Empresarial. Trustinmuebles es el sistema de transparencia
precompra de **una sola inmobiliaria de Ica**, que carga a mano su propia cartera (sin scraping de otros portales ni APIs
públicas, que SUNARP no ofrece). Muestra **partidas registrales simuladas** de lotes y viviendas urbanas, con documentos que se
parecen a una copia literal pero son ficticios, explica sus términos y señala qué información falta. **No certifica
saneamiento, no recomienda comprar, no consulta fuentes oficiales y no reemplaza asesoría legal.**

El producto se llama Trustinmuebles en el código, en la documentación y en el informe (ver `docs/decisiones.md`, D2).

Dos carpetas:
- `trustinmuebles-backend/` — API de Spring Boot 4 con Java 21, modular con Spring Modulith en 8 módulos: `identidad`,
  `expediente`, `clasificacion`, `inspeccion`, `checklist`, `orientacion`, `almacenamiento` y `shared`. Ver su README.
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
| `comprador-01` | COMPRADOR | Consultar casos, glosario, checklist y documento |
| `revisor-01` | REVISOR | Lo anterior, más editar expedientes y planos, cambiar el checklist, subir PDF y registrar partidas |
| `especialista-01` | ESPECIALISTA | Consultar, y emitir el informe técnico de una inspección solicitada. No edita partidas |

Las tres cuentas usan la contraseña de `APP_SEED_PASSWORD`. Se crean solo cuando la base está vacía: si cambias la variable con una base
ya creada, la contraseña no cambia. Para empezar de cero, apaga el backend y borra la carpeta `trustinmuebles-backend/data/`.
No hay registro abierto.

## Casos cargados

Cada caso es una partida simulada: lleva el prefijo `SIM-`, un predio en un distrito de Ica (con una habilitación inventada), su
copia literal y sus láminas de planos en PDF, y un informe técnico cuando se emitió. Todo es inventado.

| Partida | Predio | Estado esperado | Qué muestra |
|---|---|---|---|
| `SIM-11048217` | Mz. F Lote 7 · Santa Elvira · Parcona | Verde | Una titular; hipoteca cancelada; 4 planos; informe favorable |
| `SIM-11052690` | Mz. K Lote 12 · Rincón del Sauce · La Tinguiña | Amarillo | Copropiedad; hipoteca vigente; faltan los planos de II.EE. e II.SS.; informe con observaciones |
| `SIM-11061555` | Mz. C Lote 3 · Mirador del Sol · Subtanjalla | Gris | Extracto parcial; demanda vigente (alerta prioritaria); sin planos |
| `SIM-11070419` | Mz. B Lote 9 · Villa del Algarrobo · Los Aquijes | Gris | Sin copia literal ni planos |
| `SIM-11075836` | Mz. G Lote 14 · Jardines del Pacae · Pueblo Nuevo | Rojo | Embargo vigente ordenado por un juzgado civil; 4 planos |
| `SIM-11081204` | Mz. B Lote 5 · Campiña del Olivar · Santiago | Verde | Lote recién independizado, sin cargas; los planos no aplican |
| `SIM-11087751` | Mz. D Lote 22 · Los Tamarindos · Salas | Amarillo | Sucesión intestada con coherederos; servidumbre de paso; adobe; informe con riesgo |
| `SIM-11093320` | Mz. A Lote 3 · Puente Molino · San José de los Molinos | Rojo | Bloqueo registral vigente; inspección solicitada |
| `SIM-11098467` | Mz. N Lote 8 · Mirador del Pallar · Pachacútec | Amarillo | Ampliación no declarada: plano de 98 m² contra 72 m² inscritos; inspección en curso |
| `SIM-11104029` | Mz. M Lote 6 · Los Laureles del Sur · Ica | Amarillo | Reserva vial (carga técnica); plano de estructuras observado; informe favorable |

Los casos 5 a 10 no forman parte del instrumento del estudio: las formas A y B usan solo los 4 primeros.

Las reglas (tabla borrador v0.4), el glosario y la redacción de los documentos están **pendientes de revisión especializada**.
Si tenías una base creada con una versión anterior, apaga el backend y borra `trustinmuebles-backend/data/`: los casos
cambiaron de código.

## Partidas reales (transcritas)

El revisor puede registrar partidas reales consultadas en Conoce Aquí (SUNARP), sin nombres ni datos de personas naturales.
No hay API de SUNARP: se consulta a mano y se pega el texto. Ver `docs/guia-transcripcion.md` y `docs/decisiones.md` (D20).
Es un desvío de RN-01 y PA2 que el asesor debe aprobar.

## Pruebas

```bash
cd trustinmuebles-backend && ./mvnw test        # 92 pruebas del backend
cd trustinmuebles && npx pnpm@9 build           # verifica tipos y compila
cd trustinmuebles && npx pnpm@9 test            # 12 pruebas del frontend (lectura de partidas y limpieza de datos personales)
env APP_SEED_PASSWORD='…' node scripts/medir-nf02.mjs   # rendimiento (con el backend encendido)
```

En total, 104 pruebas automáticas. Resultados y evidencias en `docs/pruebas/`. El recorrido de navegador se explica en `docs/pruebas/recorrido-manual.md`.

## Funcionalidades implementadas

- **Indicador A, pre-evaluación documental:** semáforo automático por reglas versionadas sobre la partida (rubros C, D, E y F)
  y los 4 planos de la vivienda, con motivos, alertas y faltantes.
- **Expediente técnico de 4 planos:** arquitectura, estructuras, instalaciones eléctricas (II.EE.) e instalaciones sanitarias
  (II.SS.), con una lámina 2D a escala por plano generada en PDF con PDFBox. El revisor puede subir el PDF real de cada plano.
- **Indicador B, evaluación técnica presencial:** el comprador la solicita y el rol especialista (ingeniero civil o arquitecto)
  emite el informe siguiendo un procedimiento de 6 pasos, también en PDF. Nunca cambia el color del indicador A (RN-10).
- Copia literal simulada en PDF, glosario cerrado, checklist, edición transaccional del revisor y partidas transcritas sin
  datos personales. El detalle está en `docs/funcionalidades.md`.

## Qué no incluye

Integraciones estatales, scraping de portales, OCR, inteligencia artificial o visión artificial, autenticidad documental,
dictámenes jurídicos, pagos, contratos, firmas, tours, posventa, filtros avanzados y reportes descargables (sección 1.7 del
informe).

## Pendiente fuera del código

Revisión especializada del contenido, piloto, reclutamiento, consentimientos y aplicación del estudio, fechas y
presupuesto. Los materiales del estudio (formas A y B, claves y bases vacías) están en la carpeta `estudio/` que se
mantiene **fuera de este repositorio** a propósito.

## Uso local

El backend escucha solo en `127.0.0.1` y la interfaz solo en localhost. La configuración de seguridad es de desarrollo
local. No la uses en un servidor accesible desde la red (ver `docs/decisiones.md`, D9).
