# Material para el informe — Trustinmuebles versión 1.0.0

**Para:** quien redacte el informe del curso sin leer el código. **Fecha:** 14 de noviembre de 2026. **Entrega:** lunes
16 de noviembre de 2026. **Fuente de verdad:** el repositorio en la rama `v1.0-etapa-9` (etapas 1 a 9 de la 1.0.0); el
modelo de negocio completo y único de la 1.0.0 está en [MODELO-NEGOCIO-IMPLEMENTADO.md](MODELO-NEGOCIO-IMPLEMENTADO.md). Todo lo
que aquí se afirma está en el código, en las pruebas o en `docs/`; lo que no consta se marca como **No consta** o
**Supuesto**. No hay resultados del estudio con participantes: no se ha aplicado.

Convenciones: **Validado** = confirmado por la organización (LedCons) o por una prueba ejecutada; **Supuesto** = hipótesis del
equipo sin confirmar; **Implementado / Propuesto / Fuera de alcance** = estado en el sistema.

---

## 1. Producto y problema

**Problema.** En Ica, el comprador de un lote o una casa suele decidir sin entender la partida registral, sin saber qué
documentos faltan y saltando entre inmobiliarias y portales para comparar. La inmobiliaria, por su lado, vende sobre todo
lotes de proyectos de urbanización (cientos al mes) y no tiene un lugar propio donde publicarlos con su plano, ni una forma
ordenada de seguir a cada interesado.

**Producto (1.0.0).** Trustinmuebles es el sistema de **una sola inmobiliaria** (la organización de referencia, LedCons,
cuya marca se muestra en el portal desde la etapa 8) con dos caras:

- **Portal público** (sin cuenta): catálogo unido de lotes de proyecto y casas con filtros y orden, **plano de lotes** de cada
  proyecto, **asistente de búsqueda** por reglas (sin IA), **usos que suelen permitirse** según la zonificación del lote,
  ficha de cada inmueble con su **indicador A** (pre-evaluación documental) y **solicitud de cita** sin crear cuenta.
- **Panel de la inmobiliaria:** el asesor registra inmuebles uno a uno o carga lotes **por CSV** (con vista previa, todo o
  nada) y los **exporta a CSV para Excel**, publica solo lo autorizado, registra la **ubicación** y las **condiciones de
  pago** de cada proyecto y sigue a cada **interesado** como en un CRM (etapas, notas, agenda de citas, demanda, **embudo**,
  **aviso de nuevos**, registro de quien llega por llamada u oficina, exportación de la bandeja).

Se conserva lo anterior a la 1.0: expedientes, indicador A, ruta de regularización, semáforo de gestión interno, documentos
del lote e inspección técnica (indicador B). **No hay pagos en línea.** El sistema **no certifica saneamiento, no recomienda
comprar y no reemplaza a un abogado o notario.**

## 2. La organización y la entrevista del 09/11/2026

**Organización:** LedCons — razón social **LEDCONS E.I.R.L.**, RUC 20600817133, «Inmobiliaria y Constructora», Av. San
Martín 577, 2.º piso, oficina 32, Ica. Teléfonos 991 108 224 y 904 958 416; WhatsApp 51991108224; Facebook
`Constructora.Inmobiliaria.Ledcons.sac`. El logo dice «LEDCONS SAC» y se usa tal cual. **Autorización de uso de datos y
marca: verbal, 13/11/2026; la escrita está pendiente** (D72). No hay acta ni acuerdo formal firmado.

**Entrevista del 09/11/2026.** El repositorio **no contiene el acta, la guía ni las respuestas literales**. Lo que el equipo
trasladó al desarrollo (y por eso consta en el sistema) es:

| Tema | Lo que consta | Estado |
|---|---|---|
| Qué vende | Sobre todo lotes de proyectos de urbanización en Ica (más de 400 al mes) y algunos inmuebles de particulares | Validado por el equipo con LedCons (trasladado a las etapas) |
| Pagos | No hay pagos en línea | Validado |
| Quién carga | Un asesor carga los inmuebles (uno a uno o por lotes) y atiende a los interesados | Validado |
| Por dónde llegan los interesados | Formulario web, llamada, oficina, WhatsApp o referido (etapa 8) | Validado |
| Necesidad del comprador | Encontrar los lotes y casas de la inmobiliaria sin irse a otra; ver el plano; pedir cita | Validado |
| Volumen | Unos 400 lotes al mes (cartera de lotes de proyectos) | Validado (entrevista) |
| Personal | Un asesor y una contadora | Validado (entrevista). La contadora no tiene rol en el sistema: recibe los CSV |
| Herramienta actual | Excel | Validado (entrevista). Respuesta: exportar a CSV (etapa 9) |
| Temor del comprador | Estafas por la ubicación del lote | Validado (entrevista). Respuesta: dirección y «Cómo llegar» (etapa 9) |
| Pedidos de mejora | Mejoras sobre la versión mostrada | La etapa 9 responde a los trasladados (Excel, ubicación, condiciones de pago, aviso de nuevos, más asesores, embudo). Texto literal: **No consta** |

