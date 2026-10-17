import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:5173";
const PASS = process.env.E2E_PASSWORD;
const SHOTS = new URL("./shots/", import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const resultados = [];
const errores = [];
const check = (nombre, ok, detalle = "") => {
  resultados.push({ nombre, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${nombre}${!ok && detalle ? "  -> " + detalle : ""}`);
};

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: true,
  args: ["--no-sandbox", "--window-size=1280,1000"],
  defaultViewport: { width: 1280, height: 1000 },
});
const page = await browser.newPage();
page.on("pageerror", (e) => errores.push("pageerror: " + e.message));
const respuestasMalas = [];
page.on("response", (r) => { if (r.status() >= 400) respuestasMalas.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`); });
page.on("console", (m) => { if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) errores.push("console: " + m.text()); });

const texto = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
const min = async () => (await texto()).toLowerCase();
const espera = (frag, t = 8000) =>
  page.waitForFunction((f) => document.body.innerText.includes(f), { timeout: t }, frag);
const foto = (n, full = true) => page.screenshot({ path: `${SHOTS}${n}.png`, fullPage: full });
const ir = async (hash) => { await page.goto(`${BASE}/#${hash}`); await new Promise((r) => setTimeout(r, 400)); };

async function login(cuenta) {
  await ir("/login");
  await page.waitForSelector("#codigoCuenta");
  await page.type("#codigoCuenta", cuenta);
  await page.type("#password", PASS);
  await page.click('button[type="submit"]');
  await espera("casos disponibles");
}
async function logout() {
  await page.click('button[aria-label="Cerrar sesión"]');
  await espera("Ingresar");
}

// 1. Inicio público
await ir("/");
await espera("Entiende un expediente");
let t = await texto();
check("Inicio: aviso de caso sintético visible", t.includes("Caso sintético con fines académicos") && t.includes("No certifica saneamiento ni recomienda comprar"));
check("Inicio: lista lo que el MVP no hace", t.includes("No consulta fuentes oficiales"));
check("Inicio: sin promesas comerciales antiguas", !/100% de certeza|Compra con certeza|SUNARP|Capster|\$420,000/.test(t));
await foto("01-inicio");

// 2. Ruta protegida
await ir("/casos");
await espera("Ingresar");
check("Casos sin sesión redirige a login", page.url().includes("#/login"));
await foto("02-login", false);

// 3. Comprador
await login("comprador-01");
t = await texto();
check("Casos: aparecen los 4 casos", ["B-01", "B-02", "B-03", "DEMO-01"].every((c) => t.includes(c)));
check("Casos: cada estado va con texto", (t.match(/estado: (verde|amarillo|gris|rojo)/gi) ?? []).length === 4);
check("Casos: muestra pendientes", t.includes("2 pendientes"));
check("Barra: muestra cuenta y rol", t.includes("comprador-01") && /comprador/i.test(t));
await foto("03-casos");

await ir("/casos/B-02");
await espera("Datos del expediente");
t = await texto();
check("B-02: estado Amarillo con etiqueta", t.toLowerCase().includes("estado: amarillo") && t.includes("Requiere revisión"));
check("B-02: motivo y alerta B2 visibles", t.includes("Anotación con estado vigente") && t.includes("B2"));
check("B-02: límite 'No certifica saneamiento' en el panel", (t.match(/No certifica saneamiento/g) ?? []).length >= 2);
check("B-02: fecha referencial con advertencia", t.includes("No es una consulta de actualidad oficial"));
check("Comprador no ve el editor ni selectores", !t.includes("Editar expediente") && !(await page.$('select[id^="estado-"]')));
await foto("04-expediente-b02");

// Glosario por teclado
await page.focus('button[aria-controls="panel-termino"]');
await page.keyboard.press("Enter");
const abierto = await page.$eval('button[aria-controls="panel-termino"]', (b) => b.getAttribute("aria-expanded"));
const panel = await page.$eval("#panel-termino", (p) => p.innerText);
check("Glosario: se abre con Enter (teclado) y marca aria-expanded", abierto === "true" && panel.includes("pendiente de revisión"));
await foto("05-glosario");

