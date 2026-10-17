# Manual del revisor

El revisor prepara y mantiene los casos sintéticos. Ve lo mismo que el comprador, más las herramientas de edición. El
servidor comprueba el rol en cada operación: la interfaz solo oculta lo que no corresponde.

## Editar un expediente

1. Ingresa con una cuenta de revisor (por ejemplo `revisor-01`) y abre el caso.
2. Baja hasta «Editar expediente».
3. Completa o corrige los campos:
   - **Condición representada** y **titularidad**: texto del caso. Si el extracto no informa un dato, escribe `desconocido`.
     Desconocido no equivale a «sin carga».
   - **Completitud del extracto**: completa, incompleta o desconocida.
   - **Fecha referencial**: no vence ni consulta actualidad oficial.
   - **Nota del extracto**: opcional, hasta 500 caracteres.
   - **Anotaciones**: referencia única (por ejemplo `B2`), estado (vigente, cancelada o desconocido) y descripción opcional.
     El estado no se repite en la descripción: se lee del dato.
4. Pulsa **Guardar y recalcular**. El estado del semáforo se calcula con las reglas; **no se puede elegir el color**.

## Si algo falla

- **«No se guardó ningún cambio» con una lista de motivos:** corrige lo indicado. Nada se escribió.
- **«El expediente cambió mientras lo editaba»:** otra persona guardó antes. Recarga la página y repite el cambio.
- **«Su rol no permite esta operación»:** la sesión no es de revisor.

## Checklist

En la columna derecha cada ítem tiene un estado (pendiente, revisado u observado) y una observación opcional. Cambia lo
necesario y pulsa «Guardar ítem». El checklist no cambia el color del semáforo.

## Documento del caso

En «Documento sintético (PDF)» elige un PDF de hasta 5 MB y pulsa «Asociar PDF». Si el caso ya tenía documento, se
reemplaza. **Debe ser un documento sintético, nunca uno real.** Cambiar el documento sube la versión del expediente.

## Reglas de trabajo

- No uses nombres, direcciones, números de partida ni documentos reales (RN-01).
- Las reglas y el glosario son un borrador. No cambies su contenido sin pasar por la revisión especializada. Se editan en
  `trustinmuebles-backend/src/main/resources/contenido/v0.1/` y se cargan al arrancar.
- Si cambias reglas de forma que alteren resultados, crea una versión nueva: copia la carpeta `contenido/v0.1` a
  `contenido/v0.2` (reglas, glosario y casos van juntos), edita la copia y cambia `app.reglas.version=v0.2`. Al arrancar se
  recalculan todas las evaluaciones y cada una guarda con qué versión se calculó.
- No compartas las claves de respuesta del estudio con quien vaya a participar.
