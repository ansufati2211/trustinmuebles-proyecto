# Funcionalidades de Trustinmuebles

> Versión v0.7.0 «Ciclo de cartera»: roles GESTOR y PROPIETARIO, captación con propietario, autorización, publicación,
> historial de evaluaciones, contacto del comprador, asignación del especialista y panel de cartera (sección 5 bis). Las vistas
> nuevas de la interfaz no se han verificado en un navegador.
>
> v0.6.0: interfaz comercial (catálogo con ilustraciones, precios referenciales y filtros), solicitud de inspección solo
> del comprador con costo referencial (M5), informe firmado desde la cuenta del especialista (M8), ítem HR y PU en el checklist
> (M9) y filtros del catálogo en el servidor (M13). Sobre la v0.5.1.

Qué hace el programa hoy (versión v0.7.0), por rol, con la pantalla o la ruta donde está y lo que **no** hace. Para el detalle
técnico, ver [api.md](api.md); para las decisiones, [decisiones.md](decisiones.md); para las pruebas, [trazabilidad.md](trazabilidad.md).

Trustinmuebles es el sistema de transparencia precompra de **una inmobiliaria de Ica** para su cartera de lotes y viviendas.
Muestra la partida registral y los planos de cada inmueble, explica sus términos, señala qué falta revisar y, a pedido del
comprador, registra una inspección técnica presencial. **No certifica saneamiento, no recomienda comprar y no
reemplaza asesoría legal.**

## Resumen

| Área | Qué ofrece | Quién |
|---|---|---|
| Acceso | Ingreso con código de cuenta y contraseña; cinco roles, menú y vistas según el rol | Todos |
| Catálogo | Tarjetas con ilustración, tipo, distrito, área, precio referencial y los dos indicadores; filtros combinables en la URL | Todos |
| Expedientes | Búsqueda por número y detalle de cada partida | Todos |
| Semáforo informativo | Estado verde, amarillo, rojo o gris, con motivos, alertas y faltantes | Todos |
| Partida registral | Descripción del inmueble y asientos por rubro (C, D, E, F) | Todos |
| Glosario | Términos explicados al seleccionarlos | Todos |
| Checklist | Elementos pendientes, revisados u observados, incluida la declaración jurada municipal (HR y PU) | Ver: todos. Cambiar: revisor |
| Documento PDF | Copia literal simulada o transcripción referencial | Ver: todos. Subir uno propio: revisor |
| Planos | Expediente de 4 especialidades con lámina 2D referencial | Ver: todos. Editar: revisor |
| Evaluación técnica | Solicitud con costo referencial e informe del especialista | Solicitar: comprador. Emitir: especialista |
| Edición | Cambiar los datos, los asientos y los planos de una partida | Revisor |
| Partidas transcritas | Registrar (indicando al propietario) y eliminar partidas reales sin datos personales | Revisor |
| Autorización | Otorgar o retirar la autorización de sus propios casos | Propietario |
| Publicación | Publicar (con autorización vigente) o retirar un caso | Gestor |
| Historial de evaluaciones | Línea de tiempo de solo lectura de cada recálculo del indicador A | Revisor, gestor, especialista, propietario |
| Contacto | Solicitar contacto sobre un caso publicado con un motivo de lista cerrada; atenderlo | Solicitar: comprador. Atender: gestor |
| Asignación de inspecciones | Asignar un especialista a una inspección solicitada o en curso | Gestor |
| Panel de cartera (`#/cartera`) | Totales por color y publicación, faltantes, inspecciones, contactos y lista filtrable | Gestor |
| Mis inmuebles (`#/mis-inmuebles`) | Sus casos con indicadores, motivos, faltantes, publicación y autorización | Propietario |

## 1. Acceso y roles

- **Ingreso** (`#/login`): código de cuenta y contraseña. No hay registro abierto: las cuentas las crea el sistema al
  arrancar si faltan (`comprador-01`, `revisor-01`, `especialista-01`, `especialista-02`, `gestor-01`, `propietario-01` y
  `propietario-02`), y el panel «Cuentas de demostración» las ofrece todas. Todas usan la contraseña de
  `APP_SEED_PASSWORD`.
