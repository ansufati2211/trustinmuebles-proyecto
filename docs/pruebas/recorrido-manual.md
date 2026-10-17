# Recorrido manual de la interfaz

Sirve para repetir a mano lo que cubre el recorrido automático, o para ejecutar ese recorrido. Requiere el backend y la
interfaz encendidos (ver el LEEME) y las dos cuentas de prueba.

## A mano

**Como comprador (`comprador-01`)**
1. Abrir `http://localhost:5173`. Debe verse el aviso fijo «Caso sintético con fines académicos. No certifica saneamiento
   ni recomienda comprar.» y la lista de lo que el MVP no hace.
2. Intentar abrir `#/casos` sin ingresar: debe llevar a la pantalla de login.
3. Ingresar. La lista debe mostrar cuatro partidas con su denominación: Parcona (verde), La Tinguiña (amarillo), Subtanjalla
   (gris) y el caso de práctica (gris). Cada estado debe tener texto y ninguna tarjeta debe decir «postest» ni «forma B».
4. Abrir La Tinguiña (`SIM-11052690`): estado amarillo, la alerta de hipoteca vigente, el panel «Partida registral simulada»
   con zona, ubicación, área y linderos, y los titulares en copropiedad.
5. En «Asientos de la partida» comprobar los rubros: títulos de dominio (C00001), gravámenes y cargas (D00001 hipoteca vigente y
   D00002 embargo cancelado) y cancelaciones (E00001, que indica que cancela el D00002). Abrir y cerrar un rubro con Enter.
6. Con la tecla Tab llegar a un término del glosario y abrirlo con Enter: debe mostrar la explicación y la versión.
7. Abrir Subtanjalla (`SIM-11061555`): gris, faltantes (titularidad y completitud), la alerta prioritaria de la anotación de
   demanda, «no se descartan otras alertas» y «No incluido en este extracto» en títulos de dominio.
8. Confirmar que no aparece el formulario de edición ni los selectores del checklist.
9. «Abrir documento» debe abrir la copia literal simulada en otra pestaña, con marca de agua y sin firma.

**Como revisor (`revisor-01`)**
1. Abrir La Tinguiña. Deben aparecer el formulario «Editar partida», los selectores del checklist y la carga de PDF.
2. Pulsar «Agregar asiento». Número `E00002`, tipo «Cancelación», asiento que cancela `D00001`, y un texto. Guardar: el estado pasa
   a verde. Quitar ese asiento y guardar de nuevo: vuelve a amarillo.
3. Borrar los titulares del asiento C00001 y guardar: debe mostrar «No se guardó ningún cambio» con el motivo.
4. Cambiar un ítem del checklist y guardarlo. Devolverlo a su valor anterior.
5. Abrir el documento tras guardar: debe reflejar los asientos nuevos, porque el sistema lo regenera.

## Automático

El script `recorrido-navegador.mjs` hace lo anterior en Chrome sin ventana. Usa `puppeteer-core`, que **no** es dependencia
del proyecto: se instala aparte.

```bash
mkdir /tmp/recorrido && cd /tmp/recorrido
cp <ruta-del-repo>/docs/pruebas/recorrido-navegador.mjs .
npm init -y && npm install puppeteer-core
E2E_PASSWORD=<contraseña de las cuentas de prueba> node recorrido-navegador.mjs
```

- Necesita Chrome en `/usr/bin/google-chrome-stable`. Si está en otra ruta, cambiar `executablePath` en el script.
- La variable opcional `PDF_PRUEBA` apunta a un PDF para probar la carga del documento. Se sube al caso de práctica.
- Deja las capturas en `shots/` junto al script.
- Devuelve el estado de cada verificación y termina con código distinto de cero si alguna falla.
- Deja los datos como estaban, salvo el documento del caso de práctica, que pasa a ser el PDF subido.
