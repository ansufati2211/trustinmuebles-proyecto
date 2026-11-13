// Recorrido de uso de la versión 1.0.0 (etapa 7): el guion de 15 minutos de docs/demo/GUION-DEMO.md, con el kit de
// docs/demo/kit. Visitante sin sesión: asistente, filtros, plano, ficha del lote y solicitud de cita. Asesor: carga el CSV
// del kit, registra un particular con un texto del kit, sube sus láminas, el propietario autoriza, publica, confirma la
// cita y lleva al interesado hasta separación. Una captura por paso; un paso en FALLA se registra y el recorrido sigue.
//
// Arranca todo solo y lo apaga al final: el backend (target/backend-1.0.0.jar) con una base NUEVA en una carpeta temporal
// fuera del repositorio, la interfaz con Vite en http://localhost:5173 y Chrome sin ventana. Antes corre
// scripts/preparar-demo.mjs. Los puertos 8080 y 5173 deben estar libres.
// Requisitos: Java 21, Google Chrome, el jar compilado (cd trustinmuebles-backend && ./mvnw -DskipTests package) y las
// dependencias de la interfaz instaladas. puppeteer-core es una devDependency de trustinmuebles.
// Uso: node docs/pruebas/uso-v10/recorrido-v10.mjs      (APP_SEED_PASSWORD opcional; si falta, se genera una)
// Genera docs/pruebas/uso-v10/capturas/, capturas-tableta/ (etapa 8: 820 x 1180 y 1180 x 820) y
// docs/pruebas/uso-v10/RESULTADO-recorrido-v10.json (con la duración del guion y el resultado en tableta).
import { createRequire } from "node:module";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, "..", "..", "..");
const require = createRequire(path.join(RAIZ, "trustinmuebles", "package.json"));
const puppeteer = require("puppeteer-core");

const CLAVE = process.env.APP_SEED_PASSWORD ?? `recorrido-${crypto.randomBytes(6).toString("hex")}`;
const SHOTS = path.join(AQUI, "capturas");
mkdirSync(SHOTS, { recursive: true });
for (const f of readdirSync(SHOTS)) if (f.endsWith(".png")) rmSync(path.join(SHOTS, f));
const BASE = "http://localhost:5173/#";
const KIT = path.join(RAIZ, "docs", "demo", "kit");
const NUEVO = "INT-99000611";
const TEXTO_NUEVO = readFileSync(path.join(KIT, "partidas", "INT-99000611-vivienda-sin-cargas.txt"), "utf8");
const CSV_KIT = path.join(KIT, "proyecto-nuevo-80-lotes.csv");
const LAMINAS = { ARQUITECTURA: "plano-arquitectura.pdf", ESTRUCTURAS: "plano-estructuras.pdf",
  ELECTRICAS: "plano-electricas.pdf", SANITARIAS: "plano-sanitarias.pdf" };
const VISITANTE = { nombre: "Carla", correo: "carla.visita@example.com" };
const LIMITES = ["No certifica saneamiento.", "No recomienda comprar.", "No reemplaza asesoría legal."];

// ---------------------------------------------------------------- arranque (base nueva fuera del repositorio)
const DATOS = mkdtempSync(path.join(os.tmpdir(), "trustinmuebles-v10-"));
const procesos = [];
const libre = (puerto) => new Promise((r) => {
  const s = net.createServer().once("error", () => r(false)).once("listening", () => s.close(() => r(true)));
  s.listen(puerto, "127.0.0.1");
});
function apagar() {
  for (const p of procesos.reverse()) {
    if (p.exitCode !== null) continue;
    try {
      if (process.platform === "win32") execFileSync("taskkill", ["/pid", String(p.pid), "/T", "/F"], { stdio: "ignore" });
      else process.kill(-p.pid, "SIGTERM");
    } catch { /* ya terminó */ }
  }
}
process.on("exit", apagar);
process.on("SIGINT", () => { apagar(); process.exit(130); });

for (const puerto of [8080, 5173]) {
  if (!(await libre(puerto))) { console.error(`El puerto ${puerto} está ocupado: cierra el backend o la interfaz que esté corriendo.`); process.exit(2); }
}
const JAR = path.join(RAIZ, "trustinmuebles-backend", "target", "backend-1.0.0.jar");
if (!existsSync(JAR)) { console.error(`Falta ${JAR}: compílalo con ./mvnw -DskipTests package.`); process.exit(2); }

