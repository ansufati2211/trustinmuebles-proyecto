// Recorrido de navegador de la v0.6 con los 3 roles (39 verificaciones).
// Requisitos: backend con una base NUEVA (cambia el caso de Santiago) y APP_SEED_PASSWORD=prueba-local-1234, interfaz en
// http://localhost:5173 y Google Chrome instalado. puppeteer-core se instala aparte, fuera del repositorio:
//   npm install --prefix <carpeta> puppeteer-core@23.11.1
// Uso: node docs/pruebas/recorrido-v06.mjs <carpeta de puppeteer> <carpeta de capturas>
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";

const require = createRequire(path.join(process.argv[2], "package.json"));
const puppeteer = require("puppeteer-core");
const SHOTS = process.argv[3];
mkdirSync(SHOTS, { recursive: true });
const BASE = "http://localhost:5173/#";
const CLAVE = "prueba-local-1234";

let ok = 0, mal = 0;
const check = (nombre, cond) => { cond ? ok++ : mal++; console.log(`${cond ? "OK  " : "FALLA"} ${nombre}`); };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errores = [];
page.on("pageerror", (e) => errores.push(e.message));
page.on("console", (m) => { if (m.type() === "error" && !/403|409|Failed to load resource/.test(m.text())) errores.push(m.text()); });

const texto = () => page.evaluate(() => document.body.innerText.replace(/ /g, " "));
const foto = async (n, full = true) => page.screenshot({ path: path.join(SHOTS, `${n}.png`), fullPage: full });
const ir = async (ruta) => { await page.goto(BASE + ruta, { waitUntil: "networkidle0" }); await espera(300); };

async function ingresar(cuenta) {
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("#codigoCuenta");
  await page.type("#codigoCuenta", cuenta);
  await page.type("#password", CLAVE);
  await Promise.all([page.waitForFunction(() => location.hash.startsWith("#/casos")), page.click("button[type=submit]")]);
  await page.waitForSelector("article", { timeout: 15000 });
  await espera(300);
}

