import { ExternalLink, MapPin, Navigation, Wallet } from "lucide-react";
import { enlaceComoLlegar } from "@/lib/proyectos";

/*
 * v1.0 (etapa 9): ubicación del proyecto (dirección y botón «Cómo llegar») y sus condiciones de pago. Sin mapa embebido
 * ni dependencias: el botón abre el enlace que registró la inmobiliaria en otra pestaña, y sin enlace no aparece (una
 * búsqueda por la dirección podría llevar a otro lugar).
 */

export function UbicacionProyecto({ direccion, mapaUrl, nombre, oscuro = false }: {
  direccion?: string | null; mapaUrl?: string | null; nombre: string;
  /** Sobre la cabecera oscura de la página del proyecto. */
  oscuro?: boolean;
}) {
  const enlace = enlaceComoLlegar(mapaUrl);
  if (!direccion && !enlace) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2" data-ubicacion>
      {direccion && (
        <p className={`flex items-start gap-1.5 text-sm font-semibold ${oscuro ? "text-gray-200" : "text-tinta-2"}`}>
          <Navigation className={`mt-0.5 size-4 shrink-0 ${oscuro ? "text-emerald-300" : "text-primary"}`} aria-hidden="true" />
          <span><span className="sr-only">Dirección: </span>{direccion}</span>
        </p>
      )}
      {enlace && (
        <a href={enlace} target="_blank" rel="noopener noreferrer" data-como-llegar
          aria-label={`Cómo llegar a ${nombre} (abre el mapa en otra pestaña)`}
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
            oscuro ? "bg-white text-foreground hover:bg-gray-100" : "bg-primary text-white hover:bg-primary/90"}`}>
          <MapPin className="size-4" aria-hidden="true" /> Cómo llegar <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

/** Condiciones de pago en texto libre, con la nota de consultar con un asesor. No calcula cuotas ni tasas. */
export function CondicionesPago({ texto, className = "" }: { texto?: string | null; className?: string }) {
  if (!texto || !texto.trim()) return null;
  return (
    <section aria-labelledby="titulo-condiciones-pago" className={`space-y-3 ${className}`} data-condiciones-pago>
      <h2 id="titulo-condiciones-pago" className="flex items-center gap-2 text-xl font-bold text-foreground">
        <Wallet className="size-5 text-primary" aria-hidden="true" /> Condiciones de pago
      </h2>
      <p className="whitespace-pre-line text-base leading-relaxed text-foreground">{texto}</p>
      <p className="text-sm font-semibold text-tinta-2">Consulta con un asesor.</p>
    </section>
  );
}
