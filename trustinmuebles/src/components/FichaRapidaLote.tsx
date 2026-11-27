import { X } from "lucide-react";
import { InsigniaEstadoLote } from "@/components/base/EstadoLote";
import { datosFicha } from "@/lib/fichaLote";
import { precio } from "@/lib/formato";
import { estadoEnPlano, etiquetaLote } from "@/lib/proyectos";
import type { LoteProyecto } from "@/lib/types";

/**
 * v2.0 (RF43): ficha rápida de un lote del plano, que aparece al pasar el mouse o al tocarlo: manzana, lote, área,
 * precio, estado y posición, más frontis, fondo y nota de reserva o descuento (que dicen «Sin dato» mientras no vengan).
 */
export function FichaRapidaLote({ lote, alCerrar, className = "" }: { lote: LoteProyecto; alCerrar?: () => void; className?: string }) {
  const estado = estadoEnPlano(lote);
  return (
    <aside role="dialog" aria-label={`Ficha del lote ${etiquetaLote(lote)} de la manzana ${lote.manzana}`} data-ficha-lote={lote.clave}
      className={`rounded-2xl border border-border bg-card p-3 text-left shadow-elevada ${className}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-foreground">Mz. {lote.manzana} · Lote {etiquetaLote(lote)}</p>
          <InsigniaEstadoLote estado={estado} tamano="sm" className="mt-1" />
        </div>
        {alCerrar && (
          <button type="button" onClick={alCerrar} aria-label="Cerrar la ficha del lote" data-cerrar-ficha
            className="grid size-8 shrink-0 place-items-center rounded-full text-tinta-2 hover:bg-muted hover:text-foreground">
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <dl className="grid grid-cols-3 gap-x-2 gap-y-1.5 text-xs">
        {datosFicha(lote, precio).filter((d) => !["manzana", "lote", "estado"].includes(d.clave)).map((d) => (
          <div key={d.clave} className={d.clave === "nota" ? "col-span-3" : undefined} data-dato-ficha={d.clave}>
            <dt className="text-[11px] font-semibold leading-tight text-tinta-2">{d.termino}</dt>
            <dd className={`cifras font-bold ${d.sinDato ? "font-medium italic text-tinta-2" : "text-foreground"}`}>{d.valor}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
