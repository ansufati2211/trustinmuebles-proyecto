import { Link } from "react-router";
import { ArrowRight, Home, Info } from "lucide-react";
import { Cargando, ErrorCarga, Vacio } from "@/components/base/Estados";
import { IndicadorA, IndicadorB } from "@/components/base/Indicadores";
import { PanelPublicacion } from "@/components/PanelPublicacion";
import { useApi } from "@/lib/useApi";
import type { DetalleCaso, ResumenCaso } from "@/lib/types";

/**
 * Un inmueble del propietario: indicadores, motivos, faltantes, publicación y autorización. Solo lectura, salvo
 * otorgar o retirar la autorización (I13). Sin formularios de edición ni de subida de documentos.
 */
function InmueblePropio({ codigo }: { codigo: string }) {
  const { data: d, loading, error, reload, setData } = useApi<DetalleCaso>(`/casos/${codigo}`);
  if (loading && !d) return <Cargando texto={`Cargando la partida ${codigo}…`} />;
  if (error || !d) return <ErrorCarga mensaje={error?.message ?? "No se pudo cargar el inmueble."} alReintentar={reload} />;
  const ev = d.evaluacion;
  const t = d.evaluacionTecnica;

  return (
    <article className="grid gap-6 rounded-3xl border border-border bg-card p-6 shadow-tarjeta lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div>
          <p className="cifras text-xs font-bold uppercase tracking-wider text-tinta-2">Partida N.° {d.codigo}</p>
          <h2 className="text-xl font-bold text-foreground">{d.denominacion}</h2>
        </div>
        <div className="flex flex-col items-start gap-2">
          <IndicadorA estado={ev?.estado} conResumen />
          <IndicadorB estado={t.estado} resultado={t.resultado} />
        </div>
        {ev && ev.motivos.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-bold text-foreground">Motivos</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">{ev.motivos.map((m, i) => <li key={i}>{m.texto}</li>)}</ul>
          </div>
        )}
        {ev && ev.faltantes.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-bold text-foreground">Información que falta</h3>
            <ul className="flex flex-wrap gap-2">
              {ev.faltantes.map((f) => <li key={f} className="rounded-full border border-sem-gris/50 bg-muted px-3 py-1 text-xs font-bold text-foreground">{f}</li>)}
            </ul>
          </div>
        )}
        <Link to={`/casos/${d.codigo}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
          Ver el expediente y su historial <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <PanelPublicacion codigo={d.codigo} publicacion={d.publicacion} alCambiar={setData} />
    </article>
  );
}

/** «Mis inmuebles» (v0.7): el servidor solo devuelve los casos del propietario autenticado. */
export default function MisInmuebles() {
  const { data, loading, error, reload } = useApi<ResumenCaso[]>("/casos");

  return (
    <div className="flex w-full flex-col">
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Propietario</p>
          <h1 className="mt-1 flex items-center gap-3 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            <Home className="size-8 text-primary" aria-hidden="true" /> Mis inmuebles
          </h1>
          <p className="mt-2 max-w-2xl text-tinta-2">
            Tus inmuebles en la cartera de la inmobiliaria. Puedes otorgar o retirar tu autorización para que se evalúen y se
            publiquen; los datos del expediente los mantiene el revisor.
          </p>
          <p className="mt-3 flex gap-2 text-xs font-semibold text-tinta-2">
            <Info className="size-4 shrink-0" aria-hidden="true" />
            Autorizar o retirar tu autorización no cambia el color del indicador A.
          </p>
        </div>
      </section>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 pb-16 sm:px-6 lg:px-8">
        {loading && !data ? (
          <Cargando texto="Cargando tus inmuebles…" />
        ) : error ? (
          <ErrorCarga mensaje={error.message} alReintentar={reload} />
        ) : !data || data.length === 0 ? (
          <Vacio icono={Home} titulo="Todavía no tienes inmuebles registrados">
            Cuando el revisor registre un expediente a tu nombre de cuenta, aparecerá aquí.
          </Vacio>
        ) : (
          data.map((c) => <InmueblePropio key={c.codigo} codigo={c.codigo} />)
        )}
      </div>
    </div>
  );
}
