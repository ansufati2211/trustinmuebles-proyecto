// v1.0 (etapa 7): deja lista la base para la demostración, solo a través de la API y sin borrar nada.
//
// Con el backend recién iniciado (base nueva), comprueba que estén los datos precargados:
//   - los 4 proyectos de contenido/proyectos.json con sus lotes (Horizonte de Los Aquijes va sin lotes: los carga el CSV
//     del kit durante la demo);
//   - los 15 interesados precargados (correos @example.com) y sus 4 citas de los próximos 7 días.
// Si algo falta o cambió, lo repone (etapa 8):
//   - lotes: los que faltan se cargan por CSV y los que cambiaron de estado vuelven al de la semilla (el mismo reparto
//     determinista de ProyectosSeeder, con su semilla) o, en Horizonte de Los Aquijes si ya se cargó, al del CSV del kit;
//   - interesados que faltan: por el registro desde el panel (POST /interesados, con la sesión de asesor-01, canal
//     LLAMADA y consentimiento verbal), con su cita; después el asesor confirma o reprograma la cita y lo lleva a su
//     etapa. El registro del panel no tiene límite por IP.
// Un proyecto que no existe no se puede crear por la API: el script lo informa (reinicia la base).
//
// Uso: APP_SEED_PASSWORD=<contraseña de las cuentas> node scripts/preparar-demo.mjs [--solo-verificar]
//      Opcional: API_URL (por defecto http://127.0.0.1:8080/api/v1), CUENTA (por defecto asesor-01).
// Sale con código 0 si todo quedó completo, 1 si algo sigue faltando y 2 si no pudo conectarse o ingresar.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = (process.env.API_URL ?? "http://127.0.0.1:8080/api/v1").replace(/\/$/, "");
const CLAVE = process.env.APP_SEED_PASSWORD;
const CUENTA = process.env.CUENTA ?? "asesor-01";
const SOLO_VERIFICAR = process.argv.includes("--solo-verificar");

if (!CLAVE) {
  console.error("Define APP_SEED_PASSWORD con la contraseña de las cuentas (la misma con la que arrancó el backend).");
  process.exit(2);
}

const CONTENIDO = path.join(RAIZ, "trustinmuebles-backend", "src", "main", "resources", "contenido");
const PROYECTOS = JSON.parse(readFileSync(path.join(CONTENIDO, "proyectos.json"), "utf8")).proyectos;
const PRECIOS = JSON.parse(readFileSync(path.join(CONTENIDO, "precios-zona.json"), "utf8"));
/** v1.0 (etapa 8): estados del CSV del kit para el proyecto que se carga en vivo. */
const KIT_CSV = { "horizonte-de-los-aquijes": path.join(RAIZ, "docs", "demo", "kit", "proyecto-nuevo-80-lotes.csv") };

/**
 * Respaldo de la precarga de interesados (la misma de InteresSeeder: nombre de pila, correo @example.com, etapa y a qué
 * se refiere). `lote` es el n-ésimo lote disponible del proyecto; -1, el proyecto; `caso`, el primer caso publicado.
 * Van primero los que tienen cita, por el límite de envíos por hora.
 */