- **Sesión:** dura mientras la pestaña esté abierta. Si caduca, el sistema vuelve al ingreso.
- **Protección contra intentos repetidos:** tras cinco fallos seguidos, se bloquea el ingreso unos minutos.
- **Roles:**
  - **Comprador:** consulta todo y es el único que solicita la inspección técnica; no modifica nada.
  - **Especialista:** consulta y emite el informe técnico presencial, firmado con los datos de su cuenta (ficticios: Ing.
    Perfil Ficticio 01, Ingeniero Civil, CIP N.° SIM-CIP-0001). No edita partidas.
  - **Revisor:** además edita partidas, cambia el checklist, sube documentos y registra o elimina partidas transcritas.
  - **Gestor (asesor comercial, v0.7):** ve todos los casos, publica o retira, atiende contactos, asigna inspecciones y usa
    el panel «Cartera».
  - **Propietario (v0.7):** ve solo sus casos en «Mis inmuebles» y otorga o retira su autorización. No edita ni sube nada.
  - **Visibilidad (v0.7):** el comprador solo ve casos publicados; un caso que no le corresponde da «no encontrado».
  - **Menú por rol:** cada rol ve solo sus enlaces, y escribir a mano la URL de una vista de otro rol muestra un aviso.
  - El servidor verifica el rol en cada operación. Ocultar un botón en pantalla no es la protección.

## 2. Inicio y avisos

- **Inicio** (`#/`):
  - **Héroe** con ilustración, propuesta de valor y el botón «Explorar Cartera de Inmuebles».
  - **«¿Cómo te protegemos antes de comprar?», el modelo en 4 pasos:** (1) captación y verificación de la cartera propia en Ica,
    sin scraping ni APIs inexistentes; (2) indicador A, semáforo de 4 estados sobre la partida, los 4 planos y el glosario;
    (3) indicador B, inspección presencial en 6 pasos por un profesional colegiado, independiente de A (RN-10); (4) decisión
    informada con el checklist (incluye HR y PU) y los PDF.
  - **Transparencia de fuentes de información:** gratuitas (Conoce Aquí y Visor Catastral BGR) frente a aportadas o de pago
    (copia literal certificada, planos de 4 especialidades, HR y PU, inspección presencial), y el bloque «Sin scraping ni APIs
    inexistentes».
  - Lo que Trustinmuebles **no** hace.
- **Barra superior** en todas las pantallas, con una franja fina: entorno de demostración, partidas ficticias y transcritas sin
  nombres de personas, precios y profesionales simulados, información referencial.
- **Pie comercial** con los límites legales siempre visibles: «Verde = Sin alertas en los campos evaluados; no certifica
  saneamiento ni reemplaza asesoría legal; los datos de esta demostración son simulados», y el aviso de uso local.

## 3. Cartera de inmuebles (`#/casos`)

- **Tarjetas:** ilustración propia del predio, tipo de inmueble, precio referencial (rotulado «dato simulado»), denominación,
  distrito, área del terreno, número de partida, los dos indicadores (A documental y B técnico, siempre separados y con ícono y
  texto), pendientes del checklist y, si corresponde, la insignia «Transcrita de SUNARP».
- **Filtros combinables:** tipo de inmueble, indicador A (verde, amarillo, rojo o gris) e indicador B (no solicitada,
  solicitada, en inspección, informe emitido o «con riesgo físico detectado»). Los resuelve el servidor (M13), se reflejan en la
  URL (se pueden compartir y recargar) y tienen contador de resultados, botón «Limpiar filtros» y estado vacío.
- **Búsqueda por número de partida:** acepta el número con o sin el prefijo `SIM-` y con espacios o guiones. También busca por
  texto de la denominación (por ejemplo, «Parcona»).
- **Partida no registrada:** la pantalla ofrece «Buscar en Conoce Aquí» (copia el número y abre el sitio de SUNARP) y «Ver
  ubicación en el Visor BGR». Para el revisor, además lleva al formulario de registro.

## 4. Detalle de un expediente (`#/casos/{número}`)

### Semáforo informativo
- **Estado:** verde, amarillo, rojo o gris, siempre con **texto, ícono y color** (nunca solo color).
- **Motivos, alertas conocidas y datos faltantes:** cada estado explica por qué.
- **Reglas (v0.2, borrador pendiente de revisión especializada), sobre los gravámenes vigentes del rubro D:**
  - **Rojo (alerta prioritaria):** embargo (RP-01), anotación de demanda o medida cautelar (RP-02) y bloqueo registral (RP-03).
  - **Amarillo (revisión):** hipoteca (RV-02), carga técnica o servidumbre (RV-03) y otro acto (RV-01).
  - **Verde:** sin alertas en los campos evaluados. **No significa saneamiento.**
  - **Gris:** información insuficiente o condición no contemplada. Las alertas ya conocidas se siguen mostrando.
  - Los gravámenes cancelados y la copropiedad no generan alerta.
