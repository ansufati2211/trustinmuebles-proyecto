# Informe de funcionalidades para la demostración (v0.6.0)

Fuentes: `docs/RESUMEN-v0.6.md`, `docs/funcionalidades.md` y `LEEME.md`. Personas, precios, colegiatura y partidas son
**ficticios**. Lo marcado «por verificar» no figura en esos archivos o no se pudo confirmar con ellos.

## 1. Qué es

- Sistema de transparencia precompra de **una sola inmobiliaria de Ica**, que carga a mano su propia cartera de lotes y viviendas.
- Para el comprador: muestra la partida registral (simulada) y los planos, explica los términos y señala qué falta revisar.
- A pedido del comprador, registra una inspección técnica presencial hecha por un especialista.
- **No** certifica saneamiento, **no** recomienda comprar, **no** consulta fuentes oficiales y **no** reemplaza asesoría legal.
- Es un MVP académico de uso local: backend Spring Boot 4 (Java 21, 8 módulos) y frontend React 19.

## 2. Modelo de negocio

Una inmobiliaria de Ica con cartera propia, sin scraping de otros portales y sin APIs públicas (SUNARP no ofrece una).

| | Indicador A · pre-evaluación documental | Indicador B · evaluación técnica presencial |
|---|---|---|
| Qué revisa | Partida (rubros C, D, E, F) y los 4 planos: existencia y coincidencia de área (margen 1 %) | Estado físico: estructuras, instalaciones eléctricas y sanitarias |
| Quién | Motor de reglas, automático al guardar | Lo pide el comprador; lo emite el especialista en 6 pasos |
| Resultado | Verde, amarillo, rojo o gris, con motivos | No solicitada, solicitada, en inspección o informe emitido (favorable, con observaciones o con riesgo) |
| Costo | Incluido | Referencial **S/ 250.00**, sin pasarela de pago; se coordina con la inmobiliaria |

**Por qué son independientes (RN-10):** A mide lo que dicen los documentos y B lo que se ve en campo. Un informe técnico nunca
cambia el color de A (invariante I2, con prueba automática). El detalle de cada uno de los 6 pasos: por verificar (estos archivos
solo dicen que son 6).

| Fuentes gratuitas | Aportadas por el propietario o de pago |
|---|---|
| Conoce Aquí (SUNARP): texto de la partida, que el revisor transcribe | Copia literal certificada (SUNARP, con costo) |
| Visor Catastral BGR (SUNARP): ubicación, solo enlazada | Planos de las 4 especialidades |
| | Declaración jurada municipal (HR y PU) |
| | Inspección presencial del especialista (costo referencial) |

| Cuenta | Rol | Puede |
|---|---|---|
| `comprador-01` | Comprador | Consultar cartera y expedientes; **único** que solicita la inspección |
| `revisor-01` | Revisor | Lo anterior salvo solicitar; edita partidas y planos, cambia el checklist, sube PDF, registra partidas transcritas |
| `especialista-01` | Especialista | Consultar y emitir el informe técnico; no edita partidas. Firma como Ing. Carlos Alberto Mendoza Quispe, Ingeniero Civil, CIP N.° 248910 (ficticio) |

## 3. Mejoras v0.5.1 → v0.6.0

| Aspecto | Antes (v0.5.1) | Ahora (v0.6.0) |
|---|---|---|
| Datos del predio | Sin distrito ni precio en la base | Tipo de inmueble, distrito, área, área construida y precio referencial «dato simulado» (migración V5) |
| M5 · solicitud | No se guardaba quién solicitaba | Solo el comprador (403 a otros roles); se guardan cuenta y fecha; una sola vez por caso (409); costo S/ 250.00 |
| M8 · firma del informe | Nombre y colegiatura llegaban en el formulario | Salen de la cuenta autenticada; lo que mande el cliente se ignora |
| M9 · checklist | Sin ítem municipal | «Declaración Jurada Municipal (HR y PU)» en los 10 casos: 4 revisados, 4 observados, 2 pendientes |
| M13 · filtros | Sin filtros en el catálogo | Tipo, indicador A, indicador B y «con riesgo físico», combinables, en el servidor y en la URL |
| Interfaz e imágenes | Capturas v0.5 en `docs/pruebas/evidencias/capturas/` (detalle: por verificar) | Catálogo comercial, ilustraciones SVG propias (sin imágenes externas), modal accesible, semáforo con contraste AA |
| Verde | «Sin alertas detectadas en los campos evaluados» | «Sin alertas en los campos evaluados» (I1) |
| Documentación | Glosario citado con 32 términos; reglas v0.2 en `api.md` | 48 términos; reglas v0.4; arranque en PowerShell; invariantes I1–I7; decisiones D23–D31 |
| Pruebas | 92 backend + 12 frontend = 104 | 107 backend + 33 frontend = **140**, compilación limpia y recorrido 39/39 |

Cifras de pruebas según la última ejecución registrada (19 de octubre de 2026).

## 4. Guion de demo de 8 minutos

**Antes de clase:** apaga el backend, borra `trustinmuebles-backend/data/` y arráncalo con `APP_SEED_PASSWORD`. La solicitud
es **una sola vez por caso**: sin base nueva, el paso 7 da 409. El caso de la solicitud es `SIM-11075836` (Pueblo Nuevo, rojo,
B «No solicitada»); Pachacútec ya está «En inspección» y no sirve para solicitar.