**Roles reales (según lo trasladado):** asesores comerciales (cargan inmuebles y atienden interesados) y propietarios
particulares (autorizan la venta de su inmueble); la autorización de los inmuebles propios la da la inmobiliaria. En el
sistema: ASESOR, GESTOR, REVISOR, PROPIETARIO (sección 4). **Pendiente de completar por el equipo:** cargos reales (por
ejemplo, quién autoriza en nombre de la empresa), respuestas textuales de la entrevista y las preguntas abiertas de
ingresos: **cuánto gasta hoy LedCons en publicidad y portales** y **cuánto estaría dispuesta a pagar** por el sistema.

**Proceso AS-IS (Supuesto: reconstruido de lo trasladado, a confirmar con el acta):**

1. La inmobiliaria lotiza un terreno matriz y vende sus lotes antes de independizarlos (en el sistema: «en partida matriz»).
2. Los lotes se difunden por sus canales (Facebook y WhatsApp constan en sus datos), sin plano interactivo ni ficha propia
   por lote.
3. El interesado escribe o llama; el asesor responde a mano y agenda la visita sin un registro común.
4. El comprador no ve la partida ni sabe qué documentos faltan; la verificación queda para el final (abogado o notario).
5. El seguimiento de cada interesado depende de cada asesor (cuaderno, chat).

## 3. Modelo de negocio (lienzo)

| Bloque | Contenido | Estado |
|---|---|---|
| **Segmentos** | (a) Compradores de lotes y casas en Ica; (b) la inmobiliaria que opera el portal (LedCons) | (a) Supuesto, sin estudio; (b) Validado como caso de referencia |
| **Propuesta de valor** | Comprador: todo el catálogo de la inmobiliaria en un sitio, con plano, filtros, asistente, usos del lote, indicador A explicado y cita sin cuenta. Inmobiliaria: carga masiva por CSV, publicación solo con autorización, CRM de interesados con agenda y demanda | Implementado; valor percibido **Supuesto** (sin estudio) |
| **Canales** | Portal web público (sin indexar mientras se prueba); WhatsApp de la inmobiliaria (`wa.me`); oficina y teléfono | Implementado |
| **Relación** | Asistida: el asesor responde, confirma o reprograma citas y sigue al interesado por etapas | Implementado |
| **Ingresos** | La inmobiliaria paga el sistema (suscripción); parte del costo de la inspección B (S/ 250 referencial) | **Supuesto no validado.** El sistema no cobra. Preguntas abiertas a LedCons: gasto actual en publicidad y portales; disposición a pagar |
| **Recursos clave** | Catálogo y partidas de la inmobiliaria, motor de reglas versionado, plano de lotes, asesores | Implementado / Validado |
| **Actividades clave** | Captar y cargar inmuebles, mantener expedientes, publicar con autorización, atender interesados | Implementado |
| **Socios** | LedCons (operadora); abogados o notarios (verificación fuera del sistema); SUNARP y municipalidad como fuentes consultadas a mano | LedCons: Validado (verbal). Resto: Supuesto |
| **Costos** | Hospedaje (contenedores Docker), dominio, mantenimiento, especialistas para B | Supuesto, sin cifras |

## 4. Actores, roles y flujo TO-BE

| Actor | Rol en el sistema | Qué hace |
|---|---|---|
| Visitante | Sin cuenta | Busca, filtra, abre planos y fichas, pide cita (nombre de pila y un medio de contacto, con consentimiento) |
| Asesor inmobiliario | ASESOR (`asesor-01` y los de `APP_ASESORES`) | Permisos de revisor y gestor: registra, carga y exporta CSV, registra ubicación y condiciones de pago, publica, autoriza en nombre de la inmobiliaria, atiende interesados (aviso de nuevos, embudo, exportación), registra a quien llega por llamada u oficina |
| Gestor (asesor comercial) | GESTOR (`gestor-01`) | Publica, atiende contactos e interesados (con el aviso de nuevos y la exportación), asigna especialistas, ve el panel y el semáforo interno |
| Revisor | REVISOR (`revisor-01`) | Registra partidas, planos y checklist |
| Especialista | ESPECIALISTA (`especialista-01`, `-02`) | Emite el informe técnico (indicador B) que le asignan |
| Propietario particular | PROPIETARIO (`propietario-01` a `-03`) | Ve sus inmuebles y autoriza su publicación |
| Comprador con cuenta | COMPRADOR (`comprador-01`) | Pide contacto e inspección B |
| Abogado o notario, SUNARP, municipalidad | Externos | Verificación jurídica; fuentes consultadas a mano |
| Contadora de LedCons | Externa al sistema | Recibe los CSV que exporta el asesor (Supuesto de uso) |

