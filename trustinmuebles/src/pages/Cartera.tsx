import { useState } from "react";
import { Link } from "react-router";
import {
  CheckCircle2, ClipboardList, FolderOpen, FunnelX, HardHat, Inbox, LayoutDashboard, Search, UserCheck, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/base/Badge";
import { Desplegable } from "@/components/base/Desplegable";
import { Cargando, ErrorCarga, Vacio } from "@/components/base/Estados";
import { IndicadorA, IndicadorB } from "@/components/base/Indicadores";
import { Mensaje } from "@/components/base/Mensaje";
import { TituloSeccion } from "@/components/base/TituloSeccion";
import { claseCampo } from "@/components/base/Campo";
import { TarjetaPredio } from "@/components/TarjetaPredio";
import { InsigniaPublicacion } from "@/components/PanelPublicacion";
import { put } from "@/lib/api";
import {
  COLORES, ESTADOS_PUBLICACION, ETIQUETA_PUBLICACION, FILTRO_CARTERA_VACIO, filtrarCartera, totalesDelPanel,
  type FiltroCartera,
} from "@/lib/cartera";
import { etiquetaMotivo } from "@/lib/contacto";
import { fechaHora } from "@/lib/historial";
import { ESTADOS } from "@/lib/semaforo";
import { useApi } from "@/lib/useApi";
import type { Contacto, PanelCartera, ResumenCaso } from "@/lib/types";

const tarjeta = "rounded-[2rem] border border-border bg-card p-6 shadow-tarjeta sm:p-7";

const OPCIONES_COLOR = COLORES.map((c) => ({ valor: c, etiqueta: `${ESTADOS[c].nombre} · ${ESTADOS[c].resumen}` }));
const OPCIONES_PUBLICACION = ESTADOS_PUBLICACION.map((e) => ({ valor: e, etiqueta: ETIQUETA_PUBLICACION[e] }));

function BandejaContactos({ alCambiar }: { alCambiar: () => void }) {
  const { data, loading, error, reload } = useApi<Contacto[]>("/contactos?estado=PENDIENTE");
  const [enviando, setEnviando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const atender = async (c: Contacto) => {
    setMensaje(null);
    setEnviando(c.id);
    try {
      await put(`/contactos/${c.id}/atencion`, {});
      setMensaje({ tipo: "ok", texto: `Solicitud de ${c.compradorCodigo} sobre ${c.casoCodigo} marcada como atendida.` });
    } catch (e) {
      setMensaje({ tipo: "error", texto: e instanceof Error ? e.message : "No se pudo marcar la solicitud" });
    } finally {
      setEnviando(null);
      reload();
      alCambiar();
    }
  };

  return (
    <section aria-labelledby="titulo-bandeja" className={`${tarjeta} space-y-5`}>
      <TituloSeccion
        icono={Inbox}
        id="titulo-bandeja"
        derecha={
          data && data.length > 0 ? (
            <span className="cifras rounded-full bg-primary px-3.5 py-1 text-sm font-black text-white">{data.length}</span>
          ) : undefined
        }
      >
        Contactos pendientes
      </TituloSeccion>
      {mensaje && <Mensaje tono={mensaje.tipo}>{mensaje.texto}</Mensaje>}
      {loading && !data ? (
        <Cargando texto="Cargando solicitudes…" />
      ) : error ? (
        <ErrorCarga mensaje={error.message} alReintentar={reload} />
      ) : !data || data.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-border bg-superficie p-5 text-sm font-semibold text-tinta-2">
          No hay solicitudes de contacto pendientes.
        </p>
      ) : (
        <ul className="space-y-3">
          {data.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-superficie p-4 transition-colors hover:border-primary/30"
            >
              <div className="min-w-0">
                <p className="font-bold text-foreground">
                  <Link to={`/casos/${c.casoCodigo}`} className="transition-colors hover:text-primary">Partida {c.casoCodigo}</Link>
                  <span className="font-semibold text-tinta-2"> · {etiquetaMotivo(c.motivo)}</span>
                </p>
                <p className="mt-0.5 text-xs text-tinta-2">Cuenta {c.compradorCodigo} · {fechaHora(c.creadaEn)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tono="info" icono={Inbox} tamano="sm">Pendiente</Badge>
                <Button size="sm" variant="outline" disabled={enviando !== null} onClick={() => atender(c)}>
                  <CheckCircle2 aria-hidden="true" /> {enviando === c.id ? "Marcando…" : "Marcar atendida"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Cartera() {
  const panel = useApi<PanelCartera>("/cartera/panel");
  const casos = useApi<ResumenCaso[]>("/casos");
  const [filtro, setFiltro] = useState<FiltroCartera>(FILTRO_CARTERA_VACIO);
  const t = totalesDelPanel(panel.data);
  const p = panel.data;
  const visibles = filtrarCartera(casos.data, filtro);
  const hayFiltro = !!(filtro.color || filtro.publicacion || filtro.q.trim());

  return (
    <div className="flex w-full flex-col">
      <section className="relative isolate overflow-hidden bg-foreground">
        <img
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-foreground via-foreground/90 to-foreground/55" aria-hidden="true" />
        <div className="animate-glow pointer-events-none absolute -left-20 -top-24 -z-10 h-[340px] w-[480px] rounded-full bg-primary/30 blur-[100px]" aria-hidden="true" />
        <div
          className="absolute inset-0 -z-10 opacity-60 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.09)_1px,transparent_0)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]"
          aria-hidden="true"
        />

        <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8">
          <div>
            <span className="anim-enter inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-md">
              <LayoutDashboard className="size-4" aria-hidden="true" /> Gestión comercial
            </span>
            <h1 style={{ "--d": "100ms" } as React.CSSProperties} className="anim-enter mt-5 text-4xl font-black leading-tight tracking-tight text-white md:text-6xl">
              Cartera
            </h1>
            <p style={{ "--d": "200ms" } as React.CSSProperties} className="anim-enter mt-3 max-w-2xl leading-relaxed text-gray-200 md:text-lg">
              Estado de la cartera, inspecciones en curso y contactos pendientes. Publicar o retirar un caso se hace desde su
              expediente y nunca cambia el color del indicador A.
            </p>
          </div>
          <dl style={{ "--d": "300ms" } as React.CSSProperties} className="anim-enter grid grid-cols-2 gap-3 sm:min-w-[320px]">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl">
              <dt className="text-xs font-bold uppercase tracking-wide text-gray-300">Casos</dt>
              <dd className="cifras mt-1 text-3xl font-black text-white">{panel.loading && !p ? "—" : t.total}</dd>
            </div>
            <div className="rounded-2xl border border-emerald-300/30 bg-primary/30 p-4 backdrop-blur-xl">
              <dt className="text-xs font-bold uppercase tracking-wide text-emerald-200">Inspecciones</dt>
              <dd className="cifras mt-1 text-3xl font-black text-white">{panel.loading && !p ? "—" : (p?.inspecciones?.length ?? 0)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {panel.loading && !p ? (
          <Cargando texto="Cargando el panel de cartera…" />
        ) : panel.error ? (
          <ErrorCarga mensaje={panel.error.message} alReintentar={panel.reload} />
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <section aria-labelledby="titulo-colores" className={`${tarjeta} space-y-5`}>
                <TituloSeccion icono={LayoutDashboard} id="titulo-colores">Indicador A · {t.total} casos</TituloSeccion>
                <ul className="grid grid-cols-2 gap-3">
                  {COLORES.map((c) => (
                    <li
                      key={c}
                      className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-superficie p-4 transition-all duration-500 ease-expo hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-tarjeta"
                    >
                      <IndicadorA estado={c} tamano="sm" conPrefijo={false} />
                      <span className="cifras text-3xl font-black text-foreground">{t.porColor[c]}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-tinta-2">Verde = {ESTADOS.VERDE.resumen}.</p>
              </section>

              <section aria-labelledby="titulo-publicacion-totales" className={`${tarjeta} space-y-5`}>
                <TituloSeccion icono={FolderOpen} id="titulo-publicacion-totales">Publicación</TituloSeccion>
                <ul className="grid grid-cols-3 gap-3">
                  {ESTADOS_PUBLICACION.map((e) => (
                    <li
                      key={e}
                      className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-superficie p-4 transition-all duration-500 ease-expo hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-tarjeta"
                    >
                      <InsigniaPublicacion estado={e} tamano="sm" />
                      <span className="cifras text-3xl font-black text-foreground">{t.porPublicacion[e]}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section aria-labelledby="titulo-faltantes" className={`${tarjeta} space-y-5`}>
                <TituloSeccion icono={ClipboardList} id="titulo-faltantes">Casos con faltantes</TituloSeccion>
                {!p?.casosConFaltantes?.length ? (
                  <p className="rounded-2xl border-2 border-dashed border-border bg-superficie p-5 text-sm font-semibold text-tinta-2">
                    Ningún caso tiene información faltante.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {p.casosConFaltantes.map((c) => (
                      <li key={c.codigo} className="rounded-2xl border border-border bg-superficie p-4 transition-colors hover:border-primary/30">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Link to={`/casos/${c.codigo}`} className="font-bold text-foreground transition-colors hover:text-primary">Partida {c.codigo}</Link>
                          <IndicadorA estado={c.estado} tamano="sm" conPrefijo={false} />
                        </div>
                        <p className="mt-1.5 text-xs text-tinta-2">Falta: {(c.faltantes ?? []).join(", ")}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="titulo-inspecciones" className={`${tarjeta} space-y-5`}>
                <TituloSeccion
                  icono={HardHat}
                  id="titulo-inspecciones"
                  descripcion={`${p?.inspeccionesAsignadas ?? 0} asignadas · ${p?.inspeccionesSinAsignar ?? 0} sin asignar. Se asignan desde el expediente.`}
                >
                  Inspecciones solicitadas o en curso
                </TituloSeccion>
                {!p?.inspecciones?.length ? (
                  <p className="rounded-2xl border-2 border-dashed border-border bg-superficie p-5 text-sm font-semibold text-tinta-2">
                    No hay inspecciones solicitadas ni en curso.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {p.inspecciones.map((i) => (
                      <li key={i.codigo} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-superficie p-4 transition-colors hover:border-primary/30">
                        <Link to={`/casos/${i.codigo}#evaluacion-tecnica`} className="font-bold text-foreground transition-colors hover:text-primary">Partida {i.codigo}</Link>
                        <div className="flex flex-wrap gap-2">
                          <IndicadorB estado={i.estado} tamano="sm" conPrefijo={false} />
                          {i.asignada
                            ? <Badge tono="marca" icono={UserCheck} tamano="sm">{i.especialistaAsignadoCodigo}</Badge>
                            : <Badge tono="gris" icono={UserCheck} tamano="sm">Pendiente de asignación por el gestor</Badge>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}

        <BandejaContactos alCambiar={panel.reload} />

        <section aria-labelledby="titulo-lista" className="space-y-6">
          <TituloSeccion icono={FolderOpen} id="titulo-lista">Casos de la cartera</TituloSeccion>

          <form
            role="search"
            onSubmit={(e) => e.preventDefault()}
            aria-label="Filtrar los casos de la cartera"
            className="relative z-30 space-y-4 rounded-[2rem] border border-border bg-card p-5 shadow-tarjeta sm:p-6"
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="c-q" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-tinta-2">Buscar por partida, distrito o nombre</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-tinta-2" aria-hidden="true" />
                  <input
                    id="c-q"
                    type="search"
                    maxLength={40}
                    autoComplete="off"
                    className={`${claseCampo} pl-11 pr-11 [&::-webkit-search-cancel-button]:hidden`}
                    value={filtro.q}
                    onChange={(e) => setFiltro({ ...filtro, q: e.target.value })}
                  />
                  {filtro.q && (
                    <button
                      type="button"
                      onClick={() => setFiltro({ ...filtro, q: "" })}
                      aria-label="Borrar búsqueda"
                      className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-tinta-2 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
              <Desplegable
                etiqueta="Indicador A"
                valor={filtro.color}
                opciones={OPCIONES_COLOR}
                textoTodos="Todos los colores"
                alCambiar={(v) => setFiltro({ ...filtro, color: v as FiltroCartera["color"] })}
              />
              <Desplegable
                etiqueta="Publicación"
                valor={filtro.publicacion}
                opciones={OPCIONES_PUBLICACION}
                textoTodos="Todos los estados"
                alCambiar={(v) => setFiltro({ ...filtro, publicacion: v as FiltroCartera["publicacion"] })}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p role="status" aria-live="polite" className="cifras text-sm font-bold text-foreground">
                {casos.loading && !casos.data ? "Buscando casos…" : casos.error ? "" : `${visibles.length} caso${visibles.length === 1 ? "" : "s"}`}
              </p>
              {hayFiltro && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setFiltro(FILTRO_CARTERA_VACIO)}>
                  <FunnelX aria-hidden="true" /> Limpiar filtros
                </Button>
              )}
            </div>
          </form>

          {casos.loading && !casos.data ? (
            <Cargando texto="Cargando los casos…" tarjetas={3} />
          ) : casos.error ? (
            <ErrorCarga mensaje={casos.error.message} alReintentar={casos.reload} />
          ) : visibles.length === 0 ? (
            <Vacio
              icono={FolderOpen}
              titulo={hayFiltro ? "Ningún caso cumple estos filtros" : "Todavía no hay casos en la cartera"}
              accion={hayFiltro ? <Button onClick={() => setFiltro(FILTRO_CARTERA_VACIO)}><FunnelX aria-hidden="true" /> Limpiar filtros</Button> : undefined}
            />
          ) : (
            <ul className="grid grid-cols-1 gap-6 pb-12 sm:grid-cols-2 xl:grid-cols-3">
              {visibles.map((c, i) => (
                <li key={c.codigo} style={{ "--d": `${Math.min(i, 8) * 70}ms` } as React.CSSProperties} className="anim-enter">
                  <TarjetaPredio c={c} conPublicacion />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}