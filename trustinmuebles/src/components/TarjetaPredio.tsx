import { Link } from "react-router";
import { ArrowRight, CheckCircle2, Clock, FileSearch, LandPlot, MapPin, Ruler } from "lucide-react";
import { PredioImagen } from "@/components/base/PredioImagen";
import { IndicadorA, IndicadorB } from "@/components/base/Indicadores";
import { m2, soles } from "@/lib/formato";
import { InsigniaPublicacion } from "@/components/PanelPublicacion";
import type { ResumenCaso } from "@/lib/types";

export function TarjetaPredio({ c, conPublicacion = false }: { c: ResumenCaso; conPublicacion?: boolean }) {
  const p = c.predio;
  const enlace = `/casos/${c.codigo}`;
  const sinPendientes = c.pendientes === 0;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-tarjeta transition-all duration-500 ease-expo hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-elevada">
      <Link to={enlace} tabIndex={-1} aria-hidden="true" className="relative block aspect-[16/10] overflow-hidden bg-muted">
        <PredioImagen
          codigo={c.codigo}
          tipo={p.tipoInmueble}
          decorativa
          className="transition-transform duration-700 ease-expo group-hover:scale-[1.06]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/5 to-transparent" />

        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 text-xs font-bold text-foreground shadow-tarjeta backdrop-blur">
          <LandPlot className="size-3.5 text-primary" aria-hidden="true" /> {p.tipoInmuebleEtiqueta}
        </span>

        {c.origen === "TRANSCRITA" && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-info-suave px-3 py-1.5 text-xs font-bold text-info-tinta shadow-tarjeta">
            <FileSearch className="size-3.5" aria-hidden="true" /> Transcrita de SUNARP
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4">
          {p.precioReferencial != null ? (
            <p className="cifras text-2xl font-black tracking-tight text-white drop-shadow-sm">
              {soles(p.precioReferencial, true)}
            </p>
          ) : (
            <p className="text-base font-bold text-white/90">Precio a consultar</p>
          )}
          <span className="cifras rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
            N.° {c.codigo}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h2 className="line-clamp-2 text-lg font-extrabold leading-snug tracking-tight text-foreground">
            <Link
              to={enlace}
              className="transition-colors after:absolute after:inset-0 after:z-10 hover:text-primary focus-visible:text-primary focus-visible:outline-none"
            >
              {c.denominacion}
            </Link>
          </h2>
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-sm font-medium text-tinta-2">
            <li className="flex items-center gap-1.5">
              <MapPin className="size-4 text-primary" aria-hidden="true" />
              {p.distrito ?? c.contexto}
            </li>
            {p.areaM2 != null && (
              <li className="cifras flex items-center gap-1.5">
                <Ruler className="size-4 text-primary" aria-hidden="true" />
                {m2(p.areaM2)} de terreno
              </li>
            )}
          </ul>
        </div>

        <div
          className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-background/70 p-3.5"
          aria-label="Indicadores del inmueble"
        >
          <IndicadorA estado={c.estado} tamano="sm" />
          <IndicadorB estado={c.estadoTecnico} resultado={c.resultadoTecnico} tamano="sm" />
          {conPublicacion && c.estadoPublicacion && <InsigniaPublicacion estado={c.estadoPublicacion} tamano="sm" />}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              sinPendientes ? "bg-secondary text-secondary-foreground" : "bg-muted text-tinta-2"
            }`}
          >
            {sinPendientes ? (
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
            ) : (
              <Clock className="size-3.5" aria-hidden="true" />
            )}
            {sinPendientes ? "Sin pendientes" : `${c.pendientes} pendiente${c.pendientes === 1 ? "" : "s"}`}
          </span>
          <span
            aria-hidden="true"
            className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground transition-all duration-300 ease-expo group-hover:bg-primary group-hover:text-white group-hover:shadow-md group-hover:shadow-primary/30"
          >
            Ver expediente
            <ArrowRight className="size-4 transition-transform duration-300 ease-expo group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </article>
  );
}