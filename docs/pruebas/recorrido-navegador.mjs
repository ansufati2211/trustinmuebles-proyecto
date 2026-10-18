import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:5173";
const PASS = process.env.E2E_PASSWORD;
const SHOTS = new URL("./shots/", import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const PARCONA = "SIM-11048217";
const TINGUINA = "SIM-11052690";
const SUBTANJALLA = "SIM-11061555";
const LOS_AQUIJES = "SIM-11070419";

const resultados = [];
const errores = [];
const respuestasMalas = [];
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
page.on("response", (r) => { if (r.status() >= 400) respuestasMalas.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`); });
page.on("console", (m) => { if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) errores.push("console: " + m.text()); });

const texto = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
const min = async () => (await texto()).toLowerCase();
const espera = (frag, t = 8000) =>
  page.waitForFunction((f) => document.body.innerText.includes(f), { timeout: t }, frag);
const foto = (n, full = true) => page.screenshot({ path: `${SHOTS}${n}.png`, fullPage: full });
const ir = async (hash) => { await page.goto(`${BASE}/#${hash}`); await new Promise((r) => setTimeout(r, 400)); };
const clickBoton = (frag) =>
  page.evaluate((f) => [...document.querySelectorAll("button")].find((b) => b.innerText.includes(f) && !b.disabled)?.click(), frag);
const escribir = async (sel, valor) => {
  await page.click(sel, { clickCount: 3 });
  await page.keyboard.press("Backspace");
  if (valor) await page.keyboard.type(valor);
};
const guardarPartida = async () => {
  const resp = page.waitForResponse((r) => r.url().includes("/expediente") && r.request().method() === "PUT", { timeout: 8000 });
  await clickBoton("Guardar y recalcular");
  return (await resp).status();
};

async function login(cuenta) {
  await ir("/login");
  await page.waitForSelector("#codigoCuenta");
  await page.type("#codigoCuenta", cuenta);
  await page.type("#password", PASS);
  await page.click('button[type="submit"]');
  await espera("expedientes disponibles");
}
async function logout() {
  await page.click('button[aria-label="Cerrar sesión"]');
  await espera("Ingresar");
}
async function abrir(codigo) {
  await ir(`/casos/${codigo}`);
  await espera("Asientos de la partida");
}

// 1. Inicio público
await ir("/");
await espera("Entiende un expediente");
let t = await texto();
check("Inicio: aviso de caso sintético visible", t.includes("Entorno de demostración") && t.includes("No certifica saneamiento ni recomienda comprar"));
check("Inicio: lista lo que Trustinmuebles no hace", t.includes("No consulta fuentes oficiales"));
check("Inicio: sin promesas comerciales antiguas", !/100% de certeza|Compra con certeza|Capster|\$420,000/.test(t));
await foto("01-inicio");

// 2. Ruta protegida
await ir("/casos");
await espera("Ingresar");
check("Casos sin sesión redirige a login", page.url().includes("#/login"));

// 3. Comprador
await login("comprador-01");
t = await texto();
check("Casos: aparecen las 4 partidas con su denominación", [PARCONA, TINGUINA, SUBTANJALLA, LOS_AQUIJES].every((c) => t.includes(c))
  && t.includes("Hab. Urb. Santa Elvira") && t.includes("Hab. Urb. Rincón del Sauce") && t.includes("Hab. Urb. Mirador del Sol"));
check("Casos: no delatan el diseño del estudio", !/postest|pretest|forma b|forma a|titular (alfa|delta)/i.test(t));
check("Casos: cada estado va con texto", (t.match(/estado: (verde|amarillo|gris|rojo)/gi) ?? []).length === 4);
check("Casos: muestra pendientes", t.includes("2 pendientes"));
check("Barra: muestra cuenta y rol", t.includes("comprador-01") && /comprador/i.test(t));
await foto("03-casos");

await abrir(TINGUINA);
t = await texto();
check("La Tinguiña: estado Amarillo con etiqueta", t.toLowerCase().includes("estado: amarillo") && t.includes("Requiere revisión"));
check("La Tinguiña: alerta por hipoteca vigente", t.includes("Hipoteca vigente") && t.includes("RV-02"));
check("La Tinguiña: partida con zona, ubicación, área y linderos", t.includes("Zona Registral N.° XI - Sede Ica") && t.includes("200.00 m²") && t.includes("Frente: con la Calle Los Sauces"));
check("La Tinguiña: rubros con sus asientos", ["Títulos de dominio", "Gravámenes y cargas", "Cancelaciones", "C00001", "D00001", "D00002", "E00001"].every((f) => t.includes(f)));
check("La Tinguiña: titulares en copropiedad desde el asiento C", t.includes("Marco Antonio Quispe Huamaní (50 %) y Lucía Fernanda Torres Gutiérrez (50 %)"));
check("La Tinguiña: la cancelación indica qué asiento cancela", t.includes("Cancela el asiento D00002"));
check("La Tinguiña: límite en el panel", (t.match(/No certifica saneamiento/g) ?? []).length >= 2);
check("La Tinguiña: fecha referencial con advertencia", t.includes("No es una consulta de actualidad oficial"));
check("Comprador no ve el editor ni selectores", !t.includes("Editar partida") && !(await page.$('select[id^="estado-"]')));
await foto("04-expediente-tinguina");

// Glosario por teclado
await page.focus('button[aria-controls="panel-termino"]');
await page.keyboard.press("Enter");
const abierto = await page.$eval('button[aria-controls="panel-termino"]', (b) => b.getAttribute("aria-expanded"));
const panel = await page.$eval("#panel-termino", (p) => p.innerText);
check("Glosario: se abre con Enter (teclado) y marca aria-expanded", abierto === "true" && panel.includes("pendiente de revisión"));

// Rubros desplegables con teclado
const abiertoRubro = await page.evaluate(() => {
  const d = [...document.querySelectorAll("details")].find((x) => x.innerText.includes("Cancelaciones"));
  return d ? d.open : null;
});
check("Rubros: los paneles de asientos son desplegables", abiertoRubro === true);

// Documento PDF
const nuevoTarget = browser.waitForTarget((x) => x.url().startsWith("blob:"), { timeout: 8000 }).catch(() => null);
await clickBoton("Abrir documento");
const pdfTarget = await nuevoTarget;
check("Documento: se abre el PDF autenticado", !!pdfTarget);
if (pdfTarget) { const pp = await pdfTarget.page(); await pp?.close(); }
await page.bringToFront();

// Subtanjalla: gris con alerta prioritaria visible
await abrir(SUBTANJALLA);
t = await texto();
check("Subtanjalla: GRIS con faltantes y alerta prioritaria conservada",
  t.toLowerCase().includes("estado: gris") && t.includes("Titularidad") && t.includes("Anotación de demanda") && t.includes("RP-02")
  && t.includes("prioritaria") && t.includes("no se descartan otras alertas"));
check("Subtanjalla: el extracto parcial no inventa los títulos de dominio", t.includes("No incluido en este extracto."));
await foto("06-expediente-subtanjalla");

await abrir(PARCONA);
t = await texto();
check("Parcona: VERDE con hipoteca cancelada", t.toLowerCase().includes("estado: verde") && t.toLowerCase().includes("cancelada"));

await logout();

// 4. Revisor
await login("revisor-01");
await abrir(TINGUINA);
await espera("Editar partida");
t = await texto();
check("Revisor ve el editor y los selectores", t.includes("Editar partida") && !!(await page.$('select[id^="estado-"]')));
await foto("07-revisor-tinguina");

// Registrar la cancelación de la hipoteca (asiento E): el estado debe pasar a verde
await clickBoton("Agregar asiento");
await escribir("#as-ref-4", "E00002");
await page.select("#as-acto-4", "CANCELACION");
await page.select("#as-can-4", "D00001");
await escribir("#as-txt-4", "Se cancela la hipoteca inscrita en el asiento D00001 por pago total de la deuda.");
check("Editar: guardar la cancelación responde 200", (await guardarPartida()) === 200);
await espera("Guardado.");
t = await texto();
check("Editar: cancelar la hipoteca recalcula a Verde", t.toLowerCase().includes("estado: verde") && t.includes("Guardado. El estado se recalculó"));
await foto("08-revisor-recalculado");

// Entrada inválida: un asiento C sin titulares
await page.reload();
await espera("Editar partida");
await escribir("#as-tit-0", "");
check("Editar: entrada inválida responde 400", (await guardarPartida()) === 400);
await espera("No se guardó ningún cambio");
check("Editar: el error del servidor se muestra", (await texto()).includes("debe indicar los titulares"));
await foto("09-error-validacion");

// Restaurar: quitar el asiento E00002 agregado
await page.reload();
await espera("Editar partida");
await page.click('button[aria-label="Quitar el asiento E00002"]');
check("Restaurar: guardar sin la cancelación responde 200", (await guardarPartida()) === 200);
await espera("Guardado.");
check("Restaurar: La Tinguiña vuelve a Amarillo", (await min()).includes("estado: amarillo"));

// Documento regenerado: debe seguir marcado como generado por el sistema
check("Documento: figura como generado por el sistema", (await texto()).includes("generada por el sistema"));

// Checklist del revisor
const valorInicial = await page.$eval('select[id^="estado-"]', (s) => s.value);
const guardarItem = async () => {
  const resp = page.waitForResponse((r) => r.url().includes("/checklist/") && r.request().method() === "PATCH", { timeout: 8000 });
  await clickBoton("Guardar ítem");
  return (await resp).status();
};
await page.select('select[id^="estado-"]', "OBSERVADO");
check("Checklist: PATCH del revisor responde 200", (await guardarItem()) === 200);
await espera("Observado");
await page.select('select[id^="estado-"]', valorInicial);
check("Checklist: se restaura el valor inicial", (await guardarItem()) === 200);

// Asociar un PDF propio a la partida de Los Aquijes
const pdfPrueba = process.env.PDF_PRUEBA;
if (pdfPrueba) {
  await abrir(LOS_AQUIJES);
  await espera("Editar partida");
  const input = await page.$("#ed-pdf");
  await input.uploadFile(pdfPrueba);
  const respPdf = page.waitForResponse((r) => r.url().includes("/documento") && r.request().method() === "POST", { timeout: 8000 });
  await clickBoton("Asociar PDF");
  check("Documento: el revisor asocia un PDF (201)", (await respPdf).status() === 201);
  await espera("Documento asociado.");
  check("Documento: tras subir uno propio ya no lo regenera el sistema", (await texto()).includes("PDF subido por el revisor"));
}

await logout();

check("Sin errores de consola ni de página", errores.length === 0, errores.slice(0, 5).join(" | "));
const inesperadas = respuestasMalas.filter((x) => x !== `400 PUT /api/v1/casos/${TINGUINA}/expediente`);
check("Solo falla la validación provocada a propósito (400)", inesperadas.length === 0 && respuestasMalas.length === 1, respuestasMalas.join(" | "));
await browser.close();

const fallos = resultados.filter((r) => !r.ok).length;
console.log(`\n${resultados.length - fallos}/${resultados.length} verificaciones correctas`);
process.exit(fallos ? 1 : 0);
