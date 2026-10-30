# Reporte de la rama `mejoras-v0.7`

Fecha: 30 de octubre de 2026. **No se hizo merge ni push.** `main` y `origin/main` siguen en `9b155a5`.

## Resumen

| Dato | Valor |
|---|---|
| Hash de `main` al inicio | `9b155a5a4797f7d782d10edb9d82cf026feed0ff` |
| Tag de respaldo | `respaldo-antes-mejoras-v0.7`, local, sobre `9b155a5` |
| Respaldo de `trustinmuebles-backend/data/` | No hubo qué copiar: la carpeta no existía |
| Bloques | 10 hechos (B9 y B10 se completaron en C2 y C3), 3 correcciones (C1 a C3), 0 fallidos, 0 stashes |

| Prueba | Línea base | Final | Diferencia |
|---|---|---|---|
| Backend (`mvnw test`) | 140 de 140 | 149 de 149 | +9 |
| Frontend (`pnpm test`) | 60 de 60, 9 archivos | 66 de 66, 11 archivos | +6 |
| Compilación (`pnpm build`) | Correcta | Correcta, JS principal de 580,96 kB | |
| Recorrido de navegador | No existía para la v0.7 | 15 de 15 pasos | |
| NF02 | 17 de octubre: 20 de 20 | 20 de 20, máximo 54,3 ms, solo la API | |

## Bloques

| Bloque | Resultado | Commit | Nota |
|---|---|---|---|
| B1 Pie legal (I7) | Hecho | `14e03df` | Se eliminó `components/base/Footer.tsx`, sin uso |
| B2 Especialista ficticio | Hecho | `0b703db` | Migración V9. El nombre anterior solo queda en V9 y en su prueba, porque los necesitan para actualizar bases existentes |
| B3 Docker | Hecho | `7b91935` | El backend no publica puertos: solo se ligó el frontend. No se construyeron imágenes |
| B4 Datos versionados | Hecho | `d4229fd` | Los 11 archivos siguen en disco. Leer «Riesgo al fusionar» |
| B5 Textos y versión | Hecho | `ae48e9d` | |
| B6 Origen y precio | Hecho | `f415ac0` | Sin migración: el esquema ya lo admitía (D50) |
| B7 Asignación obligatoria | Hecho | `dc813df` | Migración V10 (D51) |
| B8 Fotos locales | Hecho | `c9784f4` | 5 fotos revisadas una a una; ninguna muestra un rostro. La sexta era el avatar, retirado en B2 |
| B9 Recorrido v0.7 | Hecho en C2 | `36d3ba5` | Saltado en la primera sesión; ver C2 |
| B10 Documentación | Hecho, completado en C3 | `aa00738`, `7c1dc20` | |
| C1 Correcciones | Hecho | `1982f7e` | Pie, origen simulado en el historial (migración V11) y Cartera con fondo de tokens en vez de la foto |
| C2 Recorrido y NF02 | Hecho | `36d3ba5` | 15 de 15 en la segunda ejecución; ver «Recorrido» |
| C3 Correspondencia con el informe | Hecho | `7c1dc20` | RF01–RF12 y CP01–CP17 con las definiciones del informe |

## Riesgo al fusionar

**`data/` de la raíz puede desaparecer del disco.** La rama deja de rastrear esos 11 archivos, y Git borra del disco lo que deja de
rastrear cuando fusiona o cambia de rama:

- Si haces `git switch main` y luego vuelves a esta rama, o fusionas esta rama en `main`, Git borrará `data/` de la raíz.
- Lo mismo pasará en el clon de cada integrante al traer el cambio.

Si esos datos importan, cópialos fuera del repositorio antes. También se conservan en el commit `9b155a5` y en el tag de respaldo.

**Esos archivos siguen en el historial de Git.** B4 no los saca de ahí; hacerlo exigiría reescribir el historial, lo que esta tarea
prohibía. Qué contienen sigue sin verificarse.

## Recorrido

**Resultado: 15 de 15 pasos correctos**, sin errores de consola. Tabla en `docs/pruebas/RESULTADO-recorrido-v07.md`, capturas en
`docs/pruebas/capturas-v07/`.

La primera ejecución dio **12 de 15**. Los tres fallos venían del script, no del sistema, y la aplicación no se cambió entre ejecuciones:

- **Paso 9:** la comparación no normalizaba el espacio de no separación del precio.
- **Paso 12:** el script eligió las 4 verificaciones en el mismo instante y React conservó solo la última.
- **Paso 13:** consecuencia del paso 12.

## Lo que queda pendiente

