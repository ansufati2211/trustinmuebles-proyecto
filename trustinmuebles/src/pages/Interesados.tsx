import { useState } from "react";
import { Link } from "react-router";
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Mail, Phone, Trash2, Users } from "lucide-react";
import { BandejaContactos } from "@/pages/Cartera";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/base/Modal";
import { Campo, claseAreaTexto, claseCampo } from "@/components/base/Campo";
import { Cargando, ErrorCarga, Vacio } from "@/components/base/Estados";
import { Mensaje } from "@/components/base/Mensaje";
import { api, post, put } from "@/lib/api";
import {
  ETAPAS, FRANJAS, estadoSugerido, etiquetaEtapa, fechaCorta, fechaLarga, hoyLima, rutaInteresados, sumarDias,
  textoPresupuesto, type Agenda, type Cita, type EtapaInteres, type FranjaCita, type Interesado,
  type InteresadoDetalle, type OpcionesBandeja, type ResumenDemanda,
} from "@/lib/interes";
import { enlaceProyecto } from "@/lib/proyectos";
import { fecha } from "@/lib/semaforo";
import { useApi } from "@/lib/useApi";

const tarjeta = "rounded-[2rem] border border-border bg-card p-6 shadow-tarjeta";
type Pestana = "bandeja" | "agenda" | "demanda";

/**
 * v1.0 (etapa 4): «Interesados» del asesor y del gestor. Bandeja tipo CRM con filtros por etapa, proyecto y
 * responsable (los vencidos primero y resaltados), el detalle de cada interesado (etapa, seguimiento, notas, citas y
 * marcar el lote), la agenda semanal de citas y el resumen de la demanda. Al final siguen las solicitudes de contacto
 * de los compradores con cuenta (v0.7), igual que en Cartera.
 */