// 1. Inicio público
await ir("/");
let t = await texto();
check("Inicio: franja de demostración visible", t.includes("Entorno de demostración") && t.toLowerCase().includes("no certifica saneamiento ni recomienda comprar"));
check("Inicio: CTA «Explorar Cartera de Inmuebles»", t.includes("Explorar Cartera de Inmuebles"));
check("Inicio: modelo en 4 pasos", t.includes("¿Cómo te protegemos antes de comprar?") && t.includes("Captación y verificación de cartera propia en Ica") && t.includes("Decisión informada"));
check("Inicio: fuentes gratuitas y de pago", t.includes("Conoce Aquí (SUNARP)") && t.includes("Visor Catastral BGR (SUNARP)") && t.includes("Copia literal certificada") && t.includes("(HR y PU)"));
check("Inicio: sin scraping ni APIs inexistentes", t.includes("Sin scraping ni APIs inexistentes"));
check("Pie: límites legales (I1)", t.includes("Verde = Sin alertas en los campos evaluados") && t.includes("los datos de esta demostración son simulados"));
check("Inicio: lista lo que no hace", t.includes("No consulta fuentes oficiales"));
check("Inicio: ilustración con texto alternativo", await page.$eval("svg[role=img]", (s) => s.getAttribute("aria-label")?.includes("No es una foto")));
check("Cero imágenes externas", await page.evaluate(() => [...document.images].every((i) => i.src.startsWith(location.origin) || i.src.startsWith("data:"))));
await foto("01-inicio");
await page.setViewport({ width: 400, height: 860 });
await ir("/");
check("Inicio móvil: sin desborde horizontal", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
await foto("02-inicio-movil");
await page.setViewport({ width: 1280, height: 900 });

// 2. Comprador: catálogo y filtros
await ingresar("comprador-01");
t = await texto();
check("Catálogo: 10 tarjetas", (await page.$$("article")).length === 10);
check("Catálogo: precio referencial rotulado como simulado", t.includes("Precio referencial · dato simulado") && t.includes("S/ 185,000"));
check("Catálogo: cada tarjeta trae los dos indicadores", (await page.$$eval("article", (as) => as.every((a) => a.innerText.includes("Documental:") && a.innerText.includes("Técnico:")))));
check("Catálogo: 10 ilustraciones distintas", await page.$$eval('article svg[viewBox="0 0 480 300"]', (ss) => new Set(ss.map((s) => s.innerHTML)).size === 10));
await foto("03-catalogo");
await page.select("#f-a", "AMARILLO");
await page.waitForFunction(() => document.body.innerText.includes("4 inmuebles"));
check("Filtro A=Amarillo: 4 inmuebles y en la URL", (await page.evaluate(() => location.hash)).includes("estado=AMARILLO"));
await page.select("#f-b", "RIESGO");
await page.waitForFunction(() => document.body.innerText.includes("1 inmueble"));
check("Filtros combinados A=Amarillo y B=riesgo: 1 inmueble (Salas)", (await texto()).includes("Los Tamarindos"));
await page.reload({ waitUntil: "networkidle0" }); await espera(400);
check("Los filtros sobreviven a la recarga", (await page.$eval("#f-a", (s) => s.value)) === "AMARILLO" && (await page.$eval("#f-b", (s) => s.value)) === "RIESGO" && (await texto()).includes("1 inmueble"));
await foto("04-catalogo-filtrado", false);
await ir("/casos?tipoInmueble=LOTE_URBANO&estado=ROJO");
t = await texto();
check("Estado vacío con botón de limpiar", t.includes("Ningún inmueble cumple estos filtros") && t.includes("Limpiar filtros"));
const [limpiar] = await page.$$("xpath/.//button[contains(., 'Limpiar filtros')]");
await limpiar.click();
await page.waitForFunction(() => document.body.innerText.includes("10 inmuebles"));
check("Limpiar filtros vuelve a los 10", !(await page.evaluate(() => location.hash)).includes("estado="));

// 3. Detalle de Pachacútec: comparador de áreas y visor modal
await ir("/casos/SIM-11098467");
t = await texto();
check("Detalle: discrepancia 98 contra 72 m² resaltada", t.includes("98.00 m²") && t.includes("72.00 m²") && t.includes("26.00 m² más"));
check("Detalle: texto fijo RN-10 visible", t.includes("El indicador B es independiente y no cambia el color del indicador A"));
check("Detalle: stepper en «En inspección»", await page.$eval("[aria-current=step]", (e) => e.innerText.includes("En inspección")));
check("Detalle: credencial ficticia del especialista", t.includes("Ing. Carlos Alberto Mendoza Quispe") && t.includes("CIP N.° 248910") && t.includes("Datos ficticios de demostración"));
check("Detalle: HR y PU observado en el checklist", t.includes("Declaración Jurada Municipal (HR y PU)") && t.includes("no incluye la ampliación"));
check("Comprador no ve el botón de solicitar si ya hay solicitud", !t.includes("Solicitar inspección técnica\n"));
await foto("05-detalle-pachacutec");
const [verLamina] = await page.$$("xpath/.//button[contains(., 'Ver lámina')]");
await verLamina.click();
await page.waitForSelector("[role=dialog][aria-modal=true]");
check("Visor de lámina: diálogo modal accesible", await page.$eval("[role=dialog]", (d) => !!d.getAttribute("aria-labelledby")));
await espera(800);
await foto("06-visor-lamina", false);
await page.keyboard.press("Escape");
await espera(200);
check("Escape cierra el modal y el foco vuelve al botón", !(await page.$("[role=dialog]")) && (await page.evaluate(() => document.activeElement?.textContent?.includes("Ver lámina"))));

// 4. Santiago: el comprador solicita la inspección desde el modal
await ir("/casos/SIM-11081204");
t = await texto();
check("Lote: los planos no aplican", t.includes("Los planos no aplican"));
const [solicitar] = await page.$$("xpath/.//button[contains(., 'Solicitar inspección técnica')]");
check("Comprador ve el botón «Solicitar inspección técnica»", !!solicitar);
await solicitar.click();
await page.waitForSelector("[role=dialog]");
t = await texto();
check("Modal de solicitud: costo S/ 250.00 y 6 pasos", t.includes("S/ 250.00") && t.includes("Alcance y estudios adicionales") && t.includes("sin pasarela de pago"));
for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
check("Foco atrapado dentro del modal", await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]")));
await foto("07-modal-solicitud", false);
const [confirmar] = await page.$$("xpath/.//button[contains(., 'Confirmar solicitud')]");
await confirmar.click();
await page.waitForFunction(() => document.body.innerText.includes("Solicitud registrada"));
t = await texto();
check("Tras solicitar: muestra solicitante y fecha", t.includes("a nombre de comprador-01") && t.includes("por la cuenta comprador-01"));

// 5. Revisor: no ve el botón de solicitar; edita el checklist
await ingresar("revisor-01");
await ir("/casos/SIM-11061555");
t = await texto();
check("Revisor no ve el botón de solicitar", !t.includes("Solicitar inspección técnica") && t.includes("La inspección la pide el comprador"));
check("Revisor ve «Guardar ítem» en el checklist", t.includes("Guardar ítem"));
await foto("08-revisor-subtanjalla");

// 6. Especialista: emite un informe con riesgo en Santiago; el color A no cambia
await ingresar("especialista-01");
await ir("/casos/SIM-11081204");
t = await texto();
check("Especialista ve el formulario sin nombre ni colegiatura", t.includes("se toman de tu cuenta") && !(await page.$("#it-profesional")));
await page.select("#it-estado", "EMITIDO");
await page.select("#it-resultado", "CON_RIESGO");
await page.$eval("#it-fecha", (e) => { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; s.call(e, new Date(Date.now() - 86400000).toISOString().slice(0, 10)); e.dispatchEvent(new Event("input", { bubbles: true })); });
for (const c of ["verifArquitectura", "verifEstructuras", "verifElectricas", "verifSanitarias"]) await page.select(`#it-${c}`, c === "verifEstructuras" ? "OBSERVADO" : "CONFORME");
await page.type("#it-conc", "Fisuras en el cerco perimétrico; se recomienda un estudio de suelos.");
const [guardar] = await page.$$("xpath/.//button[contains(., 'Guardar informe')]");
await guardar.click();
await page.waitForFunction(() => document.body.innerText.includes("Informe emitido. El indicador A"));
t = await texto();
check("Informe emitido firmado por la cuenta del especialista", t.includes("Ing. Carlos Alberto Mendoza Quispe") && t.includes("Riesgo físico detectado"));
check("I2: el indicador A sigue en Verde", t.includes("Documental: Verde"));
await foto("09-especialista-santiago");
await ir("/casos?riesgoFisicoDetectado=true");
check("Catálogo con riesgo físico: Santiago y Salas", (await page.$$("article")).length === 2);

check("Sin errores de JavaScript en la consola", errores.length === 0);
if (errores.length) console.log(errores.join("\n"));
console.log(`\n${ok} verificaciones correctas, ${mal} fallidas`);
await browser.close();
process.exit(mal ? 1 : 0);
