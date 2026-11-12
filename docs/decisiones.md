# Decisiones de diseño y ajustes respecto del informe

Cada decisión indica qué sección del informe afecta y quién debe confirmarla. Ninguna se considera cerrada hasta que el
equipo y el docente la acepten.

## D1. Se usa el stack que ya existía

**Qué:** Spring Boot 4 y Java 21 en el backend, React 19 y Vite en la interfaz, H2 en archivo como base.
**Por qué:** el equipo ya tenía esa base funcional y decidió no rehacerla. La sección 6.6.2 lo contempla.
**Afecta:** 6.6.2, Tabla 49, Figura 11. **Confirma:** equipo y docente.

## D2. El producto se llama Trustinmuebles

**Qué:** el único nombre del producto es Trustinmuebles, en el código, la interfaz, los repositorios, la documentación y el
informe. En la v0.5.1 se retiraron del informe Word el nombre anterior y una grafía errónea del nombre.
**Afecta:** portada, título y todo el texto del informe. **Confirma:** equipo.

## D3. Se retiró todo lo que el informe excluye

**Qué:** SUNARP simulado, inspección con planos 2D, trámites con firmas, posventa, métricas, registro abierto de cuentas,
publicación en GitHub Pages, Docker y el perfil PostgreSQL.
**Por qué:** 1.7, 4.3 y 6.5.4 los excluyen. Además los datos de ejemplo usaban nombres, direcciones, partidas y fotos con
apariencia real, lo que contradice RN-01 y PA2.
**Cómo se recupera:** el código anterior sigue en el historial de Git (commit `3a97ad5`).
**Actualización (v0.7):** Docker volvió el 26 de octubre (`edd0bbc`, `42321d1`) como opción de ejecución, en contra de esta
decisión. Se conserva con dos límites para respetar I6 y D9: el puerto publicado se liga a `127.0.0.1` y el flujo de GHCR solo se
lanza a mano. Sigue sin haberse ejecutado; el perfil PostgreSQL y las demás exclusiones se mantienen.

## D4. El contenido vive en JSON versionado, no en SQL

**Qué:** casos, reglas y glosario están en `trustinmuebles-backend/src/main/resources/contenido/v0.2/`. La carpeta `v0.1` se conserva
solo como historial: tiene la forma anterior de los casos y ya no se carga. Al arrancar se
cargan de forma idempotente y no pisan lo que el revisor ya editó. Las migraciones de Flyway solo crean el esquema.
**Por qué:** un especialista puede revisar un JSON sin leer SQL, y la versión del contenido queda explícita.
**Migraciones:** `V1`, `V2` y `V3` anteriores se reemplazaron por una sola `V1__esquema.sql`. No existía ninguna base
desplegada. Quien tenga una base antigua debe borrar `trustinmuebles-backend/data/`.

## D5. Base H2 en archivo en lugar de MySQL

**Qué:** H2 en modo PostgreSQL, guardada en `trustinmuebles-backend/data/h2/`.
**Por qué:** no requiere instalar nada y la ejecución es local, como pide el informe. El SQL es estándar.
**Afecta:** Tabla 49 («Persistencia»). **Riesgo:** H2 no es una base de producción.

## D6. Interpretaciones de las reglas, pendientes de revisión

Estas decisiones llenan vacíos del informe. Un especialista debe confirmarlas.

| # | Situación | Decisión | Dónde está |
|---|---|---|---|
| D6.1 | «El extracto no permite descartar otras anotaciones» | Se registra como completitud incompleta, y eso produce GRIS | Subtanjalla (SIM-11061555) y RN-04 |
| D6.2 | Estado de los ítems del checklist | No cambia el color del semáforo | `ChecklistService` |
| D6.3 | Regla prioritaria y datos faltantes a la vez | Gana GRIS (RN-04) y la alerta conocida sigue visible | `MotorClasificacion` |
| D6.4 | Regla prioritaria y condición no contemplada | ROJO, con la condición añadida como motivo | `MotorClasificacion` |
| D6.5 | Regla de revisión y condición no contemplada | AMARILLO, con la condición añadida como motivo | `MotorClasificacion` |
| D6.6 | Qué tipos de acto dan rojo y cuáles amarillo | **Tabla borrador v0.2**, activa y rotulada como pendiente de revisión especializada: embargo, anotación de demanda, medida cautelar y bloqueo vigentes dan rojo; hipoteca, carga técnica y servidumbre vigentes dan amarillo; otro acto vigente da amarillo. La hipoteca no se trata como defecto por sí misma y la copropiedad no alerta | `reglas.json` (v0.2) |
| D6.7 | Un gravamen cancelado | No alerta | `MotorClasificacion` |

## D7. El estado de un gravamen y la titularidad se derivan de la partida

**Qué:** el estado de un asiento D (gravámenes y cargas) es cancelado si y solo si un asiento E lo cancela, y la titularidad
es la del último asiento C. No se escriben a mano, y marcar un gravamen como cancelado sin el asiento E que lo cancela se
rechaza con un mensaje claro.
**Por qué:** un dato escrito aparte («Anotación B2: vigente») se contradice cuando el revisor cambia el estado. Se detectó en el
recorrido del navegador. Derivarlo hace imposible la contradicción. El PDF también se genera desde esos mismos datos.

## D8. Roles y permisos

- Hay dos roles: COMPRADOR y REVISOR. El comprador solo consulta.
- Cualquier cuenta REVISOR puede editar cualquier caso. `responsable_id` registra quién cargó el caso y no restringe la edición.
- Las cuentas las crea el equipo con `APP_SEED_PASSWORD`. No hay registro abierto.
- El rol se verifica en `SecurityConfig` (servidor). La interfaz solo oculta lo que el rol no puede hacer.

## D9. Seguridad de una instalación local

- El backend escucha solo en `127.0.0.1` y el servidor de desarrollo de Vite solo en localhost.
- El token de sesión está en `sessionStorage`: se pierde al cerrar la pestaña, útil cuando varios participantes comparten equipo.
- Se mantiene el límite de intentos de login (5 fallos bloquean la combinación cuenta e IP durante 15 minutos).
- Las contraseñas se guardan con BCrypt. `APP_SEED_PASSWORD` no tiene valor por defecto.
- `app.jwt.secret` y `app.storage.key` traen valores de desarrollo local en `application.properties`. Son solo para este
  uso local. No usar esta configuración en un servidor accesible desde la red.
- Swagger queda abierto en local (`/swagger-ui.html`).

## D10. Bloqueo optimista obligatorio

**Qué:** la edición exige `versionEsperada`. Si otra persona guardó antes, la respuesta es 409 y no se cambia nada.
**Por qué:** REQ-NF04 pide que una entrada inválida no deje registros parciales.

## D11. Versión de reglas

La versión activa sale de `app.reglas.version` (hoy `v0.4`). Al arrancar, cada expediente cuya evaluación falte, use otra
versión o esté atrasada se recalcula. Cada evaluación guarda la versión con que se calculó (RN-06).

## D12. Los Aquijes es la partida de familiarización

La partida `SIM-11070419` la diseñó el equipo a partir de la Figura 8. Sirve para el paso 6 de 3.14 (familiarización con un
ejemplo distinto a los casos evaluados) y no se evalúa.

## D13. Fecha referencial

Los casos traen la fecha de carga (2026-10-17). Se muestra con la advertencia «No es una consulta de actualidad oficial».
No hay vencimiento automático ni consulta de actualidad (RN-08).

## D14. Documentos realistas, pero que no pueden pasar por oficiales

**Qué:** cada caso es una partida con la estructura de una copia literal peruana: encabezado de zona y oficina registral,
descripción del inmueble, antecedente dominial y asientos por rubro con título archivado y fechas. El PDF lo genera el sistema
con Apache PDFBox.
**Límites que se respetan** (RN-01, 1.8, PA2):
- Sin logo, escudo, sello, firma, código de verificación ni código QR.
- Marca de agua diagonal «DOCUMENTO SIMULADO · SIN VALOR LEGAL · USO ACADÉMICO» y un pie aclaratorio en cada página.
- El título dice «copia literal simulada». Toda partida, título archivado y expediente judicial lleva el prefijo `SIM-`, que
  SUNARP no usa.
- Personas y empresas inventadas, sin personas públicas. No se nombran bancos, cajas, notarías ni notarios.
- Distritos reales de Ica con habilitaciones urbanas inventadas. Se buscó en internet que esos nombres no aparecieran en esos
  distritos y se descartó uno que sí existe (Los Huarangos).
**Pendiente del especialista:** confirmar que la redacción registral es razonable y que ningún nombre coincide con uno real.

## D15. Los rubros A y B no llevan letra en el documento