const h2 = path.join(DATOS, "h2", "trustinmuebles").replace(/\\/g, "/");
const inicio = Date.now();
const backend = spawn("java", ["-jar", JAR,
  `--spring.datasource.url=jdbc:h2:file:${h2};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;AUTO_SERVER=FALSE`,
  `--app.storage.path=${path.join(DATOS, "uploads")}`], {
  cwd: DATOS, env: { ...process.env, APP_SEED_PASSWORD: CLAVE }, stdio: ["ignore", "pipe", "pipe"], detached: process.platform !== "win32",
});
procesos.push(backend);
const logBackend = [];
backend.stdout.on("data", (d) => logBackend.push(d.toString()));
backend.stderr.on("data", (d) => logBackend.push(d.toString()));
const vite = spawn(process.execPath, [path.join(RAIZ, "trustinmuebles", "node_modules", "vite", "bin", "vite.js"), "--port", "5173", "--strictPort"], {
  cwd: path.join(RAIZ, "trustinmuebles"), stdio: ["ignore", "pipe", "pipe"], detached: process.platform !== "win32",
});
procesos.push(vite);

async function esperarUrl(url, segundos) {
  for (let i = 0; i < segundos; i++) {
    try { if ((await fetch(url)).ok) return true; } catch { /* aún no */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}
if (!(await esperarUrl("http://127.0.0.1:8080/actuator/health", 240))) {
  console.error("El backend no arrancó:\n" + logBackend.join("").slice(-3000));
  apagar(); process.exit(2);
}
const arranqueBackendS = ((Date.now() - inicio) / 1000).toFixed(1);
if (!(await esperarUrl("http://localhost:5173/", 90))) { console.error("La interfaz no arrancó."); apagar(); process.exit(2); }
console.log(`Backend listo en ${arranqueBackendS} s con la base nueva en ${DATOS}`);

// ---------------------------------------------------------------- preparar-demo
let preparar;
try {
  preparar = { codigo: 0, salida: execFileSync(process.execPath, [path.join(RAIZ, "scripts", "preparar-demo.mjs")],
    { env: { ...process.env, APP_SEED_PASSWORD: CLAVE }, encoding: "utf8" }) };
} catch (e) {
  preparar = { codigo: e.status, salida: `${e.stdout ?? ""}${e.stderr ?? ""}` };
}
console.log(preparar.salida);

// ---------------------------------------------------------------- texto de un PDF (Flate y cadenas literales o hex)
function textoPdf(buf) {
  const crudo = buf.toString("latin1");
  const flujos = [];
  const re = /(?<!end)stream\r?\n/g;
  let m;
  while ((m = re.exec(crudo))) {
    const ini = m.index + m[0].length;
    const fin = crudo.indexOf("endstream", ini);
    if (fin < 0) break;
    const datosFlujo = buf.subarray(ini, fin);
    try { flujos.push(zlib.inflateSync(datosFlujo, { finishFlush: zlib.constants.Z_SYNC_FLUSH }).toString("latin1")); } catch {
      flujos.push(datosFlujo.toString("latin1"));
    }
    re.lastIndex = fin;
  }
  const todo = crudo + "\n" + flujos.join("\n");
  const cadenas = [];
  const lit = /(\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f\s]+>)\s*Tj/g;
  while ((m = lit.exec(todo))) {
    const s = m[1];
    if (s.startsWith("<")) { cadenas.push(Buffer.from(s.slice(1, -1).replace(/\s/g, ""), "hex").toString("latin1")); continue; }
    cadenas.push(s.slice(1, -1).replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, x) =>
      /^[0-7]+$/.test(x) ? String.fromCharCode(parseInt(x, 8)) : ({ n: "\n", r: "\r", t: "\t", b: "", f: "" }[x] ?? x)));
  }
  return cadenas.join(" | ");
}

// ---------------------------------------------------------------- navegador
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errores = [];
const respuestasError = [];
page.on("pageerror", (e) => errores.push(e.message));
page.on("console", (m) => { if (m.type() === "error" && !/40[0134]|409|413|422|429|Failed to load resource/.test(m.text())) errores.push(m.text()); });
page.on("response", (r) => { if ([409, 500].includes(r.status())) respuestasError.push(`${r.status()} ${r.request().method()} ${r.url()}`); });

const texto = () => page.evaluate(() => document.body.innerText.replace(/[\u00a0\u202f]/g, " "));
const conTexto = (t, timeout = 20000) => page.waitForFunction((x) => document.body.innerText.replace(/[\u00a0\u202f]/g, " ").includes(x), { timeout }, t);
const listo = () => page.waitForFunction(() => !/Cargando/.test(document.body.innerText), { timeout: 20000 });
const ir = async (ruta) => { await page.goto(BASE + ruta, { waitUntil: "networkidle0" }); await listo(); await espera(400); };

