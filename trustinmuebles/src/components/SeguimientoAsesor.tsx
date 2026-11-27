import { useState } from "react";
import { BellRing, CalendarPlus, History, Lock, Phone, Unlock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Campo, claseAreaTexto, claseCampo } from "@/components/base/Campo";
import { useAuth } from "@/lib/auth";
import {
  ETAPAS, FRANJAS, MODALIDADES, etapaBloqueada, fechaCorta, formularioCitaVacio, hoyLima, mostrarAlertaDia, textoAlertaDia,
  textoSeguimientos, validarCitaPanel, cuerpoCitaPanel,
  type CambioDeEtapa, type CitaDelDia, type EtapaInteres, type FormularioCitaPanel, type InteresadoDetalle, type MiDia,
} from "@/lib/interes";
import { fecha } from "@/lib/semaforo";
import { useApi } from "@/lib/useApi";

/*
 * v2.0 (tanda 2): piezas del seguimiento del asesor. El aviso del día (RF37), la cita con tipo y dos fechas (RF35), el
 * historial de etapas (RF36) y la separación del lote con su liberación (RF41, RF42, RN29, RN31). La validación del
 * servidor manda: aquí solo se avisa antes de enviar.
 */

// ------------------------------------------------------------------------------------------------- RF37

/** La alerta grande del día: citas y llamadas de hoy y de mañana, y el contador de seguimientos. */
export function AlertaDelDia({ dia, alCerrar }: { dia: MiDia; alCerrar?: () => void }) {
  if (!mostrarAlertaDia(dia)) return null;
  return (
    <section role="alert" aria-label="Tus citas de hoy y de mañana" data-alerta-dia
      className="rounded-[1.75rem] border-2 border-marca-dorado bg-lote-separado-suave p-5 text-lote-separado-tinta shadow-elevada sm:p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-marca-dorado text-white" aria-hidden="true">
          <BellRing className="size-6" />
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-xl font-black leading-tight sm:text-2xl">{textoAlertaDia(dia)}</p>
          <ListaDelDia titulo="Hoy" citas={dia.hoyCitas} />
          <ListaDelDia titulo="Mañana" citas={dia.proximas} />
          <p className="text-sm font-bold" data-contador-seguimientos>{textoSeguimientos(dia)}</p>
        </div>
        {alCerrar && (
          <button type="button" onClick={alCerrar} aria-label="Ocultar el aviso por hoy"
            className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-white/60">
            <X className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}

function ListaDelDia({ titulo, citas }: { titulo: string; citas: CitaDelDia[] }) {
  if (citas.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider">{titulo}</p>
      <ul className="mt-1 space-y-1 text-sm font-semibold">
        {citas.map((c) => (
          <li key={`${c.cita.id}-${c.fecha}`} className="flex flex-wrap items-center gap-1.5" data-cita-dia={c.cita.id}>
            {c.cita.modalidad === "LLAMADA" && <Phone className="size-4" aria-hidden="true" />}
            <span>{c.cita.modalidadEtiqueta} · {c.franjaEtiqueta.toLowerCase()} · {c.cita.nombre ?? "Interesado"}</span>
            {c.porConfirmar && <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs">por confirmar</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

const CLAVE_OCULTO = "trustin.aviso-dia-oculto";

/**
 * El aviso al entrar: solo para cuentas del equipo comercial (asesor y gestor). Se puede ocultar por el resto del día;
 * al día siguiente vuelve a salir si hay citas.
 */
export function AvisoDelDia() {
  const { usuario } = useAuth();
  const equipo = usuario?.rol === "ASESOR" || usuario?.rol === "GESTOR";
  const { data } = useApi<MiDia>(equipo ? "/interesados/mi-dia" : null);
  const [oculto, setOculto] = useState(() =>
    typeof window !== "undefined" && window.sessionStorage?.getItem(CLAVE_OCULTO) === hoyLima());
  if (!equipo || !data || oculto) return null;
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6 lg:px-8">
      <AlertaDelDia dia={data} alCerrar={() => { window.sessionStorage?.setItem(CLAVE_OCULTO, data.hoy); setOculto(true); }} />
    </div>
  );
}

// ------------------------------------------------------------------------------------------------- RF35

/** Agendar una cita: tipo, fecha principal y, si el cliente la pidió, una fecha opcional. */
export function FormularioCita({ ocupado, alAgendar, hoy = hoyLima() }: {
  ocupado: boolean; alAgendar: (cuerpo: Record<string, string>) => Promise<boolean>; hoy?: string;
}) {
  const [f, setF] = useState<FormularioCitaPanel>(formularioCitaVacio);
  const [error, setError] = useState<string | null>(null);
  const enviar = async () => {
    const e = validarCitaPanel(f, hoy);
    setError(e);
    if (e) return;
    if (await alAgendar(cuerpoCitaPanel(f))) setF(formularioCitaVacio());
  };
  return (
    <fieldset className="grid gap-4 rounded-2xl border border-border p-4 sm:grid-cols-2" data-formulario-cita>
      <legend className="flex items-center gap-1.5 px-2 text-sm font-bold text-foreground">
        <CalendarPlus className="size-4 text-primary" aria-hidden="true" /> Agendar cita
      </legend>
      <Campo etiqueta="Tipo" className="sm:col-span-2">
        {(p) => <select {...p} className={claseCampo} value={f.tipo} name="tipo"
          onChange={(e) => setF({ ...f, tipo: e.target.value as FormularioCitaPanel["tipo"] })}>
          <option value="">Elige el tipo</option>
          {MODALIDADES.map((m) => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
        </select>}
      </Campo>
      <Campo etiqueta="Fecha principal">
        {(p) => <input {...p} type="date" name="fecha" min={hoy} className={claseCampo} value={f.fecha}
          onChange={(e) => setF({ ...f, fecha: e.target.value })} />}
      </Campo>
      <Campo etiqueta="Franja">
        {(p) => <select {...p} className={claseCampo} value={f.franja} onChange={(e) => setF({ ...f, franja: e.target.value as FormularioCitaPanel["franja"] })}>
          {FRANJAS.map((x) => <option key={x.valor} value={x.valor}>{x.etiqueta}</option>)}
        </select>}
      </Campo>
      <Campo etiqueta="Fecha opcional" ayuda="La alternativa que pidió el cliente (opcional).">
        {(p) => <input {...p} type="date" name="fechaOpcional" min={hoy} className={claseCampo} value={f.fechaOpcional}
          onChange={(e) => setF({ ...f, fechaOpcional: e.target.value })} />}
      </Campo>
      <Campo etiqueta="Franja opcional">
        {(p) => <select {...p} className={claseCampo} value={f.franjaOpcional} disabled={!f.fechaOpcional}
          onChange={(e) => setF({ ...f, franjaOpcional: e.target.value as FormularioCitaPanel["franjaOpcional"] })}>
          {FRANJAS.map((x) => <option key={x.valor} value={x.valor}>{x.etiqueta}</option>)}
        </select>}
      </Campo>
      {error && <p role="alert" className="text-sm font-semibold text-sem-rojo-tinta sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <Button type="button" variant="outline" disabled={ocupado} onClick={() => void enviar()}>Agendar cita</Button>
      </div>
    </fieldset>
  );
}

// ------------------------------------------------------------------------------------------------- RF36

/** Cada cambio de etapa con quién lo hizo y cuándo (y el motivo, si fue una liberación). */
export function HistorialEtapas({ historial }: { historial: CambioDeEtapa[] | undefined }) {
  if (!historial || historial.length === 0) return null;
  return (
    <section aria-labelledby="titulo-historial-etapas" className="space-y-2">
      <h3 id="titulo-historial-etapas" className="flex items-center gap-1.5 font-bold text-foreground">
        <History className="size-4 text-primary" aria-hidden="true" /> Historial de etapas
      </h3>
      <ol className="space-y-1.5 text-sm" data-historial-etapas>
        {historial.map((h, n) => (
          <li key={n} className="rounded-xl border border-border bg-superficie px-3 py-2">
            <span className="font-semibold text-foreground">{h.desdeEtiqueta} → {h.haciaEtiqueta}</span>
            <span className="text-tinta-2"> · {h.cuentaCodigo} · {fecha(h.registradoEn)}</span>
            {h.motivo && <span className="block text-tinta-2">Motivo: {h.motivo}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------- RF41, RF42, RN29, RN31

/** La separación o venta vigente y, si se puede, liberarla con motivo (el lote vuelve a estar disponible). */
export function PanelSeparacion({ d, ocupado, alLiberar }: {
  d: Pick<InteresadoDetalle, "separacion" | "puedeLiberar" | "descartes" | "interes">; ocupado: boolean;
  alLiberar: (motivo: string, etapa: EtapaInteres) => Promise<boolean>;
}) {
  const [motivo, setMotivo] = useState("");
  const [etapa, setEtapa] = useState<EtapaInteres>("DESCARTADO");
  if (!d.separacion) return null;
  const vendida = d.separacion.estado === "VENDIDA";
  return (
    <section aria-labelledby="titulo-separacion" className="space-y-3 rounded-2xl border border-border p-4" data-panel-separacion={d.separacion.estado}>
      <h3 id="titulo-separacion" className="flex items-center gap-1.5 font-bold text-foreground">
        <Lock className="size-4 text-marca-dorado" aria-hidden="true" />
        {d.interes.referencia ?? "El lote"} está {vendido(vendida, d.separacion.conDeposito)} para este interesado
      </h3>
      <p className="text-sm text-tinta-2">
        Desde el {fechaCorta(d.separacion.creadaEn.slice(0, 10))} · registró {d.separacion.creadaPor}. Se ve así en el plano para todos.
        {(d.descartes ?? 0) > 0 && ` Separaciones liberadas antes: ${d.descartes}.`}
      </p>
      {etapaBloqueada(d) ? (
        <p className="text-sm font-semibold text-foreground" data-venta-firme>
          Una venta con depósito no se retrotrae: la etapa y el estado del lote quedan fijos.
        </p>
      ) : d.puedeLiberar ? (
        <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
          <Campo etiqueta="Motivo de la liberación" ayuda="Queda con la fecha y tu cuenta. El lote vuelve a estar disponible.">
            {(p) => <textarea {...p} className={claseAreaTexto} maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
          </Campo>
          <Campo etiqueta="Etapa del interesado">
            {(p) => <select {...p} className={claseCampo} value={etapa} onChange={(e) => setEtapa(e.target.value as EtapaInteres)}>
              {ETAPAS.filter((x) => x.valor !== "SEPARACION" && x.valor !== "VENTA").map((x) => <option key={x.valor} value={x.valor}>{x.etiqueta}</option>)}
            </select>}
          </Campo>
          <div className="sm:col-span-2">
            <Button type="button" variant="outline" disabled={ocupado || motivo.trim().length < 3}
              onClick={() => void alLiberar(motivo.trim(), etapa).then((ok) => ok && setMotivo(""))}>
              <Unlock aria-hidden="true" /> Liberar {vendida ? "la venta" : "la separación"}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

const vendido = (vendida: boolean, deposito: boolean) =>
  vendida ? (deposito ? "vendido con depósito" : "vendido (sin depósito)") : "separado";
