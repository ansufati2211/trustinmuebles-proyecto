# Reporte de la rama `mejoras-v0.7`

Fecha: 30 de octubre de 2026. **No se hizo merge ni push.** `main` y `origin/main` siguen en `9b155a5`.

## Resumen

| Dato | Valor |
|---|---|
| Hash de `main` al inicio | `9b155a5a4797f7d782d10edb9d82cf026feed0ff` |
| Tag de respaldo | `respaldo-antes-mejoras-v0.7`, local, sobre `9b155a5` |
| Respaldo de `trustinmuebles-backend/data/` | No hubo qué copiar: la carpeta no existía |
| Bloques | 8 hechos, 1 hecho en parte (B10), 1 saltado (B9), 0 fallidos, 0 stashes |

| Prueba | Línea base | Final | Diferencia |
|---|---|---|---|
| Backend (`mvnw test`) | 140 de 140 | 148 de 148 | +8 |
| Frontend (`pnpm test`) | 60 de 60, 9 archivos | 64 de 64, 11 archivos | +4 |
| Compilación (`pnpm build`) | Correcta | Correcta, JS principal de 581,01 kB | |

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
| B9 Recorrido v0.7 | **Saltado** | — | `puppeteer-core` no está instalado. Sin recorrido, capturas ni NF02 nuevo |
| B10 Documentación | **Hecho en parte** | `aa00738` | Faltan datos del informe. Leer «Lo que queda pendiente» |

## Riesgo al fusionar

**`data/` de la raíz puede desaparecer del disco.** La rama deja de rastrear esos 11 archivos, y Git borra del disco lo que deja de
rastrear cuando fusiona o cambia de rama:

- Si haces `git switch main` y luego vuelves a esta rama, o fusionas esta rama en `main`, Git borrará `data/` de la raíz.
- Lo mismo pasará en el clon de cada integrante al traer el cambio.

Si esos datos importan, cópialos fuera del repositorio antes. También se conservan en el commit `9b155a5` y en el tag de respaldo.

**Esos archivos siguen en el historial de Git.** B4 no los saca de ahí; hacerlo exigiría reescribir el historial, lo que esta tarea
prohibía. Qué contienen sigue sin verificarse.

## Lo que queda pendiente

**Nada de la interfaz se ha visto en un navegador.** Los cambios de B1, B2, B5, B6, B7 y B8 están cubiertos por compilación y pruebas
de funciones puras, más la prueba que renderiza el pie. El formulario nuevo de «Registrar partida» no se ha usado nunca en pantalla.

**B9 sigue por hacer.** `puppeteer-core` se instala fuera del repositorio, como dice la cabecera de `recorrido-v06.mjs`. NF02 no
depende de esa herramienta, pero se omitió por estar dentro del bloque; su último dato, del 17 de octubre, es anterior a la v0.7.

**El texto del informe no está en el repositorio,** así que la sección 16 del modelo y `docs/PARA-INFORME.md` quedan incompletos:

- **RF01 a RF12:** no están definidos. Las tablas listan las funciones con su ETP, prueba y estado, y la columna RF dice «Por asignar».
- **CP08 a CP17:** no están definidos. CP01 a CP07 se asumieron iguales a CP-01 a CP-07 de `docs/pruebas/registro.md`.
- **RN y CUN:** usan exactamente la correspondencia indicada en la tarea.
- **Anexo 26:** no tiene capturas de la v0.7.

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

**Pruebas nuevas (12)**

| Bloque | Pruebas |
|---|---|
| B1 | `limitesLegales.test.tsx` (2) |
| B2 | `MigracionEspecialistaTest.reemplazaElPerfilAnterior` |
| B6 | `RegistrarPartidaTest`: `origenObligatorio`, `prefijoSegunElOrigen`, `simuladaRegistrada`, `precioEnElCatalogo`, `precioInvalido`; `fuentes.test.ts` (2) |
| B7 | `CarteraTest.cargaConAsignacion`, `MigracionAsignacionTest.asignaLaInspeccionEnCurso` |

No se borró ni desactivó ninguna prueba: no hay `@Disabled`, `.skip` ni `.only` nuevos.

## Migraciones nuevas

| Migración | Qué hace | Prueba |
|---|---|---|
| `V9__especialista_ficticio.sql` | Cambia el perfil de `especialista-01` y los informes firmados con los datos anteriores | `MigracionEspecialistaTest` |
| `V10__asignacion_obligatoria.sql` | Asigna `especialista-01` a la inspección en curso de `SIM-11098467` | `MigracionAsignacionTest` |

Se probaron sobre bases H2 en memoria, no sobre una base real en `data/`. V1 a V8 no se modificaron.

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
- **Manuales y API.** También se actualizaron `docs/api.md`, `manual-especialista.md` y `manual-revisor.md`: el cambio de contrato los
  dejaba incorrectos.

## Observaciones sin cambiar

- **El pie contradice el aviso nuevo.** `Footer.tsx` sigue diciendo «Inspección física independiente por Ing. / Arq. colegiado», junto al
  texto que dice que los especialistas son simulados. Queda fuera de B1.
- **Historial de una partida simulada.** Nace con el rótulo «Partida transcrita incorporada», porque no se amplió esa lista cerrada (D50).
- **Informes de demostración emitidos.** No tienen asignación, así que ya no se pueden modificar (D51).
- **Puerto 8080 ocupado.** Un Apache (`httpd`, PID 9472) ajeno al proyecto escucha en `0.0.0.0:8080`, el puerto del backend. No se tocó.
  Hay que detenerlo o cambiar `server.port` antes de arrancar el backend para el recorrido o para NF02.
- **Foto `edificios-oficinas.jpg`.** Se ve el logotipo de un banco en una torre, pequeño. No incumple la condición sobre personas.
- **Comportamiento del workflow.** Con B3 fusionado, un push a `main` ya no publica en GHCR. Mientras no se fusione, el `docker.yml` de
  `main` sigue reaccionando a cada push.

## Reglas de seguridad

| Regla | Comprobación |
|---|---|
| R1 | Sin commit, merge, rebase, reset ni push sobre `main`; sin `--force`, `git clean` ni borrado de ramas o tags |
| R2 | Todo el trabajo está en `mejoras-v0.7` |
| R3 | Solo se agregaron V9 y V10 |
| R4 | `git diff` vacío para `MotorClasificacion`, `contenido/` y C1–C4 |
| R5 | El total de pruebas subió en backend y frontend |
| R6 | `pom.xml` y `pnpm-lock.yaml` sin cambios. `pnpm@9` se usó con `npx`, sin agregarlo al proyecto |
| R7 | Solo se borró `components/base/Footer.tsx`, indicado en B1 |

## Commits

`git log --oneline main..mejoras-v0.7`, antes del commit de este reporte:

```text
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