async function salir() {
  await page.goto(BASE + "/", { waitUntil: "networkidle0" });
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: "networkidle0" });
}
async function ingresar(cuenta) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("#codigoCuenta");
  await page.type("#codigoCuenta", cuenta);
  await page.type("#password", CLAVE);
  await page.click("button[type=submit]");
  await page.waitForFunction(() => !location.hash.startsWith("#/login"), { timeout: 15000 });
  await listo();
}
const apiSesion = (metodo, ruta, cuerpo) => page.evaluate(async (m, r, c) => {
  const t = sessionStorage.getItem("tm_token");
  const res = await fetch("/api/v1" + r, { method: m,
    headers: { ...(t ? { Authorization: "Bearer " + t } : {}), ...(c ? { "Content-Type": "application/json" } : {}) },
    body: c ? JSON.stringify(c) : undefined });
  let cuerpoResp = null;
  try { cuerpoResp = await res.json(); } catch { /* sin cuerpo */ }
  return { status: res.status, body: cuerpoResp };
}, metodo, ruta, cuerpo ?? null);
const pdfSinSesion = async (url) => {
  const r = await fetch("http://localhost:5173" + url);
  return { status: r.status, buf: Buffer.from(await r.arrayBuffer()) };
};

const campo = (etiqueta) => page.evaluateHandle((t) => {
  const l = [...document.querySelectorAll("label")].find((x) => x.textContent.trim().startsWith(t));
  return l ? document.getElementById(l.htmlFor) : null;
}, etiqueta);
const escribir = async (etiqueta, valor) => (await campo(etiqueta)).type(valor);
/** Fija el valor de un input controlado por React (por ejemplo, una fecha). */
const fijar = (handle, valor) => handle.evaluate((el, v) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(el, v);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}, valor);
async function pulsar(textoBoton, exacto = false, dentro = "body") {
  const ok = await page.evaluate((t, ex, sel) => {
    const raiz = document.querySelector(sel) ?? document.body;
    const b = [...raiz.querySelectorAll("button")].filter((x) => !x.disabled)
      .find((x) => (ex ? x.innerText.trim() === t : x.innerText.includes(t)));
    b?.click();
    return !!b;
  }, textoBoton, exacto, dentro);
  if (!ok) throw new Error(`No hay un botón activo «${textoBoton}»`);
  await espera(400);
}
async function desplegable(etiqueta, opcion) {
  const ok = await page.evaluate((e, o) => {
    const s = [...document.querySelectorAll("span")].find((x) => x.textContent.trim() === e && x.id.endsWith("-etiqueta"));
    const op = s && [...s.parentElement.querySelectorAll("[role=option]")].find((x) => x.textContent.toLowerCase().includes(o.toLowerCase()));
    op?.click();
    return !!op;
  }, etiqueta, opcion);
  if (!ok) throw new Error(`No hay opción «${opcion}» en «${etiqueta}»`);
  await espera(150);
}
const fechaLima = (dias) => {
  const d = new Date(Date.now() + dias * 86400000);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
};

const pasos = [];
const datos = { arranqueBackendS, baseDatos: "carpeta temporal nueva (fuera del repositorio)", preparar };
async function paso(n, quien, esperado, nombre, fn) {
  const hechos = [];
  let ok = true;
  const t0 = Date.now();
  const v = (cond, desc) => { hechos.push(`${cond ? "" : "NO: "}${desc}`); if (!cond) ok = false; };
  const nota = (desc) => hechos.push(desc);
  try { await fn(v, nota); } catch (e) { ok = false; hechos.push(`Error: ${e.message.split("\n")[0]}`); }
  const captura = `${String(n).padStart(2, "0")}-${nombre}.png`;
  await page.screenshot({ path: path.join(SHOTS, captura), fullPage: true }).catch(() => {});
  const segundos = ((Date.now() - t0) / 1000).toFixed(1);
  pasos.push({ n, quien, esperado, obtenido: hechos.join("; "), ok, captura, segundos });
  console.log(`${ok ? "OK   " : "FALLA"} ${n}. ${esperado} (${segundos} s)\n      ${hechos.join("\n      ")}`);
}

// ================================================================ VISITANTE (sin sesión)
let loteElegido = null;

