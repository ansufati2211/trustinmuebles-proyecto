import type { EstadoComercial, EstadoSemaforo } from "./types";
import type { CategoriaUso } from "./usosLote";

/*
 * v1.0 (etapa 2): filtros y orden del catálogo público. La URL usa los mismos nombres que la API
 * (/publico/inmuebles), así un enlace compartido o recargado muestra lo mismo y se envía tal cual al servidor, que
 * filtra, ordena y pagina. En la URL la página empieza en 1 (?pagina=2); en la API, en 0.
 */

export type Orden = "novedad" | "precio" | "precioM2" | "area";
export type Sentido = "asc" | "desc";
export type TipoFiltro = "" | "LOTE" | "VIVIENDA";
export type MonedaFiltro = "" | "PEN" | "USD";

export interface FiltrosPublico {
  proyecto: string; distrito: string; tipo: TipoFiltro; estadoComercial: "" | EstadoComercial; moneda: MonedaFiltro;
  /** Números como texto, tal como se escriben: «150000», «1200.5». Vacío = sin límite. */
  precioMin: string; precioMax: string; precioM2Min: string; precioM2Max: string; areaMin: string; areaMax: string;
  indicadorA: "" | EstadoSemaforo; tipoAlerta: string;
  orden: Orden; sentido: Sentido;
  /**
   * v1.0 (etapa 6), opcionales para no cambiar la forma anterior: zonificaciones de la guía de usos separadas por coma
   * («RDM,CV»), el uso pedido (CASA, NEGOCIO, ALQUILAR o ALMACEN, según usos-lote.json) y si entran los inmuebles sin
   * zonificación (solo si el comprador lo elige).
   */
  zonificacion?: string; uso?: "" | CategoriaUso; incluirSinZonificacion?: boolean;
}

/** v1.0 (etapa 6): usos que se pueden pedir como filtro (los de usos-lote.json). */
export const USOS_FILTRO: CategoriaUso[] = ["CASA", "NEGOCIO", "ALQUILAR", "ALMACEN"];

export const FILTROS_PUBLICO_VACIOS: FiltrosPublico = {
  proyecto: "", distrito: "", tipo: "", estadoComercial: "", moneda: "", precioMin: "", precioMax: "", precioM2Min: "",
  precioM2Max: "", areaMin: "", areaMax: "", indicadorA: "", tipoAlerta: "", orden: "novedad", sentido: "desc",
};

/** Cada orden empieza por el sentido natural: lo más nuevo primero; lo demás, de menor a mayor. */
export const sentidoPorOmision = (orden: Orden): Sentido => (orden === "novedad" ? "desc" : "asc");

export const OPCIONES_TIPO_PUBLICO: { valor: Exclude<TipoFiltro, "">; etiqueta: string }[] = [
  { valor: "LOTE", etiqueta: "Lote o terreno" },
  { valor: "VIVIENDA", etiqueta: "Vivienda" },
];

export const OPCIONES_ESTADO_COMERCIAL: { valor: EstadoComercial; etiqueta: string }[] = [
  { valor: "DISPONIBLE", etiqueta: "Disponible" },
  { valor: "SEPARADO", etiqueta: "Separado" },
  { valor: "VENDIDO", etiqueta: "Vendido" },
];

export const OPCIONES_MONEDA: { valor: Exclude<MonedaFiltro, "">; etiqueta: string }[] = [
  { valor: "PEN", etiqueta: "Soles (S/)" },
  { valor: "USD", etiqueta: "Dólares (US$)" },
];

/** Las siete formas de ordenar que se ofrecen: el orden y su sentido juntos, para un solo selector. */
export const OPCIONES_ORDEN: { valor: string; orden: Orden; sentido: Sentido; etiqueta: string }[] = [
  { valor: "novedad-desc", orden: "novedad", sentido: "desc", etiqueta: "Más recientes primero" },
  { valor: "novedad-asc", orden: "novedad", sentido: "asc", etiqueta: "Más antiguos primero" },
  { valor: "precio-asc", orden: "precio", sentido: "asc", etiqueta: "Precio: de menor a mayor" },
  { valor: "precio-desc", orden: "precio", sentido: "desc", etiqueta: "Precio: de mayor a menor" },
  { valor: "precioM2-asc", orden: "precioM2", sentido: "asc", etiqueta: "Precio por m²: de menor a mayor" },
  { valor: "precioM2-desc", orden: "precioM2", sentido: "desc", etiqueta: "Precio por m²: de mayor a menor" },
  { valor: "area-asc", orden: "area", sentido: "asc", etiqueta: "Área: de menor a mayor" },
  { valor: "area-desc", orden: "area", sentido: "desc", etiqueta: "Área: de mayor a menor" },
];

