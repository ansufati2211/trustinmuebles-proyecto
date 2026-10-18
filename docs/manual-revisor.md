# Manual del revisor

El revisor prepara y mantiene las partidas. Ve lo mismo que el comprador, más las herramientas de edición. El
servidor comprueba el rol en cada operación: la interfaz solo oculta lo que no corresponde.

## Editar una partida

1. Ingresa con una cuenta de revisor (por ejemplo `revisor-01`) y abre el caso.
2. Baja hasta «Editar partida».
3. Completa o corrige los **datos del predio**: condición representada, zona y oficina registral, ubicación, área, linderos,
   antecedente dominial, completitud del extracto, fecha referencial y nota. La fecha no vence ni consulta actualidad oficial.
4. Edita los **asientos**. Cada uno tiene un número que empieza con la letra de su rubro:
   - **C, títulos de dominio:** indica los titulares que resultan del asiento, por ejemplo «Rosa Elena Cárdenas Vilca (100 %)».
   - **D, gravámenes y cargas:** elige el tipo de acto (hipoteca, embargo, demanda…) y el estado, vigente o desconocido.
   - **E, cancelaciones:** elige el asiento D que cancela. Al guardar, ese gravamen figura cancelado.
   - **F, otros.**
   Cada asiento admite texto, número de título archivado y fechas de presentación e inscripción.
5. Pulsa **Guardar y recalcular**. El estado del semáforo se calcula con las reglas; **no se puede elegir el color**.

Dos datos se derivan solos y no se escriben:
- **La titularidad** es la del último asiento C. Sin asientos C queda «desconocido».
- **El estado de un gravamen** es cancelado cuando un asiento E lo cancela. Si quitas ese asiento E, el gravamen vuelve a
  figurar vigente.

Esto evita que el expediente se contradiga. El documento PDF se actualiza con cada cambio.

## Si algo falla

- **«No se guardó ningún cambio» con una lista de motivos:** corrige lo indicado. Nada se escribió. Por ejemplo, un asiento C
  sin titulares, un asiento D sin estado o una cancelación que apunta a un asiento que no existe.
- **«El expediente cambió mientras lo editaba»:** otra persona guardó antes. Recarga la página y repite el cambio.
- **«Su rol no permite esta operación»:** la sesión no es de revisor.

## Checklist

En la columna derecha cada ítem tiene un estado (pendiente, revisado u observado) y una observación opcional. Cambia lo
necesario y pulsa «Guardar ítem». El checklist no cambia el color del semáforo.

## Documento del caso

El sistema genera una **copia literal simulada** a partir de la partida: tiene rubros, asientos y títulos archivados, y lleva
marca de agua y un pie que dicen que es simulada. Se regenera cada vez que guardas.

Si prefieres usar un PDF propio, en «Documento PDF» elige uno de hasta 5 MB y pulsa «Asociar PDF». Desde ese momento el
sistema deja de regenerarlo y deberás mantenerlo tú. **No subas documentos con datos reales de personas o predios.**

## Reglas de trabajo

- No uses nombres, direcciones, números de partida ni documentos reales (RN-01). Las partidas llevan el prefijo `SIM-` para
  que no se confundan con las reales.
- Las reglas y el glosario son un borrador. No cambies su contenido sin pasar por la revisión especializada. Se editan en
  `trustinmuebles-backend/src/main/resources/contenido/v0.2/` y se cargan al arrancar.
- Si cambias reglas de forma que alteren resultados, crea una versión nueva: copia la carpeta `contenido/v0.2` a
  `contenido/v0.3` (reglas, glosario y casos van juntos), edita la copia y cambia `app.reglas.version=v0.3`. Al arrancar se
  recalculan todas las evaluaciones y cada una guarda con qué versión se calculó.
- No compartas las claves de respuesta del estudio con quien vaya a participar.

## Registrar una partida real

Ver [guia-transcripcion.md](guia-transcripcion.md). Resumen: busca el número en Expedientes; si no está, consulta la partida en
Conoce Aquí, pega el texto, revisa la vista previa sin nombres y confirma. Puedes eliminar una partida transcrita desde su página.
