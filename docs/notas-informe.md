# Notas para actualizar el informe con evidencia real

El PDF del informe no se modificó. Esta lista dice qué secciones cambian ahora que existe una implementación, y qué no.
Todo lo que sigue pendiente debe seguir marcado como pendiente.

## Cambios que el equipo debe decidir y aplicar

| Sección | Qué dice hoy | Qué corresponde |
|---|---|---|
| Portada, título y todo el texto | InmoClaro | El código se llama Trustinmuebles (decisión D2). Unificar el nombre antes de entregar |
| 6.6.2 y Tabla 49 | HTML/CSS con Bootstrap, JavaScript, Node.js con Express, MySQL | React 19 con Vite y Tailwind, Java 21 con Spring Boot 4, H2 en archivo. El informe ya permite documentar el ajuste (decisión D1) |
| Figura 11 | «Backend modular único: Acceso · Expedientes · Reglas · Glosario · Checklist» | Sigue siendo válida. Los módulos reales son `identidad`, `expediente`, `clasificacion`, `checklist`, `orientacion` y `almacenamiento` |
| 6.1.4 y 6.6.1 | Equipo y configuración «por confirmar» | Ver [entorno.md](entorno.md) |
| Tabla 17 | «Características por registrar» | Equipo local: Intel i5-10400, 12 hilos, 15 GiB. Falta el equipo de aplicación |
| Tabla 49 | «Dato por confirmar» | Versiones reales en [entorno.md](entorno.md) |
| Tabla 51, H2 y H3 | Pendiente | Hay evidencia técnica: 55 pruebas y 38 verificaciones de navegador. Poner «probado técnicamente, pendiente de aceptación» |
| Tabla 51, H1, H4 y H5 | Pendiente | Siguen pendientes. H1 requiere la revisión especializada |
| Tabla 44 | Todas pendientes | Ver [pruebas/registro.md](pruebas/registro.md): CP-05b ejecutado con la tabla borrador v0.2 y pendiente de revisión especializada, CP-07 pendiente |
| Tabla 8, REQ-NF02 | Meta propuesta | Medido: 20 de 20 en 2 s o menos, máximo 93 ms, solo API |
| Tabla 10, estado de los casos de prueba | «Pendiente de ejecución» | Actualizar con el registro de pruebas |
| Tabla 21 y 22 (T1) | MVP funcional local: «pasa pruebas» | T1 se cumple técnicamente. T2 sigue pendiente |

## Partidas transcritas (v0.3): requieren aprobación del asesor

| Sección | Qué dice hoy | Qué corresponde |
|---|---|---|
| RN-01, PA2 | Solo casos sintéticos | La plataforma admite partidas transcritas de Conoce Aquí (SUNARP), sin datos de personas naturales. Es un desvío: decidir si se acepta o se revierte |
| 1.8 | Sin datos reales | Ajustar: hay datos de partidas reales, sin nombres, DNI, estado civil ni domicilios |
| 1.7 | Sin integraciones estatales | No cambia: no hay conexión automática. Se transcribe a mano. Ver D20 |
| Referencias | — | D.S. 016-2024-JUS (arts. 11 y 133.7), Res. 064-2023-SUNARP/SN y Res. 00066-2025-SUNARP/SN (Conoce Aquí) |

## Lo que no cambia

- Alcance (1.7), limitaciones (1.8), hipótesis, diseño preexperimental y plan de análisis.
- Los capítulos V (pretest) siguen pendientes de datos reales. No hay participantes, respuestas ni resultados.
- Validez, confiabilidad (KR-20) y consentimiento: sin evidencia todavía.
- Fechas, horas, presupuesto y recursos (Tabla 23).

## Observaciones sobre el instrumento (Anexo 3), para la revisión

1. Las claves del Anexo 3.C eran idénticas en las formas A y B y seguían el ciclo A, B, C en 10 de 12 ítems. En las formas
   rehechas (carpeta `estudio/`) las claves difieren en los 12 ítems y no siguen un ciclo, pero la correcta ocupa cada posición
   exactamente 4 veces por forma. El Anexo 3 del informe debe actualizarse con las formas nuevas.
2. Varios ítems piden localizar un dato literal del caso. Evaluar si miden comprensión o solo localización.
3. En la forma B el sistema muestra la respuesta casi directa para varios ítems (titular, estado de un gravamen). Considerar
   si eso mide comprensión asistida o solo lectura del panel.
4. El informe dice que el MVP no entrega claves. Las claves están fuera del repositorio (carpeta `estudio/`).

## Referencias

No se añadieron fuentes nuevas. Las dependencias del software no se citan como antecedentes. Si el informe cita Spring,
React u otras, conviene hacerlo con su documentación oficial y fecha de consulta.