export const valorDeOrden = (f: Pick<FiltrosPublico, "orden" | "sentido">) => `${f.orden}-${f.sentido}`;

const ESTADOS_A = ["VERDE", "AMARILLO", "ROJO", "GRIS"] as const;
const ESTADOS_COMERCIALES = ["DISPONIBLE", "SEPARADO", "VENDIDO"] as const;
const ORDENES = ["novedad", "precio", "precioM2", "area"] as const;
const NUMEROS = ["precioMin", "precioMax", "precioM2Min", "precioM2Max", "areaMin", "areaMax"] as const;

/** Un número válido para la API: sin signo, sin separador de miles y con punto decimal. Si no, se descarta. */
export function numeroValido(v: string | null | undefined): string {
  const t = (v ?? "").trim().replace(/,/g, ".");
  return /^\d{1,12}(\.\d{1,2})?$/.test(t) ? t : "";
}

const texto = (v: string | null) => (v ?? "").trim().slice(0, 120);

/** Lee los filtros de la URL. Lo que no sea un valor conocido se ignora, para que un enlace mal copiado no rompa la página. */
export function filtrosDeLaUrl(p: URLSearchParams): FiltrosPublico {
  const orden = (ORDENES as readonly string[]).includes(p.get("orden") ?? "") ? (p.get("orden") as Orden) : "novedad";
  const sent = p.get("sentido");
  const f: FiltrosPublico = {
    ...FILTROS_PUBLICO_VACIOS,
    proyecto: texto(p.get("proyecto")), distrito: texto(p.get("distrito")),
    tipo: p.get("tipo") === "LOTE" || p.get("tipo") === "VIVIENDA" ? (p.get("tipo") as TipoFiltro) : "",
    estadoComercial: (ESTADOS_COMERCIALES as readonly string[]).includes(p.get("estadoComercial") ?? "")
      ? (p.get("estadoComercial") as EstadoComercial) : "",
    moneda: p.get("moneda") === "PEN" || p.get("moneda") === "USD" ? (p.get("moneda") as MonedaFiltro) : "",
    indicadorA: (ESTADOS_A as readonly string[]).includes(p.get("indicadorA") ?? "") ? (p.get("indicadorA") as EstadoSemaforo) : "",
    tipoAlerta: /^(R[PV]-\d{2}|INFORMACION_INSUFICIENTE)$/.test(p.get("tipoAlerta") ?? "") ? (p.get("tipoAlerta") as string) : "",
    orden, sentido: sent === "asc" || sent === "desc" ? sent : sentidoPorOmision(orden),
  };
  for (const n of NUMEROS) f[n] = numeroValido(p.get(n));
  // v1.0 (etapa 6): zonificación (códigos de letras y números), uso y la opción de incluir los sin zonificación.
  const zon = (p.get("zonificacion") ?? "").toUpperCase().split(",").map((z) => z.trim())
    .filter((z) => /^[A-Z0-9]{1,6}$/.test(z));
  if (zon.length) f.zonificacion = [...new Set(zon)].join(",");
  const uso = (p.get("uso") ?? "").toUpperCase();
  if ((USOS_FILTRO as string[]).includes(uso)) f.uso = uso as CategoriaUso;
  if (p.get("incluirSinZonificacion") === "true" && (f.zonificacion || f.uso)) f.incluirSinZonificacion = true;
  return f;
}

/**
 * Parámetros para la URL del navegador: solo lo que no es el valor por omisión, para que el catálogo sin filtros tenga la
 * URL limpia. La página va como número humano (?pagina=2) y la primera no lleva parámetro.
 */