await paso(1, "visitante", "El asistente entiende «lote en Subtanjalla de menos de 80 mil soles» y recomienda lotes", "asistente", async (v, nota) => {
  await salir();
  await ir("/inmuebles");
  await page.type("#frase-asistente", "lote en Subtanjalla de menos de 80 mil soles");
  await pulsar("Buscar", true, "[data-asistente]");
  await page.waitForSelector('[aria-label="Lo que entendió el asistente"]', { timeout: 20000 });
  await listo();
  await espera(800);
  const t = await texto();
  for (const e of ["Lotes o terrenos", "En Subtanjalla", "Hasta S/ 80,000"]) v(t.includes(e), `etiqueta «${e}»`);
  const total = t.match(/Mostrando \d+–\d+ de (\d+) inmuebles?/)?.[1];
  datos.asistenteResultados = Number(total ?? 0);
  v(Number(total) > 0, `${total} resultados`);
  nota(`URL: ${await page.evaluate(() => location.hash)}`);
  v(!/compra segura|saneado|garantizad/i.test(t), "ningún texto promete compra segura ni saneamiento");
});

await paso(2, "visitante", "Filtra por estado Disponible y ordena por precio; las tarjetas no muestran la partida completa", "filtros", async (v, nota) => {
  await page.select("#f-comercial", "DISPONIBLE");
  await listo();
  await espera(600);
  const opciones = await page.$$eval("#orden-inmuebles option", (o) => o.map((x) => [x.value, x.textContent]));
  const barato = opciones.find(([, t]) => /^Precio: de menor a mayor/.test(t.trim()));
  v(!!barato, "hay orden «Precio: de menor a mayor»");
  if (barato) await page.select("#orden-inmuebles", barato[0]);
  await listo();
  await espera(600);
  const t = await texto();
  nota(`orden: «${barato?.[1] ?? "sin opción de precio"}»; ${t.match(/Mostrando [^\n]+/)?.[0] ?? ""}`);
  const hash = await page.evaluate(() => location.hash);
  v(hash.includes("estadoComercial=DISPONIBLE") && hash.includes("orden=precio"), "filtro y orden quedan en la URL");
  const etiquetas = await page.$$eval("article", (a) => a.map((x) => x.innerText));
  v(etiquetas.length > 0 && etiquetas.every((x) => !x.includes("Separado") && !x.includes("Vendido")), `${etiquetas.length} tarjetas, todas disponibles`);
  // Sin sesión ninguna tarjeta muestra un número de partida completo (etapa 7).
  await ir("/inmuebles?tipo=VIVIENDA");
  const casos = await page.$$eval("article", (a) => a.map((x) => x.innerText));
  const completos = casos.filter((x) => /N\.° \d{8}\b/.test(x));
  v(casos.length > 0 && completos.length === 0, `${casos.length} tarjetas de casos, ${completos.length} con la partida completa`);
  nota(`ejemplo: «${casos[0]?.match(/N\.° \S+/)?.[0] ?? "?"}»`);
});

await paso(3, "visitante", "Abre el plano de Altos de Ventisca y elige un lote disponible", "plano", async (v, nota) => {
  await ir("/proyectos/altos-de-ventisca");
  const t = await texto();
  v(t.includes("Plano de lotes"), "plano de lotes");
  v(t.includes("1111••••") && !t.includes("11112001"), "la partida matriz se ve oculta («1111••••»)");
  loteElegido = await page.evaluate(() => {
    const g = [...document.querySelectorAll("[data-lote][data-estado=DISPONIBLE]")];
    const c = g.find((x) => x.dataset.lote === "C-12") ?? g[0];
    c?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return c?.dataset.lote ?? null;
  });
  await espera(500);
  v(!!loteElegido, `lote elegido: ${loteElegido}`);
  const panel = await page.$eval(`[data-panel-lote="${loteElegido}"]`, (p) => p.innerText.replace(/[  ]/g, " ")).catch(() => "");
  v(/S\/ ?[\d,]+/.test(panel) && /m²/.test(panel), "el panel muestra precio y área");
  nota(panel.split("\n").slice(0, 6).join(" · "));
  const doc = await pdfSinSesion("/api/v1/publico/proyectos/altos-de-ventisca/documentos/PLANO_PERIMETRICO");
  const tp = textoPdf(doc.buf);
  v(doc.status === 200 && !tp.includes("11112001") && tp.includes("1111"), "el PDF de la partida matriz, sin sesión, oculta el número");
});

await paso(4, "visitante", "Abre la ficha del lote: precio, usos que suelen permitirse y documentos", "ficha-lote", async (v, nota) => {
  await ir(`/proyectos/altos-de-ventisca/lotes/${loteElegido}`);
  const t = await texto();
  v(t.includes("Usos que suelen permitirse"), "usos del lote");
  v(t.includes("Verifica el certificado de parámetros urbanísticos"), "aviso de parámetros urbanísticos");
  v(t.includes("Indicador A de la partida matriz del proyecto"), "indicador A rotulado como de la partida matriz");
  v(t.includes("Solicitar cita"), "botón «Solicitar cita»");
  nota(t.match(/S\/ [\d,]+/)?.[0] ?? "");
});

