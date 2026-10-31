import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  BookOpen, ChevronDown, ChevronRight, ClipboardCheck, ExternalLink, FileText, Info, LandPlot, ListChecks, MapPin,
  Ruler, Scale, ShieldCheck, Trash2, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EditorExpediente } from "@/components/EditorExpediente";
import { PanelPlanos } from "@/components/PanelPlanos";
import { PanelEvaluacionTecnica } from "@/components/PanelEvaluacionTecnica";
import { HistorialEvaluaciones } from "@/components/HistorialEvaluaciones";
import { PanelPublicacion } from "@/components/PanelPublicacion";
import { SolicitudContacto } from "@/components/SolicitudContacto";
import { IndicadorA, IndicadorB } from "@/components/base/Indicadores";
import { PredioImagen } from "@/components/base/PredioImagen";
import { Cargando, ErrorCarga } from "@/components/base/Estados";
import { Desplegable } from "@/components/base/Desplegable";
import { TituloSeccion } from "@/components/base/TituloSeccion";
import { m2, soles } from "@/lib/formato";
import { puedeVerHistorial } from "@/lib/permisos";
import { abrirPdf, api, patch } from "@/lib/api";
import { abrirExterno, CONOCE_AQUI, VISOR_BGR } from "@/lib/fuentes";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";
import { ESTADOS, ETIQUETA_ANOTACION, ETIQUETA_COMPLETITUD, ITEM, RUBROS, fecha } from "@/lib/semaforo";
import type { Asiento, DetalleCaso, EstadoItem, ItemChecklist, Termino } from "@/lib/types";

const OPCIONES_ITEM: EstadoItem[] = ["PENDIENTE", "REVISADO", "OBSERVADO"];

const SECCIONES: { id: string; etiqueta: string; Icono: LucideIcon }[] = [
  { id: "ex-semaforo", etiqueta: "Indicador A", Icono: ShieldCheck },
  { id: "ex-partida", etiqueta: "Partida", Icono: FileText },
  { id: "ex-planos", etiqueta: "Planos", Icono: Ruler },
  { id: "evaluacion-tecnica", etiqueta: "Indicador B", Icono: ClipboardCheck },
  { id: "ex-checklist", etiqueta: "Checklist", Icono: ListChecks },
];

const irA = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

const fechaCorta = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("es-PE");

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-superficie p-4">
      <dt className="mb-1 text-xs font-bold uppercase tracking-wider text-tinta-2">{titulo}</dt>
      <dd className="text-base font-semibold leading-snug text-foreground">{children}</dd>
    </div>
  );
}

