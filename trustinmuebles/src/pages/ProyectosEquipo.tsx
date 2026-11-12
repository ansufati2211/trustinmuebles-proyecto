import { Link } from "react-router";
import { ExternalLink, FileUp, FolderKanban } from "lucide-react";
import { Cargando, ErrorCarga, Vacio } from "@/components/base/Estados";
import { Badge } from "@/components/base/Badge";
import { useApi } from "@/lib/useApi";
import { rutaCarga } from "@/lib/cargaLotes";
import { enlaceProyecto } from "@/lib/proyectos";
import type { ResumenProyecto } from "@/lib/types";

/**
 * v1.0 (etapa 3b): proyectos de la inmobiliaria para el asesor y el gestor. Desde aquí se abre la carga masiva de lotes por
 * CSV de cada proyecto o su página pública. Los datos son solo de lectura.
 */
export default function ProyectosEquipo() {
  const { data, loading, error, reload } = useApi<ResumenProyecto[]>("/proyectos");

  return (
    <div className="flex w-full flex-1 flex-col bg-superficie pb-24">
      <div className="mx-auto w-full max-w-6xl px-4 pt-28 sm:px-6 lg:px-8">
        <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-foreground">
          <FolderKanban className="size-8 text-primary" aria-hidden="true" /> Proyectos
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-tinta-2">
          Los proyectos de urbanización de la inmobiliaria y sus lotes. Carga o actualiza los lotes de un proyecto con un
          archivo CSV; antes de guardar verás qué cambia y qué filas tienen errores.
        </p>

        <div className="mt-8" aria-busy={loading}>
          {loading && !data ? <Cargando texto="Cargando proyectos…" tarjetas={3} />
            : error ? <ErrorCarga mensaje={error.message} alReintentar={reload} />
            : !data || data.length === 0 ? <Vacio icono={FolderKanban} titulo="Todavía no hay proyectos">Cuando se registre un proyecto aparecerá aquí.</Vacio>
            : (
              <ul className="grid gap-5 md:grid-cols-2">
                {data.map((p) => (
                  <li key={p.codigo} className="flex flex-col gap-4 rounded-[1.75rem] border border-border bg-card p-6 shadow-tarjeta" data-proyecto={p.codigo}>
                    <div>
                      <h2 className="text-xl font-extrabold text-foreground">{p.nombre}</h2>
                      <p className="text-sm font-semibold text-tinta-2">{p.distrito ? `${p.distrito}, Ica` : "Ica"}</p>
                    </div>
                    <dl className="cifras grid grid-cols-3 gap-3 text-sm">
                      <div><dt className="text-xs font-semibold text-tinta-2">Lotes</dt><dd className="text-lg font-black text-foreground">{p.lotes}</dd></div>
                      <div><dt className="text-xs font-semibold text-tinta-2">En línea</dt><dd className="text-lg font-black text-foreground">{p.publicados}</dd></div>
                      <div><dt className="text-xs font-semibold text-tinta-2">Disponibles</dt><dd className="text-lg font-black text-foreground">{p.conteo.disponibles}</dd></div>
                    </dl>
                    {!p.autorizacionVigente && (
                      <Badge tono="amarillo" icono={FolderKanban} tamano="sm">Sin autorización vigente de la partida matriz: los lotes no se ofrecen en línea</Badge>
                    )}
                    <div className="mt-auto flex flex-wrap gap-3">
                      <Link to={rutaCarga(p.codigo)} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">
                        <FileUp className="size-4" aria-hidden="true" /> Cargar lotes (CSV)
                      </Link>
                      <Link to={enlaceProyecto(p.codigo)} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:border-primary/40">
                        Ver página pública <ExternalLink className="size-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </div>
        <p className="mt-8 text-sm text-tinta-2">
          <Link to="/casos" className="font-bold text-primary hover:underline">Ver los expedientes de la cartera</Link>
        </p>
      </div>
    </div>
  );
}
