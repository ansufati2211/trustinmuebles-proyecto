/*
 * v1.0 (etapa 6): indexación. Mientras app.sitio.indexable sea false (por omisión), el sitio pide no indexar: index.html
 * ya trae <meta name="robots" content="noindex, nofollow"> y robots.txt (lo arma el servidor) dice «Disallow: /». Al
 * cargar, la interfaz pregunta al servidor y solo cambia la etiqueta si el sitio es indexable.
 */

export const META_NO_INDEXAR = "noindex, nofollow";
export const META_INDEXAR = "index, follow";

export const contenidoMetaRobots = (indexable: boolean) => (indexable ? META_INDEXAR : META_NO_INDEXAR);

/** Pone la etiqueta robots del documento (la crea si falta). */
export function aplicarIndexacion(doc: Document, indexable: boolean): void {
  let meta = doc.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!meta) {
    meta = doc.createElement("meta");
    meta.name = "robots";
    doc.head.appendChild(meta);
  }
  meta.content = contenidoMetaRobots(indexable);
}

/** Lee del servidor si el sitio es indexable; ante cualquier error, queda «noindex». */
export async function sincronizarIndexacion(doc: Document = document): Promise<void> {
  try {
    const r = await fetch("/api/v1/publico/sitio");
    const datos = r.ok ? ((await r.json()) as { indexable?: boolean }) : null;
    aplicarIndexacion(doc, datos?.indexable === true);
  } catch {
    aplicarIndexacion(doc, false);
  }
}

/*
 * v1.0 (etapa 8): cifras reales de la portada. Las da GET /publico/sitio (inmuebles publicados en el catálogo, proyectos
 * visibles y lotes disponibles en ellos); mientras no llegan, se muestra «—», nunca un número fijo.
 */
export const RUTA_SITIO = "/publico/sitio";

export interface CifrasSitio { inmueblesPublicados: number; proyectos: number; lotesDisponibles: number }

export interface DatosSitio { indexable: boolean; version: string; cifras?: CifrasSitio }

const numero = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("es-PE"));
const plural = (v: number | null | undefined, uno: string, varios: string) => (v === 1 ? uno : varios);

/** Las tres cifras del encabezado de la portada, en orden. */
export function cifrasPortada(c: CifrasSitio | null | undefined): { clave: keyof CifrasSitio; n: string; t: string }[] {
  return [
    { clave: "inmueblesPublicados", n: numero(c?.inmueblesPublicados),
      t: plural(c?.inmueblesPublicados, "inmueble publicado", "inmuebles publicados") },
    { clave: "proyectos", n: numero(c?.proyectos), t: plural(c?.proyectos, "proyecto en venta", "proyectos en venta") },
    { clave: "lotesDisponibles", n: numero(c?.lotesDisponibles),
      t: plural(c?.lotesDisponibles, "lote disponible", "lotes disponibles") },
  ];
}

/** Frase de la sección de muestras: con el total real o, si aún no llegó, sin número. */
export function textoCatalogoPortada(c: CifrasSitio | null | undefined): string {
  if (c == null) return "El catálogo público reúne los lotes y viviendas que la inmobiliaria tiene en venta.";
  return `El catálogo público reúne ${numero(c.inmueblesPublicados)} ${plural(c.inmueblesPublicados, "lote o vivienda", "lotes y viviendas")} en venta.`;
}