function Glosario({ terminos }: { terminos: Termino[] }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const actual = terminos.find((t) => t.concepto === abierto) ?? null;
  return (
    <Card className="rounded-[2rem] border-border shadow-tarjeta">
      <CardContent className="space-y-5 p-6 sm:p-8">
        <TituloSeccion icono={BookOpen} descripcion="Selecciona un término para ver su explicación.">
          Glosario de este expediente
        </TituloSeccion>
        <ul className="flex flex-wrap gap-2.5">
          {terminos.map((t) => (
            <li key={t.concepto}>
              <button
                type="button"
                aria-expanded={abierto === t.concepto}
                aria-controls="panel-termino"
                onClick={() => setAbierto(abierto === t.concepto ? null : t.concepto)}
                className={`rounded-full border px-4 py-2 text-sm font-bold transition-all duration-300 ease-expo focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 active:scale-[0.97] ${
                  abierto === t.concepto
                    ? "border-primary bg-primary text-white shadow-md shadow-primary/25"
                    : "border-border bg-card text-foreground hover:-translate-y-0.5 hover:border-primary/50 hover:bg-secondary"
                }`}
              >
                {t.concepto}
              </button>
            </li>
          ))}
        </ul>
        <div id="panel-termino" role="region" aria-live="polite" aria-label="Explicación del término">
          {actual && (
            <div className="anim-enter rounded-2xl border border-primary/20 bg-secondary/50 p-5">
              <p className="mb-1 font-extrabold text-foreground">{actual.concepto}</p>
              <p className="leading-relaxed text-foreground">{actual.explicacion}</p>
              <p className="mt-3 text-xs font-semibold text-tinta-2">
                Glosario {actual.version} · {actual.estadoRevision}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TarjetaAsiento({ a }: { a: Asiento }) {
  const meta = [
    a.tituloNumero ? `Título archivado N.° ${a.tituloNumero}` : null,
    a.fechaPresentacion ? `presentado el ${fechaCorta(a.fechaPresentacion)}` : null,
    a.fechaInscripcion ? `inscrito el ${fechaCorta(a.fechaInscripcion)}` : null,
  ].filter(Boolean).join(" · ");
  const vigente = a.estado === "VIGENTE";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="font-black text-foreground">
          {a.referencia}
          <span className="font-bold text-tinta-2"> · {a.tipoActoEtiqueta}</span>
        </p>
        {a.rubro === "D" && a.estado && (
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              vigente ? "border-warning/40 bg-warning/10 text-sem-amarillo-tinta" : "border-border bg-superficie text-tinta-2"
            }`}
          >
            {ETIQUETA_ANOTACION[a.estado]}
          </span>
        )}
      </div>
      {a.titulares && <p className="mt-2 text-sm text-foreground"><strong>Titulares:</strong> {a.titulares}</p>}
      {a.canceloNumero && <p className="mt-2 text-sm font-semibold text-foreground">Cancela el asiento {a.canceloNumero}.</p>}
      {a.texto && <p className="mt-2 text-sm leading-relaxed text-foreground">{a.texto}</p>}
      {meta && <p className="mt-2 text-xs text-tinta-2">{meta}</p>}
    </div>
  );
}

function AsientosPorRubro({ asientos, parcial }: { asientos: Asiento[]; parcial: boolean }) {
  return (
    <div className="space-y-3">
      {Object.entries(RUBROS).map(([letra, nombre]) => {
        const delRubro = asientos.filter((a) => a.rubro === letra);
        const vacio = parcial && letra === "C" ? "No incluido en este extracto." : "No se representan asientos.";
        return (
          <details key={letra} open={letra !== "F"} className="group rounded-2xl border border-border bg-superficie transition-colors open:bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-4 font-bold text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-secondary text-sm font-black text-primary">{letra}</span>
                {nombre}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-tinta-2">
                  {delRubro.length === 0 ? "Sin asientos" : `${delRubro.length} asiento${delRubro.length === 1 ? "" : "s"}`}
                </span>
                <ChevronDown className="size-4 text-tinta-2 transition-transform duration-500 ease-expo group-open:rotate-180" aria-hidden="true" />
              </span>
            </summary>
            <div className="space-y-3 px-5 pb-5">
              {delRubro.length === 0
                ? <p className="text-sm text-tinta-2">{vacio}</p>
                : delRubro.map((a) => <TarjetaAsiento key={a.referencia} a={a} />)}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function FilaChecklist({ codigo, item, esRevisor, alCambiar }: {
  codigo: string; item: ItemChecklist; esRevisor: boolean; alCambiar: (i: ItemChecklist) => void;
}) {
  const [estado, setEstado] = useState<EstadoItem>(item.estado);
  const [observacion, setObservacion] = useState(item.observacion ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visual = ITEM[item.estado];
  const Icono = visual.Icono;
  const sinCambios = estado === item.estado && (observacion.trim() || null) === (item.observacion ?? null);

  const guardar = async () => {
    setError(null);
    setGuardando(true);
    try {
      alCambiar(await patch<ItemChecklist>(`/casos/${codigo}/checklist/${item.id}`, { estado, observacion: observacion.trim() || null }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <li className="rounded-2xl border border-border bg-superficie p-4 transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold leading-snug text-foreground">{item.nombre}</p>
        <span className={`inline-flex shrink-0 items-center gap-1.5 text-sm font-bold ${visual.texto}`}>
          <Icono className="size-4" aria-hidden="true" /> {visual.etiqueta}
        </span>
      </div>
      {item.observacion && <p className="mt-2 text-sm text-tinta-2">Observación: {item.observacion}</p>}

      {esRevisor && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <Desplegable
            etiqueta="Estado"
            valor={estado}
            opciones={OPCIONES_ITEM.map((o) => ({ valor: o, etiqueta: ITEM[o].etiqueta }))}
            alCambiar={(v) => setEstado(v as EstadoItem)}
          />
          <div>
            <label htmlFor={`obs-${item.id}`} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-tinta-2">Observación</label>
            <input
              id={`obs-${item.id}`}
              maxLength={255}
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-all duration-300 hover:border-primary/40 focus:border-primary focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
          {error && <p role="alert" className="text-sm font-semibold text-sem-rojo-tinta">{error}</p>}
          <Button size="sm" variant="outline" disabled={guardando || sinCambios} onClick={guardar}>
            {guardando ? "Guardando…" : "Guardar ítem"}
          </Button>
        </div>
      )}
    </li>
  );
}

export default function Expediente() {
  const { codigo = "" } = useParams();
  const { usuario } = useAuth();
  const esRevisor = usuario?.rol === "REVISOR";
  const { data: d, loading, error, setData, reload } = useApi<DetalleCaso>(codigo ? `/casos/${codigo}` : null);
  const [errorPdf, setErrorPdf] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);
  const navigate = useNavigate();

  if (loading) return <Cargando texto="Cargando expediente…" />;
  if (error || !d) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4 px-4 py-24 text-center">
        <ErrorCarga
          mensaje={error?.status === 404 ? "No encontramos este expediente en la cartera." : (error?.message ?? "No se pudo cargar el expediente.")}
          alReintentar={error?.status === 404 ? undefined : reload}
        />
        <Button asChild><Link to="/casos">Volver a la cartera</Link></Button>
      </div>
    );
  }

  const ev = d.evaluacion;
  const estilo = ev ? ESTADOS[ev.estado] : null;
  const IconoEstado = estilo?.Icono;
  const x = d.expediente;
  const p = d.predio;
  const transcrita = d.origen === "TRANSCRITA";
  const revisados = d.checklist.filter((i) => i.estado === "REVISADO").length;

  const eliminar = async () => {
    setErrorEliminar(null);
    try {
      await api<void>(`/casos/${d.codigo}`, { method: "DELETE" });
      navigate("/casos");
    } catch (e) {
      setErrorEliminar(e instanceof Error ? e.message : "No se pudo eliminar la partida");
    }
  };

  const verPdf = async () => {
    setErrorPdf(null);
    try {
      await abrirPdf(`/casos/${d.codigo}/documento`);
    } catch (e) {
      setErrorPdf(e instanceof Error ? e.message : "No se pudo abrir el documento");
    }
  };

  const reemplazarItem = (nuevo: ItemChecklist) =>
    setData({ ...d, checklist: d.checklist.map((i) => (i.id === nuevo.id ? nuevo : i)) });

  return (
    <div className="flex-1 bg-superficie pb-24">
      <section className="relative isolate overflow-hidden bg-foreground">
        <div className="absolute inset-0 -z-20 scale-125 opacity-30 blur-3xl" aria-hidden="true">
          <PredioImagen codigo={d.codigo} tipo={p.tipoInmueble} decorativa />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-foreground via-foreground/90 to-foreground/60" aria-hidden="true" />
        <div className="animate-glow pointer-events-none absolute -right-24 -top-24 -z-10 h-[380px] w-[520px] rounded-full bg-primary/30 blur-[110px]" aria-hidden="true" />

        <div className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-6 lg:px-8">
          <nav aria-label="Ruta" className="anim-enter mb-6 flex items-center text-sm font-medium text-gray-300">
            <Link to="/casos" className="transition-colors hover:text-white">Cartera de inmuebles</Link>
            <ChevronRight className="mx-1 size-4" aria-hidden="true" />
            <span className="font-bold text-white">Partida {d.codigo}</span>
          </nav>

          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12">
            <div
              style={{ "--d": "100ms" } as React.CSSProperties}
              className="anim-enter aspect-[16/10] overflow-hidden rounded-[2rem] border-4 border-white/90 bg-muted shadow-[0_35px_80px_-20px_rgba(0,0,0,0.55)]"
            >
              <PredioImagen codigo={d.codigo} tipo={p.tipoInmueble} />
            </div>

            <div style={{ "--d": "220ms" } as React.CSSProperties} className="anim-enter space-y-5">
              <div>
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-emerald-300 backdrop-blur-md">
                    <LandPlot className="size-4" aria-hidden="true" />{p.tipoInmuebleEtiqueta}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-gray-200 backdrop-blur-md">
                    <MapPin className="size-4" aria-hidden="true" />{p.distrito ?? d.contexto}, Ica
                  </span>
                </p>
                <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-white md:text-4xl">{d.denominacion}</h1>
                <p className="cifras mt-2 text-sm font-medium text-gray-300">Partida N.° {d.codigo}</p>
              </div>

              <div className="rounded-3xl border border-white/15 bg-white/10 p-5 text-white backdrop-blur-xl">
                {p.precioReferencial != null ? (
                  <>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Precio</p>
                    <p className="cifras text-4xl font-black tracking-tight">{soles(p.precioReferencial, true)}</p>
                    {p.precioNota && <p className="mt-1 text-xs text-gray-300">{p.precioNota}</p>}
                  </>
                ) : (
                  <p className="font-bold text-gray-200">Precio a consultar con la inmobiliaria.</p>
                )}
                <dl className="cifras mt-4 grid grid-cols-2 gap-4 border-t border-white/15 pt-4 text-sm">
                  <div>
                    <dt className="text-xs font-bold text-gray-300">Área del terreno</dt>
                    <dd className="font-bold">{p.areaM2 == null ? "No informada" : m2(p.areaM2)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-gray-300">Área construida inscrita</dt>
                    <dd className="font-bold">
                      {p.areaConstruidaInscrita == null ? (p.tipoInmueble === "LOTE_URBANO" ? "No aplica" : "No consta") : m2(p.areaConstruidaInscrita)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-3 rounded-3xl bg-card p-5 shadow-tarjeta">
                <p className="text-xs font-bold uppercase tracking-wider text-tinta-2">Indicadores del inmueble</p>
                <div className="flex flex-col items-start gap-2">
                  <IndicadorA estado={ev?.estado} conResumen />
                  <IndicadorB estado={d.evaluacionTecnica.estado} resultado={d.evaluacionTecnica.resultado} />
                </div>
                <p className="flex gap-2 text-xs font-semibold text-tinta-2">
                  <Info className="size-4 shrink-0" aria-hidden="true" />
                  El indicador B es independiente y no cambia el color del indicador A.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <nav aria-label="Secciones del expediente" className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
          {SECCIONES.map(({ id, etiqueta, Icono }) => (
            <button
              key={id}
              type="button"
              onClick={() => irA(id)}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-bold text-foreground transition-all duration-300 ease-expo hover:-translate-y-0.5 hover:border-primary/50 hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 active:scale-[0.97]"
            >
              <Icono className="size-4 text-primary" aria-hidden="true" /> {etiqueta}
            </button>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <div id="ex-semaforo" className="scroll-mt-28">
              {ev && estilo && IconoEstado ? (
                <Card className={`overflow-hidden rounded-[2rem] border-2 ${estilo.borde} shadow-tarjeta`}>
                  <div className={`${estilo.fondo} flex items-center gap-5 px-6 py-6 sm:px-8`}>
                    <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-card/70 shadow-sm">
                      <IconoEstado className={`size-9 ${estilo.texto}`} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-tinta-2">Indicador A · Pre-evaluación documental (automática)</p>
                      <h2 className={`text-2xl font-black tracking-tight sm:text-3xl ${estilo.texto}`}>{estilo.nombre}: {ev.etiqueta}</h2>
                    </div>
                  </div>
                  <CardContent className="space-y-7 p-6 sm:p-8">
                    <section aria-labelledby="motivos">
                      <h3 id="motivos" className="mb-3 font-extrabold text-foreground">Motivos</h3>
                      <ul className="space-y-2.5">
                        {ev.motivos.map((m, i) => (
                          <li key={i} className="flex gap-3 leading-relaxed text-foreground">
                            <span className="mt-2.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                            {m.texto}
                          </li>
                        ))}
                      </ul>
                    </section>

                    {ev.faltantes.length > 0 && (
                      <section aria-labelledby="faltantes">
                        <h3 id="faltantes" className="mb-3 font-extrabold text-foreground">Información que falta</h3>
                        <ul className="flex flex-wrap gap-2.5">
                          {ev.faltantes.map((f) => (
                            <li key={f} className="rounded-full border border-sem-gris/50 bg-muted px-4 py-1.5 text-sm font-bold text-foreground">{f}</li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {ev.alertas.length > 0 && (
                      <section aria-labelledby="alertas">
                        <h3 id="alertas" className="mb-3 font-extrabold text-foreground">Alertas conocidas</h3>
                        <ul className="space-y-3">
                          {ev.alertas.map((a, i) => (
                            <li
                              key={i}
                              className={`rounded-2xl border p-4 ${
                                a.prioridad === "PRIORITARIA" ? "border-danger/30 bg-danger/10" : "border-warning/40 bg-warning/10"
                              }`}
                            >
                              <p className="font-bold text-foreground">{a.titulo} · {a.referencia}</p>
                              <p className="mt-1 text-sm text-foreground">{a.explicacion}</p>
                              <p className="mt-2 text-xs font-semibold text-tinta-2">
                                Regla {a.regla} · {a.prioridad === "PRIORITARIA" ? "prioritaria" : "de revisión"}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    <div className="flex gap-3 rounded-2xl border border-border bg-superficie p-4">
                      <Info className="mt-0.5 size-5 shrink-0 text-tinta-2" aria-hidden="true" />
                      <div className="text-sm leading-relaxed text-tinta-2">
                        <p className="font-bold text-foreground">{ev.limite}</p>
                        <p className="mt-1">
                          Criterios {ev.versionReglas} (en revisión especializada). Calculado sobre la versión {ev.expedienteVersion} del expediente.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="rounded-[2rem] border-border shadow-tarjeta">
                  <CardContent className="p-8 font-semibold text-tinta-2">Este expediente todavía no tiene una evaluación.</CardContent>
                </Card>
              )}
            </div>

            <div id="ex-partida" className="scroll-mt-28 space-y-8">
              <Card className="rounded-[2rem] border-border shadow-tarjeta">
                <CardContent className="space-y-6 p-6 sm:p-8">
                  <TituloSeccion icono={FileText}>Partida registral</TituloSeccion>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Dato titulo="Zona y oficina registral">{x.zonaRegistral ?? "No informada"}{x.oficinaRegistral ? ` · ${x.oficinaRegistral}` : ""}</Dato>
                    <Dato titulo="Condición representada">{x.condicionRepresentada}</Dato>
                    <Dato titulo="Ubicación">{x.ubicacion ?? "No informada"}</Dato>
                    <Dato titulo="Área">{x.areaM2 == null ? "No informada" : `${x.areaM2.toFixed(2)} m²`}</Dato>
                    <Dato titulo="Linderos y medidas perimétricas">{x.linderos ?? "No informados"}</Dato>
                    <Dato titulo="Antecedente dominial">{x.antecedenteDominial ?? "No informado"}</Dato>
                    <Dato titulo="Titularidad (según el último asiento de títulos de dominio)">{x.titularidad}</Dato>
                    <Dato titulo="Completitud del extracto">{ETIQUETA_COMPLETITUD[x.completitud]}</Dato>
                    <Dato titulo="Fecha referencial">
                      {fecha(x.fechaReferencial)}
                      <span className="mt-0.5 block text-xs font-medium text-tinta-2">No es una consulta de actualidad oficial.</span>
                    </Dato>
                  </dl>
                  {x.nota && <p className="rounded-2xl border border-border bg-superficie p-4 text-sm text-tinta-2">{x.nota}</p>}
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border-border shadow-tarjeta">
                <CardContent className="space-y-5 p-6 sm:p-8">
                  <TituloSeccion icono={FileText} descripcion="Cada asiento lleva la letra de su rubro y un número. Abre o cierra un rubro con Enter.">
                    Asientos de la partida
                  </TituloSeccion>
                  <AsientosPorRubro asientos={x.asientos} parcial={x.completitud !== "COMPLETA"} />
                </CardContent>
              </Card>
            </div>

            <PanelPlanos detalle={d} esRevisor={esRevisor} alCambiar={setData} />

            <PanelEvaluacionTecnica detalle={d} alCambiar={setData} />

            {d.publicacion && (
              <SolicitudContacto codigo={d.codigo} denominacion={d.denominacion} estadoPublicacion={d.publicacion.estado} />
            )}

            {puedeVerHistorial(usuario?.rol) && (
              <HistorialEvaluaciones key={ev?.calculadaEn ?? "sin-evaluacion"} codigo={d.codigo} />
            )}

            {d.terminos.length > 0 && <Glosario terminos={d.terminos} />}

            {esRevisor && <EditorExpediente detalle={d} alGuardar={setData} />}
          </div>

          <aside className="space-y-6">
            {d.publicacion && <PanelPublicacion codigo={d.codigo} publicacion={d.publicacion} alCambiar={setData} />}

            <div className="flex gap-3 rounded-[2rem] border border-info-tinta/20 bg-info-suave p-6 text-sm font-semibold text-info-tinta">
              <Scale className="size-5 shrink-0" aria-hidden="true" />
              <p>Siguiente paso: verificación jurídica con abogado o notario, fuera del sistema.</p>
            </div>

            <div id="ex-checklist" className="scroll-mt-28">
              <Card className="rounded-[2rem] border-border shadow-tarjeta">
                <CardContent className="space-y-5 p-6 sm:p-8">
                  <TituloSeccion icono={ListChecks}>Checklist</TituloSeccion>
                  {d.checklist.length > 0 && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-tinta-2">
                        <span>Ítems revisados</span>
                        <span className="cifras text-foreground">{revisados} de {d.checklist.length}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-700 ease-expo"
                          style={{ width: `${(revisados / d.checklist.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-xs leading-relaxed text-tinta-2">
                    «Revisado» indica que el documento se revisó en la plataforma. No acredita validez jurídica.
                  </p>
                  <ul className="space-y-3">
                    {d.checklist.map((i) => (
                      <FilaChecklist
                        key={`${i.id}-${i.estado}-${i.observacion ?? ""}`}
                        codigo={d.codigo}
                        item={i}
                        esRevisor={esRevisor}
                        alCambiar={reemplazarItem}
                      />
                    ))}
                  </ul>
                  {!esRevisor && <p className="text-xs text-tinta-2">Solo el revisor puede cambiar el estado de los ítems.</p>}
                </CardContent>
              </Card>
            </div>

            {d.fuente && (
              <Card className="rounded-[2rem] border-border shadow-tarjeta">
                <CardContent className="space-y-4 p-6 sm:p-8">
                  <TituloSeccion icono={Info}>Fuente</TituloSeccion>
                  {transcrita ? (
                    <>
                      <p className="text-sm leading-relaxed text-tinta-2">
                        Transcrita de {d.fuente}{d.fechaConsulta ? `, consultada el ${fecha(d.fechaConsulta)}` : ""}.
                        No incluye nombres, DNI ni domicilios de personas naturales. Para la copia literal certificada o los
                        planos del título archivado, solicítalos en SUNARP (tienen costo).
                      </p>
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full" onClick={() => abrirExterno(CONOCE_AQUI)}>
                          Ver en Conoce Aquí <ExternalLink aria-hidden="true" />
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => abrirExterno(VISOR_BGR)}>
                          Ver el plano en el Visor BGR <ExternalLink aria-hidden="true" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm leading-relaxed text-tinta-2">{d.fuente}: no corresponde a una partida real.</p>
                  )}
                  {esRevisor && (
                    <div className="border-t border-border pt-5">
                      {!confirmando ? (
                        <Button variant="ghost" className="text-sem-rojo-tinta hover:bg-danger/10 hover:text-sem-rojo-tinta" onClick={() => setConfirmando(true)}>
                          <Trash2 aria-hidden="true" /> {transcrita ? "Eliminar partida transcrita" : "Eliminar partida simulada"}
                        </Button>
                      ) : (
                        <div role="alertdialog" aria-labelledby="eliminar-titulo" className="anim-enter rounded-2xl border border-danger/30 bg-danger/10 p-4">
                          <p id="eliminar-titulo" className="mb-1 font-bold text-sem-rojo-tinta">¿Eliminar la partida {d.codigo}?</p>
                          <p className="mb-3 text-sm text-foreground">Se borran su expediente, su checklist, su evaluación y su documento. No se puede deshacer.</p>
                          <div className="flex gap-2">
                            <Button variant="destructive" onClick={eliminar}>Sí, eliminar</Button>
                            <Button variant="outline" onClick={() => { setConfirmando(false); setErrorEliminar(null); }}>Cancelar</Button>
                          </div>
                          {errorEliminar && <p role="alert" className="mt-3 text-sm font-semibold text-sem-rojo-tinta">{errorEliminar}</p>}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="rounded-[2rem] border-border shadow-tarjeta">
              <CardContent className="space-y-4 p-6 sm:p-8">
                <TituloSeccion icono={FileText}>Documento del expediente</TituloSeccion>
                {x.tieneDocumento ? (
                  <>
                    <p className="text-sm leading-relaxed text-tinta-2">
                      {x.documentoGenerado
                        ? (transcrita
                          ? "Transcripción referencial generada a partir de la partida. No es publicidad registral ni tiene valor legal."
                          : "Copia literal generada a partir de la partida. Es referencial y no tiene valor legal.")
                        : "PDF subido por el revisor. No tiene valor legal."}
                    </p>
                    <Button variant="outline" className="w-full" onClick={verPdf}>
                      Abrir documento <ExternalLink aria-hidden="true" />
                    </Button>
                    {errorPdf && <p role="alert" className="text-sm font-semibold text-sem-rojo-tinta">{errorPdf}</p>}
                  </>
                ) : (
                  <p className="text-sm text-tinta-2">Este expediente no tiene un documento asociado.</p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}