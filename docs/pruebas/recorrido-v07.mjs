// Recorrido de navegador de la v0.7 con los 5 roles: 15 pasos, una captura por paso y una tabla de resultados.
// Requisitos: backend con una base NUEVA, interfaz en http://localhost:5173 y Google Chrome instalado. puppeteer-core es una
// devDependency de trustinmuebles.
// Uso: APP_SEED_PASSWORD=<la del backend> node docs/pruebas/recorrido-v07.mjs
// Genera docs/pruebas/capturas-v07/ y docs/pruebas/RESULTADO-recorrido-v07.md. Un paso en FALLA se registra y el recorrido sigue.
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(AQUI, "..", "..", "trustinmuebles", "package.json"));
const puppeteer = require("puppeteer-core");

const CLAVE = process.env.APP_SEED_PASSWORD;
if (!CLAVE) { console.error("Define APP_SEED_PASSWORD con la contraseña de las cuentas de prueba."); process.exit(2); }
const SHOTS = path.join(AQUI, "capturas-v07");
mkdirSync(SHOTS, { recursive: true });
const BASE = "http://localhost:5173/#";
const NUEVO = "SIM-99000404";
const VERDE = "SIM-11048217";
const ROJO = "SIM-11075836";
const LIMITES = ["No certifica saneamiento.", "No recomienda comprar.", "No reemplaza asesoría legal.",
  "Los datos y los especialistas son simulados.", "La verificación jurídica con abogado o notario se realiza fuera del sistema."];
const PARTIDA = "C00001\nCompraventa a favor de Inmobiliaria Demo Sur S.A.C. (100 %).";

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errores = [];
page.on("pageerror", (e) => errores.push(e.message));
page.on("console", (m) => { if (m.type() === "error" && !/40[34]|409|422|Failed to load resource/.test(m.text())) errores.push(m.text()); });

// Intl separa «S/» del importe con un espacio de no separación.
const texto = () => page.evaluate(() => document.body.innerText.replace(/ /g, " "));
const conTexto = (t, timeout = 15000) => page.waitForFunction((x) => document.body.innerText.includes(x), { timeout }, t);
const listo = () => page.waitForFunction(() => !/Cargando/.test(document.body.innerText), { timeout: 15000 });
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

await paso(1, "revisor-01", `Registra ${NUEVO} con origen simulado y propietario-02; queda en borrador`, "registro-borrador", async (v) => {
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
  await page.select("#bt-estado-ARQUITECTURA", "PRESENTADO");
  await page.waitForSelector("#bt-area-ARQUITECTURA");
  await page.type("#bt-area-ARQUITECTURA", "90");
  await page.select("#bt-estado-ESTRUCTURAS", "PRESENTADO");
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
  v(d.evaluacion?.estado === "AMARILLO", `A = ${d.evaluacion?.estado}`);
  v(d.predio.precioReferencial === 150000, "precio referencial S/ 150,000");
  v((await texto()).includes("Sin autorización del propietario"), "la pantalla dice «Sin autorización del propietario»");
});

await paso(2, "comprador-01", "No ve el borrador en el catálogo ni por URL", "comprador-no-ve-borrador", async (v) => {
  await ingresar("comprador-01");
  await ir("/casos");
  const n = (await page.$$("article")).length;
  v(n === 10, `catálogo con ${n} casos`);
  v(!(await texto()).includes(NUEVO), `${NUEVO} ausente del catálogo`);
  await ir(`/casos/${NUEVO}`);
  v((await texto()).includes("No encontramos este expediente"), "por URL: «No encontramos este expediente»");
  v((await apiSesion("GET", `/casos/${NUEVO}`)).status === 404, "servidor: 404");
});

await paso(3, "propietario-01", "No ve el caso de otro propietario", "propietario-ajeno", async (v) => {
  await ingresar("propietario-01");
  await ir("/mis-inmuebles");
  v(!(await texto()).includes(NUEVO), "ausente de Mis inmuebles");
  await ir(`/casos/${NUEVO}`);
  v((await texto()).includes("No encontramos este expediente"), "por URL: «No encontramos este expediente»");
  v((await apiSesion("GET", `/casos/${NUEVO}`)).status === 404, "servidor: 404");
});

