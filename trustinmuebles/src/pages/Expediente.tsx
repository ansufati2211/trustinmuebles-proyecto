import { useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EstadoBadge } from "@/components/EstadoBadge";
import { EditorExpediente } from "@/components/EditorExpediente";
import { BookOpen, ChevronRight, ExternalLink, FileText, Info, ListChecks } from "lucide-react";
import { abrirPdf, patch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";
import { ESTADOS, ETIQUETA_ANOTACION, ETIQUETA_COMPLETITUD, ITEM, RUBROS, fecha } from "@/lib/semaforo";
import type { Asiento, DetalleCaso, EstadoItem, ItemChecklist, Termino } from "@/lib/types";

const OPCIONES_ITEM: EstadoItem[] = ["PENDIENTE", "REVISADO", "OBSERVADO"];

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{titulo}</dt>
      <dd className="text-base font-semibold text-foreground">{children}</dd>
    </div>
  );
}

/** Glosario por selección: botones con aria-expanded, utilizables con teclado (REQ-NF01). */
function Glosario({ terminos }: { terminos: Termino[] }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const actual = terminos.find((t) => t.concepto === abierto) ?? null;
  return (
    <Card className="rounded-3xl border-gray-100 shadow-sm">
      <CardContent className="p-8">
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground mb-2">
          <BookOpen className="w-5 h-5 text-primary" aria-hidden="true" /> Glosario de este expediente
        </h2>
        <p className="text-sm text-muted-foreground mb-5">Selecciona un término para ver su explicación.</p>
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
                    : "bg-white text-foreground border-gray-200 hover:border-primary/50 hover:bg-primary/5"
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
              <p className="mt-3 text-xs font-semibold text-muted-foreground">
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
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-black text-foreground">{a.referencia}<span className="font-bold"> · {a.tipoActoEtiqueta}</span></p>
        {a.rubro === "D" && a.estado && (
          <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
            vigente ? "border-warning/40 bg-warning/10 text-[#B45309]" : "border-gray-200 bg-gray-50 text-muted-foreground"}`}>
            {ETIQUETA_ANOTACION[a.estado]}
          </span>
        )}
      </div>
      {a.titulares && <p className="mt-2 text-sm text-foreground"><strong>Titulares:</strong> {a.titulares}</p>}
      {a.canceloNumero && <p className="mt-2 text-sm font-semibold text-foreground">Cancela el asiento {a.canceloNumero}.</p>}
      {a.texto && <p className="mt-2 text-sm leading-relaxed text-foreground">{a.texto}</p>}
      {meta && <p className="mt-2 text-xs text-muted-foreground">{meta}</p>}
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
          <details key={letra} open={letra !== "F"} className="rounded-2xl border border-gray-100 bg-gray-50/60">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-4 font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
              <span>{nombre}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {delRubro.length === 0 ? "Sin asientos" : `${delRubro.length} asiento${delRubro.length === 1 ? "" : "s"}`}
              </span>
            </summary>
            <div className="space-y-3 px-5 pb-5">
              {delRubro.length === 0
                ? <p className="text-sm text-muted-foreground">{vacio}</p>
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
    <li className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold text-foreground">{item.nombre}</p>
        <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${visual.texto}`}>
          <Icono className="w-4 h-4" aria-hidden="true" /> {visual.etiqueta}
        </span>
      </div>
      {item.observacion && <p className="mt-2 text-sm text-muted-foreground">Observación: {item.observacion}</p>}

      {esRevisor && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`estado-${item.id}`} className="block text-xs font-bold text-muted-foreground mb-1">Estado</label>
              <select id={`estado-${item.id}`} value={estado} onChange={(e) => setEstado(e.target.value as EstadoItem)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm font-semibold">
                {OPCIONES_ITEM.map((o) => <option key={o} value={o}>{ITEM[o].etiqueta}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={`obs-${item.id}`} className="block text-xs font-bold text-muted-foreground mb-1">Observación</label>
              <input id={`obs-${item.id}`} maxLength={255} value={observacion} onChange={(e) => setObservacion(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm" />
            </div>
          </div>
          {error && <p role="alert" className="text-sm font-semibold text-[#B91C1C]">{error}</p>}
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
  const { data: d, loading, error, setData } = useApi<DetalleCaso>(codigo ? `/casos/${codigo}` : null);
  const [errorPdf, setErrorPdf] = useState<string | null>(null);

  if (loading) return <div className="flex-1 flex items-center justify-center py-32 text-muted-foreground font-semibold">Cargando expediente…</div>;
  if (error || !d) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-32 gap-4 text-center px-4">
        <p role="alert" className="text-[#B91C1C] font-semibold">
          {error?.status === 404 ? "No encontramos este expediente." : (error?.message ?? "No se pudo cargar el expediente.")}
        </p>
        <Button asChild><Link to="/casos">Volver a los expedientes</Link></Button>
      </div>
    );
  }

  const ev = d.evaluacion;
  const estilo = ev ? ESTADOS[ev.estado] : null;
  const IconoEstado = estilo?.Icono;
  const x = d.expediente;

  const verPdf = async () => {
    setErrorPdf(null);
    try { await abrirPdf(`/casos/${d.codigo}/documento`); }
    catch (e) { setErrorPdf(e instanceof Error ? e.message : "No se pudo abrir el documento"); }
  };

  const reemplazarItem = (nuevo: ItemChecklist) =>
    setData({ ...d, checklist: d.checklist.map((i) => (i.id === nuevo.id ? nuevo : i)) });

  return (
    <div className="flex-1 bg-gray-50/50 pb-24">

      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <nav aria-label="Ruta" className="flex items-center text-sm font-medium text-muted-foreground mb-4">
            <Link to="/casos" className="hover:text-primary transition-colors">Expedientes</Link>
            <ChevronRight className="w-4 h-4 mx-1" aria-hidden="true" />
            <span className="text-foreground font-bold">Partida {d.codigo}</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{d.denominacion}</h1>
              <p className="text-muted-foreground font-medium mt-1">Partida N.° {d.codigo} · {d.contexto}</p>
            </div>
            <EstadoBadge estado={ev?.estado} />
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
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Semáforo informativo</p>
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
                          <li key={f} className="rounded-full border border-gray-300 bg-gray-100 px-4 py-1.5 text-sm font-bold text-foreground">{f}</li>
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
                            <p className="text-xs font-semibold text-muted-foreground mt-2">
                              Regla {a.regla} · {a.prioridad === "PRIORITARIA" ? "prioritaria" : "de revisión"}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 flex gap-3">
                    <Info className="w-5 h-5 shrink-0 text-muted-foreground mt-0.5" aria-hidden="true" />
                    <div className="text-sm text-muted-foreground leading-relaxed">
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
              <Card className="rounded-3xl border-gray-100 shadow-sm">
                <CardContent className="p-8 text-muted-foreground font-semibold">Este expediente todavía no tiene una evaluación.</CardContent>
              </Card>
            )}

            {/* Partida registral */}
            <Card className="rounded-3xl border-gray-100 shadow-sm">
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
                    <span className="block text-xs font-medium text-muted-foreground mt-0.5">No es una consulta de actualidad oficial.</span>
                  </Dato>
                </dl>
                {x.nota && <p className="mt-6 text-sm text-muted-foreground rounded-2xl bg-gray-50 border border-gray-100 p-4">{x.nota}</p>}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-gray-100 shadow-sm">
              <CardContent className="p-8">
                <h2 className="flex items-center gap-2 text-xl font-bold text-foreground mb-2">
                  <FileText className="w-5 h-5 text-primary" aria-hidden="true" /> Asientos de la partida
                </h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Cada asiento lleva la letra de su rubro y un número. Abre o cierra un rubro con Enter.
                </p>
                <AsientosPorRubro asientos={x.asientos} parcial={x.completitud !== "COMPLETA"} />
              </CardContent>
            </Card>

            {d.terminos.length > 0 && <Glosario terminos={d.terminos} />}

            {esRevisor && <EditorExpediente detalle={d} alGuardar={setData} />}
          </div>

          {/* Columna lateral */}
          <aside className="space-y-8">
            <Card className="rounded-3xl border-gray-100 shadow-sm">
              <CardContent className="p-8">
                <h2 className="flex items-center gap-2 text-xl font-bold text-foreground mb-5">
                  <ListChecks className="w-5 h-5 text-primary" aria-hidden="true" /> Checklist
                </h2>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  «Revisado» indica que el documento se revisó en la plataforma. No acredita validez jurídica.
                </p>
                <ul className="space-y-3">
                  {d.checklist.map((i) => (
                    <FilaChecklist key={`${i.id}-${i.estado}-${i.observacion ?? ""}`} codigo={d.codigo} item={i}
                      esRevisor={esRevisor} alCambiar={reemplazarItem} />
                  ))}
                </ul>
                {!esRevisor && (
                  <p className="mt-4 text-xs text-muted-foreground">Solo el revisor puede cambiar el estado de los ítems.</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-gray-100 shadow-sm">
              <CardContent className="p-8">
                <h2 className="flex items-center gap-2 text-xl font-bold text-foreground mb-4">
                  <FileText className="w-5 h-5 text-primary" aria-hidden="true" /> Documento del expediente
                </h2>
                {x.tieneDocumento ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {x.documentoGenerado
                        ? "Copia literal generada a partir de la partida. Es referencial y no tiene valor legal."
                        : "PDF subido por el revisor. No tiene valor legal."}
                    </p>
                    <Button variant="outline" className="w-full rounded-xl" onClick={verPdf}>
                      Abrir documento <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    </Button>
                    {errorPdf && <p role="alert" className="mt-3 text-sm font-semibold text-[#B91C1C]">{errorPdf}</p>}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Este expediente no tiene un documento asociado.</p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
