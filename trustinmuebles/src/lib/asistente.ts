import { FILTROS_PUBLICO_VACIOS, sentidoPorOmision, type FiltrosPublico } from "./filtrosPublico";
import { precio } from "./formato";
import { compatibilidadUso, etiquetaUso, type CategoriaUso } from "./usosLote";
import type { InmueblePublico, OpcionesFiltro } from "./types";

/*
 * v1.0 (etapa 5): asistente de búsqueda por reglas. Convierte una frase en español de Perú («lote en Subtanjalla de
 * menos de 60 mil soles para casa») en los filtros del catálogo público, sin IA ni servicios externos: expresiones
 * regulares sobre el texto normalizado. Lo entendido se muestra como etiquetas que se pueden quitar, y con los resultados
 * se recomiendan los 3 mejores con su motivo. «Sin problemas» es el indicador A en verde: lo que dice la revisión de los
 * documentos, nunca una promesa sobre la compra.
 */

export type ClaveEtiqueta = "tipo" | "proyecto" | "distrito" | "precio" | "precioM2" | "area" | "indicadorA" | "orden" | "uso";
export interface Etiqueta { clave: ClaveEtiqueta; texto: string }

/** Lo que el asistente entendió de una frase: solo los filtros que reconoció, más el uso deseado (no es un filtro). */
export interface Interpretacion {
  filtros: Partial<FiltrosPublico>;
  uso: CategoriaUso | null;
  entendido: boolean;
}

/** Catálogo para reconocer proyectos y distritos: los mismos valores de los selectores de filtro. */
export type Contexto = Pick<OpcionesFiltro, "proyectos" | "distritos">;

// ------------------------------------------------------------------------------------------------------ normalización