**Flujo TO-BE (5 pasos):**

1. **Carga.** El asesor carga los lotes de un proyecto por CSV (vista previa por fila; se confirma todo o nada; historial) o
   registra un inmueble de un particular; registra la ubicación y las condiciones de pago del proyecto. Puede exportar los
   lotes a CSV, editarlos en Excel y volver a cargarlos.
2. **Evaluación.** El motor de reglas calcula el indicador A del inmueble o de la partida matriz del proyecto.
3. **Autorización y publicación.** El asesor autoriza en nombre de la inmobiliaria (o el propietario autoriza lo suyo) y
   publica. Sin autorización vigente no se publica; publicar no cambia A.
4. **Búsqueda y cita.** El visitante usa el asistente, los filtros y el plano, abre la ficha (con la dirección, «Cómo
   llegar» y las condiciones de pago) y pide una cita (o escribe por WhatsApp, llama o va a la oficina y el asesor lo registra).
5. **Seguimiento.** El asesor ve el aviso de nuevos, confirma o reprograma la cita y lleva al interesado por etapas (Nuevo → Contactado → Cita
   agendada → Visita realizada → Separación → Venta, o Descartado); en Separación o Venta marca el lote. La verificación
   jurídica ocurre fuera del sistema.

## 5. Requisitos y reglas

### Requisitos funcionales

| RF | Requisito | Estado | Prueba principal |
|---|---|---|---|
| RF01 | Autenticar y autorizar los roles en el servidor | Implementado | `SeguridadTest`, `AsesorTest` |
| RF02 | Captar un inmueble en borrador (inmobiliaria o particular) | Implementado | `CaptacionPublicacionTest`, `TitularidadComercialTest` |
| RF03 | Autorizar o retirar la publicación (propietario o, en la inmobiliaria, asesor/gestor) | Implementado | `TitularidadComercialTest`, `CaptacionPublicacionTest.autorizacionSoloDelPropietario` |
| RF04 | Mantener partida, planos, documentos del lote y checklist | Implementado | `CasosApiTest`, `PlanosApiTest`, `DocumentosLoteApiTest` |
| RF05 | Calcular el indicador A por reglas | Implementado (reglas pendientes de revisión especializada) | `MotorClasificacionTest`, `CasosApiTest.losDiezCasosTienenSuColor` |
| RF06 | Historial de A de solo adición | Implementado | `HistorialEvaluacionTest` |
| RF07 | Publicar y retirar; el público ve solo lo publicado | Implementado | `PortalPublicoTest`, `CaptacionPublicacionTest` |
| RF08 | Catálogo público con filtros y orden | Implementado | `FiltrosCatalogoTest`, `ProyectosApiTest` |
| RF09 | Contacto del comprador con cuenta (motivo cerrado) | Implementado | `CarteraTest` |
| RF10 | Inspección B: solicitar, asignar, emitir | Implementado | `InspeccionTest`, `CicloCarteraTest` |
| RF11 | El propietario consulta sus casos sin editar | Implementado | `CaptacionPublicacionTest.propietarioSoloLectura` |
| RF12 | Panel de cartera del gestor | Implementado | `CarteraTest.panelCoherente`, `PanelTiposAlertaTest` |
| RF13 | Ruta de regularización | Implementado (criterios en borrador) | `RutaRegularizacionTest` |
| RF14 | Cartera por tipo de alerta y esfuerzo | Implementado | `PanelTiposAlertaTest` |
| RF15 | Semáforo de gestión interno y decisión de captación | Implementado | `GestionInmobiliariaTest` |
| RF16 | Proyectos con plano de lotes y ficha del lote | Implementado | `ProyectosApiTest`, `pages/proyectos.test.tsx` |
| RF17 | Carga de lotes por CSV con vista previa y historial | Implementado | `CargaLotesApiTest` |
| RF18 | Interés y cita desde el portal, con consentimiento | Implementado | `InteresApiTest` |
| RF19 | CRM de interesados (etapas, notas, agenda, demanda, borrado a pedido) | Implementado | `InteresApiTest` |
| RF20 | Asistente de búsqueda y usos del lote | Implementado | `lib/asistente.test.ts`, `lib/usosLote.test.ts` |
| RF21 | Registro de interesados desde el panel (llamada, oficina, WhatsApp, referido) con consentimiento verbal | Implementado (etapa 8) | `RegistroPanelYMarcaTest` |
| RF22 | Portada con cifras reales y marca de la inmobiliaria | Implementado (etapa 8) | `RegistroPanelYMarcaTest.cifrasDelSitio`, `pages/etapa8.test.tsx` |
| RF26 | Exportar a CSV (Excel) la bandeja con filtros y los lotes de un proyecto; solo asesor y gestor | Implementado (etapa 9) | `Etapa9Test`, `pages/etapa9.test.tsx` |
| RF27 | Dirección y enlace de mapa del proyecto con «Cómo llegar» | Implementado (etapa 9) | `Etapa9Test.ubicacionPublica`, `enlaceInvalido` |
| RF28 | Condiciones de pago del proyecto (texto) | Implementado (etapa 9) | `Etapa9Test.limites`, `pages/etapa9.test.tsx` |
| RF29 | Aviso de interesados nuevos en el menú | Implementado (etapa 9) | `Etapa9Test.avisoNuevos`, `pages/etapa9.test.tsx` |
| RF30 | Cuentas de asesor por configuración | Implementado (etapa 9) | `Etapa9Test.asesoresConfigurables` |
| RF31 | Embudo por etapa, total y por proyecto | Implementado (etapa 9) | `Etapa9Test.embudo` |
| RF23 | Pagos en línea | **Fuera de alcance** | — |
| RF24 | Consulta automática a SUNARP o a la municipalidad | **Fuera de alcance** (no hay API pública) | — |
| RF25 | Mapas georreferenciados embebidos | **Fuera de alcance** (sin dependencias nuevas; el plano es SVG propio; la etapa 9 solo enlaza el mapa de la inmobiliaria) | — |

