import { useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock, ExternalLink, HardHat, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { campo } from "@/components/FilasAsientos";
import { abrirPdf, api, post, put } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  ETIQUETA_ESPECIALIDAD, ETIQUETA_ESTADO_TECNICO, ETIQUETA_RESULTADO, ETIQUETA_VERIFICACION, PROCEDIMIENTO_INSPECCION, fecha,
} from "@/lib/semaforo";
import type { DetalleCaso, EstadoTecnico, ResultadoTecnico, VerificacionCampo } from "@/lib/types";

const RESULTADO_ESTILO: Record<ResultadoTecnico, { Icono: typeof CheckCircle2; clases: string }> = {
  FAVORABLE: { Icono: CheckCircle2, clases: "border-success/30 bg-success/10 text-[#15803D]" },
  CON_OBSERVACIONES: { Icono: AlertTriangle, clases: "border-warning/40 bg-warning/10 text-[#B45309]" },
  CON_RIESGO: { Icono: ShieldAlert, clases: "border-danger/30 bg-danger/10 text-[#B91C1C]" },
};

/** Insignia del indicador B. Se usa en la cabecera del expediente y en el listado. */
export function InsigniaTecnica({ estado, resultado, className = "" }: { estado: EstadoTecnico; resultado?: ResultadoTecnico | null; className?: string }) {
  const texto = estado === "EMITIDO" && resultado ? `Informe: ${ETIQUETA_RESULTADO[resultado]}` : ETIQUETA_ESTADO_TECNICO[estado];
  const clases = estado === "EMITIDO" && resultado ? RESULTADO_ESTILO[resultado].clases : "border-gray-200 bg-gray-50 text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider ${clases} ${className}`}>
      <HardHat className="w-4 h-4 mr-1.5" aria-hidden="true" /> Evaluación técnica: {texto}
    </span>
  );
}

const VERIFICACIONES: { clave: "verifArquitectura" | "verifEstructuras" | "verifElectricas" | "verifSanitarias"; especialidad: keyof typeof ETIQUETA_ESPECIALIDAD }[] = [
  { clave: "verifArquitectura", especialidad: "ARQUITECTURA" },
  { clave: "verifEstructuras", especialidad: "ESTRUCTURAS" },
  { clave: "verifElectricas", especialidad: "ELECTRICAS" },
  { clave: "verifSanitarias", especialidad: "SANITARIAS" },
];

