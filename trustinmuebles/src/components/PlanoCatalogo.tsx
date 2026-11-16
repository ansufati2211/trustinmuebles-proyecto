import { useEffect, useMemo, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { Cargando, ErrorCarga, Vacio } from "@/components/base/Estados";
import { Desplegable } from "@/components/base/Desplegable";
import { Button } from "@/components/ui/button";
import { PanelLote, PlanoLotes } from "@/components/PlanoLotes";
import { PlanoLotizacion } from "@/components/PlanoLotizacion";
import { rutaRecomendables, type FiltrosPublico } from "@/lib/filtrosPublico";
import { cargarPlano } from "@/lib/planoLotizacion";
import { clavesQueCoinciden, proyectoInicial, proyectosConLotes } from "@/lib/planoCatalogo";
import { rutaProyectoPublico } from "@/lib/proyectos";
import { useApi } from "@/lib/useApi";
import type { ProyectoPublico, Recomendables } from "@/lib/types";

/**
 * v1.0 (etapa 14): vista «Plano» del catálogo. Elige un proyecto entre los que tienen lotes que cumplen los filtros y muestra
 * su plano: el de la lotización de la inmobiliaria si lo tiene (con un punto por lote, pin y zoom) o el plano de manzanas.
 * Los lotes que no cumplen los filtros se ven atenuados. Tocar un lote pone el pin y abre su detalle a un costado.
 */
export function PlanoCatalogo({ filtros, alVerLista }: { filtros: FiltrosPublico; alVerLista: () => void }) {
  const recom = useApi<Recomendables>(rutaRecomendables(filtros));
  const proyectos = useMemo(() => proyectosConLotes(recom.data?.items ?? []), [recom.data]);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);
  const [conPlanoReal, setConPlanoReal] = useState<boolean | null>(null);

  // El proyecto del filtro (o el primero) al abrir y cada vez que cambian los filtros; si el elegido ya no cumple, se cambia.
  const inicial = proyectoInicial(proyectos, filtros.proyecto);
  useEffect(() => {
    setCodigo((actual) => (actual && proyectos.some((p) => p.codigo === actual) && !filtros.proyecto ? actual : inicial));
  }, [inicial, proyectos, filtros.proyecto]);
  useEffect(() => { setElegido(null); }, [codigo]);

  const proyecto = useApi<ProyectoPublico>(codigo ? rutaProyectoPublico(codigo) : null);
  useEffect(() => {
    setConPlanoReal(null);
    if (!codigo) return;
    let vivo = true;
    cargarPlano(codigo).then((p) => { if (vivo) setConPlanoReal(p !== null); });
    return () => { vivo = false; };
  }, [codigo]);

  const resaltados = useMemo(() => (codigo ? clavesQueCoinciden(recom.data?.items ?? [], codigo) : new Set<string>()), [recom.data, codigo]);

  if (recom.loading && !recom.data) return <Cargando texto="Cargando el plano…" tarjetas={1} />;
  if (recom.error) return <ErrorCarga mensaje={recom.error.message} alReintentar={recom.reload} />;
  if (proyectos.length === 0 || !codigo) {
    return (
      <Vacio icono={LayoutGrid} titulo="Ningún lote de proyecto cumple los filtros"
        accion={<Button onClick={alVerLista}>Ver la lista</Button>}>
        El plano muestra los lotes de los proyectos. Cambia los filtros o mira los demás inmuebles en la lista.
      </Vacio>
    );
  }
  const p = proyecto.data;
  const lote = elegido && p ? p.lotes.find((l) => l.clave === elegido) ?? null : null;

  return (
    <section aria-label="Plano de lotes" className="space-y-4" data-plano-catalogo>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full max-w-sm">
          <Desplegable etiqueta="Proyecto" valor={codigo} alCambiar={(v) => v && setCodigo(v)}
            opciones={proyectos.map((x) => ({ valor: x.codigo, etiqueta: `${x.nombre} (${x.coinciden} ${x.coinciden === 1 ? "lote cumple" : "lotes cumplen"})` }))} />
        </div>
        <p className="max-w-md text-sm text-tinta-2">
          Toca un lote del plano para ver su detalle.{resaltados.size > 0 && " Los lotes atenuados no cumplen tus filtros."}
        </p>
      </div>

      {proyecto.loading && !p ? <Cargando texto="Cargando el plano del proyecto…" tarjetas={1} />
        : proyecto.error || !p ? <ErrorCarga mensaje={proyecto.error?.message ?? "No se pudo cargar el proyecto."} alReintentar={proyecto.reload} />
        : conPlanoReal === null ? <Cargando texto="Cargando el plano…" tarjetas={1} />
        : conPlanoReal ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
            <PlanoLotizacion proyectoCodigo={p.codigo} lote={lote} lotes={p.lotes} resaltados={resaltados} conZoom soloCompleto
              titulo="Plano de la lotización" alElegir={setElegido} />
            <PanelLote proyectoCodigo={p.codigo} lote={lote} cerrar={() => setElegido(null)} />
          </div>
        ) : (
          <PlanoLotes key={p.codigo} proyectoCodigo={p.codigo} lotes={p.lotes} resaltados={resaltados} />
        )}
    </section>
  );
}