### Requisitos no funcionales

| RNF | Requisito | Estado | Prueba o evidencia |
|---|---|---|---|
| RNF01 | Catálogo de 1000 lotes en menos de 2 s | Implementado: 248 ms la consulta más lenta | `CargaCatalogoTest` |
| RNF02 | NF02: 19 de 20 respuestas en 2 s o menos | Implementado: 20 de 20, máximo 54,3 ms | `scripts/medir-nf02.mjs` |
| RNF03 | Módulos con límites verificados | Implementado | `ModularityTests` |
| RNF04 | Sin dependencias nuevas en la 1.0 (CSV, SVG y PDF propios) | Implementado | Revisión de `pom.xml` y `package.json` |
| RNF05 | Uso en tableta (820 × 1180 y 1180 × 820) sin desplazamiento horizontal | Implementado: 12 de 12 pantallas | `recorrido-v10.mjs` (pasada en tableta) |
| RNF06 | Privacidad: sin DNI, partida parcial sin sesión, no indexar | Implementado | `RealismoContenidoTest`, `InteresApiTest`, `verificar-sitio.mjs` |
| RNF07 | Accesibilidad del plano y del menú (texto y teclado) | Implementado parcialmente; lector de pantalla **No verificado** | `pages/realismo.test.tsx` |
| RNF08 | Respaldo y restauración de la base | **Propuesto** (sin ejecutar; CP13 parcial) | — |

### Reglas de negocio e invariantes

| Regla | Enunciado | Estado | Prueba principal |
|---|---|---|---|
| RN01 / I1 | Verde = «Sin alertas en los campos evaluados»; no certifica saneamiento | Implementado | `CatalogoYServiciosTest.verdeSignificaSinAlertas` |
| RN02 / I8 | El color de A lo calculan solo las reglas | Implementado | `CasosApiTest.colorNoSeFijaAMano` |
| RN03 / I2 | B nunca cambia A | Implementado | `CatalogoYServiciosTest.informeConRiesgoNoCambiaElColor` |
| RN05 / I14 | No se publica sin autorización vigente | Implementado | `CaptacionPublicacionTest.sinAutorizacionNoSePublica` |
| RN-pub | Publicar no cambia A | Implementado | `CaptacionPublicacionTest.publicarRojoNoCambiaElColor` |
| RN17 / I15 | El semáforo de gestión es interno y no bloquea publicar | Implementado | `GestionInmobiliariaTest` |
| RN-lote | Un lote sin caso propio se ofrece solo si la partida matriz está autorizada | Implementado | `ProyectosApiTest` |
| RN-csv | La carga por CSV es todo o nada y no recalcula A | Implementado | `CargaLotesApiTest.kitNuevoProyecto` |
| RN-int | El interés guarda solo nombre de pila y un medio de contacto, con consentimiento; se borra a pedido (excepción acotada a I11, D68) | Implementado | `InteresApiTest`, `RegistroPanelYMarcaTest.validaciones` |
| RN-verbal | El consentimiento verbal queda con quién lo registró y cuándo | Implementado (etapa 8) | `RegistroPanelYMarcaTest.registraConConsentimientoVerbal` |
| RN-marca | Ningún PDF se presenta como emitido por SUNARP, una municipalidad o un colegio; la única imagen es el logo de la empresa | Implementado | `CopiaLiteralPdfTest.sinElementosOficiales`, `LaminaPdfTest` |
| RN-precio | El precio de los lotes precargados sale de un rango de mercado por distrito | Implementado (etapa 8) | `PreciosZonaTest` |
| RN-exportar | Solo el asesor y el gestor exportan; el CSV de lotes vuelve a cargarse sin cambios; los CSV no ejecutan fórmulas | Implementado (etapa 9) | `Etapa9Test.lotesIdaYVuelta`, `protegeFormulas` |
| RN-ubicación | «Cómo llegar» solo con un enlace https registrado por la inmobiliaria; sin mapa embebido | Implementado (etapa 9) | `Etapa9Test.enlaceInvalido` |

