import { useState } from "react";
import { AlertTriangle, CheckCircle2, CircleHelp, ExternalLink, FileText, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { abrirPdf, api, subirArchivo } from "@/lib/api";
import { ESPECIALIDADES, ETIQUETA_ESPECIALIDAD, ETIQUETA_ESTADO_PLANO, QUE_VALIDA } from "@/lib/semaforo";
import type { DetalleCaso, Especialidad, EstadoPlano, Plano } from "@/lib/types";

const ESTILO: Record<EstadoPlano, { Icono: typeof CheckCircle2; texto: string }> = {
  PRESENTADO: { Icono: CheckCircle2, texto: "text-sem-verde-tinta" },
  OBSERVADO: { Icono: AlertTriangle, texto: "text-sem-amarillo-tinta" },
  NO_PRESENTADO: { Icono: CircleHelp, texto: "text-muted-foreground" },
  NO_APLICA: { Icono: CircleHelp, texto: "text-muted-foreground" },
};

const m2 = (n: number | null | undefined) => (n == null ? "" : `${n.toFixed(2)} m²`);

function TarjetaPlano({ codigo, plano, especialidad, area, esRevisor, alCambiar }: {
  codigo: string; plano: Plano | undefined; especialidad: Especialidad; area: number | null; esRevisor: boolean;
  alCambiar: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const estado: EstadoPlano = plano?.estado ?? "NO_PRESENTADO";
  const { Icono, texto } = ESTILO[estado];
  const hay = estado === "PRESENTADO" || estado === "OBSERVADO";

  const ver = async () => {
    setError(null);
    try { await abrirPdf(`/casos/${codigo}/planos/${especialidad}/documento`); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo abrir el plano"); }
  };
  const subir = async () => {
    if (!archivo) return;
    setError(null);
    setSubiendo(true);
    try { await subirArchivo(`/casos/${codigo}/planos/${especialidad}/documento`, "documento", archivo); setArchivo(null); alCambiar(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo subir el plano"); }
    finally { setSubiendo(false); }
  };

  return (
    <li className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5 flex flex-col gap-3" data-especialidad={especialidad}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold text-foreground leading-snug">{ETIQUETA_ESPECIALIDAD[especialidad]}</h3>
        <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${texto}`}>
          <Icono className="w-4 h-4" aria-hidden="true" /> {ETIQUETA_ESTADO_PLANO[estado]}
        </span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{QUE_VALIDA[especialidad]}</p>

      {hay && especialidad === "ARQUITECTURA" && (
        <p className="text-sm font-semibold text-foreground">
          {plano?.areaConstruida == null ? "El plano no indica su área construida." : `Área del plano: ${m2(plano.areaConstruida)}.`}{" "}
          {plano?.coincideArea === true && `Coincide con el área inscrita (${m2(area)}).`}
          {plano?.coincideArea === false && `No coincide con el área inscrita (${m2(area)}).`}
          {plano?.areaConstruida != null && plano.coincideArea == null && "No consta un área inscrita para contrastar."}
        </p>
      )}
      {hay && especialidad === "ESTRUCTURAS" && (
        <p className="text-sm font-semibold text-foreground">Sistema constructivo: {plano?.sistemaConstructivoEtiqueta ?? "no indicado"}.</p>
      )}
      {plano?.observacion && <p className="text-sm text-foreground rounded-xl bg-white border border-gray-100 p-3">Observación: {plano.observacion}</p>}

      {hay ? (
        <Button variant="outline" className="rounded-xl" onClick={ver}>
          Ver plano 2D <ExternalLink className="w-4 h-4" aria-hidden="true" />
        </Button>
      ) : (
        <p className="text-sm font-bold text-muted-foreground">Faltante</p>
      )}
      {hay && esRevisor && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor={`plano-pdf-${especialidad}`} className="sr-only">PDF del plano {ETIQUETA_ESPECIALIDAD[especialidad]}</label>
          <input id={`plano-pdf-${especialidad}`} type="file" accept="application/pdf" className="text-xs max-w-[12rem]"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
          <Button type="button" variant="outline" size="sm" className="rounded-xl" disabled={!archivo || subiendo} onClick={subir}>
            {subiendo ? "Subiendo…" : plano?.tieneDocumentoPropio ? "Reemplazar PDF" : "Subir PDF real"}
          </Button>
        </div>
      )}
      {error && <p role="alert" className="text-sm font-semibold text-sem-rojo-tinta">{error}</p>}
    </li>
  );
}

/** Los 4 planos de una vivienda. Es una revisión documental: un plano que está no demuestra que la obra esté bien. */
export function PanelPlanos({ detalle, esRevisor, alCambiar }: { detalle: DetalleCaso; esRevisor: boolean; alCambiar: (d: DetalleCaso) => void }) {
  const x = detalle.expediente;
  const recargar = async () => alCambiar(await api<DetalleCaso>(`/casos/${detalle.codigo}`));
  return (
    <Card className="rounded-3xl border-gray-100 shadow-sm">
      <CardContent className="p-8">
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground mb-2">
          <Ruler className="w-5 h-5 text-primary" aria-hidden="true" /> Expediente técnico de planos (2D)
        </h2>
        {x.tipoPredio === "LOTE" ? (
          <p className="text-sm text-muted-foreground leading-relaxed">Este predio es un lote: no lleva planos de edificación.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Una vivienda necesita cuatro planos distintos. Aquí se revisa solo si están y si el área coincide con la partida;
              no se evalúa si la obra está bien hecha. La lámina que se abre es un esquema referencial; si el revisor sube el
              PDF real del plano, se muestra ese.
            </p>
            <ul className="grid sm:grid-cols-2 gap-4">
              {ESPECIALIDADES.map((e) => (
                <TarjetaPlano key={e} codigo={detalle.codigo} especialidad={e} plano={x.planos.find((p) => p.especialidad === e)}
                  area={x.areaConstruidaInscrita} esRevisor={esRevisor} alCambiar={recargar} />
              ))}
            </ul>
            <p className="mt-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FileText className="w-4 h-4" aria-hidden="true" /> Área construida inscrita en la partida: {x.areaConstruidaInscrita == null ? "no consta" : m2(x.areaConstruidaInscrita)}.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
