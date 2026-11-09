import { campo } from "@/components/FilasAsientos";
import { puedeMarcarPresentado } from "@/lib/archivos";
import {
  DOCUMENTOS_LOTE, EFECTO_DOCUMENTO_LOTE, ESPECIALIDADES, ETIQUETA_DOCUMENTO_LOTE, ETIQUETA_ESPECIALIDAD,
  ETIQUETA_ESTADO_PLANO, ETIQUETA_PREDIO, ETIQUETA_SISTEMA, QUE_VALIDA,
} from "@/lib/semaforo";
import type {
  DocumentoLote, DocumentoLotePeticion, DocumentoLoteTipo, Especialidad, EstadoPlano, Expediente, Plano, PlanoPeticion,
  SistemaConstructivo, TipoPredio,
} from "@/lib/types";

/** Un plano del formulario. El estado es documental: dice si el plano está, no si la obra está bien. */
export interface PlanoFila { estado: EstadoPlano; area: string; sistema: SistemaConstructivo | ""; observacion: string }

/** v0.9: un documento del lote en el formulario: su estado documental y una observación. */
export interface DocumentoFila { estado: EstadoPlano; observacion: string }

export interface Tecnico {
  tipoPredio: TipoPredio; areaInscrita: string; planos: Record<Especialidad, PlanoFila>;
  /** v0.9: solo al editar un expediente existente. Al registrar una partida los documentos se suben después. */
  documentos?: Record<DocumentoLoteTipo, DocumentoFila>;
}

const FILA_VACIA: PlanoFila = { estado: "NO_PRESENTADO", area: "", sistema: "", observacion: "" };

export const TECNICO_VACIO: Tecnico = {
  tipoPredio: "LOTE", areaInscrita: "",
  planos: { ARQUITECTURA: FILA_VACIA, ESTRUCTURAS: FILA_VACIA, ELECTRICAS: FILA_VACIA, SANITARIAS: FILA_VACIA },
};

export function tecnicoDesde(x: Expediente): Tecnico {
  const planos = { ...TECNICO_VACIO.planos };
  for (const p of x.planos) {
    planos[p.especialidad] = {
      estado: p.estado, area: p.areaConstruida == null ? "" : String(p.areaConstruida),
      sistema: p.sistemaConstructivo ?? "", observacion: p.observacion ?? "",
    };
  }
  const documentos = Object.fromEntries(DOCUMENTOS_LOTE.map((t) => [t, { estado: "NO_PRESENTADO", observacion: "" }])) as
    Record<DocumentoLoteTipo, DocumentoFila>;
  for (const d of x.documentosLote ?? []) documentos[d.tipo] = { estado: d.estado, observacion: d.observacion ?? "" };
  return {
    tipoPredio: x.tipoPredio, areaInscrita: x.areaConstruidaInscrita == null ? "" : String(x.areaConstruidaInscrita),
    planos, documentos,
  };
}

/**
 * Un lote no lleva planos de edificación: se envía el tipo y, al editar, sus documentos (v0.9). Una vivienda envía sus
 * cuatro planos.
 */
export function tecnicoAPeticion(t: Tecnico): {
  tipoPredio: TipoPredio; areaConstruidaInscrita: number | null; planos: PlanoPeticion[];
  documentosLote?: DocumentoLotePeticion[];
} {
  if (t.tipoPredio === "LOTE") {
    const base = { tipoPredio: "LOTE" as const, areaConstruidaInscrita: null, planos: [] };
    if (!t.documentos) return base;
    const docs = t.documentos;
    return {
      ...base,
      documentosLote: DOCUMENTOS_LOTE.map((tipo) => ({
        tipo, estado: docs[tipo].estado, observacion: docs[tipo].observacion.trim() || null,
      })),
    };
  }
  return {
    tipoPredio: "VIVIENDA",
    areaConstruidaInscrita: t.areaInscrita.trim() === "" ? null : Number(t.areaInscrita),
    planos: ESPECIALIDADES.map((e) => {
      const f = t.planos[e];
      const hay = f.estado === "PRESENTADO" || f.estado === "OBSERVADO";
      return {
        especialidad: e, estado: f.estado,
        areaConstruida: hay && e === "ARQUITECTURA" && f.area.trim() !== "" ? Number(f.area) : null,
        sistemaConstructivo: hay && e === "ESTRUCTURAS" && f.sistema !== "" ? f.sistema : null,
        observacion: f.observacion.trim() || null,
      };
    }),
  };
}