## 6. Decisiones D52 a D79 (una línea cada una)

| ID | Decisión |
|---|---|
| D52 | v0.8: la priorización por esfuerzo solo existe en el panel del gestor |
| D53 | v0.8: un plano presentado exige su PDF; límites (25 MB de entrada, 10 MB guardado) y optimización |
| D54 | v0.8: semáforo de gestión interno (cuatro estados) y decisión de captación de solo adición (I15) |
| D55 | v0.8: ruta de regularización con esfuerzo BAJO/MEDIO/ALTO (borrador del equipo) |
| D56 | v0.8: resaltado del color de A, nunca solo color (ícono y etiqueta) |
| D57 | v0.9: dos lotes reales de una subasta de la SBN, con su fuente |
| D58 | v0.9: documentos del lote como requisitos del indicador A (reglas v0.5) |
| D59 | Etapa 1: rol ASESOR = revisor + gestor |
| D60 | Etapa 1: titularidad comercial INMOBILIARIA/PARTICULAR y autorización en nombre de la inmobiliaria (V17) |
| D61 | Etapa 1: portal público sin sesión, solo lo publicado |
| D62 | Etapa 2: filtros, orden e independización del catálogo, en el servidor y en la URL (V18) |
| D63 | Etapa 3a: proyectos, hitos, plano de lotes y catálogo unido (V19) |
| D64 | Etapa 3b: carga masiva de lotes por CSV con vista previa e historial (V20) |
| D65 | Etapa 4: interés, citas y CRM del asesor (V21) |
| D66 | Etapa 5: asistente de búsqueda por reglas y usos del lote (sin migración) |
| D67 | Etapa 6: contenido realista (titulares reservados, partida parcial, ficha registral propia, sin colegiaturas, no indexar) (V22) |
| D68 | Etapa 7: excepción acotada a I11 para el interés del portal |
| D69 | Etapa 7: kit de respaldo, partida oculta en tarjeta y matriz, `preparar-demo` y versión 1.0.0 |
| D70 | Etapa 8: precios de mercado por rango de distrito (fuente Urbania, tres rangos estimados) |
| D71 | Etapa 8: cifras reales en la portada y registro de interesados desde el panel (V23) |
| D72 | Etapa 8: marca de LEDCONS en el portal y en los PDF (autorización verbal; escrita pendiente) |
| D73 | Etapa 8: `preparar-demo` con reposición, `verificar-sitio`, pasada en tableta y lista del lunes |
| D74 | Etapa 9: exportar a CSV para Excel (punto y coma, UTF-8 con BOM), lotes con las columnas de la carga |
| D75 | Etapa 9: dirección, enlace de mapa y condiciones de pago del proyecto; «Cómo llegar» sin mapa embebido (V24) |
| D76 | Etapa 9: aviso de interesados nuevos en el menú del asesor y del gestor |
| D77 | Etapa 9: cuentas de asesor por `app.asesores`; responsables = cuentas ASESOR y GESTOR |
| D78 | Etapa 9: embudo por etapa, total y por proyecto |
| D79 | Etapa 9: un solo modelo de negocio y una sola descripción de funcionalidades; lo anterior a `docs/historico/` |

## 7. Arquitectura

**Tecnología.** Backend Java 21, Spring Boot 4, Spring Modulith 2, Spring Security con JWT, Flyway, H2 (archivo, modo
PostgreSQL), PDFBox. Interfaz React 19, Vite, Tailwind 4, React Router (rutas `#/…`). Sin dependencias nuevas en la 1.0.

**Módulos** (verificados por `ModularityTests`): `identidad` (cuentas, login, roles), `expediente` (casos, partidas,
proyectos, lotes, catálogo público, PDF), `clasificacion` (motor de reglas e historial de A), `inspeccion` (indicador B),
`cartera` (contactos, decisiones de captación, panel), `interes` (interesados, notas, citas), `checklist`, `orientacion`
(glosario), `almacenamiento` (archivos y PDF) y `shared` (errores, datos de la empresa y, desde la etapa 9, el escritor de CSV).

