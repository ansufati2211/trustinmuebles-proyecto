import { useState } from "react";
import { Link } from "react-router";
import { CheckCircle2, ClipboardList, FolderOpen, FunnelX, HardHat, Inbox, LayoutDashboard, Search, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/base/Badge";
import { Cargando, ErrorCarga, Vacio } from "@/components/base/Estados";
import { IndicadorA, IndicadorB } from "@/components/base/Indicadores";
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

const campo = "h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
const tarjeta = "rounded-3xl border border-border bg-card p-6 shadow-tarjeta";

/** Bandeja de solicitudes de contacto pendientes. «Marcar atendida» y después se vuelve a consultar al servidor. */
function BandejaContactos({ alCambiar }: { alCambiar: () => void }) {
  const { data, loading, error, reload } = useApi<Contacto[]>("/contactos?estado=PENDIENTE");
  const [enviando, setEnviando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const atender = async (c: Contacto) => {
    setMensaje(null); setEnviando(c.id);
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
    <section aria-labelledby="titulo-bandeja" className={tarjeta}>
      <h2 id="titulo-bandeja" className="mb-4 flex items-center gap-2 text-xl font-bold text-foreground">
        <Inbox className="size-5 text-primary" aria-hidden="true" /> Contactos pendientes
      </h2>
      {mensaje && (
        <p role={mensaje.tipo === "ok" ? "status" : "alert"}
          className={`mb-4 text-sm font-semibold ${mensaje.tipo === "ok" ? "text-sem-verde-tinta" : "text-sem-rojo-tinta"}`}>{mensaje.texto}</p>
      )}
      {loading && !data ? (
        <Cargando texto="Cargando solicitudes…" />
      ) : error ? (
        <ErrorCarga mensaje={error.message} alReintentar={reload} />
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-tinta-2">No hay solicitudes de contacto pendientes.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-bold text-foreground">
                  <Link to={`/casos/${c.casoCodigo}`} className="hover:text-primary">Partida {c.casoCodigo}</Link>
                  <span className="font-semibold text-tinta-2"> · {etiquetaMotivo(c.motivo)}</span>
                </p>
                <p className="text-xs text-tinta-2">Cuenta {c.compradorCodigo} · {fechaHora(c.creadaEn)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tono="info" icono={Inbox} tamano="sm">Pendiente</Badge>
                <Button size="sm" variant="outline" className="rounded-xl" disabled={enviando !== null} onClick={() => atender(c)}>
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

/** Panel de cartera del gestor (v0.7). Solo lectura salvo la atención de contactos; ningún dato cambia el color de A. */
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
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Gestión comercial</p>
          <h1 className="mt-1 flex items-center gap-3 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            <LayoutDashboard className="size-8 text-primary" aria-hidden="true" /> Cartera
          </h1>
          <p className="mt-2 max-w-2xl text-tinta-2">
            Estado de la cartera, inspecciones en curso y contactos pendientes. Publicar o retirar un caso se hace desde su
            expediente y nunca cambia el color del indicador A.
          </p>
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
              <section aria-labelledby="titulo-colores" className={tarjeta}>
                <h2 id="titulo-colores" className="mb-4 text-lg font-bold text-foreground">Indicador A · {t.total} casos</h2>
                <ul className="grid grid-cols-2 gap-3">
                  {COLORES.map((c) => (
                    <li key={c} className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-superficie p-3">
                      <IndicadorA estado={c} tamano="sm" conPrefijo={false} />
                      <span className="cifras text-2xl font-extrabold text-foreground">{t.porColor[c]}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-tinta-2">Verde = {ESTADOS.VERDE.resumen}.</p>
              </section>
              <section aria-labelledby="titulo-publicacion-totales" className={tarjeta}>
                <h2 id="titulo-publicacion-totales" className="mb-4 text-lg font-bold text-foreground">Publicación</h2>
                <ul className="grid grid-cols-3 gap-3">
                  {ESTADOS_PUBLICACION.map((e) => (
                    <li key={e} className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-superficie p-3">
                      <InsigniaPublicacion estado={e} tamano="sm" />
                      <span className="cifras text-2xl font-extrabold text-foreground">{t.porPublicacion[e]}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section aria-labelledby="titulo-faltantes" className={tarjeta}>
                <h2 id="titulo-faltantes" className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                  <ClipboardList className="size-5 text-primary" aria-hidden="true" /> Casos con faltantes
                </h2>
                {!p?.casosConFaltantes?.length ? (
                  <p className="text-sm text-tinta-2">Ningún caso tiene información faltante.</p>
                ) : (
                  <ul className="space-y-3">
                    {p.casosConFaltantes.map((c) => (
                      <li key={c.codigo} className="rounded-2xl border border-border bg-superficie p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Link to={`/casos/${c.codigo}`} className="font-bold text-foreground hover:text-primary">Partida {c.codigo}</Link>
                          <IndicadorA estado={c.estado} tamano="sm" conPrefijo={false} />
                        </div>
                        <p className="mt-1 text-xs text-tinta-2">Falta: {(c.faltantes ?? []).join(", ")}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section aria-labelledby="titulo-inspecciones" className={tarjeta}>
                <h2 id="titulo-inspecciones" className="mb-1 flex items-center gap-2 text-lg font-bold text-foreground">
                  <HardHat className="size-5 text-primary" aria-hidden="true" /> Inspecciones solicitadas o en curso
                </h2>
                <p className="mb-4 text-xs text-tinta-2">{p?.inspeccionesAsignadas ?? 0} asignadas · {p?.inspeccionesSinAsignar ?? 0} sin asignar. Se asignan desde el expediente.</p>
                {!p?.inspecciones?.length ? (
                  <p className="text-sm text-tinta-2">No hay inspecciones solicitadas ni en curso.</p>
                ) : (
                  <ul className="space-y-3">
                    {p.inspecciones.map((i) => (
                      <li key={i.codigo} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-superficie p-3">
                        <Link to={`/casos/${i.codigo}#evaluacion-tecnica`} className="font-bold text-foreground hover:text-primary">Partida {i.codigo}</Link>
                        <div className="flex flex-wrap gap-2">
                          <IndicadorB estado={i.estado} tamano="sm" conPrefijo={false} />
                          {i.asignada
                            ? <Badge tono="marca" icono={UserCheck} tamano="sm">{i.especialistaAsignadoCodigo}</Badge>
                            : <Badge tono="gris" icono={UserCheck} tamano="sm">Sin asignar</Badge>}
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

        <section aria-labelledby="titulo-lista">
          <h2 id="titulo-lista" className="mb-4 text-xl font-bold text-foreground">Casos de la cartera</h2>
          <form role="search" onSubmit={(e) => e.preventDefault()} aria-label="Filtrar los casos de la cartera"
            className="mb-6 grid gap-4 rounded-3xl border border-border bg-card p-5 shadow-tarjeta md:grid-cols-3">
            <div>
              <label htmlFor="c-q" className="mb-1.5 block text-xs font-bold text-tinta-2">Buscar por partida, distrito o nombre</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tinta-2" aria-hidden="true" />
                <input id="c-q" type="search" maxLength={40} className={`${campo} pl-9`} value={filtro.q}
                  onChange={(e) => setFiltro({ ...filtro, q: e.target.value })} />
              </div>
            </div>
            <div>
              <label htmlFor="c-color" className="mb-1.5 block text-xs font-bold text-tinta-2">Indicador A</label>
              <select id="c-color" className={campo} value={filtro.color}
                onChange={(e) => setFiltro({ ...filtro, color: e.target.value as FiltroCartera["color"] })}>
                <option value="">Todos los colores</option>
                {COLORES.map((c) => <option key={c} value={c}>{ESTADOS[c].nombre} · {ESTADOS[c].resumen}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="c-pub" className="mb-1.5 block text-xs font-bold text-tinta-2">Publicación</label>
              <select id="c-pub" className={campo} value={filtro.publicacion}
                onChange={(e) => setFiltro({ ...filtro, publicacion: e.target.value as FiltroCartera["publicacion"] })}>
                <option value="">Todos los estados</option>
                {ESTADOS_PUBLICACION.map((e) => <option key={e} value={e}>{ETIQUETA_PUBLICACION[e]}</option>)}
              </select>
            </div>
          </form>
          {casos.loading && !casos.data ? (
            <Cargando texto="Cargando los casos…" tarjetas={3} />
          ) : casos.error ? (
            <ErrorCarga mensaje={casos.error.message} alReintentar={casos.reload} />
          ) : visibles.length === 0 ? (
            <Vacio icono={FolderOpen} titulo={hayFiltro ? "Ningún caso cumple estos filtros" : "Todavía no hay casos en la cartera"}
              accion={hayFiltro ? <Button className="rounded-xl" onClick={() => setFiltro(FILTRO_CARTERA_VACIO)}><FunnelX aria-hidden="true" /> Limpiar filtros</Button> : undefined} />
          ) : (
            <ul className="grid grid-cols-1 gap-6 pb-12 sm:grid-cols-2 xl:grid-cols-3">
              {visibles.map((c) => <li key={c.codigo}><TarjetaPredio c={c} conPublicacion /></li>)}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
