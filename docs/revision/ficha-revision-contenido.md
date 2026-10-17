# Ficha de revisión de contenido (plantilla sin aplicar, Anexo 4)

**Esta ficha no acredita ninguna revisión.** No se incluyen nombres ni firmas de una validación que no se ha realizado.
Una vez revisada, el especialista la completa y el equipo conserva el original firmado fuera del repositorio.

Revisor y especialidad: ______  
Versión de reglas y glosario revisada: `v0.1`  
Fecha: ______

## Qué revisar y dónde está

Todo vive en `trustinmuebles-backend/src/main/resources/contenido/v0.1/`:

| Material | Archivo | Qué contiene |
|---|---|---|
| Casos sintéticos | `casos/B-01.json`, `B-02.json`, `B-03.json`, `DEMO-01.json` | Condición, titularidad, completitud, anotaciones, checklist y términos de cada caso |
| Reglas | `reglas.json` | Una regla de revisión (RV-01, anotación vigente) y la condición contemplada |
| Glosario | `glosario.json` | 13 términos con su explicación |

## Criterios (Tabla 35)

| Criterio | Aspecto por revisar | Observación / decisión |
|---|---|---|
| Exactitud | Datos y explicaciones no inducen conclusiones jurídicas indebidas. | Pendiente. |
| Claridad | Texto comprensible, sin doble lectura. | Pendiente. |
| Pertinencia | Cada elemento corresponde a su área y objetivo. | Pendiente. |
| Cobertura | El contenido cubre lo delimitado en 1.7 sin salirse. | Pendiente. |
| Comparabilidad | Los casos B reproducen la estructura de los A. | Pendiente. |

Decisión del revisor (aceptar / corregir / retirar): ______  
Cambios solicitados y respuesta del equipo: ______

## Decisiones que solo un especialista puede cerrar

1. **Tabla que distingue amarillo de rojo.** Hoy hay una sola regla (anotación vigente, amarilla) y ninguna prioritaria. No se
   clasifica la copropiedad ni la hipoteca como defecto por sí mismas. Falta definir qué condiciones son prioritarias, con
   entrada y salida esperadas para poder aprobar CP-05b.
2. **«El extracto no permite descartar otras anotaciones».** Hoy se trata como completitud incompleta y produce gris
   (decisión D6.1). Confirmar si es la lectura correcta.
3. **Anotaciones vigentes.** Confirmar que «vigente» merece amarillo y que no debe distinguirse según el tipo de anotación.
4. **Explicaciones del glosario.** Revisar que cada texto describa el escenario sin dar a entender una opinión jurídica.
5. **Condición contemplada.** Hoy solo «Lote urbano inscrito, según el escenario.» Cualquier otra condición produce gris.
6. **Precedencias combinadas** (decisiones D6.3 a D6.5): qué estado corresponde cuando coinciden una alerta, datos faltantes y
   una condición no contemplada.

Ver [../decisiones.md](../decisiones.md).