await paso(4, "gestor-01", "No puede publicar sin autorización", "gestor-sin-autorizacion", async (v) => {
  await ingresar("gestor-01");
  await ir(`/casos/${NUEVO}`);
  v(!(await hayBoton("Publicar")), "sin botón «Publicar»");
  v((await texto()).includes("No se puede publicar hasta que el propietario autorice"), "aviso de autorización pendiente");
  const r = await apiSesion("POST", `/casos/${NUEVO}/publicacion`);
  v(r.status === 422, `servidor: ${r.status}`);
});

await paso(5, "propietario-02", "Autoriza su caso", "propietario-autoriza", async (v) => {
  await ingresar("propietario-02");
  await ir("/mis-inmuebles");
  v((await texto()).includes(NUEVO), "el caso aparece en Mis inmuebles");
  await ir(`/casos/${NUEVO}`);
  await pulsar("Autorizar publicación", true);
  await conTexto("Autorización registrada.");
  const d = (await apiSesion("GET", `/casos/${NUEVO}`)).body;
  v(d.publicacion.autorizada === true, "autorización vigente");
  v(d.publicacion.estado === "BORRADOR", "sigue en borrador hasta que el gestor publique");
});

await paso(6, "revisor-01", "Ve el indicador A y el historial", "revisor-a-e-historial", async (v) => {
  await ingresar("revisor-01");
  await ir(`/casos/${NUEVO}`);
  const t = await texto();
  v(t.includes("Amarillo"), "A: Amarillo en pantalla");
  v(t.includes("Historial de evaluaciones"), "historial visible");
  v(t.includes("Partida simulada incorporada"), "origen «Partida simulada incorporada»");
  const h = (await apiSesion("GET", `/casos/${NUEVO}/historial`)).body;
  v(h.length === 1, `${h.length} entrada`);
});

await paso(7, "revisor-01", "Subsana en el caso nuevo y aparece una entrada nueva en el historial", "subsanacion", async (v) => {
  await page.select("#bt-estado-ELECTRICAS", "PRESENTADO");
  await page.select("#bt-estado-SANITARIAS", "PRESENTADO");
  await pulsar("Guardar y recalcular");
  await conTexto("Guardado. El estado se recalculó");
  await listo();
  const h = (await apiSesion("GET", `/casos/${NUEVO}/historial`)).body;
  v(h.length === 2, `${h.length} entradas`);
  v(h.at(-1).estadoAnterior === "AMARILLO" && h.at(-1).estadoNuevo === "VERDE", `${h.at(-1).estadoAnterior} → ${h.at(-1).estadoNuevo}`);
  v(h[0].origen === "PARTIDA_SIMULADA", "la entrada anterior se conserva");
  await espera(600);
  v((await texto()).includes("Plano incorporado o adjuntado"), "la pantalla muestra la entrada nueva");
});

let antesDePublicar;
await paso(8, "gestor-01", "Publica y A no cambia", "gestor-publica", async (v) => {
  await ingresar("gestor-01");
  await ir(`/casos/${NUEVO}`);
  antesDePublicar = (await apiSesion("GET", `/casos/${NUEVO}`)).body.evaluacion;
  await pulsar("Publicar", true);
  await conTexto("Caso publicado.");
  const d = (await apiSesion("GET", `/casos/${NUEVO}`)).body;
  v(d.publicacion.estado === "PUBLICADO", "publicado");
  v(JSON.stringify(d.evaluacion) === JSON.stringify(antesDePublicar), `A idéntico: ${d.evaluacion.estado}`);
});

