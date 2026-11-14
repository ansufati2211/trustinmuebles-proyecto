# Modelo de negocio implementado — Trustinmuebles 1.0.0

Un solo modelo: el de la versión **1.0.0** tal como la hacen el código y las pruebas (rama `v1.0-etapa-9`). Lo que no consta
en el repositorio se marca **No consta**; lo que es hipótesis del equipo, **Supuesto**; lo confirmado por LedCons o por una
prueba ejecutada, **Validado**. El texto de las versiones v0.7 a v0.9 está, sin cambios, en
[historico/MODELO-NEGOCIO-v0.9.md](historico/MODELO-NEGOCIO-v0.9.md). Detalle técnico en [api.md](api.md), decisiones en
[decisiones.md](decisiones.md), estado y pruebas en [REPORTE-v1.0.md](REPORTE-v1.0.md).

## 1. Ficha

| Campo | Valor |
|---|---|
| Versión | `1.0.0` (`trustinmuebles-backend/pom.xml`, `trustinmuebles/package.json`, pie del sitio y `GET /api/v1/publico/sitio`) |
| Fecha de esta descripción | 14 de noviembre de 2026 (etapa 9). Entrega: lunes 16 de noviembre de 2026 |
| Pruebas del backend | **347 ejecutadas, 347 aprobadas** (0 fallos, 0 errores, 0 omitidas). Antes de la etapa 9: 332 |
| Pruebas de la interfaz | **309 aprobadas en 33 archivos** (Vitest). Antes de la etapa 9: 290 en 32 |
| Recorrido en navegador | `docs/pruebas/uso-v10/recorrido-v10.mjs` con una base nueva, el 14/11/2026: **15 de 15 pasos** (los 13 del guion de 15 minutos y los pasos 14 y 15 de la etapa 9) y **12 de 12 pantallas en tableta**; sin errores de consola ni respuestas 409/500. Detalle en [REPORTE-v1.0.md](REPORTE-v1.0.md), sección 4 |
| Rendimiento | Catálogo con 1000 lotes: consulta más lenta 248 ms (límite 2 s, `CargaCatalogoTest`). NF02: 20 de 20 en 2 s o menos (máximo 54,3 ms, solo la API, 30/10/2026) |
| Alcance | Sistema de **una sola inmobiliaria** (LedCons): portal público y panel interno. Sin pagos en línea |

## 2. Organización

| Dato | Valor | Estado |
|---|---|---|
| Nombre comercial | LedCons («LEDCONS», «Inmobiliaria y Constructora») | Validado |
| Razón social y RUC | **LEDCONS E.I.R.L.**, RUC **20600817133** | Validado (dato público de la empresa) |
| Dirección y contacto | Av. San Martín 577, 2.º piso, oficina 32, Ica; teléfonos 991 108 224 y 904 958 416; WhatsApp y Facebook de la empresa (`contenido/empresa.json`) | Validado |
| Propietaria | Katerin Ramos Ledesma (entrevistada el 09/11/2026) | Validado |
| Zonas donde trabaja | Sector Nueva Ica (carretera a Carhuaz), Monte Alegre y Residencial Villa Macacona | Validado (entrevista) |
| Personal | Un asesor que atiende a los interesados y una contadora que confirma que los papeles están en orden | Validado (entrevista) |
| Autorización de uso de marca y datos | **Verbal** (09/11 y 13/11/2026). **La escrita está pendiente** (D72). No hay acta firmada | Pendiente |

**Entrevista del 09/11/2026.** Semiestructurada, a la propietaria, registrada por el equipo. Las cifras son aproximadas y
el **acta firmada está pendiente**.

| Tema | Respuesta registrada |
|---|---|
| Tamaño y tipo de cartera | Alrededor de 400 lotes al mes en proyectos de lotización; trabajan sobre todo con lotes y pocas viviendas |
| Zonas | Sector Nueva Ica (carretera a Carhuaz), Monte Alegre y Residencial Villa Macacona. Sol de Carhuaz es un proyecto ofrecido a LedCons y a Ceinys, por eso compiten en él |
| Origen de los inmuebles | Lotes de proyectos, mayormente de urbanización; también inmuebles de particulares que les asignan para vender |
| Documentos que piden | Documentos básicos: partida registral y documentos legales. No mostraron una lista o formato |
| Quién revisa y quién atiende | Un asesor; la contadora confirma que los papeles están en orden |
| Dónde guardan la información | Excel |
| Tiempo de revisión | Alrededor de un día, a cargo de la contadora |
| Inmuebles con problemas | Respondió «7» de cada 10; mencionó un caso con levantamiento, ya resuelto. Por confirmar |
| Qué hacen ante un problema | Lo gestionan hasta tener todo en orden; si no, toman otras medidas (no detalladas) |
| Ventas caídas o demoradas | Sí hubo; no dio detalles |
| Preocupación del comprador | Temor a estafas relacionadas con la ubicación de los lotes |
| Revisión por ingeniero o arquitecto | Rara vez o nunca; no trabajan con especialistas habituales |
| Datos para el sistema | Dispuestos a entregar de 5 a 10 inmuebles de ejemplo |
| Moneda | Soles |
| Autorización | Verbal el 09/11 y el 13/11 (datos de marca); escrita pendiente |
| Opinión tras la demostración | Útil. Pidió: formulario de interés (datos, zona y presupuesto), mapa de lotes, menos actores, catálogo con filtros sin salir del sitio (referencia: Urbania), recorrido 3D con sus recursos y compararse con Ceinys |
| Prueba con su equipo | Siguiente reunión: 16/11/2026 |

