import { ArrowRight, History } from "lucide-react";
import { IndicadorA } from "@/components/base/Indicadores";
import { Cargando, ErrorCarga } from "@/components/base/Estados";
import { lineaDeTiempo } from "@/lib/historial";
import { useApi } from "@/lib/useApi";
import type { EntradaHistorial } from "@/lib/types";

/**
 * Historial de evaluaciones del indicador A (I12): línea de tiempo de solo lectura con lo que envía el servidor. No hay
 * botones para editar ni borrar entradas, y la interfaz no agrega ninguna.
 */
export function HistorialEvaluaciones({ codigo }: { codigo: string }) {
  // Quien lo usa le da una `key` con la fecha de la evaluación vigente: tras un recálculo se monta de nuevo y vuelve a
  // consultar el servidor.
  const { data, loading, error, reload } = useApi<EntradaHistorial[]>(`/casos/${codigo}/historial`);
  const linea = lineaDeTiempo(data);

  return (
    <section aria-labelledby="titulo-historial" className="rounded-3xl border border-border bg-card p-6 shadow-tarjeta sm:p-8">
      <h2 id="titulo-historial" className="flex items-center gap-2 text-xl font-bold text-foreground">
        <History className="size-5 text-primary" aria-hidden="true" /> Historial de evaluaciones
      </h2>
      <p className="mt-1 mb-5 text-sm text-tinta-2">
        Cada recálculo del indicador A queda registrado. Es de solo lectura: no se edita ni se borra.
      </p>
      {loading ? (
        <Cargando texto="Cargando el historial…" />
      ) : error ? (
        <ErrorCarga mensaje={error.message} alReintentar={reload} />
      ) : linea.length === 0 ? (
        <p className="text-sm text-tinta-2">Todavía no hay evaluaciones registradas.</p>
      ) : (
        <ol className="relative space-y-5 border-l-2 border-border pl-6">
          {linea.map((e) => (
            <li key={e.clave} className="relative">
              <span aria-hidden="true" className={`absolute -left-[33px] top-1 size-4 rounded-full border-2 border-card ${e.cambioDeColor ? "bg-primary" : "bg-sem-gris"}`} />
              <p className="text-xs font-bold uppercase tracking-wider text-tinta-2">{e.fecha}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {e.anterior && <><IndicadorA estado={e.anterior} tamano="sm" conPrefijo={false} /><ArrowRight className="size-4 text-tinta-2" aria-hidden="true" /></>}
                <IndicadorA estado={e.nuevo} tamano="sm" conPrefijo={false} />
                <span className="sr-only">{e.transicion}</span>
              </div>
              <p className="mt-1 text-sm text-foreground">
                <span className="font-bold">{e.origen}</span>
                {e.cuenta && <> · {e.cuenta}</>}
                {e.versionReglas && <span className="text-tinta-2"> · criterios {e.versionReglas}</span>}
              </p>
              {e.faltantes.length > 0 && (
                <p className="mt-1 text-xs text-tinta-2">Faltaba: {e.faltantes.join(", ")}</p>
              )}
              {e.motivos.length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs font-bold text-primary">Ver motivos ({e.motivos.length})</summary>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-tinta-2">{e.motivos.map((m, i) => <li key={i}>{m}</li>)}</ul>
                </details>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
