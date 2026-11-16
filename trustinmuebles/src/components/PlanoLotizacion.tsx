import { useEffect, useState } from "react";
import { ExternalLink, MapPin, ZoomIn, ZoomOut } from "lucide-react";
import {
  VENTANA_COMPLETA, cargarPlano, posicionEnVentana, ventanaDe, type PlanoLotizacion as Plano, type Ventana,
} from "@/lib/planoLotizacion";
import { ESTILO_LOTE, estadoEnPlano, etiquetaLote } from "@/lib/proyectos";
import type { LoteProyecto } from "@/lib/types";

/**
 * v1.0 (etapa 11): plano de la lotización con el lote señalado con un pin. Con un lote elegido se acerca a su zona (y se
 * puede ver completo); sin lote muestra todo el plano con un punto por lote, que se puede tocar. La imagen es la que
 * entrega la inmobiliaria; la ubicación es referencial. Si el proyecto no tiene plano, no se dibuja nada.
 */
export function PlanoLotizacion({ proyectoCodigo, lote = null, lotes, alElegir, soloCompleto = false, titulo = "Ubicación en el plano" }: {
  proyectoCodigo: string;
  lote?: Pick<LoteProyecto, "clave" | "manzana" | "numero" | "sufijo"> | null;
  /** Para dibujar un punto por lote en la vista completa. */
  lotes?: LoteProyecto[];
  alElegir?: (clave: string) => void;
  /** Siempre el plano entero (con el lote elegido señalado), sin botón para acercar. */
  soloCompleto?: boolean;
  titulo?: string;
}) {
  const [plano, setPlano] = useState<Plano | null>(null);
  const [completo, setCompleto] = useState(false);

  useEffect(() => {
    let vivo = true;
    cargarPlano(proyectoCodigo).then((p) => { if (vivo) setPlano(p); });
    return () => { vivo = false; };
  }, [proyectoCodigo]);

  if (!plano) return null;
  const pos = lote ? plano.lotes[lote.clave] : undefined;
  // Sin lote elegido, o con uno que no está en el plano, se ve todo el plano.
  const ver: "zoom" | "completo" = lote && pos && !completo && !soloCompleto ? "zoom" : "completo";
  const ventana: Ventana = ver === "zoom" ? ventanaDe(plano, lote!.clave)! : VENTANA_COMPLETA;
  const razon = (ventana.w * plano.ancho) / (ventana.h * plano.alto);
  const nombre = lote ? `Mz. ${lote.manzana} · Lote ${etiquetaLote(lote)}` : null;
  const sinPos = lote && !pos;

  return (
    <figure className="space-y-2" data-plano-lotizacion={ver}>
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold text-foreground">{titulo}</span>
        {pos && !soloCompleto && (
          <button type="button" onClick={() => setCompleto(ver === "zoom")} data-alternar-plano
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold text-foreground hover:bg-muted">
            {ver === "zoom" ? <><ZoomOut className="size-3.5" aria-hidden="true" /> Ver plano completo</>
              : <><ZoomIn className="size-3.5" aria-hidden="true" /> Acercar al lote</>}
          </button>
        )}
      </figcaption>

      <div className="relative mx-auto w-full overflow-hidden rounded-xl border border-border bg-muted"
        style={{ aspectRatio: String(razon), maxWidth: ver === "completo" ? `min(100%, ${(80 * razon).toFixed(1)}vh)` : undefined }}
        role="img"
        aria-label={nombre && pos
          ? `Plano de la lotización con ${nombre} señalado. Ubicación referencial.`
          : "Plano de la lotización del proyecto. Ubicación referencial."}>
        <img src={plano.imagen} alt="" loading="lazy" decoding="async" draggable={false}
          className="pointer-events-none absolute max-w-none select-none"
          style={{ width: `${100 / ventana.w}%`, left: `${(-ventana.x / ventana.w) * 100}%`, top: `${(-ventana.y / ventana.h) * 100}%` }} />

        {ver === "completo" && lotes?.map((l) => {
          const p = plano.lotes[l.clave];
          if (!p || l.clave === lote?.clave) return null;
          const { izq, arr } = posicionEnVentana(p, ventana);
          const est = ESTILO_LOTE[estadoEnPlano(l)];
          return (
            <button key={l.clave} type="button" onClick={() => alElegir?.(l.clave)} disabled={!alElegir} data-punto-lote={l.clave}
              aria-label={`Mz. ${l.manzana} · Lote ${etiquetaLote(l)}: ${est.etiqueta.toLowerCase()}`}
              className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow disabled:cursor-default"
              style={{ left: `${izq}%`, top: `${arr}%`, background: est.relleno, borderColor: est.borde }} />
          );
        })}

        {pos && (() => {
          const { izq, arr } = posicionEnVentana(pos, ventana);
          return (
            <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-full" data-pin-lote={lote!.clave}
              style={{ left: `${izq}%`, top: `${arr}%` }}>
              <MapPin className="size-9 fill-red-600 text-white drop-shadow-md" strokeWidth={1.75} aria-hidden="true" />
            </span>
          );
        })()}
      </div>

      <p className="text-xs leading-relaxed text-tinta-2">
        {sinPos ? `${nombre} todavía no está ubicado en el plano. ` : ""}
        {pos ? `${nombre} está donde señala el pin. ` : "Toca un punto para ver ese lote. "}
        Ubicación referencial sobre el plano de la lotización de la inmobiliaria; confírmala con un asesor.{" "}
        <a href={plano.imagen} target="_blank" rel="noopener noreferrer" data-abrir-plano
          className="inline-flex items-center gap-1 font-bold text-primary hover:underline">
          Abrir el plano completo <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </p>
    </figure>
  );
}
