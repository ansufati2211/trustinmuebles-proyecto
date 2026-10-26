# Pendientes de la v0.7.0 «Ciclo de cartera»

Lo que quedó abierto al cerrar la sesión 1 (backend y pruebas). Cada punto dice por qué sigue abierto y quién lo resuelve.

## Fuera del alcance de la sesión 1

- **Interfaz (sesión 2).** El frontend no se modificó: no hay pantallas para el gestor, el propietario, el contacto, la
  asignación, el historial ni el panel de cartera. La API ya los ofrece (ver `docs/api.md`).
- **Recorrido de navegador.** `docs/pruebas/recorrido-v06.mjs` no se repitió: no se levantaron servidores en esta sesión.

## Por confirmar con el equipo o el docente

- **Supuestos D32 a D42** de `docs/decisiones.md`, en especial: retirar la autorización despublica el caso (D34), el origen
  `EDICION` para el PDF de la partida (D37), el historial que se conserva al borrar una partida transcrita (D36) y la
  reasignación de una inspección en curso (D40).
- **Informe del curso.** Los roles GESTOR y PROPIETARIO, la publicación, el contacto y el historial son funciones nuevas que el
  informe todavía no describe.
- **Colegiatura de `especialista-01`.** Sigue siendo «CIP N.° 248910», sin el prefijo `SIM-` (pendiente desde la v0.6, D24).
  La nueva cuenta `especialista-02` ya usa `SIM-CAP-0002`.

## Observaciones técnicas

- **Tiempo de las pruebas.** En esta máquina, con los servidores de lenguaje del editor activos, `mvnw test` tardó entre 2 y 12
  minutos (una ejecución llegó a 10 minutos en `CasosApiTest`). El volcado de hilos mostró la CPU ocupada en BCrypt (un login
  por petición en las pruebas), no un bloqueo. No se cambió nada por esto.
- **Conteo de pruebas.** La línea base dio 107, igual que el esperado: no hubo diferencia que registrar.
- **Registro de la línea base fuera del repositorio.** La salida de la primera ejecución quedó por error en
  `C:\Users\gab02\OneDrive\Desktop\UTP\Ciclo 8\Trustin\linea-base-tmp.txt` (carpeta superior al repositorio). No se borró;
  se puede eliminar a mano.