- **`trustinmuebles-backend/data/` sigue en disco con datos del primer recorrido.** Sus cuentas usan una contraseña temporal, así que
  el backend no aceptará la tuya. **Apágalo y borra esa carpeta antes de arrancarlo.** Intenté borrarla y el permiso se denegó, por lo
  que no busqué otra vía. Está ignorada por Git. La segunda ejecución usó una base nueva fuera del repositorio.
- **CP13 parcial:** respaldo y restauración sin ejecutar, y sin prueba en otro equipo.
- **CP15 y CP16 pendientes.** CP16 es la inspección presencial real, fuera del software.
- **Sin cubrir por el recorrido:** lectores de pantalla, otros navegadores, móvil y Docker. El intento del propietario de editar se probó
  solo en el backend (CP11).
- **Contenido:** reglas, glosario y casos siguen pendientes de revisión especializada.

## Pruebas cambiadas

**Valores esperados que el bloque cambió a propósito**

| Bloque | Prueba | Cambio |
|---|---|---|
| B2 | `CatalogoYServiciosTest.identidadDelEspecialistaBloqueada` | Nombre y colegiatura nuevos |
| B2 | `CatalogoYServiciosTest.informesDeDemostracionFirmados` | Nombre nuevo |
| B7 | `CarteraTest.permisosPorRol` | Inspecciones asignadas en la carga: de 0 a 1 |
| B7 | `CarteraTest.panelCoherente` | Asignadas de 0 a 1; sin asignar de 2 a 1 |
| B7 | `permisos.test.ts`, «solo el especialista llena el informe» | Se indica cuenta asignada para el caso permitido |
| B7 | `permisos.test.ts`, «con asignación solo emite el asignado» | Sin asignación pasa de `true` a `false` |

**Prueba reemplazada**

| Bloque | Antes | Después | Por qué |
|---|---|---|---|
| B7 | `CarteraTest.sinAsignacionCualquieraEmite` | `CarteraTest.sinAsignacionNadieEmite` | La regla se invirtió |

**Pruebas adaptadas sin debilitarlas**

| Bloque | Prueba | Cambio |
|---|---|---|
| B6 | `CaptacionPublicacionTest.naceEnBorrador` | Ampliada: ahora cubre los dos orígenes |
| B6 | Datos de `RegistrarPartidaTest`, `CaptacionPublicacionTest`, `CicloCarteraTest`, `HistorialEvaluacionTest` | Agregan `origen`, ahora obligatorio |
| B7 | `InspeccionTest.flujoCompleto`, `validaElInforme` | El gestor asigna antes de emitir |
| B7 | `CatalogoYServiciosTest.identidadDelEspecialistaBloqueada`, `informeConRiesgoNoCambiaElColor`, `filtroDeRiesgoSeActualiza` | El gestor asigna antes de emitir |

**Pruebas nuevas (15)**

| Bloque | Pruebas |
|---|---|
| B1 | `limitesLegales.test.tsx` (2) |
| B2 | `MigracionEspecialistaTest.reemplazaElPerfilAnterior` |
| B6 | `RegistrarPartidaTest`: `origenObligatorio`, `prefijoSegunElOrigen`, `simuladaRegistrada`, `precioEnElCatalogo`, `precioInvalido`; `fuentes.test.ts` (2) |
| B7 | `CarteraTest.cargaConAsignacion`, `MigracionAsignacionTest.asignaLaInspeccionEnCurso` |
| C1 | `RegistrarPartidaTest.historialDeSimulada`; `historial.test.ts`, «una partida simulada no se rotula como transcrita»; `limitesLegales.test.tsx`, «el pie atribuye la inspección» |

No se borró ni desactivó ninguna prueba: no hay `@Disabled`, `.skip` ni `.only` nuevos.

## Migraciones nuevas

| Migración | Qué hace | Prueba |
|---|---|---|
| `V9__especialista_ficticio.sql` | Cambia el perfil de `especialista-01` y los informes firmados con los datos anteriores | `MigracionEspecialistaTest` |
| `V10__asignacion_obligatoria.sql` | Asigna `especialista-01` a la inspección en curso de `SIM-11098467` | `MigracionAsignacionTest` |

| `V11__historial_partida_simulada.sql` | Agrega `PARTIDA_SIMULADA` a la lista cerrada del historial, sin tocar filas guardadas | `RegistrarPartidaTest.historialDeSimulada` |

V9 a V11 corrieron en una base nueva durante el recorrido. V9 y V10 también se probaron con datos anteriores, en bases en memoria; ninguna
sobre una base real ya poblada. V1 a V8 no se modificaron.

## Decisiones tomadas sin consultar