await paso(5, "visitante", `Solicita una visita al lote con los datos de datos-cita.md (${VISITANTE.nombre}, correo @example.com)`, "solicitar-cita", async (v, nota) => {
  await pulsar("Solicitar cita");
  await page.waitForSelector("input[name=modalidad]");
  await page.evaluate(() => [...document.querySelectorAll("input[name=modalidad]")]
    .find((x) => x.closest("label")?.innerText.includes("Visita al lote"))?.click());
  const f1 = await campo("Primera fecha");
  datos.fechaCita = fechaLima(2);
  await fijar(f1, datos.fechaCita);
  await page.type("input[autocomplete=given-name]", VISITANTE.nombre);
  await page.evaluate(() => [...document.querySelectorAll("input[name=medio]")].find((x) => x.closest("label")?.innerText.includes("Correo"))?.click());
  await espera(200);
  await page.type("input[autocomplete=email]", VISITANTE.correo);
  await page.evaluate(() => {
    const s = [...document.querySelectorAll("select")].find((x) => [...x.options].some((o) => o.value === "FINANCIADO"));
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    setter.call(s, "FINANCIADO");
    s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.type("input[inputmode=numeric]", "45000");
  await page.type("form textarea", "Quisiera ver el lote con mi familia un sábado por la mañana.");
  await page.evaluate(() => document.querySelector("[role=dialog] input[type=checkbox], form input[type=checkbox]")?.click());
  await espera(200);
  await pulsar("Enviar solicitud", true);
  await page.waitForSelector("[data-solicitar-cita] [role=status]", { timeout: 15000 });
  const msg = await page.$eval("[data-solicitar-cita] [role=status]", (x) => x.innerText);
  v(msg.length > 0, `mensaje: «${msg}»`);
  nota(`fecha propuesta ${datos.fechaCita}, mañana`);
});

// ================================================================ ASESOR
await paso(6, "asesor-01", "Carga el CSV del kit (80 lotes) en Horizonte de Los Aquijes: vista previa sin errores y confirmación", "carga-csv", async (v, nota) => {
  await ingresar("asesor-01");
  await ir("/proyectos/horizonte-de-los-aquijes/carga");
  const entrada = await page.waitForSelector("input[type=file][aria-label='Archivo CSV de lotes']");
  await entrada.uploadFile(CSV_KIT);
  await conTexto("Confirmar 80 lotes");
  const t = await texto();
  nota(t.match(/80 [^\n]*nuev[^\n]*/i)?.[0] ?? "vista previa lista");
  await pulsar("Confirmar 80 lotes", true);
  await page.waitForFunction(() => /se guardaron|guardad|cargad/i.test(document.body.innerText), { timeout: 20000 });
  const p = (await apiSesion("GET", "/proyectos")).body.find((x) => x.codigo === "horizonte-de-los-aquijes");
  v(p?.lotes === 80, `el proyecto tiene ${p?.lotes} lotes (${p?.publicados} publicados)`);
  const pub = (await apiSesion("GET", "/publico/proyectos/horizonte-de-los-aquijes")).body;
  v((pub?.lotes?.length ?? 0) === 80, `la página pública del proyecto muestra ${pub?.lotes?.length} lotes`);
});

await paso(7, "asesor-01", `Registra el particular ${NUEVO} pegando el texto del kit (propietario-02, vivienda); nace en borrador y gris`, "registro-particular", async (v, nota) => {
  await ir("/casos/nueva");
  await desplegable("Origen de la partida", "Registro interno de cartera");
  await escribir("Número de partida", NUEVO);
  await escribir("Precio referencial", "285000");
  await escribir("Denominación del predio", "Mz. K Lote 9 · Urb. Los Viñedos de Ica · Ica");
  await (await campo("Titularidad comercial")).select("PARTICULAR");
  await escribir("Código de cuenta del propietario", "propietario-02");
  await escribir("Distrito", "Ica, Ica");
  await escribir("Ubicación", "Mz. K, Lote 9, Urbanización Los Viñedos de Ica, distrito de Ica.");
  const area = await campo("Texto de la partida");
  await fijar(area, TEXTO_NUEVO).catch(async () => {
    await area.evaluate((el, x) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
      setter.call(el, x);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, TEXTO_NUEVO);
  });
  await pulsar("Leer asientos");
  const t = await texto();
  v(!t.includes("Avisos de la lectura"), "la lectura no deja avisos");
  await page.select("#bt-tipo", "VIVIENDA");
  await page.waitForSelector("#bt-area-inscrita");
  await page.type("#bt-area-inscrita", "120");
  v((await texto()).includes("No se detectó ningún nombre de persona"), "la vista previa no detecta nombres de personas");
  await page.evaluate(() => [...document.querySelectorAll("label")].find((l) => l.innerText.includes("Revisé la vista previa"))?.querySelector("input")?.click());
  await espera(200);
  await page.evaluate(() => document.querySelector("form button[type=submit]").click());
  await page.waitForFunction((c) => location.hash === `#/casos/${c}`, { timeout: 15000 }, NUEVO).catch(async () => {
    throw new Error(`No navegó al caso: ${(await texto()).match(/No se registró[^\n]*\n[^\n]*/)?.[0] ?? "sin mensaje"}`);
  });
  await listo();
  const d = (await apiSesion("GET", `/casos/${NUEVO}`)).body;
  v(d.publicacion.estado === "BORRADOR" && !d.publicacion.autorizada, "borrador y sin autorización");
  v(d.publicacion.propietarioCodigo === "propietario-02", "propietario-02");
  v(d.evaluacion?.estado === "GRIS", `A = ${d.evaluacion?.estado} (sin planos)`);
  v(d.expediente.asientos.length === 2, `${d.expediente.asientos.length} asientos leídos`);
});

await paso(8, "asesor-01", "Sube las 4 láminas del kit en el expediente; el indicador A pasa a verde", "laminas-kit", async (v, nota) => {
  await ir(`/casos/${NUEVO}`);
  for (const [esp, archivo] of Object.entries(LAMINAS)) {
    const input = await page.waitForSelector(`#plano-pdf-${esp}`);
    await input.uploadFile(path.join(KIT, "pdf", NUEVO, archivo));
    await espera(300);
    await page.evaluate((e) => {
      const li = document.querySelector(`li[data-especialidad="${e}"]`);
      [...(li?.querySelectorAll("button") ?? [])].find((x) => !x.disabled && /Subir PDF|Reemplazar PDF/.test(x.innerText))?.click();
    }, esp);
    await page.waitForFunction((e) => /Subido por/.test(document.querySelector(`li[data-especialidad="${e}"]`)?.innerText ?? ""), { timeout: 15000 }, esp)
      .catch(() => nota(`${esp}: sin «Subido por» en pantalla`));
  }
  const d = (await apiSesion("GET", `/casos/${NUEVO}`)).body;
  v(d.expediente.planos.every((p) => p.estado === "PRESENTADO"), "los 4 planos quedan presentados");
  v(d.evaluacion?.estado === "VERDE", `A = ${d.evaluacion?.estado}`);
  await ir(`/casos/${NUEVO}`);
});

await paso(9, "propietario-02", "El propietario autoriza la publicación de su inmueble", "propietario-autoriza", async (v) => {
  await ingresar("propietario-02");
  await ir(`/casos/${NUEVO}`);
  await pulsar("Autorizar publicación", true);
  await conTexto("Autorización registrada.");
  const d = (await apiSesion("GET", `/casos/${NUEVO}`)).body;
  v(d.publicacion.autorizada && d.publicacion.estado === "BORRADOR", "autorizado y todavía en borrador");
});

await paso(10, "asesor-01", "Publica; el inmueble aparece en el portal con la partida oculta y A no cambia", "publica", async (v) => {
  await ingresar("asesor-01");
  await ir(`/casos/${NUEVO}`);
  const antes = (await apiSesion("GET", `/casos/${NUEVO}`)).body.evaluacion?.estado;
  await pulsar("Publicar", true);
  await page.waitForFunction(() => /Publicado/.test(document.body.innerText), { timeout: 15000 });
  const d = (await apiSesion("GET", `/casos/${NUEVO}`)).body;
  v(d.publicacion.estado === "PUBLICADO", "publicado");
  v(d.evaluacion?.estado === antes, `A sigue en ${antes}`);
  await salir();
  await ir(`/inmuebles/${NUEVO}`);
  const t = await texto();
  v(t.includes("Partida N.° INT-••••") && !t.includes("INT-99000611 "), "la ficha pública muestra «INT-••••»");
  const pdf = await pdfSinSesion(`/api/v1/publico/inmuebles/${NUEVO}/documento`);
  v(pdf.status === 200 && !textoPdf(pdf.buf).includes("99000611"), "la ficha registral pública no trae el número completo");
});

await paso(11, "asesor-01", `Abre a ${VISITANTE.nombre} en Interesados y confirma su cita: pasa a «Cita agendada»`, "confirma-cita", async (v, nota) => {
  await ingresar("asesor-01");
  await ir("/interesados");
  const abierto = await page.evaluate((n) => {
    const b = [...document.querySelectorAll("ul button")].find((x) => x.innerText.split(String.fromCharCode(10))[0].trim() === n);
    b?.click();
    return !!b;
  }, VISITANTE.nombre);
  if (!abierto) throw new Error(`No aparece ${VISITANTE.nombre} en la bandeja`);
  await page.waitForSelector("[data-cita]");
  await espera(400);
  const titulo = await page.$eval("[role=dialog] h2, [role=dialog] h3", (h) => h.innerText).catch(() => "");
  v(titulo.includes(VISITANTE.nombre), `ficha abierta: ${titulo}`);
  await page.evaluate(() => [...document.querySelectorAll("[data-cita] button")].find((x) => x.innerText.startsWith("Confirmar"))?.click());
  await conTexto("Cita confirmada.");
  const lista = (await apiSesion("GET", "/interesados")).body;
  const i = lista.find((x) => x.contacto === VISITANTE.correo);
  datos.interesadoId = i?.id;
  v(i?.etapa === "CITA_AGENDADA", `etapa: ${i?.etapaEtiqueta}`);
  v(i?.loteClave === loteElegido && i?.proyectoCodigo === "altos-de-ventisca", `vinculado a ${i?.proyectoCodigo} ${i?.loteClave}`);
  const det = (await apiSesion("GET", `/interesados/${i?.id}`)).body;
  v(det?.citas?.[0]?.estado === "CONFIRMADA", `cita ${det?.citas?.[0]?.estadoEtiqueta} para ${det?.citas?.[0]?.fechaAcordada}`);
  nota(`total de interesados: ${lista.length}`);
});

await paso(12, "asesor-01", "Lo lleva a «Visita realizada» y «Separación» y marca el lote como separado", "separacion", async (v) => {
  for (const etapa of ["VISITA_REALIZADA", "SEPARACION"]) {
    await page.evaluate((e) => {
      const s = [...document.querySelectorAll("[role=dialog] select")].find((x) => [...x.options].some((o) => o.value === e));
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
      setter.call(s, e);
      s.dispatchEvent(new Event("change", { bubbles: true }));
    }, etapa);
    await page.waitForFunction((e) => [...document.querySelectorAll("[role=dialog] select")].some((x) => x.value === e && !x.disabled), { timeout: 15000 }, etapa);
    await espera(500);
  }
  await pulsar("Marcar el lote separado", false, "[role=dialog]");
  await espera(800);
  const i = (await apiSesion("GET", `/interesados/${datos.interesadoId}`)).body;
  v(i?.interes?.etapa === "SEPARACION", `etapa: ${i?.interes?.etapaEtiqueta}`);
  v(i?.notas?.length >= 2, `${i?.notas?.length} notas automáticas de los cambios`);
  const pub = (await apiSesion("GET", "/publico/proyectos/altos-de-ventisca")).body;
  const l = pub.lotes.find((x) => x.clave === loteElegido);
  v(l?.estadoComercial === "SEPARADO", `el lote ${loteElegido} aparece ${l?.estadoComercialEtiqueta} en el plano`);
  const matriz = (await apiSesion("GET", "/casos/11112001")).body;
  v(matriz?.evaluacion?.estado === "VERDE", `el indicador A de la partida matriz sigue en ${matriz?.evaluacion?.estado}`);
});

await paso(13, "visitante", "Pie con el aviso legal y la versión 1.0.0", "pie-version", async (v) => {
  await salir();
  await ir("/inmuebles");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await espera(400);
  const t = await texto();
  for (const l of LIMITES) v(t.includes(l), `«${l}»`);
  v(t.includes("Trustinmuebles · versión 1.0.0"), "versión 1.0.0 en el pie");
  const s = await (await fetch("http://127.0.0.1:8080/api/v1/publico/sitio")).json();
  v(s.version === "1.0.0" && s.indexable === false, `/publico/sitio: versión ${s.version}, indexable ${s.indexable}`);
});

// ================================================================ TABLETA (etapa 8)
// Las pantallas del guion en una tableta vertical (820 x 1180) y horizontal (1180 x 820): barra con la marca, sin
// desplazamiento horizontal y una captura por pantalla en capturas-tableta/.
const SHOTS_TABLETA = path.join(AQUI, "capturas-tableta");
mkdirSync(SHOTS_TABLETA, { recursive: true });
for (const f of readdirSync(SHOTS_TABLETA)) if (f.endsWith(".png")) rmSync(path.join(SHOTS_TABLETA, f));
const tableta = [];
const guionSegundos = Number(pasos.reduce((s, p) => s + Number(p.segundos), 0).toFixed(1));
const PANTALLAS = [
  { nombre: "portada", ruta: "/", sesion: null, espera: "inmuebles publicados" },
  { nombre: "inmuebles", ruta: "/inmuebles", sesion: null, espera: "Asistente de búsqueda" },
  { nombre: "plano", ruta: "/proyectos/altos-de-ventisca", sesion: null, espera: "Plano de lotes" },
  { nombre: "ficha-lote", ruta: () => `/proyectos/altos-de-ventisca/lotes/${loteElegido ?? "C-12"}`, sesion: null, espera: "Usos que suelen permitirse" },
  { nombre: "interesados", ruta: "/interesados", sesion: "asesor-01", espera: "Registrar interesado" },
  { nombre: "registrar-interesado", ruta: "/interesados", sesion: "asesor-01", espera: "Registrar interesado", accion: async () => {
    await pulsar("Registrar interesado");
    await page.waitForSelector("[data-formulario-panel]", { timeout: 10000 });
  } },
];
for (const o of [{ orientacion: "vertical", width: 820, height: 1180 }, { orientacion: "horizontal", width: 1180, height: 820 }]) {
  await page.setViewport({ width: o.width, height: o.height, isMobile: false, hasTouch: true });
  let sesionActual = null;
  await salir();
  for (const [k, s] of PANTALLAS.entries()) {
    const hechos = [];
    let ok = true;
    const t0 = Date.now();
    try {
      if (s.sesion !== sesionActual) { if (s.sesion) await ingresar(s.sesion); else await salir(); sesionActual = s.sesion; }
      await ir(typeof s.ruta === "function" ? s.ruta() : s.ruta);
      await conTexto(s.espera);
      if (s.accion) await s.accion();
      await espera(500);
      const m = await page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, vista: window.innerWidth,
        marca: !!document.querySelector("[data-marca] img[src*=ledcons-logo]"), texto: document.body.innerText }));
      if (m.ancho > m.vista + 1) { ok = false; hechos.push(`NO: desplazamiento horizontal (${m.ancho} px en ${m.vista} px)`); }
      else hechos.push(`sin desplazamiento horizontal (${m.ancho} px)`);
      if (!m.marca) { ok = false; hechos.push("NO: la barra no muestra el logo de LEDCONS"); } else hechos.push("barra con el logo de LEDCONS");
      if (/compra segura|saneado|garantizad/i.test(m.texto)) { ok = false; hechos.push("NO: texto que promete compra segura"); }
    } catch (e) { ok = false; hechos.push(`Error: ${e.message.split("\n")[0]}`); }
    const captura = `${o.orientacion}-${String(k + 1).padStart(2, "0")}-${s.nombre}.png`;
    await page.screenshot({ path: path.join(SHOTS_TABLETA, captura) }).catch(() => {});
    const segundos = ((Date.now() - t0) / 1000).toFixed(1);
    tableta.push({ orientacion: o.orientacion, ventana: `${o.width} x ${o.height}`, pantalla: s.nombre, ok, obtenido: hechos.join("; "), captura, segundos });
    console.log(`${ok ? "OK   " : "FALLA"} tableta ${o.orientacion} · ${s.nombre} (${segundos} s)\n      ${hechos.join("\n      ")}`);
  }
}