**Qué:** el documento muestra «Descripción del inmueble» y «Antecedente dominial» como bloques sin letra, y solo numera los
asientos de los rubros C a F.
**Por qué:** las fuentes consultadas coinciden en C (títulos de dominio), D (gravámenes y cargas) y E (cancelaciones), pero
discrepan en cuál de las letras A o B corresponde a la descripción y al antecedente. No se afirma lo que no se pudo confirmar.
**Pendiente del especialista:** confirmar el orden oficial de los rubros en el Reglamento de Inscripciones del Registro de Predios.

## D16. El código de un caso es su partida simulada

**Qué:** el caso se identifica por su número de partida (`SIM-11048217`), que también va en la URL. Ya no se llaman B-01, B-02 o
DEMO-01, para que el participante no vea el diseño del estudio.
**Equivalencia con el estudio:** solo consta en la carpeta `estudio/`, que no está en el repositorio.

## D17. Normas citadas en el glosario

Los textos del glosario citan, como referencia a verificar por el especialista: Código Civil, arts. 1035 (servidumbre) y 1097
(hipoteca); Código Procesal Civil, arts. 656 (embargo en forma de inscripción) y 673 (anotación de demanda); y Ley 26639
(bloqueo registral). No se consultó el texto oficial de ninguna: pueden estar mal citadas.

## D18. Datos del predio opcionales

La zona, la oficina, la ubicación, el área, los linderos y el antecedente son opcionales. Un caso con información insuficiente,
como el de práctica, los deja en blanco y el PDF imprime «no informado». El área se imprime siempre con dos decimales.

## D19. Tono de servicio real
La interfaz ya no habla de «práctica», «MVP» ni «cuenta de prueba». Se conservan tres señales para cumplir RN-01 y evitar
que un documento pase por oficial: el aviso fijo superior («Entorno de demostración…»), la marca de agua y el pie del PDF, y el
prefijo `SIM-` en las partidas. La partida `SIM-99000001` pasó a `SIM-11070419` (Los Aquijes).

## D20. Partidas transcritas de una consulta pública
**Qué:** además de las partidas ficticias (`SIM-`), el revisor puede registrar una partida real consultada en Conoce Aquí
(SUNARP), buscándola por su número. Queda marcada como «Transcrita de SUNARP», con su fuente y la fecha de consulta.

**Fuentes y límites.** SUNARP no tiene API pública (la PIDE es solo para entidades públicas). Conoce Aquí es gratis, pero pide
el DNI de quien consulta (ID-Perú), permite 5 partidas al día y no deja imprimir. Por eso Trustinmuebles **no consulta ni lee**
ese sitio: enlaza a él y el revisor pega el texto. Automatizarlo exigiría usar la identidad de otra persona. Tampoco hay una API
de terceros para predios: las que existen son de vehículos. Los planos como documento salen en la copia informativa del título
archivado (de pago); aquí solo se enlaza al Visor BGR.

**Datos personales.** El reglamento de la Ley 29733 (D.S. 016-2024-JUS) considera los Registros Públicos de SUNARP fuente
accesible al público (art. 11.1.7), pero exige respetar los principios de la ley (art. 11.3) y califica como infracción grave
usar datos para otra finalidad sin anonimizarlos (art. 133.7). Decisión: **no se guardan ni se muestran nombres, DNI, estado civil
ni domicilios de personas naturales**. Se conservan las empresas y el Estado.
- El navegador reemplaza los nombres por «Persona natural N» y omite los demás datos (`lib/disociar.ts`). El texto original no se
  envía. El revisor revisa una vista previa y confirma.
- El servidor rechaza con 400 los DNI, el estado civil y los domicilios (`ProteccionDatos`). No detecta nombres.
- `DELETE /api/v1/casos/{codigo}` borra una partida transcrita (por ejemplo, ante el pedido de un titular).
- El PDF dice «Transcripción referencial · No es publicidad registral · Sin valor legal».

**Desvío del informe.** RN-01 y PA2 piden solo casos sintéticos: esto es un desvío que el asesor debe aprobar. La sección 1.7
(sin integraciones estatales) se respeta. Las partidas transcritas no se versionan: viven en la base local.

**Límite conocido.** La detección de nombres es una heurística: puede dejar pasar uno o ocultar de más. Por eso hay vista previa,
confirmación y borrado.

## D21. Sistema de una inmobiliaria, planos y evaluación técnica (feedback EXP2)
**Qué:** a partir de las observaciones del profesor (EXP2), Trustinmuebles se plantea como el sistema de transparencia
precompra de **una** inmobiliaria de Ica, que carga a mano su propia cartera. Se agregan:
- **Expediente técnico de planos** de una vivienda, con 4 especialidades: arquitectura, estructuras, instalaciones eléctricas
  (II.EE.) e instalaciones sanitarias (II.SS.). El sistema revisa solo lo documental: si el plano está y si el área del plano
  arquitectónico coincide con la área construida inscrita (margen de 1 %).
- **Dos indicadores separados.** A: pre-evaluación documental, automática, con las reglas. B: evaluación técnica presencial,
  que fija el informe de un especialista y **nunca cambia el color de A**.
- **Procedimiento de inspección de 6 pasos** y un informe técnico con verificación en campo por especialidad.
- **Rol ESPECIALISTA** (`especialista-01`): el único que emite el informe. El comprador solo solicita la inspección (sin cobro
  ni agenda). El revisor no se califica a sí mismo.

**Reglas nuevas (v0.3, borrador pendiente de revisión especializada):** RV-04 falta un plano de II.EE. o II.SS. en una vivienda;
RV-05 el área del plano no coincide con la inscrita, o no consta una inscrita; RV-06 plano observado. Una vivienda sin plano
arquitectónico o de estructuras queda en gris. En un lote los planos no aplican.

**Lo que se decidió no hacer, y por qué:**
- No hay una regla roja por «inconsistencia entre el inmueble físico y la partida»: las reglas documentales no ven el estado
  físico. Eso contradice lo que observó el profesor (un plano correcto no demuestra que la obra esté bien). El riesgo físico
  aparece solo en el indicador B.
- No se dice «partida limpia» ni «vivienda segura». Verde sigue significando «sin alertas en los campos evaluados».
- No hay visión artificial ni OCR: el análisis es por reglas deterministas sobre datos estructurados y el informe del especialista.
- Las láminas 2D son esquemas ficticios con marca de agua y sin sello ni firma; si el revisor sube el PDF real del plano, se
  muestra ese. El profesional de la demostración es ficticio (`CIP SIM-0001`).

**Desvío del informe.** 1.7, 4.3 y 6.5.4 excluyen planos e inspección (ver D3). Este cambio responde a EXP2 y debe
reflejarse en el informe, con sus nuevos requisitos. Pendiente de aprobación del asesor.

**Código anterior.** El commit `3a97ad5` tenía `Plano2D` e `Inspeccion` con pines de falla sobre una sola imagen. No se reutilizó:
no tenía especialidades, estados ni informe.

## D22. Realismo de los documentos y sus límites
**Qué:** son 10 expedientes y todos sus PDF (copia literal, láminas de planos e informe técnico) imitan la forma de un documento real:
asientos con el cierre registral, láminas a escala con cotas y cuadro de áreas, e informe con sus secciones.

**Cómo se mantiene el límite (RN-01):**
- Cada página lleva la marca de agua y el pie que dicen que es ficticio, y ninguno tiene logos, sellos, firmas, QR, código de
  verificación ni imágenes. Se comprobó con `pdftotext` y `pdfimages` en los 41 PDF del sistema.
- Todos los números llevan `SIM-`: partidas, títulos, recibos, tomos y expedientes judiciales.
- Los datos de presentación (hora, tomo, derechos y recibo) se derivan del título del asiento, así que el PDF es siempre el mismo, y
  solo existen en partidas ficticias. En una transcrita se imprime únicamente lo transcrito.
- Personas y empresas son inventadas. Las 6 habilitaciones nuevas se buscaron en la web y no existen en Ica; «Las Totoritas» se
  descartó porque es una playa de Cañete.
- Las láminas son esquemas de una vivienda tipo, sin sello ni firma de un profesional; el profesional del informe es ficticio.

**Estudio:** los casos 1 a 4 conservan nombres, montos, fechas y colores, que es lo que preguntan las formas A y B. Los casos 5 a 10 no
forman parte del instrumento.

## D23. v0.6: tipo de inmueble derivado del tipo de predio (supuesto)
**Qué:** el catálogo muestra `tipoInmueble` (`VIVIENDA_URBANA` o `LOTE_URBANO`), que se deriva del `tipoPredio` del expediente.
No se guarda aparte, para que el catálogo y las reglas de planos nunca se contradigan.