- **Certificado de Maven.** Norton Antivirus intercepta el TLS y Java no confía en él, por lo que `mvnw` no podía descargar nada. Se usó
  `MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=Windows-ROOT`, solo en estos procesos. No se desactivó ninguna verificación ni se cambió
  el JDK o `settings.xml`. Sin esa variable, `mvnw test` puede fallar igual en este equipo.
- **Autor de los commits.** El repositorio no tiene `user.name` ni `user.email`. Los commits usan `Daniel <grupoxddddd@gmail.com>`,
  pasado por comando; no se escribió en la configuración de Git.
- **Eliminar partidas simuladas.** Antes solo se borraban las no sintéticas. Ahora se borra cualquier partida captada; los diez casos de
  demostración siguen protegidos.
- **Número en el formulario.** Se envía tal como se escribe, sin quitar `SIM-`. Antes la interfaz lo quitaba en silencio, y eso habría
  hecho pasar un número simulado por transcrito.
- **Corrección del script.** Tras la primera ejecución del recorrido corregí el script, no la aplicación, y repetí sobre una base nueva.
- **Base del segundo recorrido.** Pediste usar `trustinmuebles-backend/data/` nueva; como no se pudo borrar, la segunda ejecución usó una
  carpeta nueva fuera del repositorio, con `SPRING_DATASOURCE_URL` y `APP_STORAGE_PATH`.
- **Rótulo del historial.** `PARTIDA_SIMULADA` se aplica a las simuladas captadas, al registrarlas y al corregir sus asientos. Los diez casos
  de demostración siguen usando el rótulo anterior.
- **Foto de Cartera.** Se eliminó `edificios-oficinas.jpg`, creada en B8, y quedó el fondo de tokens.
- **Manuales y API.** También se actualizaron `docs/api.md`, `manual-especialista.md` y `manual-revisor.md`: el cambio de contrato los
  dejaba incorrectos.

## Observaciones sin cambiar

- **Informes de demostración emitidos.** No tienen asignación, así que ya no se pueden modificar (D51).
- **Puerto 8080.** En la primera sesión lo ocupaba un Apache (`httpd`) ajeno al proyecto; en esta estaba libre. Si vuelve, el backend no
  podrá arrancar en ese puerto.
- **Texto «colegiado».** La landing y el panel técnico siguen hablando de un profesional o ingeniero colegiado. C1 solo cubría el pie.
- **Dependencia con aviso.** `pnpm` avisa que `react-router` pide React 19.2.7 y hay 19.2.4. Es anterior a estos cambios.
- **Comportamiento del workflow.** Con B3 fusionado, un push a `main` ya no publica en GHCR. Mientras no se fusione, el `docker.yml` de
  `main` sigue reaccionando a cada push.


## Reglas de seguridad

| Regla | Comprobación |
|---|---|
| R1 | Sin commit, merge, rebase, reset ni push sobre `main`; sin `--force`, `git clean` ni borrado de ramas o tags |
| R2 | Todo el trabajo está en `mejoras-v0.7` |
| R3 | Solo se agregaron V9, V10 y V11 |
| R4 | `git diff` vacío para `MotorClasificacion`, `contenido/` y C1–C4 |
| R5 | El total de pruebas subió en backend y frontend |
| R6 | `pom.xml` sin cambios. Única dependencia nueva: `puppeteer-core`, como devDependency, con la excepción autorizada. El lockfile solo agrega líneas |
| R7 | Solo se borraron `components/base/Footer.tsx`, indicado en B1, y `edificios-oficinas.jpg`, creada en B8 |

## Commits

`git log --oneline main..mejoras-v0.7`, antes del commit de esta actualización:

```text
7c1dc20 C3: correspondencia con RF y CP del informe, capturas y NF02
36d3ba5 C2: recorrido v0.7 de 15 pasos con capturas y medicion NF02
1982f7e C1: pie con especialista de la inmobiliaria, origen simulado en el historial y fondo sin marcas
fab4462 docs: reporte de la rama mejoras-v0.7
aa00738 B10: documentacion de la v0.7, correspondencia con el informe y material para Word
c9784f4 B8: fotografias locales en public/img
dc813df B7: asignacion obligatoria del especialista con migracion V10
f415ac0 B6: captacion con origen obligatorio y precio referencial opcional
ae48e9d B5: textos de autorizacion y version 0.7.0 en la interfaz
d4229fd B4: data/ de la raiz fuera del control de versiones
7b91935 B3: puerto del frontend ligado a 127.0.0.1 y workflow GHCR solo manual
0b703db B2: perfil de especialista ficticio con migracion V9 y credencial rotulada
14e03df B1: pie legal activo con los limites legales (I7)
```
