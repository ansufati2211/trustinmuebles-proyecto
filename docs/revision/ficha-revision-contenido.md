# Ficha de revisión de contenido (plantilla sin aplicar, Anexo 4)

**Esta ficha no acredita ninguna revisión.** No se incluyen nombres ni firmas de una validación que no se ha realizado.
Una vez revisada, el especialista la completa y el equipo conserva el original firmado fuera del repositorio.

Revisor y especialidad: ______  
Versión de reglas y glosario revisada: `v0.2`  
Fecha: ______

## Qué revisar y dónde está

Todo vive en `trustinmuebles-backend/src/main/resources/contenido/v0.2/`:

| Material | Archivo | Qué contiene |
|---|---|---|
| Casos simulados | `casos/SIM-11048217.json`, `SIM-11052690.json`, `SIM-11061555.json`, `SIM-11070419.json` | Datos del predio y asientos por rubro de cada partida, checklist y términos |
| Reglas | `reglas.json` | Seis reglas por tipo de acto (tres prioritarias y tres de revisión) y la condición contemplada |
| Glosario | `glosario.json` | 32 términos con su explicación y algunas referencias normativas |
| Documento PDF | `CopiaLiteralPdf.java` (plantilla) y `docs/pruebas/evidencias/pdf-generados/` | Redacción y estructura de la copia literal simulada |

## Criterios (Tabla 35)

| Criterio | Aspecto por revisar | Observación / decisión |
|---|---|---|
| Exactitud | Datos y explicaciones no inducen conclusiones jurídicas indebidas. | Pendiente. |
| Claridad | Texto comprensible, sin doble lectura. | Pendiente. |
| Pertinencia | Cada elemento corresponde a su área y objetivo. | Pendiente. |
| Cobertura | El contenido cubre lo delimitado en 1.7 sin salirse. | Pendiente. |
| Comparabilidad | Los casos de la forma B reproducen la estructura de los de la forma A. | Pendiente. |

Decisión del revisor (aceptar / corregir / retirar): ______  
Cambios solicitados y respuesta del equipo: ______

## Decisiones que solo un especialista puede cerrar

1. **Tabla que distingue amarillo de rojo (v0.2).** Es un borrador activo: embargo, anotación de demanda, medida cautelar y
   bloqueo vigentes dan rojo; hipoteca, carga técnica, servidumbre y otro acto vigente dan amarillo. Confirmar cada
   clasificación y la prioridad. Para aprobar CP-05b hace falta una tabla revisada con entradas y salidas esperadas.
2. **La hipoteca vigente da amarillo, no rojo.** Se decidió así para no tratarla como defecto por sí misma. Confirmar.
3. **Un gravamen cancelado no alerta.** Confirmar que no debe quedar ninguna señal.
4. **«El extracto no permite descartar otras anotaciones».** Se trata como completitud incompleta y produce gris, aunque haya una
   alerta prioritaria (decisiones D6.1 y D6.3). Confirmar si es la lectura correcta.
5. **Condición contemplada.** Solo «Lote urbano inscrito, según el escenario.» Cualquier otra condición produce gris.
6. **Precedencias combinadas** (D6.3 a D6.5): qué estado corresponde cuando coinciden una alerta, datos faltantes y una
   condición no contemplada.
7. **Redacción registral de los documentos.** Revisar que los asientos, los títulos archivados y las fórmulas («Por escritura
   pública de fecha…», «Se cancela…») sean razonables para una partida real, sin que parezcan oficiales.
8. **Orden de los rubros.** Se numeran solo los asientos C a F; la descripción y el antecedente van sin letra porque las fuentes
   discrepan en A y B (D15). Confirmar el orden oficial.
9. **Normas citadas en el glosario** (D17): confirmar que los artículos y la ley estén bien citados.
10. **Nombres.** Confirmar que ninguna persona, empresa ni habilitación del contenido coincide con una real.

Ver [../decisiones.md](../decisiones.md).