// Documento PDF
const nuevoTarget = browser.waitForTarget((x) => x.url().startsWith("blob:"), { timeout: 8000 }).catch(() => null);
await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.innerText.includes("Abrir documento"))?.click());
const pdfTarget = await nuevoTarget;
check("Documento: se abre el PDF autenticado", !!pdfTarget);
if (pdfTarget) { const pp = await pdfTarget.page(); await pp?.close(); }
await page.bringToFront();

// B-03 gris
await ir("/casos/B-03");
await espera("Datos del expediente");
t = await texto();
check("B-03: GRIS, faltantes y alerta B4 conservada", t.toLowerCase().includes("estado: gris") && t.includes("Titularidad") && t.includes("B4") && t.includes("no se descartan otras alertas"));
await foto("06-expediente-b03");

await logout();

// 4. Revisor
await login("revisor-01");
await ir("/casos/B-02");
await espera("Editar expediente");
t = await texto();
check("Revisor ve el editor y los selectores", t.includes("Editar expediente") && !!(await page.$('select[id^="estado-"]')));
await foto("07-revisor-b02");

// Editar: cancelar B2 => VERDE
await page.select("#an-est-0", "CANCELADA");
await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.innerText.includes("Guardar y recalcular"))?.click());
await espera("Guardado.");
t = await texto();
check("Editar: B2 cancelada recalcula a Verde", t.toLowerCase().includes("estado: verde") && t.includes("Guardado. El estado se recalculó"));
await foto("08-revisor-recalculado");

// Entrada inválida
await page.click("#ed-titularidad", { clickCount: 3 });
await page.keyboard.type(" ");
await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.innerText.includes("Guardar y recalcular"))?.click());
await espera("No se guardó ningún cambio");
check("Editar: entrada inválida muestra el error del servidor", (await texto()).includes("titularidad"));
await foto("09-error-validacion");

// Restaurar B2 vigente (se recarga para descartar el formulario con error)
await ir("/casos/B-02");
await page.reload();
await espera("Editar expediente");
await page.select("#an-est-0", "VIGENTE");
await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.innerText.includes("Guardar y recalcular"))?.click());
await espera("Guardado.");
check("Restaurar: B-02 vuelve a Amarillo", (await min()).includes("estado: amarillo"));

// Checklist del revisor
const valorInicial = await page.$eval('select[id^="estado-"]', (s) => s.value);
const guardarItem = async () => {
  const resp = page.waitForResponse((r) => r.url().includes("/checklist/") && r.request().method() === "PATCH", { timeout: 8000 });
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.innerText.includes("Guardar ítem") && !b.disabled)?.click());
  return (await resp).status();
};
await page.select('select[id^="estado-"]', "OBSERVADO");
check("Checklist: PATCH del revisor responde 200", (await guardarItem()) === 200);
await espera("Observado");
check("Checklist: el revisor cambia un ítem a Observado", (await texto()).includes("Observado"));
await page.select('select[id^="estado-"]', valorInicial);
check("Checklist: se restaura el valor inicial", (await guardarItem()) === 200);

await logout();

check("Sin errores de consola ni de página", errores.length === 0, errores.slice(0, 5).join(" | "));
const inesperadas = respuestasMalas.filter((x) => x !== "400 PUT /api/v1/casos/B-02/expediente");
check("Solo falla la validación provocada a propósito (400)", inesperadas.length === 0 && respuestasMalas.length === 1, respuestasMalas.join(" | "));
await browser.close();

const fallos = resultados.filter((r) => !r.ok).length;
console.log(`\n${resultados.length - fallos}/${resultados.length} verificaciones correctas`);
process.exit(fallos ? 1 : 0);