await paso(9, "comprador-01", `Ve el caso, abre ${VERDE} (planos y glosario) y en ${ROJO} pide contacto e inspección`, "comprador-consulta", async (v) => {
  await ingresar("comprador-01");
  await ir("/casos");
  v((await texto()).includes(NUEVO), `${NUEVO} en el catálogo`);
  v((await texto()).includes("S/ 150,000"), "precio visible en la tarjeta");
  await ir(`/casos/${VERDE}`);
  let t = await texto();
  v(t.includes("Ver lámina") || t.includes("Ver plano"), "planos con su lámina");
  v(t.includes("Glosario de este expediente"), "glosario visible");
  const termino = await page.evaluate(() => {
    const b = document.querySelector("button[aria-expanded]");
    b?.click();
    return b?.innerText;
  });
  await espera(300);
  v((await texto()).includes("Glosario v0.4"), `término «${termino}» abierto`);
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

await paso(10, "gestor-01", "Marca atendido el contacto y asigna especialista-02", "gestor-atiende-asigna", async (v) => {
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

await paso(11, "especialista-01", "No puede emitir: la inspección es de otro", "especialista-no-asignado", async (v) => {
  await ingresar("especialista-01");
  await ir(`/casos/${ROJO}`);
  const t = await texto();
  v(!t.includes("Guardar informe"), "sin formulario de informe");
  v(t.includes("asignada a otro especialista"), "aviso «asignada a otro especialista»");
  const r = await apiSesion("PUT", `/casos/${ROJO}/inspeccion`, { estado: "EN_INSPECCION" });
  v(r.status === 403, `servidor: ${r.status}`);
});

await paso(12, "especialista-02", `Emite el informe y ${ROJO} sigue en rojo`, "especialista-emite", async (v) => {
  await ingresar("especialista-02");
  await ir(`/casos/${ROJO}`);
  await desplegable("Estado", "Informe emitido");
  await desplegable("Conclusión del informe", "Favorable");
  const ayer = new Date(Date.now() - 86400000);
  const iso = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, "0")}-${String(ayer.getDate()).padStart(2, "0")}`;
  await page.evaluate((d) => document.querySelector(`form [data-iso="${d}"]`).click(), iso);
  // Una por una, como una persona: cada elección parte del estado que dejó la anterior.
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
  v((await texto()).includes("Perfil ficticio de demostración"), "credencial «Perfil ficticio de demostración»");
});

await paso(13, "gestor-01", "El panel de cartera refleja el recorrido", "panel-cartera", async (v) => {
  await ingresar("gestor-01");
  await ir("/cartera");
  const p = (await apiSesion("GET", "/cartera/panel")).body;
  v(p.totalCasos === 11, `${p.totalCasos} casos`);
  v(p.porEstadoPublicacion.PUBLICADO === 11, `${p.porEstadoPublicacion.PUBLICADO} publicados`);
  v(p.porColor.VERDE === 3, `${p.porColor.VERDE} verdes`);
  v(p.contactosPendientes.length === 0, `${p.contactosPendientes.length} contactos pendientes`);
  v(p.inspecciones.length === 2 && p.inspeccionesAsignadas === 1 && p.inspeccionesSinAsignar === 1, `${p.inspecciones.length} inspecciones: ${p.inspeccionesAsignadas} asignada, ${p.inspeccionesSinAsignar} sin asignar`);
  const t = await texto();
  v(t.includes("Pendiente de asignación por el gestor") && t.includes("especialista-01"), "la pantalla muestra ambas asignaciones");
});

await paso(14, "propietario-02, comprador-01", "Retira la autorización y el caso sale del catálogo", "retira-autorizacion", async (v) => {
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

await paso(15, "todas", "El pie muestra los límites legales en todas las pantallas y el login dice que es entorno demostrativo", "pie-y-login", async (v) => {
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
const salida = `# Resultado del recorrido de la v0.7

Fecha: ${new Date().toISOString().slice(0, 10)}. Commit: \`${commit}\`. Chrome sin ventana, base H2 nueva, ${pasos.length - fallas} de ${pasos.length} pasos correctos.
Script: \`docs/pruebas/recorrido-v07.mjs\`. Capturas: \`docs/pruebas/capturas-v07/\`.

| Paso | Cuenta | Esperado | Obtenido | Resultado | Captura |
|---|---|---|---|---|---|
${pasos.map(fila).join("\n")}

**Errores de JavaScript en la consola:** ${errores.length ? errores.join("; ") : "ninguno"}.
`;
writeFileSync(path.join(AQUI, "RESULTADO-recorrido-v07.md"), salida);
console.log(`\n${pasos.length - fallas} de ${pasos.length} pasos correctos. Errores de consola: ${errores.length}`);
process.exit(fallas ? 1 : 0);
