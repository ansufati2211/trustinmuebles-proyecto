// Recorrido de uso de la versión actual de main (v0.9 + fotos + «Version real», commit d7803f8). Documenta lo que hay,
// no lo corrige: los pasos 1 a 21 del guion (adaptados a los códigos sin SIM-), los pasos de la v0.9 (Santiago, Huarmey,
// Supe, propietario-03) y la descarga de los PDF. Una captura por paso; un paso en FALLA se registra y el recorrido sigue.
// Requisitos: backend con una base NUEVA, interfaz en http://localhost:5173 y Google Chrome. puppeteer-core es una
// devDependency de trustinmuebles.
// Uso: APP_SEED_PASSWORD=<la del backend> node docs/pruebas/uso-v09/recorrido-v09.mjs
// Genera docs/pruebas/uso-v09/capturas/ y docs/pruebas/uso-v09/RESULTADO-recorrido-v09.json (datos para el reporte).
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, "..", "..", "..");
const require = createRequire(path.join(RAIZ, "trustinmuebles", "package.json"));
const puppeteer = require("puppeteer-core");

const CLAVE = process.env.APP_SEED_PASSWORD;
if (!CLAVE) { console.error("Define APP_SEED_PASSWORD con la contraseña de las cuentas de prueba."); process.exit(2); }
const SHOTS = path.join(AQUI, "capturas");
mkdirSync(SHOTS, { recursive: true });
const BASE = "http://localhost:5173/#";
const NUEVO = "SIM-99000404";
const VERDE = "11048217";
const TINGUINA = "11052690";
const ROJO = "11075836";
const SANTIAGO = "11081204";
const HUARMEY = "11045763";
const SUPE = "80194645";
const CUENTAS = ["comprador-01", "revisor-01", "especialista-01", "especialista-02", "gestor-01", "propietario-01",
  "propietario-02", "propietario-03"];
const LIMITES = ["No certifica saneamiento.", "No recomienda comprar.", "No reemplaza asesoría legal.",
  "La información presentada es referencial y se basa en los documentos registrados en cada expediente.",
  "La verificación jurídica con abogado o notario se realiza fuera del sistema."];
const PARTIDA = "C00001\nCompraventa a favor de Inmobiliaria Demo Sur S.A.C. (100 %).";

// ---------------------------------------------------------------- PDF de la demo, con scripts/generar-pdf-demo.mjs
const TMP = mkdtempSync(path.join(os.tmpdir(), "recorrido-v09-"));
execSync(`node "${path.join(RAIZ, "scripts", "generar-pdf-demo.mjs")}" "${TMP}"`, { stdio: "inherit" });
const PDF_CHICO = path.join(TMP, "plano-chico.pdf");
const PDF_GRANDE = path.join(TMP, "plano-escaneado-grande.pdf");
const MB = (b) => (b / 1048576).toFixed(1).replace(".", ",");

// ---------------------------------------------------------------- texto de un PDF (fuentes Standard 14, WinAnsi)
/** Descomprime los flujos del PDF y junta las cadenas literales: basta para buscar títulos, pies y marcas de agua. */
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
      try { flujos.push(zlib.inflateRawSync(datosFlujo.subarray(2), { finishFlush: zlib.constants.Z_SYNC_FLUSH }).toString("latin1")); } catch { /* no es Flate */ }
    }
    re.lastIndex = fin;
  }
  const todo = crudo + "\n" + flujos.join("\n");
  const cadenas = [];
  // Cadenas que se dibujan con Tj: literales «(…)» o hexadecimales «<…>» (PDFBox usa hex si hay acentos o «·»).
  const lit = /(\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f\s]+>)\s*Tj/g;
  while ((m = lit.exec(todo))) {
    const s = m[1];
    if (s.startsWith("<")) { cadenas.push(Buffer.from(s.slice(1, -1).replace(/\s/g, ""), "hex").toString("latin1")); continue; }
    cadenas.push(s.slice(1, -1).replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, x) =>
      /^[0-7]+$/.test(x) ? String.fromCharCode(parseInt(x, 8)) : ({ n: "\n", r: "\r", t: "\t", b: "", f: "" }[x] ?? x)));
  }
  const titulo = (() => {
    const t = /\/Title\s*(\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f]+>)/.exec(todo)?.[1];
    if (!t) return null;
    if (t.startsWith("<")) {
      const b = Buffer.from(t.slice(1, -1), "hex");
      return b[0] === 0xfe && b[1] === 0xff ? b.subarray(2).swap16().toString("utf16le") : b.toString("latin1");
    }
    const s = t.slice(1, -1).replace(/\\([()\\])/g, "$1");
    return s.startsWith("\xfe\xff") ? Buffer.from(s.slice(2), "latin1").swap16().toString("utf16le") : s;
  })();
  return { titulo, cadenas, texto: cadenas.join(" | ") };
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errores = [];
const respuestasError = [];
page.on("pageerror", (e) => errores.push(e.message));
page.on("console", (m) => { if (m.type() === "error" && !/40[0134]|409|413|422|Failed to load resource/.test(m.text())) errores.push(m.text()); });
page.on("response", (r) => { if ([409, 500].includes(r.status())) respuestasError.push(`${r.status()} ${r.request().method()} ${r.url()}`); });

// Intl separa «S/» del importe con un espacio de no separación: se normaliza a un espacio común.
const texto = () => page.evaluate(() => document.body.innerText.replace(/[  ]/g, " "));
const conTexto = (t, timeout = 20000) => page.waitForFunction((x) => document.body.innerText.replace(/[  ]/g, " ").includes(x), { timeout }, t);
const listo = () => page.waitForFunction(() => !/Cargando/.test(document.body.innerText), { timeout: 20000 });
const ir = async (ruta) => { await page.goto(BASE + ruta, { waitUntil: "networkidle0" }); await listo(); await espera(400); };

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

