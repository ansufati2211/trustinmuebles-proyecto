// Recorrido de navegador de la v0.8 con los 5 roles: los pasos de la v0.7 (adaptados a la regla nueva de planos) y los de
// la v0.8: PDF real del plano con su límite y optimización, ruta de regularización, panel por tipo de alerta y esfuerzo,
// semáforo de gestión con su decisión, filtro por tipo de alerta y tarjetas resaltadas. Una captura por paso.
// Requisitos: backend con una base NUEVA, interfaz en http://localhost:5173 y Google Chrome instalado. puppeteer-core es una
// devDependency de trustinmuebles.
// Uso: APP_SEED_PASSWORD=<la del backend> node docs/pruebas/recorrido-v08.mjs
// Genera docs/pruebas/capturas-v08/ y docs/pruebas/RESULTADO-recorrido-v08.md. Un paso en FALLA se registra y el recorrido sigue.
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(AQUI, "..", "..", "trustinmuebles", "package.json"));
const puppeteer = require("puppeteer-core");

const CLAVE = process.env.APP_SEED_PASSWORD;
if (!CLAVE) { console.error("Define APP_SEED_PASSWORD con la contraseña de las cuentas de prueba."); process.exit(2); }
const SHOTS = path.join(AQUI, "capturas-v08");
mkdirSync(SHOTS, { recursive: true });
const BASE = "http://localhost:5173/#";
const NUEVO = "SIM-99000404";
const VERDE = "SIM-11048217";
const TINGUINA = "SIM-11052690";
const ROJO = "SIM-11075836";
const LIMITES = ["No certifica saneamiento.", "No recomienda comprar.", "No reemplaza asesoría legal.",
  "Los datos y los especialistas son simulados.", "La verificación jurídica con abogado o notario se realiza fuera del sistema."];
const PARTIDA = "C00001\nCompraventa a favor de Inmobiliaria Demo Sur S.A.C. (100 %).";

// ---------------------------------------------------------------- PDF generados por el script (sin archivos en el repo)
/**
 * Un PDF real de una página con una imagen RGB sin comprimir (degradado con ruido leve, como un plano escaneado). Con
 * 1700 × 1100 px pesa unos 5,6 MB: supera el umbral de 5 MB y el servidor lo optimiza.
 */