**Cómo se atendió cada pedido en la v1.0:** formulario de interés y solicitud de cita (D65, D68); plano interactivo de
lotes por proyecto (D63); un solo rol de asesor y visitante sin cuenta (D59 a D61); catálogo con filtros, orden y asistente
de búsqueda (D62, D66); enlace al recorrido o video de LedCons por proyecto (D63); comparación con Ceinys en
[PARA-INFORME-v1.0.md](PARA-INFORME-v1.0.md), sección 10.

**Qué respuestas de la entrevista atiende la etapa 9** (son respuestas, no pedidos literales): Excel → exportar a CSV
(D74); temor a estafas por la ubicación → dirección y «Cómo llegar» (D75); un solo asesor que atiende → cuentas de asesor por
configuración, para cuando sumen otros (D77; que vayan a sumarlos es Supuesto). El aviso de nuevos (D76), el embudo (D78) y las condiciones de pago en
texto (D75) son propuestas del equipo para el seguimiento y frente a la oferta de financiamiento de Ceinys; LedCons no
las pidió.

**Lo que la entrevista cambia en el modelo:** la contadora hace hoy la revisión documental (en el sistema, la tarea del rol
REVISOR; no tiene cuenta todavía); LedCons **rara vez o nunca** recurre a un ingeniero o arquitecto, así que el indicador B
y su ingreso son una hipótesis más débil (sección 12); y el «7 de cada 10» inmuebles con problemas, si se confirma, respalda
la propuesta del indicador A y de la ruta de regularización.

**Pendiente:** acta firmada; confirmar el «7 de cada 10»; quién autoriza en nombre de la empresa la publicación de sus
lotes; gasto actual en publicidad y portales, y disposición a pagar (sección 12; la entrevista no los respondió); los 5 a 10
inmuebles de ejemplo que ofreció LedCons; prueba con su equipo el 16/11/2026.

## 3. Lienzo del modelo

| Bloque | Contenido | Estado |
|---|---|---|
| Segmentos | (a) Compradores de lotes y casas en Ica; (b) la inmobiliaria que opera el portal (LedCons) | (a) **Supuesto** (sin estudio con compradores); (b) **Validado** como caso de referencia |
| Propuesta de valor | Sección 4 | Implementada; valor percibido **Supuesto** |
| Canales | Portal web público (no indexado mientras se prueba); WhatsApp, teléfono, oficina y Facebook de la inmobiliaria | Portal **implementado**; canales propios **Validados** (datos de la empresa) |
| Relación con el cliente | Asistida: el asesor responde, confirma o reprograma la cita y lleva al interesado por etapas | Implementado |
| Fuentes de ingreso | La inmobiliaria paga el sistema; parte del costo de la inspección B | **Supuesto** (sección 12). El sistema no cobra nada |
| Recursos clave | Catálogo y partidas de la inmobiliaria, motor de reglas versionado, plano de lotes, asesores | Implementado |
| Actividades clave | Cargar y mantener inmuebles y lotes, publicar con autorización, atender interesados, exportar a Excel | Implementado |
| Socios clave | LedCons (operadora); abogado o notario (verificación fuera del sistema); SUNARP y municipalidad (fuentes consultadas a mano) | LedCons **Validado** (verbal); el resto **Supuesto** |
| Estructura de costos | Hospedaje en contenedores, dominio, mantenimiento, especialistas para B | **Supuesto**, sin cifras (sección 12) |

## 4. Propuesta de valor

**Para el comprador** (sin cuenta): todo el catálogo de la inmobiliaria en un sitio, con filtros, orden y un asistente; el
**plano de lotes** de cada proyecto; la ficha de cada lote con precio, precio por m², zonificación y **usos que suelen
permitirse**; la **dirección del proyecto y «Cómo llegar»**; las **condiciones de pago** en texto; el **indicador A**
explicado (o el de la partida matriz, rotulado así); y **pedir una cita sin crear cuenta**. Nada de esto promete una compra
segura.

