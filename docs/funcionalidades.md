# Funcionalidades de Trustinmuebles 1.0.0

Qué hace el sistema en la versión **1.0.0**, por actor y por pantalla. Una sola descripción: lo de la v0.8 que ya no aplica
(reglas v0.2, documento simulado, copia literal, uso solo local, perfiles ficticios) está, sin cambios, en
[historico/funcionalidades-v0.8.md](historico/funcionalidades-v0.8.md). El modelo de negocio está en
[MODELO-NEGOCIO-IMPLEMENTADO.md](MODELO-NEGOCIO-IMPLEMENTADO.md); la API, en [api.md](api.md).

Trustinmuebles es el portal y el panel de **una inmobiliaria de Ica** (LedCons). **No certifica saneamiento, no recomienda
comprar, no reemplaza a un abogado o notario y no cobra nada en línea.**

## Resumen por actor

| Actor | Cuenta | Qué usa |
|---|---|---|
| Visitante | Sin cuenta | Portada, catálogo, asistente, proyecto con plano, ubicación y condiciones de pago, ficha del lote o del inmueble, cita |
| Asesor | `asesor-01` (y los de `app.asesores`) | Todo lo del revisor y del gestor: Registrar, Proyectos (carga y exportación CSV, ubicación y pago), Expedientes, Cartera, Interesados (con aviso, embudo y exportación) |
| Gestor | `gestor-01` | Expedientes, Cartera, Interesados (con aviso, embudo y exportación), publicación, asignación de especialistas y Proyectos (`#/proyectos`, sin enlace en su menú) |
| Revisor | `revisor-01` | Expedientes y Registrar partida: partida, planos, documentos del lote, checklist |
| Especialista | `especialista-01`, `-02` | Expedientes: informe técnico (indicador B) de la inspección asignada |
| Propietario | `propietario-01` a `-03` | Mis inmuebles: ver lo suyo y autorizar o retirar su publicación |
| Comprador con cuenta | `comprador-01` | Expedientes publicados: contacto con motivo cerrado e inspección B |

## 1. Visitante (sin cuenta)

| Pantalla | Ruta | Qué hace |
|---|---|---|
| Portada | `#/` | Marca de LEDCONS en la barra; cifras reales (inmuebles publicados, proyectos, lotes disponibles); cómo funciona; pie con razón social, RUC, dirección, teléfonos, WhatsApp, Facebook, límites legales y «con tecnología Trustinmuebles · versión 1.0.0» |
| Catálogo | `#/inmuebles` | Casos publicados y lotes de proyecto juntos, 24 por página; filtros por proyecto, distrito, tipo, estado comercial, moneda, precio, precio por m², área, indicador A, tipo de alerta, zonificación y uso; orden por novedad, precio, precio por m² o área; todo queda en la dirección |
| Asistente | Arriba del catálogo | Entiende frases como «lote en Subtanjalla de menos de 80 mil soles» con reglas (sin IA; la frase no sale del navegador); etiquetas que se pueden quitar y 3 recomendaciones con sus motivos |
| Proyecto | `#/proyectos/{c}` | Nombre, distrito, **dirección y botón «Cómo llegar»** (abre en otra pestaña el enlace de mapa que registró la inmobiliaria; sin enlace no aparece), plano de lotes SVG por manzanas (flechas, Inicio, Fin, Enter), leyenda en texto, panel del lote, **«Condiciones de pago» con la nota «Consulta con un asesor»** (si la inmobiliaria las registró), avance (hitos), indicador A de la partida matriz y sus documentos |
| Ficha del lote | `#/proyectos/{c}/lotes/{A-7}` | Precio, precio por m², zonificación, independización, **dirección del proyecto y «Cómo llegar»**, «Usos que suelen permitirse» (orientativo), indicador A de la partida matriz y solicitud de cita |
| Ficha de un inmueble | `#/inmuebles/{c}` | Indicadores A y B, usos, documentos para descargar sin sesión (ficha registral, láminas, documentos del lote) |
| Solicitar cita | Ficha, plano o asistente | Visita al lote, reunión en oficina o llamada; una o dos fechas con franja; nombre de pila y un celular o correo; consentimiento obligatorio; WhatsApp de la inmobiliaria |
| Créditos | `#/creditos` | Fotos con licencia libre |