/** Llamada directa al servidor con la sesión actual. */
const apiSesion = (metodo, ruta, cuerpo) => page.evaluate(async (m, r, c) => {
  const res = await fetch("/api/v1" + r, { method: m,
    headers: { Authorization: "Bearer " + sessionStorage.getItem("tm_token"), ...(c ? { "Content-Type": "application/json" } : {}) },
    body: c ? JSON.stringify(c) : undefined });
  let cuerpoResp = null;
  try { cuerpoResp = await res.json(); } catch { /* sin cuerpo */ }
  return { status: res.status, body: cuerpoResp };
}, metodo, ruta, cuerpo ?? null);

/** Descarga un PDF con la sesión actual y lo devuelve como Buffer. */
const pdfSesion = async (ruta) => {
  const r = await page.evaluate(async (x) => {
    const res = await fetch("/api/v1" + x, { headers: { Authorization: "Bearer " + sessionStorage.getItem("tm_token") } });
    const b = new Uint8Array(await res.arrayBuffer());
    let s = "";
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
    return { status: res.status, tipo: res.headers.get("content-type"), b64: btoa(s) };
  }, ruta);
  return { ...r, buf: Buffer.from(r.b64, "base64") };
};

const campo = (etiqueta) => page.evaluateHandle((t) => {
  const l = [...document.querySelectorAll("label")].find((x) => x.textContent.trim().startsWith(t));
  return l ? document.getElementById(l.htmlFor) : null;
}, etiqueta);
const escribir = async (etiqueta, valor) => (await campo(etiqueta)).type(valor);

async function pulsar(textoBoton, exacto = false) {
  const ok = await page.evaluate((t, ex) => {
    const b = [...document.querySelectorAll("button")].filter((x) => !x.disabled)
      .find((x) => (ex ? x.innerText.trim() === t : x.innerText.includes(t)));
    b?.click();
    return !!b;
  }, textoBoton, exacto);
  if (!ok) throw new Error(`No hay un botón activo «${textoBoton}»`);
  await espera(300);
}
const hayBoton = (t) => page.evaluate((x) => [...document.querySelectorAll("button")].some((b) => b.innerText.trim() === x), t);

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
const opcionesDe = (etiqueta) => page.evaluate((e) => {
  const s = [...document.querySelectorAll("span")].find((x) => x.textContent.trim() === e && x.id.endsWith("-etiqueta"));
  return s ? [...s.parentElement.querySelectorAll("[role=option]")].map((x) => x.textContent.trim()) : [];
}, etiqueta);

async function subirPlanoUI(especialidad, archivo) {
  const input = await page.waitForSelector(`#plano-pdf-${especialidad}`);
  await input.uploadFile(archivo);
  await espera(300);
  const ok = await page.evaluate((e) => {
    const li = document.querySelector(`li[data-especialidad="${e}"]`);
    const b = li && [...li.querySelectorAll("button")].find((x) => !x.disabled && /Subir PDF|Reemplazar PDF/.test(x.innerText));
    b?.click();
    return !!b;
  }, especialidad);
  if (!ok) throw new Error(`No hay botón para subir el PDF de ${especialidad}`);
}

const verPie = async () => { const t = await texto(); return LIMITES.filter((l) => !t.includes(l)); };

const pasos = [];
const datos = {};
async function paso(n, cuenta, esperado, nombre, fn) {
  const hechos = [];
  let ok = true;
  const v = (cond, desc) => { hechos.push(`${cond ? "" : "NO: "}${desc}`); if (!cond) ok = false; };
  const nota = (desc) => hechos.push(desc);
  try {
    await fn(v, nota);
  } catch (e) {
    ok = false;
    hechos.push(`Error: ${e.message.split("\n")[0]}`);
  }
  const captura = `${String(n).padStart(2, "0")}-${nombre}.png`;
  await page.screenshot({ path: path.join(SHOTS, captura), fullPage: true }).catch(() => {});
  pasos.push({ n, cuenta, esperado, obtenido: hechos.join("; "), ok, captura });
  console.log(`${ok ? "OK   " : "FALLA"} ${n}. ${esperado}\n      ${hechos.join("\n      ")}`);
}

// ================================================================ 1. Login de las 8 cuentas
await paso(1, "las 8 cuentas", "Login escribiendo el código (sin tarjetas de cuentas); las 8 cuentas entran", "login-8-cuentas", async (v, nota) => {
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  const t = await texto();
  v(!t.includes("Consulta e inspección") && !t.includes("Edición y registro"), "el login no muestra tarjetas de cuentas");
  datos.login = {
    h1: await page.$eval("h1", (h) => h.innerText.trim()).catch(() => null),
    lineas: t.split("\n").map((x) => x.trim()).filter((x) => /Plataforma|Ingresa con|Transparencia total|Revisa partidas|Especialista colegiado|Partida N/.test(x)),
  };
  nota(`textos: ${datos.login.lineas.join(" / ")}`);
  for (const c of CUENTAS) {
    try {
      await ingresar(c);
      const yo = await apiSesion("GET", "/auth/me").catch(() => null);
      v(true, `${c} entra (${await page.evaluate(() => location.hash)}${yo?.body?.rol ? `, rol ${yo.body.rol}` : ""})`);
    } catch (e) { v(false, `${c}: ${e.message.split("\n")[0]}`); }
  }
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: "networkidle0" });
});

