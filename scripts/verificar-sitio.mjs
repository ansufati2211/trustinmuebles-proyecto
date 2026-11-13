// v1.0 (etapa 8): verificación rápida de un sitio instalado (local o en la nube), sin dependencias y sin sesión.
//
// Consulta, como un visitante:
//   1. GET /api/v1/publico/sitio: versión, indexable y cifras de la portada;
//   2. la lista de inmuebles (GET /api/v1/publico/inmuebles);
//   3. el detalle de un inmueble (el primer caso de la lista) y la ficha de un lote de proyecto;
//   4. un proyecto con su plano (lotes con manzana, número y estado);
//   5. robots.txt, que debe traer «Disallow» (el sitio no se indexa mientras app.sitio.indexable sea false);
//   6. que la partida salga oculta sin sesión: la ficha registral en PDF muestra «1105••••» y nunca el número completo.
// Imprime OK o FALLA por punto y sale con 0 si todo está OK, 1 si algo falla y 2 si no se pudo conectar.
//
// Uso: node scripts/verificar-sitio.mjs <URL>
//   Local (interfaz de Vite, que reenvía /api y /robots.txt): node scripts/verificar-sitio.mjs http://localhost:5173
//   Local (solo el backend):                                    node scripts/verificar-sitio.mjs http://localhost:8080
//   Nube:                                                        node scripts/verificar-sitio.mjs https://<dominio-de-la-demo>
import zlib from "node:zlib";

const URL_BASE = (process.argv[2] ?? "").replace(/\/+$/, "");
if (!/^https?:\/\//.test(URL_BASE)) {
  console.error("Uso: node scripts/verificar-sitio.mjs <URL>   (por ejemplo http://localhost:5173)");
  process.exit(2);
}
const API = `${URL_BASE}/api/v1`;
const resultados = [];

async function pedir(url) {
  const r = await fetch(url, { headers: { Accept: "application/json, application/pdf, text/plain, */*" }, redirect: "follow" });
  const tipo = r.headers.get("content-type") ?? "";
  const buf = Buffer.from(await r.arrayBuffer());
  let json = null;
  if (tipo.includes("json")) { try { json = JSON.parse(buf.toString("utf8")); } catch { /* no es JSON */ } }
  return { status: r.status, tipo, buf, json };
}

async function punto(nombre, fn) {
  try {
    const detalle = await fn();
    resultados.push({ ok: true, nombre, detalle });
  } catch (e) {
    resultados.push({ ok: false, nombre, detalle: e.message });
  }
}

const exigir = (condicion, mensaje) => { if (!condicion) throw new Error(mensaje); };

/** Texto de un PDF sin dependencias: descomprime los flujos y junta las cadenas que se dibujan (Tj). */
function textoPdf(buf) {
  const crudo = buf.toString("latin1");
  const flujos = [];
  const re = /(?<!end)stream\r?\n/g;
  let m;
  while ((m = re.exec(crudo))) {
    const ini = m.index + m[0].length;
    const fin = crudo.indexOf("endstream", ini);
    if (fin < 0) break;
    const datos = buf.subarray(ini, fin);
    try { flujos.push(zlib.inflateSync(datos, { finishFlush: zlib.constants.Z_SYNC_FLUSH }).toString("latin1")); } catch {
      flujos.push(datos.toString("latin1"));
    }
    re.lastIndex = fin;
  }
  const todo = `${crudo}\n${flujos.join("\n")}`;
  const cadenas = [];
  const lit = /(\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f\s]+>)\s*Tj/g;
  while ((m = lit.exec(todo))) {
    const s = m[1];
    if (s.startsWith("<")) { cadenas.push(Buffer.from(s.slice(1, -1).replace(/\s/g, ""), "hex").toString("latin1")); continue; }
    cadenas.push(s.slice(1, -1).replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, x) =>
      /^[0-7]+$/.test(x) ? String.fromCharCode(parseInt(x, 8)) : ({ n: "\n", r: "\r", t: "\t", b: "", f: "" }[x] ?? x)));
  }
  // «•» en WinAnsi es 0x95.
  return cadenas.join(" | ").replace(/\x95/g, "•");
}

console.log(`Verificando ${URL_BASE} …\n`);
try {
  await fetch(`${API}/publico/sitio`);
} catch (e) {
  console.error(`No se pudo conectar con ${URL_BASE}: ${e.message}`);
  process.exit(2);
}

let lista = null;
let caso = null;
let lote = null;

