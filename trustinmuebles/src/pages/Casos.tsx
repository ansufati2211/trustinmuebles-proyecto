import { useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ExternalLink, FolderOpen, Search, SlidersHorizontal, FunnelX, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TarjetaPredio } from "@/components/TarjetaPredio";
import { Desplegable } from "@/components/base/Desplegable";
import { Cargando, ErrorCarga, Vacio } from "@/components/base/Estados";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { abrirExterno, CONOCE_AQUI, copiar, normalizarNumero, pareceNumeroDePartida, VISOR_BGR } from "@/lib/fuentes";
import {
  FILTROS_VACIOS, OPCIONES_A, OPCIONES_B, OPCIONES_TIPO, filtrosAURL, filtrosDesdeURL, hayFiltros, rutaCatalogo,
  textoResultados, type Filtros,
} from "@/lib/catalogo";
import { ESTADOS } from "@/lib/semaforo";
import type { EstadoSemaforo, ResumenCaso } from "@/lib/types";

const campo =
  "h-14 w-full rounded-2xl border border-border bg-background px-4 text-base font-semibold text-foreground transition-all duration-300 hover:border-primary/40 focus:border-primary focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/15";

const retraso = (ms: number): CSSProperties => ({ "--d": `${ms}ms` } as CSSProperties);

