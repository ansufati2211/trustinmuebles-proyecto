import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  LayoutDashboard, User, Home, FileText, Settings, CheckCircle2,
  Download, PenTool, ChevronRight, Lock, X, Fingerprint, Loader2,
  ArrowLeft, LifeBuoy, Mail, Shield, ShieldCheck, ShieldAlert, Send, LogOut, FileUp
} from "lucide-react";
import { api, ApiError, descargar, patch, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";
import { fecha } from "@/lib/semaforo";
import type { DocumentoDto, EtapaCodigo, Integridad, TransaccionDetalle } from "@/lib/types";

const ORDEN: EtapaCodigo[] = ["OFERTA_ACEPTADA", "AUDITORIA_APROBADA", "FIRMA_MINUTA", "ESCRITURA_PUBLICA", "FINALIZADA"];

export default function Transaction() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const { data: t, loading, error, setData } = useApi<TransaccionDetalle>(id ? `/transacciones/${id}` : null);

  const [isSigning, setIsSigning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<"sign" | "profile" | "legal" | "settings" | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [integridad, setIntegridad] = useState<Integridad | null>(null);
  const [avanzando, setAvanzando] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  if (loading) return <div className="flex-1 flex items-center justify-center py-32 text-muted-foreground font-semibold">Cargando tu trámite…</div>;
  if (error || !t) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-32 gap-4 text-center px-4">
        <p role="alert" className="text-danger font-semibold">{error?.status === 403 ? "No participas en este trámite." : (error?.message ?? "No se pudo cargar el trámite.")}</p>
        <Button asChild><Link to="/search">Buscar propiedades</Link></Button>
      </div>
    );
  }

  const esStaff = usuario?.rol === "GESTOR_LEGAL" || usuario?.rol === "ADMIN";
  const esComprador = usuario?.id !== undefined && !esStaff;
  const minutaPendiente = t.documentos.find((d) => d.estadoFirma === "PENDIENTE");
  const siguiente = ORDEN[ORDEN.indexOf(t.etapa) + 1];
  const iniciales = (usuario?.nombre ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const handleSignDocument = async () => {
    if (!minutaPendiente) return;
    setIsSigning(true);
    setErrorAccion(null);
    try {
      setData(await post<TransaccionDetalle>(`/documentos/${minutaPendiente.id}/firmar`));
      setActiveModal(null);
      showToast("Documento firmado. El hito quedó registrado en la cadena de integridad.");
    } catch (e) {
      setErrorAccion(e instanceof Error ? e.message : "No se pudo firmar el documento");
    } finally {
      setIsSigning(false);
    }
  };

  const handleDownload = async (d: DocumentoDto) => {
    try {
      await descargar(`/documentos/${d.id}/descarga`, d.nombre);
      showToast(`Descargando documento cifrado: ${d.nombre}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo descargar");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const m = await post<TransaccionDetalle["mensajes"][number]>(`/transacciones/${t.id}/mensajes`, { texto: mensaje });
      setData({ ...t, mensajes: [...t.mensajes, m] });
      setMensaje("");
      showToast("Mensaje enviado a tu asesor legal.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "No se pudo enviar el mensaje");
    }
  };

  const handleSubir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    const form = new FormData();
    form.append("archivo", archivo);
    try {
      await api(`/transacciones/${t.id}/documentos`, { method: "POST", body: form });
      setData(await api<TransaccionDetalle>(`/transacciones/${t.id}`));
      showToast(`Documento subido: ${archivo.name}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "No se pudo subir el documento");
    }
  };

  const avanzar = async () => {
    setAvanzando(true);
    setErrorAccion(null);
    try {
      setData(await patch<TransaccionDetalle>(`/transacciones/${t.id}/etapa`, { etapa: siguiente }));
    } catch (e) {
      setErrorAccion(e instanceof ApiError ? e.message : "No se pudo cambiar la etapa");
    } finally {
      setAvanzando(false);
    }
  };

  const verificar = async () => {
    try {
      setIntegridad(await api<Integridad>(`/transacciones/${t.id}/integridad`));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo verificar");
    }
  };

  const abrirAjustes = () => {
    setIntegridad(null);
    setActiveModal("settings");
    verificar();
  };

  const badge = t.etapa === "FINALIZADA"
    ? <Badge variant="success" className="bg-success/10 text-success border-success/20 px-3 py-1 uppercase tracking-widest text-[10px] shadow-sm">Finalizado</Badge>
    : minutaPendiente && esComprador
      ? <Badge variant="warning" className="bg-warning/10 text-warning border-warning/20 px-3 py-1 uppercase tracking-widest text-[10px] shadow-sm">Requiere Acción</Badge>
      : <Badge variant="success" className="bg-success/10 text-success border-success/20 px-3 py-1 uppercase tracking-widest text-[10px] shadow-sm">En Curso</Badge>;

  const cerrar = (
    <button onClick={() => setActiveModal(null)} aria-label="Cerrar" className="text-gray-400 hover:text-foreground transition-colors bg-white border border-gray-200 p-2 rounded-full shadow-sm hover:bg-gray-50">
      <X className="w-4 h-4" />
    </button>
  );

  return (
    <div className="flex-1 flex bg-gray-50/50 min-h-[calc(100vh-4rem)] relative">

      {toastMessage && (
        <div role="status" className="fixed top-24 right-8 z-[200] bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 fade-in flex items-center gap-3 border border-gray-700">
          <CheckCircle2 className="w-5 h-5 text-success" />
          <span className="font-bold text-sm">{toastMessage}</span>
        </div>
      )}

      {/* MODAL 1: Firma Digital */}
      {activeModal === "sign" && minutaPendiente && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95">
            <div className="p-5 flex justify-between items-center border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" /> Firma Digital Segura
              </h3>
              {cerrar}
            </div>
            <div className="p-8 flex flex-col items-center text-center bg-white">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-500 shadow-inner border-4 ${isSigning ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-gray-50 border-gray-100 text-muted-foreground'}`}>
                {isSigning ? <Loader2 className="w-10 h-10 animate-spin" /> : <Fingerprint className="w-12 h-12" />}
              </div>
              <h4 className="font-black text-2xl mb-2 text-foreground">{minutaPendiente.nombre.replace(/_/g, " ").replace(".pdf", "")}</h4>
              <p className="text-sm text-muted-foreground mb-6 font-medium px-4">Al confirmar, firmas este documento. Su huella (SHA-256 {minutaPendiente.sha256.slice(0, 12)}…) quedará registrada en tu expediente.</p>
              {errorAccion && <p role="alert" className="mb-4 text-sm font-semibold text-danger">{errorAccion}</p>}
              <Button onClick={handleSignDocument} disabled={isSigning} size="lg" className="w-full h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/20">
                {isSigning ? 'Procesando firma...' : 'Confirmar y Firmar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Mi Perfil */}
      {activeModal === "profile" && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-10">
            <div className="p-5 flex justify-between items-center border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Mi Perfil</h3>
              {cerrar}
            </div>
            <div className="p-8 bg-white">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 bg-primary text-white rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg shadow-primary/20">{iniciales}</div>
                <div>
                  <h2 className="text-2xl font-black text-foreground">{usuario?.nombre}</h2>
                  <div className="inline-flex items-center mt-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider">
                    <Shield className="w-3.5 h-3.5 mr-1.5" /> {usuario?.rol.replace("_", " ")}
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex items-center gap-4">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Correo Electrónico</p>
                  <p className="font-semibold text-foreground">{usuario?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Ayuda Legal */}
      {activeModal === "legal" && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-10">
            <div className="p-5 flex justify-between items-center border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2"><LifeBuoy className="w-5 h-5 text-primary" /> Soporte Legal Directo</h3>
              {cerrar}
            </div>
            <div className="p-8 bg-white">
              <div className="flex items-center gap-4 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center font-black shrink-0">{(t.gestor?.nombre ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("")}</div>
                <div>
                  <p className="font-black text-foreground">{t.gestor?.nombre ?? "Sin asesor asignado"}</p>
                  <p className="text-xs font-bold text-primary">Asesor Legal Asignado</p>
                </div>
              </div>
              {t.mensajes.length > 0 && (
                <ul className="space-y-3 mb-6 max-h-48 overflow-y-auto">
                  {t.mensajes.map((m) => (
                    <li key={m.id} className={`p-3 rounded-xl text-sm ${m.autorId === usuario?.id ? "bg-primary/10 ml-8" : "bg-gray-100 mr-8"}`}>
                      <p className="text-[11px] font-bold text-muted-foreground mb-1">{m.autor} · {fecha(m.fecha)}</p>
                      <p className="font-medium text-foreground">{m.texto}</p>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="msg" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tu mensaje o consulta legal</label>
                  <textarea
                    id="msg" required value={mensaje} onChange={(e) => setMensaje(e.target.value)}
                    placeholder="Escribe aquí tu duda sobre la minuta o el trámite..."
                    className="w-full h-28 p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-sm font-medium"
                  ></textarea>
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl font-bold shadow-md"><Send className="w-4 h-4 mr-2" /> Enviar Consulta</Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Integridad y sesión */}
      {activeModal === "settings" && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-10">
            <div className="p-5 flex justify-between items-center border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Integridad del Expediente</h3>
              {cerrar}
            </div>
            <div className="p-8 bg-white space-y-6">
              {!integridad ? (
                <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Recalculando la cadena de hashes…</p>
              ) : integridad.valida ? (
                <div className="p-5 rounded-2xl bg-success/10 border border-success/20">
                  <p className="font-bold text-success flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Expediente íntegro</p>
                  <p className="text-sm text-foreground font-medium mt-2">Se verificaron {integridad.eventos} eventos encadenados; ninguno fue alterado.</p>
                  <p className="text-[11px] text-muted-foreground mt-2 break-all">Último hash: {integridad.ultimoHash}</p>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-danger/10 border border-danger/20">
                  <p className="font-bold text-danger flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> Se detectó una alteración</p>
                  <p className="text-sm text-foreground font-medium mt-2">El evento #{integridad.primerEventoInvalido} no coincide con su huella registrada.</p>
                </div>
              )}
              <Button onClick={() => { logout(); navigate("/"); }} variant="outline" className="w-full h-12 rounded-xl font-bold"><LogOut className="w-4 h-4" /> Cerrar Sesión</Button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-72 border-r border-gray-200 bg-white hidden md:flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center text-lg font-black shadow-md shadow-primary/20">{iniciales}</div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-foreground">{usuario?.nombre}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{usuario?.rol.replace("_", " ")}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 py-8 px-4 overflow-y-auto space-y-8">
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-4">Menú Personal</h3>
            <nav className="space-y-2">
              <button onClick={() => setActiveModal("profile")} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold rounded-2xl text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-all">
                <User className="w-5 h-5" /> Mi Perfil
              </button>
              <Link to="/transaction" className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold rounded-2xl bg-success/10 text-success transition-all shadow-sm border border-success/20">
                <LayoutDashboard className="w-5 h-5" /> Trámites Activos
              </Link>
              <Link to="/post-sale" className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold rounded-2xl text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-all">
                <Home className="w-5 h-5" /> Mi Patrimonio
              </Link>
            </nav>
          </div>
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-4">Soporte Integral</h3>
            <nav className="space-y-2">
              <button onClick={() => setActiveModal("legal")} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold rounded-2xl text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-all">
                <LifeBuoy className="w-5 h-5" /> Ayuda Legal
              </button>
              <button onClick={abrirAjustes} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold rounded-2xl text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-all">
                <Settings className="w-5 h-5" /> Integridad y Sesión
              </button>
            </nav>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto">

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 hover:text-primary transition-colors font-bold bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
              <ArrowLeft className="w-4 h-4" /> Trámites
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="font-bold text-foreground">Compra de Inmueble</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6 bg-white p-8 rounded-[2rem] border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
            <div className="z-10">
              <h1 className="text-3xl md:text-4xl font-black text-foreground mb-1 tracking-tight">{t.inmueble.titulo}</h1>
              <p className="text-sm text-muted-foreground font-medium mb-3">{t.inmueble.direccion}</p>
              <div className="flex items-center gap-3">
                <p className="text-base text-muted-foreground font-semibold">{t.etapa === "FINALIZADA" ? "Compra finalizada" : "Proceso de compra en curso"}</p>
                {badge}
              </div>
            </div>
            <div className="md:text-right border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-8 z-10 bg-white/50 backdrop-blur-sm rounded-xl">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Asesor Legal Asignado</p>
              <button className="flex items-center gap-4 md:justify-end bg-gray-50 p-3 rounded-2xl border border-gray-100 cursor-pointer hover:border-primary/30 transition-colors text-left" onClick={() => setActiveModal("legal")}>
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-black shadow-sm border-2 border-white">{(t.gestor?.nombre ?? "?")[0]}</div>
                <div>
                  <p className="font-bold text-sm text-foreground">{t.gestor?.nombre ?? "Sin asignar"}</p>
                  <p className="text-xs text-primary font-semibold">Contactar Asesor</p>
                </div>
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-8">

            {/* Timeline */}
            <div className="lg:col-span-7">
              <Card className="rounded-[2rem] border-gray-200 shadow-sm bg-white overflow-hidden h-full">
                <div className="p-8 md:p-10">
                  <div className="flex items-center justify-between mb-10 gap-4">
                    <h2 className="text-2xl font-black text-foreground">Ruta de Transacción</h2>
                    {esStaff && siguiente && (
                      <Button onClick={avanzar} disabled={avanzando} size="sm" className="rounded-xl">
                        {avanzando ? "Avanzando…" : `Avanzar a: ${t.etapas.find((e) => e.codigo === siguiente)?.titulo}`}
                      </Button>
                    )}
                  </div>
                  {errorAccion && !activeModal && <p role="alert" className="mb-6 text-sm font-semibold text-danger bg-danger/10 rounded-xl px-4 py-3">{errorAccion}</p>}

                  <div className="relative space-y-12 before:absolute before:inset-0 before:ml-[1.4rem] before:-mt-2 before:h-full before:w-[2px] before:bg-gray-100 z-0">
                    {t.etapas.map((e) => {
                      const completada = e.estado === "COMPLETADA";
                      const actual = e.estado === "ACTUAL";
                      const pideFirma = actual && e.codigo === "FIRMA_MINUTA" && !!minutaPendiente && esComprador;
                      return (
                        <div key={e.codigo} className={`relative flex items-start gap-6 z-10 transition-opacity duration-500 ${e.estado === "PENDIENTE" ? "opacity-50 grayscale" : "opacity-100"}`}>
                          <div className={`flex items-center justify-center w-12 h-12 rounded-full shrink-0 ring-4 ring-white shadow-lg ${completada ? "bg-success text-white shadow-success/20" : pideFirma ? "bg-warning text-white shadow-warning/30" : actual ? "bg-white border-2 border-warning text-warning" : "bg-gray-50 border-2 border-gray-300 text-gray-400"}`}>
                            {completada ? <CheckCircle2 className="w-6 h-6" /> : pideFirma ? <PenTool className="w-6 h-6" /> : actual ? <Settings className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                          </div>
                          <div className="w-full pt-2">
                            {pideFirma ? (
                              <div className="p-6 rounded-2xl border-2 border-warning/30 bg-warning/5 shadow-sm animate-in fade-in -mt-2">
                                <h3 className="font-bold text-xl text-foreground mb-2">{e.titulo}</h3>
                                <p className="text-sm text-muted-foreground mb-5 font-medium leading-relaxed">{e.descripcion}</p>
                                <Button onClick={() => { setErrorAccion(null); setActiveModal("sign"); }} className="rounded-xl bg-warning hover:bg-warning/90 text-white shadow-lg shadow-warning/20 font-bold h-12 px-6">
                                  Firmar Documento Ahora
                                </Button>
                              </div>
                            ) : (
                              <>
                                <h3 className="font-bold text-xl text-foreground">{e.titulo}</h3>
                                <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">{e.descripcion}</p>
                                {completada && <p className="text-[11px] font-black uppercase tracking-wider text-success mt-3">Completado • {fecha(e.fecha)}</p>}
                                {actual && <p className="text-[11px] font-black uppercase tracking-wider text-warning mt-3">En curso{e.fecha ? ` • desde ${fecha(e.fecha)}` : ""}</p>}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </div>

            {/* Caja fuerte */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="rounded-[2rem] border-gray-200 shadow-sm bg-white">
                <div className="p-8 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="text-xl font-black text-foreground flex items-center gap-2"><Lock className="w-5 h-5 text-primary" /> Caja Fuerte Digital</h2>
                  <p className="text-sm text-muted-foreground mt-2 font-medium">Documentos cifrados con huella SHA-256 registrada en tu expediente</p>
                </div>
                <CardContent className="p-8 space-y-5">
                  {t.documentos.map((d) => {
                    const pendiente = d.estadoFirma === "PENDIENTE";
                    return (
                      <div key={d.id} className={`group flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${pendiente ? "border-warning/30 bg-warning/5" : "border-gray-200 bg-white hover:border-primary/40"}`}>
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 shrink-0"><FileText className={`w-6 h-6 ${pendiente ? "text-warning" : "text-success"}`} /></div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{d.nombre}</p>
                            <p className={`text-[11px] font-black uppercase tracking-wider mt-1 ${pendiente ? "text-warning" : "text-muted-foreground"}`}>
                              {pendiente ? "Requiere firma" : d.estadoFirma === "FIRMADO" ? `Firmado • ${fecha(d.firmadoEn)}` : `Subido • ${fecha(d.subidoEn)}`}
                            </p>
                          </div>
                        </div>
                        {pendiente && esComprador ? (
                          <Button onClick={() => { setErrorAccion(null); setActiveModal("sign"); }} variant="ghost" size="icon" aria-label={`Firmar ${d.nombre}`} className="text-warning hover:bg-warning/10 rounded-full h-10 w-10 bg-white shadow-sm border border-warning/20"><PenTool className="w-4 h-4" /></Button>
                        ) : (
                          <Button onClick={() => handleDownload(d)} variant="ghost" size="icon" aria-label={`Descargar ${d.nombre}`} className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full h-10 w-10 bg-gray-50"><Download className="w-4 h-4" /></Button>
                        )}
                      </div>
                    );
                  })}
                  <label className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-bold text-muted-foreground hover:border-primary/40 hover:text-primary cursor-pointer transition-colors">
                    <FileUp className="w-4 h-4" /> Subir documento (PDF o imagen)
                    <input type="file" accept="application/pdf,image/png,image/jpeg" className="sr-only" onChange={handleSubir} />
                  </label>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border-gray-200 shadow-sm bg-white">
                <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-black text-foreground">Historial inalterable</h2></div>
                <CardContent className="p-6">
                  <ul className="space-y-3 max-h-64 overflow-y-auto">
                    {[...t.timeline].reverse().map((ev) => (
                      <li key={ev.id} className="text-sm">
                        <p className="font-semibold text-foreground">{ev.descripcion}</p>
                        <p className="text-[11px] text-muted-foreground">{fecha(ev.fecha)} · hash {ev.hash.slice(0, 10)}…</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
