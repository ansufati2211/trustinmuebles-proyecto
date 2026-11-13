import { ExternalLink, ImageIcon } from "lucide-react";
import { CREDITOS_IMAGENES, FOTOS_DEL_SITIO, FOTOS_LIBRES, type CreditoImagen } from "@/lib/creditos";

/**
 * v1.0 (etapa 6): «Créditos de imágenes», enlazada desde el pie. Lista las fotos que usa el sitio, todas con licencia
 * libre, con su obra original y su licencia. Sin sesión.
 */
export default function Creditos() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-foreground">
          <ImageIcon className="size-7 text-primary" aria-hidden="true" /> Créditos de imágenes
        </h1>
        <p className="max-w-3xl text-base leading-relaxed text-tinta-2">
          El portal solo usa fotografías con licencia libre. Las fotos de las fichas son referenciales: se parecen a lo que
          describe cada expediente, pero no muestran el inmueble ofrecido. Las fichas sin foto usan una ilustración propia
          del portal.
        </p>
      </header>
      <Tabla titulo="Fichas de inmuebles (Wikimedia Commons)" filas={Object.values(FOTOS_LIBRES)} />
      <Tabla titulo="Páginas del portal (Unsplash)" filas={FOTOS_DEL_SITIO} />
      <p className="text-sm text-tinta-2" data-total-creditos>{CREDITOS_IMAGENES.length} imágenes con licencia libre.</p>
    </div>
  );
}

function Tabla({ titulo, filas }: { titulo: string; filas: CreditoImagen[] }) {
  return (
    <section aria-label={titulo} className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-tarjeta">
      <h2 className="border-b border-border px-5 py-4 text-lg font-bold text-foreground">{titulo}</h2>
      <ul className="divide-y divide-border">
        {filas.map((f) => (
          <li key={f.archivo} className="grid gap-1 px-5 py-4 sm:grid-cols-[1fr_1.2fr_auto] sm:items-center sm:gap-4">
            <div>
              <p className="font-semibold text-foreground">{f.descripcion}</p>
              <p className="text-xs text-tinta-2">{f.uso}</p>
            </div>
            <a href={f.enlace} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 break-all text-sm font-semibold text-primary hover:underline">
              {f.obra} <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
            </a>
            <a href={f.enlaceLicencia} target="_blank" rel="noopener noreferrer"
              className="text-sm font-bold text-foreground hover:text-primary hover:underline">{f.licencia}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
