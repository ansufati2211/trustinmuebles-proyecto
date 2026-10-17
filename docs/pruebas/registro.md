# Registro de pruebas

Cada fila guarda entrada, salida esperada, salida obtenida, versión y fecha (4.16.5). Todas las pruebas se ejecutaron el
2026-10-17, con las reglas **v0.1** y sobre el código del commit indicado más los cambios del día. Los nombres de prueba
son métodos de `trustinmuebles-backend/src/test/java/pe/trustinmuebles/`.

Resumen: **35 pruebas automatizadas del backend en verde**, **26 verificaciones de navegador en verde**, medición de
rendimiento con 20 de 20 ejecuciones dentro de la meta. Salidas completas en [evidencias/](evidencias/).

| Caso | Entrada / acción | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|
| CP-01 | Credenciales válidas y erróneas; peticiones sin sesión; edición por el comprador; token de otro emisor; cinco fallos seguidos; intento de registro | Acceso válido; 401 sin sesión; 403 al comprador; 401 con token ajeno; 429 al sexto intento; sin registro abierto; contraseña con hash BCrypt | Los 8 casos de `SeguridadTest` pasan y el contenido del caso no cambia tras los intentos | Aprobado |
| CP-02 | Abrir cada código; listar; código inexistente y con ruta maliciosa | Cada código devuelve sus datos; 404 si no existe; listado ordenado con 4 casos | `cadaCodigoDevuelveSusDatos` pasa. Rendimiento: 20 de 20 ejecuciones en 2 s o menos, máximo 76,6 ms (solo API) | Aprobado |
| CP-03 | Guardar y releer; campos inválidos; enumeración inválida; fecha irreal; referencia repetida; versión vieja; JSON roto | Lo guardado persiste y sube la versión; las entradas inválidas dan 400 y la versión vieja da 409, sin registros parciales | `guardarPersiste`, `entradaInvalidaNoGuarda`, `versionVieja` pasan; el caso es idéntico a la instantánea previa | Aprobado |
| CP-04 | Consultar términos y mensajes; glosario global; intento de escribir en el glosario | Términos con versión y estado «pendiente de revisión»; límite visible; el glosario no se edita | `glosario` pasa. En el navegador el término se abre con Enter y `aria-expanded` pasa a `true` | Aprobado. Contenido sin revisar |
| CP-05a | B-01, sin condición de alerta | VERDE con alcance limitado, sin afirmar saneamiento | `b01Verde` y `MotorClasificacionTest.verde` pasan | Aprobado |
| CP-05b | Regla prioritaria con anotación vigente | Precedencia: ROJO sobre AMARILLO | `amarilloYRojoPorPrecedencia` pasa, pero con una **regla ficticia** creada solo dentro del test | **Ejecutado, pendiente de sustento**: falta la tabla jurídica revisada |
| CP-05c | B-03: datos faltantes y alerta B4 vigente | GRIS, alerta B4 visible, «no se descartan otras alertas» | `b03GrisConservaAlerta`, `grisConservaAlertas`, `faltantesGanaAPrioritaria` pasan | Aprobado |
| CP-05d | Condición no contemplada; cancelar B2 en B-02 | GRIS; recálculo a VERDE con la versión v0.1 | `condicionNoContemplada`, `cambioValidoRecalcula`, `colorNoSeFijaAMano` pasan | Aprobado |
| CP-06 | El revisor y el comprador cambian un ítem; ítem de otro caso; estado inválido | Solo el revisor cambia y persiste; 403, 404 y 400 en los demás casos; el color no cambia | `checklistSoloRevisor`, `checklistValidaPertenenciaYEstado` pasan | Aprobado |
| CP-07 | Instalar y ejecutar con las instrucciones del LEEME en un entorno documentado | Flujo reproducible; incidencias registradas | Desde un clon limpio del repositorio, en el **mismo equipo**: 35 pruebas del backend en verde, el frontend instala con `--frozen-lockfile` y compila, y el primer arranque sin `APP_SEED_PASSWORD` se detiene con un mensaje claro y funciona al repetirlo con la variable. Sin archivos sin versionar de por medio (0 archivos de `node_modules`, `data` ni `dist` rastreados) | **Parcial**: falta otro equipo, que es lo que pide CP-07 |
| Documentos | PDF válido, falso PDF, SVG, archivo de 6 MB, descarga por el comprador | 201, 422, 422, 413, 200 con cabeceras seguras | `subirDocumento` y `documentoDelCaso` pasan. El 413 se comprobó a mano con `curl`, porque MockMvc no aplica el límite del contenedor | Aprobado |
| Estructura | Límites entre módulos | Sin ciclos ni accesos a clases internas | `ModularityTests` (2 pruebas) pasan | Aprobado |

## Verificación de navegador

26 verificaciones en Chrome 149 en modo headless, con el backend y la interfaz reales. Cubren: aviso fijo, inicio sin
promesas comerciales, redirección a login, listado, estado con texto, permisos por rol, glosario por teclado, apertura del
PDF autenticado, edición con recálculo, error de validación, checklist y carga de PDF. Salida y capturas en
`evidencias/`. El script es `pruebas/recorrido-navegador.mjs` (ver [recorrido-manual.md](recorrido-manual.md)).

## Línea base previa a los cambios

Antes de adaptar el código: 30 pruebas del backend en verde y el build del frontend correcto
(`evidencias/linea-base-*.txt`). Esas pruebas correspondían al sistema anterior y se reemplazaron.

## Lo que estas pruebas no demuestran

- No demuestran mejora de comprensión. OE1 a OE3 solo se evalúan con el instrumento del estudio.
- No validan el contenido jurídico de las reglas ni del glosario.
- No cubren lectores de pantalla ni otros navegadores distintos de Chrome.
- No cubren más de un usuario concurrente ni condiciones de producción.