// ---------------------------------------------------------------- cierre
await browser.close();
const total = ((Date.now() - inicio) / 1000).toFixed(0);
const resultado = {
  fecha: new Date().toISOString(), version: "1.0.0", totalSegundos: Number(total), guionSegundos,
  correctos: pasos.filter((p) => p.ok).length, pasos: pasos.length,
  tableta: { correctas: tableta.filter((t) => t.ok).length, pantallas: tableta.length, detalle: tableta },
  erroresConsola: errores, respuestas409o500: respuestasError,
  datos, detalle: pasos,
};
writeFileSync(path.join(AQUI, "RESULTADO-recorrido-v10.json"), JSON.stringify(resultado, null, 2));
console.log(`\n${resultado.correctos} de ${resultado.pasos} pasos correctos; guion en ${guionSegundos} s (total con arranque ${total} s). Tableta: ${resultado.tableta.correctas} de ${resultado.tableta.pantallas} pantallas. Errores de consola: ${errores.length}. Respuestas 409/500: ${respuestasError.length}.`);
apagar();
await espera(1500);
try { rmSync(DATOS, { recursive: true, force: true }); } catch { /* Windows puede retener algún archivo un momento */ }
console.log("Backend, interfaz y navegador apagados; base temporal eliminada.");
process.exit(resultado.correctos === resultado.pasos && resultado.tableta.correctas === resultado.tableta.pantallas ? 0 : 1);
