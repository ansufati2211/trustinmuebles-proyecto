import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShieldCheck, ShieldAlert, AlertTriangle, MapPin, CheckCircle2, Building, Bed, Bath, Square,
  ChevronRight, FileText, Share, Heart, Calendar, X, Lock, User
} from "lucide-react";
import { ApiError, assetUrl, post, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";
import { fecha, tono, usd, type Tono } from "@/lib/semaforo";
import type { InmuebleDetalle, Nivel, PartidaTraducida, TransaccionDetalle, TransaccionResumen } from "@/lib/types";

const COLOR: Record<Tono, { texto: string; fondo: string; punto: string; sombra: string }> = {
  success: { texto: "text-success", fondo: "bg-success", punto: "bg-success", sombra: "shadow-[0_0_15px_rgba(34,197,94,1)]" },
  warning: { texto: "text-warning", fondo: "bg-warning", punto: "bg-warning", sombra: "shadow-[0_0_15px_rgba(245,158,11,1)]" },
  danger: { texto: "text-danger", fondo: "bg-danger", punto: "bg-danger", sombra: "shadow-[0_0_15px_rgba(239,68,68,1)]" },
  pending: { texto: "text-muted-foreground", fondo: "bg-gray-400", punto: "bg-gray-400", sombra: "" },
};

const ICONO = { success: CheckCircle2, warning: AlertTriangle, danger: ShieldAlert, pending: AlertTriangle };

const TITULAR: Record<Nivel, string> = { VERDE: "Saneado", AMARILLO: "Con observaciones", ROJO: "En riesgo" };
const GRAVAMEN: Record<Nivel, string> = { VERDE: "Libres", AMARILLO: "Hipoteca vigente", ROJO: "Embargado" };
const PROCESO: Record<Nivel, string> = { VERDE: "Ninguno", AMARILLO: "En revisión", ROJO: "Con medidas vigentes" };

const VEREDICTO: Record<Nivel, { titulo: string; detalle: string }> = {
  VERDE: { titulo: "Luz verde: sin riesgos registrales", detalle: "No encontramos embargos, bloqueos ni procesos vigentes." },
  AMARILLO: { titulo: "Luz amarilla: revisa antes de comprar", detalle: "Hay advertencias que se pueden resolver, pero requieren acción." },
  ROJO: { titulo: "Luz roja: riesgo alto, no compres todavía", detalle: "Hay problemas legales que pueden hacerte perder tu inversión." },
};

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();
  const { data: d, loading, error } = useApi<InmuebleDetalle>(id ? `/inmuebles/${id}` : null);

  const [isSaved, setIsSaved] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [partida, setPartida] = useState<PartidaTraducida | null>(null);
  const [partidaError, setPartidaError] = useState<string | null>(null);
  const [separando, setSeparando] = useState(false);
  const [errorTramite, setErrorTramite] = useState<string | null>(null);

  if (loading) return <div className="flex-1 flex items-center justify-center py-32 text-muted-foreground font-semibold">Cargando auditoría…</div>;
  if (error || !d) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-32 gap-4 text-center px-4">
        <p role="alert" className="text-danger font-semibold">{error?.status === 404 ? "No encontramos esta propiedad." : (error?.message ?? "No se pudo cargar la propiedad.")}</p>
        <Button asChild><Link to="/search">Volver a la búsqueda</Link></Button>
      </div>
    );
  }

  const sem = d.semaforo;
  const tonoLegal = tono(sem?.nivel);
  const insp = d.inspeccion;

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => undefined);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 3000);
  };

  const verPartida = async () => {
    setPartidaError(null);
    try {
      setPartida(await api<PartidaTraducida>(`/inmuebles/${d.id}/partida`));
    } catch (e) {
      setPartidaError(e instanceof Error ? e.message : "No se pudo consultar la partida");
      setPartida({ numeroPartida: d.numeroPartida, zonaRegistral: "", titularActual: "", areaRegistralM2: 0, asientos: [] });
    }
  };

  const descargarDictamen = () => {
    if (!sem) return;
    const lineas = [
      `Dictamen del Semáforo Legal — ${d.titulo}`,
      `Partida registral: ${d.numeroPartida} · Evaluado el ${fecha(sem.fecha)}`,
      `Resultado general: ${sem.nivel}`,
      `Título de dominio: ${sem.dominio} · Gravámenes: ${sem.gravamenes} · Procesos judiciales: ${sem.procesos}`,
      "", ...sem.hallazgos.flatMap((h) => [`[${h.nivel}] ${h.titulo}`, `  ${h.explicacionSimple}`, `  Qué hacer: ${h.recomendacion}`, ""]),
      `Huella de la copia literal evaluada: ${sem.hashCopia}`,
      "Datos de prueba: el prototipo no está conectado a SUNARP en tiempo real.",
    ];
    const url = URL.createObjectURL(new Blob([lineas.join("\n")], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `dictamen-legal-${d.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const separar = async () => {
    if (!usuario) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    setErrorTramite(null);
    setSeparando(true);
    try {
      const t = await post<TransaccionDetalle>("/transacciones", { inmuebleId: d.id });
      navigate(`/transaction/${t.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        // ya tiene un trámite en curso para esta propiedad: lo llevamos a él
        try {
          const mias = await api<TransaccionResumen[]>("/transacciones/mias");
          const existente = mias.find((t) => t.inmueble.id === d.id && t.etapa !== "FINALIZADA");
          if (existente) { navigate(`/transaction/${existente.id}`); return; }
        } catch { /* se muestra el error original */ }
      }
      setErrorTramite(e instanceof Error ? e.message : "No se pudo iniciar el trámite");
    } finally {
      setSeparando(false);
    }
  };

  // Cuota estimada a 20 años con tasa referencial del 9 % anual y 20 % de inicial
  const inicial = d.precioUsd * 0.2;
  const i = 0.09 / 12;
  const n = 240;
  const cuota = ((d.precioUsd - inicial) * i) / (1 - Math.pow(1 + i, -n));

  const VEREDICTO_ACTUAL = sem ? VEREDICTO[sem.nivel] : null;
  const IconoLegal = ICONO[tonoLegal];

  return (
    <div className="flex-1 bg-gray-50/50 pb-24 relative">

      {showShareToast && (
        <div className="fixed top-24 right-8 z-50 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl animate-in slide-in-from-top-4 fade-in flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-success" />
          <span className="font-medium text-sm">Enlace copiado al portapapeles</span>
        </div>
      )}

      {/* Modal: Traducción de la partida registral */}
      {partida && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-[2rem] overflow-hidden shadow-2xl border border-gray-100 flex flex-col">
            <div className="p-5 flex justify-between items-center border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Partida {partida.numeroPartida} — traducida a lenguaje simple
              </h3>
              <button onClick={() => setPartida(null)} aria-label="Cerrar" className="text-gray-400 hover:text-foreground bg-white border border-gray-200 p-2 rounded-full shadow-sm">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {partidaError ? (
                <p role="alert" className="text-danger font-semibold">{partidaError}</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground font-medium">{partida.zonaRegistral} · Titular registral: <span className="font-bold text-foreground">{partida.titularActual}</span> · Área inscrita: <span className="font-bold text-foreground">{partida.areaRegistralM2} m²</span></p>
                  {partida.asientos.map((a, k) => (
                    <div key={k} className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{a.tipo.replace("_", " ")}</span>
                        <span className={`text-[11px] font-bold uppercase ${a.vigente ? "text-warning" : "text-success"}`}>{a.vigente ? "Vigente" : "Cancelado"}{a.fecha ? ` · ${fecha(a.fecha)}` : ""}</span>
                      </div>
                      <p className="text-xs text-muted-foreground italic mb-2">Texto registral: “{a.textoRegistral}”</p>
                      <p className="text-sm font-semibold text-foreground">En palabras simples: {a.explicacionSimple}</p>
                    </div>
                  ))}
                </>
              )}
              <p className="text-xs text-muted-foreground">Datos de prueba: el prototipo simula la respuesta de SUNARP.</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="inline-flex items-center rounded-md bg-gray-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-success" /> Certificación Trustinmuebles
              </div>
              <span className="text-sm font-medium text-muted-foreground">ID: #TR-{d.id} • Partida {d.numeroPartida}</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">{d.titulo}</h1>
            <p className="text-muted-foreground flex items-center gap-1.5 mt-2 text-lg font-medium">
              <MapPin className="w-5 h-5 text-primary" /> {d.direccion}
            </p>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <Button onClick={handleShare} variant="outline" className="rounded-xl font-bold bg-white flex-1 md:flex-none">
              <Share className="w-4 h-4 mr-2" /> Compartir
            </Button>
            <Button
              onClick={() => setIsSaved(!isSaved)}
              variant="outline"
              className={`rounded-xl font-bold transition-all flex-1 md:flex-none ${isSaved ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700' : 'bg-white'}`}
            >
              <Heart className={`w-4 h-4 mr-2 transition-colors ${isSaved ? 'fill-current text-red-600' : ''}`} />
              {isSaved ? 'Guardado' : 'Guardar'}
            </Button>
          </div>
        </div>

        <div className="rounded-3xl overflow-hidden h-[40vh] md:h-[50vh] min-h-[320px] bg-gray-100 mt-6">
          <img
            src={assetUrl(d.imagenUrl)}
            alt={`Fachada de ${d.titulo}`}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://placehold.co/1200x800/f1f5f9/94a3b8?text=Propiedad+sin+foto"; }}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid lg:grid-cols-3 gap-12">

          <div className="lg:col-span-2 space-y-12">

            {/* Quick Stats */}
            <div className="flex flex-wrap items-center gap-6 md:gap-10 py-6 border-y border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white border border-gray-100 shadow-sm rounded-xl"><Bed className="w-6 h-6 text-primary" /></div>
                <div><p className="text-xl font-bold text-foreground">{d.habitaciones}</p><p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold">Habitaciones</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white border border-gray-100 shadow-sm rounded-xl"><Bath className="w-6 h-6 text-primary" /></div>
                <div><p className="text-xl font-bold text-foreground">{d.banos}</p><p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold">Baños</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white border border-gray-100 shadow-sm rounded-xl"><Square className="w-6 h-6 text-primary" /></div>
                <div><p className="text-xl font-bold text-foreground">{d.areaM2} m²</p><p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold">Área</p></div>
              </div>
            </div>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-foreground">Descripción del Inmueble</h2>
              <p className="text-base leading-relaxed text-muted-foreground">{d.descripcion}</p>
              <div className="grid sm:grid-cols-2 gap-4 mt-6 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="font-medium text-foreground">Partida registral: <span className="font-bold">{d.numeroPartida}</span></span>
                </div>
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-primary" />
                  <span className="font-medium text-foreground">Vendedor: <span className="font-bold">{d.vendedor}</span></span>
                </div>
              </div>
            </section>

            {/* Semáforo Legal */}
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-foreground">
                <ShieldCheck className="w-7 h-7 text-primary" /> Semáforo Legal
              </h2>
              {!sem || !VEREDICTO_ACTUAL ? (
                <Card className="rounded-3xl border-gray-200 bg-white"><CardContent className="p-8 text-muted-foreground font-medium">Esta propiedad todavía no tiene una auditoría legal.</CardContent></Card>
              ) : (
                <Card className="rounded-3xl border-gray-200 shadow-sm overflow-hidden bg-white">
                  <div className={`p-6 border-b flex items-center justify-between ${tonoLegal === "success" ? "bg-success/5 border-success/10" : tonoLegal === "warning" ? "bg-warning/5 border-warning/10" : "bg-danger/5 border-danger/10"}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${COLOR[tonoLegal].fondo}`}>
                        <IconoLegal className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className={`text-xl font-bold ${COLOR[tonoLegal].texto}`}>{VEREDICTO_ACTUAL.titulo}</h3>
                        <p className="text-sm text-muted-foreground font-semibold mt-0.5">{VEREDICTO_ACTUAL.detalle} Evaluado el {fecha(sem.fecha)}.</p>
                        {sem.desactualizada && <p className="text-xs text-warning font-bold mt-1">El registro no respondió: se muestra la última evaluación guardada.</p>}
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-8">
                    <div className="grid md:grid-cols-3 gap-6 mb-8">
                      {([
                        ["Título de Dominio", sem.dominio, TITULAR],
                        ["Gravámenes / Hipotecas", sem.gravamenes, GRAVAMEN],
                        ["Procesos Judiciales", sem.procesos, PROCESO],
                      ] as [string, Nivel, Record<Nivel, string>][]).map(([titulo, nivel, textos]) => {
                        const t = tono(nivel);
                        const Icono = ICONO[t];
                        return (
                          <div key={titulo} className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{titulo}</p>
                            <p className="font-bold text-foreground flex items-center gap-2 text-lg"><Icono className={`w-5 h-5 ${COLOR[t].texto}`} /> {textos[nivel]}</p>
                          </div>
                        );
                      })}
                    </div>

                    {sem.hallazgos.length > 0 && (
                      <div className="space-y-4 mb-8">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Qué encontramos y qué hacer</h4>
                        {sem.hallazgos.map((h, k) => {
                          const t = tono(h.nivel);
                          return (
                            <div key={k} className={`p-5 rounded-2xl border ${t === "danger" ? "border-danger/20 bg-danger/5" : "border-warning/20 bg-warning/5"}`}>
                              <p className={`font-bold ${COLOR[t].texto}`}>{h.titulo}</p>
                              <p className="text-sm text-foreground font-medium mt-1">{h.explicacionSimple}</p>
                              <p className="text-sm text-foreground mt-2"><span className="font-bold">Qué hacer:</span> {h.recomendacion}</p>
                              {h.textoRegistral && <p className="text-xs text-muted-foreground mt-2 italic">Registro: {h.textoRegistral}</p>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button onClick={verPartida} variant="outline" className="rounded-xl h-12 flex-1 font-bold border-gray-200"><FileText className="w-4 h-4 mr-2" /> Traducción de la Partida Registral</Button>
                      <Button onClick={descargarDictamen} variant="outline" className="rounded-xl h-12 flex-1 font-bold text-primary border-primary/30 hover:bg-primary/5">Descargar Dictamen Legal</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* Inspección estructural */}
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-foreground">
                <Building className="w-7 h-7 text-primary" /> Inspección Estructural
              </h2>
              <Card className="rounded-3xl border-gray-200 shadow-sm bg-white overflow-hidden">
                {insp?.plano ? (
                  <div className="relative bg-slate-900 border-b border-gray-200">
                    <img src={assetUrl(insp.plano.imagenUrl)} alt={`Plano 2D: ${insp.plano.nombre}`} className="block w-full h-auto opacity-40 mix-blend-luminosity max-h-[520px] object-cover" />
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
                    {insp.inspeccion.pines.map((p) => {
                      const c = COLOR[tono(p.severidad)];
                      return (
                        <div key={p.id} className="absolute flex flex-col items-center group cursor-pointer z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }} tabIndex={0}>
                          <div className={`w-4 h-4 rounded-full border-2 border-white animate-pulse ${c.punto} ${c.sombra}`}></div>
                          <div className="absolute top-6 bg-white text-slate-900 text-xs font-bold px-3 py-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-all transform scale-95 group-hover:scale-100 whitespace-nowrap">
                            {p.titulo}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-muted-foreground font-medium border-b border-gray-100">Esta propiedad todavía no tiene una inspección estructural cerrada.</div>
                )}

                <CardContent className="p-8 space-y-6">
                  {insp && (
                    <>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <h3 className={`font-bold text-lg ${COLOR[tono(insp.inspeccion.nivel)].texto}`}>
                            {insp.inspeccion.nivel === "VERDE" ? "Reporte de Ingeniería Aprobado" : insp.inspeccion.nivel === "AMARILLO" ? "Reporte con observaciones" : "Reporte con riesgo estructural alto"}
                          </h3>
                          <p className="text-sm font-medium text-muted-foreground mt-1">{insp.inspeccion.inspector} · inspección del {fecha(insp.inspeccion.fecha)}</p>
                        </div>
                      </div>
                      {insp.inspeccion.dictamen && <p className="text-sm text-foreground font-medium">{insp.inspeccion.dictamen}</p>}
                      <ul className="space-y-2">
                        {insp.inspeccion.pines.map((p) => (
                          <li key={p.id} className="flex items-start gap-3 text-sm">
                            <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${COLOR[tono(p.severidad)].punto}`}></span>
                            <span><span className="font-bold text-foreground">{p.titulo}.</span> <span className="text-muted-foreground">{p.descripcion}</span></span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Sidebar */}
          <div className="relative">
            <div className="sticky top-24">
              <Card className="rounded-3xl border-gray-200 shadow-xl bg-white overflow-hidden">
                <CardContent className="p-8">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Precio Total de Venta</p>
                  <div className="text-4xl font-black text-foreground mb-8">{usd(d.precioUsd)} <span className="text-xl font-bold text-muted-foreground">USD</span></div>

                  <div className="space-y-4 mb-8 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                    <div className="flex items-center justify-between text-sm pb-3 border-b border-gray-200">
                      <span className="text-muted-foreground font-medium">Inicial sugerida (20%)</span>
                      <span className="font-bold text-foreground">{usd(inicial)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-1">
                      <span className="text-muted-foreground font-medium">Cuota estimada (20 años, 9 % anual)</span>
                      <span className="font-bold text-primary">{usd(cuota)} / mes</span>
                    </div>
                  </div>

                  {sem?.nivel === "ROJO" && (
                    <p role="alert" className="mb-4 text-sm font-semibold text-danger bg-danger/10 rounded-xl px-4 py-3">
                      Esta propiedad tiene riesgo legal alto. Puedes abrir el trámite para seguirlo, pero la auditoría no se aprobará hasta que se levanten los problemas.
                    </p>
                  )}
                  {errorTramite && <p role="alert" className="mb-4 text-sm font-semibold text-danger bg-danger/10 rounded-xl px-4 py-3">{errorTramite}</p>}

                  <Button onClick={separar} disabled={separando} size="lg" className="w-full h-14 text-base rounded-2xl shadow-lg shadow-primary/20 mb-4 transition-transform hover:-translate-y-0.5">
                    {separando ? "Abriendo trámite…" : "Separar Propiedad Ahora"}
                  </Button>
                  <Button variant="outline" size="lg" className="w-full h-14 text-base rounded-2xl border-2 font-bold hover:bg-gray-50">
                    Agendar Visita Física
                  </Button>

                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <div className="flex items-start gap-3">
                      <div className="bg-green-50 p-2 rounded-lg shrink-0">
                        <Lock className="w-5 h-5 text-success" />
                      </div>
                      <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                        <span className="font-bold text-foreground block mb-0.5">Operación 100% Segura</span>
                        Documentos cifrados y trazabilidad inalterable de cada paso de tu trámite.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