// ================================================================ 2. Catálogo del comprador
await paso(2, "comprador-01", "Catálogo: 12 casos, códigos sin SIM-, fotos con rótulo y color de A con texto", "catalogo-comprador", async (v, nota) => {
  await ingresar("comprador-01");
  await ir("/casos");
  const lista = (await apiSesion("GET", "/casos")).body;
  const tarjetas = await page.evaluate(() => [...document.querySelectorAll("article")].map((a) => ({
    texto: a.innerText, img: a.querySelector("img")?.getAttribute("src") ?? null,
    rotulo: a.innerText.includes("Imagen referencial"), resaltado: a.dataset.resaltado ?? null,
  })));
  v(lista.length === 12 && tarjetas.length === 12, `${lista.length} casos en el servidor, ${tarjetas.length} tarjetas`);
  v(lista.every((c) => !c.codigo.startsWith("SIM-")), `códigos: ${lista.map((c) => c.codigo).join(", ")}`);
  const conFoto = tarjetas.filter((x) => x.img);
  v(conFoto.length === 12 && conFoto.every((x) => x.rotulo), `${conFoto.length} tarjetas con foto, todas con el rótulo «Imagen referencial»`);
  datos.catalogo = lista.map((c) => ({ codigo: c.codigo, distrito: c.predio?.distrito, estado: c.evaluacion?.estado ?? c.estado,
    precio: c.predio?.precioReferencial, moneda: c.predio?.moneda }));
  nota(`colores A: ${datos.catalogo.map((c) => `${c.codigo}=${c.estado}`).join(", ")}`);
  // Las fotos usan loading="lazy": se recorre la lista para que el navegador las pida todas.
  for (const a of await page.$$("article")) { await a.scrollIntoView(); await espera(250); }
  await page.waitForFunction(() => [...document.querySelectorAll("article img")].every((i) => i.complete), { timeout: 20000 }).catch(() => {});
  const fotos = await page.evaluate(() => [...document.querySelectorAll("article img")].map((i) => i.complete && i.naturalWidth > 0));
  datos.fotos = await page.evaluate(() => [...document.querySelectorAll("article img")].map((i) => i.getAttribute("src")));
  await page.evaluate(() => window.scrollTo(0, 0));
  v(fotos.every(Boolean), `${fotos.filter(Boolean).length} de ${fotos.length} fotos cargadas`);
});

// ================================================================ 3. Registrar SIM-99000404
await paso(3, "revisor-01", `Registra ${NUEVO} (origen interno, exige SIM-) con propietario-02; nace en borrador y gris`, "registro-borrador", async (v, nota) => {
  await ingresar("revisor-01");
  await ir("/casos/nueva");
  datos.origenes = await opcionesDe("Origen de la partida");
  nota(`opciones de origen: ${datos.origenes.join(" / ")}`);
  await desplegable("Origen de la partida", "Registro interno de cartera");
  await escribir("Número de partida", "99000404");
  await espera(200);
  datos.mensajeSinSim = (await texto()).split("\n").find((l) => /Código interno|Ocho dígitos/.test(l)) ?? null;
  nota(`con «99000404» sin SIM-: ${datos.mensajeSinSim ? `«${datos.mensajeSinSim}»` : "sin mensaje de error"}`);
  const n = await campo("Número de partida");
  await n.focus();
  for (let i = 0; i < 12; i++) await page.keyboard.press("Backspace");
  await n.type(NUEVO);
  await escribir("Precio referencial", "150000");
  await escribir("Denominación del predio", "Mz. Z Lote 4 · Hab. Urb. Demostración · Ica");
  await escribir("Código de cuenta del propietario", "propietario-02");
  await escribir("Distrito", "Ica, Ica");
  await escribir("Ubicación", "Mz. Z, Lote 4, distrito de Ica.");
  await escribir("Área (m²)", "160");
  await escribir("Texto de la partida", PARTIDA);
  await pulsar("Leer asientos");
  await page.select("#bt-tipo", "VIVIENDA");
  await page.waitForSelector("#bt-area-inscrita");
  await page.type("#bt-area-inscrita", "90");
  await page.evaluate(() => document.querySelector("label input[type=checkbox]").click());
  await espera(200);
  await page.evaluate(() => document.querySelector("form button[type=submit]").click());
  await page.waitForFunction((c) => location.hash === `#/casos/${c}`, { timeout: 15000 }, NUEVO).catch(async () => {
    throw new Error(`No navegó al caso: ${(await texto()).match(/No se registró[^\n]*\n[^\n]*/)?.[0] ?? "sin mensaje"}`);
  });
  await listo();
  const d = (await apiSesion("GET", `/casos/${NUEVO}`)).body;
  v(d.publicacion.estado === "BORRADOR" && !d.publicacion.autorizada, "borrador y sin autorización");
  v(d.publicacion.propietarioCodigo === "propietario-02", "propietario-02");
  v(d.evaluacion?.estado === "GRIS", `A = ${d.evaluacion?.estado}`);
  datos.fuenteNuevo = d.fuente;
  nota(`fuente guardada: «${d.fuente}», sintético=${d.sintetico}`);
  const sinSim = await apiSesion("POST", "/casos", { origen: "SIMULADA_DEMOSTRACION", numero: "99000405" });
  datos.apiSinSim = `${sinSim.status} ${sinSim.body?.detail ?? ""}`.trim();
  nota(`API con origen interno y número sin SIM-: ${datos.apiSinSim}`);
});

await paso(4, "comprador-01", "No ve el borrador en el catálogo ni por URL", "comprador-no-ve-borrador", async (v) => {
  await ingresar("comprador-01");
  await ir("/casos");
  v((await page.$$("article")).length === 12, "catálogo con 12 casos");
  v(!(await texto()).includes(NUEVO), `${NUEVO} ausente`);
  await ir(`/casos/${NUEVO}`);
  v((await texto()).includes("No encontramos este expediente"), "por URL: «No encontramos este expediente»");
  v((await apiSesion("GET", `/casos/${NUEVO}`)).status === 404, "servidor: 404");
});