- **El color no se elige:** se recalcula con las reglas cada vez que se guarda un cambio y no existe forma de fijarlo a mano.
- **Límite visible:** cada resultado dice «no certifica saneamiento ni recomienda comprar», con la versión de las reglas.

### Partida registral
- **Descripción del inmueble:** zona y oficina registral, condición, ubicación, área, linderos, antecedente dominial, titularidad,
  completitud del extracto y fecha referencial (con la advertencia de que no es una consulta oficial).
- **Titularidad:** sale del último asiento de títulos de dominio. Si no consta, dice «desconocido», que no equivale a «sin cargas».
- **Asientos por rubro**, en paneles que se abren con el teclado:
  - **C** títulos de dominio, **D** gravámenes y cargas, **E** cancelaciones, **F** otros.
  - Cada asiento muestra su número, tipo de acto, estado (vigente o cancelada), fechas, título archivado y texto.
  - Una cancelación indica qué asiento cancela, y ese asiento figura como cancelado.
- **Extracto parcial:** si falta un rubro, se dice y no se inventa.

### Expediente técnico de planos (2D)
- En una **vivienda**, 4 planos: arquitectónico, de estructuras, de instalaciones eléctricas (II.EE.) y de instalaciones sanitarias (II.SS.).
  En un **lote** no aplican.
- El sistema revisa solo lo documental: si cada plano está **presentado, observado o no presentado**, el sistema constructivo que declara el
  de estructuras y si el **área del plano arquitectónico coincide** con el área construida inscrita (margen de 1 %).
- **Reglas** (borrador pendiente de revisión): RV-04 falta un plano de II.EE. o II.SS.; RV-05 el área no coincide o no consta una inscrita;
  RV-06 plano observado. Sin plano arquitectónico o de estructuras, una vivienda queda en gris.
- «Ver plano 2D» abre una **lámina referencial ficticia** dibujada a escala con las medidas de los linderos del expediente: terreno con cotas, vía, norte, escala gráfica, ambientes con sus áreas y cuadro de áreas (arquitectura); ejes y columnas o muros de adobe (estructuras); circuitos y pozo a tierra (II.EE.); agua, desagüe y caja de registro (II.SS.). Lleva rótulo, código de lámina y marca de agua, sin sello ni firma. El revisor puede subir el PDF real
  de cada plano y, desde ese momento, se muestra ese.

### Evaluación técnica por especialista (indicador B)
- **Separada del semáforo documental y nunca lo cambia.** Un texto fijo lo dice: «El indicador B es independiente y no cambia
  el color del indicador A».
- **Stepper de 4 etapas:** no solicitada → solicitada → en inspección → informe emitido (favorable, con observaciones
  subsanables o con riesgo físico detectado).
- **Solicitud (M5):** solo el comprador ve el botón «Solicitar inspección técnica». Abre un modal con el alcance de los 6 pasos y
  el costo referencial (S/ 250.00, que envía el backend; sin pasarela de pago) y pide confirmación. Después el expediente muestra
  la cuenta solicitante y la fecha. El servidor rechaza con 403 la solicitud de otro rol y con 409 una segunda solicitud.
- **Especialista (M8):** credencial con avatar ilustrativo, nombre, especialidad y CIP, rotulada «Datos ficticios de
  demostración». El servidor toma esos datos de la cuenta; el formulario ya no los pide y, si alguien los envía, se ignoran.
- **Estado físico:** tarjetas de Estructuras, Instalaciones eléctricas e Instalaciones sanitarias con lo verificado en campo.
- **Los 6 pasos** con su ícono de avance y siempre el límite: basada en inspección visual e instrumental; lo que exige ensayos
  queda fuera.
- El **especialista** llena el informe: fecha, verificación en campo de las 4 especialidades, observaciones, conclusiones y
  estudios adicionales.

### Documentos PDF (todos con marca de agua y aviso en cada página)
- **Copia literal:** encabezado en cada página, descripción y antecedente, asientos por rubro con el cuerpo en tipografía de texto registral
  justificada y el cierre registral de cada asiento (título, hora de presentación, tomo del diario, derechos y recibo). Esos datos de
  presentación se derivan del título del asiento, son siempre los mismos y solo existen en las partidas ficticias.
