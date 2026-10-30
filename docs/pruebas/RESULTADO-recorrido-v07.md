# Resultado del recorrido de la v0.7

Fecha: 2026-10-30. Commit: `1982f7e`. Chrome sin ventana, base H2 nueva, 15 de 15 pasos correctos.
Script: `docs/pruebas/recorrido-v07.mjs`. Capturas: `docs/pruebas/capturas-v07/`.

| Paso | Cuenta | Esperado | Obtenido | Resultado | Captura |
|---|---|---|---|---|---|
| 1 | revisor-01 | Registra SIM-99000404 con origen simulado y propietario-02; queda en borrador | borrador y sin autorización; fuente «Partida simulada para demostración», sintético; propietario-02; A = AMARILLO; precio referencial S/ 150,000; la pantalla dice «Sin autorización del propietario» | OK | `01-registro-borrador.png` |
| 2 | comprador-01 | No ve el borrador en el catálogo ni por URL | catálogo con 10 casos; SIM-99000404 ausente del catálogo; por URL: «No encontramos este expediente»; servidor: 404 | OK | `02-comprador-no-ve-borrador.png` |
| 3 | propietario-01 | No ve el caso de otro propietario | ausente de Mis inmuebles; por URL: «No encontramos este expediente»; servidor: 404 | OK | `03-propietario-ajeno.png` |
| 4 | gestor-01 | No puede publicar sin autorización | sin botón «Publicar»; aviso de autorización pendiente; servidor: 422 | OK | `04-gestor-sin-autorizacion.png` |
| 5 | propietario-02 | Autoriza su caso | el caso aparece en Mis inmuebles; autorización vigente; sigue en borrador hasta que el gestor publique | OK | `05-propietario-autoriza.png` |
| 6 | revisor-01 | Ve el indicador A y el historial | A: Amarillo en pantalla; historial visible; origen «Partida simulada incorporada»; 1 entrada | OK | `06-revisor-a-e-historial.png` |
| 7 | revisor-01 | Subsana en el caso nuevo y aparece una entrada nueva en el historial | 2 entradas; AMARILLO → VERDE; la entrada anterior se conserva; la pantalla muestra la entrada nueva | OK | `07-subsanacion.png` |
| 8 | gestor-01 | Publica y A no cambia | publicado; A idéntico: VERDE | OK | `08-gestor-publica.png` |
| 9 | comprador-01 | Ve el caso, abre SIM-11048217 (planos y glosario) y en SIM-11075836 pide contacto e inspección | SIM-99000404 en el catálogo; precio visible en la tarjeta; planos con su lámina; glosario visible; término «Albañilería confinada» abierto; contacto registrado; inspección solicitada; A sigue en rojo; la pantalla dice «Pendiente de asignación por el gestor» | OK | `09-comprador-consulta.png` |
| 10 | gestor-01 | Marca atendido el contacto y asigna especialista-02 | contacto en la bandeja; contacto atendido; asignada a especialista-02 | OK | `10-gestor-atiende-asigna.png` |
| 11 | especialista-01 | No puede emitir: la inspección es de otro | sin formulario de informe; aviso «asignada a otro especialista»; servidor: 403 | OK | `11-especialista-no-asignado.png` |
| 12 | especialista-02 | Emite el informe y SIM-11075836 sigue en rojo | informe emitido; firma: Arq. Perfil Ficticio 02; A = ROJO; credencial «Perfil ficticio de demostración» | OK | `12-especialista-emite.png` |
| 13 | gestor-01 | El panel de cartera refleja el recorrido | 11 casos; 11 publicados; 3 verdes; 0 contactos pendientes; 2 inspecciones: 1 asignada, 1 sin asignar; la pantalla muestra ambas asignaciones | OK | `13-panel-cartera.png` |
| 14 | propietario-02, comprador-01 | Retira la autorización y el caso sale del catálogo | retirado y sin autorización; A no cambia: VERDE; fuera del catálogo; por URL: no encontrado | OK | `14-retira-autorizacion.png` |
| 15 | todas | El pie muestra los límites legales en todas las pantallas y el login dice que es entorno demostrativo | pie en /casos/nueva (revisor-01); sin imágenes externas en /casos/nueva; pie en /cartera (gestor-01); sin imágenes externas en /cartera; pie en /mis-inmuebles (propietario-01); sin imágenes externas en /mis-inmuebles; pie en /casos/SIM-11048217 (especialista-01); sin imágenes externas en /casos/SIM-11048217; pie en /casos (comprador-01); sin imágenes externas en /casos; pie en la landing; login: «Entorno académico demostrativo» | OK | `15-pie-y-login.png` |

**Errores de JavaScript en la consola:** ninguno.

## Ejecuciones

Esta tabla es la de la **segunda ejecución**. La primera dio 12 de 15 por dos defectos del script, no del sistema:

| Paso en FALLA | Causa | Corrección en el script |
|---|---|---|
| 9, precio en la tarjeta | La comparación no normalizaba el espacio de no separación que `Intl` pone tras «S/» | Normalizar el texto antes de comparar |
| 12, emitir el informe | El script eligió las 4 verificaciones en el mismo instante y React conservó solo la última. Una persona las elige una por una | Elegirlas una por una |
| 13, panel | Consecuencia del paso 12: la inspección seguía abierta | Ninguna: se resolvió con el paso 12 |

No se cambió la aplicación entre ejecuciones.

**Base de datos:** la segunda ejecución usó una base H2 y una carpeta de archivos nuevas, fuera del repositorio. Código ejecutado:
`1982f7e` más `puppeteer-core` como devDependency.

## NF02

Medido el 30 de octubre de 2026 con `scripts/medir-nf02.mjs`, justo después del recorrido, con 11 casos en la base. Salida completa en
`docs/pruebas/evidencias/nf02-2026-10-30.txt`.

| Ejecuciones en 2 s o menos | Mínimo | Mediana | Máximo | Resultado |
|---|---|---|---|---|
| 20 de 20 | 22,0 ms | 25,2 ms | 54,3 ms | Cumple la meta de 19 de 20 |

Mide solo la API: no incluye el dibujado de la interfaz.