export default function Casos() {
  const [params, setParams] = useSearchParams();
  const filtros = filtrosDesdeURL(params);
  const { data: casos, loading, error, reload } = useApi<ResumenCaso[]>(rutaCatalogo(filtros));
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [copiado, setCopiado] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(false);

  const cambiar = (parcial: Partial<Filtros>) => setParams(filtrosAURL({ ...filtros, ...parcial }), { replace: true });
  const limpiar = () => setParams(filtrosAURL(FILTROS_VACIOS), { replace: true });

  const q = filtros.q.trim();
  const qNumero = normalizarNumero(q);
  const visibles = (casos ?? []).filter((c) =>
    !q || normalizarNumero(c.codigo).includes(qNumero) || c.denominacion.toLowerCase().includes(q.toLowerCase())
    || (c.predio.distrito ?? "").toLowerCase().includes(q.toLowerCase()));
  const esNumero = pareceNumeroDePartida(q);

  const buscarEnSunarp = async () => {
    setCopiado(await copiar(qNumero));
    abrirExterno(CONOCE_AQUI);
    if (usuario?.rol === "REVISOR") navigate(`/casos/nueva?numero=${encodeURIComponent(qNumero)}`);
  };

  const etiquetaDe = (lista: { valor: string; etiqueta: string }[], valor: string) =>
    lista.find((o) => o.valor === valor)?.etiqueta ?? valor;

  const activos: { clave: keyof Filtros; texto: string }[] = [];
  if (q) activos.push({ clave: "q", texto: `“${q}”` });
  if (filtros.tipo) activos.push({ clave: "tipo", texto: etiquetaDe(OPCIONES_TIPO, filtros.tipo) });
  if (filtros.indicadorA) activos.push({ clave: "indicadorA", texto: `A · ${etiquetaDe(OPCIONES_A, filtros.indicadorA)}` });
  if (filtros.indicadorB) activos.push({ clave: "indicadorB", texto: `B · ${etiquetaDe(OPCIONES_B, filtros.indicadorB)}` });

  return (
    <div className="flex w-full flex-col">
      <section className="relative isolate overflow-hidden bg-foreground">
        <img
          src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=2000&q=80"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full scale-105 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-foreground via-foreground/85 to-foreground/40" aria-hidden="true" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-foreground/80 via-transparent to-transparent" aria-hidden="true" />
        <div className="animate-glow pointer-events-none absolute -left-24 -top-24 -z-10 h-[360px] w-[520px] rounded-full bg-primary/30 blur-[110px]" aria-hidden="true" />
        <div
          className="absolute inset-0 -z-10 opacity-60 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.09)_1px,transparent_0)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]"
          aria-hidden="true"
        />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8 lg:pb-28 lg:pt-20">
          <div>
            <span
              style={retraso(80)}
              className="anim-enter inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-md"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              Cartera propia · Ica
            </span>
            <h1
              style={retraso(180)}
              className="anim-enter mt-5 text-4xl font-black leading-[1.05] tracking-tight text-white md:text-6xl"
            >
              Cartera de inmuebles
            </h1>
            <p
              style={retraso(280)}
              className="anim-enter mt-4 max-w-2xl text-base leading-relaxed text-gray-200 md:text-lg"
            >
              Lotes y viviendas que la inmobiliaria tiene a la venta. Cada uno trae su evaluación documental (indicador A) y,
              si se pidió, su evaluación técnica presencial (indicador B).
            </p>
          </div>

          <dl style={retraso(380)} className="anim-enter grid grid-cols-2 gap-3 sm:min-w-[320px]">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl">
              <dt className="text-xs font-bold uppercase tracking-wide text-gray-300">En cartera</dt>
              <dd className="cifras mt-1 text-3xl font-black text-white">{loading ? "—" : (casos ?? []).length}</dd>
            </div>
            <div className="rounded-2xl border border-emerald-300/30 bg-primary/30 p-4 backdrop-blur-xl">
              <dt className="text-xs font-bold uppercase tracking-wide text-emerald-200">Coinciden</dt>
              <dd className="cifras mt-1 text-3xl font-black text-white">{loading || error ? "—" : visibles.length}</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          aria-label="Filtrar la cartera"
          className="relative z-30 -mt-14 mb-8 rounded-[2rem] border border-border bg-card p-5 shadow-[0_30px_70px_-24px_rgba(2,44,34,0.35)] sm:p-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <label htmlFor="f-q" className="sr-only">Buscar por partida, distrito o nombre</label>
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-tinta-2" aria-hidden="true" />
              <input
                id="f-q"
                type="search"
                value={filtros.q}
                maxLength={40}
                autoComplete="off"
                placeholder="Busca por partida, distrito o nombre: 11048217, Parcona…"
                onChange={(e) => cambiar({ q: e.target.value })}
                className={`${campo} pl-12 pr-12 [&::-webkit-search-cancel-button]:hidden`}
              />
              {filtros.q && (
                <button
                  type="button"
                  onClick={() => cambiar({ q: "" })}
                  aria-label="Borrar búsqueda"
                  className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-tinta-2 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-14 rounded-2xl sm:hidden"
              aria-expanded={panelAbierto}
              aria-controls="panel-filtros"
              onClick={() => setPanelAbierto((v) => !v)}
            >
              <SlidersHorizontal aria-hidden="true" /> Filtros
              <ChevronDown className={`transition-transform duration-300 ${panelAbierto ? "rotate-180" : ""}`} aria-hidden="true" />
            </Button>
          </div>

          <div id="panel-filtros" className={`${panelAbierto ? "grid" : "hidden"} mt-5 gap-5 sm:grid`}>
            <fieldset>
              <legend className="mb-2.5 text-xs font-bold uppercase tracking-wider text-tinta-2">Indicador A · documental</legend>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={filtros.indicadorA === ""}
                  onClick={() => cambiar({ indicadorA: "" })}
                  className={`inline-flex h-10 items-center rounded-full border px-4 text-sm font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-[0.97] ${
                    filtros.indicadorA === ""
                      ? "border-foreground bg-foreground text-white shadow-md"
                      : "border-border bg-background text-foreground hover:border-primary/40"
                  }`}
                >
                  Todos
                </button>
                {OPCIONES_A.map((o) => {
                  const e = ESTADOS[o.valor as EstadoSemaforo];
                  const activo = filtros.indicadorA === o.valor;
                  return (
                    <button
                      key={o.valor}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => cambiar({ indicadorA: activo ? "" : (o.valor as Filtros["indicadorA"]) })}
                      className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-[0.97] ${
                        activo
                          ? `${e?.fondo ?? "bg-secondary"} ${e?.borde ?? "border-primary"} ${e?.texto ?? "text-primary"} shadow-md`
                          : "border-border bg-background text-foreground hover:border-primary/40"
                      }`}
                    >
                      <span className={`size-2.5 rounded-full ${e?.banda ?? "bg-muted-foreground"}`} aria-hidden="true" />
                      {o.etiqueta}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-4 md:grid-cols-2">
              <Desplegable
                etiqueta="Tipo de inmueble"
                valor={filtros.tipo}
                opciones={OPCIONES_TIPO}
                textoTodos="Todos los tipos"
                alCambiar={(v) => cambiar({ tipo: v as Filtros["tipo"] })}
              />
              <Desplegable
                etiqueta="Indicador B · técnico presencial"
                valor={filtros.indicadorB}
                opciones={OPCIONES_B}
                textoTodos="Todos los estados"
                alCambiar={(v) => cambiar({ indicadorB: v as Filtros["indicadorB"] })}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <p role="status" aria-live="polite" className="cifras mr-1 text-sm font-bold text-foreground">
                {loading ? "Buscando inmuebles…" : error ? "" : textoResultados(visibles.length)}
              </p>
              {activos.map((a) => (
                <button
                  key={a.clave}
                  type="button"
                  onClick={() => cambiar({ [a.clave]: "" } as Partial<Filtros>)}
                  aria-label={`Quitar filtro ${a.texto}`}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground transition-colors hover:border-primary hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  {a.texto}
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              ))}
            </div>
            {hayFiltros(filtros) && (
              <Button type="button" variant="ghost" size="sm" onClick={limpiar}>
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
            <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-8 shadow-tarjeta sm:p-10">
              <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-primary/10 blur-[80px]" aria-hidden="true" />
              <div className="relative max-w-2xl">
                <span className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <Search className="size-6" aria-hidden="true" />
                </span>
                <h2 className="mb-2 text-2xl font-extrabold tracking-tight text-foreground">
                  La partida {qNumero} no está registrada en Trustinmuebles
                </h2>
                <p className="mb-6 leading-relaxed text-tinta-2">
                  Puedes consultarla gratis en Conoce Aquí, de SUNARP (con tu DNI). Trustinmuebles no la trae sola: el sitio
                  oficial pide la identidad de quien consulta.
                  {usuario?.rol === "REVISOR"
                    ? " Después pega el texto aquí para registrarla sin los datos de personas naturales."
                    : " Si la necesitas aquí, pide al revisor que la registre."}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button size="lg" onClick={buscarEnSunarp}>
                    Buscar en Conoce Aquí <ExternalLink aria-hidden="true" />
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => abrirExterno(VISOR_BGR)}>
                    Ver ubicación en el Visor BGR <ExternalLink aria-hidden="true" />
                  </Button>
                </div>
                {copiado && (
                  <p role="status" className="mt-4 inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-secondary-foreground">
                    Número copiado: pégalo en Conoce Aquí.
                  </p>
                )}
              </div>
            </div>
          ) : hayFiltros(filtros) ? (
            <Vacio
              icono={FolderOpen}
              titulo="Ningún inmueble cumple estos filtros"
              accion={<Button onClick={limpiar}><FunnelX aria-hidden="true" /> Limpiar filtros</Button>}
            >
              Prueba con otro color o estado, o quita algún filtro. Los filtros se combinan: el inmueble debe cumplir todos.
            </Vacio>
          ) : (
            <Vacio icono={FolderOpen} titulo="Todavía no hay inmuebles en la cartera">
              Cuando el revisor registre uno, aparecerá en esta lista.
            </Vacio>
          )
        ) : (
          <ul className="grid grid-cols-1 gap-6 pb-12 sm:grid-cols-2 xl:grid-cols-3">
            {visibles.map((c, i) => (
              <li key={c.codigo} style={retraso(Math.min(i, 8) * 70)} className="anim-enter">
                <TarjetaPredio c={c} conPublicacion={usuario?.rol !== "COMPRADOR"} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}