- **Láminas de planos:** una por especialidad presentada (ver arriba).
- **Informe técnico:** cuando el especialista lo emitió, un PDF con datos del inmueble, profesional, procedimiento, planos revisados con su
  verificación en campo, observaciones, conclusión, estudios adicionales y limitaciones. «Ver informe técnico (PDF)» en el panel.

### Glosario
- Cerrado y con versión (48 términos en la versión activa v0.4). Cada término se abre al seleccionarlo, también con Enter, y lleva el estado «pendiente de
  revisión». Si un dato no consta, el expediente lo dice.

### Checklist
- Cada elemento está **pendiente, revisado u observado**, con una observación opcional. «Revisado» solo significa que se revisó
  en la plataforma, no que tenga validez jurídica.
- Los 10 casos traen el ítem **«Declaración Jurada Municipal (HR y PU)»** (M9), con estados distintos según el caso y una
  observación cuando está observado (por ejemplo, en Pachacútec el PU declara 72 m² y no incluye la ampliación).
- Solo el revisor cambia el estado. El checklist no cambia el color del semáforo (I3).

### Documento del expediente
- «Abrir documento» muestra un PDF en otra pestaña, con la sesión del usuario (no hay enlace público).
- **Partida ficticia:** copia literal simulada, con marca de agua «Documento simulado · Sin valor legal» en cada página.
- **Partida transcrita:** transcripción referencial, con marca de agua «Transcripción referencial · No es publicidad registral».
- El PDF imita la estructura de una copia literal (rubros, asientos, títulos), pero **no lleva logos, sellos, firmas, códigos de
  verificación ni QR**.

## 5. Funciones del revisor

### Editar una partida («Editar partida», en el expediente)
- Cambia los datos del predio, la completitud, la fecha referencial, la nota y los asientos (agregar, quitar, corregir).
- Al guardar: valida todo, **regenera el PDF** (si lo genera el sistema), **recalcula el semáforo** y guarda en una sola operación.
  Si algo falla, no queda un registro a medias.
- **Control de versiones:** si alguien más editó mientras tanto, avisa y no pisa el cambio (conflicto 409).
- El sistema impide las contradicciones: un asiento repetido, un asiento E que no cancela nada o un asiento C sin titulares dan un
  error claro.

### Subir un PDF propio
- Solo PDF, hasta 5 MB. Se verifica que sea un PDF real. Desde ese momento el sistema deja de regenerar el documento. El archivo
  se guarda cifrado. No se deben subir documentos con datos reales de personas o predios.

### Registrar una partida transcrita (`#/casos/nueva`)
1. Datos de la partida: número, denominación, distrito, fecha de consulta, condición y completitud.
2. **Pegar el texto** de la partida copiado de Conoce Aquí. «Leer asientos» lo divide en asientos y deduce el tipo de acto, la
   cancelación, las fechas, el título y los titulares.
3. Corregir lo que haga falta en los asientos.
4. **Vista previa sin datos personales:**
   - Los nombres de personas naturales se reemplazan por «Persona natural N»; los DNI, el estado civil y los domicilios se omiten.
   - Se conservan las empresas y el Estado.
   - El revisor puede **ocultar a mano** un nombre que no se detectó o indicar que algo detectado **no es una persona**.
   - Los nombres originales **nunca salen del navegador**.
5. **Confirmar** que no quedan datos personales y registrar. El servidor vuelve a rechazar cualquier DNI, estado civil o domicilio.
- La partida queda con su semáforo, checklist inicial, glosario, PDF de transcripción y la fuente («Conoce Aquí – SUNARP») con la
  fecha de consulta.

### Eliminar una partida transcrita
- Desde su página, con una confirmación dentro de la pantalla. Borra el expediente, el checklist, la evaluación y el documento.
  Sirve, por ejemplo, para atender el pedido de un titular. Las partidas ficticias no se pueden eliminar.

## 5 bis. Ciclo de cartera (v0.7)

- **Captación:** al registrar una partida (`#/casos/nueva`) el revisor indica el código de cuenta del propietario. El caso nace
  en borrador y sin autorización. El revisor no tiene un botón para autorizar por el propietario.
- **Autorización:** en «Mis inmuebles» o en el detalle, el propietario usa «Autorizar evaluación» o «Retirar autorización». Si la
  retira de un caso publicado, el caso pasa a retirado.