const INTERESADOS = [
  { nombre: "María", correo: "maria.ventas@example.com", etapa: "NUEVO", proyecto: "altos-de-ventisca", lote: 0, min: 30000, max: 45000, area: 140, pago: "FINANCIADO",
    cita: { modalidad: "VISITA_AL_LOTE", estado: "SOLICITADA", dias: 2, franja: "MANANA", dos: true } },
  { nombre: "Ana", correo: "ana.familia@example.com", etapa: "CITA_AGENDADA", proyecto: "altos-de-ventisca", lote: 1, min: 30000, max: 40000, area: 130, pago: "FINANCIADO",
    cita: { modalidad: "VISITA_AL_LOTE", estado: "CONFIRMADA", dias: 1, franja: "MANANA" } },
  { nombre: "Miguel", correo: "miguel.compra@example.com", etapa: "CITA_AGENDADA", proyecto: "terrazas-de-sauzal", lote: 1, max: 55000, pago: "POR_DEFINIR",
    cita: { modalidad: "LLAMADA", estado: "REPROGRAMADA", dias: 4, franja: "TARDE" } },
  { nombre: "Lucía", correo: "lucia.hogar@example.com", etapa: "CITA_AGENDADA", proyecto: "rinconada-del-lucumo", lote: 1, min: 45000, max: 60000, area: 160, pago: "FINANCIADO",
    cita: { modalidad: "REUNION_EN_OFICINA", estado: "CONFIRMADA", dias: 6, franja: "TARDE", dos: true } },
  { nombre: "José", correo: "jose.lotes@example.com", etapa: "NUEVO", zona: "Subtanjalla", tipo: "LOTE", min: 25000, max: 40000, area: 120, pago: "POR_DEFINIR" },
  { nombre: "Rosa", correo: "rosa.consultas@example.com", etapa: "NUEVO", proyecto: "rinconada-del-lucumo", lote: -1, pago: "POR_DEFINIR" },
  { nombre: "Luis", correo: "luis.terreno@example.com", etapa: "CONTACTADO", proyecto: "rinconada-del-lucumo", lote: 0, min: 35000, max: 50000, area: 150, pago: "CONTADO" },
  { nombre: "Carmen", correo: "carmen.casa@example.com", etapa: "CONTACTADO", caso: true, max: 120000, pago: "FINANCIADO" },
  { nombre: "Jorge", correo: "jorge.inversion@example.com", etapa: "CONTACTADO", proyecto: "terrazas-de-sauzal", lote: 0, min: 40000, max: 60000, area: 160, pago: "CONTADO" },
  { nombre: "Pedro", correo: "pedro.decision@example.com", etapa: "VISITA_REALIZADA", proyecto: "altos-de-ventisca", lote: 2, min: 35000, max: 45000, area: 140, pago: "CONTADO" },
  { nombre: "Elena", correo: "elena.proyecto@example.com", etapa: "VISITA_REALIZADA", proyecto: "terrazas-de-sauzal", lote: 2, min: 50000, max: 70000, area: 180, pago: "FINANCIADO" },
  { nombre: "Juan", correo: "juan.separacion@example.com", etapa: "SEPARACION", proyecto: "altos-de-ventisca", lote: 3, min: 35000, max: 45000, area: 140, pago: "FINANCIADO" },
  { nombre: "Patricia", correo: "patricia.lote@example.com", etapa: "SEPARACION", proyecto: "rinconada-del-lucumo", lote: 2, max: 50000, pago: "CONTADO" },
  { nombre: "Diego", correo: "diego.cierre@example.com", etapa: "VENTA", proyecto: "terrazas-de-sauzal", lote: 3, min: 45000, max: 60000, area: 170, pago: "CONTADO" },
  { nombre: "Sofía", correo: "sofia.busqueda@example.com", etapa: "DESCARTADO", zona: "Ica", tipo: "VIVIENDA", max: 150000, pago: "FINANCIADO" },
];
const CITAS_ESPERADAS = INTERESADOS.filter((i) => i.cita).length;

// ------------------------------------------------------------------------------------------------ API