Sin sesión, la partida se ve parcial (`1105••••`) en la ficha, la tarjeta, el proyecto, la portada y los PDF. El sitio pide
no ser indexado mientras `app.sitio.indexable` sea false.

## 2. Asesor y gestor (panel de la inmobiliaria)

El asesor reúne los permisos del revisor y del gestor. El gestor tiene los de gestión (no edita la partida).

### Menú y aviso de interesados nuevos

- El menú muestra junto a **«Interesados»** la cantidad de interesados en etapa **Nuevo** (burbuja con el número, «99+»
  desde 100). Para lectores de pantalla el enlace se lee «Interesados, 3 interesados nuevos». Se actualiza al cambiar de
  página, cuando la bandeja cambia (etapa, registro, borrado) y cada minuto. Sin nuevos no hay burbuja. También en el menú ☰
  de tableta y celular. El gestor tiene ahora «Interesados» en su menú.

### Proyectos (`#/proyectos`)

| Función | Qué hace |
|---|---|
| Lista de proyectos | Nombre, distrito, dirección (o «Sin dirección registrada»), lotes, en línea, disponibles y aviso si la partida matriz no tiene autorización |
| Cargar lotes (CSV) | `#/proyectos/{c}/carga`: plantilla, «Descargar los lotes actuales», vista previa con errores por fila y «solo errores», confirmación todo o nada, historial por lote |
| **Exportar lotes (CSV)** | Descarga `lotes-{proyecto}-{fecha}.csv` con las mismas columnas que la carga (`manzana;lote;area_m2;precio;moneda;estado;independizacion;zonificacion;codigo_caso`), separador punto y coma y UTF-8 con BOM: Excel lo abre con doble clic. Se edita y se vuelve a cargar; sin cambios, la vista previa dice «sin cambios» en todas las filas. Incluye los precios de los lotes que no están en línea (es interno) |
| **Ubicación y pago** | Dirección (hasta 200 caracteres), enlace de mapa opcional (solo https, por ejemplo el de «Compartir» de Google Maps) y condiciones de pago opcionales (hasta 500 caracteres, con contador). Un campo vacío borra el dato. No se calculan cuotas ni tasas |
| Ver página pública | Abre `#/proyectos/{c}` |

### Expedientes, Registrar y Cartera

- **Registrar** (`#/casos/nueva`): inmueble de la inmobiliaria o de un particular (titularidad comercial, proyecto, estado
  comercial, independización, precio), pegando el texto de la partida; vista previa sin datos personales.
- **Expediente** (`#/casos/{c}`): partida, planos, documentos del lote, checklist, indicador A con historial, ruta de
  regularización, semáforo de gestión interno con decisión de captación, autorización (en nombre de la inmobiliaria) y
  publicación, asignación del especialista.
- **Cartera** (`#/cartera`): panel por color de A, publicación, tipo de alerta, esfuerzo y estado de gestión; contactos de
  compradores con cuenta.

### Interesados (`#/interesados`)

| Pestaña | Qué hace |
|---|---|
| Interesados | Bandeja con filtros por etapa, proyecto, responsable y «solo con acción vencida» (vencidos primero y resaltados); detalle con etapa, responsable, próxima acción, notas, citas y «Marcar el lote separado o vendido»; borrar a pedido; **Registrar interesado** (llamada, oficina, WhatsApp o referido, con consentimiento verbal); **Exportar a CSV** con los filtros aplicados (`interesados-{fecha}.csv`: registrado el, nombre, medio, contacto, canal, etapa, inmueble o búsqueda, proyecto, lote, zona, tipo, presupuesto, forma de pago, responsable, próxima acción, vencida, cita por confirmar y notas). La pantalla avisa que el archivo lleva datos de contacto y no debe compartirse fuera del equipo |
| Agenda de citas | 7 días; confirmar, reprogramar o rechazar |
| **Embudo** | Cantidad y porcentaje por etapa del total y de cada proyecto (más «Sin proyecto»), en barras y en una tabla con título para lectores de pantalla. Cuenta los descartados, así las etapas suman el total |
| Demanda | Interesados activos por zona, tipo, presupuesto y proyecto |

