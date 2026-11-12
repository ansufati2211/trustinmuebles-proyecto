# Kit de la demostración: frases para el asistente de búsqueda

Diez frases probadas en el catálogo público (`#/inmuebles` → «Asistente de búsqueda») con la base precargada recién
reiniciada (`scripts/reiniciar-demo.ps1`): 260 inmuebles publicados. Se escriben tal cual en el campo del asistente y se
pulsa **Buscar**. Para cada una se indica qué etiquetas aparecen en «Entendí», cuántos inmuebles muestra el catálogo y qué
recomienda el asistente.

Las recomendaciones salen de la primera página de resultados (24 inmuebles, en el orden pedido). Si la base cambió (por
ejemplo, después de cargar el CSV del proyecto *Horizonte de Los Aquijes* o de marcar lotes como separados), los conteos y
los lotes recomendados pueden ser otros; las etiquetas no cambian.

| # | Frase | Etiquetas («Entendí») | Resultados | Qué recomienda |
|---|---|---|---|---|
| 1 | `lote en Subtanjalla de menos de 50 mil soles` | Lotes o terrenos · En Subtanjalla · Hasta S/ 50,000 | 56 | Lotes de Altos de Ventisca (Mz. C Lote 12 y 13, S/ 36,000, 144 m²): indicador A verde de la partida matriz, disponibles, el menor precio y precio por m² entre los más bajos. |
| 2 | `busco un terreno de al menos 150 m2 para negocio` | Lotes o terrenos · Al menos 150 m² · Para negocio | 153 | Lotes con zonificación CV de Horizonte de Los Aquijes (Mz. G, 153 m²): «Su zonificación (CV) suele permitir: tienda, bodega, restaurante u oficina». |
| 3 | `casa en Ica hasta 300 mil` | Casas · En Ica · Hasta S/ 300,000 | 1 | La única casa que cumple: Mz. M Lote 6, Los Laureles del Sur (S/ 260,000), con el motivo «Está disponible». |
| 4 | `lote entre 30 y 45 mil, el más barato` | Lotes o terrenos · Entre S/ 30,000 y S/ 45,000 · Más barato primero | 232 | Lotes de Terrazas de Sauzal a S/ 32,000 con 160 m²: el menor precio, la mayor área de la página y S/ 200 por m². |
| 5 | `casa sin problemas` | Casas · Sin alertas en documentos (indicador A verde) | 1 | Mz. F Lote 7, Santa Elvira (Parcona): «La revisión de sus documentos no encontró alertas (indicador A verde)». |
| 6 | `lote para casa en Terrazas de Sauzal, lo más grande` | Lotes o terrenos · Proyecto Terrazas de Sauzal · Más grande primero · Para casa | 68 | Los lotes de 230 m² de la Mz. F: la mayor área y una zonificación que suele permitir vivienda. |
| 7 | `lote de 8 x 20 para alquilar` | Lotes o terrenos · Al menos 160 m² · Para alquilar | 135 | Lotes de Horizonte de Los Aquijes: dos CV de 180 m² («locales comerciales para alquilar») y uno RDM de 166 m² («departamentos para alquilar»). |
| 8 | `terreno hasta 20 mil dólares` | Lotes o terrenos · Hasta US$ 20,000 | 1 | La parcela de Cerro Purmacana (Supe), con precio base en dólares. Su indicador A es gris, así que el único motivo es «Está disponible». |
| 9 | `lote en Ventisca a menos de 300 soles el m2` | Lotes o terrenos · Proyecto Altos de Ventisca · Hasta S/ 300 por m² | 56 | Los mismos lotes de la Mz. C de la frase 1: el proyecto se reconoce por una sola palabra de su nombre. |
| 10 | `hola, quiero información` | — | — | No la entiende: muestra «No entendí qué buscas…» y botones con búsquedas de ejemplo (Lotes, Casas, Lotes para casa, Lotes para negocio, Lo más barato, Sin alertas en documentos y dos proyectos). Al pulsar uno, busca con esa frase. |

## Qué mostrar con ellas

- **Quitar etiquetas:** en la frase 1, quitar «Hasta S/ 50,000» con su ✕. El catálogo se amplía y las recomendaciones se
  recalculan. Los filtros del panel de abajo cambian a la par, porque son los mismos.
- **Sin resultados:** `terreno sin problemas en La Tinguiña` se entiende (tres etiquetas), pero hoy no hay ningún lote con
  el indicador A en verde en ese distrito. El asistente lo dice y sugiere quitar alguna etiqueta. Al quitar «Sin alertas en
  documentos» aparecen los 45 lotes publicados del distrito (Rinconada del Lúcumo).
- **Solicitar cita:** al final del asistente, «Solicitar cita» abre el formulario de la etapa 4 sin la opción «Visita al
  lote» (no hay un lote elegido todavía). La zona, el tipo, el presupuesto y el área de la búsqueda llegan a la bandeja de
  Interesados. Para la demostración, usar un nombre de pila y un correo `@example.com`.
- **Usos del lote:** desde una recomendación, «Ver la ficha». Un lote RDM o CV muestra «Usos que suelen permitirse», y uno
  sin zonificación (por ejemplo, Mz. E Lote 2 de Altos de Ventisca) muestra «consulta los parámetros». Los dos casos llevan
  el aviso «Verifica el certificado de parámetros urbanísticos de la municipalidad antes de comprar».

El asistente funciona con reglas sobre el texto: no usa inteligencia artificial ni envía la frase a ningún servicio
externo.