let token = null;
async function api(metodo, ruta, cuerpo, { publico = false, formulario = null } = {}) {
  const headers = {};
  if (!publico && token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (formulario) body = formulario;
  else if (cuerpo !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(cuerpo); }
  const res = await fetch(API + ruta, { method: metodo, headers, body });
  let datos = null;
  const tipo = res.headers.get("content-type") ?? "";
  if (tipo.includes("json")) datos = await res.json().catch(() => null);
  return { status: res.status, datos };
}

async function esperarServidor(segundos = 180) {
  const base = API.replace(/\/api\/v1$/, "");
  for (let i = 0; i < segundos; i++) {
    try {
      const r = await fetch(`${base}/actuator/health`);
      if (r.ok) return true;
    } catch { /* todavía no arranca */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

const hoyMas = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
};

// ------------------------------------------------------------------------------------------------ proyectos

/** java.util.Random (LCG de 48 bits): reproduce el reparto de estados de ProyectosSeeder con la misma semilla. */
class RandomJava {
  static MASCARA = (1n << 48n) - 1n;
  constructor(semilla) { this.s = (BigInt(semilla) ^ 0x5DEECE66Dn) & RandomJava.MASCARA; }
  next(bits) {
    this.s = (this.s * 0x5DEECE66Dn + 0xBn) & RandomJava.MASCARA;
    return Number(this.s >> BigInt(48 - bits));
  }
  nextInt(cota) {
    let r = this.next(31);
    const m = cota - 1;
    if ((cota & m) === 0) return Number((BigInt(cota) * BigInt(r)) >> 31n);
    for (let u = r; u - (r = u % cota) + m > 2147483647; u = this.next(31));
    return r;
  }
}

/** ProyectosSeeder.repartoDeEstados: 15 % vendidos, 25 % separados, el resto disponibles, barajados como Collections.shuffle. */
export function repartoDeEstados(n, semilla) {
  const vendidos = Math.round(n * 0.15);
  const separados = Math.round(n * 0.25);
  const e = Array.from({ length: n }, (_, i) => (i < vendidos ? "VENDIDO" : i < vendidos + separados ? "SEPARADO" : "DISPONIBLE"));
  const azar = new RandomJava(semilla);
  for (let i = n; i > 1; i--) {
    const j = azar.nextInt(i);
    [e[i - 1], e[j]] = [e[j], e[i - 1]];
  }
  return e;
}

/** ProyectosSeeder.valorM2 y precioEnRango (etapa 8): valor fijo dentro del rango del distrito, +8 % en esquina, a S/ 500. */
function precioDeLote(rango, manzana, numero, area, esquina) {
  if (!rango) return null;
  const escalon = (((manzana.toUpperCase().charCodeAt(0) - 65) * 7 + numero * 3) % 11 + 11) % 11;
  const m2 = Math.round((rango.min + ((rango.max - rango.min) * escalon) / 10) * 100) / 100;
  const bruto = area * m2 * (esquina ? 1 + PRECIOS.recargoEsquina : 1);
  const paso = PRECIOS.redondeo ?? 500;
  return Math.round(bruto / paso) * paso;
}

/** Lotes que manda proyectos.json para un proyecto (manzana, número, área, precio, zonificación y estado de la semilla). */
function lotesEsperados(p) {
  const rango = PRECIOS.rangoPorM2?.[p.distrito];
  const salida = [];
  for (const m of p.manzanas ?? []) {
    const mitad = Math.floor((m.lotes + 1) / 2);
    for (let n = 1; n <= m.lotes; n++) {
      const esquina = n === 1 || n === mitad || n === mitad + 1 || n === m.lotes;
      const area = Math.round((esquina ? m.frente + 1.5 : m.frente) * m.fondo * 100) / 100;
      salida.push({ clave: `${m.manzana}-${n}`, manzana: m.manzana, numero: n, area,
        precio: precioDeLote(rango, m.manzana, n, area, esquina), zonificacion: m.zonificacion ?? "",
        independizacion: m.independizacion ?? p.independizacion ?? "EN_PARTIDA_MATRIZ" });
    }
  }
  const estados = repartoDeEstados(salida.length, p.semilla);
  salida.forEach((l, i) => { l.estado = estados[i]; });
  return salida;
}

/** Lotes del CSV del kit (Horizonte de Los Aquijes), con su estado. */
function lotesDelKit(codigo) {
  const archivo = KIT_CSV[codigo];
  if (!archivo) return [];
  const [cab, ...filas] = readFileSync(archivo, "utf8").trim().split(/\r?\n/);
  const col = cab.split(",");
  return filas.map((f) => {
    const v = Object.fromEntries(f.split(",").map((x, i) => [col[i], x]));
    return { clave: `${v.manzana}-${v.lote}`, manzana: v.manzana, numero: Number(v.lote), area: Number(v.area_m2),
      precio: v.precio ? Number(v.precio) : null, estado: v.estado || "DISPONIBLE", zonificacion: v.zonificacion ?? "",
      independizacion: v.independizacion || "EN_PARTIDA_MATRIZ" };
  });
}

/** Lotes actuales del proyecto por clave (vacío si el proyecto aún no se ve en el portal). */
async function lotesActuales(codigo) {
  const r = await api("GET", `/publico/proyectos/${codigo}`, undefined, { publico: true });
  if (r.status !== 200) return new Map();
  return new Map(r.datos.lotes.map((l) => [l.clave, l]));
}

async function prepararProyectos(resumen) {
  const r = await api("GET", "/proyectos");
  if (r.status !== 200) throw new Error(`GET /proyectos respondió ${r.status}`);
  const existentes = new Map(r.datos.map((p) => [p.codigo, p]));
  for (const p of PROYECTOS) {
    const actual = existentes.get(p.codigo);
    if (!actual) {
      resumen.push({ grupo: "Proyecto", nombre: p.nombre, estado: "FALTA", detalle: "no existe y no se puede crear por la API: reinicia la base" });
      continue;
    }
    // Sin manzanas en el contenido (Horizonte de Los Aquijes): se carga en vivo con el CSV del kit. Si ya se cargó, se
    // repone con los estados de ese CSV; si no, se deja vacío para la demo.
    const delKit = (p.manzanas ?? []).length === 0;
    if (delKit && actual.lotes === 0) {
      resumen.push({ grupo: "Proyecto", nombre: p.nombre, estado: "OK",
        detalle: "0 lotes (va sin lotes: se cargan en la demo con el CSV del kit)" });
      continue;
    }
    const esperados = delKit ? lotesDelKit(p.codigo) : lotesEsperados(p);
    const actuales = await lotesActuales(p.codigo);
    const faltan = esperados.filter((l) => !actuales.has(l.clave));
    // Con caso propio, el estado comercial vive en el caso: no se toca desde aquí.
    const cambiados = esperados.filter((l) => actuales.has(l.clave) && !actuales.get(l.clave).casoCodigo
      && actuales.get(l.clave).estadoComercial !== l.estado);
    const fuente = delKit ? "CSV del kit" : "semilla";
    if (faltan.length === 0 && cambiados.length === 0) {
      resumen.push({ grupo: "Proyecto", nombre: p.nombre, estado: "OK",
        detalle: `${actual.lotes} lotes, ${actual.publicados} publicados, estados como en la ${fuente}, autorización ${actual.autorizacionVigente ? "vigente" : "NO vigente"}` });
      continue;
    }
    if (SOLO_VERIFICAR) {
      resumen.push({ grupo: "Proyecto", nombre: p.nombre, estado: "FALTA",
        detalle: `faltan ${faltan.length} lotes y ${cambiados.length} cambiaron de estado respecto de la ${fuente}` });
      continue;
    }
    const hechos = [];
    let fallo = false;
    if (faltan.length) {
      const csv = ["manzana,lote,area_m2,precio,moneda,estado,independizacion,zonificacion,codigo_caso",
        ...faltan.map((l) => [l.manzana, l.numero, l.area.toFixed(2), l.precio ?? "", l.precio ? PRECIOS.moneda : "",
          l.estado, l.independizacion, l.zonificacion, ""].join(","))].join("\n");
      const formulario = new FormData();
      formulario.append("archivo", new Blob([csv], { type: "text/csv" }), `${p.codigo}-faltantes.csv`);
      const c = await api("POST", `/proyectos/${p.codigo}/lotes/carga`, undefined, { formulario });
      if (c.status === 200) hechos.push(`se cargaron ${faltan.length} lotes que faltaban`);
      else { fallo = true; hechos.push(`la carga respondió ${c.status}`); }
    }
    let repuestos = 0;
    for (const l of cambiados) {
      const r = await api("PUT", `/proyectos/${p.codigo}/lotes/${l.clave}/estado-comercial`, { estadoComercial: l.estado });
      if (r.status === 200) repuestos++;
      else { fallo = true; hechos.push(`${l.clave}: el cambio de estado respondió ${r.status}`); }
    }
    if (repuestos) hechos.push(`${repuestos} lotes volvieron al estado de la ${fuente}`);
    resumen.push({ grupo: "Proyecto", nombre: p.nombre, estado: fallo ? "FALTA" : "CARGADO", detalle: hechos.join("; ") });
  }
}

// ------------------------------------------------------------------------------------------------ interesados

/** Cuerpo del registro desde el panel (etapa 8): los mismos campos del formulario, con canal y consentimiento verbal. */
async function destinoDe(i) {
  const cuerpo = { canal: "LLAMADA", consentimientoVerbal: true, nombre: i.nombre, medio: "CORREO", contacto: i.correo,
    formaPago: i.pago };
  if (i.min) cuerpo.presupuestoMin = i.min;
  if (i.max) { cuerpo.presupuestoMax = i.max; cuerpo.moneda = "PEN"; }
  if (i.area) cuerpo.areaDeseada = i.area;
  if (i.zona) cuerpo.zona = i.zona;
  if (i.tipo) cuerpo.tipo = i.tipo;
  if (i.caso) {
    const r = await api("GET", "/publico/inmuebles?pagina=0&clase=CASO", undefined, { publico: true });
    const caso = r.datos?.items?.[0];
    if (caso) cuerpo.casoCodigo = caso.codigo;
  } else if (i.proyecto) {
    cuerpo.proyectoCodigo = i.proyecto;
    if (i.lote >= 0) {
      const r = await api("GET", `/publico/proyectos/${i.proyecto}`, undefined, { publico: true });
      const disponibles = (r.datos?.lotes ?? []).filter((l) => l.publicado && l.estadoComercial === "DISPONIBLE" && !l.casoCodigo);
      const lote = disponibles[Math.min(i.lote, disponibles.length - 1)];
      if (lote) cuerpo.lote = lote.clave;
    }
  }
  if (i.cita) {
    const opciones = [{ fecha: hoyMas(i.cita.dias), franja: i.cita.franja }];
    if (i.cita.dos) opciones.push({ fecha: hoyMas(i.cita.dias + 1), franja: i.cita.franja === "MANANA" ? "TARDE" : "MANANA" });
    // Una visita al lote necesita un lote o inmueble; si no lo hay, se pide reunión en oficina.
    const modalidad = i.cita.modalidad === "VISITA_AL_LOTE" && !cuerpo.lote && !cuerpo.casoCodigo ? "REUNION_EN_OFICINA" : i.cita.modalidad;
    cuerpo.cita = { modalidad, opciones };
  }
  return cuerpo;
}

async function llevarAEtapa(id, i) {
  if (i.cita?.estado === "CONFIRMADA" || i.cita?.estado === "REPROGRAMADA") {
    const det = await api("GET", `/interesados/${id}`);
    const cita = det.datos?.citas?.[0];
    if (cita && i.cita.estado === "CONFIRMADA") await api("PUT", `/citas/${cita.id}/confirmacion`, { opcion: 1 });
    if (cita && i.cita.estado === "REPROGRAMADA") {
      await api("PUT", `/citas/${cita.id}/reprogramacion`, { fecha: hoyMas(i.cita.dias + 1), franja: i.cita.franja });
    }
  }
  const det = await api("GET", `/interesados/${id}`);
  if (det.datos?.interes?.etapa !== i.etapa) await api("PUT", `/interesados/${id}/etapa`, { etapa: i.etapa });
  await api("PUT", `/interesados/${id}/seguimiento`, { responsable: CUENTA });
}

async function prepararInteresados(resumen) {
  const r = await api("GET", "/interesados");
  if (r.status !== 200) throw new Error(`GET /interesados respondió ${r.status}`);
  const porCorreo = new Map(r.datos.map((x) => [x.contacto, x]));
  const faltan = INTERESADOS.filter((i) => !porCorreo.has(i.correo));
  let cargados = 0;
  if (faltan.length && !SOLO_VERIFICAR) {
    for (const i of faltan) {
      const envio = await api("POST", "/interesados", await destinoDe(i));
      if (envio.status !== 201) { console.warn(`  ${i.nombre}: el registro desde el panel respondió ${envio.status}`); continue; }
      await llevarAEtapa(envio.datos.interes.id, i);
      cargados++;
    }
  }
  const total = (await api("GET", "/interesados")).datos;
  const presentes = INTERESADOS.filter((i) => total.some((x) => x.contacto === i.correo)).length;
  resumen.push({ grupo: "Interesados", nombre: "Precarga (correos @example.com)",
    estado: presentes === INTERESADOS.length ? (cargados ? "CARGADO" : "OK") : "FALTA",
    detalle: `${presentes} de ${INTERESADOS.length}${cargados ? `; se cargaron ${cargados}` : ""}` });
  const porEtapa = {};
  for (const x of total) porEtapa[x.etapaEtiqueta] = (porEtapa[x.etapaEtiqueta] ?? 0) + 1;
  resumen.push({ grupo: "Interesados", nombre: "Por etapa", estado: "INFO",
    detalle: Object.entries(porEtapa).map(([k, v]) => `${k} ${v}`).join(", ") });
}

async function verificarCitas(resumen) {
  const r = await api("GET", "/citas/agenda");
  if (r.status !== 200) throw new Error(`GET /citas/agenda respondió ${r.status}`);
  const ids = new Set();
  const porEstado = {};
  for (const d of r.datos.dias) for (const c of d.citas) {
    if (ids.has(c.cita.id)) continue;
    ids.add(c.cita.id);
    porEstado[c.cita.estadoEtiqueta] = (porEstado[c.cita.estadoEtiqueta] ?? 0) + 1;
  }
  resumen.push({ grupo: "Citas", nombre: `Agenda ${r.datos.desde} a ${r.datos.hasta}`,
    estado: ids.size >= CITAS_ESPERADAS ? "OK" : "FALTA",
    detalle: `${ids.size} citas (se esperan al menos ${CITAS_ESPERADAS}): ${Object.entries(porEstado).map(([k, v]) => `${k} ${v}`).join(", ") || "ninguna"}` });
}

async function verificarCatalogo(resumen) {
  const r = await api("GET", "/publico/inmuebles?pagina=0", undefined, { publico: true });
  resumen.push({ grupo: "Catálogo", nombre: "Inmuebles publicados", estado: r.status === 200 && r.datos.total > 0 ? "OK" : "FALTA",
    detalle: r.status === 200 ? `${r.datos.total} en el portal público` : `respondió ${r.status}` });
  const s = await api("GET", "/publico/sitio", undefined, { publico: true });
  resumen.push({ grupo: "Sistema", nombre: "Versión", estado: "INFO",
    detalle: `${s.datos?.version ?? "?"} · indexable: ${s.datos?.indexable ? "sí" : "no"}` });
}

// ------------------------------------------------------------------------------------------------ main

console.log(`Preparando la demostración contra ${API}${SOLO_VERIFICAR ? " (solo verificar)" : ""}…`);
if (!(await esperarServidor())) { console.error("El backend no respondió en 3 minutos."); process.exit(2); }
const login = await api("POST", "/auth/login", { codigoCuenta: CUENTA, password: CLAVE }, { publico: true });
if (login.status !== 200) { console.error(`No se pudo ingresar como ${CUENTA} (${login.status}).`); process.exit(2); }
token = login.datos.token;

const resumen = [];
try {
  await prepararProyectos(resumen);
  await prepararInteresados(resumen);
  await verificarCitas(resumen);
  await verificarCatalogo(resumen);
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(2);
}

const ancho = Math.max(...resumen.map((x) => `${x.grupo} · ${x.nombre}`.length));
console.log("\nResumen:");
for (const x of resumen) console.log(`  [${x.estado.padEnd(8)}] ${`${x.grupo} · ${x.nombre}`.padEnd(ancho)}  ${x.detalle}`);
const falta = resumen.some((x) => x.estado === "FALTA");
console.log(falta ? "\nAlgo sigue faltando: revisa las líneas FALTA." : "\nLa base está lista para la demostración. No se borró nada.");
process.exit(falta ? 1 : 0);
