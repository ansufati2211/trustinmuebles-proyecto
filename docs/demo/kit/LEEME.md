# Kit de la demostración: carga masiva de lotes

Dos archivos CSV para mostrar la carga masiva en vivo. Se usan en el proyecto **Horizonte de Los Aquijes**, que viene sin lotes.
No contienen datos personales.

| Archivo | Qué muestra |
|---|---|
| `proyecto-nuevo-80-lotes.csv` | 80 lotes en 8 manzanas. La vista previa no marca errores; al confirmar, los lotes aparecen en el catálogo y en la página del proyecto. |
| `proyecto-con-errores.csv` | 11 filas, 3 malas: fila 8 con área negativa, fila 10 con un estado inválido y fila 12 con un lote repetido. La vista previa las marca y no deja confirmar: no se guarda nada. |

Pasos: ingresar como asesor (o gestor) → Cartera → «Proyectos y carga de lotes por CSV» → Horizonte de Los Aquijes →
«Cargar lotes (CSV)» → elegir el archivo → revisar la vista previa → confirmar.

Para repetir la demostración desde cero, reiniciar la base (`scripts/reiniciar-demo.ps1`).

## Asistente de búsqueda (etapa 5)

`frases-asistente.md` reúne 10 frases probadas para el asistente del catálogo, con las etiquetas, los resultados y lo que
recomienda cada una, y una frase que no entiende, que muestra los botones de ayuda.

## Registro interno de cartera (etapa 6)

Para registrar en vivo un inmueble que la inmobiliaria tiene en su cartera sin partida transcrita, elegir el origen
**«Registro interno de cartera»** y escribir el código con el prefijo **`INT-`** y ocho dígitos: **`INT-99000404`** (el
texto para pegar está en el paso 1 de [GUION-DEMO.md](../GUION-DEMO.md)). El prefijo anterior `SIM-` se sigue aceptando,
pero ya no se usa en el kit. El caso queda rotulado «Registro interno de cartera» y su PDF es la «Ficha registral del
inmueble», elaborada por la inmobiliaria.

En el portal público, la ficha del inmueble muestra la partida parcialmente oculta (`INT-••••`) y permite abrir sin
sesión la ficha registral, las láminas y los documentos del lote; el informe técnico pide ingresar.