**Supuesto:** el pedido de la v0.6 asignaba lotes a Subtanjalla, Los Aquijes, Pueblo Nuevo y San José de los Molinos. En el
contenido, esas cuatro son viviendas: tienen declaratoria de fábrica o planos, y las pruebas existentes lo fijan
(`losDiezCasosTienenSuColor` exige RV-04 en Subtanjalla y Los Aquijes y la declaratoria en Pueblo Nuevo). Cambiarlas a lote
rompería esas pruebas, las reglas de planos y, en los casos 3 y 4, el instrumento del estudio. Se mantienen 9 viviendas y 1 lote
(Santiago). Si el equipo quiere más lotes, hay que rehacer esos casos y sus pruebas a propósito.

**Otros datos del predio:** `distrito` y `precioReferencial` (soles) son columnas nuevas de `caso_lote` (migración V5). El área
es la del terreno que ya tenía el expediente (`areaM2`). El precio es referencial e informativo y no interviene en el semáforo.

## D24. v0.6: solicitud solo del comprador y firma desde la cuenta del especialista (M5 y M8)
**M5:** solo el rol COMPRADOR solicita la inspección: lo exige `SecurityConfig` y lo vuelve a comprobar el servicio. El
solicitante (`solicitanteCodigo`) y la fecha los pone el servidor a partir de la sesión. Sigue habiendo una sola solicitud por
expediente (409 a la segunda). El costo referencial (S/ 250.00) sale de `app.inspeccion.costo-referencial` y viaja en
`evaluacionTecnica.servicio`; la interfaz no lo repite.

**M8:** el nombre, la especialidad y la colegiatura del informe salen de la cuenta autenticada (`identidad`, API pública
`AuthService.perfilProfesional`). El cuerpo de la petición ya no tiene esos campos y, si el cliente los manda, se ignoran. Por eso
`InspeccionTest.validaElInforme` dejó de exigir 400 cuando faltan el nombre o la colegiatura: ese contrato lo reemplazó M8.
Los informes de demostración también los firma `especialista-01`.

**Datos del especialista:** Ing. Perfil Ficticio 01, Ingeniero Civil, CIP N.° SIM-CIP-0001, tal como se pidió. Son ficticios
y se rotulan así en la interfaz y en el PDF. Actualizado en la v0.7 (V9): el nombre y la colegiatura anteriores se reemplazaron
por estos, que ya cumplen D22 (números con `SIM-`).

**Base existente:** la migración V5 y la carga de contenido completan distrito, precio, ítem HR y PU y el perfil del especialista
sin borrar nada. Actualizado en la v0.7: la migración V9 cambia el perfil de `especialista-01` y los informes firmados con los
datos anteriores; otros informes guardados conservan su profesional.

## D25. v0.6: filtros del catálogo en el servidor (M13)
**Qué:** `GET /api/v1/casos` acepta `tipoInmueble`, `estado`, `estadoTecnico` (también `INFORME_EMITIDO`) y
`riesgoFisicoDetectado`, combinables. El listado no está paginado (10 casos), pero se filtra en el servidor porque el color
documental y el riesgo físico se derivan de dos módulos distintos: así la regla vive en un solo lugar y tiene prueba
(`CatalogoYServiciosTest.filtrosCombinados`). Un valor desconocido da 400 con los valores válidos.
`riesgoFisicoDetectado` es verdadero solo si el informe está emitido y su conclusión es «con riesgo».

## D26. v0.6: el rótulo de «datos simulados» va en la interfaz
**Qué:** la prueba `sinRastrosDelEstudio` prohíbe «simulad», «MVP» y «ejemplo» en el listado y el detalle de la API, para no
delatar el diseño del estudio. Por eso los textos nuevos del backend (nota del precio, condiciones del servicio) no usan esas
palabras, y el rótulo de datos ficticios o simulados que pide I7 lo pone la interfaz junto a precios, personas y colegiatura.

## D27. v0.6: texto exacto del verde
**Qué:** la etiqueta del estado verde pasa a ser exactamente «Sin alertas en los campos evaluados» (I1), en el backend y en la
interfaz. Antes decía «Sin alertas detectadas en los campos evaluados»; el significado no cambia. Lo fija
`CatalogoYServiciosTest.verdeSignificaSinAlertas`.

## D28. v0.6: ilustraciones SVG propias, sin fotos
**Qué:** cada predio se muestra con un dibujo propio en SVG (`components/base/PredioImagen.tsx`): vivienda moderna de 1 piso,
de 2 pisos (con la opción de un segundo piso en obra, para la ampliación de Pachacútec), vivienda de adobe y lote cercado con
hitos y vereda, sobre las dunas de Ica. Cada caso tiene su variante, paleta y detalles (huarango, palmera, reja) en
`lib/predios.ts`; una partida transcrita recibe una según su tipo y su número.
**Por qué:** las fotos de stock tienen licencia y una foto real del inmueble no existe en la demostración. Un dibujo no puede
confundirse con el inmueble: el texto alternativo dice «No es una foto del inmueble». No agrega dependencias.

## D29. v0.6: sistema visual en tokens y barra superior
**Qué:** los colores, la tipografía, los radios y las sombras están en `src/index.css` y los componentes los usan por nombre.
Los 4 estados del semáforo tienen contraste AA (de 7.4:1 a 8.9:1 entre texto y fondo) y siempre llevan ícono y texto. El aviso
académico gris se reemplazó por una franja fina en la barra superior que conserva su contenido (demostración, partidas
ficticias, información referencial) y el pie comercial mantiene los límites legales (I1) y el aviso de uso local (I6).

## D30. v0.6: pruebas del frontend con funciones puras
**Qué:** las pruebas de Vitest cubren la lógica que deciden las pantallas, separada en funciones puras: filtros y URL
(`lib/catalogo.ts`), visibilidad por rol (`lib/permisos.ts`), stepper (`lib/etapas.ts`) y comparador de áreas (`lib/areas.ts`).
**Por qué:** probar componentes exigía agregar jsdom y Testing Library. La interacción real (modales, foco, Escape, filtros en
la URL) se comprobó con el recorrido de navegador `docs/pruebas/recorrido-v06.mjs`, que usa `puppeteer-core` instalado fuera
del repositorio.

## D31. v0.6: avance de los 6 pasos de la inspección (supuesto)
**Qué:** el backend guarda el estado de la inspección, no el avance paso a paso. La interfaz lo muestra así: antes de la visita
los 6 pasos son el alcance del servicio; «en inspección» marca hechos los pasos 1 y 2 (revisión documental y de planos) y en
curso el 3 (visita); con el informe emitido, los 6 quedan hechos. Si el equipo quiere registrar cada paso, hace falta un campo
nuevo en `evaluacion_tecnica`.

## D32. v0.7: roles GESTOR y PROPIETARIO, y cuentas que faltan (supuesto)
**Qué:** se agregan `gestor-01` (rol GESTOR, función «Asesor comercial», columna `usuario.funcion`), `propietario-01` y
`propietario-02` (rol PROPIETARIO). `DemoUsuariosSeeder` crea **cada** cuenta de la lista que falte, también en una base ya
creada, y no cambia la contraseña ni el rol de las que existen. Antes solo creaba `especialista-01` en una base con cuentas;
ahora la regla es la misma para todas.
**I11:** las cuentas nuevas no guardan nombre, DNI ni teléfono. El propietario se identifica solo por su código de cuenta.
**Pruebas adaptadas:** `CasosApiTest.contenidoCargado` y `SeguridadTest` (`contrasenaConHash`, `sinRegistroAbierto`) contaban
3 cuentas; ahora usan la constante `CUENTAS_DEMO` de `BaseApiTest`. La aserción es la misma (cuentas creadas por la carga y
ninguna más), con el nuevo número.

## D33. v0.7: captación y publicación por caso (migración V6)
**Qué:** `caso_lote` gana `propietario_codigo`, `autorizacion_fecha` (nula si no hay autorización) y `estado_publicacion`
(`BORRADOR`, `PUBLICADO`, `RETIRADO`). Una restricción de la base impide un caso `PUBLICADO` sin autorización (I14).
**Los diez casos de demostración** quedan publicados y autorizados, alternados entre los dos propietarios por orden de partida
(propietario-01: Parcona, Subtanjalla, Pueblo Nuevo, Salas y Pachacútec; propietario-02: La Tinguiña, Los Aquijes, Santiago,
San José de los Molinos e Ica). Así cada propietario tiene casos de varios colores. Lo aplica V6 en una base existente y
`CasosSeeder` en una base nueva (la tabla está vacía cuando corre la migración). Una partida transcrita anterior a la v0.7 queda
en `BORRADOR` y sin propietario.
**Supuesto:** la fecha de autorización de los casos de demostración es la de la migración o la carga, no una fecha inventada.