await punto("Sitio (/publico/sitio)", async () => {
  const r = await pedir(`${API}/publico/sitio`);
  exigir(r.status === 200 && r.json, `respondió ${r.status}`);
  const c = r.json.cifras;
  exigir(r.json.version, "sin versión");
  exigir(c && c.inmueblesPublicados > 0, "sin cifras o sin inmuebles publicados");
  return `versión ${r.json.version}, indexable ${r.json.indexable ? "sí" : "no"}, ${c.inmueblesPublicados} inmuebles publicados, `
    + `${c.proyectos} proyectos, ${c.lotesDisponibles} lotes disponibles`;
});

await punto("Lista de inmuebles", async () => {
  const r = await pedir(`${API}/publico/inmuebles?pagina=0`);
  exigir(r.status === 200 && r.json?.items?.length > 0, `respondió ${r.status} sin inmuebles`);
  lista = r.json;
  const todos = [];
  for (let p = 0; p < Math.min(lista.totalPaginas, 60) && (!caso || !lote); p++) {
    const pag = p === 0 ? lista : (await pedir(`${API}/publico/inmuebles?pagina=${p}`)).json;
    for (const i of pag?.items ?? []) todos.push(i);
    caso ??= todos.find((i) => i.clase === "CASO");
    lote ??= todos.find((i) => i.clase === "LOTE_PROYECTO");
  }
  return `${lista.total} inmuebles en ${lista.totalPaginas} páginas`;
});

await punto("Detalle de un inmueble", async () => {
  exigir(caso, "la lista no trae ningún caso publicado");
  const r = await pedir(`${API}/publico/inmuebles/${encodeURIComponent(caso.codigo)}`);
  exigir(r.status === 200 && r.json?.denominacion, `respondió ${r.status}`);
  let extra = "";
  if (lote) {
    const l = await pedir(`${API}/publico/proyectos/${lote.proyectoCodigo}/lotes/${lote.lote}`);
    exigir(l.status === 200 && l.json?.lote, `la ficha del lote ${lote.lote} respondió ${l.status}`);
    extra = `; ficha del lote ${lote.lote} de ${l.json.proyectoNombre}: ${l.json.lote.estadoComercialEtiqueta}`;
  }
  return `${r.json.denominacion}${extra}`;
});

await punto("Proyecto con su plano", async () => {
  const codigo = lote?.proyectoCodigo ?? "altos-de-ventisca";
  const r = await pedir(`${API}/publico/proyectos/${codigo}`);
  exigir(r.status === 200 && r.json?.lotes?.length > 0, `respondió ${r.status} sin lotes`);
  const sinDatos = r.json.lotes.filter((l) => !l.manzana || !l.numero || !l.estadoComercial);
  exigir(sinDatos.length === 0, `${sinDatos.length} lotes sin manzana, número o estado`);
  const c = r.json.conteo;
  return `${r.json.nombre}: ${r.json.lotes.length} lotes (${c.disponibles} disponibles, ${c.separados} separados, ${c.vendidos} vendidos)`;
});

await punto("robots.txt (Disallow)", async () => {
  const r = await pedir(`${URL_BASE}/robots.txt`);
  const t = r.buf.toString("utf8");
  exigir(r.status === 200 && /Disallow:/i.test(t), `respondió ${r.status} sin «Disallow»`);
  return t.trim().replace(/\r?\n/g, " · ");
});

await punto("Partida oculta sin sesión", async () => {
  exigir(caso, "no hay un caso para revisar");
  const codigo = caso.codigo;
  const r = await pedir(`${API}/publico/inmuebles/${encodeURIComponent(codigo)}/documento`);
  exigir(r.status === 200 && r.buf.subarray(0, 5).toString("latin1") === "%PDF-", `la ficha registral respondió ${r.status}`);
  const t = textoPdf(r.buf);
  const visible = codigo.slice(0, 4);
  exigir(t.includes(`${visible}••••`), `la ficha no muestra «${visible}••••»`);
  exigir(!t.includes(codigo), `la ficha muestra la partida completa ${codigo}`);
  return `ficha registral de ${visible}•••• sin el número completo`;
});

const ancho = Math.max(...resultados.map((r) => r.nombre.length));
for (const r of resultados) console.log(`  ${r.ok ? "OK   " : "FALLA"}  ${r.nombre.padEnd(ancho)}  ${r.detalle}`);
const fallas = resultados.filter((r) => !r.ok).length;
console.log(fallas ? `\n${fallas} de ${resultados.length} puntos fallaron.` : `\nLos ${resultados.length} puntos están OK.`);
process.exit(fallas ? 1 : 0);