**Para la inmobiliaria:** un portal propio con su marca; carga de cientos de lotes por CSV con vista previa (todo o nada) y
**exportación a CSV para Excel** (la misma plantilla de ida y vuelta); publicación solo de lo autorizado; un **CRM** de
interesados con etapas, notas, agenda de citas, demanda y **embudo** por etapa y proyecto; **aviso de interesados nuevos**
en el menú; registro de quien llega por llamada, oficina, WhatsApp o referido; y una cuenta por asesor.

## 5. Actores y roles

| ID | Actor | Rol en el sistema | Qué hace | Qué no puede hacer |
|---|---|---|---|---|
| ACT-00 | Visitante | Sin cuenta | Busca, filtra, usa el asistente, abre planos y fichas, ve la ubicación y las condiciones de pago, pide cita con nombre de pila y un medio de contacto (con consentimiento) | Ver borradores; ver la partida completa (sale parcial) |
| ACT-10 | Asesor inmobiliario | `ASESOR` (`asesor-01` y los de `app.asesores`) | Permisos de revisor y de gestor: registra inmuebles, carga y exporta lotes por CSV, edita ubicación y condiciones de pago, autoriza en nombre de la inmobiliaria, publica, atiende interesados y citas, exporta la bandeja | Cambiar el color de A a mano; autorizar el inmueble de un particular |
| ACT-03 | Gestor (asesor comercial) | `GESTOR` (`gestor-01`) | Publica y retira, atiende contactos e interesados (con el aviso de nuevos), exporta, asigna especialistas, ve el panel y el semáforo interno | Editar la partida o el checklist |
| ACT-02 | Revisor | `REVISOR` (`revisor-01`) | Registra partidas, planos, documentos del lote y checklist; ve los proyectos | Publicar, autorizar, exportar CSV, ver interesados |
| ACT-04 | Especialista | `ESPECIALISTA` (`especialista-01`, `-02`) | Registra el avance y emite el informe técnico (B) de la inspección que le asignaron | Actuar sin asignación; cambiar A |
| ACT-05 | Propietario particular | `PROPIETARIO` (`propietario-01` a `-03`) | Ve sus inmuebles y autoriza o retira la publicación de los suyos | Editar; ver casos ajenos |
| ACT-01 | Comprador con cuenta | `COMPRADOR` (`comprador-01`) | Pide contacto (motivo cerrado) e inspección B sobre un caso publicado | Ver borradores; exportar; ver interesados |
| ACT-06 | Abogado o notario | Externo | Verificación jurídica antes de comprar | No tiene cuenta |
| ACT-07 | SUNARP | Externo, consultado a mano | Conoce Aquí (el asesor o revisor transcribe) y Visor BGR (solo enlace) | El sistema no se conecta |
| ACT-08 | Municipalidad | Externo, consultado a mano | Declaración jurada (HR y PU) y certificado de zonificación | El sistema no se conecta |
| ACT-09 | Contadora de LedCons | Sin cuenta todavía | Confirma que los papeles están en orden (alrededor de un día por inmueble); recibe los CSV que exporta el asesor (Supuesto de uso) | Su tarea corresponde al rol REVISOR; hoy no tiene cuenta |

Todas las cuentas usan la contraseña de `APP_SEED_PASSWORD` y nacen al arrancar si faltan; no hay registro abierto. El
servidor comprueba el rol en cada operación (I4).

## 6. Flujo (5 pasos)

| Paso | Quién | Qué pasa | Pantalla | Regla que se mantiene |
|---|---|---|---|---|
| 1. Carga | Asesor | Carga los lotes de un proyecto por CSV (vista previa por fila, todo o nada, historial) o registra un inmueble propio o de un particular; registra la ubicación y las condiciones de pago del proyecto. Puede exportar los lotes a CSV, editarlos en Excel y volver a cargarlos | `#/proyectos`, `#/proyectos/{c}/carga`, `#/casos/nueva` | La carga no recalcula A; un lote se ofrece solo con la partida matriz autorizada (I14) |
| 2. Evaluación | Motor de reglas | Calcula el indicador A del inmueble o de la partida matriz con las reglas `v0.5` | Expediente | Nadie fija el color a mano (I8) |
| 3. Autorización y publicación | Asesor (inmobiliaria) o propietario (particular); asesor o gestor publica | Sin autorización vigente no se publica | Expediente | Publicar no cambia A (I10) |
| 4. Búsqueda y cita | Visitante | Asistente, filtros y plano; ficha con ubicación, «Cómo llegar» y condiciones de pago; pide cita o llega por llamada, oficina, WhatsApp o referido y el asesor lo registra | Portal | Sin pagos en línea; sin DNI |
| 5. Seguimiento | Asesor o gestor | Ve el aviso de nuevos, confirma o reprograma la cita, lleva al interesado por etapas (Nuevo → Contactado → Cita agendada → Visita realizada → Separación → Venta, o Descartado), marca el lote, revisa el embudo y exporta la bandeja | `#/interesados` | Marcar el lote no cambia A. La verificación jurídica ocurre fuera del sistema |

