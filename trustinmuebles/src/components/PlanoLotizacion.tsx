import { useEffect, useRef, useState } from "react";
import { ExternalLink, MapPin, Minus, Plus, ZoomIn, ZoomOut } from "lucide-react";
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
export function PlanoLotizacion({ proyectoCodigo, lote = null, lotes, alElegir, soloCompleto = false, titulo = "Ubicación en el plano", resaltados, conZoom = false }: {
  proyectoCodigo: string;
  lote?: Pick<LoteProyecto, "clave" | "manzana" | "numero" | "sufijo"> | null;
  /** Para dibujar un punto por lote en la vista completa. */
  lotes?: LoteProyecto[];
  alElegir?: (clave: string) => void;
  /** Siempre el plano entero (con el lote elegido señalado), sin botón para acercar. */
  soloCompleto?: boolean;
  titulo?: string;
  /** v1.0 (etapa 14): claves de los lotes que cumplen los filtros; los demás puntos se ven atenuados. */
  resaltados?: Set<string>;
  /** v1.0 (etapa 14): botones «+» y «−» para agrandar el plano entero (hasta 3×) y recorrerlo con scroll. */
  conZoom?: boolean;
}) {
  const [plano, setPlano] = useState<Plano | null>(null);
  const [completo, setCompleto] = useState(false);
  const [nivel, setNivel] = useState(1);
  const pin = useRef<HTMLSpanElement | null>(null);
  const claveElegida = lote?.clave;
  // Con el plano agrandado, al elegir un lote el pin queda a la vista.
  useEffect(() => {
    if (conZoom && nivel > 1) pin.current?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
  }, [conZoom, nivel, claveElegida]);

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

      {conZoom && ver === "completo" && (
        <div className="flex items-center gap-2" role="group" aria-label="Tamaño del plano">
          <button type="button" onClick={() => setNivel((n) => Math.max(1, n - 1))} disabled={nivel === 1} aria-label="Alejar el plano" data-zoom="menos"
            className="grid size-9 place-items-center rounded-lg border border-border hover:bg-muted disabled:opacity-40"><Minus className="size-4" aria-hidden="true" /></button>
          <span className="cifras w-8 text-center text-sm font-bold text-foreground" aria-live="polite">{nivel}×</span>
          <button type="button" onClick={() => setNivel((n) => Math.min(3, n + 1))} disabled={nivel === 3} aria-label="Acercar el plano" data-zoom="mas"
            className="grid size-9 place-items-center rounded-lg border border-border hover:bg-muted disabled:opacity-40"><Plus className="size-4" aria-hidden="true" /></button>
        </div>
      )}

      <div className={conZoom && ver === "completo" && nivel > 1 ? "max-h-[75vh] overflow-auto rounded-xl border border-border" : ""}>
      <div className={`relative mx-auto overflow-hidden bg-muted ${conZoom && ver === "completo" && nivel > 1 ? "" : "w-full rounded-xl border border-border"}`}
        style={{
          aspectRatio: String(razon),
          maxWidth: ver === "completo" && !(conZoom && nivel > 1) ? `min(100%, ${(80 * razon).toFixed(1)}vh)` : undefined,
          width: conZoom && ver === "completo" && nivel > 1 ? `${nivel * 100}%` : undefined,
        }}
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
          const cumple = !resaltados || resaltados.has(l.clave);
          return (
            <button key={l.clave} type="button" onClick={() => alElegir?.(l.clave)} disabled={!alElegir} data-punto-lote={l.clave}
              data-cumple={cumple}
              aria-label={`Mz. ${l.manzana} · Lote ${etiquetaLote(l)}: ${est.etiqueta.toLowerCase()}${cumple ? "" : ". No cumple tus filtros"}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow disabled:cursor-default ${cumple ? "size-2.5" : "size-2 opacity-30"}`}
              style={{ left: `${izq}%`, top: `${arr}%`, background: est.relleno, borderColor: est.borde }} />
          );
        })}

        {pos && (() => {
          const { izq, arr } = posicionEnVentana(pos, ventana);
          return (
            <span ref={pin} className="pointer-events-none absolute -translate-x-1/2 -translate-y-full" data-pin-lote={lote!.clave}
              style={{ left: `${izq}%`, top: `${arr}%` }}>
              <MapPin className="size-9 fill-red-600 text-white drop-shadow-md" strokeWidth={1.75} aria-hidden="true" />
            </span>
          );
        })()}
      </div>
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
