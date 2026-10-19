import { useEffect, useState } from "react";
import {
  AlertTriangle, CheckCircle2, CircleHelp, Columns3, DraftingCompass, Droplets, ExternalLink, Eye, Ruler, Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, type TonoBadge } from "@/components/base/Badge";
import { Modal } from "@/components/base/Modal";
import { abrirPdf, api, pdfComoUrl, subirArchivo } from "@/lib/api";
import { compararAreas } from "@/lib/areas";
import { m2 } from "@/lib/formato";
import { ESPECIALIDADES, ETIQUETA_ESPECIALIDAD, ETIQUETA_ESTADO_PLANO, QUE_VALIDA } from "@/lib/semaforo";
import type { DetalleCaso, Especialidad, EstadoPlano, Plano } from "@/lib/types";

const ICONO: Record<Especialidad, LucideIcon> = {
  ARQUITECTURA: DraftingCompass, ESTRUCTURAS: Columns3, ELECTRICAS: Zap, SANITARIAS: Droplets,
};

const CORTO: Record<Especialidad, string> = {
  ARQUITECTURA: "Arquitectura", ESTRUCTURAS: "Estructuras", ELECTRICAS: "Instalaciones eléctricas (II.EE.)",
  SANITARIAS: "Instalaciones sanitarias (II.SS.)",
};

const ESTADO: Record<EstadoPlano, { tono: TonoBadge; Icono: LucideIcon }> = {
  PRESENTADO: { tono: "verde", Icono: CheckCircle2 },
  OBSERVADO: { tono: "amarillo", Icono: AlertTriangle },
  NO_PRESENTADO: { tono: "gris", Icono: CircleHelp },
  NO_APLICA: { tono: "gris", Icono: CircleHelp },
};

/** Miniatura esquemática de cada especialidad, dibujada aquí. No es el plano: solo anuncia de qué tipo es. */
function Miniatura({ especialidad, apagada }: { especialidad: Especialidad; apagada: boolean }) {
  const trazo = apagada ? "#A9B4AF" : "#2B5F86";
  const fino = { stroke: trazo, strokeWidth: 1.2, fill: "none" } as const;
  return (
    <svg viewBox="0 0 120 72" className="h-full w-full" aria-hidden="true" focusable="false">
      <rect width="120" height="72" fill={apagada ? "#F1F3F2" : "#EEF4F9"} />
      {Array.from({ length: 11 }, (_, i) => <line key={`v${i}`} x1={i * 12} y1="0" x2={i * 12} y2="72" stroke="#D7E3EC" strokeWidth="0.5" />)}
      {Array.from({ length: 7 }, (_, i) => <line key={`h${i}`} x1="0" y1={i * 12} x2="120" y2={i * 12} stroke="#D7E3EC" strokeWidth="0.5" />)}
      {especialidad === "ARQUITECTURA" && (
        <g {...fino} strokeWidth={2}>
          <rect x="14" y="10" width="92" height="52" />
          <line x1="58" y1="10" x2="58" y2="40" /><line x1="14" y1="40" x2="80" y2="40" /><line x1="80" y1="40" x2="80" y2="62" />
          <path d="M58 40 a 10 10 0 0 1 10 -10" strokeWidth={1} />
        </g>
      )}
      {especialidad === "ESTRUCTURAS" && (
        <g>
          {[20, 60, 100].map((x) => <line key={x} x1={x} y1="6" x2={x} y2="66" stroke={trazo} strokeWidth="0.8" strokeDasharray="4 2" />)}
          {[16, 56].map((y) => <line key={y} x1="8" y1={y} x2="112" y2={y} stroke={trazo} strokeWidth="0.8" strokeDasharray="4 2" />)}
          {[20, 60, 100].flatMap((x) => [16, 56].map((y) => <rect key={`${x}-${y}`} x={x - 4} y={y - 4} width="8" height="8" fill={trazo} />))}
        </g>
      )}
      {especialidad === "ELECTRICAS" && (
        <g {...fino}>
          <rect x="10" y="28" width="12" height="16" fill={trazo} />
          <path d="M22 36 H 50 V 18 H 92 M50 36 V 54 H 96" strokeWidth={1.5} />
          {[[50, 18], [92, 18], [96, 54], [50, 54]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="4" />)}
          <path d="M70 18 l -3 6 h 5 l -3 6" strokeWidth={1.4} />
        </g>
      )}
      {especialidad === "SANITARIAS" && (
        <g {...fino}>
          <path d="M10 20 H 70 V 50 H 104" stroke={apagada ? trazo : "#2F7FBF"} strokeWidth={2.2} />
          <path d="M10 56 H 40 V 30 H 90" stroke={apagada ? trazo : "#8A6A3E"} strokeWidth={2.2} strokeDasharray="6 3" />
          <rect x="98" y="44" width="12" height="12" />
        </g>
      )}
    </svg>
  );
}

