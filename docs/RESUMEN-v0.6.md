# Resumen de la v0.6.0

Rama `feature/v0.6-ui-comercial`, sobre la v0.5.1 (`17d90b7`). Trabajo hecho en una sola sesión, sin supervisión, por fases.
Ningún cambio se subió al remoto (no hubo `git push`).

## Resultados reales de la última ejecución (19 de octubre de 2026)

| Comando | Resultado |
|---|---|
| `.\mvnw.cmd test` (backend) | **107 pruebas, 0 fallos, 0 errores, 0 omitidas** (14 clases). Antes: 92 |
| `npx pnpm@9 test` (frontend) | **33 pruebas en 6 archivos, todas en verde**. Antes: 12 |
| `npx pnpm@9 build` | **Compilación limpia** (verificación de tipos con `tsc` y Vite, 1919 módulos) |
| Recorrido de navegador `docs/pruebas/recorrido-v06.mjs` | **39 de 39 verificaciones** con los 3 roles sobre una base nueva, sin errores de consola |

Total de pruebas automáticas: 140 (107 + 33). Las capturas del recorrido están en `docs/pruebas/evidencias/capturas-v06/`.

## Commits

| Fase | Commit | Contenido |
|---|---|---|
| 0 | `170d285` | Línea base verificada (92 + 12 + compilación) y versión 0.6.0 en pom, package.json, LEEME, README y pie |
| 1 | `01a7361` | Backend: migración V5, datos del predio, M5, M8, M9, filtros M13 y 14 pruebas nuevas |
| 2 | `39a08db` | Sistema visual: tokens, componentes base e ilustraciones SVG propias |
| 3 | `bafb740` | Pantallas: inicio, catálogo y detalle; 21 pruebas nuevas de Vitest; recorrido de navegador |
| 4 | (este commit) | Documentación M10, prueba de I6 y este resumen |

## Qué quedó hecho

**Backend**
- Migración nueva `V5__predio_comercial_y_servicio_tecnico.sql` (V1 a V4 sin tocar): distrito y precio referencial del predio,
  perfil profesional del usuario y solicitante de la inspección. La carga de contenido rellena una base existente sin borrar
  nada; se comprobó con una copia de la base v0.5.
- Datos del predio en el listado y el detalle (`predio`): `tipoInmueble`, distrito, área, área construida inscrita y precio
  referencial en soles, con una nota que dice que es informativo.
- **M5:** solo el comprador solicita la inspección (403 para revisor y especialista, en `SecurityConfig` y en el servicio). Se
  guardan `solicitanteCodigo`, tomado de la sesión, y la fecha. Hay una sola solicitud por caso (409). El costo referencial
  S/ 250.00 sale de `app.inspeccion.costo-referencial` y viaja en `evaluacionTecnica.servicio`.
- **M8:** `especialista-01` tiene perfil ficticio (Ing. Carlos Alberto Mendoza Quispe, Ingeniero Civil, CIP N.° 248910). El
  informe toma nombre, especialidad y colegiatura de la cuenta autenticada mediante la API pública de `identidad`
  (`AuthService.perfilProfesional`). Lo que mande el cliente se ignora. Los informes de demostración también los firma esa cuenta.
- **M9:** ítem «Declaración Jurada Municipal (HR y PU)» en los 10 casos. Hay 4 revisados, 4 observados con su motivo y 2
  pendientes.
- **M13:** `GET /casos` filtra por `tipoInmueble`, `estado`, `estadoTecnico` (también `INFORME_EMITIDO`) y
  `riesgoFisicoDetectado`, combinables, con 400 ante valores desconocidos.
- El PDF del informe técnico imprime la especialidad y rotula los datos del profesional como ficticios.

**Interfaz**
- Tokens de diseño en `src/index.css`. El semáforo tiene contraste AA, de 7.4:1 a 8.9:1, con ícono y texto.
- Componentes `TopBar`, `Footer`, `Badge`, `IndicadorA`, `IndicadorB`, `Modal` (aria-modal, foco atrapado, Escape, vuelta del
  foco) y `PredioImagen`. Hay estados de carga, vacío y error.
- Ilustraciones SVG propias en 4 variantes, con un dibujo distinto por caso y texto alternativo. No hay imágenes externas.
- **Inicio:** héroe con ilustración y «Explorar Cartera de Inmuebles», el modelo en 4 pasos, los indicadores A y B separados y
  la transparencia de fuentes, con el bloque «Sin scraping ni APIs inexistentes».
- **Catálogo:** tarjetas con ilustración, tipo, distrito, área, precio rotulado «dato simulado» y los dos indicadores. Los
  filtros se combinan y quedan en la URL, con contador, botón para limpiar y estado vacío.
- **Detalle:**
  - Cabecera con ilustración, precio y los dos indicadores.
  - 4 tarjetas de planos con ícono, miniatura 2D, comparador de áreas (resalta 98 contra 72 m² en Pachacútec), visor modal y
    enlace al PDF.
  - Indicador B con stepper de 4 etapas, los 6 pasos con su avance, tarjetas de estado físico y credencial ficticia.
  - Solicitud en un modal, visible solo para el comprador, con el costo que manda el backend. Al confirmar se muestran el
    solicitante y la fecha.
  - Texto fijo de RN-10.
- El formulario del especialista ya no pide nombre ni colegiatura.