function pdfConImagen(ancho, alto) {
  const px = Buffer.alloc(ancho * alto * 3);
  let semilla = 7;
  const azar = () => (semilla = (semilla * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const i = (y * ancho + x) * 3;
      px[i] = Math.min(255, (x * 255) / ancho + azar() * 18);
      px[i + 1] = Math.min(255, (y * 255) / alto + azar() * 18);
      px[i + 2] = Math.min(255, 120 + azar() * 18);
    }
  }
  const partes = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1")];
  const offsets = [];
  let largo = partes[0].length;
  const agregar = (b) => { partes.push(b); largo += b.length; };
  const objeto = (n, cuerpo) => { offsets[n] = largo; agregar(Buffer.from(`${n} 0 obj\n${cuerpo}\nendobj\n`, "latin1")); };
  objeto(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objeto(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objeto(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>");
  offsets[4] = largo;
  agregar(Buffer.from(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${ancho} /Height ${alto} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${px.length} >>\nstream\n`, "latin1"));
  agregar(px);
  agregar(Buffer.from("\nendstream\nendobj\n", "latin1"));
  const contenido = "q 555 0 0 802 20 20 cm /Im1 Do Q";
  objeto(5, `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`);
  const xref = largo;
  let tabla = "xref\n0 6\n0000000000 65535 f \n";
  for (let n = 1; n <= 5; n++) tabla += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  agregar(Buffer.from(`${tabla}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`, "latin1"));
  return Buffer.concat(partes);
}
const TMP = mkdtempSync(path.join(os.tmpdir(), "recorrido-v08-"));
const PDF_CHICO = path.join(TMP, "plano-chico.pdf");
const PDF_GRANDE = path.join(TMP, "plano-escaneado-grande.pdf");
writeFileSync(PDF_CHICO, pdfConImagen(300, 200));
writeFileSync(PDF_GRANDE, pdfConImagen(1700, 1100));
const MB = (b) => (b / 1048576).toFixed(1).replace(".", ",");

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errores = [];
page.on("pageerror", (e) => errores.push(e.message));
page.on("console", (m) => { if (m.type() === "error" && !/40[034]|409|413|422|Failed to load resource/.test(m.text())) errores.push(m.text()); });

// Intl separa «S/» del importe con un espacio de no separación.
const texto = () => page.evaluate(() => document.body.innerText.replace(/ /g, " "));
const conTexto = (t, timeout = 20000) => page.waitForFunction((x) => document.body.innerText.includes(x), { timeout }, t);
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

/** Llamada directa al servidor con la sesión actual: comprueba el permiso sin depender de lo que oculte la interfaz. */
const apiSesion = (metodo, ruta, cuerpo) => page.evaluate(async (m, r, c) => {
  const res = await fetch("/api/v1" + r, { method: m,
    headers: { Authorization: "Bearer " + sessionStorage.getItem("tm_token"), ...(c ? { "Content-Type": "application/json" } : {}) },
    body: c ? JSON.stringify(c) : undefined });
  let cuerpoResp = null;
  try { cuerpoResp = await res.json(); } catch { /* sin cuerpo */ }
  return { status: res.status, body: cuerpoResp };
}, metodo, ruta, cuerpo ?? null);

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

/** Elige una opción de un Desplegable por su etiqueta visible. */
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

/** Sube un PDF al plano desde su tarjeta del panel de planos, como lo haría el revisor. */
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

const verPie = async () => { const t = await texto(); return LIMITES.every((l) => t.includes(l)); };

const pasos = [];
async function paso(n, cuenta, esperado, nombre, fn) {
  const hechos = [];
  let ok = true;
  const v = (cond, desc) => { hechos.push(`${cond ? "" : "NO: "}${desc}`); if (!cond) ok = false; };
  try {
    await fn(v);
  } catch (e) {
    ok = false;
    hechos.push(`Error: ${e.message.split("\n")[0]}`);
  }
  await page.screenshot({ path: path.join(SHOTS, `${String(n).padStart(2, "0")}-${nombre}.png`), fullPage: true }).catch(() => {});
  pasos.push({ n, cuenta, esperado, obtenido: hechos.join("; "), ok, captura: `${String(n).padStart(2, "0")}-${nombre}.png` });
  console.log(`${ok ? "OK   " : "FALLA"} ${n}. ${esperado}\n      ${hechos.join("\n      ")}`);
}

await paso(1, "revisor-01", `Registra ${NUEVO} con origen simulado y propietario-02; los planos no se pueden marcar presentados sin PDF`, "registro-borrador", async (v) => {
  await ingresar("revisor-01");
  await ir("/casos/nueva");
  await desplegable("Origen de la partida", "Simulada para demostración");
  await escribir("Número de partida", NUEVO);
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
  const deshabilitadas = await page.evaluate(() => ["ARQUITECTURA", "ESTRUCTURAS"].every((e) =>
    document.querySelector(`#bt-estado-${e} option[value=PRESENTADO]`)?.disabled
    && document.querySelector(`#bt-estado-${e} option[value=OBSERVADO]`)?.disabled));
  v(deshabilitadas, "«Presentado» y «Observado» no se pueden elegir sin archivo");
  await page.evaluate(() => document.querySelector("label input[type=checkbox]").click());
  await espera(200);
  await page.evaluate(() => document.querySelector("form button[type=submit]").click());
  await page.waitForFunction((c) => location.hash === `#/casos/${c}`, { timeout: 15000 }, NUEVO).catch(async () => {
    throw new Error(`No navegó al caso: ${(await texto()).match(/No se registró[^\n]*\n[^\n]*/)?.[0] ?? "sin mensaje"}`);
  });
  await listo();
  const d = (await apiSesion("GET", `/casos/${NUEVO}`)).body;
  v(d.publicacion.estado === "BORRADOR" && !d.publicacion.autorizada, "borrador y sin autorización");
  v(d.sintetico === true && d.fuente === "Partida simulada para demostración", `fuente «${d.fuente}», sintético`);
  v(d.publicacion.propietarioCodigo === "propietario-02", "propietario-02");
  v(d.evaluacion?.estado === "GRIS", `A = ${d.evaluacion?.estado} (faltan los planos base)`);
  v(d.predio.precioReferencial === 150000, "precio referencial S/ 150,000");
});

await paso(2, "revisor-01", "Intentar PRESENTADO sin PDF se rechaza; subir el PDF lo deja presentado", "plano-sin-pdf-y-subida", async (v) => {
  const d = (await apiSesion("GET", `/casos/${NUEVO}`)).body;
  const x = d.expediente;
  const peticion = {
    condicionRepresentada: x.condicionRepresentada, completitud: x.completitud, fechaReferencial: x.fechaReferencial,
    nota: x.nota, zonaRegistral: x.zonaRegistral, oficinaRegistral: x.oficinaRegistral, ubicacion: x.ubicacion,
    areaM2: x.areaM2, linderos: x.linderos, antecedenteDominial: x.antecedenteDominial,
    asientos: x.asientos.map((a) => ({ referencia: a.referencia, tipoActo: a.tipoActo, estado: a.estado, texto: a.texto, titulares: a.titulares })),
    tipoPredio: x.tipoPredio, areaConstruidaInscrita: x.areaConstruidaInscrita,
    planos: x.planos.map((p) => ({ especialidad: p.especialidad, estado: p.especialidad === "ARQUITECTURA" ? "PRESENTADO" : p.estado })),
    versionEsperada: x.version,
  };
  const r = await apiSesion("PUT", `/casos/${NUEVO}/expediente`, peticion);
  v(r.status === 422, `servidor: ${r.status}`);
  v((r.body?.detail ?? "").includes("Sube el PDF del plano antes de marcarlo como presentado"), `mensaje: «${r.body?.detail}»`);
  await ir(`/casos/${NUEVO}`);
  await subirPlanoUI("ARQUITECTURA", PDF_CHICO);
  await conTexto("Archivo guardado.");
  await subirPlanoUI("ESTRUCTURAS", PDF_CHICO);
  await page.waitForFunction(() => document.querySelectorAll("li[data-especialidad] [role=status]").length >= 2, { timeout: 15000 }).catch(() => {});
  await espera(800);
  const despues = (await apiSesion("GET", `/casos/${NUEVO}`)).body;
  const arq = despues.expediente.planos.find((p) => p.especialidad === "ARQUITECTURA");
  v(arq.estado === "PRESENTADO" && arq.documento?.origen === "SUBIDO", `arquitectura: ${arq.estado}, ${arq.documento?.origen}`);
  v(despues.evaluacion.estado === "AMARILLO", `A = ${despues.evaluacion.estado} (faltan II.EE. y II.SS.)`);
  v((await texto()).includes("Subido por revisor-01"), "la tarjeta dice «Subido por revisor-01 …»");
});

await paso(3, "revisor-01", "Un PDF de más de 5 MB generado por el script avisa y se optimiza al subirlo", "pdf-grande-optimizado", async (v) => {
  const input = await page.waitForSelector("#plano-pdf-ELECTRICAS");
  await input.uploadFile(PDF_GRANDE);
  await espera(300);
  v((await texto()).includes("Se optimizará automáticamente"), `aviso previo «Se optimizará automáticamente» (${MB(statSync(PDF_GRANDE).size)} MB)`);
  const ok = await page.evaluate(() => {
    const li = document.querySelector('li[data-especialidad="ELECTRICAS"]');
    const b = li && [...li.querySelectorAll("button")].find((x) => !x.disabled && /Subir PDF/.test(x.innerText));
    b?.click();
    return !!b;
  });
  v(ok, "botón de subida");
  await conTexto("Optimizado:", 60000);
  const t = await texto();
  const linea = t.split("\n").find((l) => l.startsWith("Optimizado:")) ?? "";
  v(/Optimizado: [\d,]+ MB → [\d,]+ MB/.test(linea), `la pantalla dice «${linea}»`);
  const p = (await apiSesion("GET", `/casos/${NUEVO}`)).body.expediente.planos.find((x) => x.especialidad === "ELECTRICAS");
  v(p.documento?.optimizado === true && p.documento.tamanoBytes < p.documento.tamanoOriginalBytes,
    `guardado ${MB(p.documento?.tamanoBytes ?? 0)} MB de ${MB(p.documento?.tamanoOriginalBytes ?? 0)} MB`);
  v(p.documento.tamanoBytes <= 10 * 1048576, "no supera el máximo de 10 MB");
});

await paso(4, "comprador-01", "No ve el borrador en el catálogo ni por URL", "comprador-no-ve-borrador", async (v) => {
  await ingresar("comprador-01");
  await ir("/casos");
  const n = (await page.$$("article")).length;
  v(n === 10, `catálogo con ${n} casos`);
  v(!(await texto()).includes(NUEVO), `${NUEVO} ausente del catálogo`);
  await ir(`/casos/${NUEVO}`);
  v((await texto()).includes("No encontramos este expediente"), "por URL: «No encontramos este expediente»");
  v((await apiSesion("GET", `/casos/${NUEVO}`)).status === 404, "servidor: 404");
  v((await apiSesion("GET", `/casos/${NUEVO}/ruta-regularizacion`)).status === 404, "ruta del borrador: 404");
});

await paso(5, "propietario-01", "No ve el caso de otro propietario", "propietario-ajeno", async (v) => {
  await ingresar("propietario-01");
  await ir("/mis-inmuebles");
  v(!(await texto()).includes(NUEVO), "ausente de Mis inmuebles");
  await ir(`/casos/${NUEVO}`);
  v((await texto()).includes("No encontramos este expediente"), "por URL: «No encontramos este expediente»");
  v((await apiSesion("GET", `/casos/${NUEVO}`)).status === 404, "servidor: 404");
});

await paso(6, "gestor-01", "No puede publicar sin autorización", "gestor-sin-autorizacion", async (v) => {
  await ingresar("gestor-01");
  await ir(`/casos/${NUEVO}`);
  v(!(await hayBoton("Publicar")), "sin botón «Publicar»");
  v((await texto()).includes("No se puede publicar hasta que el propietario autorice"), "aviso de autorización pendiente");
  const r = await apiSesion("POST", `/casos/${NUEVO}/publicacion`);
  v(r.status === 422, `servidor: ${r.status}`);
});

await paso(7, "propietario-02", "Autoriza su caso (Mis inmuebles con resaltado de A)", "propietario-autoriza", async (v) => {
  await ingresar("propietario-02");
  await ir("/mis-inmuebles");
  v((await texto()).includes(NUEVO), "el caso aparece en Mis inmuebles");
  v((await page.$$("article[data-resaltado]")).length > 0, "tarjeta con resaltado de A");
  await ir(`/casos/${NUEVO}`);
  await pulsar("Autorizar publicación", true);
  await conTexto("Autorización registrada.");
  const d = (await apiSesion("GET", `/casos/${NUEVO}`)).body;
  v(d.publicacion.autorizada === true, "autorización vigente");
  v(d.publicacion.estado === "BORRADOR", "sigue en borrador hasta que el gestor publique");
  v(!("gestion" in d), "el propietario no recibe el semáforo de gestión");
});

await paso(8, "revisor-01", "Subsana II.SS. con su PDF: A pasa a verde y el historial lo registra", "subsanacion", async (v) => {
  await ingresar("revisor-01");
  await ir(`/casos/${NUEVO}`);
  const antes = (await apiSesion("GET", `/casos/${NUEVO}/historial`)).body.length;
  await subirPlanoUI("SANITARIAS", PDF_CHICO);
  await page.waitForFunction(async (c) => {
    const r = await fetch(`/api/v1/casos/${c}`, { headers: { Authorization: "Bearer " + sessionStorage.getItem("tm_token") } });
    return (await r.json()).evaluacion?.estado === "VERDE";
  }, { timeout: 20000 }, NUEVO).catch(() => {});
  const h = (await apiSesion("GET", `/casos/${NUEVO}/historial`)).body;
  v(h.length === antes + 1, `${h.length} entradas (antes ${antes})`);
  v(h.at(-1).estadoAnterior === "AMARILLO" && h.at(-1).estadoNuevo === "VERDE", `${h.at(-1).estadoAnterior} → ${h.at(-1).estadoNuevo}`);
  v(h.at(-1).origen === "PLANO_ADJUNTO" && h[0].origen === "PARTIDA_SIMULADA", "origen PLANO_ADJUNTO; la primera entrada se conserva");
  await ir(`/casos/${NUEVO}`);
  v((await texto()).includes("Sin alertas en los campos evaluados: no hay pasos de regularización"), "ruta: sin pasos");
});

let antesDePublicar;
await paso(9, "gestor-01", "Publica y A no cambia", "gestor-publica", async (v) => {
  await ingresar("gestor-01");
  await ir(`/casos/${NUEVO}`);
  antesDePublicar = (await apiSesion("GET", `/casos/${NUEVO}`)).body.evaluacion;
  await pulsar("Publicar", true);
  await conTexto("Caso publicado.");
  const d = (await apiSesion("GET", `/casos/${NUEVO}`)).body;
  v(d.publicacion.estado === "PUBLICADO", "publicado");
  v(JSON.stringify(d.evaluacion) === JSON.stringify(antesDePublicar), `A idéntico: ${d.evaluacion.estado}`);
});

await paso(10, "comprador-01", `Ve el caso, abre ${VERDE} (planos y glosario) y en ${ROJO} pide contacto e inspección`, "comprador-consulta", async (v) => {
  await ingresar("comprador-01");
  await ir("/casos");
  v((await texto()).includes(NUEVO), `${NUEVO} en el catálogo`);
  v((await texto()).includes("S/ 150,000"), "precio visible en la tarjeta");
  await ir(`/casos/${VERDE}`);
  let t = await texto();
  v(t.includes("Ver lámina") || t.includes("Ver plano"), "planos con su lámina");
  v(t.includes("Generado por el sistema a partir de la transcripción, no es un documento oficial"), "origen de la lámina generada");
  v(t.includes("Glosario de este expediente"), "glosario visible");
  await ir(`/casos/${ROJO}`);
  await pulsar("Solicitar contacto");
  await page.waitForSelector("[role=dialog]");
  await pulsar("Enviar solicitud");
  await conTexto("Solicitud registrada el");
  v(true, "contacto registrado");
  await pulsar("Solicitar inspección técnica");
  await page.waitForFunction(() => document.body.innerText.includes("Confirmar solicitud"));
  await pulsar("Confirmar solicitud");
  await conTexto("a nombre de comprador-01");
  const d = (await apiSesion("GET", `/casos/${ROJO}`)).body;
  v(d.evaluacionTecnica.estado === "SOLICITADA", "inspección solicitada");
  v(d.evaluacion.estado === "ROJO", "A sigue en rojo");
  t = await texto();
  v(t.includes("Pendiente de asignación por el gestor"), "la pantalla dice «Pendiente de asignación por el gestor»");
});

await paso(11, "gestor-01", "Marca atendido el contacto y asigna especialista-02", "gestor-atiende-asigna", async (v) => {
  await ingresar("gestor-01");
  await ir("/cartera");
  v((await texto()).includes(`Partida ${ROJO}`), "contacto en la bandeja");
  await pulsar("Marcar atendida");
  await conTexto("marcada como atendida");
  v(true, "contacto atendido");
  await ir(`/casos/${ROJO}`);
  await desplegable("Cuenta del especialista", "especialista-02");
  await pulsar("Asignar", true);
  await conTexto("Inspección asignada a especialista-02");
  const d = (await apiSesion("GET", `/casos/${ROJO}`)).body;
  v(d.evaluacionTecnica.especialistaAsignadoCodigo === "especialista-02", "asignada a especialista-02");
});

await paso(12, "especialista-01", "No puede emitir: la inspección es de otro; no ve el semáforo de gestión", "especialista-no-asignado", async (v) => {
  await ingresar("especialista-01");
  await ir(`/casos/${ROJO}`);
  const t = await texto();
  v(!t.includes("Guardar informe"), "sin formulario de informe");
  v(t.includes("asignada a otro especialista"), "aviso «asignada a otro especialista»");
  v(!t.includes("Gestión inmobiliaria (interno)"), "sin panel de gestión");
  const r = await apiSesion("PUT", `/casos/${ROJO}/inspeccion`, { estado: "EN_INSPECCION" });
  v(r.status === 403, `servidor: ${r.status}`);
  v((await apiSesion("GET", `/casos/${ROJO}/decisiones-captacion`)).status === 403, "decisiones: 403");
});

await paso(13, "especialista-02", `Emite el informe y ${ROJO} sigue en rojo`, "especialista-emite", async (v) => {
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
  v(d.evaluacionTecnica.profesional === "Arq. Perfil Ficticio 02", `firma: ${d.evaluacionTecnica.profesional}`);
  v(d.evaluacion.estado === "ROJO", `A = ${d.evaluacion.estado}`);
});

await paso(14, "comprador-01", `Ruta de ${ROJO} (Pueblo Nuevo, esfuerzo alto) y de ${TINGUINA} (La Tinguiña, medio), sin editar`, "ruta-regularizacion", async (v) => {
  await ingresar("comprador-01");
  const versionTinguina = (await apiSesion("GET", `/casos/${TINGUINA}`)).body.expediente.version;
  await ir(`/casos/${ROJO}`);
  await conTexto("Ruta de regularización");
  let t = await texto();
  const rRojo = (await apiSesion("GET", `/casos/${ROJO}/ruta-regularizacion`)).body;
  v(rRojo.esfuerzo === "ALTO" && rRojo.items.some((i) => i.clave === "RP-01"), `Pueblo Nuevo: ${rRojo.esfuerzo}, ${rRojo.items.map((i) => i.clave).join(", ")}`);
  v(t.includes("Esfuerzo alto") && t.includes("Juzgado"), "la pantalla muestra «Esfuerzo alto» y «Juzgado»");
  v(t.includes("Orientativo: no es asesoría legal ni recomendación de compra"), "aviso orientativo");
  v(!t.includes("Gestión inmobiliaria (interno)"), "el comprador no ve el semáforo de gestión");
  await page.evaluate(() => document.getElementById("ex-ruta")?.scrollIntoView());
  await ir(`/casos/${TINGUINA}`);
  await conTexto("Ruta de regularización");
  t = await texto();
  const rT = (await apiSesion("GET", `/casos/${TINGUINA}/ruta-regularizacion`)).body;
  v(rT.esfuerzo === "MEDIO", `La Tinguiña: ${rT.esfuerzo}`);
  v(t.includes("Acreedor") && t.includes("No consta en la partida: solicitar al propietario o al acreedor"), "plazo del gravamen: «No consta…»");
  const despues = (await apiSesion("GET", `/casos/${TINGUINA}`)).body;
  v(despues.expediente.version === versionTinguina && despues.evaluacion.estado === "AMARILLO", "La Tinguiña no se editó (misma versión, amarillo)");
  await page.evaluate(() => document.getElementById("ex-ruta")?.scrollIntoView());
  await espera(300);
});

await paso(15, "gestor-01", "El panel de cartera refleja el recorrido, con conteos por tipo de alerta, esfuerzo y estado de gestión", "panel-cartera", async (v) => {
  await ingresar("gestor-01");
  await ir("/cartera");
  const p = (await apiSesion("GET", "/cartera/panel")).body;
  v(p.totalCasos === 11, `${p.totalCasos} casos`);
  v(p.porEstadoPublicacion.PUBLICADO === 11, `${p.porEstadoPublicacion.PUBLICADO} publicados`);
  v(p.porColor.VERDE === 3, `${p.porColor.VERDE} verdes`);
  v(p.contactosPendientes.length === 0, `${p.contactosPendientes.length} contactos pendientes`);
  v(p.inspecciones.length === 2 && p.inspeccionesAsignadas === 1 && p.inspeccionesSinAsignar === 1, `${p.inspecciones.length} inspecciones: ${p.inspeccionesAsignadas} asignada, ${p.inspeccionesSinAsignar} sin asignar`);
  const tipos = p.porTipoAlerta.filter((x) => x.casos > 0).map((x) => `${x.codigo}=${x.casos}`).join(", ");
  v(p.porTipoAlerta.length > 0 && p.porTipoAlerta.find((x) => x.codigo === "RP-01")?.casos >= 1, `por tipo: ${tipos}`);
  const esf = p.porEsfuerzo;
  v(esf.BAJO + esf.MEDIO + esf.ALTO + esf.SIN_PASOS === 11, `por esfuerzo: bajo ${esf.BAJO}, medio ${esf.MEDIO}, alto ${esf.ALTO}, sin pasos ${esf.SIN_PASOS}`);
  const g = p.porEstadoGestion;
  v(Object.values(g).reduce((a, b) => a + b, 0) === 11, `por gestión: ${Object.entries(g).map(([k, n]) => `${k}=${n}`).join(", ")}`);
  const t = await texto();
  v(t.includes("Casos por tipo de alerta") && t.includes("Esfuerzo de regularización") && t.includes("Por regularizar"), "tarjetas y tabla en pantalla");
  v(t.includes("Priorización interna de la inmobiliaria; no es una recomendación de compra"), "aviso de priorización");
  v(t.includes("Gestión inmobiliaria (interno)") && t.includes("Tipo de alerta × estado de gestión"), "conteo por gestión y matriz");
});

await paso(16, "gestor-01, comprador-01", `Registra NO_CAPTAR_POR_AHORA (PROCESO_JUDICIAL) en ${ROJO}; el comprador no ve el semáforo de gestión`, "decision-captacion", async (v) => {
  await ingresar("gestor-01");
  await ir(`/casos/${ROJO}`);
  const antes = (await apiSesion("GET", `/casos/${ROJO}`)).body;
  await conTexto("Gestión inmobiliaria (interno)");
  await page.select("#g-decision", "NO_CAPTAR_POR_AHORA");
  await page.select("#g-motivo", "PROCESO_JUDICIAL");
  await pulsar("Registrar decisión", true);
  await conTexto("Decisión registrada: No captar por ahora (Proceso judicial).");
  await page.evaluate(() => document.getElementById("ex-gestion")?.scrollIntoView());
  await espera(400);
  await page.screenshot({ path: path.join(SHOTS, "16b-panel-gestion.png") });
  const despues = (await apiSesion("GET", `/casos/${ROJO}`)).body;
  v(JSON.stringify(despues.evaluacion) === JSON.stringify(antes.evaluacion), `A no cambia: ${despues.evaluacion.estado}`);
  v(JSON.stringify(despues.evaluacionTecnica) === JSON.stringify(antes.evaluacionTecnica), "B no cambia");
  v(despues.gestion?.estado === "REQUIERE_REGULARIZACION", `gestión: ${despues.gestion?.estado}`);
  const h = (await apiSesion("GET", `/casos/${ROJO}/decisiones-captacion`)).body;
  v(h.at(-1)?.decision === "NO_CAPTAR_POR_AHORA" && h.at(-1)?.cuentaCodigo === "gestor-01", "historial de decisiones con cuenta y fecha");
  // La decisión no bloquea publicar: se retira y se vuelve a publicar confirmando el aviso.
  await pulsar("Retirar", true);
  await conTexto("Publicación retirada.");
  let mensaje = null;
  page.once("dialog", async (d) => { mensaje = d.message(); await d.accept(); });
  await pulsar("Publicar", true);
  await conTexto("Caso publicado.");
  v(mensaje === "La decisión registrada es no captar por ahora. ¿Publicar de todos modos?", `confirmación: «${mensaje}»`);
  await ingresar("comprador-01");
  await ir(`/casos/${ROJO}`);
  const t = await texto();
  const d = (await apiSesion("GET", `/casos/${ROJO}`)).body;
  v(!("gestion" in d), "el detalle del comprador no trae el campo gestion");
  v(!t.includes("Gestión inmobiliaria (interno)") && !t.includes("No captar por ahora"), "ni el panel ni la decisión en pantalla");
  const lista = (await apiSesion("GET", "/casos")).body;
  v(lista.every((c) => !("gestion" in c)), "el catálogo no trae el campo gestion");
  v((await apiSesion("POST", `/casos/${ROJO}/decision-captacion`, { decision: "CAPTAR", motivo: "DOCUMENTACION_COMPLETA" })).status === 403, "decisión: 403");
});

await paso(17, "comprador-01", "Filtra el catálogo por tipo de alerta (hipoteca vigente)", "filtro-tipo-alerta", async (v) => {
  await ir("/casos?tipoAlerta=RV-02");
  await listo();
  const esperados = (await apiSesion("GET", "/casos?tipoAlerta=RV-02")).body.map((c) => c.codigo);
  const enPantalla = await page.evaluate(() => [...document.querySelectorAll("article")].map((a) => a.innerText));
  v(esperados.includes(TINGUINA), `servidor: ${esperados.join(", ")}`);
  v(enPantalla.length === esperados.length, `${enPantalla.length} tarjetas para ${esperados.length} casos`);
  v((await texto()).includes("Alerta · RV-02"), "chip del filtro activo");
});

await paso(18, "comprador-01", "Tarjetas resaltadas por el color de A en el catálogo (escritorio y celular, sin desborde)", "tarjetas-resaltadas", async (v) => {
  await ir("/casos");
  const estilos = await page.evaluate(() => [...document.querySelectorAll("article[data-resaltado]")].map((a) => ({
    estado: a.dataset.resaltado, borde: parseFloat(getComputedStyle(a).borderLeftWidth), texto: a.innerText,
  })));
  v(estilos.length === 11, `${estilos.length} tarjetas con resaltado`);
  v(estilos.every((e) => e.borde >= 3), "borde izquierdo de 3 px o más");
  const etiquetas = { VERDE: "Sin alertas en los campos evaluados", AMARILLO: "Requiere revisión", ROJO: "Alerta prioritaria",
    GRIS: "Información insuficiente o condición no evaluable" };
  v(estilos.every((e) => e.texto.includes(etiquetas[e.estado])), "cada tarjeta dice su estado con texto");
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await ir("/casos");
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  v(desborde <= 0, `ancho de celular sin desborde horizontal (${desborde} px)`);
  await page.screenshot({ path: path.join(SHOTS, "18b-tarjetas-celular.png") });
  await page.setViewport({ width: 1280, height: 900 });
  await ingresar("gestor-01");
  await ir("/cartera");
  const chips = await page.evaluate(() => [...document.querySelectorAll("article[data-resaltado]")].filter((a) => a.innerText.includes("Gestión:")).length);
  v(chips === 11, `Cartera: ${chips} filas con chip de gestión y esfuerzo`);
  await page.evaluate(() => document.getElementById("titulo-lista")?.scrollIntoView());
  await espera(300);
  await page.screenshot({ path: path.join(SHOTS, "18c-cartera-chips.png") });
});

await paso(19, "propietario-02, comprador-01", "Retira la autorización y el caso sale del catálogo", "retira-autorizacion", async (v) => {
  await ingresar("propietario-02");
  await ir(`/casos/${NUEVO}`);
  await pulsar("Retirar autorización", true);
  await conTexto("Autorización retirada.");
  const d = (await apiSesion("GET", `/casos/${NUEVO}`)).body;
  v(d.publicacion.estado === "RETIRADO" && !d.publicacion.autorizada, "retirado y sin autorización");
  v(d.evaluacion.estado === "VERDE", `A no cambia: ${d.evaluacion.estado}`);
  await ingresar("comprador-01");
  await ir("/casos");
  v(!(await texto()).includes(NUEVO), "fuera del catálogo");
  await ir(`/casos/${NUEVO}`);
  v((await texto()).includes("No encontramos este expediente"), "por URL: no encontrado");
});

await paso(20, "todas", "El pie muestra los límites legales en todas las pantallas y el login dice que es entorno demostrativo", "pie-y-login", async (v) => {
  const pantallas = [["revisor-01", "/casos/nueva"], ["gestor-01", "/cartera"], ["propietario-01", "/mis-inmuebles"],
    ["especialista-01", `/casos/${VERDE}`], ["comprador-01", "/casos"]];
  for (const [cuenta, ruta] of pantallas) {
    await ingresar(cuenta);
    await ir(ruta);
    v(await verPie(), `pie en ${ruta} (${cuenta})`);
    v(await page.evaluate(() => [...document.images].every((i) => i.src.startsWith(location.origin) || i.src.startsWith("data:"))), `sin imágenes externas en ${ruta}`);
  }
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: "networkidle0" });
  await ir("/");
  v(await verPie(), "pie en la landing");
  await ir("/login");
  v((await texto()).includes("Entorno académico demostrativo"), "login: «Entorno académico demostrativo»");
});