/** Barras a la misma escala para comparar el área del plano arquitectónico con la inscrita en la partida. */
function ComparadorAreas({ plano, inscrita }: { plano: number | null; inscrita: number | null }) {
  const r = compararAreas(plano, inscrita);
  if (r.estado === "sin-plano") return <p className="text-sm text-tinta-2">El plano no indica su área construida.</p>;
  if (r.estado === "sin-inscrita") {
    return <p className="text-sm font-semibold text-sem-amarillo-tinta">Área en plano: {m2(r.plano)}. No consta un área construida inscrita para contrastar.</p>;
  }
  const discrepa = r.estado === "discrepa";
  const barra = discrepa ? "bg-sem-amarillo" : "bg-sem-verde";
  return (
    <figure className={`rounded-2xl border p-3 ${discrepa ? "border-sem-amarillo/50 bg-sem-amarillo-suave" : "border-border bg-superficie"}`}>
      <figcaption className="sr-only">Comparación del área del plano con el área inscrita</figcaption>
      <dl className="space-y-2 text-xs">
        <div>
          <div className="flex justify-between font-bold text-foreground"><dt>Área en plano</dt><dd className="cifras">{m2(r.plano)}</dd></div>
          <div className="mt-1 h-2.5 rounded-full bg-card"><div className={`h-2.5 rounded-full ${barra}`} style={{ width: `${r.anchoPlano}%` }} /></div>
        </div>
        <div>
          <div className="flex justify-between font-bold text-foreground"><dt>Área inscrita (partida)</dt><dd className="cifras">{m2(r.inscrita)}</dd></div>
          <div className="mt-1 h-2.5 rounded-full bg-card"><div className="h-2.5 rounded-full bg-primary" style={{ width: `${r.anchoInscrita}%` }} /></div>
        </div>
      </dl>
      <p className={`mt-2.5 flex items-start gap-1.5 text-sm font-bold ${discrepa ? "text-sem-amarillo-tinta" : "text-sem-verde-tinta"}`}>
        {discrepa ? <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
        {discrepa
          ? `No coincide: el plano tiene ${m2(Math.abs(r.diferencia))} ${r.diferencia > 0 ? "más" : "menos"} que lo inscrito (${r.porcentaje} %). Puede ser una ampliación no declarada.`
          : "Coincide con el área inscrita (diferencia de hasta 1 %)."}
      </p>
    </figure>
  );
}

/** Visor de la lámina dentro de la página. El PDF se pide con la sesión y se muestra como blob local. */
function VisorLamina({ codigo, especialidad, abierto, alCerrar }: { codigo: string; especialidad: Especialidad; abierto: boolean; alCerrar: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ruta = `/casos/${codigo}/planos/${especialidad}/documento`;

  useEffect(() => {
    if (!abierto) return;
    let vigente = true;
    let creada: string | null = null;
    setUrl(null); setError(null);
    pdfComoUrl(ruta)
      .then((u) => { creada = u; if (vigente) setUrl(u); else URL.revokeObjectURL(u); })
      .catch((e) => vigente && setError(e instanceof Error ? e.message : "No se pudo abrir la lámina"));
    return () => { vigente = false; if (creada) URL.revokeObjectURL(creada); };
  }, [abierto, ruta]);

  return (
    <Modal abierto={abierto} alCerrar={alCerrar} ancho="xl" titulo={`Lámina: ${ETIQUETA_ESPECIALIDAD[especialidad]}`}
      descripcion="Esquema referencial dibujado con las medidas del expediente, con marca de agua y sin sello ni firma. Si el revisor subió el plano real, se muestra ese."
      pie={<>
        <Button variant="outline" className="rounded-xl" onClick={() => abrirPdf(ruta).catch(() => undefined)}>
          Abrir el PDF en otra pestaña <ExternalLink aria-hidden="true" />
        </Button>
        <Button className="rounded-xl" onClick={alCerrar}>Cerrar</Button>
      </>}>
      <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-muted">
        {error ? <p role="alert" className="p-6 text-sm font-semibold text-sem-rojo-tinta">{error}</p>
          : url ? <iframe title={`PDF de la lámina: ${ETIQUETA_ESPECIALIDAD[especialidad]}`} src={url} className="h-full w-full" />
          : <p role="status" className="p-6 text-sm font-semibold text-tinta-2">Cargando la lámina…</p>}
      </div>
    </Modal>
  );
}

function TarjetaPlano({ codigo, plano, especialidad, inscrita, esRevisor, alCambiar }: {
  codigo: string; plano: Plano | undefined; especialidad: Especialidad; inscrita: number | null; esRevisor: boolean;
  alCambiar: () => void;
}) {
  const [visor, setVisor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const estado: EstadoPlano = plano?.estado ?? "NO_PRESENTADO";
  const { tono, Icono: IconoEstado } = ESTADO[estado];
  const Icono = ICONO[especialidad];
  const hay = estado === "PRESENTADO" || estado === "OBSERVADO";
  const ruta = `/casos/${codigo}/planos/${especialidad}/documento`;

  const subir = async () => {
    if (!archivo) return;
    setError(null); setSubiendo(true);
    try { await subirArchivo(ruta, "documento", archivo); setArchivo(null); alCambiar(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo subir el plano"); }
    finally { setSubiendo(false); }
  };

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card" data-especialidad={especialidad}>
      <div className="relative h-24 border-b border-border">
        <Miniatura especialidad={especialidad} apagada={!hay} />
        <span className="absolute left-3 top-3 grid size-9 place-items-center rounded-xl bg-card text-primary shadow-tarjeta">
          <Icono className="size-5" aria-hidden="true" />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-bold leading-snug text-foreground">{CORTO[especialidad]}</h3>
          <Badge tono={tono} icono={IconoEstado} tamano="sm">{ETIQUETA_ESTADO_PLANO[estado]}</Badge>
        </div>
        <p className="text-sm leading-relaxed text-tinta-2">{QUE_VALIDA[especialidad]}</p>

        {hay && especialidad === "ARQUITECTURA" && <ComparadorAreas plano={plano?.areaConstruida ?? null} inscrita={inscrita} />}
        {hay && especialidad === "ESTRUCTURAS" && (
          <p className="text-sm font-semibold text-foreground">Sistema constructivo: {plano?.sistemaConstructivoEtiqueta ?? "no indicado"}.</p>
        )}
        {plano?.observacion && <p className="rounded-xl border border-border bg-superficie p-3 text-sm text-foreground">Observación: {plano.observacion}</p>}
        {!hay && (
          <p className="rounded-xl border border-dashed border-sem-gris/60 bg-sem-gris-suave p-3 text-sm font-semibold text-sem-gris-tinta">
            {estado === "NO_APLICA" ? "No aplica a este predio." : "No presentado: el expediente aún no tiene este plano."}
          </p>
        )}

        {hay && (
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setVisor(true)}>
              <Eye aria-hidden="true" /> Ver lámina
            </Button>
            <Button variant="ghost" size="sm" className="rounded-xl"
              onClick={() => abrirPdf(ruta).catch((e) => setError(e instanceof Error ? e.message : "No se pudo abrir el plano"))}>
              PDF <ExternalLink aria-hidden="true" />
            </Button>
          </div>
        )}
        {hay && esRevisor && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label htmlFor={`plano-pdf-${especialidad}`} className="sr-only">PDF del plano {ETIQUETA_ESPECIALIDAD[especialidad]}</label>
            <input id={`plano-pdf-${especialidad}`} type="file" accept="application/pdf" className="max-w-[12rem] text-xs"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
            <Button type="button" variant="outline" size="sm" className="rounded-xl" disabled={!archivo || subiendo} onClick={subir}>
              {subiendo ? "Subiendo…" : plano?.tieneDocumentoPropio ? "Reemplazar PDF" : "Subir PDF real"}
            </Button>
          </div>
        )}
        {error && <p role="alert" className="text-sm font-semibold text-sem-rojo-tinta">{error}</p>}
      </div>
      {hay && <VisorLamina codigo={codigo} especialidad={especialidad} abierto={visor} alCerrar={() => setVisor(false)} />}
    </li>
  );
}

/** Los 4 planos de una vivienda. Es una revisión documental: un plano que está no demuestra que la obra esté bien. */
export function PanelPlanos({ detalle, esRevisor, alCambiar }: { detalle: DetalleCaso; esRevisor: boolean; alCambiar: (d: DetalleCaso) => void }) {
  const x = detalle.expediente;
  const recargar = async () => alCambiar(await api<DetalleCaso>(`/casos/${detalle.codigo}`));
  return (
    <section aria-labelledby="titulo-planos" className="rounded-3xl border border-border bg-card p-6 shadow-tarjeta sm:p-8">
      <h2 id="titulo-planos" className="mb-2 flex items-center gap-2 text-xl font-bold text-foreground">
        <Ruler className="size-5 text-primary" aria-hidden="true" /> Expediente técnico de planos (2D)
      </h2>
      {x.tipoPredio === "LOTE" ? (
        <p className="rounded-2xl border border-dashed border-border bg-superficie p-4 text-sm leading-relaxed text-tinta-2">
          Los planos no aplican: este predio es un lote sin edificación. Se revisan cuando hay una vivienda construida.
        </p>
      ) : (
        <>
          <p className="mb-5 text-sm leading-relaxed text-tinta-2">
            Una vivienda necesita cuatro planos distintos. Aquí se revisa solo si están y si el área coincide con la partida;
            no se evalúa si la obra está bien hecha. Eso lo verifica el especialista en la inspección presencial.
          </p>
          <ul className="grid gap-4 sm:grid-cols-2">
            {ESPECIALIDADES.map((e) => (
              <TarjetaPlano key={e} codigo={detalle.codigo} especialidad={e} plano={x.planos.find((p) => p.especialidad === e)}
                inscrita={x.areaConstruidaInscrita} esRevisor={esRevisor} alCambiar={recargar} />
            ))}
          </ul>
          <p className="cifras mt-4 text-xs font-medium text-tinta-2">
            Área construida inscrita en la partida: {x.areaConstruidaInscrita == null ? "no consta" : m2(x.areaConstruidaInscrita)}.
          </p>
        </>
      )}
    </section>
  );
}