## 7. Servicios

| Servicio | Quién lo usa | Qué hace | Límite |
|---|---|---|---|
| Portal público | Visitante | Catálogo unido (casos y lotes de proyecto), 24 por página, filtros y orden en la URL | Solo lo publicado |
| Asistente de búsqueda | Visitante | Reglas sobre la frase (zona, proyecto, tipo, precio, área, uso, orden) y 3 recomendaciones con motivos | Sin IA; la frase no sale del navegador |
| Plano de lotes | Visitante | SVG propio por manzanas, con teclado y leyenda en texto | Plano referencial de la lotización |
| Ubicación del proyecto (etapa 9) | Visitante; edita el asesor o el gestor | Dirección en la página del proyecto y en la ficha del lote; «Cómo llegar» abre en otra pestaña el enlace https que registró la inmobiliaria | Sin mapa embebido ni dependencias. Sin enlace no hay botón |
| Condiciones de pago (etapa 9) | Visitante; edita el asesor o el gestor | Texto de hasta 500 caracteres con el título «Condiciones de pago» y la nota «Consulta con un asesor» | Sin simulador ni tasas calculadas |
| Usos del lote | Visitante | Usos que suele permitir la zonificación según el área | Orientativo; con el aviso de verificar el certificado de parámetros |
| Cita | Visitante | Visita al lote, reunión en oficina o llamada; una o dos fechas con franja | 10 envíos por hora por IP; consentimiento obligatorio |
| CRM de interesados | Asesor y gestor | Bandeja con filtros, etapas, notas, próxima acción, agenda de 7 días, demanda, registro desde el panel, borrado a pedido | El asesor contacta por fuera: el sistema no envía mensajes |
| Aviso de nuevos (etapa 9) | Asesor y gestor | Cantidad en etapa Nuevo junto a «Interesados», con texto para lectores de pantalla | Se actualiza al cambiar de página, al cambiar la bandeja y cada minuto |
| Embudo (etapa 9) | Asesor y gestor | Cantidad y porcentaje por etapa, del total y por proyecto (y «Sin proyecto») | Incluye los descartados, para que las etapas sumen el total |
| Carga CSV | Asesor y gestor | Vista previa con errores por fila; confirmación todo o nada; historial de solo adición | 2000 filas y 1 MB por archivo |
| Exportar a CSV (etapa 9) | Asesor y gestor | Bandeja con los filtros aplicados y lotes de un proyecto; punto y coma, UTF-8 con BOM (Excel lo abre directo) | El de lotes usa las columnas de la carga: volver a cargarlo sin cambios no cambia nada. El de interesados lleva datos de contacto |
| Indicador A | Todos los que ven la ficha | Verde «Sin alertas en los campos evaluados», amarillo «Requiere revisión», rojo «Alerta prioritaria», gris «Información insuficiente» | No certifica saneamiento; reglas pendientes de revisión especializada |
| Indicador B | Comprador con cuenta, gestor, especialista | Inspección presencial de 6 pasos, S/ 250 referencial, informe en PDF | No cambia A; sin pago en línea; la inspección real no se ha hecho |
| Ruta de regularización | Quien ve el detalle | Pasos por motivo de A, quién gestiona, documento y esfuerzo | Orientativa; sin plazos ni costos |
| Semáforo de gestión interno | Gestor y revisor (y asesor) | Cuatro estados y decisión de captación de solo adición | No se muestra al comprador; no bloquea publicar (I15) |

## 8. Reglas e invariantes vigentes

