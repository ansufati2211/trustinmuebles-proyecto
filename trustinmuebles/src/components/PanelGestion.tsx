import { useState, type FormEvent } from "react";
import { Info, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { claseCampo } from "@/components/base/Campo";
import { ChipEsfuerzo } from "@/components/RutaRegularizacion";
import { post } from "@/lib/api";
import { nombreTipoAlerta } from "@/lib/cartera";
import { AVISO_GESTION, ETIQUETA_DECISION, ETIQUETA_MOTIVO_DECISION, GESTION } from "@/lib/gestion";
import { fechaHora } from "@/lib/historial";
import { ordenarPorEsfuerzo } from "@/lib/ruta";
import { useApi } from "@/lib/useApi";
import type {
  DecisionCaptacion, DecisionCaptacionTipo, EstadoGestion, GestionInmobiliaria, MotivoDecision, RutaRegularizacion, TipoAlerta,
} from "@/lib/types";

/** Chip del semáforo de gestión: contorno sin fondo y otro ícono, para no confundirlo con el indicador A (I15). */
export function ChipGestion({ estado, tamano = "sm" }: { estado: EstadoGestion; tamano?: "sm" | "md" }) {
  const g = GESTION[estado];
  return (
    <span
      title={`Gestión interna: ${g.etiqueta}`}
      className={`inline-flex items-center gap-1.5 rounded-full border-2 border-dashed bg-transparent font-bold ${g.contorno} ${
        tamano === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3.5 py-1 text-sm"
      }`}
    >
      <g.Icono className={tamano === "sm" ? "size-3.5" : "size-4"} aria-hidden="true" />
      Gestión: {g.etiqueta}
    </span>
  );
}

/**
 * Panel «Gestión inmobiliaria (interno)» del detalle (v0.8, D54). Solo para el gestor y el revisor: integra el estado de
 * gestión, los tipos de alerta, el resumen de la ruta, la decisión de captación (solo el gestor la registra) y su
 * historial. No cambia A ni B y no se muestra al comprador, al propietario ni al especialista (I15).
 */
export function PanelGestion({ codigo, gestion, esGestor }: { codigo: string; gestion: GestionInmobiliaria; esGestor: boolean }) {
  const ruta = useApi<RutaRegularizacion>(`/casos/${codigo}/ruta-regularizacion`);
  const tipos = useApi<TipoAlerta[]>("/casos/tipos-alerta");
  const decisiones = useApi<DecisionCaptacion[]>(`/casos/${codigo}/decisiones-captacion`);
  const [decision, setDecision] = useState<DecisionCaptacionTipo | "">("");
  const [motivo, setMotivo] = useState<MotivoDecision | "">("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const g = GESTION[gestion.estado];

  const registrar = async (e: FormEvent) => {
    e.preventDefault();
    if (!decision || !motivo) return;
    setEnviando(true);
    setMensaje(null);
    try {
      await post(`/casos/${codigo}/decision-captacion`, { decision, motivo });
      setMensaje({ tipo: "ok", texto: `Decisión registrada: ${ETIQUETA_DECISION[decision]} (${ETIQUETA_MOTIVO_DECISION[motivo]}).` });
      setDecision("");
      setMotivo("");
      decisiones.reload();
    } catch (err) {
      setMensaje({ tipo: "error", texto: err instanceof Error ? err.message : "No se pudo registrar la decisión" });
    } finally {
      setEnviando(false);
    }
  };

  const pasos = ruta.data ? ordenarPorEsfuerzo(ruta.data.items).slice(0, 4) : [];
  const historial = decisiones.data ?? [];

  return (
    <section
      id="ex-gestion"
      aria-labelledby="titulo-gestion"
      className="scroll-mt-28 space-y-5 rounded-[2rem] border-2 border-dashed border-border bg-card p-6 shadow-tarjeta sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="titulo-gestion" className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-foreground">
          <Lock className="size-5 text-primary" aria-hidden="true" /> Gestión inmobiliaria (interno)
        </h2>
        <ChipGestion estado={gestion.estado} tamano="md" />
      </div>
      <p className="flex items-start gap-2 rounded-2xl border border-info-tinta/20 bg-info-suave p-3 text-sm font-semibold text-info-tinta">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {gestion.aviso || AVISO_GESTION}
      </p>

      <div className={`rounded-2xl border-2 p-4 ${g.contorno}`}>
        <p className="flex items-center gap-2 font-extrabold"><g.Icono className="size-5" aria-hidden="true" /> {gestion.etiqueta}</p>
        <p className="mt-1 text-sm text-foreground">{gestion.explicacion}</p>
        <p className="mt-2 text-sm font-semibold text-foreground">Sugerencia: {gestion.sugerencia}</p>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-foreground">Tipos de alerta del caso</h3>
        {ruta.data && ruta.data.tiposAlerta.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {ruta.data.tiposAlerta.map((t) => (
              <li key={t} className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground">
                {nombreTipoAlerta(t, tipos.data)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-tinta-2">Sin alertas en los campos evaluados.</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground">Resumen de la ruta de regularización</h3>
          {ruta.data && ruta.data.items.length > 0 && <ChipEsfuerzo esfuerzo={ruta.data.esfuerzo} />}
        </div>
        {pasos.length === 0 ? (
          <p className="text-sm text-tinta-2">{ruta.data?.mensaje ?? "No hay pasos de regularización."}</p>
        ) : (
          <ul className="space-y-2">
            {pasos.map((p, i) => (
              <li key={`${p.clave}-${p.referencia ?? i}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-superficie p-3 text-sm">
                <span className="min-w-0 font-semibold text-foreground">
                  {p.titulo}{p.referencia ? ` · ${p.referencia}` : ""}
                  {p.gravamen && <span className="block text-xs font-medium text-tinta-2">{p.gravamen.plazo}</span>}
                </span>
                <ChipEsfuerzo esfuerzo={p.esfuerzo} />
              </li>
            ))}
          </ul>
        )}
        <a href="#ex-ruta" className="text-xs font-bold text-primary hover:underline">Ver la ruta completa</a>
      </div>

      {esGestor && (
        <form onSubmit={registrar} className="space-y-3 rounded-2xl border border-border bg-superficie p-4" aria-label="Registrar la decisión de captación">
          <h3 className="text-sm font-bold text-foreground">Decisión de captación</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="g-decision" className="mb-1 block text-xs font-bold text-tinta-2">Decisión</label>
              <select id="g-decision" className={claseCampo} value={decision} onChange={(e) => setDecision(e.target.value as DecisionCaptacionTipo)}>
                <option value="">Elegir…</option>
                {(Object.keys(ETIQUETA_DECISION) as DecisionCaptacionTipo[]).map((d) => <option key={d} value={d}>{ETIQUETA_DECISION[d]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="g-motivo" className="mb-1 block text-xs font-bold text-tinta-2">Motivo</label>
              <select id="g-motivo" className={claseCampo} value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoDecision)}>
                <option value="">Elegir…</option>
                {(Object.keys(ETIQUETA_MOTIVO_DECISION) as MotivoDecision[]).map((m) => <option key={m} value={m}>{ETIQUETA_MOTIVO_DECISION[m]}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-tinta-2">Sin texto libre. La decisión no cambia los indicadores ni impide publicar.</p>
          <Button type="submit" size="sm" disabled={!decision || !motivo || enviando}>
            {enviando ? "Registrando…" : "Registrar decisión"}
          </Button>
          {mensaje && (
            <p role={mensaje.tipo === "error" ? "alert" : "status"}
              className={`text-sm font-semibold ${mensaje.tipo === "error" ? "text-sem-rojo-tinta" : "text-sem-verde-tinta"}`}>
              {mensaje.texto}
            </p>
          )}
        </form>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-foreground">Historial de decisiones</h3>
        {decisiones.error ? (
          <p role="alert" className="text-sm font-semibold text-sem-rojo-tinta">{decisiones.error.message}</p>
        ) : historial.length === 0 ? (
          <p className="text-sm text-tinta-2">Aún no hay decisiones registradas.</p>
        ) : (
          <ol className="space-y-2">
            {[...historial].reverse().map((d) => (
              <li key={d.id} className="rounded-xl border border-border bg-superficie p-3 text-sm">
                <span className="font-bold text-foreground">{d.decisionEtiqueta}</span>
                <span className="text-tinta-2"> · {d.motivoEtiqueta}</span>
                <span className="block text-xs text-tinta-2">{d.cuentaCodigo} · {fechaHora(d.registradaEn)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
