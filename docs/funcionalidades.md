# Funcionalidades de Trustinmuebles

Qué hace el programa hoy (versión v0.3), por rol, con la pantalla o la ruta donde está y lo que **no** hace. Para el detalle
técnico, ver [api.md](api.md); para las decisiones, [decisiones.md](decisiones.md); para las pruebas, [trazabilidad.md](trazabilidad.md).

Trustinmuebles es una herramienta de **orientación documental** para la precompra de lotes urbanos en Ica. Muestra la partida
registral de un lote, explica sus términos y señala qué falta revisar. **No certifica saneamiento, no recomienda comprar y no
reemplaza asesoría legal.**

## Resumen

| Área | Qué ofrece | Quién |
|---|---|---|
| Acceso | Ingreso con código de cuenta y contraseña; dos roles | Todos |
| Expedientes | Lista, búsqueda por número y detalle de cada partida | Comprador y revisor |
| Semáforo informativo | Estado verde, amarillo, rojo o gris, con motivos, alertas y faltantes | Comprador y revisor |
| Partida registral | Descripción del inmueble y asientos por rubro (C, D, E, F) | Comprador y revisor |
| Glosario | Términos explicados al seleccionarlos | Comprador y revisor |
| Checklist | Lista de elementos pendientes, revisados u observados | Ver: todos. Cambiar: revisor |
| Documento PDF | Copia literal simulada o transcripción referencial | Ver: todos. Subir uno propio: revisor |
| Edición | Cambiar los datos y los asientos de una partida | Revisor |
| Partidas transcritas | Registrar y eliminar partidas reales sin datos personales | Revisor |

## 1. Acceso y roles

- **Ingreso** (`#/login`): código de cuenta y contraseña. No hay registro abierto: las cuentas las crea el sistema al primer
  arranque (`comprador-01` y `revisor-01`).
- **Sesión:** dura mientras la pestaña esté abierta. Si caduca, el sistema vuelve al ingreso.
- **Protección contra intentos repetidos:** tras cinco fallos seguidos, se bloquea el ingreso unos minutos.
- **Roles:**
  - **Comprador:** consulta todo y no modifica nada.
  - **Revisor:** además edita partidas, cambia el checklist, sube documentos y registra o elimina partidas transcritas.
  - El servidor verifica el rol en cada operación. Ocultar un botón en pantalla no es la protección.

## 2. Inicio y avisos

- **Inicio** (`#/`): qué es Trustinmuebles, qué encuentras en cada expediente, cómo funciona y qué **no** hace.
- **Aviso fijo** en todas las pantallas: entorno de demostración, partidas ficticias y transcritas sin nombres de personas, y que
  la información es referencial.
- **Pie de página:** alcance del servicio y sus límites.

## 3. Expedientes (`#/casos`)

- **Lista:** una tarjeta por partida con su denominación, número, distrito, estado, elementos pendientes y, si corresponde, la
  insignia «Transcrita de SUNARP».
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

### Glosario
- Cerrado y con versión (32 términos). Cada término se abre al seleccionarlo, también con Enter, y lleva el estado «pendiente de
  revisión». Si un dato no consta, el expediente lo dice.

### Checklist
- Cada elemento está **pendiente, revisado u observado**, con una observación opcional. «Revisado» solo significa que se revisó
  en la plataforma, no que tenga validez jurídica.
- Solo el revisor cambia el estado. El checklist no cambia el color del semáforo.

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

## 6. Contenido incluido

| Partida | Predio | Estado esperado |
|---|---|---|
| `SIM-11048217` | Mz. F Lote 7 · Santa Elvira · Parcona | Verde |
| `SIM-11052690` | Mz. K Lote 12 · Rincón del Sauce · La Tinguiña | Amarillo |
| `SIM-11061555` | Mz. C Lote 3 · Mirador del Sol · Subtanjalla | Gris, con alerta prioritaria |
| `SIM-11070419` | Mz. B Lote 9 · Villa del Algarrobo · Los Aquijes | Gris (sin copia literal) |

Son partidas ficticias: personas, empresas, números y montos inventados. Las partidas transcritas se registran aparte y no se
guardan en el repositorio.

## 7. Seguridad, integridad y rendimiento

- **Contraseñas** con hash BCrypt. **Sesión** con token firmado, que caduca. **API protegida** por rol en cada ruta.
- **Archivos** cifrados en disco (AES-256-GCM).
- **Entradas validadas** en el servidor, con mensajes claros y sin cambios parciales.
- **Tiempo de respuesta** medido: 20 de 20 consultas en menos de 2 segundos (máximo 93 ms, solo la API).
- **Solo uso local:** el backend escucha en `127.0.0.1` y la base es H2 en archivo. No está preparado para un servidor expuesto a la red.

## 8. Lo que no hace

- **No se conecta a SUNARP ni a ninguna fuente oficial.** No hay API pública de predios; las partidas reales se consultan a mano
  en Conoce Aquí y se transcriben.
- No emite documentos oficiales ni comprueba la autenticidad de un documento.
- No certifica saneamiento, no recomienda comprar y no da dictámenes jurídicos.
- No usa OCR ni inteligencia artificial, y no genera reportes descargables.
- Sin pagos, contratos, firmas, inspecciones, tours, posventa ni filtros avanzados (sección 1.7 del informe).
- Los planos no se muestran: solo se enlaza al Visor BGR de SUNARP.

## 9. Pendiente

- Revisión especializada de las reglas, el glosario y los casos.
- Aprobación del asesor para las partidas transcritas (desvío de RN-01 y PA2).
- Prueba de instalación en otro equipo (CP-07), piloto y aplicación del estudio.
- Pruebas con lector de pantalla y en otros navegadores distintos de Chrome.
