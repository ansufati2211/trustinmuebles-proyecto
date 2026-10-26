import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EditorExpediente } from "@/components/EditorExpediente";
import { PanelPlanos } from "@/components/PanelPlanos";
import { PanelEvaluacionTecnica } from "@/components/PanelEvaluacionTecnica";
import { IndicadorA, IndicadorB } from "@/components/base/Indicadores";
import { PredioImagen } from "@/components/base/PredioImagen";
import { Cargando, ErrorCarga } from "@/components/base/Estados";
import { m2, soles } from "@/lib/formato";
import { BookOpen, ChevronRight, ExternalLink, FileText, Info, LandPlot, ListChecks, MapPin, Scale, Trash2 } from "lucide-react";
import { HistorialEvaluaciones } from "@/components/HistorialEvaluaciones";
import { PanelPublicacion } from "@/components/PanelPublicacion";
import { SolicitudContacto } from "@/components/SolicitudContacto";
import { puedeVerHistorial } from "@/lib/permisos";
import { abrirPdf, api, patch } from "@/lib/api";
import { abrirExterno, CONOCE_AQUI, VISOR_BGR } from "@/lib/fuentes";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";
import { ESTADOS, ETIQUETA_ANOTACION, ETIQUETA_COMPLETITUD, ITEM, RUBROS, fecha } from "@/lib/semaforo";
import type { Asiento, DetalleCaso, EstadoItem, ItemChecklist, Termino } from "@/lib/types";

const OPCIONES_ITEM: EstadoItem[] = ["PENDIENTE", "REVISADO", "OBSERVADO"];

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-tinta-2 mb-1">{titulo}</dt>
      <dd className="text-base font-semibold text-foreground">{children}</dd>
    </div>
  );
}

