# Recorrido manual de la interfaz

Sirve para repetir a mano lo que cubre el recorrido automático, o para ejecutar ese recorrido. Requiere el backend y la
interfaz encendidos (ver el LEEME) y las dos cuentas de prueba.

## A mano

**Como comprador (`comprador-01`)**
1. Abrir `http://localhost:5173`. Debe verse el aviso fijo «Caso sintético con fines académicos. No certifica saneamiento
   ni recomienda comprar.» y la lista de lo que el MVP no hace.
2. Intentar abrir `#/casos` sin ingresar: debe llevar a la pantalla de login.
3. Ingresar. La lista debe mostrar B-01 (verde), B-02 (amarillo), B-03 (gris) y DEMO-01 (gris). Cada estado debe tener texto.
4. Abrir B-02: estado amarillo, motivo y alerta B2, límite, fecha referencial con su advertencia.
5. Con la tecla Tab llegar a un término del glosario y abrirlo con Enter: debe mostrar la explicación y la versión.
6. Abrir B-03: gris, faltantes (titularidad y completitud), alerta B4 y «no se descartan otras alertas».
7. Confirmar que no aparece el formulario de edición ni los selectores del checklist.
8. «Abrir documento» debe abrir el PDF sintético en otra pestaña.

**Como revisor (`revisor-01`)**
1. Abrir B-02. Deben aparecer el formulario de edición, los selectores del checklist y la carga de PDF.
2. Cambiar B2 a «Cancelada» y pulsar «Guardar y recalcular»: el estado pasa a verde. Volver a «Vigente» y guardar.
3. Borrar la titularidad y guardar: debe mostrar «No se guardó ningún cambio» con el motivo.
4. Cambiar un ítem del checklist y guardarlo. Devolverlo a su valor anterior.

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
- La variable opcional `PDF_PRUEBA` apunta a un PDF para probar la carga del documento. Conviene usar el PDF del mismo caso.
- Deja las capturas en `shots/` junto al script.
- Devuelve el estado de cada verificación y termina con código distinto de cero si alguna falla.
- Deja los datos como estaban: restaura la anotación y el ítem que modifica.
