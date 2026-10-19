# Registro de pruebas

Cada fila guarda entrada, salida esperada, salida obtenida, versión y fecha (4.16.5). Todas las pruebas se ejecutaron el
2026-10-17, con las reglas **v0.2** (borrador) y sobre el código de la rama `mvp-informe-apf1`. Los nombres de prueba son
métodos de `trustinmuebles-backend/src/test/java/pe/trustinmuebles/`.

Resumen: **82 pruebas automatizadas del backend en verde**, **12 pruebas del frontend (vitest)**, **66 verificaciones de navegador en verde**, medición de
rendimiento con 20 de 20 ejecuciones dentro de la meta. Salidas completas en [evidencias/](evidencias/).

Las partidas son: Parcona `SIM-11048217` (debe dar verde), La Tinguiña `SIM-11052690` (amarillo), Subtanjalla `SIM-11061555`
(gris con alerta prioritaria) y Los Aquijes `SIM-11070419` (gris, sin copia literal).

| Caso | Entrada / acción | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|
| CP-01 | Credenciales válidas y erróneas; peticiones sin sesión; edición por el comprador; token de otro emisor; cinco fallos seguidos; intento de registro | Acceso válido; 401 sin sesión; 403 al comprador; 401 con token ajeno; 429 al sexto intento; sin registro abierto; contraseña con hash BCrypt | Los 8 casos de `SeguridadTest` pasan y el caso no cambia tras los intentos | Aprobado |
| CP-02 | Abrir cada partida; listar; código inexistente y con ruta maliciosa | Cada código devuelve sus datos; 404 si no existe; listado ordenado con 4 casos; los textos no delatan el estudio | `cadaCodigoDevuelveSusDatos`, `sinRastrosDelEstudio` pasan. Rendimiento: 20 de 20 ejecuciones en 2 s o menos, máximo 93 ms (solo API) | Aprobado |
| CP-03 | Guardar y releer; campos inválidos; enumeración inválida; fecha irreal; área negativa; referencia y rubro inválidos; asiento repetido; versión vieja; reglas de la partida; JSON roto | Lo guardado persiste y sube la versión; las entradas inválidas dan 400 con un mensaje claro y la versión vieja da 409, sin registros parciales | `guardarPersiste`, `entradaInvalidaNoGuarda`, `versionVieja`, `NormalizadorAsientosTest` pasan; el caso es idéntico a la instantánea previa | Aprobado |
| CP-04 | Consultar términos y mensajes; glosario global; intento de escribir en el glosario | Términos con versión y estado «pendiente de revisión»; límite visible; el glosario no se edita | `glosario` pasa. En el navegador el término se abre con Enter y los rubros se despliegan con teclado | Aprobado. Contenido sin revisar |
| CP-05a | Parcona: hipoteca cancelada y datos completos | VERDE con alcance limitado, sin afirmar saneamiento | `parconaVerde` y `MotorClasificacionTest.verde` pasan | Aprobado |
| CP-05b | Embargo vigente; hipoteca vigente; demanda y medida cautelar vigentes; gravamen cancelado; copropiedad | ROJO con RP-01; AMARILLO con RV-02; ROJO con RP-02; sin alerta si está cancelado o hay copropiedad; alertas prioritarias primero | `embargoVigenteDaRojo`, `tinguinaAmarillo`, `MotorClasificacionTest` pasan con la **tabla borrador v0.2** | **Ejecutado con tabla borrador, pendiente de revisión especializada**: no se aprueba hasta que un especialista revise qué tipos de acto dan rojo |
| CP-05c | Subtanjalla: extracto parcial sin títulos de dominio y anotación de demanda vigente | GRIS, alerta prioritaria RP-02 visible, «no se descartan otras alertas» | `subtanjallaGrisConservaAlerta`, `grisConservaAlertas` pasan | Aprobado |
| CP-05d | Condición no contemplada; registrar la cancelación de la hipoteca en La Tinguiña | GRIS; recálculo de AMARILLO a VERDE con la versión v0.2 | `condicionNoContemplada`, `cancelarLaHipotecaRecalcula`, `colorNoSeFijaAMano` pasan | Aprobado |
| CP-06 | El revisor y el comprador cambian un ítem; ítem de otro caso; estado inválido | Solo el revisor cambia y persiste; 403, 404 y 400 en los demás casos; el color no cambia | `checklistSoloRevisor`, `checklistValidaPertenenciaYEstado` pasan | Aprobado |
| CP-07 | Instalar y ejecutar con las instrucciones del LEEME en un entorno documentado | Flujo reproducible; incidencias registradas | Desde un clon limpio del repositorio, en el **mismo equipo**: 55 pruebas del backend en verde, el frontend instala con `--frozen-lockfile` y compila, y el backend arranca con una base nueva, carga las 4 partidas con sus estados y sirve la copia literal en PDF. 0 archivos de `node_modules`, `data`, `dist` o `.env` rastreados | **Parcial**: falta otro equipo, que es lo que pide CP-07 |
| Documentos | Copia literal generada: estructura, marca y pie en cada página; sin firma, sello, código de verificación ni imágenes; extracto parcial; regeneración al guardar; PDF propio; falso PDF, SVG y archivo de 6 MB | Estructura registral; simulado en cada página; 201, 422, 422 y 413 donde corresponde | `CopiaLiteralPdfTest` (6), `documentoDelCaso`, `documentoDelExtractoParcial`, `documentoGeneradoSeRegenera`, `subirDocumento` pasan. El 413 se comprobó a mano con `curl` en la versión anterior, porque MockMvc no aplica el límite del contenedor | Aprobado |
| Estructura | Límites entre módulos | Sin ciclos ni accesos a clases internas | `ModularityTests` (2 pruebas) pasan | Aprobado |

## Verificación de navegador

38 verificaciones en Chrome 149 en modo headless, con el backend y la interfaz reales. Cubren: aviso fijo, inicio sin
promesas comerciales, redirección a login, listado sin rastros del estudio, estado con texto, partida con zona, ubicación,
área y linderos, rubros con sus asientos, titulares en copropiedad, permisos por rol, glosario y rubros por teclado, apertura
del PDF autenticado, edición con recálculo al registrar una cancelación, error de validación del servidor, restauración,
checklist y carga de PDF. Salida y capturas en `evidencias/`. El script es `pruebas/recorrido-navegador.mjs` (ver
[recorrido-manual.md](recorrido-manual.md)). Los PDF generados están en `evidencias/pdf-generados/`.

## Lo que estas pruebas no demuestran

- No demuestran mejora de comprensión. OE1 a OE3 solo se evalúan con el instrumento del estudio.
- No validan el contenido jurídico de las reglas, el glosario ni la redacción registral de los documentos.
- No comprueban que el documento sea fiel a una copia literal real: se hizo a partir de fuentes públicas y del conocimiento
  del equipo, y no se tuvo una copia oficial a la vista.
- No cubren lectores de pantalla ni otros navegadores distintos de Chrome.
- No cubren más de un usuario concurrente ni condiciones de producción.
