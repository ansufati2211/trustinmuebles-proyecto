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

La versión activa sale de `app.reglas.version` (hoy `v0.2`). Al arrancar, cada expediente cuya evaluación falte, use otra
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

**Datos del especialista:** Ing. Carlos Alberto Mendoza Quispe, Ingeniero Civil, CIP N.° 248910, tal como se pidió. Son ficticios
y se rotulan así en la interfaz y en el PDF. Es una excepción a D22 (números con `SIM-`): **conviene verificar que ese número de
colegiatura no pertenezca a un ingeniero real** o cambiarlo por uno con `SIM-`.

**Base existente:** la migración V5 y la carga de contenido completan distrito, precio, ítem HR y PU y el perfil del especialista
sin borrar nada. Los informes que ya estaban guardados conservan el profesional anterior; para verlos firmados por la cuenta del
especialista hay que empezar con una base nueva.

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
La lista es cerrada: `EDICION`, `PLANO_ADJUNTO`, `PARTIDA_TRANSCRITA`, `CARGA_INICIAL`.
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