await paso(5, "propietario-01", "No ve el caso de otro propietario", "propietario-ajeno", async (v) => {
  await ingresar("propietario-01");
  await ir("/mis-inmuebles");
  v(!(await texto()).includes(NUEVO), "ausente de Mis inmuebles");
  await ir(`/casos/${NUEVO}`);
  v((await texto()).includes("No encontramos este expediente"), "por URL: «No encontramos este expediente»");
});

await paso(6, "gestor-01", "Sin botón Publicar mientras no haya autorización", "gestor-sin-autorizacion", async (v) => {
  await ingresar("gestor-01");
  await ir(`/casos/${NUEVO}`);
  v(!(await hayBoton("Publicar")), "sin botón «Publicar»");
  v((await texto()).includes("No se puede publicar hasta que el propietario autorice"), "aviso de autorización pendiente");
  v((await apiSesion("POST", `/casos/${NUEVO}/publicacion`)).status === 422, "servidor: 422");
});

await paso(7, "propietario-02", "Autoriza su caso; sigue en borrador", "propietario-autoriza", async (v) => {
  await ingresar("propietario-02");
  await ir("/mis-inmuebles");
  v((await texto()).includes(NUEVO), "el caso aparece en Mis inmuebles");
  await ir(`/casos/${NUEVO}`);
  await pulsar("Autorizar publicación", true);
  await conTexto("Autorización registrada.");
  const d = (await apiSesion("GET", `/casos/${NUEVO}`)).body;
  v(d.publicacion.autorizada && d.publicacion.estado === "BORRADOR", "autorizado y en borrador");
});

await paso(8, "revisor-01", "Indicador A gris y primera entrada del historial", "revisor-a-e-historial", async (v, nota) => {
  await ingresar("revisor-01");
  await ir(`/casos/${NUEVO}`);
  const h = (await apiSesion("GET", `/casos/${NUEVO}/historial`)).body;
  v(h.length === 1 && h[0].origen === "PARTIDA_SIMULADA", `historial: ${h.map((x) => x.origen).join(", ")}`);
  const t = await texto();
  datos.etiquetaHistorial = t.includes("Partida interna incorporada") ? "Partida interna incorporada"
    : t.includes("Partida simulada incorporada") ? "Partida simulada incorporada" : null;
  nota(`etiqueta en pantalla: «${datos.etiquetaHistorial}»`);
});

await paso(9, "revisor-01", "Sube los PDF de arquitectura y estructuras (node scripts/generar-pdf-demo.mjs): A pasa de gris a amarillo", "subsanacion-planos", async (v) => {
  await subirPlanoUI("ARQUITECTURA", PDF_CHICO);
  await conTexto("Archivo guardado.");
  await subirPlanoUI("ESTRUCTURAS", PDF_CHICO);
  await page.waitForFunction(() => document.querySelectorAll("li[data-especialidad] [role=status]").length >= 2, { timeout: 15000 }).catch(() => {});
  await espera(800);
  const d = (await apiSesion("GET", `/casos/${NUEVO}`)).body;
  v(d.evaluacion.estado === "AMARILLO", `A = ${d.evaluacion.estado}`);
  v((await texto()).includes("Subido por revisor-01"), "«Subido por revisor-01 …»");
  const h = (await apiSesion("GET", `/casos/${NUEVO}/historial`)).body;
  v(h.at(-1).estadoAnterior === "GRIS" && h.at(-1).estadoNuevo === "AMARILLO", `historial: ${h.at(-1).estadoAnterior} → ${h.at(-1).estadoNuevo}`);
});

await paso(10, "gestor-01", "Publica y A no cambia", "gestor-publica", async (v) => {
  await ingresar("gestor-01");
  await ir(`/casos/${NUEVO}`);
  const antes = (await apiSesion("GET", `/casos/${NUEVO}`)).body.evaluacion;
  await pulsar("Publicar", true);
  await conTexto("Caso publicado.");
  const d = (await apiSesion("GET", `/casos/${NUEVO}`)).body;
  v(d.publicacion.estado === "PUBLICADO", "publicado");
  v(JSON.stringify(d.evaluacion) === JSON.stringify(antes), `A idéntico: ${d.evaluacion.estado}`);
});

await paso(11, "comprador-01", `Ve ${NUEVO} con S/ 150,000; en ${ROJO} pide contacto e inspección`, "comprador-consulta", async (v) => {
  await ingresar("comprador-01");
  await ir("/casos");
  const t0 = await texto();
  v(t0.includes(NUEVO) && t0.includes("S/ 150,000"), `${NUEVO} en el catálogo con S/ 150,000 (${(await page.$$("article")).length} tarjetas)`);
  await ir(`/casos/${VERDE}`);
  const t1 = await texto();
  v(t1.includes("Ver lámina") || t1.includes("Ver plano"), `${VERDE}: planos con lámina`);
  v(t1.includes("Glosario"), `${VERDE}: glosario visible`);
  await ir(`/casos/${ROJO}`);
  await pulsar("Solicitar contacto");
  await page.waitForSelector("[role=dialog]");
  await pulsar("Enviar solicitud");
  await conTexto("Solicitud registrada el");
  await pulsar("Solicitar inspección técnica");
  await page.waitForFunction(() => document.body.innerText.includes("Confirmar solicitud"));
  await pulsar("Confirmar solicitud");
  await conTexto("a nombre de comprador-01");
  const d = (await apiSesion("GET", `/casos/${ROJO}`)).body;
  v(d.evaluacionTecnica.estado === "SOLICITADA", "inspección solicitada");
  v(d.evaluacion.estado === "ROJO", `A = ${d.evaluacion.estado}`);
  v((await texto()).includes("Pendiente de asignación por el gestor"), "«Pendiente de asignación por el gestor»");
});