## D34. v0.7: reglas de captación y publicación (supuestos)
- `POST /casos` exige `propietarioCodigo`, que debe ser una cuenta PROPIETARIO (400 si no). El caso nace en `BORRADOR` y sin
  autorización. Por eso `RegistrarPartidaTest.revisorRegistra` ahora autoriza (propietario) y publica (gestor) antes de
  comprobar que el comprador ve la partida, y `edicionProtegida` lee el caso como revisor: un borrador no es visible para el
  comprador. Es el cambio mínimo que exige la etapa 1.
- `PUT|DELETE /casos/{c}/autorizacion`: solo el PROPIETARIO **de ese caso**. Otro rol o el propietario de otro caso: 403.
  Autorizar dos veces conserva la primera fecha.
- **Retirar la autorización de un caso publicado lo deja `RETIRADO`** (supuesto): un caso no puede seguir publicado sin
  autorización vigente (I14). No es una acción del gestor, sino la consecuencia del retiro del consentimiento.
- `POST|DELETE /casos/{c}/publicacion`: solo el GESTOR. Publicar sin autorización da **422**; publicar algo ya publicado o
  retirar algo que no lo está da 409. Publicar no mira el color de A (I10).
- Ninguna de estas operaciones recalcula ni toca la evaluación (I8).

## D35. v0.7: visibilidad por rol (404 y no 403)
**Qué:** el comprador solo ve casos `PUBLICADO` y el propietario solo los suyos, en el listado, el detalle, los PDF y la
solicitud de inspección. Un caso que no puede ver responde **404**, igual que uno inexistente, para no revelar que existe.
Revisor, gestor y especialista ven todos. La comprobación está en `ExpedienteService.visible` (servidor).
**I11:** el bloque `publicacion` del detalle no muestra el código del propietario al comprador.

## D36. v0.7: historial de evaluaciones de solo adición (migración V7)
**Qué:** tabla `historial_evaluacion` en el módulo de clasificación. Cada recálculo agrega una fila con fecha, color anterior
(nulo en la primera) y nuevo, motivos y faltantes (JSON), versión de reglas, origen y código de la cuenta. La carga de
contenido figura como cuenta `sistema`. No guarda nombres, DNI ni teléfonos.
**Inmutable (I12):** la entidad es `@Immutable` con columnas `updatable = false`, el repositorio extiende `Repository` (no
`JpaRepository`) y solo tiene `save` y consultas, y no hay ruta HTTP para editar ni borrar. `GET /casos/{c}/historial` es la
única operación.
**Sin clave foránea:** `expediente_id` es una referencia por valor. Si se elimina una partida transcrita (D20), su historial se
conserva: es de solo adición y no contiene datos personales (supuesto).
**Carga inicial:** al arrancar, cada expediente sin filas recibe una con origen `CARGA_INICIAL` tomada de su evaluación vigente
(una base de la v0.6). En una base nueva esa fila la deja el primer cálculo. Volver a arrancar no duplica nada.
**Supuesto:** la evaluación vigente (`evaluacion`) se mantiene como estaba; el historial se agrega al lado y no la reemplaza.

## D37. v0.7: origen de cada recálculo (supuesto)
La lista es cerrada: `EDICION`, `PLANO_ADJUNTO`, `PARTIDA_TRANSCRITA`, `CARGA_INICIAL` y, desde V11, `PARTIDA_SIMULADA` (D50).
- `POST /casos` (partida transcrita): `PARTIDA_TRANSCRITA`.
- `PUT /casos/{c}/expediente`: si cambian los asientos, `PARTIDA_TRANSCRITA` (se incorporó partida transcrita nueva, I9); si
  solo cambian los planos o el bloque técnico, `PLANO_ADJUNTO`; si no, `EDICION`. Las áreas se comparan por valor (84.5 = 84.50).
- `POST /casos/{c}/planos/{e}/documento`: ahora **recalcula** con `PLANO_ADJUNTO`, para que el historial registre la
  subsanación. El motor no lee el archivo, solo el estado del plano, así que el color no puede cambiar por esto.
- `POST /casos/{c}/documento` (PDF del caso): `EDICION`. La lista no tiene un origen para el PDF de la partida y no es un plano.
- Checklist, publicación, autorización, contacto y asignación **no** recalculan ni agregan filas (I3, I8).
**I9:** un PDF o un plano nunca levanta un rojo por embargo, bloqueo o demanda: eso solo ocurre cuando los asientos de la
partida cambian (por ejemplo, un asiento E que cancela el embargo) y el motor recalcula. No hay vigencia automática (RN-08).

## D38. v0.7: acceso al historial
REVISOR, GESTOR, ESPECIALISTA y el PROPIETARIO del caso. El COMPRADOR recibe 403 (en `SecurityConfig` y en el servicio) y el
propietario de otro caso, 404 (D35).

## D39. v0.7: módulo `cartera` (contacto y panel)
**Qué:** un noveno módulo de Spring Modulith, `cartera`, con las solicitudes de contacto y el panel del gestor. Depende de
`expediente` (solo de su nueva API pública `CarteraCasos`, de solo lectura, y de `EstadoPublicacion`), `clasificacion`,
`inspeccion`, `identidad` y `shared`. Ningún módulo depende de él, así que no hay ciclos. La publicación sigue en `expediente`
porque es un dato del caso. Nunca escribe en `clasificacion`: contactar no cambia el color (I8, I10).
**Contacto (migración V8):** solo COMPRADOR, sobre un caso `PUBLICADO` (otro caso da 404, como en D35). Guarda el código del
comprador (de la sesión), la fecha y un motivo de lista cerrada (`INFORMACION_GENERAL`, `CONSULTA_DOCUMENTOS`,
`CONSULTA_INSPECCION`). **No hay texto libre:** un campo desconocido en el cuerpo da 400 en lugar de ignorarse
(`@JsonIgnoreProperties(ignoreUnknown = false)`), para que nadie crea haber enviado un mensaje. Una sola pendiente por comprador
y caso: la columna única `pendiente_clave` lo garantiza también en la base; la segunda da 409. El GESTOR la marca `ATENDIDA`
(una ya atendida da 409) y después el comprador puede volver a pedir contacto (supuesto).
**Listado de contactos (supuesto):** se agregó `GET /contactos?estado=` para que el gestor encuentre el `id` que atiende.

## D40. v0.7: asignación del especialista y `especialista-02`
**Qué:** `PUT /casos/{c}/inspeccion/asignacion` (solo GESTOR) con `especialistaCodigo`. Exige una inspección `SOLICITADA` o
`EN_INSPECCION` (otro estado o sin solicitud: 409) y una cuenta ESPECIALISTA con datos profesionales (otra: 400). Se puede
reasignar mientras no esté emitida (supuesto). Con asignación, solo el asignado emite (otro especialista: 403); sin asignación
se conservaba el comportamiento anterior, lo que **D51 reemplaza**. La firma sigue saliendo de la cuenta autenticada (M8).
**`especialista-02`:** «Arq. Perfil Ficticio 02», Arquitecto, colegiatura `SIM-CAP-0002`. El nombre dice que es ficticio para
no parecer una persona real (I11) y la colegiatura lleva `SIM-`.

## D41. v0.7: panel de cartera
`GET /cartera/panel` (solo GESTOR, solo lectura): total de casos, totales por color de A y por estado de publicación (con ceros),
casos con faltantes, inspecciones solicitadas o en curso con su especialista asignado y cuántas están asignadas o no, y los
contactos pendientes. No ordena ni califica casos (sin rankings).

## D42. v0.7: prueba del ciclo completo con base propia (F6)
**Qué:** `CicloCarteraTest` usa `@TestPropertySource` con una URL H2 en memoria de nombre aleatorio
(`jdbc:h2:mem:ciclo-${random.uuid}`), así que arranca un contexto propio con una base nueva: no comparte datos con las demás
pruebas, no depende del orden de ejecución y no toca `data/`. No se borra ningún archivo ni base para prepararla.
`MigracionV6Test` hace lo mismo con su propia base para probar V6 sobre datos v0.6.
**Recorrido:** el revisor crea una vivienda transcrita (AMARILLO por RV-04, según las reglas reales), el propietario la
autoriza, el gestor la publica, el comprador la ve y pide contacto, el gestor lo atiende, el comprador pide la inspección, el
gestor asigna a `especialista-02`, este emite un informe con riesgo (A no cambia), el revisor incorpora los planos (VERDE por las
reglas) y adjunta un PDF, y el historial registra los tres recálculos. Incluye los 403 y 404 de cada rol y, al final, el retiro
de la autorización (I14).

