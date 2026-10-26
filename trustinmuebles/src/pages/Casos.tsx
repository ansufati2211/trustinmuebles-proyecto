import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ExternalLink, FolderOpen, Search, SlidersHorizontal, FunnelX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TarjetaPredio } from "@/components/TarjetaPredio";
import { Cargando, ErrorCarga, Vacio } from "@/components/base/Estados";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { abrirExterno, CONOCE_AQUI, copiar, normalizarNumero, pareceNumeroDePartida, VISOR_BGR } from "@/lib/fuentes";
import {
  FILTROS_VACIOS, OPCIONES_A, OPCIONES_B, OPCIONES_TIPO, filtrosAURL, filtrosDesdeURL, hayFiltros, rutaCatalogo,
  textoResultados, type Filtros,
} from "@/lib/catalogo";
import type { ResumenCaso } from "@/lib/types";

const campo = "h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export default function Casos() {
  const [params, setParams] = useSearchParams();
  const filtros = filtrosDesdeURL(params);
  // Los filtros los resuelve el servidor (M13); la búsqueda por número o texto, el navegador.
  const { data: casos, loading, error, reload } = useApi<ResumenCaso[]>(rutaCatalogo(filtros));
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [copiado, setCopiado] = useState(false);

  const cambiar = (parcial: Partial<Filtros>) => setParams(filtrosAURL({ ...filtros, ...parcial }), { replace: true });
  const limpiar = () => setParams(filtrosAURL(FILTROS_VACIOS), { replace: true });

  const q = filtros.q.trim();
  const qNumero = normalizarNumero(q);
  const visibles = (casos ?? []).filter((c) =>
    !q || normalizarNumero(c.codigo).includes(qNumero) || c.denominacion.toLowerCase().includes(q.toLowerCase())
    || (c.predio.distrito ?? "").toLowerCase().includes(q.toLowerCase()));
  const esNumero = pareceNumeroDePartida(q);

  // Una partida que no está registrada se consulta en Conoce Aquí (gratis, con DNI). El número se copia para pegarlo allá.
  const buscarEnSunarp = async () => {
    setCopiado(await copiar(qNumero));
    abrirExterno(CONOCE_AQUI);
    if (usuario?.rol === "REVISOR") navigate(`/casos/nueva?numero=${encodeURIComponent(qNumero)}`);
  };

  return (
    <div className="flex w-full flex-col">
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Cartera propia · Ica</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Cartera de inmuebles</h1>
          <p className="mt-2 max-w-2xl text-tinta-2">
            Lotes y viviendas que la inmobiliaria tiene a la venta. Cada uno trae su evaluación documental (indicador A) y,
            si se pidió, su evaluación técnica presencial (indicador B).
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <form role="search" onSubmit={(e) => e.preventDefault()} aria-label="Filtrar la cartera"
          className="mb-6 rounded-3xl border border-border bg-card p-5 shadow-tarjeta">
          <p className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
            <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" /> Filtrar inmuebles
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label htmlFor="f-q" className="mb-1.5 block text-xs font-bold text-tinta-2">Buscar por partida, distrito o nombre</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tinta-2" aria-hidden="true" />
                <input id="f-q" type="search" value={filtros.q} maxLength={40} autoComplete="off"
                  placeholder="Por ejemplo 11048217 o Parcona" onChange={(e) => cambiar({ q: e.target.value })}
                  className={`${campo} pl-9`} />
              </div>
            </div>
            <div>
              <label htmlFor="f-tipo" className="mb-1.5 block text-xs font-bold text-tinta-2">Tipo de inmueble</label>
              <select id="f-tipo" className={campo} value={filtros.tipo} onChange={(e) => cambiar({ tipo: e.target.value as Filtros["tipo"] })}>
                <option value="">Todos</option>
                {OPCIONES_TIPO.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="f-a" className="mb-1.5 block text-xs font-bold text-tinta-2">Indicador A · documental</label>
              <select id="f-a" className={campo} value={filtros.indicadorA} onChange={(e) => cambiar({ indicadorA: e.target.value as Filtros["indicadorA"] })}>
                <option value="">Todos los colores</option>
                {OPCIONES_A.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="f-b" className="mb-1.5 block text-xs font-bold text-tinta-2">Indicador B · técnico presencial</label>
              <select id="f-b" className={campo} value={filtros.indicadorB} onChange={(e) => cambiar({ indicadorB: e.target.value as Filtros["indicadorB"] })}>
                <option value="">Todos los estados</option>
                {OPCIONES_B.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p role="status" aria-live="polite" className="cifras text-sm font-bold text-foreground">
              {loading ? "Buscando inmuebles…" : error ? "" : textoResultados(visibles.length)}
            </p>
            {hayFiltros(filtros) && (
              <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={limpiar}>
                <FunnelX aria-hidden="true" /> Limpiar filtros
              </Button>
            )}
          </div>
        </form>

        {loading ? (
          <Cargando texto="Cargando la cartera de inmuebles…" tarjetas={6} />
        ) : error ? (
          <ErrorCarga mensaje={error.message} alReintentar={reload} />
        ) : visibles.length === 0 ? (
          q && esNumero ? (
            <div className="rounded-3xl border border-border bg-card p-8 shadow-tarjeta">
              <h2 className="mb-2 text-xl font-bold text-foreground">La partida {qNumero} no está registrada en Trustinmuebles</h2>
              <p className="mb-5 leading-relaxed text-tinta-2">
                Puedes consultarla gratis en Conoce Aquí, de SUNARP (con tu DNI). Trustinmuebles no la trae sola: el sitio
                oficial pide la identidad de quien consulta.
                {usuario?.rol === "REVISOR"
                  ? " Después pega el texto aquí para registrarla sin los datos de personas naturales."
                  : " Si la necesitas aquí, pide al revisor que la registre."}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button className="rounded-xl" onClick={buscarEnSunarp}>Buscar en Conoce Aquí <ExternalLink aria-hidden="true" /></Button>
                <Button variant="outline" className="rounded-xl" onClick={() => abrirExterno(VISOR_BGR)}>
                  Ver ubicación en el Visor BGR <ExternalLink aria-hidden="true" />
                </Button>
              </div>
              {copiado && <p role="status" className="mt-3 text-sm font-semibold text-foreground">Número copiado: pégalo en Conoce Aquí.</p>}
            </div>
          ) : hayFiltros(filtros) ? (
            <Vacio icono={FolderOpen} titulo="Ningún inmueble cumple estos filtros"
              accion={<Button className="rounded-xl" onClick={limpiar}><FunnelX aria-hidden="true" /> Limpiar filtros</Button>}>
              Prueba con otro color o estado, o quita algún filtro. Los filtros se combinan: el inmueble debe cumplir todos.
            </Vacio>
          ) : (
            <Vacio icono={FolderOpen} titulo="Todavía no hay inmuebles en la cartera">
              Cuando el revisor registre uno, aparecerá en esta lista.
            </Vacio>
          )
        ) : (
          <ul className="grid grid-cols-1 gap-6 pb-12 sm:grid-cols-2 xl:grid-cols-3">
            {visibles.map((c) => <li key={c.codigo}><TarjetaPredio c={c} conPublicacion={usuario?.rol !== "COMPRADOR"} /></li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