- **Publicación:** en el detalle, el gestor usa «Publicar» (solo con autorización vigente) o «Retirar». Ninguna de estas
  acciones cambia el color del indicador A; tras cada una la interfaz vuelve a consultar el caso.
- **Historial de evaluaciones:** en el detalle (salvo para el comprador), cada recálculo con fecha y hora, color anterior →
  nuevo, origen (edición, plano, partida transcrita o carga inicial), cuenta, criterios, faltantes y motivos. Solo lectura.
- **Subsanación:** el revisor incorpora un plano o asientos faltantes con la edición de siempre; el motor recalcula y el
  historial lo registra. Adjuntar un PDF no levanta un rojo por embargo, bloqueo o demanda.
- **Contacto:** en un caso publicado, el comprador usa «Solicitar contacto» y elige un motivo (información general, consulta de
  documentos o consulta de inspección). No hay texto libre. Una segunda solicitud pendiente muestra un aviso y no se duplica.
- **Inspección asignada:** en el panel de inspección, el gestor asigna una inspección solicitada o en curso a un especialista;
  desde entonces solo ese especialista emite el informe.
- **Panel «Cartera» (`#/cartera`):** totales por color de A y por publicación, casos con faltantes, inspecciones con su
  asignación, bandeja de contactos pendientes con «Marcar atendida» y lista de casos filtrable por color, publicación y texto.
- **Siguiente paso:** el detalle muestra para todos «Siguiente paso: verificación jurídica con abogado o notario, fuera del
  sistema». No es una función del sistema.

## 6. Contenido incluido

Cada caso trae también su tipo de inmueble, distrito, precio referencial simulado, ilustración propia y el ítem HR y PU (ver la
tabla completa en el [LEEME](../LEEME.md)). Solo Santiago es un lote (D23).

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

Son partidas ficticias: personas, empresas, números y montos inventados. Las partidas transcritas se registran aparte y no se
guardan en el repositorio.

## 7. Seguridad, integridad y rendimiento

- **Contraseñas** con hash BCrypt. **Sesión** con token firmado, que caduca. **API protegida** por rol en cada ruta.
- **Archivos** cifrados en disco (AES-256-GCM).
- **Entradas validadas** en el servidor, con mensajes claros y sin cambios parciales.
- **Tiempo de respuesta** medido: 20 de 20 consultas en menos de 2 segundos (máximo 93 ms, solo la API).
- **Solo uso local (I6):** el backend escucha en `127.0.0.1` y la base es H2 en archivo. No está preparado para un servidor
  expuesto a la red; la estética comercial de la v0.6 no cambia el modelo de seguridad.
- **Accesibilidad básica:** teclado y foco visible, enlace «Saltar al contenido», modales con foco atrapado y Escape, estados con
  ícono y texto (contraste AA), y texto alternativo en cada ilustración.

## 8. Lo que no hace

- **No se conecta a SUNARP ni a ninguna fuente oficial.** No hay API pública de predios; las partidas reales se consultan a mano
  en Conoce Aquí y se transcriben.
- No emite documentos oficiales ni comprueba la autenticidad de un documento.
- No certifica saneamiento, no recomienda comprar y no da dictámenes jurídicos.
- No usa OCR, visión artificial ni inteligencia artificial: no analiza fotos ni planos. El análisis es por reglas sobre datos estructurados y el informe de un especialista.
- No afirma el estado físico de una vivienda: eso solo lo dice el informe del especialista.
- Sin pagos en línea, agenda de visitas, contratos, firmas, tours ni posventa (sección 1.7 del informe). El costo de la
  inspección es referencial y se coordina con la inmobiliaria.
- Las ilustraciones son dibujos propios, no fotos de los inmuebles.
- La lámina 2D es un esquema referencial, no el plano aprobado. La ubicación del predio solo se enlaza al Visor BGR de SUNARP.

## 9. Pendiente

- Revisión especializada de las reglas, el glosario y los casos.
- Aprobación del asesor para las partidas transcritas (desvío de RN-01 y PA2).
- Prueba de instalación en otro equipo (CP-07), piloto y aplicación del estudio.
- Pruebas con lector de pantalla y en otros navegadores distintos de Chrome.
- Verificación en navegador de las vistas de la v0.7 (Cartera, Mis inmuebles, publicación, historial, contacto y asignación).
- El comprador no puede consultar después el estado de su solicitud de contacto: el backend no ofrece esa ruta (D46).
