import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import { Cargando, ErrorCarga, Vacio } from "@/components/base/Estados";
import { TarjetaPredio } from "@/components/TarjetaPredio";
import { FiltrosInmuebles } from "@/components/FiltrosInmuebles";
import { AsistenteBusqueda } from "@/components/AsistenteBusqueda";
import { quitarEtiqueta } from "@/lib/asistente";
import type { CategoriaUso } from "@/lib/usosLote";
import { useApi } from "@/lib/useApi";
import { paginaDeLaUrl, paginasVisibles, textoRango, TAMANO_PAGINA } from "@/lib/publico";
import {
  contarFiltros, filtrosALaUrl, filtrosDeLaUrl, rutaCatalogoPublico, sinFiltros, type FiltrosPublico,
} from "@/lib/filtrosPublico";
import type { OpcionesFiltro, PaginaPublica } from "@/lib/types";

/**
 * v1.0: catálogo público. No exige sesión: muestra solo los inmuebles publicados, en páginas de 24, con lo que ve el
 * comprador (sin datos internos de la inmobiliaria). Etapa 2: filtros combinables y orden en la URL; el servidor filtra,
 * ordena y pagina.
 */
export default function Inmuebles() {
  const [params, setParams] = useSearchParams();
  const pagina = paginaDeLaUrl(params.get("pagina"));
  const filtros = filtrosDeLaUrl(params);
  // v1.0 (etapa 5): el asistente de búsqueda escribe los filtros en la URL; el uso deseado no es un filtro y vive aquí.
  const [asistente, setAsistente] = useState(false);
  const [uso, setUso] = useState<CategoriaUso | null>(null);
  const conFiltros = contarFiltros(filtros) > 0;
  const { data, loading, error, reload } = useApi<PaginaPublica>(rutaCatalogoPublico(filtros, pagina));
  const opciones = useApi<OpcionesFiltro>("/publico/filtros");

  /** Cambiar un filtro o el orden vuelve a la primera página; cambiar de página conserva los filtros. */
  const aplicar = (siguientes: FiltrosPublico, nuevaPagina = 0) => setParams(filtrosALaUrl(siguientes, nuevaPagina));
  const cambiar = (parcial: Partial<FiltrosPublico>) => aplicar({ ...filtros, ...parcial });
  const limpiar = () => { setUso(null); aplicar(sinFiltros(filtros)); };
  const irA = (n: number) => {
    aplicar(filtros, n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex w-full flex-1 flex-col bg-superficie pb-24">
      <section className="relative isolate overflow-hidden bg-foreground">
        <div className="animate-glow pointer-events-none absolute -left-20 -top-24 -z-10 h-[340px] w-[480px] rounded-full bg-primary/30 blur-[100px]" aria-hidden="true" />
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-32 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">Lotes y casas en venta</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-300 sm:text-lg">
            Cada ficha muestra lo que encontramos en la partida y en los documentos del inmueble. Puedes recorrer el
            catálogo sin crear una cuenta.
          </p>
          {data && !conFiltros && <p className="cifras mt-5 text-sm font-semibold text-gray-300">{textoRango(data)}</p>}
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <AsistenteBusqueda opciones={opciones.data} filtros={filtros} uso={uso} activo={asistente}
          resultados={data && !loading ? data.items : null} cargando={loading}
          alBuscar={(f, u) => { setUso(u); setAsistente(true); aplicar(f); }}
          alQuitar={(clave) => { const r = quitarEtiqueta(filtros, uso, clave); setUso(r.uso); aplicar(r.filtros); }}
          alCerrar={() => { setAsistente(false); limpiar(); }} />
        <div className="mt-6">
          <FiltrosInmuebles filtros={filtros} opciones={opciones.data} cambiar={cambiar} limpiar={limpiar}
            total={data ? data.total : null} />
        </div>
        {data && conFiltros && data.total > 0 && (
          <p className="cifras mt-4 text-sm font-semibold text-tinta-2">{textoRango(data)}</p>
        )}
        <div className="mt-6" aria-busy={loading}>
        {loading && !data ? (
          <Cargando texto="Cargando inmuebles…" tarjetas={6} />
        ) : error ? (
          <ErrorCarga mensaje={error.message} alReintentar={reload} />
        ) : !data || data.items.length === 0 ? (
          <Vacio icono={Home}
            titulo={data && data.total > 0 ? "Esta página no tiene inmuebles"
              : conFiltros ? "Ningún inmueble cumple los filtros" : "Todavía no hay inmuebles publicados"}
            accion={data && data.total > 0 ? (
              <button type="button" onClick={() => irA(0)} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
                Ir a la primera página
              </button>
            ) : conFiltros ? (
              <button type="button" onClick={limpiar} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
                Limpiar filtros
              </button>
            ) : undefined}>
            {conFiltros ? "Prueba con menos filtros o con otros valores." : "Vuelve pronto: el catálogo se actualiza cuando se publica un nuevo inmueble."}
          </Vacio>
        ) : (
          <>
            <ul className={`grid grid-cols-1 gap-6 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${loading ? "opacity-60" : ""}`}>
              {data.items.map((c) => (
                <li key={c.codigo}><TarjetaPredio c={c} publico /></li>
              ))}
            </ul>
            <Paginador actual={data.pagina} total={data.totalPaginas} alIr={irA} />
          </>
        )}
        </div>
        <p className="mt-10 text-center text-sm text-tinta-2">
          ¿Trabajas en la inmobiliaria? <Link to="/login" className="font-bold text-primary hover:underline">Ingresar</Link>
          <span className="sr-only"> · {TAMANO_PAGINA} inmuebles por página</span>
        </p>
      </div>
    </div>
  );
}

function Paginador({ actual, total, alIr }: { actual: number; total: number; alIr: (n: number) => void }) {
  const paginas = paginasVisibles(actual, total);
  if (paginas.length === 0) return null;
  const boton = "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-bold transition-colors";
  return (
    <nav aria-label="Páginas del catálogo" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      <button type="button" className={`${boton} border-border bg-card text-foreground disabled:opacity-40`}
        disabled={actual === 0} onClick={() => alIr(actual - 1)} aria-label="Página anterior">
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      {paginas.map((n, i) => n === null ? (
        <span key={`salto-${i}`} className="px-1 text-tinta-2" aria-hidden="true">…</span>
      ) : (
        <button key={n} type="button" onClick={() => alIr(n)} aria-current={n === actual ? "page" : undefined}
          className={`${boton} cifras ${n === actual ? "border-primary bg-primary text-white" : "border-border bg-card text-foreground hover:border-primary/40"}`}>
          {n + 1}
        </button>
      ))}
      <button type="button" className={`${boton} border-border bg-card text-foreground disabled:opacity-40`}
        disabled={actual >= total - 1} onClick={() => alIr(actual + 1)} aria-label="Página siguiente">
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