| ID | Regla | Prueba principal |
|---|---|---|
| I1 / RN01 | Verde es exactamente «Sin alertas en los campos evaluados»; no certifica saneamiento | `CatalogoYServiciosTest.verdeSignificaSinAlertas` |
| I2 / RN-10 | B nunca cambia A | `CatalogoYServiciosTest.informeConRiesgoNoCambiaElColor` |
| I3 | El checklist (incluida HR y PU) no cambia A | `CatalogoYServiciosTest.hrPuNoCambiaElColor` |
| I4 | La autorización está en el servidor | `SeguridadTest`, `AsesorTest`, `Etapa9Test` (permisos de exportar y de editar el proyecto) |
| I5 | Los módulos se comunican solo por sus API públicas | `ModularityTests` |
| I7 | Los límites legales se ven en el pie | `limitesLegales.test.tsx` |
| I8 / RN-06 | El color de A solo cambia cuando el motor recalcula | `CasosApiTest.colorNoSeFijaAMano`, `CaptacionPublicacionTest.publicarRojoNoCambiaElColor` |
| I9 | Un PDF o plano no levanta un rojo | `HistorialEvaluacionTest.pdfNoLevantaElEmbargo` |
| I10 | Publicar y pedir contacto no dependen del color de A | `CarteraTest.contactoSobreRojo` |
| I11 (con la excepción D68) | Sin DNI ni datos personales fuera de lo necesario; el interés guarda solo nombre de pila y un medio de contacto, con consentimiento, y se borra a pedido | `CuentasDemoTest.sinDatosPersonales`, `InteresApiTest.validaciones`, `RegistroPanelYMarcaTest` |
| I12 | Historiales de solo adición (A, lotes por CSV, decisiones) | `HistorialEvaluacionTest.historialInmutable`, `CargaLotesApiTest` |
| I13 | El propietario autoriza solo lo suyo; en un inmueble de la inmobiliaria autoriza el asesor o el gestor | `CaptacionPublicacionTest.autorizacionSoloDelPropietario`, `TitularidadComercialTest` |
| I14 / RN05 | Nada se publica ni se ofrece sin autorización vigente (un lote, sin la de su partida matriz) | `CaptacionPublicacionTest.sinAutorizacionNoSePublica`, `ProyectosApiTest` |
| I15 | El semáforo de gestión es interno y no bloquea publicar | `GestionInmobiliariaTest` |
| RN-csv | La carga por CSV es todo o nada y no recalcula A; la exportación usa las mismas columnas y vuelve a cargarse sin cambios | `CargaLotesApiTest`, `Etapa9Test.lotesIdaYVuelta` |
| RN-verbal | El consentimiento verbal queda con quién lo registró y cuándo | `RegistroPanelYMarcaTest.registraConConsentimientoVerbal` |
| RN-marca | Ningún PDF se presenta como emitido por SUNARP, una municipalidad o un colegio | `CopiaLiteralPdfTest.sinElementosOficiales` |
| RN-ubicación (etapa 9) | «Cómo llegar» solo con un enlace https con dominio registrado por la inmobiliaria; no se embebe ningún mapa | `Etapa9Test.enlaceInvalido`, `pages/etapa9.test.tsx` |
| RN-exportar (etapa 9) | Solo el asesor y el gestor exportan; los CSV no ejecutan fórmulas en Excel | `Etapa9Test.lotesPermisos`, `interesadosPermisos`, `protegeFormulas` |

**Ya no es una regla:** «solo uso local» (I6). El backend escucha en `127.0.0.1` cuando se ejecuta en una laptop, pero la
1.0.0 se despliega en la nube con Docker detrás de un dominio (sección 11). La regla vigente es la de exposición mínima: el
backend no publica puertos y el sitio no se indexa mientras `app.sitio.indexable` sea false.

## 9. Fuentes de información

| Fuente | Qué aporta | Cómo entra |
|---|---|---|
| LedCons | Marca, razón social, RUC, dirección, teléfonos, WhatsApp y Facebook (`contenido/empresa.json`) | Autorización verbal; escrita pendiente |
| LedCons (pendiente) | Proyectos, lotes, precios y partidas reales | Ofreció de 5 a 10 inmuebles de ejemplo; aún no entregados. El sistema usa contenido preparado por el equipo (sección 13), en otras zonas que las suyas |
| Asesor de la inmobiliaria | Inmuebles, lotes por CSV, ubicación y enlace de mapa, condiciones de pago | Panel |
| SUNARP (Conoce Aquí, Visor BGR) | Texto de la partida; ubicación catastral | A mano; el sistema solo enlaza |
| Municipalidad | HR y PU; certificado de zonificación y vías | Los aporta el propietario |
| SBN | Bases de la II Subasta Pública 2026 y plano perimétrico de dos lotes | PDF publicado y enlace (D57) |
| Urbania | Rango de precio por m² por distrito para la precarga (D70) | Revisión manual del equipo, 13/11/2026 |

Sin scraping ni API: el backend no hace ninguna petición a SUNARP ni a otros portales (D20).

## 10. Datos y privacidad

- **Titulares reservados:** «Persona natural (datos reservados)» o empresas inventadas; sin DNI ni nombres de personas.
- **Partida oculta sin sesión:** `1105••••` en la ficha, la tarjeta, el proyecto, la portada y los PDF públicos.
- **Ficha registral propia:** el PDF se titula «FICHA REGISTRAL DEL INMUEBLE», con la marca de agua «FICHA INFORMATIVA ·
  DOCUMENTO REFERENCIAL · SIN VALOR LEGAL» y el logo de la inmobiliaria; no imita la copia literal de SUNARP ni lleva escudos,
  sellos, firmas, códigos de verificación o QR.
- **Sin colegiaturas inventadas:** los especialistas no tienen número de colegiatura registrado; se registra al asignar al
  profesional real (V22, D67).
- **No indexar:** `robots.txt` con `Disallow: /` y `meta robots noindex` mientras `app.sitio.indexable` sea false.
- **Consentimiento:** el formulario exige la casilla (versión `2026-11-v1`) y guarda solo nombre de pila y un correo o
  celular; el registro desde el panel exige la constancia del consentimiento verbal y guarda quién lo registró y cuándo;
  todo se borra a pedido. La precarga y el kit usan correos `@example.com` y ningún celular.