## D43. v0.7 (interfaz): navegación y guarda de rutas por rol
**Qué:** `permisos.ts` define los enlaces del menú (`navegacion`) y qué rol abre cada vista (`puedeAbrirVista`): comprador y
especialista ven «Expedientes»; el revisor agrega «Registrar partida»; el gestor, «Cartera»; el propietario ve solo «Mis
inmuebles». `RequireVista` (en `auth.tsx`) muestra «Tu cuenta no tiene acceso a esta sección» si se escribe a mano la URL de
otra vista. El detalle `/casos/:codigo` lo abre cualquier rol con sesión: el servidor decide qué caso puede ver (404 si no le
corresponde, D35). Es solo presentación: el servidor sigue siendo la autoridad (I4).

## D44. v0.7 (interfaz): operaciones que vuelven a consultar al servidor
Publicar, retirar, autorizar, retirar la autorización y asignar especialista llaman a la API y, si responden bien, vuelven a
pedir el caso (`GET /casos/{codigo}`) antes de mostrar el resultado. La interfaz nunca cambia por su cuenta el color de A, el
estado de publicación ni el informe. El historial se monta de nuevo cuando cambia la fecha de la evaluación vigente y vuelve a
consultar `GET /casos/{codigo}/historial`; se muestra de la más reciente a la más antigua, sin botones de edición.

## D45. v0.7 (interfaz): lista fija de especialistas para asignar (supuesto)
El backend no tiene una ruta que liste cuentas, así que el selector de asignación ofrece las dos cuentas de especialista de la
demostración (`especialista-01`, `especialista-02`). El servidor valida la cuenta elegida (400 si no es un especialista con datos
profesionales). Si se agregan especialistas, hace falta una ruta de listado o actualizar la lista.

## D46. v0.7 (interfaz): estado de la solicitud de contacto del comprador
El backend no ofrece al comprador una ruta para consultar sus solicitudes. Por eso la interfaz muestra el estado solo con lo que
devuelve `POST /casos/{codigo}/contactos` (fecha, motivo, «pendiente») mientras dura la página, y un 409 se muestra como «ya
tienes una solicitud pendiente» sin agregar nada. Que el comprador vea si su solicitud fue atendida queda pendiente
(`docs/PENDIENTES.md`).

## D47. v0.7 (interfaz): rótulos de datos simulados en un solo lugar
Se quitaron los rótulos repetidos por elemento: «Precio referencial · dato simulado» de la tarjeta y del detalle, «Datos
ficticios de demostración» de la credencial del especialista, «Costo referencial · dato simulado» y «(dato simulado)» del
servicio de inspección, y «Precios referenciales y datos simulados» del encabezado del catálogo. El aviso queda en el pie de
página («Los datos de esta demostración … son simulados») y en la línea «Entorno académico demostrativo · Datos sintéticos»
del login; la nota del precio que envía el backend se conserva en el detalle. Esto redefine I7 (ver `LEEME.md`).
**Corrección (v0.7):** el rediseño `567cbfc` dejó esos textos en un pie sin uso. Ahora están en el pie activo
(`lib/limitesLegales.ts`, con prueba). La credencial del especialista vuelve a llevar un rótulo, «Perfil ficticio de demostración»,
y usa iniciales en lugar de una fotografía: un perfil ficticio no debe parecer una persona real.

## D48. v0.7 (interfaz): texto fijo de la etapa 9
El detalle muestra para todos los roles «Siguiente paso: verificación jurídica con abogado o notario, fuera del sistema». Es un
texto informativo: la verificación jurídica no es una función del sistema.

## D49. v0.7: nueve etapas, hipótesis de valor y nueva I7 (supuestos de documentación)
- **Etapas:** el pedido nombra la etapa 1 (captación), la 5 (publicación) y la 9 (fuera del sistema). Las demás se ordenaron
  según el flujo real del código: 2 autorización, 3 indicador A, 4 subsanación, 6 consulta y contacto, 7 indicador B con
  asignación, 8 seguimiento en el panel. Ver `LEEME.md`, «Flujo de nueve etapas».
- **Hipótesis de valor:** suscripción de la inmobiliaria y una parte del ingreso de la inspección, sin cifras. El piloto con 3 a
  5 inmobiliarias de Ica es una propuesta futura, no algo realizado.
- **I7 redefinida:** antes pedía rotular personas, precios y colegiatura como simulados en cada elemento; ahora pide que los
  límites legales estén en el pie de página (con el aviso de datos simulados) y que el login comunique el entorno demostrativo
  (D47). No tiene prueba automática.
- **`recorrido-v06.mjs`:** queda marcado como obsoleto en su cabecera y en el LEEME; no se borró.

## D50. v0.7: captación con origen obligatorio y precio referencial

**Qué:** `POST /casos` exige `origen`: `TRANSCRITA_CONOCE_AQUI` (sin `SIM-`, fuente «Conoce Aquí – SUNARP») o
`SIMULADA_DEMOSTRACION` (con `SIM-`, fuente «Partida simulada para demostración», `sintetico = true`). Un prefijo que no
corresponde al origen da 400. `precioReferencial` es opcional, positivo y con dos decimales. `ProteccionDatos` se aplica a los dos.
**Por qué:** antes solo se podía captar una partida rotulada como fuente SUNARP, y una partida inventada para la demostración
quedaba mal rotulada o no se podía registrar.
**Cómo:** no hizo falta migración. Una simulada se guarda con `origen = SINTETICO`, que `ck_caso_origen` ya admite, y
`precio_referencial` existe desde V5. La API sigue devolviendo `origen` `SINTETICO` o `TRANSCRITA`.
**Consecuencia:** los casos captados se distinguen de los diez de demostración porque llevan `fuente` (`CasoLote.esCaptado`). Se
pueden eliminar, y se revisan al editarlos; los diez de demostración no. En el historial, una partida simulada captada usa
`PARTIDA_SIMULADA` («Partida simulada incorporada»), agregado en V11; las filas ya guardadas no se reescriben (I12).

## D51. v0.7: asignación obligatoria del especialista

**Qué:** sin especialista asignado por el gestor, nadie registra avance ni emite: 409 «El gestor debe asignar un especialista». Con
asignación, otro especialista recibe 403. Reemplaza el comportamiento sin asignación de D40.
**Por qué:** el gestor es quien coordina las inspecciones; sin esta regla cualquier especialista podía tomar una inspección sin
asignar, y el panel de cartera no reflejaba quién la llevaba.
**Datos:** la semilla asigna `especialista-01` a la inspección en curso de `SIM-11098467` y deja `SIM-11093320` solicitada y sin
asignar. V10 hace lo mismo en bases existentes. Otra inspección en curso sin asignar de una base existente queda esperando al
gestor.
**Consecuencia:** un informe de demostración ya emitido no tiene asignación: no se puede modificar (409) ni reasignar (409).

## D52. v0.8: priorización por esfuerzo solo en el panel del gestor (matiza D41)

> Numeración: el pedido de la v0.8 la llamaba D50, pero D50 y D51 ya estaban usadas por la v0.7; las decisiones de la v0.8
> van de D52 a D55.

**Qué:** `GET /cartera/panel` (solo GESTOR) agrega el conteo de casos por tipo de alerta (código y nombre de cada regla, más
«información insuficiente» para los casos grises), el conteo por esfuerzo de regularización (BAJO, MEDIO, ALTO y sin pasos) y la
lista «por regularizar» (código, denominación, color de A, tipos de alerta y esfuerzo), ordenada por esfuerzo y luego por código.
`GET /casos` acepta el filtro `tipoAlerta`, combinable con los demás, en el catálogo (el comprador solo ve publicados) y en Cartera.
**Por qué:** feedback docente del 31/10/2026: la inmobiliaria debe ver su cartera por tipo de problema y cuáles casos son más
viables o tomarán más tiempo.
**Límite:** D41 decía «sin rankings». Se mantiene para el comprador: el orden por esfuerzo solo existe en el panel del gestor, sirve
para organizar la subsanación y lleva el aviso «Priorización interna de la inmobiliaria; no es una recomendación de compra». El
esfuerzo es un criterio del equipo (borrador pendiente de revisión especializada), no un plazo ni un costo, y no cambia A ni B.

## D54. v0.8: semáforo de gestión interno y decisión de captación (I15)

> Pedida como D52 en el plan de la v0.8; se renumeró porque D50 y D51 ya existían (ver D52).

