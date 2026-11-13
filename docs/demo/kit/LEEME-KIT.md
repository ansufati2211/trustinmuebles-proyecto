# Kit de respaldo de la demostración (versión 1.0.0)

Todo lo que hace falta para mostrar la versión 1.0 en 15 minutos aunque no lleguen datos reales de la inmobiliaria. Los
pasos citados son los del [guion de 15 minutos](../GUION-DEMO.md). Ningún archivo contiene datos personales: los
titulares figuran como «Persona natural (datos reservados)» o como empresas inventadas, y los contactos usan correos
`@example.com`. No hay DNI, celulares ni números de colegiatura.

## Antes de presentar

1. Reiniciar la base: `scripts/reiniciar-demo.ps1`.
2. Arrancar backend e interfaz (ver el guion, «Antes de presentar»).
3. Verificar la precarga: `APP_SEED_PASSWORD=<clave> node scripts/preparar-demo.mjs`. Comprueba por la API los 4
   proyectos, los 15 interesados y las 4 citas precargadas; si algo falta lo carga (sin borrar nada) e imprime un resumen.
4. Si se borraron los PDF del kit, regenerarlos: `node scripts/generar-pdf-demo.mjs`.

## Archivos

| Archivo | Qué es | Paso del guion |
|---|---|---|
| [frases-asistente.md](frases-asistente.md) | 10 frases probadas para el asistente de búsqueda, con etiquetas, resultados y recomendaciones. La primera es la de la demo. | 1 |
| [datos-cita.md](datos-cita.md) | Lo que se escribe en el formulario «Solicitar cita» (nombre de pila `Carla`, correo `@example.com`, visita al lote). | 4 y 10 |
| [proyecto-nuevo-80-lotes.csv](proyecto-nuevo-80-lotes.csv) | 80 lotes en 8 manzanas para *Horizonte de Los Aquijes*, que viene sin lotes. La vista previa no marca errores. | 5 |
| [proyecto-con-errores.csv](proyecto-con-errores.csv) | 11 filas, 3 malas (filas 8, 10 y 12): la vista previa las marca y no deja confirmar. | 5 (opcional) |
| [partidas/INT-99000611-vivienda-sin-cargas.txt](partidas/INT-99000611-vivienda-sin-cargas.txt) | Texto para pegar de una vivienda de un particular, sin cargas. Nace en gris (sin planos) y queda en **verde** al subir sus 4 láminas. | 6 y 7 |
| [partidas/INT-99000612-lote-con-hipoteca.txt](partidas/INT-99000612-lote-con-hipoteca.txt) | Lote de la inmobiliaria con una hipoteca vigente. Con sus 4 documentos queda en **amarillo** (RV-02). | Respaldo |
| [partidas/INT-99000613-lote-con-embargo.txt](partidas/INT-99000613-lote-con-embargo.txt) | Lote de un particular con un embargo vigente. Con sus 4 documentos queda en **rojo** (RP-01). | Respaldo |
| `pdf/INT-99000611/plano-arquitectura.pdf`, `plano-estructuras.pdf`, `plano-electricas.pdf`, `plano-sanitarias.pdf` | Las 4 láminas de la vivienda, con cajetín de la inmobiliaria. | 7 |
| `pdf/INT-99000612/` y `pdf/INT-99000613/`: `plano-perimetrico.pdf`, `memoria-descriptiva.pdf`, `certificado-zonificacion.pdf`, `tasacion.pdf` | Los 4 documentos del lote de cada partida de respaldo. | Respaldo |
| [LEEME.md](LEEME.md) | Notas de las etapas 3b, 5 y 6 sobre el kit (se conservan). | — |

### Cómo se registran los textos de partida

Cuenta `asesor-01` → **Registrar** (`#/casos/nueva`):

| Campo | INT-99000611 | INT-99000612 | INT-99000613 |
|---|---|---|---|
| Origen de la partida | Registro interno de cartera | Registro interno de cartera | Registro interno de cartera |
| Número de partida | `INT-99000611` | `INT-99000612` | `INT-99000613` |
| Precio referencial en soles | `285000` | `40000` | `36000` |
| Denominación | `Mz. K Lote 9 · Urb. Los Viñedos de Ica · Ica` | `Mz. B Lote 14 · Hab. Urb. Las Dunas de Cachiche · Ica` | `Mz. C Lote 6 · Hab. Urb. Las Dunas de Cachiche · Ica` |
| Titularidad comercial | Particular | Inmobiliaria | Particular |
| Código de cuenta del propietario | `propietario-02` | (vacío) | `propietario-03` |
| Distrito | `Ica, Ica` | `Ica, Ica` | `Ica, Ica` |
| Texto de la partida → **Leer asientos** | el archivo completo | el archivo completo | el archivo completo |
| Tipo de predio | Vivienda; área construida inscrita `120` | Lote | Lote |
| Casilla de la vista previa | marcar | marcar | marcar |

Después, en el expediente, se sube cada PDF en su fila (láminas en «Planos», documentos en «Documentos del lote»). El
color lo calcula el motor de reglas; el kit solo aporta los datos. `KitDemoTest` (backend) y `lib/kit.test.ts`
(interfaz) comprueban que cada texto se lee sin avisos y da el color anunciado.

### Qué dicen los PDF

Todos llevan el encabezado «TRUSTINMUEBLES · INMOBILIARIA EN ICA», la marca de agua «REFERENCIAL», el pie «Documento
informativo elaborado por la inmobiliaria Trustinmuebles.» y la inmobiliaria como autor en sus metadatos. El de
zonificación se titula «Resumen de zonificación y vías» y aclara que el certificado lo emite la municipalidad; la tasación
es «referencial» y aclara que no la firma un perito. Ninguno lleva escudos, sellos, firmas, colegiaturas ni códigos de
verificación, ni se presenta como emitido por SUNARP, una municipalidad o un colegio profesional.