- **Datos de contacto que sí existen:** los de la inmobiliaria (públicos) y los de los interesados (con consentimiento).
  El **CSV de interesados** los lleva: solo el asesor y el gestor lo descargan, la pantalla avisa que no se comparta fuera
  del equipo y la respuesta va sin caché.
- **Cuentas:** se identifican por su código; no guardan DNI ni teléfono. En la nube, `APP_SEED_PASSWORD` debe ser una
  contraseña propia del despliegue, no la de las pruebas ([demo/CHECKLIST-LUNES.md](demo/CHECKLIST-LUNES.md)).

## 11. Arquitectura resumida

- **Backend:** Java 21, Spring Boot 4, Spring Modulith 2, Spring Security con JWT, Flyway, H2 en archivo (modo PostgreSQL),
  PDFBox. Diez módulos verificados por `ModularityTests`: `identidad`, `expediente`, `clasificacion`, `inspeccion`, `cartera`,
  `interes`, `checklist`, `orientacion`, `almacenamiento` y `shared` (errores, datos de la empresa y, desde la etapa 9, el
  escritor de CSV).
- **Migraciones:** V1 a **V24**. La 1.0.0 agrega V17 (asesor y titularidad), V18 (filtros), V19 (proyectos y lotes), V20
  (historial de lotes), V21 (interés y citas), V22 (realismo), V23 (canal y consentimiento verbal) y **V24 (dirección, enlace
  de mapa y condiciones de pago del proyecto)**.
- **Interfaz:** React 19, Vite, Tailwind 4, React Router con rutas `#/…`. Sin dependencias nuevas en la 1.0.0.
- **Despliegue:** local (backend en `127.0.0.1:8080`, interfaz en `localhost:5173`) o en la nube con `docker-compose.yml`
  (backend sin puertos publicados, frontend detrás de un proxy, imágenes publicadas por GitHub Actions). La demo en la nube
  se comprueba con `scripts/verificar-sitio.mjs`.
- **Propiedades nuevas de la etapa 9:** `app.asesores` (`APP_ASESORES`, por omisión `asesor-01`).

## 12. Ingresos y costos (hipótesis)

Ninguna cifra está validada. El sistema no cobra, no factura y no tiene pasarela de pago.

| Hipótesis | Qué soporta hoy el sistema | Estado |
|---|---|---|
| La inmobiliaria paga una suscripción mensual por el portal y el panel | Nada: no hay planes ni medición de uso | Supuesto |
| Parte del costo de cada inspección B (S/ 250 referencial) | Registra solicitudes y asignaciones; no suma importes | Supuesto, **debilitado**: LedCons rara vez o nunca recurre a un ingeniero o arquitecto (entrevista) |
| El portal propio reemplaza parte del gasto en portales y publicidad | El embudo y la demanda muestran de dónde vienen los interesados y cuántos avanzan | Supuesto |
| Costos: hospedaje en contenedores, dominio, mantenimiento, especialistas para B | Sin cifras | Supuesto |

**Preguntas abiertas a LedCons** (no constan en el repositorio):

1. ¿Cuánto gasta hoy al mes en publicidad y en portales (Facebook, Urbania u otros)?
2. ¿Cuánto estaría dispuesta a pagar por el portal y el panel (al mes o por lote vendido)?
3. ¿Cuántos interesados recibe al mes y cuántos llegan a separar?
4. ¿Quién autoriza en nombre de la empresa la publicación de sus lotes?
5. ¿Qué columnas usa hoy en su Excel de lotes y de clientes?

## 13. Contenido precargado

Para que la demo funcione sin datos reales de LedCons. Lo carga el sistema al arrancar con una base nueva.

| Contenido | Detalle |
|---|---|
| Proyectos | 4: Altos de Ventisca (Subtanjalla, 56 lotes), Rinconada del Lúcumo (La Tinguiña, 44), Terrazas de Sauzal (Salas, 68) y Horizonte de Los Aquijes (Los Aquijes, 0 lotes, para cargar el CSV del kit en la demo) |
| Ubicación (etapa 9) | Una dirección referencial verosímil por distrito en cada proyecto, **sin enlace de mapa** (el asesor pega el de la ubicación real) y **sin condiciones de pago** |
| Precios | Rango por m² por distrito (D70): Ica y Subtanjalla según avisos de Urbania; La Tinguiña, Los Aquijes y Salas estimados |
| Casos | Los 12 de siempre (10 de Ica y 2 lotes de la SBN) más las 4 partidas matrices de los proyectos |
| Interesados y citas | 15 interesados con correos `@example.com` y 4 citas en los próximos 7 días |
| Glosario | 57 términos (`contenido/v0.5/glosario.json`) |
| Cuentas | 9 por omisión (`comprador-01`, `revisor-01`, `especialista-01`, `especialista-02`, `gestor-01`, `propietario-01` a `-03`, `asesor-01`) más las de `app.asesores` |
| Kit de respaldo | `docs/demo/kit/` (CSV de 80 lotes, textos de partida, PDF) y `scripts/preparar-demo.mjs` |

