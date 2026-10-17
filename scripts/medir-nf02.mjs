// REQ-NF02 (rendimiento local): listado y apertura de expediente en hasta 2 segundos
// en al menos 19 de 20 ejecuciones, con un usuario, servicios iniciados y entorno registrado.
//
// Uso (con el backend ya iniciado):
//   APP_SEED_PASSWORD=<la contraseña de las cuentas de prueba> node scripts/medir-nf02.mjs [archivo-de-salida]
//
// Mide el tiempo de la API (listado + apertura de un expediente). No incluye el dibujado de la interfaz.
// No se descarta ninguna ejecución, tampoco la primera (calentamiento de la JVM): todas cuentan.
import os from "node:os";
import { writeFileSync } from "node:fs";

const BASE = process.env.API_URL ?? "http://127.0.0.1:8080/api/v1";
const PASSWORD = process.env.APP_SEED_PASSWORD;
const EJECUCIONES = 20;
const UMBRAL_MS = 2000;
const MINIMO_OK = 19;
const CASO = process.env.CASO ?? "SIM-11048217";

if (!PASSWORD) {
  console.error("Define APP_SEED_PASSWORD con la contraseña de las cuentas de prueba.");
  process.exit(2);
}

const res = await fetch(`${BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ codigoCuenta: "comprador-01", password: PASSWORD }),
}).catch((e) => { console.error(`No se pudo conectar con ${BASE}: ${e.message}`); process.exit(2); });
if (!res.ok) { console.error(`Login fallido (${res.status}).`); process.exit(2); }
const { token } = await res.json();
const cabeceras = { Authorization: `Bearer ${token}` };

const tiempos = [];
for (let i = 1; i <= EJECUCIONES; i++) {
  const t0 = performance.now();
  const lista = await fetch(`${BASE}/casos`, { headers: cabeceras });
  const casos = await lista.json();
  const detalle = await fetch(`${BASE}/casos/${CASO}`, { headers: cabeceras });
  const exp = await detalle.json();
  const ms = performance.now() - t0;
  if (!lista.ok || !detalle.ok || exp.codigo !== CASO || casos.length === 0) {
    console.error(`Ejecución ${i}: respuesta inválida (${lista.status}/${detalle.status}).`);
    process.exit(2);
  }
  tiempos.push(ms);
}

const ok = tiempos.filter((t) => t <= UMBRAL_MS).length;
const orden = [...tiempos].sort((a, b) => a - b);
const lineas = [
  `== REQ-NF02: listado + apertura de expediente (${CASO}) — ${new Date().toISOString()} ==`,
  `API: ${BASE}`,
  `Equipo: ${os.type()} ${os.release()} · ${os.cpus()[0]?.model ?? "CPU desconocida"} · ${os.cpus().length} núcleos · ${(os.totalmem() / 2 ** 30).toFixed(1)} GiB de RAM`,
  `Node.js ${process.version}`,
  `Meta del equipo: al menos ${MINIMO_OK} de ${EJECUCIONES} ejecuciones en ${UMBRAL_MS} ms o menos (no es un umbral de ISO/IEC 25010).`,
  "",
  "Ejecución;ms",
  ...tiempos.map((t, i) => `${i + 1};${t.toFixed(1)}`),
  "",
  `Mínimo ${orden[0].toFixed(1)} ms · mediana ${orden[Math.floor(orden.length / 2)].toFixed(1)} ms · máximo ${orden.at(-1).toFixed(1)} ms`,
  `Ejecuciones en ${UMBRAL_MS} ms o menos: ${ok} de ${EJECUCIONES}`,
  `Resultado: ${ok >= MINIMO_OK ? "CUMPLE la meta" : "NO CUMPLE la meta"}`,
];
const texto = lineas.join("\n");
console.log(texto);
const salida = process.argv[2];
if (salida) writeFileSync(salida, texto + "\n");
process.exit(ok >= MINIMO_OK ? 0 : 1);