**Entidades principales.** Usuario; CasoLote (inmueble) con su Expediente (partida, asientos, planos, documentos del lote,
datos comerciales); Evaluación e HistorialEvaluación (A); EvaluaciónTécnica (B); Proyecto, HitoProyecto, LoteProyecto e
HistorialLoteProyecto; SolicitudContacto y DecisiónCaptación; Interés, NotaInterés y Cita; HistorialAutorización.

**Migraciones (una línea cada una):**

| V | Qué hace |
|---|---|
| V1 | Esquema lógico del MVP |
| V2 | Casos con forma de partida registral |
| V3 | Partidas transcritas de una consulta pública, sin personas naturales |
| V4 | Planos de 4 especialidades y evaluación técnica |
| V5 | Datos comerciales del predio, perfil del especialista y quién pide la inspección |
| V6 | Captación y publicación: roles GESTOR y PROPIETARIO, autorización |
| V7 | Historial de evaluaciones de A, de solo adición |
| V8 | Contactos del comprador y asignación del especialista |
| V9 | Perfil de especialista visiblemente ficticio |
| V10 | Asignación obligatoria de la inspección |
| V11 | Origen «partida simulada» en el historial |
| V12 | Evidencia de cada archivo subido |
| V13 | Acreedor y plazo del gravamen |
| V14 | Decisiones de captación (solo adición) |
| V15 | Documentos del expediente de un lote y precio en otra moneda |
| V16 | Perfiles de los especialistas |
| V17 | Rol ASESOR, titularidad comercial e historial de autorizaciones |
| V18 | Campos del caso para los filtros del catálogo |
| V19 | Proyectos, hitos y lotes |
| V20 | Historial de los lotes cargados por CSV |
| V21 | Interesados, notas y citas |
| V22 | Realismo: colegiatura vacía y tabla de ajustes de contenido |
| V23 | Canal del interesado y consentimiento verbal con su autor |
| V24 | Dirección, enlace de mapa y condiciones de pago del proyecto |

**Endpoints.** Todos bajo `/api/v1` (detalle en `docs/api.md`).

- **Públicos (sin sesión):** `GET /publico/inmuebles` (catálogo con filtros y orden), `/publico/filtros`,
  `/publico/inmuebles/recomendables`, `/publico/inmuebles/{c}` y sus PDF (ficha registral, láminas, documentos del lote),
  `/publico/proyectos/{c}` (plano), `/publico/proyectos/{c}/lotes/{A-7}`, `/publico/proyectos/{c}/documentos/{tipo}`,
  `/publico/contacto`, `POST /publico/interes` (10 por hora por IP), `/publico/sitio` (versión, indexable y cifras),
  `GET /robots.txt`; `POST /auth/login`.
- **Privados (con sesión y rol):** casos (`/casos/**`: registrar, partida, planos, documentos, checklist, autorización,
  publicación, historial, ruta, decisión de captación, inspección), proyectos (`/proyectos/**`: lista, publicación y estado
  de lotes, plantilla, vista previa y carga CSV, historial; etapa 9: `exportar.csv` y `PUT /proyectos/{c}/datos`),
  contactos y panel (`/contactos`, `/cartera/panel`), interesados y citas (`/interesados/**`, incluido `POST /interesados`
  desde el panel y, en la etapa 9, `exportar.csv`, `nuevos` y `embudo`; `/citas/**`).

**Despliegue.** *Local:* backend en `127.0.0.1:8080` (`./mvnw spring-boot:run` con `APP_SEED_PASSWORD`) e interfaz en
`localhost:5173` (`npm run dev`), con `scripts/reiniciar-demo.ps1` para empezar de cero. *Nube:* `docker-compose.yml` para
Portainer (backend sin puertos publicados, frontend detrás de un proxy), imágenes publicadas por GitHub Actions en cada
cambio a `main`; dominio configurado en CORS. La demo en la nube **no se verificó** desde el repositorio: para eso está
`scripts/verificar-sitio.mjs <URL>`.

**Respaldo.** La base H2 y los archivos viven en el volumen `backend-data` (Docker) o en `trustinmuebles-backend/data`
(local): respaldar es copiar ese directorio con el backend detenido. **No se ha ejecutado una restauración** (CP13 parcial).
Para la demo hay además un **kit de respaldo** (`docs/demo/kit/`: textos de partida, PDF y CSV) y `preparar-demo.mjs`, que
repone por la API interesados y lotes sin borrar nada.

## 8. Indicadores y ayudas, con sus límites