export default function Interesados() {
  const [pestana, setPestana] = useState<Pestana>("bandeja");
  const pestanas: { clave: Pestana; etiqueta: string }[] = [
    { clave: "bandeja", etiqueta: "Interesados" },
    { clave: "agenda", etiqueta: "Agenda de citas" },
    { clave: "demanda", etiqueta: "Demanda" },
  ];
  return (
    <div className="flex w-full flex-1 flex-col bg-superficie pb-24">
      <section className="relative isolate overflow-hidden bg-foreground">
        <div className="animate-glow pointer-events-none absolute -left-20 -top-24 -z-10 h-[340px] w-[480px] rounded-full bg-primary/30 blur-[100px]" aria-hidden="true" />
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-32 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Interesados</h1>
          <p className="mt-3 max-w-2xl text-gray-300">
            Personas que consultaron por un lote, un inmueble o un proyecto, sus citas y el seguimiento de cada una.
          </p>
          <div role="tablist" aria-label="Secciones" className="mt-8 flex flex-wrap gap-2">
            {pestanas.map((p) => (
              <button key={p.clave} role="tab" type="button" aria-selected={pestana === p.clave} onClick={() => setPestana(p.clave)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${pestana === p.clave ? "bg-white text-foreground" : "bg-white/10 text-white hover:bg-white/20"}`}>
                {p.etiqueta}
              </button>
            ))}
          </div>
        </div>
      </section>
      <div className="mx-auto w-full max-w-6xl space-y-10 px-4 pt-10 sm:px-6 lg:px-8">
        {pestana === "bandeja" && <Bandeja />}
        {pestana === "agenda" && <AgendaSemanal />}
        {pestana === "demanda" && <Demanda />}
        {pestana === "bandeja" && (
          <section aria-labelledby="titulo-contactos" className="space-y-4">
            <h2 id="titulo-contactos" className="text-xl font-bold text-foreground">Solicitudes de compradores con cuenta</h2>
            <BandejaContactos alCambiar={() => undefined} />
          </section>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------- bandeja

function Bandeja() {
  const [filtro, setFiltro] = useState({ etapa: "", proyecto: "", responsable: "", vencidos: false });
  const { data, loading, error, reload } = useApi<Interesado[]>(rutaInteresados(filtro));
  const { data: opciones } = useApi<OpcionesBandeja>("/interesados/opciones");
  const [abierto, setAbierto] = useState<number | null>(null);

  return (
    <section aria-labelledby="titulo-bandeja" className="space-y-5">
      <h2 id="titulo-bandeja" className="sr-only">Bandeja de interesados</h2>
      <div className={`${tarjeta} grid gap-4 !p-5 sm:grid-cols-2 lg:grid-cols-4`}>
        <Campo etiqueta="Etapa">
          {(p) => <select {...p} className={claseCampo} value={filtro.etapa} onChange={(e) => setFiltro({ ...filtro, etapa: e.target.value })}>
            <option value="">Todas</option>
            {ETAPAS.map((x) => <option key={x.valor} value={x.valor}>{x.etiqueta}</option>)}
          </select>}
        </Campo>
        <Campo etiqueta="Proyecto">
          {(p) => <select {...p} className={claseCampo} value={filtro.proyecto} onChange={(e) => setFiltro({ ...filtro, proyecto: e.target.value })}>
            <option value="">Todos</option>
            {opciones?.proyectos.map((x) => <option key={x.codigo} value={x.codigo}>{x.nombre}</option>)}
          </select>}
        </Campo>
        <Campo etiqueta="Responsable">
          {(p) => <select {...p} className={claseCampo} value={filtro.responsable} onChange={(e) => setFiltro({ ...filtro, responsable: e.target.value })}>
            <option value="">Todos</option>
            <option value="SIN_ASIGNAR">Sin asignar</option>
            {opciones?.responsables.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>}
        </Campo>
        <label className="flex items-end gap-2 pb-3 text-sm font-semibold text-foreground">
          <input type="checkbox" className="size-4 accent-primary" checked={filtro.vencidos}
            onChange={(e) => setFiltro({ ...filtro, vencidos: e.target.checked })} />
          Solo con acción vencida
        </label>
      </div>

      {loading && !data ? <Cargando texto="Cargando interesados…" /> : error ? (
        <ErrorCarga mensaje={error.message} alReintentar={reload} />
      ) : !data || data.length === 0 ? (
        <Vacio icono={Users} titulo="No hay interesados con estos filtros" />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2" aria-label={`${data.length} interesados`}>
          {data.map((i) => <FilaInteresado key={i.id} i={i} abrir={() => setAbierto(i.id)} />)}
        </ul>
      )}
      {abierto !== null && (
        <DetalleInteresado id={abierto} opciones={opciones} alCerrar={() => setAbierto(null)} alCambiar={reload} />
      )}
    </section>
  );
}

function FilaInteresado({ i, abrir }: { i: Interesado; abrir: () => void }) {
  return (
    <li>
      <button type="button" onClick={abrir} data-vencido={i.vencido || undefined}
        className={`w-full rounded-2xl border bg-card p-5 text-left shadow-tarjeta transition-colors hover:border-primary/50 ${i.vencido ? "border-sem-rojo/60 ring-2 ring-sem-rojo/15" : "border-border"}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-lg font-extrabold text-foreground">{i.nombre}</p>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-foreground">{i.etapaEtiqueta}</span>
        </div>
        <p className="mt-1 text-sm text-tinta-2">{i.inmueble ?? `Búsqueda: ${[i.tipo === "VIVIENDA" ? "vivienda" : i.tipo === "LOTE" ? "lote" : null, i.zona].filter(Boolean).join(" en ") || "sin detalle"}`}</p>
        <p className="mt-2 text-xs font-semibold text-tinta-2">
          {textoPresupuesto(i)} · {i.formaPagoEtiqueta} · {i.responsable ?? "sin responsable"}
        </p>
        {i.proximaAccion && (
          <p className={`mt-2 flex items-center gap-1.5 text-sm font-semibold ${i.vencido ? "text-sem-rojo-tinta" : "text-foreground"}`}>
            {i.vencido && <AlertTriangle className="size-4" aria-hidden="true" />}
            {i.vencido ? "Vencida: " : "Próxima: "}{i.proximaAccion}{i.proximaAccionFecha && ` · ${fechaCorta(i.proximaAccionFecha)}`}
          </p>
        )}
        {i.citaPorConfirmar && <p className="mt-2 text-xs font-bold text-primary">Tiene una cita por confirmar</p>}
      </button>
    </li>
  );
}

// ------------------------------------------------------------------------------------------------- detalle

function DetalleInteresado({ id, opciones, alCerrar, alCambiar }: {
  id: number; opciones: OpcionesBandeja | null; alCerrar: () => void; alCambiar: () => void;
}) {
  const { data: d, loading, error, reload, setData } = useApi<InteresadoDetalle>(`/interesados/${id}`);
  const [mensaje, setMensaje] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);
  const [nota, setNota] = useState("");
  const [seg, setSeg] = useState<{ responsable: string; proximaAccion: string; proximaAccionFecha: string } | null>(null);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const accion = async (fn: () => Promise<unknown>, ok: string, recargar = true) => {
    setMensaje(null);
    setOcupado(true);
    try {
      const r = await fn();
      if (r && typeof r === "object" && "interes" in (r as object)) setData(r as InteresadoDetalle);
      else if (recargar) reload();
      setMensaje({ tono: "ok", texto: ok });
      alCambiar();
      return true;
    } catch (e) {
      setMensaje({ tono: "error", texto: e instanceof Error ? e.message : "No se pudo guardar" });
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const i = d?.interes;
  const s = seg ?? { responsable: i?.responsable ?? "", proximaAccion: i?.proximaAccion ?? "", proximaAccionFecha: i?.proximaAccionFecha ?? "" };

  return (
    <Modal abierto ancho="xl" alCerrar={alCerrar} titulo={i ? i.nombre : "Interesado"}
      descripcion={i ? `${i.inmueble ?? "Búsqueda general"}${i.referencia ? ` · ref. ${i.referencia}` : ""}` : undefined}>
      {loading && !d ? <Cargando texto="Cargando…" /> : error || !d || !i ? (
        <ErrorCarga mensaje={error?.message ?? "Sin datos"} alReintentar={reload} />
      ) : (
        <div className="space-y-6">
          {mensaje && <Mensaje tono={mensaje.tono}>{mensaje.texto}</Mensaje>}

          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              {i.medio === "CORREO" ? <Mail className="size-4 text-primary" aria-hidden="true" /> : <Phone className="size-4 text-primary" aria-hidden="true" />}
              <a className="hover:underline" href={i.medio === "CORREO" ? `mailto:${i.contacto}` : `tel:+51${i.contacto}`}>{i.contacto}</a>
            </p>
            <p className="text-tinta-2">Registrado el {fecha(i.creadoEn)} · consentimiento {d.consentimientoVersion}</p>
            <p className="text-tinta-2">Busca: {[i.tipo === "VIVIENDA" ? "vivienda" : i.tipo === "LOTE" ? "lote" : null, i.zona, i.areaDeseada ? `${i.areaDeseada} m²` : null].filter(Boolean).join(" · ") || "sin detalle"}</p>
            <p className="text-tinta-2">{textoPresupuesto(i)} · {i.formaPagoEtiqueta}</p>
            {i.proyectoCodigo && (
              <p><Link className="font-bold text-primary hover:underline" to={enlaceProyecto(i.proyectoCodigo)}>Ver el proyecto</Link></p>
            )}
            {d.mensaje && <p className="rounded-xl border border-border bg-superficie p-3 text-foreground sm:col-span-2">«{d.mensaje}»</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <Campo etiqueta="Etapa">
              {(p) => <select {...p} className={claseCampo} value={i.etapa} disabled={ocupado}
                onChange={(e) => void accion(() => put(`/interesados/${id}/etapa`, { etapa: e.target.value as EtapaInteres }),
                  `Etapa cambiada a ${etiquetaEtapa(e.target.value as EtapaInteres)}.`)}>
                {ETAPAS.map((x) => <option key={x.valor} value={x.valor}>{x.etiqueta}</option>)}
              </select>}
            </Campo>
            {d.puedeMarcarLote && (
              <div className="flex flex-wrap gap-2">
                {(["SEPARADO", "VENDIDO"] as const).map((estado) => (
                  <Button key={estado} variant={estado === estadoSugerido(i.etapa) ? "default" : "outline"} disabled={ocupado}
                    onClick={() => void accion(() => put(`/interesados/${id}/estado-lote`, { estado }),
                      `${i.referencia} quedó como ${estado === "SEPARADO" ? "separado" : "vendido"}.`)}>
                    Marcar el lote {estado === "SEPARADO" ? "separado" : "vendido"}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <fieldset className="grid gap-4 rounded-2xl border border-border p-4 sm:grid-cols-3">
            <legend className="px-2 text-sm font-bold text-foreground">Seguimiento</legend>
            <Campo etiqueta="Responsable">
              {(p) => <select {...p} className={claseCampo} value={s.responsable} onChange={(e) => setSeg({ ...s, responsable: e.target.value })}>
                <option value="">Sin asignar</option>
                {opciones?.responsables.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>}
            </Campo>
            <Campo etiqueta="Próxima acción">
              {(p) => <input {...p} className={claseCampo} maxLength={160} value={s.proximaAccion} onChange={(e) => setSeg({ ...s, proximaAccion: e.target.value })} />}
            </Campo>
            <Campo etiqueta="Fecha">
              {(p) => <input {...p} type="date" className={claseCampo} value={s.proximaAccionFecha} onChange={(e) => setSeg({ ...s, proximaAccionFecha: e.target.value })} />}
            </Campo>
            <div className="sm:col-span-3">
              <Button variant="outline" disabled={ocupado || seg === null}
                onClick={() => void accion(() => put(`/interesados/${id}/seguimiento`, s), "Seguimiento guardado.").then((ok) => ok && setSeg(null))}>
                Guardar seguimiento
              </Button>
            </div>
          </fieldset>

          {d.citas.length > 0 && (
            <section aria-labelledby="titulo-citas" className="space-y-3">
              <h3 id="titulo-citas" className="font-bold text-foreground">Citas</h3>
              {d.citas.map((c) => <GestionCita key={c.id} c={c} ocupado={ocupado} accion={accion} />)}
            </section>
          )}

          <section aria-labelledby="titulo-notas" className="space-y-3">
            <h3 id="titulo-notas" className="font-bold text-foreground">Notas</h3>
            {d.notas.length === 0 ? <p className="text-sm text-tinta-2">Todavía no hay notas.</p> : (
              <ol className="space-y-2">
                {d.notas.map((n) => (
                  <li key={n.id} className="rounded-xl border border-border bg-superficie px-4 py-2.5 text-sm">
                    <p className="text-foreground">{n.texto}</p>
                    <p className="mt-1 text-xs text-tinta-2">{n.cuentaCodigo} · {fecha(n.creadaEn)}</p>
                  </li>
                ))}
              </ol>
            )}
            <Campo etiqueta="Nueva nota" ayuda="Las notas solo se agregan; no se editan ni se borran.">
              {(p) => <textarea {...p} className={claseAreaTexto} maxLength={1000} value={nota} onChange={(e) => setNota(e.target.value)} />}
            </Campo>
            <Button variant="outline" disabled={ocupado || !nota.trim()}
              onClick={() => void accion(() => post(`/interesados/${id}/notas`, { texto: nota }), "Nota agregada.").then((ok) => ok && setNota(""))}>
              Agregar nota
            </Button>
          </section>

          <div className="border-t border-border pt-4">
            {!confirmarBorrado ? (
              <Button variant="outline" onClick={() => setConfirmarBorrado(true)}>
                <Trash2 aria-hidden="true" /> Eliminar registro a pedido del interesado
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold text-sem-rojo-tinta">Se borran sus datos, sus notas y sus citas. No se puede deshacer.</p>
                <Button variant="outline" onClick={() => setConfirmarBorrado(false)}>Cancelar</Button>
                <Button disabled={ocupado} onClick={async () => {
                  const ok = await accion(() => api(`/interesados/${id}`, { method: "DELETE" }), "Registro eliminado.", false);
                  if (ok) alCerrar();
                }}>Eliminar</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function GestionCita({ c, ocupado, accion }: {
  c: Cita; ocupado: boolean; accion: (fn: () => Promise<unknown>, ok: string) => Promise<boolean>;
}) {
  const [modo, setModo] = useState<"reprogramar" | "rechazar" | null>(null);
  const [fechaNueva, setFechaNueva] = useState("");
  const [franja, setFranja] = useState<FranjaCita>("MANANA");
  const [motivo, setMotivo] = useState("");
  const hoy = hoyLima();
  const activa = c.estado !== "RECHAZADA";

  return (
    <div className="space-y-3 rounded-2xl border border-border p-4 text-sm" data-cita={c.id}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-foreground">{c.modalidadEtiqueta}</p>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">{c.estadoEtiqueta}</span>
      </div>
      {c.fechaAcordada ? (
        <p className="text-foreground">Acordada: {fechaLarga(c.fechaAcordada)}, {c.franjaAcordadaEtiqueta?.toLowerCase()}</p>
      ) : c.estado === "RECHAZADA" ? (
        <p className="text-tinta-2">Motivo: {c.motivoRechazo}</p>
      ) : null}
      {c.estado === "SOLICITADA" && (
        <div className="flex flex-wrap gap-2">
          {c.opciones.map((o) => (
            <Button key={o.opcion} size="sm" disabled={ocupado || o.fecha < hoy}
              onClick={() => void accion(() => put(`/citas/${c.id}/confirmacion`, { opcion: o.opcion }), "Cita confirmada.")}>
              Confirmar {fechaCorta(o.fecha)} · {o.franjaEtiqueta.toLowerCase()}
            </Button>
          ))}
        </div>
      )}
      {activa && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setModo(modo === "reprogramar" ? null : "reprogramar")}>Reprogramar</Button>
          <Button size="sm" variant="outline" onClick={() => setModo(modo === "rechazar" ? null : "rechazar")}>Rechazar</Button>
        </div>
      )}
      {modo === "reprogramar" && (
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Campo etiqueta="Nueva fecha">
            {(p) => <input {...p} type="date" min={hoy} className={claseCampo} value={fechaNueva} onChange={(e) => setFechaNueva(e.target.value)} />}
          </Campo>
          <Campo etiqueta="Franja">
            {(p) => <select {...p} className={claseCampo} value={franja} onChange={(e) => setFranja(e.target.value as FranjaCita)}>
              {FRANJAS.map((x) => <option key={x.valor} value={x.valor}>{x.etiqueta}</option>)}
            </select>}
          </Campo>
          <Button disabled={ocupado || !fechaNueva}
            onClick={() => void accion(() => put(`/citas/${c.id}/reprogramacion`, { fecha: fechaNueva, franja }), "Cita reprogramada.").then((ok) => ok && setModo(null))}>
            Guardar
          </Button>
        </div>
      )}
      {modo === "rechazar" && (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Campo etiqueta="Motivo del rechazo">
            {(p) => <input {...p} maxLength={300} className={claseCampo} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
          </Campo>
          <Button disabled={ocupado || motivo.trim().length < 3}
            onClick={() => void accion(() => put(`/citas/${c.id}/rechazo`, { motivo }), "Cita rechazada.").then((ok) => ok && setModo(null))}>
            Rechazar
          </Button>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------- agenda

function AgendaSemanal() {
  const [desde, setDesde] = useState(hoyLima());
  const { data, loading, error, reload } = useApi<Agenda>(`/citas/agenda?desde=${desde}`);
  return (
    <section aria-labelledby="titulo-agenda" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-agenda" className="flex items-center gap-2 text-xl font-bold text-foreground">
          <CalendarDays className="size-5 text-primary" aria-hidden="true" /> Semana del {fechaCorta(desde)}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setDesde(sumarDias(desde, -7))}><ChevronLeft aria-hidden="true" /> Anterior</Button>
          <Button variant="outline" size="sm" onClick={() => setDesde(hoyLima())}>Hoy</Button>
          <Button variant="outline" size="sm" onClick={() => setDesde(sumarDias(desde, 7))}>Siguiente <ChevronRight aria-hidden="true" /></Button>
        </div>
      </div>
      {loading && !data ? <Cargando texto="Cargando agenda…" /> : error || !data ? (
        <ErrorCarga mensaje={error?.message ?? "Sin datos"} alReintentar={reload} />
      ) : (
        <ol className="space-y-4">
          {data.dias.map((dia) => (
            <li key={dia.fecha} className={`${tarjeta} !p-5`}>
              <h3 className="font-bold capitalize text-foreground">{fechaLarga(dia.fecha)}</h3>
              {dia.citas.length === 0 ? <p className="mt-1 text-sm text-tinta-2">Sin citas.</p> : (
                <ul className="mt-3 space-y-2">
                  {dia.citas.map((x) => (
                    <li key={`${x.cita.id}-${x.opcion ?? 0}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-superficie px-4 py-2.5 text-sm">
                      <span className="font-semibold text-foreground">
                        {x.franjaEtiqueta} · {x.cita.modalidadEtiqueta} · {x.cita.nombre}
                        <span className="font-normal text-tinta-2"> — {x.cita.inmueble ?? "consulta general"}</span>
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${x.porConfirmar ? "bg-amber-100 text-amber-900" : "bg-secondary text-foreground"}`}>
                        {x.porConfirmar ? `Por confirmar (opción ${x.opcion})` : x.cita.estadoEtiqueta}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ------------------------------------------------------------------------------------------------- demanda

function Demanda() {
  const { data, loading, error, reload } = useApi<ResumenDemanda>("/interesados/resumen");
  if (loading && !data) return <Cargando texto="Cargando resumen…" />;
  if (error || !data) return <ErrorCarga mensaje={error?.message ?? "Sin datos"} alReintentar={reload} />;
  const bloques = [
    { titulo: "Por zona", filas: data.porZona },
    { titulo: "Por tipo", filas: data.porTipo },
    { titulo: "Por presupuesto", filas: data.porPresupuesto },
    { titulo: "Por proyecto", filas: data.porProyecto },
  ];
  return (
    <section aria-labelledby="titulo-demanda" className="space-y-5">
      <div>
        <h2 id="titulo-demanda" className="text-xl font-bold text-foreground">Demanda de {data.activos} interesados activos</h2>
        <p className="mt-1 text-sm text-tinta-2">Sin contar los descartados. Es informativa: ayuda a decidir qué ofrecer y dónde.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {bloques.map((b) => (
          <div key={b.titulo} className={`${tarjeta} !p-5`}>
            <h3 className="font-bold text-foreground">{b.titulo}</h3>
            {b.filas.length === 0 ? <p className="mt-2 text-sm text-tinta-2">Sin datos.</p> : (
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {b.filas.map((f) => (
                    <tr key={f.clave} className="border-t border-border first:border-t-0">
                      <th scope="row" className="py-2 text-left font-semibold text-foreground">{f.etiqueta}</th>
                      <td className="cifras py-2 text-right font-bold text-foreground">{f.interesados}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