## 14. Lo que no hace

Pagos en línea; simulador de crédito o tasas; mapas embebidos o de terceros; IA u OCR; consultas en línea a SUNARP o a la
municipalidad; envío de correos o mensajes desde el sistema; firma de contratos; certificar saneamiento, recomendar comprar o
reemplazar a un abogado o notario; documentos que se presenten como oficiales.

## 15. Limitaciones

- Autorización escrita de LedCons y acta firmada de la entrevista: pendientes.
- Datos reales de LedCons (proyectos, lotes, precios, partidas): no cargados.
- Estudio con compradores: no se ha aplicado; no hay resultados.
- Reglas `v0.5`, glosario, ruta y criterios de esfuerzo: pendientes de revisión especializada.
- Respaldo y restauración: sin ejecutar (CP13 parcial). Accesibilidad con lector de pantalla: no verificada.
- La duración del guion con una persona no se ha medido.
- El enlace de mapa lo pega una persona: el sistema comprueba que sea https, no que apunte al lugar correcto.

## 16. Trazabilidad

### 16.1 Requisitos funcionales

| RF | Requisito | Prueba principal | Estado |
|---|---|---|---|
| RF01 | Autenticar y autorizar los roles en el servidor | `SeguridadTest`, `AsesorTest` | Implementado |
| RF02 | Captar un inmueble en borrador (inmobiliaria o particular) | `CaptacionPublicacionTest`, `TitularidadComercialTest` | Implementado |
| RF03 | Autorizar o retirar la publicación | `TitularidadComercialTest`, `CaptacionPublicacionTest` | Implementado |
| RF04 | Partida, planos, documentos del lote y checklist | `CasosApiTest`, `PlanosApiTest`, `DocumentosLoteApiTest` | Implementado |
| RF05 | Indicador A por reglas | `MotorClasificacionTest`, `CasosApiTest` | Implementado (reglas en revisión) |
| RF06 | Historial de A de solo adición | `HistorialEvaluacionTest` | Implementado |
| RF07 | Publicar y retirar; el público ve solo lo publicado | `PortalPublicoTest`, `CaptacionPublicacionTest` | Implementado |
| RF08 | Catálogo público con filtros y orden | `FiltrosCatalogoTest`, `ProyectosApiTest` | Implementado |
| RF09 | Contacto del comprador con cuenta | `CarteraTest` | Implementado |
| RF10 | Inspección B | `InspeccionTest`, `CicloCarteraTest` | Implementado |
| RF11 | El propietario consulta lo suyo sin editar | `CaptacionPublicacionTest.propietarioSoloLectura` | Implementado |
| RF12 | Panel de cartera | `CarteraTest.panelCoherente`, `PanelTiposAlertaTest` | Implementado |
| RF13 | Ruta de regularización | `RutaRegularizacionTest` | Implementado (criterios en borrador) |
| RF14 | Cartera por tipo de alerta y esfuerzo | `PanelTiposAlertaTest` | Implementado |
| RF15 | Semáforo de gestión y decisión de captación | `GestionInmobiliariaTest` | Implementado |
| RF16 | Proyectos con plano de lotes y ficha del lote | `ProyectosApiTest`, `pages/proyectos.test.tsx` | Implementado |
| RF17 | Carga de lotes por CSV | `CargaLotesApiTest` | Implementado |
| RF18 | Interés y cita desde el portal | `InteresApiTest` | Implementado |
| RF19 | CRM de interesados | `InteresApiTest` | Implementado |
| RF20 | Asistente y usos del lote | `lib/asistente.test.ts`, `lib/usosLote.test.ts` | Implementado |
| RF21 | Registro de interesados desde el panel | `RegistroPanelYMarcaTest` | Implementado |
| RF22 | Portada con cifras reales y marca | `RegistroPanelYMarcaTest`, `pages/etapa8.test.tsx` | Implementado |
| RF26 | Exportar a CSV la bandeja (con filtros) y los lotes de un proyecto, solo asesor y gestor | `Etapa9Test` (lotes e interesados), `pages/etapa9.test.tsx` | Implementado (etapa 9) |
| RF27 | Dirección y enlace de mapa del proyecto con «Cómo llegar» | `Etapa9Test.ubicacionPublica`, `enlaceInvalido`, `precargaDirecciones` | Implementado (etapa 9) |
| RF28 | Condiciones de pago del proyecto | `Etapa9Test.ubicacionPublica`, `limites`; `pages/etapa9.test.tsx` | Implementado (etapa 9) |
| RF29 | Aviso de interesados nuevos en el menú | `Etapa9Test.avisoNuevos`; `pages/etapa9.test.tsx` | Implementado (etapa 9) |
| RF30 | Cuentas de asesor por configuración | `Etapa9Test.asesoresConfigurables`, `listaAsesores` | Implementado (etapa 9) |
| RF31 | Embudo por etapa, total y por proyecto | `Etapa9Test.embudo`; `pages/etapa9.test.tsx` | Implementado (etapa 9) |
| RF23 | Pagos en línea | — | Fuera de alcance |
| RF24 | Consulta automática a SUNARP o a la municipalidad | — | Fuera de alcance |
| RF25 | Mapas georreferenciados embebidos | — | Fuera de alcance (la etapa 9 solo enlaza el mapa) |

