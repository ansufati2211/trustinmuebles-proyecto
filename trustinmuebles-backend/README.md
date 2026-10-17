# Trustinmuebles — Backend

API de Spring Boot 4 con Java 21 para el MVP académico del informe APF1: casos sintéticos de lotes urbanos con expediente,
semáforo informativo, glosario cerrado y checklist. Todo el contenido es ficticio. **El semáforo no certifica saneamiento ni
recomienda comprar.**

## Arquitectura

Una sola aplicación con backend modular (Spring Modulith). Cada módulo es un paquete con su API pública, sus entidades y sus
tablas. Se comunican por sus APIs públicas, y `ModularityTests` verifica que no haya ciclos ni accesos a clases internas.

| Módulo | Responsabilidad | Requisitos |
|---|---|---|
| `identidad` | Cuentas de prueba, roles COMPRADOR y REVISOR, login con JWT, `SecurityConfig` | F01, NF03 |
| `expediente` | Partidas simuladas con asientos por rubro, edición transaccional, copia literal en PDF (PDFBox), carga de contenido | F02, F03, NF04 |
| `clasificacion` | Motor puro del semáforo, reglas versionadas, evaluación vigente | F05, RN-02 a RN-06 |
| `checklist` | Ítems pendiente, revisado u observado | F06, RN-07 |
| `orientacion` | Glosario cerrado | F04 |
| `almacenamiento` | PDF cifrados (AES-256-GCM) en disco | F03 |
| `shared` | Errores comunes y hash | NF04 |

Dependencias: `expediente` usa a los demás módulos. `clasificacion`, `checklist` y `orientacion` guardan el id del
expediente por valor y no dependen de él.

## Ejecutar

```bash
env APP_SEED_PASSWORD='elige-una-clave-de-prueba' ./mvnw spring-boot:run   # H2 en ./data/h2, API en http://127.0.0.1:8080
./mvnw test                                                                 # 55 pruebas
```

Swagger: `http://localhost:8080/swagger-ui.html`. La API está descrita en [../docs/api.md](../docs/api.md).

## Variables de entorno

| Variable | Uso |
|---|---|
| `APP_SEED_PASSWORD` | **Obligatoria en el primer arranque.** Contraseña (mínimo 8 caracteres) de `comprador-01` y `revisor-01` |
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

Reglas v0.2 (tabla borrador, pendiente de revisión especializada), sobre los asientos vigentes del rubro D:
embargo, anotación de demanda, medida cautelar y bloqueo dan rojo; hipoteca, carga técnica, servidumbre y otro acto dan
amarillo. Los gravámenes cancelados y la copropiedad no alertan.

## Documento PDF

El sistema genera una copia literal simulada de cada partida con Apache PDFBox (`CopiaLiteralPdf`). Lleva marca de agua y
pie aclaratorio en cada página, el prefijo `SIM-` en toda partida y título, y ningún logo, sello, firma ni código de
verificación. Para generar un PDF desde un JSON fuera del sistema:

```bash
./mvnw -q compile org.codehaus.mojo:exec-maven-plugin:3.5.0:java \
    -Dexec.mainClass=pe.trustinmuebles.expediente.HerramientaCopiaLiteral \
    -Dexec.args="caso.json salida.pdf"
```