| # | Min | Cuenta | Clic | Frase |
|---|---|---|---|---|
| 1 | 0:00 | — | Abrir `http://localhost:5173`, inicio | «Es el sistema de una inmobiliaria de Ica con cartera propia. No certifica saneamiento ni recomienda comprar.» |
| 2 | 0:45 | — | Bajar a los 4 pasos y a las fuentes | «Dos indicadores separados y fuentes declaradas: gratuitas y de pago. Sin scraping ni APIs inexistentes.» |
| 3 | 1:30 | `comprador-01` | Ingresar → «Explorar Cartera de Inmuebles» | «Cada tarjeta tiene precio rotulado como dato simulado y los dos indicadores, con ícono y texto.» |
| 4 | 2:15 | comprador | Filtrar A = Amarillo; luego B = Informe emitido; «Limpiar filtros» | «Los filtros se combinan, los resuelve el servidor y quedan en la URL.» |
| 5 | 3:00 | comprador | Abrir `SIM-11098467` (Pachacútec) → planos → comparador de áreas | «El plano dice 98 m² y la partida 72 m²: más de 1 % de diferencia, por eso A es amarillo (RV-05).» |
| 6 | 3:45 | comprador | Checklist: ítem HR y PU observado | «El PU declara 72 m² y no incluye la ampliación. El checklist no cambia el color.» |
| 7 | 4:15 | comprador | Abrir `SIM-11075836` → «Solicitar inspección técnica» → confirmar en el modal | «Costo referencial S/ 250.00, sin pago en línea. Queda la cuenta solicitante y la fecha.» |
| 8 | 5:15 | `especialista-01` | Mismo caso → llenar fecha, 4 verificaciones y conclusiones → emitir con riesgo | «No escribo mi nombre ni CIP: el servidor los toma de mi cuenta. Son datos ficticios.» |
| 9 | 6:30 | especialista | Ver la cabecera del caso | «B dice informe con riesgo y A sigue en rojo: B nunca cambia A (RN-10).» |
| 10 | 7:00 | `revisor-01` | Abrir `SIM-11081204` (Santiago, B no solicitada) | «El revisor no ve el botón de solicitar; aunque llame a la API, el servidor responde 403.» |
| 11 | 7:30 | — | Pie de página | «Verde solo significa sin alertas en los campos evaluados. Preguntas.» |

Cómo mostrar el 403 en vivo (Swagger en `/swagger-ui.html` con el token del revisor): por verificar. Respaldo: la prueba
`CatalogoYServiciosTest.soloElCompradorSolicita`.

## 5. Preguntas probables del profesor

1. **¿Por qué 9 viviendas y 1 lote?** El contenido y las pruebas fijan esas casas como viviendas (RV-04, declaratoria de
   fábrica). Cambiarlas rompía reglas, pruebas y los casos del estudio (decisión D23).
2. **¿Por qué no hay API de SUNARP?** SUNARP no ofrece una API pública de partidas y copiar portales incumple sus condiciones.
   El revisor consulta Conoce Aquí a mano y transcribe sin datos personales.
3. **¿Qué significa el verde?** Exactamente «Sin alertas en los campos evaluados». No es saneamiento ni aval de compra; solo
   que las reglas versionadas no encontraron alertas en lo que se evaluó.
4. **¿Por qué B no cambia A?** Miden cosas distintas: documentos frente a estado físico. Mezclarlos ocultaría alertas
   documentales; está fijado por RN-10 y la invariante I2, con prueba.
5. **¿Por qué H2?** Es un MVP de uso local: H2 en archivo no exige instalar una base de datos y el backend escucha solo en
   `127.0.0.1` (I6). No está pensado para un servidor en red.
6. **¿Qué es ficticio?** Las 10 partidas (`SIM-`), personas, empresas, montos, precios, el especialista y su CIP, y las
   láminas de planos. Las partidas transcritas son reales pero sin datos personales y no se guardan en el repositorio.

## 6. Limitaciones y desfases del Word

| Tema | Situación |
|---|---|
| CIP N.° 248910 | No lleva `SIM-`; verificar que no pertenezca a un ingeniero real o cambiarlo |
| Bases v0.5 | Migran, pero sus informes conservan el profesional anterior; borrar `data/` para la demo |
| I7 (rótulos simulados) | Solo se comprueba con el recorrido de navegador, no con `pnpm test` |
| Capturas | Las de `capturas/` siguen siendo de la v0.5; las nuevas están en `capturas-v06/` |
| Accesibilidad | Sin prueba con lector de pantalla ni en navegadores distintos de Chrome |
| Pendientes del proyecto | Revisión especializada de reglas y glosario, aprobación del asesor de D20 y D21, CP-07 en otro equipo |
| Word: requisitos v0.6 | Datos del predio, M5, M8, M9 y M13 aún no figuran en `APF1_TRUSTInmub_.docx` |
| Word 1.7 (alcance) | El sistema ya registra inspecciones con costo referencial y tiene filtros simples; el texto exacto de 1.7: por verificar |
| Word 4.3 | Contenido y desfase: por verificar |
| Word: actor Especialista | Rol activo en el sistema (emite informes firmados desde su cuenta); cómo figura en el Word: por verificar |
| Word: glosario | El sistema tiene 48 términos (v0.4); si el Word dice 32, está desfasado (por verificar) |
| Word: H2 y 8 módulos | El sistema usa H2 en archivo y 8 módulos de Spring Modulith; lo que dice el Word: por verificar |