| Elemento | Qué es | Límite |
|---|---|---|
| **Indicador A** | Pre-evaluación documental por reglas versionadas (`v0.5`): verde «Sin alertas en los campos evaluados», amarillo «Requiere revisión» (p. ej. RV-02 hipoteca), rojo «Alerta prioritaria» (RP-01 embargo, RP-02 demanda o medida cautelar, RP-03 bloqueo), gris «Información insuficiente». En un lote de proyecto sin caso propio, el de la partida matriz, rotulado así | No certifica saneamiento; reglas pendientes de revisión especializada; nadie puede fijar el color a mano |
| **Indicador B** | Informe técnico presencial de un especialista asignado (6 pasos), S/ 250 referencial | No cambia A; sin pasarela de pago; la inspección real no se ha hecho |
| **Ruta de regularización** | Pasos orientativos por cada motivo de A, con quién gestiona y esfuerzo | Sin plazos ni costos; no es asesoría legal |
| **Semáforo de gestión** | Cuatro estados internos para decidir la captación | Solo gestor y revisor; no cambia A ni B; no bloquea publicar |
| **Asistente** | Reglas sobre el texto (sin IA): zona, proyecto, tipo, precio, precio por m², área, uso y orden; recomienda 3 con motivos | No usa IA ni envía la frase fuera; el uso no es un filtro; no promete nada |
| **Usos del lote** | Usos que suele permitir la zonificación (RDB, RDM, CV, etc.) según el área | Orientativo; siempre con el aviso de verificar el certificado de parámetros urbanísticos |
| **Precios** | Rango por distrito (D70): Ica 800–900, Subtanjalla 450–650 (avisos); La Tinguiña 350–500, Los Aquijes 300–450, Salas 250–400 (estimados) | Referenciales para la demo; la inmobiliaria los reemplaza con su lista |

## 9. Pruebas por versión

| Versión | Backend | Interfaz | Recorrido en navegador |
|---|---|---|---|
| v0.7.0 | 140 | 60 (9 archivos) | 15 de 15 pasos (30/10/2026) |
| v0.8.0 | 186 | 82 | 20 de 20 pasos (02/11/2026) |
| v0.9 (`d7803f8`) | 200 | 85 (16 archivos) | 27 de 27 pasos (09/11/2026) |
| v1.0.0, etapa 7 | 318 | 276 (30 archivos) | 13 de 13 pasos (13/11/2026) |
| v1.0.0, etapa 8 | 332 | 290 (32 archivos) | 13 de 13 pasos y 12 de 12 pantallas en tableta (13/11/2026) |
| v1.0.0, etapa 9 | **347** | **309** (33 archivos) | **15 de 15 pasos y 12 de 12 pantallas en tableta** (14/11/2026) |

Todas aprobadas, 0 fallos. Build de la interfaz correcto (aviso de tamaño del paquete que ya existía).

**Recorrido de la etapa 9** (`docs/pruebas/uso-v10/recorrido-v10.mjs`, base nueva fuera del repositorio, Chrome sin
ventana, 14/11/2026): los 13 pasos del guion de 15 minutos más 2 de la etapa 9 (aviso de nuevos, exportación a CSV con ida
y vuelta, ubicación y condiciones de pago, «Cómo llegar»), ejecutados por la máquina en **100 s** (178 s con el arranque
del backend); sin errores de consola ni respuestas 409/500. **La duración con una persona no se ha medido**: debe
cronometrarse en el ensayo.

**Capturas.** Laptop (1280 × 900), `docs/pruebas/uso-v10/capturas/`: 01-asistente, 02-filtros, 03-plano, 04-ficha-lote,
05-solicitar-cita, 06-carga-csv, 07-registro-particular, 08-laminas-kit, 09-propietario-autoriza, 10-publica,
11-confirma-cita, 12-separacion, 13-pie-version, 14-exportar-ubicacion, 15-ubicacion-pago. Tableta, `docs/pruebas/uso-v10/capturas-tableta/`: vertical y horizontal ×
portada, inmuebles, plano, ficha-lote, interesados, registrar-interesado (12). Las de versiones anteriores están en
`docs/pruebas/capturas-v07/`, `capturas-v08/` y `uso-v09/capturas/`.

## 10. Competencia, referencias y fuente de precios

- **Urbania** (urbania.pe): portal inmobiliario peruano donde publican muchas inmobiliarias y particulares. Es el canal donde
  el comprador «se va a otra»; la 1.0 responde con un portal propio de la inmobiliaria, con plano de lotes y ficha por lote.
  También es la **fuente de precios** (D70): 13 avisos revisados por el equipo el 13/11/2026, dos excluidos (Ica, con
  construcción o céntricos, más de S/ 3,600 por m²); tres distritos con rango **estimado** porque sus avisos eran terrenos
  rústicos o grandes (S/ 48 a 280 por m², solo como piso).
