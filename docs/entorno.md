# Entorno de desarrollo y pruebas

Datos reales del equipo donde se construyó y probó el MVP. Reemplazan los «por confirmar» de la Tabla 17 y la Tabla 49
del informe para este equipo. No se declara disponibilidad comercial ni escalabilidad de producción.

## Equipo

| Dato | Valor |
|---|---|
| Sistema operativo | CachyOS (Linux 7.2.7) |
| Procesador | Intel Core i5-10400, 2,90 GHz, 12 hilos |
| Memoria | 15 GiB |
| Navegador de prueba | Google Chrome 149.0.7827.200 |

## Versiones usadas

| Componente | Versión | Nota |
|---|---|---|
| Java (OpenJDK) | 21.0.12 | Requisito del backend |
| Maven | 3.10.0 | Lo descarga `./mvnw`; no hace falta instalar Maven |
| Spring Boot | 4.0.8 | Con Spring Modulith 2.0.8 y springdoc 3.0.3 |
| Hibernate ORM | 7.2.24 | |
| H2 | 2.4.240 | Base en archivo, modo PostgreSQL. Flyway la verificó solo hasta 2.3.232 y avisa en el arranque |
| Node.js | 20.20.2 | |
| pnpm | 9.15.9 | Se usa con `npx pnpm@9`, porque el pnpm del sistema exige Node 22 |
| React / React DOM | 19.2.4 | |
| Vite | 8.0.5 | |
| Tailwind CSS | 4.2.2 | |
| TypeScript | 5.9.3 | |

En este equipo el `npm` instalado (12.1.0) pide Node 22 o superior y avisa con Node 20; el `pnpm` del sistema se niega a
ejecutarse con Node 20. Todo funcionó con `npx pnpm@9`, y `npm` solo muestra el aviso.

## Diferencia con la configuración de referencia del informe

La sección 6.6.2 y la Tabla 49 proponen HTML/CSS con Bootstrap, JavaScript, Node.js con Express y MySQL. El equipo decidió
usar la base que ya existía, y el propio informe lo permite («si ya existe una base funcional diferente, cualquier ajuste se
documentará para evitar una migración innecesaria»). Ver [decisiones.md](decisiones.md), decisión D1.

| Elemento de la Tabla 49 | Referencia del informe | Lo que se usó |
|---|---|---|
| Interfaz | HTML/CSS, Bootstrap y JavaScript | React 19, Vite, Tailwind CSS y TypeScript |
| Backend | Node.js y Express | Java 21, Spring Boot 4, backend modular único |
| Persistencia | MySQL y archivos sintéticos | H2 en archivo y PDF sintéticos cifrados en disco |
| Entorno | Equipo local | Equipo local, solo en localhost |
| Repositorio | Git | Git |

## Lo que sigue sin confirmar

- Ejecución en un segundo equipo, que es lo que pide CP-07 para REQ-NF05. Todo se ejecutó en el equipo de arriba.
- Equipo y navegador que se usarán en la aplicación con participantes (6.1.4 y Tabla 17).
- Ruta y respaldo del almacenamiento de PDF fuera de este equipo.
- Condiciones de licencia a largo plazo de las dependencias. No se asume gratuidad permanente (Tabla 23).
- Horas del equipo, costos y fechas: siguen pendientes y no se inventan.