await paso(12, "gestor-01", "Marca atendido el contacto y asigna especialista-02", "gestor-atiende-asigna", async (v) => {
  await ingresar("gestor-01");
  await ir("/cartera");
  await pulsar("Marcar atendida");
  await conTexto("marcada como atendida");
  v(true, "contacto atendido");
  await ir(`/casos/${ROJO}`);
  await desplegable("Cuenta del especialista", "especialista-02");
  await pulsar("Asignar", true);
  await conTexto("Inspección asignada a especialista-02");
  v((await apiSesion("GET", `/casos/${ROJO}`)).body.evaluacionTecnica.especialistaAsignadoCodigo === "especialista-02", "asignada a especialista-02");
});

await paso(13, "especialista-01", "No puede emitir: la inspección es de otro", "especialista-no-asignado", async (v) => {
  await ingresar("especialista-01");
  await ir(`/casos/${ROJO}`);
  const t = await texto();
  v(!t.includes("Guardar informe"), "sin formulario de informe");
  v(t.includes("asignada a otro especialista"), "aviso «asignada a otro especialista»");
  v((await apiSesion("PUT", `/casos/${ROJO}/inspeccion`, { estado: "EN_INSPECCION" })).status === 403, "servidor: 403");
});

await paso(14, "especialista-02", `Emite el informe; ${ROJO} sigue en rojo (anota nombre y colegiatura)`, "especialista-emite", async (v, nota) => {
  await ingresar("especialista-02");
  await ir(`/casos/${ROJO}`);
  await desplegable("Estado", "Informe emitido");
  await desplegable("Conclusión del informe", "Favorable");
  const ayer = new Date(Date.now() - 86400000);
  const iso = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, "0")}-${String(ayer.getDate()).padStart(2, "0")}`;
  await page.evaluate((d) => document.querySelector(`form [data-iso="${d}"]`).click(), iso);
  for (const e of ["Plano arquitectónico", "Plano de estructuras", "Plano de instalaciones eléctricas (II.EE.)", "Plano de instalaciones sanitarias (II.SS.)"]) {
    await desplegable(e, "Conforme");
  }
  await escribir("Conclusiones sustentadas", "Sin observaciones físicas en la inspección visual.");
  await pulsar("Guardar informe");
  await conTexto("Informe emitido. El indicador A");
  const d = (await apiSesion("GET", `/casos/${ROJO}`)).body;
  v(d.evaluacionTecnica.estado === "EMITIDO", "informe emitido");
  v(d.evaluacion.estado === "ROJO", `A = ${d.evaluacion.estado}`);
  datos.firma = { profesional: d.evaluacionTecnica.profesional, especialidad: d.evaluacionTecnica.profesionalEspecialidad, colegiatura: d.evaluacionTecnica.colegiatura };
  const t = await texto();
  datos.rotuloFicticio = t.includes("Perfil ficticio de demostración");
  nota(`firma: ${datos.firma.profesional} · ${datos.firma.especialidad} · ${datos.firma.colegiatura}; rótulo «Perfil ficticio»: ${datos.rotuloFicticio ? "sí" : "no"}`);
});

// ---------------------------------------------------------------- pasos v0.8 (antes de retirar la autorización)
await paso(15, "revisor-01", "PDF de unos 5,4 MB: aviso previo y optimización al subirlo (II.EE. de SIM-99000404)", "pdf-grande-optimizado", async (v, nota) => {
  await ingresar("revisor-01");
  await ir(`/casos/${NUEVO}`);
  const input = await page.waitForSelector("#plano-pdf-ELECTRICAS");
  await input.uploadFile(PDF_GRANDE);
  await espera(300);
  const aviso = (await texto()).split("\n").find((l) => l.includes("Se optimizará automáticamente")) ?? "";
  v(!!aviso, `aviso: «${aviso}» (${MB(statSync(PDF_GRANDE).size)} MB)`);
  await page.evaluate(() => {
    const li = document.querySelector('li[data-especialidad="ELECTRICAS"]');
    [...li.querySelectorAll("button")].find((x) => !x.disabled && /Subir PDF/.test(x.innerText))?.click();
  });
  await conTexto("Optimizado:", 60000);
  const linea = (await texto()).split("\n").find((l) => l.startsWith("Optimizado:")) ?? "";
  v(/Optimizado: [\d,]+ MB → [\d,]+ MB/.test(linea), `«${linea}»`);
  const p = (await apiSesion("GET", `/casos/${NUEVO}`)).body.expediente.planos.find((x) => x.especialidad === "ELECTRICAS");
  v(p.documento?.optimizado === true && p.documento.tamanoBytes <= 10 * 1048576, `guardado ${MB(p.documento?.tamanoBytes ?? 0)} MB`);
});

await paso(16, "comprador-01", `Ruta de regularización de ${ROJO} (alto, Juzgado) y ${TINGUINA} (medio)`, "ruta-regularizacion", async (v) => {
  await ingresar("comprador-01");
  await ir(`/casos/${ROJO}`);
  await conTexto("Ruta de regularización");
  const t = await texto();
  const r = (await apiSesion("GET", `/casos/${ROJO}/ruta-regularizacion`)).body;
  v(r.esfuerzo === "ALTO" && r.items.some((i) => i.clave === "RP-01"), `${ROJO}: ${r.esfuerzo}, ${r.items.map((i) => i.clave).join(", ")}`);
  v(t.includes("Esfuerzo alto") && t.includes("Juzgado"), "«Esfuerzo alto» y «Juzgado»");
  v(t.includes("Orientativo: no es asesoría legal ni recomendación de compra"), "aviso orientativo");
  await page.evaluate(() => document.getElementById("ex-ruta")?.scrollIntoView());
  await ir(`/casos/${TINGUINA}`);
  await conTexto("Ruta de regularización");
  const rT = (await apiSesion("GET", `/casos/${TINGUINA}/ruta-regularizacion`)).body;
  v(rT.esfuerzo === "MEDIO", `${TINGUINA}: ${rT.esfuerzo}`);
  v((await texto()).includes("No consta en la partida: solicitar al propietario o al acreedor"), "acreedor: «No consta…»");
});

await paso(17, "gestor-01", "Panel de cartera: conteos, tipos de alerta, esfuerzo y gestión; filtro RP-01", "panel-cartera", async (v, nota) => {
  await ingresar("gestor-01");
  await ir("/cartera");
  const p = (await apiSesion("GET", "/cartera/panel")).body;
  datos.panel = {
    totalCasos: p.totalCasos, publicacion: p.porEstadoPublicacion, color: p.porColor,
    contactosPendientes: p.contactosPendientes.length, inspecciones: p.inspecciones.length,
    asignadas: p.inspeccionesAsignadas, sinAsignar: p.inspeccionesSinAsignar,
    tipos: p.porTipoAlerta.filter((x) => x.casos > 0).map((x) => `${x.codigo}=${x.casos}`), esfuerzo: p.porEsfuerzo, gestion: p.porEstadoGestion,
  };
  v(p.totalCasos === 13, `${p.totalCasos} casos`);
  nota(`publicación ${JSON.stringify(p.porEstadoPublicacion)}; colores ${JSON.stringify(p.porColor)}; contactos pendientes ${datos.panel.contactosPendientes}; inspecciones ${datos.panel.inspecciones} (${datos.panel.asignadas} asignadas, ${datos.panel.sinAsignar} sin asignar)`);
  nota(`por tipo: ${datos.panel.tipos.join(", ")}; esfuerzo ${JSON.stringify(p.porEsfuerzo)}; gestión ${JSON.stringify(p.porEstadoGestion)}`);
  const t = await texto();
  v(t.includes("Casos por tipo de alerta") && t.includes("Esfuerzo de regularización") && t.includes("Por regularizar"), "tarjetas y tabla");
  v(t.includes("Priorización interna de la inmobiliaria; no es una recomendación de compra"), "aviso de priorización");
  const antes = (await page.$$("article[data-resaltado]")).length;
  await pulsar("RP-01");
  await espera(600);
  const despues = (await page.$$("article[data-resaltado]")).length;
  v(despues < antes && despues >= 1, `filtro RP-01: ${antes} → ${despues} filas`);
});

await paso(18, "gestor-01, comprador-01", `Decisión «No captar por ahora» en ${ROJO}; publicar pide confirmación; el comprador no ve la gestión`, "decision-captacion", async (v) => {
  await ingresar("gestor-01");
  await ir(`/casos/${ROJO}`);
  const antes = (await apiSesion("GET", `/casos/${ROJO}`)).body;
  await conTexto("Gestión inmobiliaria (interno)");
  await page.select("#g-decision", "NO_CAPTAR_POR_AHORA");
  await page.select("#g-motivo", "PROCESO_JUDICIAL");
  await pulsar("Registrar decisión", true);
  await conTexto("Decisión registrada: No captar por ahora (Proceso judicial).");
  const despues = (await apiSesion("GET", `/casos/${ROJO}`)).body;
  v(JSON.stringify(despues.evaluacion) === JSON.stringify(antes.evaluacion), `A no cambia: ${despues.evaluacion.estado}`);
  v(despues.gestion?.estado === "REQUIERE_REGULARIZACION", `gestión: ${despues.gestion?.estado}`);
  await pulsar("Retirar", true);
  await conTexto("Publicación retirada.");
  let mensaje = null;
  page.once("dialog", async (d) => { mensaje = d.message(); await d.accept(); });
  await pulsar("Publicar", true);
  await conTexto("Caso publicado.");
  v(mensaje === "La decisión registrada es no captar por ahora. ¿Publicar de todos modos?", `confirmación: «${mensaje}»`);
  await ingresar("comprador-01");
  await ir(`/casos/${ROJO}`);
  v(!(await texto()).includes("Gestión inmobiliaria (interno)"), "el comprador no ve el panel de gestión");
});

await paso(19, "comprador-01", "Filtro del catálogo por RV-02 · Hipoteca vigente", "filtro-rv02", async (v) => {
  await ir("/casos?tipoAlerta=RV-02");
  await listo();
  const esperados = (await apiSesion("GET", "/casos?tipoAlerta=RV-02")).body.map((c) => c.codigo);
  const n = (await page.$$("article")).length;
  v(esperados.includes(TINGUINA), `servidor: ${esperados.join(", ")}`);
  v(n === esperados.length, `${n} tarjetas`);
  v((await texto()).includes("Alerta · RV-02"), "chip «Alerta · RV-02 …»");
});

await paso(20, "comprador-01", "Tarjetas resaltadas por el color de A, con texto; a 390 px sin desborde", "tarjetas-resaltadas", async (v) => {
  await ir("/casos");
  const est = await page.evaluate(() => [...document.querySelectorAll("article[data-resaltado]")].map((a) => ({
    estado: a.dataset.resaltado, borde: parseFloat(getComputedStyle(a).borderLeftWidth), texto: a.innerText })));
  const etiquetas = { VERDE: "Sin alertas en los campos evaluados", AMARILLO: "Requiere revisión", ROJO: "Alerta prioritaria",
    GRIS: "Información insuficiente o condición no evaluable" };
  v(est.length === 13, `${est.length} tarjetas con resaltado`);
  v(est.every((e) => e.borde >= 3), "borde izquierdo ≥ 3 px");
  v(est.every((e) => e.texto.includes(etiquetas[e.estado])), "cada tarjeta dice su estado con texto");
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await ir("/casos");
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  v(desborde <= 0, `390 px sin desborde horizontal (${desborde} px)`);
  await page.screenshot({ path: path.join(SHOTS, "20b-tarjetas-390px.png") });
  await page.setViewport({ width: 1280, height: 900 });
});

// ---------------------------------------------------------------- pasos v0.9
await paso(21, "revisor-01, comprador-01", `Santiago ${SANTIAGO}: documentos del lote (4 de 4) y color de A`, "santiago-documentos-lote", async (v, nota) => {
  await ingresar("comprador-01");
  await ir(`/casos/${SANTIAGO}`);
  const d = (await apiSesion("GET", `/casos/${SANTIAGO}`)).body;
  const docs = d.expediente.documentosLote ?? [];
  datos.santiago = { estado: d.evaluacion.estado, docs: docs.map((x) => `${x.tipo}:${x.estado}:${x.documento?.origen ?? "-"}`), precio: d.predio.precioReferencial, moneda: d.predio.moneda };
  v(docs.length === 4, `${docs.length} documentos: ${datos.santiago.docs.join(", ")}`);
  const t = await texto();
  v(t.includes("Documentos presentados") && /4 de 4/.test(t), "«Documentos presentados 4 de 4»");
  v((await page.$$("li[data-documento-lote]")).length === 4, "4 tarjetas de documento");
  nota(`A = ${d.evaluacion.estado}; motivos: ${(d.evaluacion.motivos ?? []).map((m) => m.codigo ?? m.clave ?? m.texto ?? JSON.stringify(m)).join(" / ").slice(0, 300)}`);
  await page.evaluate(() => document.querySelector("li[data-documento-lote]")?.scrollIntoView());
  await espera(300);
});

for (const [n, codigo, nombre] of [[22, HUARMEY, "huarmey"], [23, SUPE, "supe"]]) {
  await paso(n, "comprador-01", `${codigo}: precio en US$, fuente SBN, plano perimétrico en el visor y color de A`, `${nombre}-sbn`, async (v, nota) => {
    await ir(`/casos/${codigo}`);
    const d = (await apiSesion("GET", `/casos/${codigo}`)).body;
    const t = await texto();
    const precioTxt = t.split("\n").find((l) => l.includes("US$")) ?? "";
    v(d.predio.moneda === "USD" && precioTxt !== "", `moneda ${d.predio.moneda}; en pantalla «${precioTxt.trim()}»`);
    v(t.includes(d.predio.precioNota ?? "@@"), `nota del precio visible: «${d.predio.precioNota}»`);
    v(!!d.fuente && t.includes("SBN"), `fuente: «${d.fuente}» (${d.fuenteUrl})`);
    const docs = d.expediente.documentosLote ?? [];
    nota(`documentos: ${docs.map((x) => `${x.tipo}:${x.estado}:${x.documento?.origen ?? "-"}`).join(", ")}`);
    nota(`A = ${d.evaluacion.estado}; titular publicación: ${d.publicacion?.propietarioCodigo}`);
    datos[nombre] = { estado: d.evaluacion.estado, precio: d.predio.precioReferencial, moneda: d.predio.moneda, nota: d.predio.precioNota,
      fuente: d.fuente, fuenteUrl: d.fuenteUrl, precioPantalla: precioTxt.trim(), docs: docs.map((x) => `${x.tipo}:${x.estado}`) };
    const abierto = await page.evaluate(() => {
      const li = document.querySelector('li[data-documento-lote="PLANO_PERIMETRICO"]');
      const b = li && [...li.querySelectorAll("button")].find((x) => x.innerText.includes("Ver documento"));
      li?.scrollIntoView(); b?.click();
      return !!b;
    });
    v(abierto, "botón «Ver documento» del plano perimétrico");
    await page.waitForSelector("[role=dialog] iframe", { timeout: 20000 });
    await espera(1500);
    v(true, "el visor muestra el PDF en un iframe");
    const pdf = await pdfSesion(`/casos/${codigo}/documentos-lote/PLANO_PERIMETRICO/documento`);
    v(pdf.status === 200 && pdf.buf.subarray(0, 5).toString() === "%PDF-", `PDF ${pdf.status}, ${MB(pdf.buf.length)} MB`);
  });
  if (n === 22) await page.keyboard.press("Escape");
}
await page.keyboard.press("Escape");

await paso(24, "propietario-03", "Mis inmuebles muestra los dos lotes de la SBN", "propietario-03", async (v, nota) => {
  await ingresar("propietario-03");
  await ir("/mis-inmuebles");
  const t = await texto();
  v(t.includes(HUARMEY) && t.includes(SUPE), `${HUARMEY} y ${SUPE} en Mis inmuebles`);
  const n = (await page.$$("article")).length;
  nota(`${n} tarjetas`);
});

// ---------------------------------------------------------------- PDF: copia literal, informe técnico y lámina
await paso(25, "comprador-01", "Descarga de PDF: copia literal, informe técnico y lámina (título, marca de agua y pie)", "pdf-descargas", async (v, nota) => {
  await ingresar("comprador-01");
  const det = (await apiSesion("GET", `/casos/${VERDE}`)).body;
  const lamina = det.expediente.planos.find((p) => p.documento?.origen === "GENERADO") ?? det.expediente.planos[0];
  const objetivos = [
    ["copia literal", `/casos/${TINGUINA}/documento`, ["COPIA LITERAL", "Copia informativa", "SIMULAD", "SIN VALOR LEGAL"]],
    ["copia transcrita (SBN)", `/casos/${HUARMEY}/documento`, ["TRANSCRIPCIÓN REFERENCIAL", "Transcrito"]],
    ["informe técnico", `/casos/${ROJO}/inspeccion/documento`, ["INFORME TÉCNICO REFERENCIAL", "Informe técnico referencial", "FICTICIO"]],
    ["lámina", `/casos/${VERDE}/planos/${lamina.especialidad}/documento`, ["DOCUMENTO TÉCNICO REFERENCIAL", "FICTICIO"]],
  ];
  datos.pdfs = {};
  for (const [nombre, ruta, buscar] of objetivos) {
    const r = await pdfSesion(ruta);
    if (r.status !== 200) { v(false, `${nombre}: ${r.status}`); continue; }
    writeFileSync(path.join(TMP, `${nombre.replace(/\W+/g, "-")}.pdf`), r.buf);
    const x = textoPdf(r.buf);
    const tiene = Object.fromEntries(buscar.map((b) => [b, x.texto.toUpperCase().includes(b.toUpperCase())]));
    const pie = x.cadenas.find((c) => /no tiene valor legal|No reemplaza|sin valor legal/i.test(c) && c.length > 40) ?? null;
    const marcas = [...new Set(x.cadenas.filter((c) => c.includes("·") && c === c.toUpperCase() && c.length > 20))];
    const encabezado = x.cadenas.find((c) => /COPIA LITERAL|TRANSCRIPCIÓN|INFORME TÉCNICO|LÁMINA|DOCUMENTO TÉCNICO/i.test(c)) ?? null;
    datos.pdfs[nombre] = { ruta, titulo: x.titulo, encabezado, pie, textosMayusculasConPunto: marcas, contiene: tiene, bytes: r.buf.length,
      paginas: (r.buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length };
    v(true, `${nombre}: título «${x.titulo}»; encabezado «${encabezado}»; textos en mayúsculas con «·»: ${marcas.map((m) => `«${m}»`).join(", ") || "ninguno"}; pie «${pie ?? "no encontrado"}»; contiene ${JSON.stringify(tiene)}`);
  }
  nota(`PDF guardados en ${TMP}`);
});

// ---------------------------------------------------------------- retirar, pie y login
await paso(26, "propietario-02, comprador-01", "Retira la autorización y el caso sale del catálogo", "retira-autorizacion", async (v) => {
  await ingresar("propietario-02");
  await ir(`/casos/${NUEVO}`);
  await pulsar("Retirar autorización", true);
  await conTexto("Autorización retirada.");
  const d = (await apiSesion("GET", `/casos/${NUEVO}`)).body;
  v(d.publicacion.estado === "RETIRADO" && !d.publicacion.autorizada, "retirado y sin autorización");
  await ingresar("comprador-01");
  await ir("/casos");
  v(!(await texto()).includes(NUEVO), "fuera del catálogo");
  await ir(`/casos/${NUEVO}`);
  v((await texto()).includes("No encontramos este expediente"), "por URL: no encontrado");
});

await paso(27, "todas / sin sesión", "Pie con los límites legales en las pantallas y textos del login y la landing", "pie-y-login", async (v, nota) => {
  for (const [cuenta, ruta] of [["revisor-01", "/casos/nueva"], ["gestor-01", "/cartera"], ["propietario-03", "/mis-inmuebles"], ["comprador-01", "/casos"]]) {
    await ingresar(cuenta);
    await ir(ruta);
    const faltan = await verPie();
    v(faltan.length === 0, `pie en ${ruta} (${cuenta})${faltan.length ? `; faltan: ${faltan.join(" / ")}` : ""}`);
  }
  const t = await texto();
  datos.pie = t.split("\n").map((x) => x.trim()).filter((x) => LIMITES.includes(x) || /Catálogo .*activo|Indicador B · En Campo|especialista colegiado/.test(x));
  datos.avisoSuperior = t.split("\n").map((x) => x.trim()).find((l) => l.includes("Aviso legal") || l.includes("No certifica saneamiento ni recomienda comprar")) ?? null;
  nota(`aviso superior: «${datos.avisoSuperior}»`);
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(BASE + "/", { waitUntil: "networkidle0" });
  await page.reload({ waitUntil: "networkidle0" });
  await espera(1500);
  const tl = await page.evaluate(() => document.body.textContent);
  v((await verPie()).length === 0, "pie en la landing");
  datos.landing = ["expedientes en el catálogo", "PropTech", "Especialista colegiado de la inmobiliaria", "12 lotes y viviendas",
    "cuenta asignada", "MVP académico", "ficticio", "simulad"].map((x) => `${x}: ${tl.includes(x) ? "sí" : "no"}`);
  nota(`landing: ${datos.landing.join("; ")}`);
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("#codigoCuenta");
  await espera(1200);
  const tlog = await page.evaluate(() => document.body.textContent);
  datos.loginFinal = ["Plataforma de transparencia inmobiliaria · Acceso seguro", "Ingresa con tu código de cuenta y contraseña para consultar los expedientes.",
    "Entorno académico demostrativo", "Datos sintéticos"].filter((x) => tlog.includes(x));
  v(!tlog.includes("Entorno académico demostrativo"), `login: «${datos.loginFinal.join(" / ")}» (ya no dice «Entorno académico demostrativo»)`);
});

await browser.close();

const fallas = pasos.filter((p) => !p.ok).length;
const commit = execSync("git rev-parse --short HEAD", { cwd: RAIZ }).toString().trim();
const resultado = { fecha: new Date().toISOString(), commit, correctos: pasos.length - fallas, total: pasos.length, pasos, datos,
  erroresConsola: errores, respuestas409o500: respuestasError, pdfTemporales: TMP };
writeFileSync(path.join(AQUI, "RESULTADO-recorrido-v09.json"), JSON.stringify(resultado, null, 2));
console.log(`\n${pasos.length - fallas} de ${pasos.length} pasos correctos. Errores de consola: ${errores.length}. Respuestas 409/500: ${respuestasError.length}`);
process.exit(fallas ? 1 : 0);