- **Ceinys:** referencia de competencia indicada por el equipo. **El repositorio no tiene su análisis**: completar con las
  notas del equipo (qué ofrece, en qué se diferencia).
- **SUNARP** (Conoce Aquí, Visor BGR) y la **municipalidad**: fuentes que se consultan a mano; el sistema solo enlaza.

## 11. Privacidad y contenido realista

- **Titulares reservados:** «Persona natural (datos reservados)» o empresas inventadas; sin DNI ni nombres reales.
- **Partida oculta sin sesión:** `1105••••` en la ficha, la tarjeta, el proyecto, la portada y los PDF públicos.
- **Ficha registral propia:** la elabora la inmobiliaria con su nombre y logo; no imita la copia literal de SUNARP ni lleva
  escudos, sellos, firmas, códigos de verificación o QR.
- **Sin colegiaturas inventadas:** el número se registra al asignar al profesional real.
- **No indexar:** `robots.txt` con `Disallow: /` y `noindex` mientras `app.sitio.indexable` sea false.
- **Consentimiento:** el formulario exige la casilla (versión `2026-11-v1`) y guarda solo nombre de pila y un medio de
  contacto; el registro desde el panel exige la constancia del consentimiento verbal y guarda quién lo registró y cuándo;
  todo se borra a pedido. Precarga, kit y pruebas con correos `@example.com` y sin celulares.
- **Exportación (etapa 9):** el CSV de interesados lleva datos de contacto; solo lo descargan el asesor y el gestor, sin
  caché, y la pantalla avisa que no se comparta fuera del equipo.
- **Contraseña de las cuentas en la nube:** `APP_SEED_PASSWORD` propia del despliegue, no la de las pruebas (D77).

## 12. Limitaciones y pendientes

- **Autorización escrita de LedCons** para su marca y datos (hoy verbal, 13/11/2026) y **acta** de la entrevista del
  09/11/2026.
- **Datos reales de LedCons** (proyectos, lotes, precios, partidas, direcciones y enlaces de mapa): el sistema usa
  contenido preparado por el equipo; las direcciones de la precarga son referenciales y no tienen enlace.
- **Ingresos:** gasto actual de LedCons en publicidad y portales, y disposición a pagar: sin respuesta.
- **Estudio con participantes:** no se ha aplicado; no hay resultados.
- **Revisión especializada** de las reglas `v0.5`, el glosario, la ruta y los criterios de esfuerzo.
- **Decisiones del docente** pendientes sobre los desvíos ya listados (partidas transcritas, lotes de la SBN, quitar rótulos
  de simulado) y los supuestos D32 a D49.
- Demo en la nube sin verificar desde el repositorio; respaldo y restauración sin ejecutar; accesibilidad con lector de
  pantalla sin verificar; duración humana del guion sin medir; tamaño del paquete de la interfaz.

## 13. Correspondencia con el informe

Los números de sección citados (6.4.2, 6.5.2, anexos 18 a 26, tablas 10, 14 y 49, figura 6) son los que usaban los
documentos anteriores del equipo; confirma la numeración vigente del informe antes de pegar.

| Capítulo o anexo | Qué actualizar | Sección de este documento |
|---|---|---|
| I. Problemática y objetivos | Problema del comprador y de la inmobiliaria; objetivo de la 1.0 (portal + panel) | 1 |
| II. Marco teórico / referencial | Portales inmobiliarios y competencia (Urbania, Ceinys), indicadores de transparencia, privacidad | 8, 10, 11 |
| III. Organización y diagnóstico | LedCons, entrevista del 09/11/2026, roles, AS-IS | 2 |
| IV. Modelo de negocio | Lienzo con validado y supuesto; propuesta de valor | 3 |
| V. Arquitectura de negocio y de sistemas | Actores, TO-BE de 5 pasos (sección 6.4.2), requisitos, reglas, decisiones, módulos, entidades (tabla 14, figura 6), migraciones, endpoints, despliegue (6.5.2) | 4, 5, 6, 7 |
| VI. Implementación, pruebas y resultados | Indicadores y límites, pruebas por versión (tabla 10), recorridos y capturas, limitaciones, control de cambios (tabla 49: fila de la 1.0.0) | 8, 9, 12 |
| Anexo 18 (contenido y datos) | Precios por rango, contenido realista, consentimiento | 8, 11 |
| Anexos 19 y 20 (módulos y versiones) | Módulos y tecnología | 7 |
| Anexo 23 y 24 (servicios y endpoints) | Endpoints públicos y privados | 7 |
| Anexo 25 (resultados de pruebas) | Totales por versión y recorrido de la etapa 9 | 9 |
| Anexo 26 (capturas) | Lista de capturas de laptop y tableta | 9 |
| Anexos del estudio | Sin resultados: el estudio no se ha aplicado | 12 |