/**
 * Tipo de predio, área construida inscrita y los 4 planos. Lo usan el editor y el registro de partidas. v0.8:
 * «Presentado» y «Observado» solo se pueden elegir si el plano ya tiene su PDF (o ya estaba presentado); al registrar
 * una partida aún no hay archivos, así que los planos se presentan después, subiendo su PDF.
 */
export function BloqueTecnico({ tecnico, setTecnico, planosGuardados = [], documentosGuardados = [] }: {
  tecnico: Tecnico; setTecnico: (t: Tecnico) => void; planosGuardados?: Plano[]; documentosGuardados?: DocumentoLote[];
}) {
  const cambiar = (e: Especialidad, parcial: Partial<PlanoFila>) =>
    setTecnico({ ...tecnico, planos: { ...tecnico.planos, [e]: { ...tecnico.planos[e], ...parcial } } });
  const cambiarDocumento = (d: DocumentoLoteTipo, parcial: Partial<DocumentoFila>) => {
    if (!tecnico.documentos) return;
    setTecnico({ ...tecnico, documentos: { ...tecnico.documentos, [d]: { ...tecnico.documentos[d], ...parcial } } });
  };

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-bold mb-1">Expediente técnico de planos</legend>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="bt-tipo" className="block text-sm font-bold mb-1.5">Tipo de predio</label>
          <select id="bt-tipo" className={campo} value={tecnico.tipoPredio}
            onChange={(e) => setTecnico({ ...tecnico, tipoPredio: e.target.value as TipoPredio })}>
            {(Object.keys(ETIQUETA_PREDIO) as TipoPredio[]).map((t) => <option key={t} value={t}>{ETIQUETA_PREDIO[t]}</option>)}
          </select>
        </div>
        {tecnico.tipoPredio === "VIVIENDA" && (
          <div>
            <label htmlFor="bt-area-inscrita" className="block text-sm font-bold mb-1.5">Área construida inscrita (m²)</label>
            <input id="bt-area-inscrita" type="number" step="0.01" min="0" className={campo} value={tecnico.areaInscrita}
              onChange={(e) => setTecnico({ ...tecnico, areaInscrita: e.target.value })} />
          </div>
        )}
      </div>
      {tecnico.tipoPredio === "LOTE" && (
        <p className="text-xs text-muted-foreground">
          Un lote no lleva planos de edificación. Elige «Vivienda» para registrar los 4 planos.{" "}
          {tecnico.documentos
            ? "Sus documentos (plano perimétrico, memoria descriptiva, zonificación y tasación) se registran aquí; para marcarlos presentados, sube antes su PDF en «Documentos del lote»."
            : "Sus documentos (plano perimétrico, memoria descriptiva, zonificación y tasación) se suben después de registrar la partida, en el expediente."}
        </p>
      )}
      {tecnico.tipoPredio === "LOTE" && tecnico.documentos && DOCUMENTOS_LOTE.map((d) => {
        const f = tecnico.documentos![d];
        const conArchivo = puedeMarcarPresentado(documentosGuardados.find((x) => x.tipo === d));
        return (
          <div key={d} className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
            <p className="text-sm font-bold text-foreground">{ETIQUETA_DOCUMENTO_LOTE[d]}</p>
            <p className="text-xs text-muted-foreground">{EFECTO_DOCUMENTO_LOTE[d]}</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor={`bt-doc-estado-${d}`} className="block text-xs font-bold text-muted-foreground mb-1">Estado</label>
                <select id={`bt-doc-estado-${d}`} className={campo} value={f.estado}
                  onChange={(ev) => cambiarDocumento(d, { estado: ev.target.value as EstadoPlano })}>
                  {(["PRESENTADO", "OBSERVADO", "NO_PRESENTADO", "NO_APLICA"] as EstadoPlano[]).map((s) => {
                    const bloqueado = (s === "PRESENTADO" || s === "OBSERVADO") && !conArchivo;
                    return (
                      <option key={s} value={s} disabled={bloqueado}>
                        {ETIQUETA_ESTADO_PLANO[s]}{bloqueado ? " (sube el PDF primero)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`bt-doc-obs-${d}`} className="block text-xs font-bold text-muted-foreground mb-1">Observación del revisor (opcional)</label>
                <input id={`bt-doc-obs-${d}`} className={campo} maxLength={500} value={f.observacion}
                  onChange={(ev) => cambiarDocumento(d, { observacion: ev.target.value })} />
              </div>
            </div>
          </div>
        );
      })}
      {tecnico.tipoPredio === "VIVIENDA" && ESPECIALIDADES.map((e) => {
        const f = tecnico.planos[e];
        const hay = f.estado === "PRESENTADO" || f.estado === "OBSERVADO";
        const conArchivo = puedeMarcarPresentado(planosGuardados.find((p) => p.especialidad === e));
        return (
          <div key={e} className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
            <p className="text-sm font-bold text-foreground">{ETIQUETA_ESPECIALIDAD[e]}</p>
            <p className="text-xs text-muted-foreground">{QUE_VALIDA[e]}</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor={`bt-estado-${e}`} className="block text-xs font-bold text-muted-foreground mb-1">Estado</label>
                <select id={`bt-estado-${e}`} className={campo} value={f.estado}
                  onChange={(ev) => cambiar(e, { estado: ev.target.value as EstadoPlano })}>
                  {(["PRESENTADO", "OBSERVADO", "NO_PRESENTADO"] as EstadoPlano[]).map((s) => (
                    <option key={s} value={s} disabled={s !== "NO_PRESENTADO" && !conArchivo}>
                      {ETIQUETA_ESTADO_PLANO[s]}{s !== "NO_PRESENTADO" && !conArchivo ? " (sube el PDF primero)" : ""}
                    </option>
                  ))}
                </select>
                {!conArchivo && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Para marcarlo presentado, sube su PDF en «Expediente técnico de planos» (falta el archivo).
                  </p>
                )}
              </div>
              {hay && e === "ARQUITECTURA" && (
                <div>
                  <label htmlFor={`bt-area-${e}`} className="block text-xs font-bold text-muted-foreground mb-1">Área construida del plano (m²)</label>
                  <input id={`bt-area-${e}`} type="number" step="0.01" min="0" className={campo} value={f.area}
                    onChange={(ev) => cambiar(e, { area: ev.target.value })} />
                </div>
              )}
              {hay && e === "ESTRUCTURAS" && (
                <div>
                  <label htmlFor={`bt-sistema-${e}`} className="block text-xs font-bold text-muted-foreground mb-1">Sistema constructivo</label>
                  <select id={`bt-sistema-${e}`} className={campo} value={f.sistema}
                    onChange={(ev) => cambiar(e, { sistema: ev.target.value as SistemaConstructivo | "" })}>
                    <option value="">No indicado</option>
                    {(Object.keys(ETIQUETA_SISTEMA) as SistemaConstructivo[]).map((s) => <option key={s} value={s}>{ETIQUETA_SISTEMA[s]}</option>)}
                  </select>
                </div>
              )}
              <div className={hay && (e === "ARQUITECTURA" || e === "ESTRUCTURAS") ? "sm:col-span-3" : "sm:col-span-2"}>
                <label htmlFor={`bt-obs-${e}`} className="block text-xs font-bold text-muted-foreground mb-1">Observación del revisor (opcional)</label>
                <input id={`bt-obs-${e}`} className={campo} maxLength={500} value={f.observacion}
                  onChange={(ev) => cambiar(e, { observacion: ev.target.value })} />
              </div>
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}