### 16.2 Reglas de negocio

| Informe | Identificador aquí | Prueba | Estado |
|---|---|---|---|
| RN01 | I1 | `CatalogoYServiciosTest.verdeSignificaSinAlertas` | Probado |
| RN02 | I8 | `CaptacionPublicacionTest.publicarRojoNoCambiaElColor` | Probado |
| RN03 | I2 + I3 | `CatalogoYServiciosTest.informeConRiesgoNoCambiaElColor`, `hrPuNoCambiaElColor` | Probado |
| RN04 | I9 | `HistorialEvaluacionTest.pdfNoLevantaElEmbargo` | Probado |
| RN05 | I10 + I14 | `CaptacionPublicacionTest.sinAutorizacionNoSePublica` | Probado |
| RN06 | I13 | `CaptacionPublicacionTest.autorizacionSoloDelPropietario` | Probado |
| RN07 | I12 | `HistorialEvaluacionTest.historialInmutable` | Probado |
| RN08 | Sin vencimiento automático de la información registral | Sin prueba automática | Implementado, sin prueba |
| RN09 | El especialista firma desde su cuenta | `CatalogoYServiciosTest.identidadDelEspecialistaBloqueada` | Probado |
| RN10 | B no cambia A | `InspeccionTest.flujoCompleto` | Probado |
| RN11 | Gris conserva las alertas | `MotorClasificacionTest.grisConservaAlertas` | Probado |
| RN13 a RN17 | Plano con PDF, límites de archivo, ruta orientativa, priorización solo interna, semáforo interno | `DocumentosApiTest`, `RutaRegularizacionTest`, `PanelTiposAlertaTest`, `GestionInmobiliariaTest` | Probado |
| RN18 (etapa 9) | RN-exportar | `Etapa9Test.lotesPermisos`, `interesadosPermisos`, `protegeFormulas` | Probado |
| RN19 (etapa 9) | RN-ubicación | `Etapa9Test.enlaceInvalido` | Probado |

### 16.3 Casos de prueba

Los CP01 a CP25 son los del informe (detalle histórico en
[historico/MODELO-NEGOCIO-v0.9.md](historico/MODELO-NEGOCIO-v0.9.md), sección 16.4). La 1.0.0 los mantiene aprobados con las
mismas pruebas, salvo CP13 (respaldo y restauración, parcial), CP15 y CP16 (pendientes). La etapa 9 agrega:

| CP | Caso | Prueba automática | Recorrido | Estado |
|---|---|---|---|---|
| CP26 | Exportar lotes: permisos (401/403/200), columnas de la carga, BOM y punto y coma; volver a cargarlo no cambia nada | `Etapa9Test.lotesPermisos`, `lotesContenido`, `lotesIdaYVuelta` | Paso 14 | Aprobado |
| CP27 | Exportar interesados: permisos, mismos filtros y orden que la bandeja, protección contra fórmulas | `Etapa9Test.interesadosPermisos`, `interesadosContenido`, `protegeFormulas` | Paso 14 | Aprobado |
| CP28 | Ubicación: guardar, mostrar en el proyecto y en el lote, enlace solo https, vacío borra | `Etapa9Test.ubicacionPublica`, `enlaceInvalido`, `precargaDirecciones`; `pages/etapa9.test.tsx` | Pasos 14 y 15 | Aprobado |
| CP29 | Condiciones de pago: hasta 500 caracteres, título y nota, vacías en la precarga | `Etapa9Test.limites`, `ubicacionPublica`; `pages/etapa9.test.tsx` | Paso 15 | Aprobado |
| CP30 | Aviso de nuevos: cuenta la etapa Nuevo, baja al cambiar la etapa, solo asesor y gestor, texto para lectores de pantalla | `Etapa9Test.avisoNuevos`; `pages/etapa9.test.tsx` | Paso 14 | Aprobado |
| CP31 | Cuentas de asesor por `app.asesores`, sin duplicar ni cambiar las existentes | `Etapa9Test.asesoresConfigurables`, `listaAsesores` | — | Aprobado |
| CP32 | Embudo: cantidades y porcentajes que suman el total, por proyecto | `Etapa9Test.embudo`; `pages/etapa9.test.tsx` | — | Aprobado |
