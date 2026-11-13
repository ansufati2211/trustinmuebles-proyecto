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
