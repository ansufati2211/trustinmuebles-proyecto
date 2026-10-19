# Decisiones de diseño y ajustes respecto del informe

Cada decisión indica qué sección del informe afecta y quién debe confirmarla. Ninguna se considera cerrada hasta que el
equipo y el docente la acepten.

## D1. Se usa el stack que ya existía

**Qué:** Spring Boot 4 y Java 21 en el backend, React 19 y Vite en la interfaz, H2 en archivo como base.
**Por qué:** el equipo ya tenía esa base funcional y decidió no rehacerla. La sección 6.6.2 lo contempla.
**Afecta:** 6.6.2, Tabla 49, Figura 11. **Confirma:** equipo y docente.

## D2. El producto se llama Trustinmuebles en el código

**Qué:** el informe lo llama InmoClaro. El código, la interfaz y los repositorios dicen Trustinmuebles, y se dejó así por
decisión del equipo.
**Afecta:** portada, título y todo el texto del informe. **Confirma:** equipo. Hay que unificar el nombre antes de entregar.

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
