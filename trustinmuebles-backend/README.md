# Trustinmuebles — Backend

API de Spring Boot 4 con Java 21 de Trustinmuebles (v0.7.0), el MVP académico del informe APF1: partidas simuladas de lotes y
viviendas urbanas de Ica con expediente, semáforo informativo (indicador A), expediente técnico de 4 planos, evaluación técnica
presencial (indicador B), glosario cerrado, checklist y, desde la v0.7, el ciclo de cartera: captación con propietario,
autorización, publicación, historial de evaluaciones, contacto del comprador, asignación de especialistas y panel del gestor. Todo el contenido es ficticio. **El semáforo no certifica saneamiento ni
recomienda comprar.**

## Arquitectura

Una sola aplicación con backend modular (Spring Modulith), dividida en 9 módulos. Cada módulo es un paquete con su API pública,
sus entidades y sus tablas. Se comunican por sus APIs públicas, y `ModularityTests` verifica que no haya ciclos ni accesos a clases internas.

| Módulo | Responsabilidad | Requisitos |
|---|---|---|
| `identidad` | Cuentas de prueba, roles COMPRADOR, REVISOR, ESPECIALISTA, GESTOR y PROPIETARIO, perfil profesional del especialista (`PerfilProfesional`), función del gestor, login con JWT, `SecurityConfig` | F01, NF03, M8 |
| `expediente` | Partidas simuladas con asientos por rubro, datos del predio (tipo, distrito, precio referencial), catálogo con filtros, expediente de 4 planos, edición transaccional, PDF con PDFBox (copia literal, láminas 2D e informe técnico), carga de contenido; propietario, autorización, publicación y visibilidad por rol (v0.7), API pública `CarteraCasos` | F02, F03, F07, NF04, M13 |
| `clasificacion` | Motor puro del semáforo, reglas versionadas, evaluación vigente e historial de evaluaciones de solo adición (v0.7) | F05, RN-02 a RN-06, I12 |
| `inspeccion` | Evaluación técnica presencial: solicitud del comprador con su cuenta y fecha, costo referencial, estados, verificación en campo e informe firmado desde la cuenta del especialista; asignación del especialista por el gestor (v0.7) | F08, RN-09, RN-10, M5, M8 |
| `cartera` | Solicitudes de contacto del comprador (motivos cerrados) y panel de cartera del gestor (v0.7) | I10, I11 |
| `checklist` | Ítems pendiente, revisado u observado, incluida la declaración jurada municipal (HR y PU) | F06, RN-07, M9 |
| `orientacion` | Glosario cerrado | F04 |
| `almacenamiento` | PDF cifrados (AES-256-GCM) en disco | F03 |
| `shared` | Errores comunes y hash | NF04 |

Dependencias: `expediente` usa a los demás módulos. `clasificacion`, `inspeccion`, `checklist` y `orientacion` guardan el id
del expediente por valor y no dependen de él. `inspeccion` usa la API pública de `identidad` (`AuthService.perfilProfesional`)
para firmar el informe, sin leer sus tablas. `inspeccion` nunca escribe en `clasificacion`: el informe técnico no cambia el
color del semáforo (RN-10). `cartera` usa las APIs públicas de `expediente` (`CarteraCasos`), `clasificacion`, `inspeccion` e
`identidad`, y ningún módulo depende de él; tampoco escribe en `clasificacion` (I8).

## Dos servicios diferenciados

| | Indicador A · pre-evaluación documental | Indicador B · evaluación técnica presencial |
|---|---|---|
| Qué evalúa | Partida registral (rubros C, D, E y F) y los 4 planos: existencia y coincidencia del área (margen de 1 %) | Estado físico real: estructuras, instalaciones eléctricas y sanitarias |
| Quién | El motor de reglas del módulo `clasificacion`, al guardar | Lo pide el COMPRADOR; lo emite el ESPECIALISTA en 6 pasos |
| Resultado | Verde, amarillo, rojo o gris, con motivos | No solicitada, solicitada, en inspección o informe emitido (favorable, con observaciones o con riesgo) |
| Costo | Incluido | S/ 250.00 (`app.inspeccion.costo-referencial`), sin pago en línea |

Nunca se mezclan: el indicador B no cambia el color del indicador A (RN-10, I2).

## Fuentes de información

Gratuitas: Conoce Aquí (SUNARP), de donde el revisor transcribe la partida, y el Visor Catastral BGR (SUNARP), que solo se
enlaza. Aportadas por el propietario o de pago: copia literal certificada, planos de las 4 especialidades, declaración jurada
municipal (HR y PU) e inspección presencial. No hay scraping ni conexión en línea con SUNARP, que no ofrece una API pública de
partidas.

## Ejecutar

Windows PowerShell:

```powershell
$env:APP_SEED_PASSWORD = 'elige-una-clave-de-prueba'
.\mvnw.cmd spring-boot:run      # H2 en .\data\h2, API en http://127.0.0.1:8080
.\mvnw.cmd test                 # 140 pruebas (v0.7)
```

bash, zsh o fish:

```bash
env APP_SEED_PASSWORD='elige-una-clave-de-prueba' ./mvnw spring-boot:run
./mvnw test
```

En la v0.7 son 140 pruebas (ejecución real del 25 de octubre de 2026): las 107 de la v0.6 más `CaptacionPublicacionTest` (11),
`HistorialEvaluacionTest` (9), `CarteraTest` (8), `CuentasDemoTest` (3), `MigracionV6Test` (1) y `CicloCarteraTest` (1). Las
pruebas usan H2 en memoria; `MigracionV6Test` y `CicloCarteraTest` crean su propia base nueva, sin tocar `data/`.