/** Minúsculas, sin tildes ni «ñ» (quien escribe «Tinguina» encuentra «La Tinguiña»), «m²» como «m2» y espacios simples. */
export function normalizar(frase: string): string {
  return frase
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/m²/g, "m2")
    .replace(/[¿?¡!;:"“”]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PALABRAS_VACIAS = new Set(["de", "del", "la", "las", "los", "el", "en", "y"]);

/** Quita del texto lo que ya se interpretó, para que no se vuelva a leer como otra cosa. */
const quitar = (t: string, re: RegExp) => t.replace(re, " ").replace(/\s+/g, " ").trim();

// ------------------------------------------------------------------------------------------------------------ números

/** «80,000», «80.000», «1.5», «1,5» o «250» → número; null si no lo es. */
export function aNumero(s: string): number | null {
  const t = s.trim().replace(/[.,]+$/, "");
  if (/^\d{1,3}([.,]\d{3})+$/.test(t)) return Number(t.replace(/[.,]/g, ""));
  if (/^\d+([.,]\d+)?$/.test(t)) return Number(t.replace(",", "."));
  return null;
}

const MULTIPLICADOR: Record<string, number> = { mil: 1_000, k: 1_000, millon: 1_000_000, millones: 1_000_000 };

/** Número, multiplicador opcional y moneda opcional, antes o después. */
const NUM = String.raw`(\d[\d.,]*)`;
const MULT = String.raw`(?:\s*(mil|k|millon|millones)\b)?`;
const MON_ANTES = String.raw`(?:(s\/\.?|us\$|\$|usd)\s*)?`;
const MON_DESPUES = String.raw`(?:\s*(?:de\s+)?(soles|sol|dolares|dolar|usd)\b)?`;
const MONTO = `${MON_ANTES}${NUM}${MULT}${MON_DESPUES}`;
const UNIDAD_AREA = String.raw`\s*(?:m2|m 2|mt2|mts2|mts|metros cuadrados|metros|mt)\b`;

interface Monto { valor: number; moneda: "PEN" | "USD" | null; marcado: boolean; multiplicado: boolean }

function monto(antes: string | undefined, num: string, mult: string | undefined, despues: string | undefined): Monto | null {
  const n = aNumero(num);
  if (n == null) return null;
  const m = mult ? MULTIPLICADOR[mult] : 1;
  const simbolo = (antes ?? "").replace(/\s/g, "");
  const moneda = /\$|usd|dolar/.test(simbolo + (despues ?? "")) ? "USD" : simbolo || despues ? "PEN" : null;
  return { valor: Math.round(n * m * 100) / 100, moneda, marcado: !!(simbolo || despues), multiplicado: !!mult };
}

/** Un monto sin moneda ni «mil» solo se toma como precio si es grande: «hasta 200» puede ser área. */
const esPrecio = (m: Monto) => m.marcado || m.multiplicado || m.valor >= 1_000;

const texto2 = (n: number) => String(Math.round(n * 100) / 100);

// -------------------------------------------------------------------------------------------------------- reglas

const RE_SIN_PROBLEMAS = /\b(?:sin (?:problemas?|alertas?|observaciones|cargas|riesgos?|lios)|en regla|papeles en orden|documentos en orden|todo en orden|indicador (?:a )?verde|en verde|limpio)\b/;

const ORDENES: { re: RegExp; orden: FiltrosPublico["orden"]; sentido: FiltrosPublico["sentido"] }[] = [
  { re: /\b(?:mas barato|mas economico|menor precio|precio mas bajo)s? (?:por|el) (?:m2|metro)\b/, orden: "precioM2", sentido: "asc" },
  { re: /\b(?:lo |los |las |el |la )?(?:mas barat[oa]s?|mas economic[oa]s?|menor precio|precio mas bajo|baratos?|baratas?|economic[oa]s?)\b/, orden: "precio", sentido: "asc" },
  { re: /\b(?:lo |los |las |el |la )?(?:mas grandes?|mas ampli[oa]s?|mayor area|mas espacio|mas metros|grandes?|amplios?)\b/, orden: "area", sentido: "desc" },
  { re: /\b(?:lo |los |las )?(?:mas nuev[oa]s?|mas recientes?|ultimos publicados)\b/, orden: "novedad", sentido: "desc" },
];

const USOS: { re: RegExp; uso: CategoriaUso }[] = [
  { re: /\bpara (?:(?:construir|hacer|levantar|tener|vivir en) )?(?:(?:mi|una|un|la) )?(?:casa|casita|vivienda|vivir|mi familia|la familia|familia)\b/, uso: "CASA" },
  { re: /\bpara (?:(?:poner|abrir|montar|tener|instalar) )?(?:(?:mi|una|un) )?(?:negocio|comercio|tienda|bodega|local|restaurante|oficina|consultorio)\b/, uso: "NEGOCIO" },
  { re: /\bpara (?:(?:poner|tener|hacer) )?(?:alquilar|alquiler|rentar|renta|invertir|inversion|departamentos)\b/, uso: "ALQUILAR" },
  { re: /\bpara (?:(?:poner|tener|hacer) )?(?:(?:mi|un|una) )?(?:almacen|deposito|taller|guardar|cochera de camiones)\b/, uso: "ALMACEN" },
];

const RE_LOTE = /\b(?:lotes?|terrenos?|solar(?:es)?)\b/;
const RE_VIVIENDA = /\b(?:casas?|casitas?|viviendas?|departamentos?|depas?|chalets?)\b/;

/** Palabras que distinguen a un proyecto (5 letras o más, que no estén en otro proyecto ni en un distrito). */
function palabrasPropias(nombre: string, otros: string[]): string[] {
  const ajenas = new Set(otros.flatMap((o) => normalizar(o).split(" ")));
  return normalizar(nombre).split(" ").filter((p) => p.length >= 5 && !PALABRAS_VACIAS.has(p) && !ajenas.has(p));
}

/** Interpreta una frase. Lo que no reconoce se ignora; si no reconoce nada, {@code entendido} es false. */
export function interpretar(frase: string, contexto: Contexto = { proyectos: [], distritos: [] }): Interpretacion {
  let t = ` ${normalizar(frase)} `;
  const f: Partial<FiltrosPublico> = {};
  let uso: CategoriaUso | null = null;

  // 1. «Sin problemas»: el indicador A en verde.
  if (RE_SIN_PROBLEMAS.test(t)) { f.indicadorA = "VERDE"; t = quitar(t, new RegExp(RE_SIN_PROBLEMAS, "g")); }

  // 2. Uso deseado («para casa»): antes que el tipo, para que «para casa» no se lea como «busco una casa».
  for (const u of USOS) {
    if (u.re.test(t)) { uso ??= u.uso; t = quitar(t, new RegExp(u.re, "g")); }
  }

  // 3. Precio por m² («a 250 soles el m2»): antes que el área, para que «el m2» no se lea como un área.
  const reM2 = new RegExp(String.raw`(?:(menos de|hasta|maximo|no mas de)\s+)?${MONTO}\s*(?:el|por|x)\s*(?:m2|metro cuadrado|metro)\b`);
  const pm2 = reM2.exec(t);
  if (pm2) {
    const m = monto(pm2[2], pm2[3], pm2[4], pm2[5]);
    if (m) { f.precioM2Max = texto2(m.valor); if (m.moneda === "USD") f.moneda = "USD"; t = quitar(t, reM2); }
  }

  // 4. Área: siempre con unidad (m2, metros) o como frente por fondo («8 x 20»).
  const areaEntre = new RegExp(String.raw`\bentre\s+${NUM}(?:${UNIDAD_AREA})?\s+(?:y|a)\s+${NUM}${UNIDAD_AREA}`);
  const areaMin = new RegExp(String.raw`\b(?:mas de|minimo|como minimo|al menos|por lo menos|mayor a|mayores a|desde|no menos de|de al menos)\s+${NUM}${UNIDAD_AREA}`);
  const areaMax = new RegExp(String.raw`\b(?:menos de|hasta|maximo|como maximo|no mas de|menor a|menores a)\s+${NUM}${UNIDAD_AREA}`);
  const areaMas = new RegExp(String.raw`${NUM}${UNIDAD_AREA}\s+(?:o mas|a mas|para arriba|como minimo)`);
  const areaSola = new RegExp(String.raw`(?:\bde\s+)?${NUM}${UNIDAD_AREA}`);
  const frenteFondo = /\b(\d{1,3}(?:[.,]\d+)?)\s*(?:x|por)\s*(\d{1,3}(?:[.,]\d+)?)\s*(?:m|metros|mts)?\b/;
  let a: RegExpExecArray | null;
  if ((a = areaEntre.exec(t))) {
    const x = aNumero(a[1]), y = aNumero(a[2]);
    if (x != null && y != null) { f.areaMin = texto2(Math.min(x, y)); f.areaMax = texto2(Math.max(x, y)); }
    t = quitar(t, areaEntre);
  } else if ((a = areaMas.exec(t))) {
    const x = aNumero(a[1]);
    if (x != null) f.areaMin = texto2(x);
    t = quitar(t, areaMas);
  } else if ((a = areaMin.exec(t))) {
    const x = aNumero(a[1]);
    if (x != null) f.areaMin = texto2(x);
    t = quitar(t, areaMin);
  } else if ((a = areaMax.exec(t))) {
    const x = aNumero(a[1]);
    if (x != null) f.areaMax = texto2(x);
    t = quitar(t, areaMax);
  } else if ((a = frenteFondo.exec(t))) {
    const x = aNumero(a[1]), y = aNumero(a[2]);
    if (x != null && y != null) f.areaMin = texto2(x * y);
    t = quitar(t, frenteFondo);
  } else if ((a = areaSola.exec(t))) {
    // «un lote de 120 m2»: se buscan los de 120 m² o más.
    const x = aNumero(a[1]);
    if (x != null) f.areaMin = texto2(x);
    t = quitar(t, areaSola);
  }

  // 5. Precio.
  const precioEntre = new RegExp(String.raw`\bentre\s+${MONTO}\s+(?:y|a)\s+${MONTO}`);
  const precioMax = new RegExp(String.raw`\b(?:menos de|hasta|maximo|como maximo|no mas de|menor a|tope de|que no pase de|que no pase|por debajo de|presupuesto de|presupuesto|tengo|cuento con|con)\s+${MONTO}`);
  const precioMin = new RegExp(String.raw`\b(?:mas de|desde|minimo|como minimo|al menos|mayor a|a partir de)\s+${MONTO}`);
  let moneda: "PEN" | "USD" | null = null;
  let p: RegExpExecArray | null;
  if ((p = precioEntre.exec(t))) {
    const x = monto(p[1], p[2], p[3], p[4]), y = monto(p[5], p[6], p[7], p[8]);
    if (x && y) {
      // «entre 40 y 60 mil»: el «mil» del segundo vale también para el primero.
      if (!x.multiplicado && y.multiplicado && p[7]) {
        const k = MULTIPLICADOR[p[7]];
        if (x.valor * k <= y.valor) { x.valor *= k; x.multiplicado = true; }
      }
      if (esPrecio(x) || esPrecio(y)) {
        f.precioMin = texto2(Math.min(x.valor, y.valor));
        f.precioMax = texto2(Math.max(x.valor, y.valor));
        moneda = x.moneda ?? y.moneda;
        t = quitar(t, precioEntre);
      }
    }
  }
  if (!f.precioMax && (p = precioMax.exec(t))) {
    const x = monto(p[1], p[2], p[3], p[4]);
    if (x && esPrecio(x)) { f.precioMax = texto2(x.valor); moneda = x.moneda; t = quitar(t, precioMax); }
  }
  if (!f.precioMin && (p = precioMin.exec(t))) {
    const x = monto(p[1], p[2], p[3], p[4]);
    if (x && esPrecio(x)) { f.precioMin = texto2(x.valor); moneda ??= x.moneda; t = quitar(t, precioMin); }
  }
  if (!f.precioMin && !f.precioMax) {
    // Un monto suelto con moneda o «mil» («lote 50 mil soles») es el presupuesto: se toma como máximo.
    for (const q of t.matchAll(new RegExp(MONTO, "g"))) {
      const x = monto(q[1], q[2], q[3], q[4]);
      if (x && (x.marcado || x.multiplicado)) { f.precioMax = texto2(x.valor); moneda = x.moneda; t = quitar(t, new RegExp(escapar(q[0]))); break; }
    }
  }
  if (!moneda && /\b(?:dolares|dolar|usd)\b|\$/.test(t) && (f.precioMin || f.precioMax)) moneda = "USD";
  if (f.precioMin || f.precioMax) f.moneda = moneda ?? "PEN";

  // 6. Proyectos y distritos cargados: primero el nombre completo; si no, una palabra propia del proyecto.
  const proyectos = contexto.proyectos ?? [];
  const distritos = contexto.distritos ?? [];
  for (const nombre of proyectos) {
    const re = new RegExp(String.raw`\b${escapar(normalizar(nombre))}\b`);
    if (re.test(t)) { f.proyecto = nombre; t = quitar(t, re); break; }
  }
  if (!f.proyecto) {
    for (const nombre of proyectos) {
      const propias = palabrasPropias(nombre, [...proyectos.filter((x) => x !== nombre), ...distritos]);
      const hallada = propias.find((w) => new RegExp(String.raw`\b${escapar(w)}\b`).test(t));
      if (hallada) { f.proyecto = nombre; t = quitar(t, new RegExp(String.raw`\b${escapar(hallada)}\b`)); break; }
    }
  }
  // El distrito más largo primero: «La Tinguiña» antes que «Ica».
  for (const nombre of [...distritos].sort((x, y) => y.length - x.length)) {
    const re = new RegExp(String.raw`\b${escapar(normalizar(nombre))}\b`);
    if (re.test(t)) { f.distrito = nombre; t = quitar(t, re); break; }
  }

  // 7. Tipo: si menciona lotes y casas a la vez, no se filtra por tipo.
  const lote = RE_LOTE.test(t), vivienda = RE_VIVIENDA.test(t);
  if (lote !== vivienda) f.tipo = lote ? "LOTE" : "VIVIENDA";

  // 8. Orden (después del área, para que «más de 200 m2» no se lea como «más grande»).
  for (const o of ORDENES) {
    if (o.re.test(t)) { f.orden = o.orden; f.sentido = o.sentido; break; }
  }

  return { filtros: f, uso, entendido: Object.keys(f).length > 0 || uso !== null };
}

// ------------------------------------------------------------------------------------------------- filtros y etiquetas

/** Filtros del catálogo que resultan de una interpretación: la búsqueda empieza de cero (no se suma a la anterior). */
export function filtrosDe(i: Interpretacion): FiltrosPublico {
  const f: FiltrosPublico = { ...FILTROS_PUBLICO_VACIOS, ...i.filtros };
  if (i.filtros.orden && !i.filtros.sentido) f.sentido = sentidoPorOmision(i.filtros.orden);
  return f;
}

const conMoneda = (n: string, moneda: string) => precio(Number(n), moneda || "PEN", true);
const numero = (n: string) => Number(n).toLocaleString("es-PE", { maximumFractionDigits: 2 });

/** Etiquetas de lo entendido, leídas de los filtros vigentes: si se cambia un filtro a mano, las etiquetas lo siguen. */
export function etiquetasDe(f: FiltrosPublico, uso: CategoriaUso | null): Etiqueta[] {
  const e: Etiqueta[] = [];
  if (f.tipo) e.push({ clave: "tipo", texto: f.tipo === "LOTE" ? "Lotes o terrenos" : "Casas" });
  if (f.proyecto) e.push({ clave: "proyecto", texto: `Proyecto ${f.proyecto}` });
  if (f.distrito) e.push({ clave: "distrito", texto: `En ${f.distrito}` });
  if (f.precioMin && f.precioMax) e.push({ clave: "precio", texto: `Entre ${conMoneda(f.precioMin, f.moneda)} y ${conMoneda(f.precioMax, f.moneda)}` });
  else if (f.precioMax) e.push({ clave: "precio", texto: `Hasta ${conMoneda(f.precioMax, f.moneda)}` });
  else if (f.precioMin) e.push({ clave: "precio", texto: `Desde ${conMoneda(f.precioMin, f.moneda)}` });
  if (f.precioM2Max) e.push({ clave: "precioM2", texto: `Hasta ${conMoneda(f.precioM2Max, f.moneda)} por m²` });
  if (f.areaMin && f.areaMax) e.push({ clave: "area", texto: `Entre ${numero(f.areaMin)} y ${numero(f.areaMax)} m²` });
  else if (f.areaMin) e.push({ clave: "area", texto: `Al menos ${numero(f.areaMin)} m²` });
  else if (f.areaMax) e.push({ clave: "area", texto: `Hasta ${numero(f.areaMax)} m²` });
  if (f.indicadorA === "VERDE") e.push({ clave: "indicadorA", texto: "Sin alertas en documentos (indicador A verde)" });
  const orden = f.orden === "precio" && f.sentido === "asc" ? "Más barato primero"
    : f.orden === "area" && f.sentido === "desc" ? "Más grande primero"
    : f.orden === "precioM2" && f.sentido === "asc" ? "Menor precio por m² primero" : null;
  if (orden) e.push({ clave: "orden", texto: orden });
  if (uso) e.push({ clave: "uso", texto: etiquetaUso(uso) });
  return e;
}

/** Quitar una etiqueta deja sin ese filtro (el orden vuelve a «más recientes»). */
export function quitarEtiqueta(f: FiltrosPublico, uso: CategoriaUso | null, clave: ClaveEtiqueta): { filtros: FiltrosPublico; uso: CategoriaUso | null } {
  const g = { ...f };
  switch (clave) {
    case "tipo": g.tipo = ""; break;
    case "proyecto": g.proyecto = ""; break;
    case "distrito": g.distrito = ""; break;
    case "precio": g.precioMin = ""; g.precioMax = ""; break;
    case "precioM2": g.precioM2Min = ""; g.precioM2Max = ""; break;
    case "area": g.areaMin = ""; g.areaMax = ""; break;
    case "indicadorA": g.indicadorA = ""; break;
    case "orden": g.orden = "novedad"; g.sentido = "desc"; break;
    case "uso": return { filtros: g, uso: null };
  }
  if (!g.precioMin && !g.precioMax && !g.precioM2Min && !g.precioM2Max) g.moneda = "";
  return { filtros: g, uso };
}

/** Si no entiende la frase, estos botones la reemplazan por una búsqueda que sí entiende. */
export function sugerencias(contexto: Contexto): { texto: string; frase: string }[] {
  const s = [
    { texto: "Lotes", frase: "lotes" },
    { texto: "Casas", frase: "casas" },
    { texto: "Lotes para casa", frase: "lote para casa" },
    { texto: "Lotes para negocio", frase: "lote para negocio" },
    { texto: "Lo más barato", frase: "lo más barato" },
    { texto: "Sin alertas en documentos", frase: "sin problemas" },
  ];
  for (const p of (contexto.proyectos ?? []).slice(0, 2)) s.push({ texto: `Lotes en ${p}`, frase: `lotes en ${p}` });
  return s;
}

// ------------------------------------------------------------------------------------------------------ recomendación

export interface Recomendacion { inmueble: InmueblePublico; puntaje: number; motivos: string[] }

/**
 * Los 3 mejores de los resultados, con su motivo. Suma puntos por: indicador A en verde, estar disponible, que la
 * zonificación suela permitir el uso pedido, el precio por m² más bajo y lo que pidió en el orden (el más barato o el
 * más grande). Los vendidos no se recomiendan.
 */
export function recomendar(items: InmueblePublico[], f: FiltrosPublico, uso: CategoriaUso | null, cuantos = 3): Recomendacion[] {
  const candidatos = items.filter((c) => c.predio.estadoComercial !== "VENDIDO");
  // El más barato y el más grande se buscan entre los disponibles (un separado no puede ser «el más barato» que se ofrece).
  const disponibles = candidatos.filter((c) => c.predio.estadoComercial !== "SEPARADO");
  const base = disponibles.length > 0 ? disponibles : candidatos;
  const conPrecio = base.filter((c) => c.predio.precioReferencial != null);
  const precioMin = Math.min(...conPrecio.map((c) => c.predio.precioReferencial as number));
  const areas = base.filter((c) => c.predio.areaM2 != null).map((c) => c.predio.areaM2 as number);
  const areaMax = Math.max(...areas);
  // Precio por m² en la tercera parte más baja (de cada moneda por separado, para no comparar soles con dólares).
  const umbralM2 = (moneda: string | null) => {
    const v = candidatos.filter((c) => c.predio.precioPorM2 != null && (c.predio.moneda ?? "PEN") === (moneda ?? "PEN"))
      .map((c) => c.predio.precioPorM2 as number).sort((a, b) => a - b);
    return v.length >= 3 ? v[Math.floor((v.length - 1) / 3)] : null;
  };

  const evaluados = candidatos.map((c) => {
    const p = c.predio;
    let puntaje = 0;
    const motivos: string[] = [];
    if (c.estado === "VERDE") {
      puntaje += 3;
      motivos.push(c.fuenteIndicadorA === "PARTIDA_MATRIZ"
        ? "La revisión de la partida matriz del proyecto no encontró alertas (indicador A verde)"
        : "La revisión de sus documentos no encontró alertas (indicador A verde)");
    } else if (c.estado === "AMARILLO") puntaje += 1;
    else if (c.estado === "ROJO") puntaje -= 2;
    if (p.estadoComercial === "SEPARADO") puntaje -= 4;
    else { puntaje += 2; motivos.push("Está disponible"); }
    if (uso) {
      const r = compatibilidadUso(p.zonificacion, p.areaM2, uso);
      if (r.resultado === "SI" && r.zona && r.uso) {
        puntaje += 2;
        motivos.push(`Su zonificación (${r.zona.codigo}) suele permitir: ${r.uso.texto.toLowerCase()}`);
      } else if (r.resultado === "NO") puntaje -= 2;
    }
    const ofrecido = p.estadoComercial !== "SEPARADO";
    if (ofrecido && p.precioReferencial != null && conPrecio.length > 1 && p.precioReferencial === precioMin) {
      puntaje += f.orden === "precio" ? 3 : 1;
      motivos.push("Tiene el menor precio entre los resultados");
    }
    if (ofrecido && p.areaM2 != null && areas.length > 1 && p.areaM2 === areaMax) {
      puntaje += f.orden === "area" ? 3 : 1;
      motivos.push(`Tiene la mayor área entre los resultados (${numero(String(p.areaM2))} m²)`);
    }
    const umbral = umbralM2(p.moneda);
    if (p.precioPorM2 != null && umbral != null && p.precioPorM2 <= umbral) {
      puntaje += 1;
      motivos.push(`Su precio por m² (${precio(p.precioPorM2, p.moneda)}) está entre los más bajos`);
    }
    return { inmueble: c, puntaje, motivos };
  });

  return evaluados
    .sort((x, y) => y.puntaje - x.puntaje
      || (x.inmueble.predio.precioReferencial ?? Infinity) - (y.inmueble.predio.precioReferencial ?? Infinity)
      || x.inmueble.codigo.localeCompare(y.inmueble.codigo))
    .slice(0, cuantos);
}

// ------------------------------------------------------------------------------------------------------- cita

/** Lo buscado, para que la solicitud de cita le llegue al asesor con la zona, el tipo, el presupuesto y el área. */
export interface Busqueda {
  zona?: string; tipo?: "LOTE" | "VIVIENDA"; presupuestoMin?: number; presupuestoMax?: number; moneda?: "PEN" | "USD";
  areaDeseada?: number;
}

export function busquedaDe(f: FiltrosPublico): Busqueda {
  const b: Busqueda = {};
  const zona = f.distrito || f.proyecto;
  if (zona) b.zona = zona;
  if (f.tipo) b.tipo = f.tipo;
  if (f.precioMin) b.presupuestoMin = Number(f.precioMin);
  if (f.precioMax) b.presupuestoMax = Number(f.precioMax);
  if (b.presupuestoMin != null || b.presupuestoMax != null) b.moneda = f.moneda === "USD" ? "USD" : "PEN";
  const area = f.areaMin || f.areaMax;
  if (area) b.areaDeseada = Number(area);
  return b;
}

/** Cómo se nombra la búsqueda en la solicitud de cita y en el mensaje de WhatsApp. */
export function nombreBusqueda(etiquetas: Etiqueta[]): string {
  const partes = etiquetas.filter((e) => e.clave !== "orden").map((e) => e.texto.charAt(0).toLowerCase() + e.texto.slice(1));
  return partes.length ? `un inmueble con esta búsqueda: ${partes.join(", ")}` : "un inmueble del catálogo";
}