Los responsables posibles son todas las cuentas de asesor y de gestor. Quien registra a un interesado desde el panel queda
como su responsable.

### Cuentas de asesor

`app.asesores` (variable `APP_ASESORES`) lista los códigos de asesor que el arranque crea si faltan, con la contraseña de
`APP_SEED_PASSWORD`; por omisión solo `asesor-01`. Ejemplo: `asesor-01,asesor-02`. No cambia la contraseña ni el rol de una
cuenta que ya existe; un código mal escrito detiene el arranque con un mensaje claro.

## 3. Revisor

Registra partidas (`#/casos/nueva`) con su origen, edita la partida, los planos (con su PDF) y los documentos del lote, cambia
el checklist y elimina partidas captadas. Ve los proyectos, pero no publica, no autoriza, no exporta y no ve interesados.

## 4. Especialista

Ve los expedientes y, solo si el gestor o el asesor le asignó la inspección, registra el avance y emite el informe técnico
(indicador B, seis pasos), firmado con los datos de su cuenta. Su número de colegiatura no está registrado: se registra al
asignar al profesional real. B nunca cambia A.

## 5. Propietario particular

En «Mis inmuebles» (`#/mis-inmuebles`) ve sus inmuebles (también en borrador) con indicadores, motivos y faltantes, y
autoriza o retira su publicación. No edita ni sube nada. Los inmuebles de la inmobiliaria no los autoriza él.

## 6. Comprador con cuenta

Ve los expedientes publicados, pide contacto con un motivo cerrado (información general, documentos o inspección) y solicita
la inspección B (S/ 250 referencial, sin pago en línea).

## 7. Indicadores, documentos y textos

- **Indicador A** (reglas `v0.5`): verde «Sin alertas en los campos evaluados», amarillo «Requiere revisión», rojo «Alerta
  prioritaria», gris «Información insuficiente». Siempre con texto e ícono, nunca solo color. Nadie lo fija a mano.
- **Ficha registral del inmueble** (PDF): elaborada por la inmobiliaria con su logo y la marca de agua «FICHA INFORMATIVA ·
  DOCUMENTO REFERENCIAL · SIN VALOR LEGAL»; no imita una copia literal de SUNARP.
- **Láminas y documentos del lote:** referenciales; el revisor o el asesor puede subir el PDF real.
- **Glosario:** 57 términos (versión `v0.5`).

## 8. Seguridad, privacidad y despliegue

- Contraseñas con BCrypt, sesión con token que caduca, bloqueo tras cinco intentos fallidos, permisos en el servidor.
- Archivos cifrados en disco (AES-256-GCM). Las descargas CSV van sin caché y con `nosniff`; un texto que empieza con `=`,
  `+`, `-` o `@` se antepone con un apóstrofo para que Excel no lo ejecute como fórmula.
- Interesados: solo nombre de pila y un medio de contacto, con consentimiento; se borran a pedido.
- Despliegue local (backend en `127.0.0.1:8080`) o en la nube con Docker (backend sin puertos publicados). En la nube,
  `APP_SEED_PASSWORD` debe ser una contraseña propia, no la de las pruebas.

## 9. Lo que no hace

Pagos en línea; simulador de crédito o tasas; mapas embebidos; IA u OCR; consultas en línea a SUNARP o a la municipalidad;
envío de correos o mensajes (el asesor contacta por fuera); contratos o firmas; certificar saneamiento o recomendar comprar.
El enlace de «Cómo llegar» lo pega una persona: el sistema comprueba que sea https, no que lleve al lugar correcto.