**Qué:** un cuarto indicador, solo para la inmobiliaria, con cuatro estados derivados de la ruta de regularización
(`contenido/v0.4/gestion.json`, borrador del equipo): COMPLETAR_INFORMACION si hay datos faltantes o una condición no
contemplada; si no, REQUIERE_REGULARIZACION si algún paso es de esfuerzo ALTO; VIABLE_CON_CONDICIONES si el máximo es MEDIO;
VIABLE si no hay pasos o solo hay pasos BAJO. Cada estado lleva etiqueta, explicación y una sugerencia, sin plazos ni costos.
Viaja en el detalle y en `GET /casos` (campo `gestion`) solo para GESTOR y REVISOR; para los demás roles el campo no existe en
la respuesta. El panel del gestor agrega el conteo por estado y la matriz «tipo de alerta × estado de gestión».
**Decisión de captación:** `POST /casos/{c}/decision-captacion` (solo GESTOR) con `decision` (CAPTAR, CAPTAR_CON_CONDICIONES,
NO_CAPTAR_POR_AHORA) y `motivo` de lista cerrada, sin texto libre (400 si llega otro campo). Historial de solo adición
(migración V14): cuenta y fecha; no hay rutas para editar ni borrar. `GET /casos/{c}/decisiones-captacion` solo GESTOR y REVISOR.
**Precedencia:** como en A, primero la falta de información: un caso gris con una alerta judicial conocida queda en COMPLETAR_INFORMACION
y su ruta conserva el paso judicial.
**Límites (I15):** no cambia A ni B ni agrega filas al historial de A; no bloquea publicar (si la última decisión es no captar por
ahora, la interfaz pide confirmación «La decisión registrada es no captar por ahora. ¿Publicar de todos modos?»); se muestra con
otro ícono y con contorno sin relleno para no confundirlo con el color de A, y siempre con el aviso «Uso interno de la inmobiliaria;
no se muestra al comprador ni es una recomendación de compra».

## D53. v0.8: el plano presentado exige su PDF; límites y optimización de los PDF

> Pedida como D51 en el plan de la v0.8 (ver la nota de D52).

**Qué:** un plano solo queda «presentado» u «observado» si tiene un PDF: el subido o, en los diez casos de demostración, la lámina
generada que ya tenían al cargarse. `PUT /casos/{c}/expediente` y `POST /casos` que lo intenten sin archivo dan 422 «Sube el PDF
del plano antes de marcarlo como presentado». `POST /casos/{c}/planos/{esp}/documento` acepta un plano no presentado y lo deja
presentado (recálculo `PLANO_ADJUNTO`). Un plano ya presentado sin archivo (por ejemplo, de una base anterior) conserva su estado
y la interfaz dice «Falta el archivo»; en una partida captada no se genera lámina para él (404).
**Archivos (decisión 4 del equipo):** cabecera `%PDF`, tipo `application/pdf` y que PDFBox lo abra (400 si no, si está cifrado o
dañado). Entrada de hasta 25 MB (413 «El archivo supera 25 MB»); sobre 5 MB se re-codifican como JPEG (calidad 0,75, lado mayor
de hasta 2000 px) las imágenes grandes y se guarda con compresión de objetos; si el resultado no abre con las mismas páginas o no
es menor, se conserva el original; si lo guardado supera 10 MB, 413 «El PDF pesa X MB incluso optimizado; el máximo es 10 MB.
Reduce su resolución o divídelo». Se guarda solo el archivo final con su evidencia (V12). Las láminas y copias que genera el
sistema no se optimizan. Límites en `app.archivos.*`; las pruebas usan límites pequeños.
**Pruebas cambiadas:** las que marcaban planos presentados sin archivo o subían un «PDF» de pocos bytes que PDFBox no abre se
reemplazaron por equivalentes que suben un PDF real generado en la prueba; un archivo que no es PDF pasó de 422 a 400 (ver
`docs/REPORTE-feedback-v0.8.md`).

## D55. v0.8: ruta de regularización y criterios de esfuerzo (borrador)

> Pedida como D53 en el plan de la v0.8 (ver la nota de D52).

**Qué:** `contenido/v0.4/rutas.json` asocia a cada regla (RP-01 a RP-03, RV-01 a RV-06) y a cada faltante que da gris (condición
representada, titularidad, completitud, estado de una anotación, plano de arquitectura o de estructuras, y condición no
contemplada) un título, pasos breves, quién gestiona, el documento requerido, el esfuerzo y una nota. `GET
/casos/{c}/ruta-regularizacion` devuelve un ítem por motivo de la evaluación vigente y el esfuerzo del caso (el máximo), con la
visibilidad del detalle. No recalcula ni agrega historial.
**Criterio de esfuerzo (borrador del equipo, pendiente de revisión especializada):** BAJO, solo documentos que aporta el
propietario; MEDIO, un tercero sin proceso judicial (hipoteca, servidumbre, otro acto que hay que leer); ALTO, un proceso judicial
o administrativo (embargo, demanda o medida cautelar, bloqueo, ampliación no declarada o licencia). No hay plazos legales ni
costos: «el plazo depende del trámite; consultar con abogado o notario».
**Gravamen (feedback b):** el asiento D admite acreedor (solo persona jurídica o «no consta») y plazo o vencimiento (V13); la ruta
de una hipoteca muestra «Plazo o vencimiento: …» o «No consta en la partida: solicitar al propietario o al acreedor». Ninguno de los
dos interviene en el color.
**Metodología:** la ruta forma parte de la condición asistida de la v0.8.0 (la ve el comprador); el semáforo de gestión no.

## D56. v0.8 (interfaz): resaltado del color de A y tokens restituidos

**Qué:** las tarjetas del catálogo y de Cartera, Mis inmuebles y la cabecera del detalle llevan un borde izquierdo de 4 px, un
fondo tenue (7 a 8 %) y una etiqueta con ícono y texto del estado de A (`lib/resaltado.ts`, con prueba). El semáforo de gestión
usa contorno discontinuo sin relleno y otros íconos.
**Hallazgo:** `index.css` no definía los tokens `sem-*`, `tinta-2`, `superficie`, `info-*`, `shadow-tarjeta`, `shadow-elevada` ni
`ease-expo` que usan los componentes (se perdieron en el rediseño `567cbfc`), así que esos colores no se generaban. Se restituyeron
con los valores de la v0.6 (`31d9e6a`) junto con los tokens del resaltado, con variantes oscuras que solo se activan con un tema
oscuro explícito.


## D57. v0.9: dos lotes reales de una subasta de la SBN

**Qué:** el catálogo incluye dos lotes de la II Subasta Pública 2026 de la SBN, con datos del Anexo 1 de las bases y el plano
perimétrico oficial de cada uno: `11045763` (Huarmey, Parcela 2, Lote 14, US$ 90,096.39) y `80194645` (Supe, Parcela 2, Lote 9,
US$ 16,801.84). Fuente: https://www.sbn.gob.pe/publicacion_subastas_detalles.php?item=38, consultada el 08/11/2026. Se cargan
como `TRANSCRITA`, con fuente, enlace y fecha de consulta, en la cartera normal y con la cuenta de demostración `propietario-03`.
**Desviación de RN-01/PA2** (igual que D20): hay datos reales. Requiere la aprobación del asesor antes del estudio. Son
documentos publicados por una entidad del Estado; los planos solo muestran nombres de funcionarios en ejercicio de su función.
**No se inventa nada de la partida:** quedan sin asientos y con completitud INCOMPLETA hasta que se transcriba de Conoce Aquí.
La memoria descriptiva, el certificado de zonificación y la tasación no se publican en línea: figuran «no presentados», con la
nota de cómo pedirlos (la memoria, por transparencia, Ley 27806). Por eso los dos lotes salen en gris.
**Dato corregido:** el perímetro del Lote 14 es 363.84 m (el plano), no 363.64 m.
**Precio:** columna `moneda` (PEN o USD), `precio_nota` y `fuente_url` en `caso_lote` (V15). La etiqueta del catálogo pasa a
«Lote o terreno».

## D58. v0.9: documentos del lote como requisitos del indicador A (reglas v0.5)

**Qué:** un lote tiene cuatro documentos (tabla `documento_lote`, V15): plano perimétrico y de ubicación, memoria descriptiva,
certificado de zonificación y vías, y tasación. Sin plano perimétrico o sin memoria descriptiva el indicador A queda en gris
(faltante); sin certificado de zonificación, en amarillo (regla RV-07); la tasación es informativa. Un documento observado activa
RV-06. Como un plano, uno presentado exige su PDF y el motor lee el estado, nunca el archivo (I9).
**Reglas:** `contenido/v0.4` pasa a `v0.5` (10 reglas, 57 términos). Las reglas son un borrador pendiente de revisión.
**Santiago** (lote de demostración) recibe sus cuatro documentos generados (con marca de agua, sin sellos ni firmas) y sigue en
verde. Los lotes de la SBN guardan el PDF oficial original (`carga-inicial`). Con esto D23 pasa a 9 viviendas y 3 lotes.

