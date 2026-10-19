import { Link } from "react-router";
import { ArrowRight, Clock, FileSearch, LandPlot, MapPin, Ruler } from "lucide-react";
import { PredioImagen } from "@/components/base/PredioImagen";
import { IndicadorA, IndicadorB } from "@/components/base/Indicadores";
import { m2, soles } from "@/lib/formato";
import type { ResumenCaso } from "@/lib/types";

/** Tarjeta del catálogo: ilustración, precio referencial, datos del predio y los dos indicadores, siempre separados. */
export function TarjetaPredio({ c }: { c: ResumenCaso }) {
  const p = c.predio;
  const enlace = `/casos/${c.codigo}`;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-tarjeta transition-shadow hover:shadow-elevada">
      <Link to={enlace} tabIndex={-1} aria-hidden="true" className="relative block aspect-[16/10] overflow-hidden bg-muted">
        <PredioImagen codigo={c.codigo} tipo={p.tipoInmueble} decorativa
          className="transition-transform duration-500 group-hover:scale-[1.03]" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1 text-xs font-bold text-foreground shadow-tarjeta">
          <LandPlot className="size-3.5 text-primary" aria-hidden="true" /> {p.tipoInmuebleEtiqueta}
        </span>
        {c.origen === "TRANSCRITA" && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-info-suave px-3 py-1 text-xs font-bold text-info-tinta">
            <FileSearch className="size-3.5" aria-hidden="true" /> Transcrita de SUNARP
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          {p.precioReferencial != null ? (
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="cifras text-2xl font-extrabold tracking-tight text-foreground">{soles(p.precioReferencial, true)}</span>
              <span className="text-xs font-semibold text-tinta-2">Precio referencial · dato simulado</span>
            </p>
          ) : (
            <p className="text-lg font-bold text-tinta-2">Precio a consultar</p>
          )}
          <h2 className="mt-2 line-clamp-2 text-lg font-bold leading-snug text-foreground">
            <Link to={enlace} className="hover:text-primary focus-visible:text-primary">{c.denominacion}</Link>
          </h2>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-tinta-2">
            <li className="flex items-center gap-1.5"><MapPin className="size-4" aria-hidden="true" />{p.distrito ?? c.contexto}</li>
            {p.areaM2 != null && (
              <li className="cifras flex items-center gap-1.5"><Ruler className="size-4" aria-hidden="true" />{m2(p.areaM2)} de terreno</li>
            )}
          </ul>
          <p className="cifras mt-1 text-xs font-medium text-tinta-2">Partida N.° {c.codigo}</p>
        </div>

        <div className="flex flex-col items-start gap-2" aria-label="Indicadores del inmueble">
          <IndicadorA estado={c.estado} tamano="sm" />
          <IndicadorB estado={c.estadoTecnico} resultado={c.resultadoTecnico} tamano="sm" />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-tinta-2">
            <Clock className="size-4" aria-hidden="true" />
            {c.pendientes === 0 ? "Sin pendientes" : `${c.pendientes} pendiente${c.pendientes === 1 ? "" : "s"}`}
          </span>
          <Link to={enlace} aria-label={`Ver el expediente de la partida ${c.codigo}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground transition-colors hover:bg-primary hover:text-white">
            Ver expediente <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