function FormularioInforme({ detalle, alCambiar }: { detalle: DetalleCaso; alCambiar: (d: DetalleCaso) => void }) {
  const t = detalle.evaluacionTecnica;
  const [estado, setEstado] = useState<"EN_INSPECCION" | "EMITIDO">(t.estado === "EMITIDO" ? "EMITIDO" : "EN_INSPECCION");
  const [resultado, setResultado] = useState<ResultadoTecnico | "">(t.resultado ?? "");
  const [profesional, setProfesional] = useState(t.profesional ?? "");
  const [colegiatura, setColegiatura] = useState(t.colegiatura ?? "");
  const [fechaInspeccion, setFechaInspeccion] = useState(t.fechaInspeccion ?? "");
  const [verif, setVerif] = useState<Record<string, VerificacionCampo | "">>({
    verifArquitectura: t.verifArquitectura ?? "", verifEstructuras: t.verifEstructuras ?? "",
    verifElectricas: t.verifElectricas ?? "", verifSanitarias: t.verifSanitarias ?? "",
  });
  const [observaciones, setObservaciones] = useState(t.observaciones ?? "");
  const [conclusiones, setConclusiones] = useState(t.conclusiones ?? "");
  const [estudios, setEstudios] = useState(t.estudiosAdicionales ?? "");
  const [errores, setErrores] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrores([]); setMensaje(null); setGuardando(true);
    try {
      const nuevo = await put<DetalleCaso>(`/casos/${detalle.codigo}/inspeccion`, {
        estado, resultado: resultado || null, profesional: profesional.trim() || null, colegiatura: colegiatura.trim() || null,
        fechaInspeccion: fechaInspeccion || null,
        verifArquitectura: verif.verifArquitectura || null, verifEstructuras: verif.verifEstructuras || null,
        verifElectricas: verif.verifElectricas || null, verifSanitarias: verif.verifSanitarias || null,
        observaciones: observaciones.trim() || null, conclusiones: conclusiones.trim() || null,
        estudiosAdicionales: estudios.trim() || null,
      });
      alCambiar(nuevo);
      setMensaje(estado === "EMITIDO" ? "Informe emitido. El semáforo documental no cambió." : "Inspección en curso guardada.");
    } catch (err) {
      setErrores((err instanceof Error ? err.message : "No se pudo guardar el informe").split("; "));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} noValidate className="mt-6 pt-6 border-t border-gray-100 space-y-4" aria-label="Informe técnico del especialista">
      <h3 className="font-bold text-foreground">Informe técnico (solo el especialista lo llena)</h3>
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="it-estado" className="block text-xs font-bold text-muted-foreground mb-1">Estado</label>
          <select id="it-estado" className={campo} value={estado} onChange={(e) => setEstado(e.target.value as "EN_INSPECCION" | "EMITIDO")}>
            <option value="EN_INSPECCION">En inspección</option>
            <option value="EMITIDO">Informe emitido</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="it-resultado" className="block text-xs font-bold text-muted-foreground mb-1">Conclusión del informe</label>
          <select id="it-resultado" className={campo} value={resultado} onChange={(e) => setResultado(e.target.value as ResultadoTecnico | "")}>
            <option value="">Elegir (al emitir)</option>
            {(Object.keys(ETIQUETA_RESULTADO) as ResultadoTecnico[]).map((r) => <option key={r} value={r}>{ETIQUETA_RESULTADO[r]}</option>)}
          </select>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="it-profesional" className="block text-xs font-bold text-muted-foreground mb-1">Profesional</label>
          <input id="it-profesional" className={campo} maxLength={120} value={profesional} onChange={(e) => setProfesional(e.target.value)} />
        </div>
        <div>
          <label htmlFor="it-colegiatura" className="block text-xs font-bold text-muted-foreground mb-1">Colegiatura (CIP o CAP)</label>
          <input id="it-colegiatura" className={campo} maxLength={40} value={colegiatura} onChange={(e) => setColegiatura(e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor="it-fecha" className="block text-xs font-bold text-muted-foreground mb-1">Fecha de la inspección presencial</label>
        <input id="it-fecha" type="date" className={`${campo} sm:max-w-xs`} value={fechaInspeccion} onChange={(e) => setFechaInspeccion(e.target.value)} />
      </div>
      <fieldset className="grid sm:grid-cols-2 gap-4">
        <legend className="text-xs font-bold text-muted-foreground mb-1">Verificación en campo, por especialidad</legend>
        {VERIFICACIONES.map(({ clave, especialidad }) => (
          <div key={clave}>
            <label htmlFor={`it-${clave}`} className="block text-xs font-bold text-muted-foreground mb-1">{ETIQUETA_ESPECIALIDAD[especialidad]}</label>
            <select id={`it-${clave}`} className={campo} value={verif[clave]} onChange={(e) => setVerif({ ...verif, [clave]: e.target.value as VerificacionCampo | "" })}>
              <option value="">Elegir</option>
              {(Object.keys(ETIQUETA_VERIFICACION) as VerificacionCampo[]).map((v) => <option key={v} value={v}>{ETIQUETA_VERIFICACION[v]}</option>)}
            </select>
          </div>
        ))}
      </fieldset>
      <div>
        <label htmlFor="it-obs" className="block text-xs font-bold text-muted-foreground mb-1">Observaciones y deficiencias físicas detectadas</label>
        <textarea id="it-obs" rows={3} maxLength={1500} className={`${campo} h-auto py-2`} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </div>
      <div>
        <label htmlFor="it-conc" className="block text-xs font-bold text-muted-foreground mb-1">Conclusiones sustentadas por la inspección</label>
        <textarea id="it-conc" rows={3} maxLength={1500} className={`${campo} h-auto py-2`} value={conclusiones} onChange={(e) => setConclusiones(e.target.value)} />
      </div>
      <div>
        <label htmlFor="it-est" className="block text-xs font-bold text-muted-foreground mb-1">Estudios adicionales requeridos</label>
        <textarea id="it-est" rows={2} maxLength={1000} className={`${campo} h-auto py-2`} value={estudios} onChange={(e) => setEstudios(e.target.value)} />
      </div>
      {errores.length > 0 && (
        <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 p-4">
          <p className="font-bold text-[#B91C1C] mb-1">No se guardó el informe</p>
          <ul className="list-disc pl-5 text-sm text-[#B91C1C] space-y-1">{errores.map((m, i) => <li key={i}>{m}</li>)}</ul>
        </div>
      )}
      {mensaje && <p role="status" className="rounded-2xl border border-success/30 bg-success/10 p-4 text-sm font-semibold text-foreground">{mensaje}</p>}
      <Button type="submit" disabled={guardando} className="rounded-xl">{guardando ? "Guardando…" : "Guardar informe"}</Button>
    </form>
  );
}

/** Indicador B: la verificación física que hace un profesional en el inmueble. Es independiente del semáforo documental. */
export function PanelEvaluacionTecnica({ detalle, alCambiar }: { detalle: DetalleCaso; alCambiar: (d: DetalleCaso) => void }) {
  const { usuario } = useAuth();
  const t = detalle.evaluacionTecnica;
  const [error, setError] = useState<string | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  const verInforme = async () => {
    setError(null);
    try { await abrirPdf(`/casos/${detalle.codigo}/inspeccion/documento`); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo abrir el informe"); }
  };
  const esEspecialista = usuario?.rol === "ESPECIALISTA";

  const solicitar = async () => {
    setError(null); setPidiendo(true);
    try {
      await post(`/casos/${detalle.codigo}/inspeccion/solicitud`);
      alCambiar(await api<DetalleCaso>(`/casos/${detalle.codigo}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo solicitar la inspección");
    } finally {
      setPidiendo(false);
    }
  };

  return (
    <Card className="rounded-3xl border-gray-100 shadow-sm" id="evaluacion-tecnica">
      <CardContent className="p-8">
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground mb-2">
          <ClipboardCheck className="w-5 h-5 text-primary" aria-hidden="true" /> Evaluación técnica por especialista (Indicador B)
        </h2>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          Un plano o un documento no demuestra que una estructura o una instalación estén bien hoy. Eso solo lo comprueba un
          ingeniero o arquitecto colegiado en el inmueble. Este indicador es independiente del semáforo documental y no lo cambia.
        </p>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <InsigniaTecnica estado={t.estado} resultado={t.resultado} />
          {t.fechaSolicitud && <span className="text-sm text-muted-foreground">Solicitada el {fecha(t.fechaSolicitud)}</span>}
        </div>
        <p className="text-sm font-semibold text-foreground rounded-2xl bg-gray-50 border border-gray-200 p-4 mb-5">{t.limite}</p>

        {t.estado === "NO_SOLICITADA" && (
          <div className="mb-5">
            <Button className="rounded-xl" onClick={solicitar} disabled={pidiendo}>
              <HardHat className="w-4 h-4" aria-hidden="true" /> {pidiendo ? "Solicitando…" : "Solicitar inspección técnica presencial"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">La solicitud deja constancia; no cobra ni agenda la visita.</p>
          </div>
        )}
        {t.estado === "SOLICITADA" && (
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground mb-5">
            <Clock className="w-4 h-4 text-muted-foreground" aria-hidden="true" /> Solicitada: espera la visita del especialista.
          </p>
        )}
        {error && <p role="alert" className="mb-4 text-sm font-semibold text-[#B91C1C]">{error}</p>}

        {(t.estado === "EN_INSPECCION" || t.estado === "EMITIDO") && (
          <div className="space-y-4 mb-5" aria-label="Resumen del informe técnico">
            {t.estado === "EMITIDO" && t.resultado && (() => {
              const { Icono, clases } = RESULTADO_ESTILO[t.resultado];
              return (
                <p className={`flex items-center gap-2 rounded-2xl border px-4 py-3 font-bold ${clases}`}>
                  <Icono className="w-5 h-5" aria-hidden="true" /> Informe técnico: {ETIQUETA_RESULTADO[t.resultado]}
                </p>
              );
            })()}
            <p className="text-sm text-foreground">
              {t.profesional ? `${t.profesional}` : "Profesional por asignar"}{t.colegiatura ? ` · ${t.colegiatura}` : ""}
              {t.fechaInspeccion ? ` · Inspección del ${fecha(t.fechaInspeccion)}` : ""}
            </p>
            <ul className="grid sm:grid-cols-2 gap-2 text-sm">
              {VERIFICACIONES.map(({ clave, especialidad }) => (
                <li key={clave} className="flex justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2">
                  <span className="text-muted-foreground">{ETIQUETA_ESPECIALIDAD[especialidad]}</span>
                  <span className="font-bold text-foreground">{t[clave] ? ETIQUETA_VERIFICACION[t[clave]!] : "Sin verificar"}</span>
                </li>
              ))}
            </ul>
            {t.observaciones && <p className="text-sm"><span className="font-bold">Observaciones: </span>{t.observaciones}</p>}
            {t.conclusiones && <p className="text-sm"><span className="font-bold">Conclusiones: </span>{t.conclusiones}</p>}
            {t.estudiosAdicionales && <p className="text-sm"><span className="font-bold">Estudios adicionales: </span>{t.estudiosAdicionales}</p>}
            {t.estado === "EMITIDO" && (
              <Button variant="outline" className="rounded-xl" onClick={verInforme}>
                Ver informe técnico (PDF) <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        )}

        <details className="group rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
          <summary className="cursor-pointer font-bold text-foreground">Procedimiento de la inspección (6 pasos)</summary>
          <ol className="mt-3 space-y-3 list-decimal pl-5 text-sm leading-relaxed">
            {PROCEDIMIENTO_INSPECCION.map((p) => (
              <li key={p.titulo}><span className="font-bold text-foreground">{p.titulo}. </span><span className="text-muted-foreground">{p.texto}</span></li>
            ))}
          </ol>
        </details>

        {esEspecialista && t.estado !== "NO_SOLICITADA" && <FormularioInforme key={detalle.codigo} detalle={detalle} alCambiar={alCambiar} />}
        {esEspecialista && t.estado === "NO_SOLICITADA" && (
          <p className="mt-4 text-sm text-muted-foreground">Aún no hay una solicitud: el informe se puede llenar cuando alguien la pida.</p>
        )}
      </CardContent>
    </Card>
  );
}