## D59. v1.0 (etapa 1): rol ASESOR

**Qué:** `Rol.ASESOR` reúne los permisos del REVISOR y del GESTOR (`Rol.incluye`): registra, subsana (edita el expediente, sube
planos y documentos, checklist), publica y retira, atiende contactos, asigna inspecciones, ve el panel, el semáforo de gestión y
las decisiones de captación. No solicita inspecciones ni contactos (son del comprador), no emite el informe B (solo el
especialista) y no autoriza por un particular. Cuenta `asesor-01` (función «Asesor inmobiliario», sin nombre ni colegiatura).
`SecurityConfig` agrega ASESOR donde estaba REVISOR o GESTOR; los servicios usan `incluye` en lugar de comparar el rol.
**Pruebas:** `AsesorTest`. `CUENTAS_DEMO` pasa de 8 a 9: la aserción es la misma (cuentas de la carga y ninguna más).
**Interfaz:** menú del asesor Registrar, Proyectos (por ahora la lista de expedientes, `/casos`), Cartera e Interesados
(bandeja de contactos pendientes, la misma de Cartera).

## D60. v1.0 (etapa 1): titularidad comercial y autorización en nombre de la inmobiliaria (V17)

**Qué:** `caso_lote.titularidad_comercial` (`INMOBILIARIA` o `PARTICULAR`; los existentes, `PARTICULAR`). En un caso de la
inmobiliaria, el asesor o el gestor registran la autorización en su nombre; el propietario y el revisor reciben 403. En uno
particular, solo su propietario, como antes. Publicar sigue exigiendo autorización vigente (I14, `ck_caso_publicado_autorizado`).
`POST /casos` acepta `titularidadComercial` (por defecto PARTICULAR); `propietarioCodigo` solo es obligatorio en PARTICULAR.
**Historial:** tabla `historial_autorizacion`, de solo adición (entidad `@Immutable`, repositorio sin borrar ni actualizar):
acción (OTORGADA o RETIRADA), en nombre de quién, cuenta y fecha. Autorizar algo ya autorizado no agrega fila.
`GET /casos/{c}/autorizaciones` para el equipo y el propietario del caso; el comprador recibe 403.
**Precarga:** solo el lote de Santiago (`11081204`) pasa a INMOBILIARIA, con su autorización registrada por `asesor-01` (V17 en una
base existente, `CasosSeeder` en una nueva). El pedido decía dos o tres lotes, pero solo hay tres lotes: los dos de la subasta de
la SBN son del Estado y marcarlos como de la inmobiliaria contradiría su nota de precio («no es una oferta de la inmobiliaria»).
Los casos 1 a 4 no se tocan. Santiago conserva `propietario-02` como dato histórico, pero ese propietario ya no autoriza.

## D61. v1.0 (etapa 1): portal público

**Qué:** `GET /api/v1/publico/inmuebles?pagina=` (páginas de 24, la primera es la 0) y `GET /api/v1/publico/inmuebles/{codigo}`,
sin sesión. Solo casos PUBLICADOS; un borrador, un retirado o uno inexistente dan 404. Muestran lo que ve el comprador: indicador A
con sus motivos, indicador B y los datos del predio; nunca el semáforo de gestión, las decisiones de captación, el código del
propietario ni las cuentas del solicitante o del especialista asignado. Cualquier escritura sin sesión da 401.
**Interfaz:** inicio, `/inmuebles` y `/inmuebles/:codigo` se abren sin sesión; el botón «Ingresar» lleva al login del personal.
Los PDF siguen exigiendo sesión. El inicio explica el recorrido en 5 pasos (Registrar, Evaluar y completar, Publicar, Buscar,
Solicitar cita).
**Pruebas:** `PortalPublicoTest`, `TitularidadComercialTest`, `lib/publico.test.ts`.

## D62. v1.0 (etapa 2): filtros, orden e independización del catálogo público (V18)

**Qué:** `GET /api/v1/publico/inmuebles` acepta filtros combinables con «y»: `proyecto`, `distrito` (sin distinguir mayúsculas),
`tipo` (`LOTE` o `VIVIENDA`, también los nombres completos), `estadoComercial`, `moneda` con `precioMin` y `precioMax`,
`precioM2Min` y `precioM2Max`, `areaMin` y `areaMax`, `indicadorA` y `tipoAlerta`; y orden: `orden` (`novedad`, `precio`,
`precioM2`, `area`) con `sentido` (`asc` o `desc`). Sin orden, lo más nuevo primero. El servidor filtra, ordena y pagina (24 por
página): el `total` es el de lo filtrado. Un valor no válido, un número negativo o un mínimo mayor que el máximo dan 400 con el
parámetro y los valores aceptados. `GET /api/v1/publico/filtros` da los proyectos, distritos y tipos de alerta para los
selectores. En la interfaz, los filtros y el orden viven en la URL (`/#/inmuebles?tipo=LOTE&orden=precio`) y la página va como
`?pagina=2`; cambiar un filtro vuelve a la primera.
**Precios y monedas:** el precio referencial puede estar en soles o en dólares (lotes de la SBN), así que nunca se comparan
entre sí: un filtro de precio o de precio por m² sin `moneda` se entiende en soles, y el orden por precio sin moneda pone los
soles antes que los dólares. El precio por m² es el precio referencial entre el área del terreno, con dos decimales; es
informativo. Un inmueble sin precio o sin área no cumple un filtro numérico y va al final del orden, en los dos sentidos.
**Campos nuevos del caso (V18, aditiva):** `proyecto` (opcional), `estado_comercial` (`DISPONIBLE`, `SEPARADO`, `VENDIDO`) e
`independizacion` (`PARTIDA_PROPIA`, `EN_PARTIDA_MATRIZ`, `NO_CONSTA`). Los tres son informativos: ninguno interviene en el
motor de reglas ni cambia el indicador A, y editarlos no recalcula ni agrega historial de evaluación. Se piden al registrar
la partida (opcionales) y los corrige el asesor o el revisor con `PUT /casos/{c}/datos-comerciales`. El estado comercial no usa los
colores del semáforo para no confundirse con el indicador A.
**Precarga (`CasosSeeder`, también en una base existente si no se tocaron):** el proyecto sale de la denominación («Hab. Urb.
Santa Elvira» → «Santa Elvira»; los dos lotes de la SBN no tienen proyecto); la independización sale del antecedente dominial del
propio expediente (de la que «se independizó» → partida propia; «a independizar» → en partida matriz; sin dato → no consta);
Pueblo Nuevo y Pachacútec están separados y el resto, disponible.
**Rendimiento:** el filtro por datos del caso usa una sola consulta de los publicados (`findPublicados`, con el caso ya cargado);
el indicador A se filtra con su columna de estado y el tipo de alerta lee las evaluaciones en bloques de 500; solo los 24 de la
página arman su tarjeta completa. Se filtra y ordena en memoria, lo que es adecuado a miles de lotes pero no a cientos de miles.
**Generador de carga:** `GeneradorCarga` solo corre con `--app.carga.lotes=N` (no es parte de la semilla): crea N lotes ficticios
publicados `SIM-9xxxxxxx` (empresa inventada, sin datos personales), repartidos entre 20 proyectos y 10 distritos, en soles y
dólares. Es determinista e idempotente. `CargaCatalogoTest` lo usa con 1000 lotes y exige menos de 2 s por consulta.
**Pruebas:** `FiltrosCatalogoTest` (cada filtro y orden contra un oráculo independiente, 400, selectores, independización y
edición), `FiltroPublicoTest`, `CargaCatalogoTest`, `lib/filtrosPublico.test.ts`.

## D63. v1.0 (etapa 3a): proyectos, plano de lotes y catálogo unido (V19)