await browser.close();

const fallas = pasos.filter((p) => !p.ok).length;
const commit = execSync("git rev-parse --short HEAD").toString().trim();
const fila = (p) => `| ${p.n} | ${p.cuenta} | ${p.esperado} | ${p.obtenido.replace(/\|/g, "/")} | ${p.ok ? "OK" : "**FALLA**"} | \`${p.captura}\` |`;
const salida = `# Resultado del recorrido de la v0.8

Fecha: ${new Date().toISOString().slice(0, 10)}. Commit: \`${commit}\`. Chrome sin ventana, base H2 nueva fuera del repositorio, ${pasos.length - fallas} de ${pasos.length} pasos correctos.
Script: \`docs/pruebas/recorrido-v08.mjs\`. Capturas: \`docs/pruebas/capturas-v08/\` (más \`16b-panel-gestion.png\`, \`18b-tarjetas-celular.png\` y \`18c-cartera-chips.png\`).
Los PDF de prueba los genera el script en una carpeta temporal (uno de unos 5,6 MB para la optimización); no quedan en el repositorio.

| Paso | Cuenta | Esperado | Obtenido | Resultado | Captura |
|---|---|---|---|---|---|
${pasos.map(fila).join("\n")}

**Errores de JavaScript en la consola:** ${errores.length ? errores.join("; ") : "ninguno"}.
`;
writeFileSync(path.join(AQUI, "RESULTADO-recorrido-v08.md"), salida);
console.log(`\n${pasos.length - fallas} de ${pasos.length} pasos correctos. Errores de consola: ${errores.length}`);
process.exit(fallas ? 1 : 0);
