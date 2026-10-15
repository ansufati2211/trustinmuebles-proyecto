import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench, FileText, CheckCircle2, ShieldAlert, TrendingUp, Home, Plus, Calendar, X } from "lucide-react";
import { api, descargar, post } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { fecha, usd } from "@/lib/semaforo";
import type { Mantenimiento, ResumenPostventa, Ticket } from "@/lib/types";

const ESTADO: Record<Ticket["estado"], { texto: string; clase: string }> = {
  REPORTADO: { texto: "Reportado", clase: "bg-gray-100 text-muted-foreground border-gray-200" },
  INSPECCION_PROGRAMADA: { texto: "Inspección Programada", clase: "bg-warning/10 text-warning border-warning/20" },
  EN_PROCESO: { texto: "En Proceso", clase: "bg-primary/10 text-primary border-primary/20" },
  RESUELTO: { texto: "Resuelto", clase: "bg-success/10 text-success border-success/20" },
};

export default function PostSale() {
  const resumen = useApi<ResumenPostventa>("/postventa/resumen");
  const tickets = useApi<Ticket[]>("/tickets");
  const propiedad = resumen.data?.propiedades[0] ?? null;
  const mantenimientos = useApi<Mantenimiento[]>(propiedad ? `/postventa/mantenimientos?propiedadId=${propiedad.id}` : null);

  const [panel, setPanel] = useState<"ticket" | "mantenimiento" | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [tituloTicket, setTituloTicket] = useState("");
  const [descTicket, setDescTicket] = useState("");
  const [servicio, setServicio] = useState("");
  const [inversion, setInversion] = useState("");
  const [fechaMant, setFechaMant] = useState(new Date().toISOString().slice(0, 10));

  const mostrar = (m: string) => { setAviso(m); setTimeout(() => setAviso(null), 3500); };
  const abrir = (p: typeof panel) => { setError(null); setPanel(p); };

  if (resumen.loading) return <div className="flex-1 flex items-center justify-center py-32 text-muted-foreground font-semibold">Cargando tu patrimonio…</div>;
  if (resumen.error) return <div role="alert" className="flex-1 flex items-center justify-center py-32 text-danger font-semibold">{resumen.error.message}</div>;

  const nombre = resumen.data?.propietario ?? "";
  const iniciales = nombre.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  if (!propiedad) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-32 text-center px-4">
        <h2 className="text-2xl font-bold text-foreground">¡Hola, {nombre}!</h2>
        <p className="text-muted-foreground max-w-md">Cuando finalices la compra de una propiedad, aquí podrás gestionar garantías, mantenimiento y reventa.</p>
        <Button asChild><Link to="/transaction">Ver mis trámites</Link></Button>
      </div>
    );
  }

  const enviar = async (e: React.FormEvent, accion: () => Promise<void>, ok: string) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await accion();
      setPanel(null);
      mostrar(ok);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción");
    } finally {
      setEnviando(false);
    }
  };

  const crearTicket = (e: React.FormEvent) => enviar(e, async () => {
    await post<Ticket>("/tickets", { propiedadId: propiedad.id, titulo: tituloTicket, descripcion: descTicket });
    setTituloTicket(""); setDescTicket("");
    tickets.reload();
  }, "Ticket de garantía creado y vinculado al plano de tu vivienda.");

  const crearMantenimiento = (e: React.FormEvent) => enviar(e, async () => {
    await post<Mantenimiento>("/postventa/mantenimientos", { propiedadId: propiedad.id, fecha: fechaMant, servicio, inversionUsd: Number(inversion) });
    setServicio(""); setInversion("");
    mantenimientos.reload();
    resumen.reload();
  }, "Servicio registrado en tu historial de mantenimiento.");

  const adjuntar = async (m: Mantenimiento, archivo: File | undefined) => {
    if (!archivo) return;
    const form = new FormData();
    form.append("archivo", archivo);
    try {
      await api(`/postventa/mantenimientos/${m.id}/comprobante`, { method: "POST", body: form });
      mantenimientos.reload();
      mostrar("Comprobante adjuntado.");
    } catch (err) {
      mostrar(err instanceof Error ? err.message : "No se pudo adjuntar el comprobante");
    }
  };

  const generarDossier = async () => {
    try {
      const d = await api<unknown>(`/postventa/${propiedad.inmueble.id}/dossier`);
      const url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `dossier-inmobiliario-${propiedad.inmueble.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      mostrar("Dossier generado con auditoría, mantenimientos y tickets.");
    } catch (err) {
      mostrar(err instanceof Error ? err.message : "No se pudo generar el dossier");
    }
  };

  const campo = "w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium";
  const encabezado = (titulo: string) => (
    <div className="p-5 flex justify-between items-center border-b border-gray-100 bg-gray-50/50">
      <h3 className="font-bold text-lg text-foreground">{titulo}</h3>
      <button onClick={() => setPanel(null)} aria-label="Cerrar" className="text-gray-400 hover:text-foreground bg-white border border-gray-200 p-2 rounded-full shadow-sm"><X className="w-4 h-4" /></button>
    </div>
  );

  return (
    <div className="flex-1 bg-gray-50/50 min-h-[calc(100vh-5rem)] pb-24">

      {aviso && (
        <div role="status" className="fixed top-24 right-8 z-[200] bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-gray-700">
          <CheckCircle2 className="w-5 h-5 text-success" /><span className="font-bold text-sm">{aviso}</span>
        </div>
      )}

      {panel && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          {panel === "ticket" && (
            <form onSubmit={crearTicket} className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl">
              {encabezado("Crear Ticket de Garantía")}
              <div className="p-6 space-y-4">
                <input required className={campo} placeholder="¿Qué falla encontraste? (ej. Filtración en baño)" value={tituloTicket} onChange={(e) => setTituloTicket(e.target.value)} />
                <textarea className="w-full h-24 p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium resize-none" placeholder="Describe el problema" value={descTicket} onChange={(e) => setDescTicket(e.target.value)} />
                <p className="text-xs text-muted-foreground">El ticket se vincula automáticamente a tu transacción finalizada y al plano 2D de tu vivienda.</p>
                {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
                <Button type="submit" disabled={enviando} className="w-full h-12 rounded-xl font-bold">{enviando ? "Enviando…" : "Crear Ticket"}</Button>
              </div>
            </form>
          )}
          {panel === "mantenimiento" && (
            <form onSubmit={crearMantenimiento} className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl">
              {encabezado("Registrar Servicio de Mantenimiento")}
              <div className="p-6 space-y-4">
                <input required className={campo} placeholder="Servicio realizado" value={servicio} onChange={(e) => setServicio(e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <input required type="date" className={campo} value={fechaMant} onChange={(e) => setFechaMant(e.target.value)} />
                  <input required type="number" min="0" step="0.01" className={campo} placeholder="Inversión USD" value={inversion} onChange={(e) => setInversion(e.target.value)} />
                </div>
                {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
                <Button type="submit" disabled={enviando} className="w-full h-12 rounded-xl font-bold">{enviando ? "Guardando…" : "Añadir Mantenimiento"}</Button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="bg-white border-b border-border pt-12 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-primary text-white rounded-2xl flex items-center justify-center text-3xl font-bold shadow-lg shadow-primary/20">{iniciales}</div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">¡Hola, {nombre}!</h1>
              <p className="text-muted-foreground text-lg">Panel de Propietario & Patrimonio</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="rounded-3xl border-border/50 shadow-md bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-secondary rounded-xl"><Home className="w-6 h-6 text-primary" /></div>
                <Badge variant="outline" className="bg-gray-50 border-border">Activo</Badge>
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Propiedad Principal</p>
              <h3 className="font-bold text-xl text-foreground">{propiedad.inmueble.titulo}</h3>
              <p className="text-sm text-muted-foreground mt-1">Adquirida el {fecha(propiedad.fechaCompra)}</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/50 shadow-md bg-primary text-white md:col-span-2 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4"><TrendingUp className="w-48 h-48" /></div>
            <CardContent className="p-8 relative z-10 flex flex-col justify-center h-full">
              <p className="text-sm font-bold text-white/80 uppercase tracking-wider mb-2">Valor Estimado Actual</p>
              <div className="flex items-end gap-4 mb-2 flex-wrap">
                <h3 className="font-black text-4xl sm:text-5xl">{usd(propiedad.valorEstimado)} <span className="text-xl font-normal opacity-80">USD</span></h3>
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-300" />
                  <span className="font-bold text-green-50 text-sm">{propiedad.plusvaliaPct >= 0 ? "+" : ""}{propiedad.plusvaliaPct}% vs Compra</span>
                </div>
              </div>
              <p className="text-sm text-white/70">Estimación referencial (crecimiento anual + mantenimiento registrado), no es una tasación. Mantén tu historial al día para maximizar tu plusvalía.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">

            <Card className="rounded-3xl border-border/50 shadow-sm bg-white overflow-hidden">
              <div className="p-6 md:p-8 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-secondary rounded-xl"><Wrench className="w-5 h-5 text-primary" /></div>
                  <h2 className="text-xl font-bold text-foreground">Historial de Mantenimiento</h2>
                </div>
                <Button onClick={() => abrir("mantenimiento")} variant="outline" className="rounded-xl text-sm h-10"><Plus className="w-4 h-4 mr-1" /> Registrar Servicio</Button>
              </div>
              <div className="overflow-x-auto">
                {mantenimientos.data && mantenimientos.data.length > 0 ? (
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50/80 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                      <tr>
                        <th className="px-8 py-4">Fecha</th><th className="px-8 py-4">Servicio Realizado</th><th className="px-8 py-4">Inversión</th><th className="px-8 py-4 text-right">Comprobante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {mantenimientos.data.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-8 py-5 font-semibold"><span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /> {fecha(m.fecha)}</span></td>
                          <td className="px-8 py-5 font-medium text-foreground">{m.servicio}</td>
                          <td className="px-8 py-5 font-bold">{usd(m.inversionUsd)}</td>
                          <td className="px-8 py-5 text-right">
                            {m.comprobanteUrl ? (
                              <Button onClick={() => descargar(m.comprobanteUrl!.replace("/api/v1", ""), `comprobante-${m.id}`)} variant="ghost" size="sm" className="text-primary hover:bg-secondary"><FileText className="w-4 h-4 mr-2" /> Ver</Button>
                            ) : (
                              <label className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-primary cursor-pointer">
                                Adjuntar
                                <input type="file" accept="application/pdf,image/png,image/jpeg" className="sr-only" onChange={(e) => adjuntar(m, e.target.files?.[0])} />
                              </label>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-8 text-muted-foreground font-medium">Aún no registraste servicios de mantenimiento.</p>
                )}
              </div>
            </Card>

            <Card className="rounded-3xl border-border/50 shadow-sm bg-white">
              <div className="p-6 md:p-8 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-warning/10 rounded-xl"><ShieldAlert className="w-5 h-5 text-warning" /></div>
                  <h2 className="text-xl font-bold text-foreground">Garantías y Tickets</h2>
                </div>
                <Button onClick={() => abrir("ticket")} variant="outline" className="rounded-xl text-sm h-10"><Plus className="w-4 h-4 mr-1" /> Crear Ticket</Button>
              </div>
              <CardContent className="p-6 md:p-8 space-y-4">
                {tickets.data && tickets.data.length > 0 ? tickets.data.map((t) => (
                  <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-border hover:border-warning/30 hover:shadow-md transition-all bg-white gap-3">
                    <div>
                      <h4 className="font-bold text-base mb-1">{t.titulo}</h4>
                      <p className="text-sm text-muted-foreground">Reportado: {fecha(t.creadoEn)}{t.proveedor ? ` • Proveedor: ${t.proveedor}` : ""}</p>
                    </div>
                    <Badge variant="outline" className={`px-3 py-1 ${ESTADO[t.estado].clase}`}>{ESTADO[t.estado].texto}</Badge>
                  </div>
                )) : (
                  <p className="text-muted-foreground font-medium">No tienes tickets abiertos. Si detectas una falla, crea uno y quedará vinculado al plano de tu vivienda.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-3xl border-primary/20 shadow-lg bg-gradient-to-br from-white to-secondary/30">
              <div className="p-6 md:p-8 border-b border-border/50">
                <h2 className="text-xl font-bold text-foreground mb-1">Kit de Reventa</h2>
                <p className="text-sm text-muted-foreground">Prepara tu propiedad para el mercado.</p>
              </div>
              <CardContent className="p-6 md:p-8 space-y-4">
                <Button onClick={generarDossier} variant="outline" className="w-full justify-start h-14 rounded-xl font-semibold bg-white border-border shadow-sm hover:border-primary hover:text-primary transition-all">
                  <FileText className="w-5 h-5 mr-3 text-muted-foreground" /> Generar Dossier Inmobiliario
                </Button>
                <div className="mt-8 p-6 bg-white rounded-2xl border border-primary/10 shadow-sm text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"><TrendingUp className="w-6 h-6 text-primary" /></div>
                  <h4 className="font-bold text-foreground mb-2">Protege tu Plusvalía</h4>
                  <p className="text-sm text-muted-foreground mb-6">Un historial verificado de auditoría y mantenimiento respalda el valor de tu propiedad ante un futuro comprador.</p>
                  <Button onClick={generarDossier} className="w-full h-12 rounded-xl shadow-md">Generar Historial para Comprador</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
