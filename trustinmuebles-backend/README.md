# Trustinmuebles — Backend

API de Spring Boot 4 con Java 21 de Trustinmuebles (v0.6.0), el MVP académico del informe APF1: partidas simuladas de lotes y
viviendas urbanas de Ica con expediente, semáforo informativo (indicador A), expediente técnico de 4 planos, evaluación técnica
presencial (indicador B), glosario cerrado y checklist. Todo el contenido es ficticio. **El semáforo no certifica saneamiento ni
recomienda comprar.**

## Arquitectura

Una sola aplicación con backend modular (Spring Modulith), dividida en 8 módulos. Cada módulo es un paquete con su API pública,
sus entidades y sus tablas. Se comunican por sus APIs públicas, y `ModularityTests` verifica que no haya ciclos ni accesos a clases internas.

| Módulo | Responsabilidad | Requisitos |
|---|---|---|
| `identidad` | Cuentas de prueba, roles COMPRADOR, REVISOR y ESPECIALISTA, login con JWT, `SecurityConfig` | F01, NF03 |
| `expediente` | Partidas simuladas con asientos por rubro, expediente de 4 planos, edición transaccional, PDF con PDFBox (copia literal, láminas 2D e informe técnico), carga de contenido | F02, F03, F07, NF04 |
| `clasificacion` | Motor puro del semáforo, reglas versionadas, evaluación vigente | F05, RN-02 a RN-06 |
| `inspeccion` | Evaluación técnica presencial: solicitud, estados, verificación en campo e informe del especialista | F08, RN-09, RN-10 |
| `checklist` | Ítems pendiente, revisado u observado | F06, RN-07 |
| `orientacion` | Glosario cerrado | F04 |
| `almacenamiento` | PDF cifrados (AES-256-GCM) en disco | F03 |
| `shared` | Errores comunes y hash | NF04 |

Dependencias: `expediente` usa a los demás módulos. `clasificacion`, `inspeccion`, `checklist` y `orientacion` guardan el id
del expediente por valor y no dependen de él. `inspeccion` nunca escribe en `clasificacion`: el informe técnico no cambia el
color del semáforo (RN-10).

## Ejecutar

```bash
env APP_SEED_PASSWORD='elige-una-clave-de-prueba' ./mvnw spring-boot:run   # H2 en ./data/h2, API en http://127.0.0.1:8080
./mvnw test                                                                 # 92 pruebas
```

Swagger: `http://localhost:8080/swagger-ui.html`. La API está descrita en [../docs/api.md](../docs/api.md).

## Cuentas de prueba

| Cuenta | Rol | Puede |
|---|---|---|
| `comprador-01` | COMPRADOR | Consultar expedientes, glosario, checklist y documentos; solicitar la inspección técnica |
| `revisor-01` | REVISOR | Lo anterior, más editar partidas y planos, cambiar el checklist, subir PDF y registrar partidas transcritas |
| `especialista-01` | ESPECIALISTA | Consultar y emitir el informe técnico de una inspección solicitada. No edita partidas |

Las tres cuentas usan la contraseña de `APP_SEED_PASSWORD` y se crean solo cuando la base está vacía. El rol se verifica en el
servidor en cada ruta.

## Variables de entorno

| Variable | Uso |
|---|---|
| `APP_SEED_PASSWORD` | **Obligatoria en el primer arranque.** Contraseña (mínimo 8 caracteres) de las tres cuentas |
| `APP_JWT_SECRET` | Opcional. Reemplaza el secreto de desarrollo del token |
| `SPRING_DATASOURCE_URL` | Opcional. Cambia el archivo de base de datos (útil para empezar con una base nueva sin borrar nada) |

Otras propiedades en `src/main/resources/application.properties`: `app.reglas.version`, `app.seed.enabled`,
`app.storage.path`, `app.cors.allowed-origins`.

## Contenido versionado

Casos, reglas y glosario están en `src/main/resources/contenido/<versión>/` y se cargan al arrancar. La carga es idempotente: no
pisa lo que el revisor ya editó. Al cambiar `app.reglas.version` se recalculan todas las evaluaciones. Todo el contenido está
rotulado como borrador pendiente de revisión especializada.

## Reglas de negocio

- **RN-02**: titularidad, condición y completitud son datos mínimos. `desconocido` no equivale a «sin carga».
- **RN-03 y RN-04**: con datos suficientes, rojo si hay regla prioritaria; si no, amarillo si hay regla de revisión; si no,
  verde. Con datos faltantes, gris, y las alertas conocidas siguen visibles. Una condición no contemplada da gris.
- **RN-05**: verde significa «sin alertas detectadas en los campos evaluados», nunca saneamiento.
- **RN-06**: el color se recalcula al guardar, con la versión de reglas registrada. No existe ruta para fijarlo.
- **RN-07**: solo el revisor modifica el expediente y el checklist.
- **RN-09**: la pre-evaluación documental no afirma el estado físico de la vivienda.
- **RN-10**: el informe técnico del especialista (indicador B) no cambia el color documental (indicador A).

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