/** Glosario por selección: botones con aria-expanded, utilizables con teclado (REQ-NF01). */
function Glosario({ terminos }: { terminos: Termino[] }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const actual = terminos.find((t) => t.concepto === abierto) ?? null;
  return (
    <Card className="rounded-3xl border-border shadow-tarjeta">
      <CardContent className="p-8">
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground mb-2">
          <BookOpen className="w-5 h-5 text-primary" aria-hidden="true" /> Glosario de este expediente
        </h2>
        <p className="text-sm text-tinta-2 mb-5">Selecciona un término para ver su explicación.</p>
        <ul className="flex flex-wrap gap-2.5">
          {terminos.map((t) => (
            <li key={t.concepto}>
              <button
                type="button"
                aria-expanded={abierto === t.concepto}
                aria-controls="panel-termino"
                onClick={() => setAbierto(abierto === t.concepto ? null : t.concepto)}
                className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                  abierto === t.concepto
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
                }`}
              >
                {t.concepto}
              </button>
            </li>
          ))}
        </ul>
        <div id="panel-termino" role="region" aria-live="polite" aria-label="Explicación del término" className="mt-5">
          {actual && (
            <div className="rounded-2xl border border-primary/20 bg-secondary/40 p-5">
              <p className="font-bold text-foreground mb-1">{actual.concepto}</p>
              <p className="text-foreground leading-relaxed">{actual.explicacion}</p>
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

const fechaCorta = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("es-PE");

function TarjetaAsiento({ a }: { a: Asiento }) {
  const meta = [
    a.tituloNumero ? `Título archivado N.° ${a.tituloNumero}` : null,
    a.fechaPresentacion ? `presentado el ${fechaCorta(a.fechaPresentacion)}` : null,
    a.fechaInscripcion ? `inscrito el ${fechaCorta(a.fechaInscripcion)}` : null,
  ].filter(Boolean).join(" · ");
  const vigente = a.estado === "VIGENTE";
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-black text-foreground">{a.referencia}<span className="font-bold"> · {a.tipoActoEtiqueta}</span></p>
        {a.rubro === "D" && a.estado && (
          <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
            vigente ? "border-warning/40 bg-warning/10 text-sem-amarillo-tinta" : "border-border bg-superficie text-tinta-2"}`}>
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

/** Asientos agrupados por rubro, en paneles que se abren con teclado (details/summary). */
function AsientosPorRubro({ asientos, parcial }: { asientos: Asiento[]; parcial: boolean }) {
  return (
    <div className="space-y-4">
      {Object.entries(RUBROS).map(([letra, nombre]) => {
        const delRubro = asientos.filter((a) => a.rubro === letra);
        const vacio = parcial && letra === "C" ? "No incluido en este extracto." : "No se representan asientos.";
        return (
          <details key={letra} open={letra !== "F"} className="rounded-2xl border border-border bg-superficie">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-4 font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
              <span>{nombre}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-tinta-2">
                {delRubro.length === 0 ? "Sin asientos" : `${delRubro.length} asiento${delRubro.length === 1 ? "" : "s"}`}
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
    <li className="rounded-2xl border border-border bg-superficie p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold text-foreground">{item.nombre}</p>
        <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${visual.texto}`}>
          <Icono className="w-4 h-4" aria-hidden="true" /> {visual.etiqueta}
        </span>
      </div>
      {item.observacion && <p className="mt-2 text-sm text-tinta-2">Observación: {item.observacion}</p>}

      {esRevisor && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`estado-${item.id}`} className="block text-xs font-bold text-tinta-2 mb-1">Estado</label>
              <select id={`estado-${item.id}`} value={estado} onChange={(e) => setEstado(e.target.value as EstadoItem)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm font-semibold">
                {OPCIONES_ITEM.map((o) => <option key={o} value={o}>{ITEM[o].etiqueta}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={`obs-${item.id}`} className="block text-xs font-bold text-tinta-2 mb-1">Observación</label>
              <input id={`obs-${item.id}`} maxLength={255} value={observacion} onChange={(e) => setObservacion(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm" />
            </div>
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
        <ErrorCarga mensaje={error?.status === 404 ? "No encontramos este expediente en la cartera." : (error?.message ?? "No se pudo cargar el expediente.")}
          alReintentar={error?.status === 404 ? undefined : reload} />
        <Button asChild className="rounded-xl"><Link to="/casos">Volver a la cartera</Link></Button>
      </div>
    );
  }

  const ev = d.evaluacion;
  const estilo = ev ? ESTADOS[ev.estado] : null;
  const IconoEstado = estilo?.Icono;
  const x = d.expediente;
  const p = d.predio;

  const transcrita = d.origen === "TRANSCRITA";
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
    try { await abrirPdf(`/casos/${d.codigo}/documento`); }
    catch (e) { setErrorPdf(e instanceof Error ? e.message : "No se pudo abrir el documento"); }
  };

  const reemplazarItem = (nuevo: ItemChecklist) =>
    setData({ ...d, checklist: d.checklist.map((i) => (i.id === nuevo.id ? nuevo : i)) });

  return (
    <div className="flex-1 bg-superficie pb-24">

      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <nav aria-label="Ruta" className="mb-5 flex items-center text-sm font-medium text-tinta-2">
            <Link to="/casos" className="transition-colors hover:text-primary">Cartera de inmuebles</Link>
            <ChevronRight className="mx-1 size-4" aria-hidden="true" />
            <span className="font-bold text-foreground">Partida {d.codigo}</span>
          </nav>
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="aspect-[16/10] overflow-hidden rounded-3xl border border-border bg-muted shadow-tarjeta">
              <PredioImagen codigo={d.codigo} tipo={p.tipoInmueble} />
            </div>
            <div className="space-y-5">
              <div>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-tinta-2">
                  <span className="inline-flex items-center gap-1.5"><LandPlot className="size-4 text-primary" aria-hidden="true" />{p.tipoInmuebleEtiqueta}</span>
                  <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-primary" aria-hidden="true" />{p.distrito ?? d.contexto}, Ica</span>
                </p>
                <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">{d.denominacion}</h1>
                <p className="cifras mt-1 text-sm font-medium text-tinta-2">Partida N.° {d.codigo}</p>
              </div>
              <div className="rounded-2xl border border-border bg-superficie p-4">
                {p.precioReferencial != null ? (
                  <>
                    <p className="text-xs font-bold uppercase tracking-wider text-tinta-2">Precio</p>
                    <p className="cifras text-3xl font-extrabold tracking-tight text-foreground">{soles(p.precioReferencial, true)}</p>
                    {p.precioNota && <p className="mt-1 text-xs text-tinta-2">{p.precioNota}</p>}
                  </>
                ) : (
                  <p className="font-bold text-tinta-2">Precio a consultar con la inmobiliaria.</p>
                )}
                <dl className="cifras mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                  <div><dt className="text-xs font-bold text-tinta-2">Área del terreno</dt><dd className="font-bold text-foreground">{p.areaM2 == null ? "No informada" : m2(p.areaM2)}</dd></div>
                  <div><dt className="text-xs font-bold text-tinta-2">Área construida inscrita</dt><dd className="font-bold text-foreground">{p.areaConstruidaInscrita == null ? (p.tipoInmueble === "LOTE_URBANO" ? "No aplica" : "No consta") : m2(p.areaConstruidaInscrita)}</dd></div>
                </dl>
              </div>
              <div className="space-y-2">
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
      </div>

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-8">

            {/* Semáforo informativo */}
            {ev && estilo && IconoEstado ? (
              <Card className={`rounded-3xl border-2 ${estilo.borde} shadow-sm overflow-hidden`}>
                <div className={`${estilo.fondo} px-8 py-6 flex items-center gap-4`}>
                  <IconoEstado className={`w-10 h-10 shrink-0 ${estilo.texto}`} aria-hidden="true" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-tinta-2">Indicador A · Pre-evaluación documental (automática)</p>
                    <h2 className={`text-2xl font-black ${estilo.texto}`}>{estilo.nombre}: {ev.etiqueta}</h2>
                  </div>
                </div>
                <CardContent className="p-8 space-y-6">
                  <section aria-labelledby="motivos">
                    <h3 id="motivos" className="font-bold text-foreground mb-3">Motivos</h3>
                    <ul className="space-y-2.5 list-disc pl-5 text-foreground leading-relaxed">
                      {ev.motivos.map((m, i) => <li key={i}>{m.texto}</li>)}
                    </ul>
                  </section>

                  {ev.faltantes.length > 0 && (
                    <section aria-labelledby="faltantes">
                      <h3 id="faltantes" className="font-bold text-foreground mb-3">Información que falta</h3>
                      <ul className="flex flex-wrap gap-2.5">
                        {ev.faltantes.map((f) => (
                          <li key={f} className="rounded-full border border-sem-gris/50 bg-muted px-4 py-1.5 text-sm font-bold text-foreground">{f}</li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {ev.alertas.length > 0 && (
                    <section aria-labelledby="alertas">
                      <h3 id="alertas" className="font-bold text-foreground mb-3">Alertas conocidas</h3>
                      <ul className="space-y-3">
                        {ev.alertas.map((a, i) => (
                          <li key={i} className={`rounded-2xl border p-4 ${
                            a.prioridad === "PRIORITARIA" ? "border-danger/30 bg-danger/10" : "border-warning/40 bg-warning/10"}`}>
                            <p className="font-bold text-foreground">{a.titulo} · {a.referencia}</p>
                            <p className="text-sm text-foreground mt-1">{a.explicacion}</p>
                            <p className="text-xs font-semibold text-tinta-2 mt-2">
                              Regla {a.regla} · {a.prioridad === "PRIORITARIA" ? "prioritaria" : "de revisión"}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <div className="rounded-2xl bg-superficie border border-border p-4 flex gap-3">
                    <Info className="w-5 h-5 shrink-0 text-tinta-2 mt-0.5" aria-hidden="true" />
                    <div className="text-sm text-tinta-2 leading-relaxed">
                      <p className="font-bold text-foreground">{ev.limite}</p>
                      <p className="mt-1">
                        Criterios {ev.versionReglas} (en revisión especializada).
                        Calculado sobre la versión {ev.expedienteVersion} del expediente.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-3xl border-border shadow-tarjeta">
                <CardContent className="p-8 text-tinta-2 font-semibold">Este expediente todavía no tiene una evaluación.</CardContent>
              </Card>
            )}

            {/* Partida registral */}
            <Card className="rounded-3xl border-border shadow-tarjeta">
              <CardContent className="p-8">
                <h2 className="flex items-center gap-2 text-xl font-bold text-foreground mb-6">
                  <FileText className="w-5 h-5 text-primary" aria-hidden="true" /> Partida registral
                </h2>
                <dl className="grid sm:grid-cols-2 gap-6">
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
                    <span className="block text-xs font-medium text-tinta-2 mt-0.5">No es una consulta de actualidad oficial.</span>
                  </Dato>
                </dl>
                {x.nota && <p className="mt-6 text-sm text-tinta-2 rounded-2xl bg-superficie border border-border p-4">{x.nota}</p>}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border shadow-tarjeta">
              <CardContent className="p-8">
                <h2 className="flex items-center gap-2 text-xl font-bold text-foreground mb-2">
                  <FileText className="w-5 h-5 text-primary" aria-hidden="true" /> Asientos de la partida
                </h2>
                <p className="text-sm text-tinta-2 mb-5">
                  Cada asiento lleva la letra de su rubro y un número. Abre o cierra un rubro con Enter.
                </p>
                <AsientosPorRubro asientos={x.asientos} parcial={x.completitud !== "COMPLETA"} />
              </CardContent>
            </Card>

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

          {/* Columna lateral */}
          <aside className="space-y-8">
            {d.publicacion && <PanelPublicacion codigo={d.codigo} publicacion={d.publicacion} alCambiar={setData} />}

            {/* Texto fijo para todos los roles: la verificación jurídica ocurre fuera del sistema (etapa 9). */}
            <div className="flex gap-3 rounded-3xl border border-info-tinta/20 bg-info-suave p-6 text-sm font-semibold text-info-tinta">
              <Scale className="size-5 shrink-0" aria-hidden="true" />
              <p>Siguiente paso: verificación jurídica con abogado o notario, fuera del sistema.</p>
            </div>

            <Card className="rounded-3xl border-border shadow-tarjeta">
              <CardContent className="p-8">
                <h2 className="flex items-center gap-2 text-xl font-bold text-foreground mb-5">
                  <ListChecks className="w-5 h-5 text-primary" aria-hidden="true" /> Checklist
                </h2>
                <p className="text-xs text-tinta-2 mb-4 leading-relaxed">
                  «Revisado» indica que el documento se revisó en la plataforma. No acredita validez jurídica.
                </p>
                <ul className="space-y-3">
                  {d.checklist.map((i) => (
                    <FilaChecklist key={`${i.id}-${i.estado}-${i.observacion ?? ""}`} codigo={d.codigo} item={i}
                      esRevisor={esRevisor} alCambiar={reemplazarItem} />
                  ))}
                </ul>
                {!esRevisor && (
                  <p className="mt-4 text-xs text-tinta-2">Solo el revisor puede cambiar el estado de los ítems.</p>
                )}
              </CardContent>
            </Card>

            {transcrita && (
              <Card className="rounded-3xl border-border shadow-tarjeta">
                <CardContent className="p-8">
                  <h2 className="flex items-center gap-2 text-xl font-bold text-foreground mb-4">
                    <Info className="w-5 h-5 text-primary" aria-hidden="true" /> Fuente
                  </h2>
                  <p className="text-sm text-tinta-2 mb-4 leading-relaxed">
                    Transcrita de {d.fuente ?? "una consulta pública"}{d.fechaConsulta ? `, consultada el ${fecha(d.fechaConsulta)}` : ""}.
                    No incluye nombres, DNI ni domicilios de personas naturales. Para la copia literal certificada o los
                    planos del título archivado, solicítalos en SUNARP (tienen costo).
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full rounded-xl" onClick={() => abrirExterno(CONOCE_AQUI)}>
                      Ver en Conoce Aquí <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    </Button>
                    <Button variant="outline" className="w-full rounded-xl" onClick={() => abrirExterno(VISOR_BGR)}>
                      Ver el plano en el Visor BGR <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>
                  {esRevisor && (
                    <div className="mt-6 pt-5 border-t border-border">
                      {!confirmando ? (
                        <Button variant="ghost" className="rounded-xl text-sem-rojo-tinta hover:bg-danger/10" onClick={() => setConfirmando(true)}>
                          <Trash2 className="w-4 h-4" aria-hidden="true" /> Eliminar partida transcrita
                        </Button>
                      ) : (
                        <div role="alertdialog" aria-labelledby="eliminar-titulo" className="rounded-2xl border border-danger/30 bg-danger/10 p-4">
                          <p id="eliminar-titulo" className="font-bold text-sem-rojo-tinta mb-1">¿Eliminar la partida {d.codigo}?</p>
                          <p className="text-sm text-foreground mb-3">Se borran su expediente, su checklist, su evaluación y su documento. No se puede deshacer.</p>
                          <div className="flex gap-2">
                            <Button className="rounded-xl bg-sem-rojo hover:bg-sem-rojo-tinta" onClick={eliminar}>Sí, eliminar</Button>
                            <Button variant="outline" className="rounded-xl" onClick={() => { setConfirmando(false); setErrorEliminar(null); }}>Cancelar</Button>
                          </div>
                          {errorEliminar && <p role="alert" className="mt-3 text-sm font-semibold text-sem-rojo-tinta">{errorEliminar}</p>}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="rounded-3xl border-border shadow-tarjeta">
              <CardContent className="p-8">
                <h2 className="flex items-center gap-2 text-xl font-bold text-foreground mb-4">
                  <FileText className="w-5 h-5 text-primary" aria-hidden="true" /> Documento del expediente
                </h2>
                {x.tieneDocumento ? (
                  <>
                    <p className="text-sm text-tinta-2 mb-4 leading-relaxed">
                      {x.documentoGenerado
                        ? (transcrita
                          ? "Transcripción referencial generada a partir de la partida. No es publicidad registral ni tiene valor legal."
                          : "Copia literal generada a partir de la partida. Es referencial y no tiene valor legal.")
                        : "PDF subido por el revisor. No tiene valor legal."}
                    </p>
                    <Button variant="outline" className="w-full rounded-xl" onClick={verPdf}>
                      Abrir documento <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    </Button>
                    {errorPdf && <p role="alert" className="mt-3 text-sm font-semibold text-sem-rojo-tinta">{errorPdf}</p>}
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
