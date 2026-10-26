# Registro de cambios por entregable

Formato de 6.2.3: entregable, responsable principal, apoyo, revisor y estado. El responsable principal es el de la
asignación inicial de la Tabla 4. La rotación, la aceptación y el revisor las registra el equipo: **esta tabla no afirma
que nadie haya revisado ni aceptado nada**.

**Autoría real:** el código, las pruebas y estos documentos los generó Claude Code a pedido del equipo, en una sola
sesión. Los nombres de la tabla indican quién debe responder por cada frente según la Tabla 4, no quién lo escribió.
El equipo debe confirmar o corregir esa asignación y revisar el trabajo antes de darlo por aceptado.

Estados: *entregado en borrador* = existe y se probó técnicamente, falta la aceptación del equipo.

| Entregable | Frente (Tabla 4) | Responsable principal inicial | Apoyo | Revisor | Estado |
|---|---|---|---|---|---|
| Esquema de base de datos y módulos del backend | Backend y datos | Ariel Alexander Mendoza Legua | Por asignar | Por asignar | Entregado en borrador, con 55 pruebas |
| Motor de clasificación, reglas v0.2 (borrador) y persistencia | Backend y datos | Ariel Alexander Mendoza Legua | Gabriel Alexis Daniel Yllescas Quispe (contenido) | Especialista, por confirmar | Reglas pendientes de revisión especializada |
| Pantallas, glosario por selección y edición del revisor | Interfaz y orientación | Jesús Oswaldo Torres Rojas | Por asignar | Por asignar | Entregado en borrador, con 38 verificaciones de navegador |
| Manuales del comprador y del revisor | Interfaz y orientación | Jesús Oswaldo Torres Rojas | Por asignar | Por asignar | Entregado en borrador |
| Partidas simuladas, glosario y claves (contenido v0.2) | Arquitectura y negocio, con Metodología | Jhojan Ramiro Junes del Pozo | Gabriel Alexis Daniel Yllescas Quispe | Especialista, por confirmar | Pendiente de revisión especializada |
| Documentación de arquitectura, decisiones y trazabilidad | Arquitectura y negocio | Jhojan Ramiro Junes del Pozo | Por asignar | Docente | Entregado en borrador |
| Formas A y B, claves, bases vacías y fichas del estudio | Metodología y evaluación | Gabriel Alexis Daniel Yllescas Quispe | Por asignar | Especialista, por confirmar | Borrador sin validar; carpeta `estudio/` fuera del repositorio |
| Piloto, reclutamiento y aplicación | Metodología y evaluación | Gabriel Alexis Daniel Yllescas Quispe | Equipo | Docente | No iniciado |

## Cómo registrar un cambio nuevo

Agrega una fila o actualiza el estado, con la fecha y el commit. Si el cambio toca el alcance de 1.7, antes debe haber una
revisión formal (PA1). Los cambios de contenido de reglas y glosario pasan por la revisión especializada.

## Historial de la rama `mvp-informe-apf1`

| Commit | Cambio |
|---|---|
| `d29910c` | Retiro de módulos excluidos e infraestructura fuera de alcance |
| `9e91f13` | Esquema y contenido v0.1 |
| `a546946` | Backend: identidad, expedientes, clasificación, checklist y glosario |
| `07ec86a` | Frontend: casos, expediente, glosario por teclado y edición del revisor |
| `9ccfeab` | Carga de PDF desde la interfaz del revisor y medición de REQ-NF02 |
| `c1bb783` | Documentación del MVP |
| `18fc803` | Prueba desde un clon limpio para CP-07 y REQ-NF05 |

## v0.3

Partidas transcritas de Conoce Aquí: búsqueda por número, registro por el revisor con limpieza de datos personales, eliminación
y PDF de transcripción. Cierra además la v0.2.1 (tono de servicio real). Pendiente: aprobación del asesor (RN-01 y PA2).

## v0.4

Respuesta a EXP2: expediente técnico de planos (4 especialidades), doble indicador (documental y técnico), evaluación técnica
presencial con informe del especialista, rol ESPECIALISTA, reglas RV-04 a RV-06 y contenido v0.3. Pendiente: aprobación del asesor
y revisión especializada de las reglas nuevas.

## v0.5

10 expedientes (6 nuevos) con copia literal más fiel, láminas de planos a escala con la geometría de cada caso e informe técnico en PDF.
Ver D22. Pendiente: revisión especializada del contenido y de las reglas.

## v0.5.1

Sincronización con EXP2: el nombre es Trustinmuebles en el código, la documentación y el informe Word (D2). La página de inicio
muestra el modelo de una sola inmobiliaria, el cuadro de fuentes gratuitas y de pago y los dos indicadores (A documental y B
técnico, RN-10). LEEME y el README del backend se pusieron al día: 3 cuentas, 8 módulos, 104 pruebas, planos e inspección como
funcionalidades implementadas.

## v0.6.0

Interfaz comercial para el comprador y mejoras M5, M8, M9, M10 y M13 (rama `feature/v0.6-ui-comercial`):
- Backend (`01a7361`): migración V5 con distrito, precio referencial, perfil del especialista y solicitante; solicitud solo del
  comprador con costo referencial; informe firmado desde la cuenta del especialista; ítem HR y PU; filtros del catálogo.
- Sistema visual (`39a08db`): tokens, componentes base (TopBar, Footer, Badge, IndicadorA, IndicadorB, Modal, PredioImagen) e
  ilustraciones SVG propias.
- Pantallas (`bafb740`): inicio con el modelo en 4 pasos y la transparencia de fuentes, catálogo con filtros en la URL y detalle
  con planos, comparador de áreas, visor modal e indicador B completo.
- Documentación (M10): LEEME, README del backend, funcionalidades, API, trazabilidad y decisiones D23 a D31.
Ver `docs/RESUMEN-v0.6.md`.

## v0.7.0 «Ciclo de cartera»

Rama `feature/v0.7-ciclo-cartera`, en dos sesiones. Ver `docs/RESUMEN-v0.7.md`.

| Fase | Commit | Cambio |
|---|---|---|
| F0 | `56c001f` | Versión 0.7.0 del backend; línea base de 107 pruebas |
| F1 | `5f822f0` | Roles GESTOR y PROPIETARIO, cuentas nuevas, migración V6, autorización del propietario, publicación del gestor y visibilidad por rol (122 pruebas) |
| F2 | `e0d41fd` | Historial de evaluaciones de solo adición (V7), origen de cada recálculo y `GET /casos/{codigo}/historial` (131 pruebas) |
| F3 | `c2ea59c` | Módulo `cartera`: contacto con motivos cerrados, asignación de especialista, `especialista-02` y panel de cartera (V8; 139 pruebas) |
| F6 | `9c23269` | `CicloCarteraTest`, ciclo completo con base propia (140 pruebas) |
| F7 (sesión 1) | `4836955` | Resumen y pendientes del backend |
| F4 | `35291ad` | Interfaz: vistas Cartera y Mis inmuebles, publicación, autorización, asignación, historial, contacto, navegación por rol, cuentas nuevas en el login y rótulos de datos simulados en un solo lugar (60 pruebas de Vitest) |
| F5 | `0a17f2f` | Documentación: modelo de negocio, hipótesis de valor, hoja de ruta, I7 redefinida, API, trazabilidad, funcionalidades y README |
| F7 (sesión 2) | este commit | Resumen final y pendientes: backend 140/140, frontend 60/60, build correcto |

Pendiente: verificación en navegador de las vistas nuevas, aprobación de los supuestos D32 a D49 y revisión del informe.