Swagger: `http://localhost:8080/swagger-ui.html`. La API está descrita en [../docs/api.md](../docs/api.md).

## Cuentas de prueba

| Cuenta | Rol | Puede |
|---|---|---|
| `comprador-01` | COMPRADOR | Consultar expedientes, glosario, checklist y documentos; solicitar la inspección técnica |
| `revisor-01` | REVISOR | Lo anterior, más editar partidas y planos, cambiar el checklist, subir PDF y registrar partidas transcritas |
| `especialista-01` | ESPECIALISTA | Consultar y emitir el informe técnico de una inspección solicitada. No edita partidas |
| `especialista-02` | ESPECIALISTA | Igual; perfil ficticio «Arq. Perfil Ficticio 02», Arquitecto, `SIM-CAP-0002` (v0.7) |
| `gestor-01` | GESTOR (asesor comercial) | Publicar y retirar casos, atender contactos, asignar inspecciones y consultar el panel (v0.7) |
| `propietario-01`, `propietario-02` | PROPIETARIO | Consultar solo sus casos y otorgar o retirar su autorización (v0.7) |

Todas usan la contraseña de `APP_SEED_PASSWORD`. Al arrancar se crea cada cuenta que falte, también en una base ya creada, sin
cambiar las que existen. El rol se verifica en el
servidor en cada ruta. Solo el comprador solicita la inspección (403 para los demás roles). La cuenta del especialista trae su
perfil profesional ficticio: Ing. Carlos Alberto Mendoza Quispe, Ingeniero Civil, CIP N.° 248910.

## Variables de entorno

| Variable | Uso |
|---|---|
| `APP_SEED_PASSWORD` | **Obligatoria cuando falta alguna cuenta** (primer arranque o base anterior a la v0.7). Contraseña (mínimo 8 caracteres) de las cuentas de prueba |
| `APP_JWT_SECRET` | Opcional. Reemplaza el secreto de desarrollo del token |
| `SPRING_DATASOURCE_URL` | Opcional. Cambia el archivo de base de datos (útil para empezar con una base nueva sin borrar nada) |

Otras propiedades en `src/main/resources/application.properties`: `app.reglas.version`, `app.seed.enabled`,
`app.storage.path`, `app.cors.allowed-origins` y `app.inspeccion.costo-referencial` (250.00 si no se define).

## Contenido versionado

Casos, reglas y glosario están en `src/main/resources/contenido/<versión>/` y se cargan al arrancar. La carga es idempotente: no
pisa lo que el revisor ya editó, y en una base ya creada completa lo que el contenido agregó después (distrito, precio
referencial e ítems de checklist nuevos). Al cambiar `app.reglas.version` se recalculan todas las evaluaciones. Todo el contenido está
rotulado como borrador pendiente de revisión especializada.

## Reglas de negocio

- **RN-02**: titularidad, condición y completitud son datos mínimos. `desconocido` no equivale a «sin carga».
- **RN-03 y RN-04**: con datos suficientes, rojo si hay regla prioritaria; si no, amarillo si hay regla de revisión; si no,
  verde. Con datos faltantes, gris, y las alertas conocidas siguen visibles. Una condición no contemplada da gris.
- **RN-05 (I1)**: verde significa exactamente «Sin alertas en los campos evaluados», nunca saneamiento.
- **RN-06**: el color se recalcula al guardar, con la versión de reglas registrada. No existe ruta para fijarlo.
- **RN-07**: solo el revisor modifica el expediente y el checklist.
- **RN-09**: la pre-evaluación documental no afirma el estado físico de la vivienda.
- **RN-10**: el informe técnico del especialista (indicador B) no cambia el color documental (indicador A).
- **v0.7 (I8 a I14)**: el color solo cambia al recalcular; un plano o PDF no levanta un rojo registral; publicar y contactar no
  dependen del color; sin nombres, DNI ni teléfonos; historial de solo adición; el propietario solo autoriza lo suyo; no se
  publica sin autorización vigente. Detalle en `../docs/decisiones.md` (D32 a D42).

## Migraciones

`V1` a `V5` (esquema hasta la v0.6), `V6` (roles nuevos, propietario, autorización y estado de publicación; deja publicados los
10 casos de una base existente), `V7` (historial de evaluaciones) y `V8` (contactos y asignación del especialista). Ninguna
migración anterior se editó.

Reglas v0.4 (tabla borrador, pendiente de revisión especializada). Sobre los asientos vigentes del rubro D: embargo,
anotación de demanda, medida cautelar y bloqueo dan rojo; hipoteca, carga técnica, servidumbre y otro acto dan amarillo. Los
gravámenes cancelados y la copropiedad no alertan. Sobre los planos de una vivienda: falta un plano de II.EE. o II.SS. (RV-04),
el área del plano arquitectónico no coincide con la inscrita (RV-05) o hay un plano observado (RV-06) dan amarillo; sin plano
arquitectónico o de estructuras, gris. En un lote los planos no aplican.

## Documento PDF

El sistema genera tres documentos con Apache PDFBox: la copia literal simulada de cada partida (`CopiaLiteralPdf`), una lámina
2D a escala por cada plano presentado (`LaminaPdf`) y el informe técnico del especialista (`InformeTecnicoPdf`). Todos llevan
marca de agua y pie aclaratorio en cada página, el prefijo `SIM-` en toda partida y título, y ningún logo, sello, firma ni código de
verificación. Para generar la copia literal desde un JSON fuera del sistema:

```bash
./mvnw -q compile org.codehaus.mojo:exec-maven-plugin:3.5.0:java \
    -Dexec.mainClass=pe.trustinmuebles.expediente.HerramientaCopiaLiteral \
    -Dexec.args="caso.json salida.pdf"
```