export function filtrosALaUrl(f: FiltrosPublico, pagina = 0): URLSearchParams {
  const p = new URLSearchParams();
  if (f.proyecto) p.set("proyecto", f.proyecto);
  if (f.distrito) p.set("distrito", f.distrito);
  if (f.tipo) p.set("tipo", f.tipo);
  if (f.estadoComercial) p.set("estadoComercial", f.estadoComercial);
  if (f.moneda) p.set("moneda", f.moneda);
  for (const n of NUMEROS) if (f[n]) p.set(n, f[n]);
  if (f.indicadorA) p.set("indicadorA", f.indicadorA);
  if (f.tipoAlerta) p.set("tipoAlerta", f.tipoAlerta);
  if (f.zonificacion) p.set("zonificacion", f.zonificacion);
  if (f.uso) p.set("uso", f.uso);
  if (f.incluirSinZonificacion && (f.zonificacion || f.uso)) p.set("incluirSinZonificacion", "true");
  if (f.orden !== "novedad") p.set("orden", f.orden);
  if (f.sentido !== sentidoPorOmision(f.orden)) p.set("sentido", f.sentido);
  if (pagina > 0) p.set("pagina", String(pagina + 1));
  return p;
}

/** Ruta de la API para una página del catálogo público con estos filtros (la página de la API empieza en 0). */
export function rutaCatalogoPublico(f: FiltrosPublico, pagina = 0): string {
  const p = filtrosALaUrl(f);
  // La API siempre recibe la página, y el sentido siempre explícito para no depender del valor por omisión.
  p.set("sentido", f.sentido);
  p.set("orden", f.orden);
  p.set("pagina", String(Math.max(0, Math.floor(pagina))));
  return `/publico/inmuebles?${p.toString()}`;
}

/** Cuántos filtros hay activos (el orden no cuenta: ordenar no filtra). */
export function contarFiltros(f: FiltrosPublico): number {
  let n = 0;
  if (f.proyecto) n++;
  if (f.distrito) n++;
  if (f.tipo) n++;
  if (f.estadoComercial) n++;
  if (f.moneda) n++;
  if (f.precioMin || f.precioMax) n++;
  if (f.precioM2Min || f.precioM2Max) n++;
  if (f.areaMin || f.areaMax) n++;
  if (f.indicadorA) n++;
  if (f.tipoAlerta) n++;
  if (f.zonificacion) n++;
  if (f.uso) n++;
  return n;
}

/**
 * v1.0 (etapa 6): ruta de la API con todos los inmuebles que cumplen los filtros (sin vendidos, en forma compacta), para
 * que el asistente elija sus recomendaciones sobre el total y no solo sobre la página que se ve.
 */
export function rutaRecomendables(f: FiltrosPublico): string {
  const p = filtrosALaUrl(f);
  p.set("orden", f.orden);
  p.set("sentido", f.sentido);
  return `/publico/inmuebles/recomendables?${p.toString()}`;
}

export const hayFiltrosPublico = (f: FiltrosPublico) => contarFiltros(f) > 0;

/** Limpiar filtros: se quitan los filtros y se conserva el orden elegido. */
export const sinFiltros = (f: FiltrosPublico): FiltrosPublico => ({
  ...FILTROS_PUBLICO_VACIOS, orden: f.orden, sentido: f.sentido,
});

/** Un mínimo mayor que el máximo no puede dar resultados: se avisa antes de pedirlo. */
export function errorDeRangos(f: FiltrosPublico): string | null {
  const pares: [string, string, string][] = [
    [f.precioMin, f.precioMax, "El precio mínimo no puede ser mayor que el máximo."],
    [f.precioM2Min, f.precioM2Max, "El precio por m² mínimo no puede ser mayor que el máximo."],
    [f.areaMin, f.areaMax, "El área mínima no puede ser mayor que la máxima."],
  ];
  for (const [min, max, mensaje] of pares) if (min && max && Number(min) > Number(max)) return mensaje;
  return null;
}

/** «30 inmuebles», «1 inmueble» o la razón por la que no hay ninguno, según haya o no filtros. */
export function textoContador(total: number, conFiltros: boolean): string {
  if (total === 0) return conFiltros ? "Ningún inmueble cumple los filtros elegidos" : "Todavía no hay inmuebles publicados.";
  const n = `${total} inmueble${total === 1 ? "" : "s"}`;
  return conFiltros ? `${n} con los filtros elegidos` : n;
}