**Documentación (M10)**
- `LEEME.md` y `trustinmuebles-backend/README.md`: arranque en Windows PowerShell además de bash, fuentes gratuitas frente a
  pagadas, los dos servicios, invariantes I1 a I7 con su prueba y conteos reales.
- `docs/funcionalidades.md`, `docs/api.md`, `docs/trazabilidad.md`, `docs/cambios.md`, los manuales del comprador y del
  especialista, y las decisiones D23 a D31.
- Se corrigieron datos viejos: el glosario tiene 48 términos (no 32), las reglas v0.4 reemplazan la tabla v0.2 en `api.md` y la
  fila de RN-01 en la trazabilidad ya refleja las partidas transcritas.

## Invariantes y su prueba

| | Prueba |
|---|---|
| I1 Verde = «Sin alertas en los campos evaluados» | `CatalogoYServiciosTest.verdeSignificaSinAlertas` |
| I2 B no cambia el color de A | `CatalogoYServiciosTest.informeConRiesgoNoCambiaElColor`, `InspeccionTest.flujoCompleto` |
| I3 El checklist no cambia el color de A | `CatalogoYServiciosTest.hrPuNoCambiaElColor` |
| I4 Autorización en el servidor | `soloElCompradorSolicita`, `otroRolNoEmite`, `SeguridadTest` |
| I5 Límites de Spring Modulith | `ModularityTests` |
| I6 Solo `127.0.0.1` | `ConfiguracionLocalTest.soloEscuchaEnLocal` |
| I7 Rótulos de datos simulados | Recorrido `recorrido-v06.mjs` (no corre con `pnpm test`) |

## Supuestos y desvíos del pedido

1. **Tipo de inmueble (D23).** El pedido asignaba lotes a Subtanjalla, Los Aquijes, Pueblo Nuevo y San José de los Molinos.
   En el contenido esas cuatro son viviendas, y las pruebas existentes lo fijan (RV-04 y declaratoria de fábrica). Cambiarlas
   rompía pruebas, reglas y los casos 3 y 4 del estudio. Se mantienen 9 viviendas y 1 lote (Santiago); el tipo se deriva de
   `tipoPredio` y no se guarda aparte.
2. **Prueba existente adaptada por M8.** `InspeccionTest.validaElInforme` exigía 400 cuando faltaban el nombre o la colegiatura
   en el cuerpo. M8 reemplaza ese contrato, porque ahora salen de la cuenta, así que se quitaron esos dos campos del bucle. El
   resto de esa prueba sigue igual.
3. **Etiqueta del verde (D27).** Pasó de «Sin alertas detectadas en los campos evaluados» al texto exacto de I1.
4. **Rótulos en la interfaz (D26).** La prueba `sinRastrosDelEstudio` prohíbe «simulad», «MVP» y «ejemplo» en la API. Por eso
   el rótulo «dato simulado» lo pone la interfaz, y la nota del costo dice «sin pasarela de pago en línea» en lugar de «en el MVP».
5. **Filtros en el servidor (D25)**, aunque el listado no está paginado: el color y el riesgo vienen de dos módulos.
6. **Pruebas del frontend con funciones puras (D30)**, sin agregar jsdom ni Testing Library. La interacción se comprobó con el
   recorrido de navegador.
7. **Avance de los 6 pasos (D31).** El backend no guarda el avance por paso; la interfaz lo deriva del estado.
8. **«Una sola solicitud activa».** Se mantiene una sola solicitud por expediente para siempre, como antes. Permitir una nueva
   inspección después de un informe exige el historial de evaluaciones (mejora M6, no pedida).
9. **README.** No hay un `README.md` en la raíz; el README del proyecto es `LEEME.md` y el del backend es
   `trustinmuebles-backend/README.md`. Se actualizaron los dos.

## Qué no quedó hecho o queda pendiente

- **Número de colegiatura.** «CIP N.° 248910» se usó tal como se pidió, pero no lleva `SIM-` (excepción a D22). Conviene
  verificar que no pertenezca a un ingeniero real o cambiarlo por uno con `SIM-`.
- **Bases anteriores.** Una base v0.5 migra bien, pero sus informes ya guardados conservan el profesional anterior
  (Hernán Gustavo Paredes Lazo, `CIP SIM-0001`) y no tienen solicitante. Para verlo todo como en la v0.6, borra
  `trustinmuebles-backend/data/`.
- **I7 sin prueba en `pnpm test`.** Los rótulos se comprueban con el recorrido de navegador, que necesita los dos servidores
  encendidos y `puppeteer-core` instalado aparte.
- **Capturas antiguas.** Las de `docs/pruebas/evidencias/capturas/` siguen siendo de la v0.5; las nuevas están en
  `capturas-v06/`.
- **Accesibilidad.** No se probó con lector de pantalla ni en navegadores distintos de Chrome.
- **Sin cambios en el informe Word.** Los requisitos nuevos (datos del predio, M5, M8, M9, M13) aún no figuran en
  `APF1_TRUSTInmub_.docx`.
- **Pendientes del proyecto que siguen abiertos:** revisión especializada de reglas y glosario, aprobación del asesor de los
  desvíos D20 y D21, y CP-07 en otro equipo.

No hubo pruebas en rojo sin resolver, así que no se creó `docs/PENDIENTES.md`.