**Qué:** tablas `proyecto` (código, nombre, distrito, descripción, enlace de recorrido o video, código opcional del caso de
la partida matriz), `hito_proyecto` (COMPLETADO, EN_PROCESO o PENDIENTE, fecha opcional) y `lote_proyecto` (manzana,
número, área, precio, moneda, estado comercial, independización, zonificación opcional, código de caso opcional,
publicado). El código del proyecto es su nombre en minúsculas, sin tildes y con guiones (`CodigoProyecto`).
**Texto a referencia (V18 → V19):** `caso_lote.proyecto_codigo` apunta a `proyecto.codigo`. V19 crea un proyecto por cada
nombre distinto que ya tenían los casos y los vincula; el texto `proyecto` se conserva como nombre visible y para los
filtros. Un caso nuevo o editado se vincula al guardar (`VinculoProyecto`; si el nombre no existe, se crea el proyecto).
**Estado comercial sin duplicar:** si un lote tiene caso propio, su estado comercial vigente es el del caso (cambiarlo desde
el lote cambia el del caso) y en el catálogo aparece como ese caso, no como un lote aparte.
**Catálogo unido:** `GET /publico/inmuebles` lista casos publicados y lotes de proyecto sin caso propio con los mismos
filtros y orden; cada item trae `clase` (CASO o LOTE_PROYECTO), `proyectoCodigo`, `lote` y `fuenteIndicadorA` con su rótulo.
Un lote lleva el indicador A de la partida matriz («Indicador A de la partida matriz del proyecto») o «Sin evaluación
documental». La novedad usa `creado_en` (nuevo en `caso_lote`; los existentes reciben la fecha de V19). Nuevo parámetro
`clase`; `FiltrosCatalogoTest` lo usa (`clase=CASO`) para seguir verificando lo mismo sobre los casos de la carga.
**Publicación (I14):** un lote sin caso propio se ofrece solo si está marcado como publicado **y** la partida matriz de su
proyecto tiene una autorización vigente registrada. Sin partida matriz no hay autorización registrada, así que el lote no se
publica (en el plano sale «No publicado en línea», sin precio). Retirar la autorización de la partida matriz retira sus
lotes del catálogo. Publicar o retirar un lote no recalcula nada (A no cambia); los hitos son informativos.
**Partidas matrices:** casos de la inmobiliaria, sin cuenta de propietario, en **borrador** (no se ofrecen como inmueble y no
tienen ficha pública de caso) y con su autorización registrada por `asesor-01`. Sus 4 documentos del lote se generan (con
marca de agua, sin sellos ni firmas) y la página del proyecto los muestra sin sesión
(`GET /publico/proyectos/{c}/documentos/{tipo}`), solo si el proyecto es visible. Usan la condición contemplada «Lote urbano
inscrito en el Registro de Predios.» (con otra, las reglas v0.5 darían gris por condición no contemplada).
**API:** `GET /publico/proyectos/{codigo}` (404 si no ofrece lotes ni tiene inmuebles publicados),
`GET /publico/proyectos/{codigo}/lotes/{A-7}`; para el equipo `GET /proyectos` (revisor, gestor, asesor) y
`POST|DELETE /proyectos/{c}/lotes/{l}/publicacion`, `PUT /proyectos/{c}/lotes/{l}/estado-comercial` (gestor, asesor).
**Interfaz:** `#/proyectos/{codigo}` con plano SVG propio por manzanas (número y color por estado con patrón y leyenda en
texto, sin colores del semáforo; una parada de Tab, flechas, Inicio/Fin y Enter), panel del lote, recorrido solo si hay
enlace (YouTube siempre desde youtube-nocookie.com; otro enlace https, como botón), hitos y documentos;
`#/proyectos/{codigo}/lotes/{A-7}` para la ficha del lote. Barra de navegación: a menos de 400 px «Ingresar» queda como
botón con ícono (nombre accesible «Ingresar») y el nombre del sitio usa `text-base`; a 390 px ya no se encima con «Inmuebles».
**Precarga:** Altos de Ventisca (Subtanjalla, 56 lotes, matriz 11112001, verde), Rinconada del Lúcumo (La Tinguiña, 44,
matriz 11112002, amarilla por hipoteca vigente) y Terrazas de Sauzal (Salas, 68, matriz 11112003, verde). Nombres y
empresas inventados. Estados 15 % vendidos, 25 % separados y el resto disponibles, con semilla fija; zonificación RDM o CV
en parte de las manzanas; precio = área × `contenido/precios-zona.json` (S/ por m² por distrito, valores redondos para
ajustar), redondeado a la centena; las esquinas tienen 1.50 m más de frente. Sin enlace de video: no hay un video real de
la inmobiliaria y no se inventa uno. Los casos pasan de 12 a 15 (las 3 matrices); las pruebas de conteo suman las matrices.
**Pruebas:** `ProyectosApiTest`, `MigracionProyectosTest`, `ProyectosUnidadTest`, `lib/proyectos.test.ts`,
`pages/proyectos.test.tsx`.

## D64. v1.0 (etapa 3b): carga masiva de lotes por CSV (V20)

**Qué:** el asesor o el gestor cargan o actualizan los lotes de un proyecto con un CSV (`manzana`, `lote`, `area_m2`, `precio`,
`moneda`, `estado`, `independizacion`, `zonificacion`, `codigo_caso`). Obligatorias: manzana, lote y area_m2; las demás pueden
faltar o ir vacías. Máximo 2000 filas y 1 MB (413 si lo pasa; más filas, error del archivo). Lector de CSV propio (`LectorCsv`),
sin librerías: coma o punto y coma (el de la primera línea), comillas, saltos de línea dentro de comillas, BOM, UTF-8 o
Windows-1252, y coma decimal (`140,5`) como la que guarda Excel en español.
**Dos pasos, sin estado en el servidor:** `POST /proyectos/{c}/lotes/carga/vista-previa` revisa el archivo entero y no guarda nada
(por fila: NUEVO, ACTUALIZA, SIN_CAMBIOS o ERROR, con lo que cambiaría y sus errores; más errores generales del archivo);
`POST /proyectos/{c}/lotes/carga` vuelve a revisar el mismo archivo y lo aplica **solo si no tiene ni un error**, en una sola
transacción (todo o nada; con algún error, 422 y no se guarda nada). `GET /proyectos/{c}/lotes/plantilla.csv` da la plantilla.
Los tres son solo de ASESOR y GESTOR (`SecurityConfig`; el revisor puede leer `GET /proyectos` pero no la plantilla).
**Validación por fila:** manzana de 1 a 4 letras o números (se guarda en mayúscula); lote entero de 1 a 9999; área y precio
positivos, con hasta 2 decimales; moneda PEN o USD; estado e independización con los valores del sistema (sin distinguir
mayúsculas); zonificación de hasta 20 caracteres; un lote repetido en el archivo es error en su segunda aparición;
`codigo_caso` debe existir, no ser la partida matriz, ser de este proyecto (o de ninguno) y no estar ya en otro lote ni en otra
fila. Un archivo sin lotes o con el encabezado mal hecho se rechaza entero.
**Actualizar:** un lote existente (misma manzana y número) se actualiza con lo que el archivo trae; una **celda vacía deja el
valor como estaba** (no sirve para borrar un precio). Un lote sin cambios no escribe nada. Con caso propio, el estado comercial
vive en el caso y se actualiza ahí (como en 3a). Cada lote creado o actualizado agrega una fila al **historial** de solo adición
(`historial_lote_proyecto`: acción, qué cambió con el valor anterior y el nuevo, cuenta, fecha y un identificador de carga);
`GET /proyectos/{c}/lotes/{A-7}/historial` lo lee (equipo, no el comprador).
**Publicación (I14):** un lote nuevo queda publicado solo si la partida matriz del proyecto tiene una autorización vigente
registrada; si no, se guarda sin publicar. Cargar lotes no recalcula nada: el indicador A de la partida matriz no cambia.
**Interfaz:** `#/proyectos` (lista del equipo) y `#/proyectos/{c}/carga` (plantilla, selector de archivo, vista previa con los
errores por fila y «Ver solo las filas con errores», confirmar o cancelar). Se llega con el enlace «Proyectos y carga de lotes
por CSV» de la cartera (el menú de la etapa 1 no cambia). La vista previa dibuja a lo sumo 200 filas a la vez.
**Precarga:** cuarto proyecto, *Horizonte de Los Aquijes* (Los Aquijes), sin lotes y con su partida matriz `11112004`
(verde, en borrador, autorización registrada por `asesor-01`; empresa inventada). Al cargar el kit sus lotes aparecen al
instante en el catálogo y en `#/proyectos/horizonte-de-los-aquijes`. Los casos pasan de 15 a 16.
**Kit (`docs/demo/kit/`):** `proyecto-nuevo-80-lotes.csv` (80 lotes en 8 manzanas, 60 % disponibles, 25 % separados, 15 %
vendidos, a S/ 250 por m²) y `proyecto-con-errores.csv` (11 filas; las filas 8, 10 y 12 tienen un área negativa, un estado
inválido y un lote duplicado). Sin datos personales.
**Pruebas:** `CargaLotesApiTest` (válidas, inválidas, duplicadas, límites, permisos, historial y los dos archivos del kit),
`LectorCsvTest`, `MigracionHistorialLotesTest`, `lib/cargaLotes.test.ts`, `pages/cargaLotes.test.tsx`.
