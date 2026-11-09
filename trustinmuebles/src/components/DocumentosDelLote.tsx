import { useState } from "react";
import { Calculator, ExternalLink, Eye, FileText, Landmark, Map as MapaIcono, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/base/Badge";
import { OrigenDocumento, SubirPdf } from "@/components/DocumentoPdf";
import { ESTADO_DOCUMENTO, hayDocumento } from "@/components/estadoDocumento";
import { VisorPdf } from "@/components/VisorPdf";
import { abrirPdf } from "@/lib/api";
import {
  DOCUMENTOS_LOTE, EFECTO_DOCUMENTO_LOTE, ETIQUETA_DOCUMENTO_LOTE, ETIQUETA_ESTADO_PLANO, QUE_MUESTRA_LOTE,
} from "@/lib/semaforo";
import type { DetalleCaso, DocumentoLote, DocumentoLoteTipo } from "@/lib/types";

const ICONO: Record<DocumentoLoteTipo, LucideIcon> = {
  PLANO_PERIMETRICO: MapaIcono, MEMORIA_DESCRIPTIVA: FileText, CERTIFICADO_ZONIFICACION: Landmark, TASACION: Calculator,
};

/** Nombre del archivo, igual al que arma el servidor («11045763-plano-perimetrico.pdf»). */
const archivo = (codigo: string, tipo: DocumentoLoteTipo) => `${codigo}-${tipo.toLowerCase().replace(/_/g, "-")}.pdf`;

/** Dibujo pequeño de cada documento, en el mismo estilo que las miniaturas de los planos. */
function Miniatura({ tipo, apagada }: { tipo: DocumentoLoteTipo; apagada: boolean }) {
  const trazo = apagada ? "#A9B4AF" : "#2B5F86";
  const fino = { stroke: trazo, strokeWidth: 1.2, fill: "none" } as const;
  return (
    <svg viewBox="0 0 120 72" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true" focusable="false">
      <rect width="120" height="72" fill={apagada ? "#F1F3F2" : "#EEF4F9"} />
      {Array.from({ length: 11 }, (_, i) => <line key={`v${i}`} x1={i * 12} y1="0" x2={i * 12} y2="72" stroke="#D7E3EC" strokeWidth="0.5" />)}
      {Array.from({ length: 7 }, (_, i) => <line key={`h${i}`} x1="0" y1={i * 12} x2="120" y2={i * 12} stroke="#D7E3EC" strokeWidth="0.5" />)}
      {tipo === "PLANO_PERIMETRICO" && (
        <g>
          <polygon points="30,14 88,20 98,52 46,60 22,40" {...fino} strokeWidth={2} strokeDasharray="6 3" />
          {[[30, 14], [88, 20], [98, 52], [46, 60], [22, 40]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill={apagada ? trazo : "#B42318"} />
          ))}
        </g>
      )}
      {tipo === "MEMORIA_DESCRIPTIVA" && (
        <g {...fino}>
          <rect x="34" y="8" width="52" height="58" fill={apagada ? "#F7F8F8" : "#FFFFFF"} />
          {[18, 26, 34, 42, 50].map((y, i) => <line key={y} x1="40" y1={y} x2={i % 2 ? 72 : 80} y2={y} strokeWidth={1.6} />)}
        </g>
      )}
      {tipo === "CERTIFICADO_ZONIFICACION" && (
        <g>
          <rect x="10" y="8" width="44" height="26" fill={apagada ? "#DDE2E0" : "#F4D58D"} />
          <rect x="58" y="8" width="52" height="26" fill={apagada ? "#E6EAE8" : "#C9E4C5"} />
          <rect x="10" y="44" width="100" height="20" fill={apagada ? "#E6EAE8" : "#F4D58D"} />
          <rect x="0" y="35" width="120" height="8" fill={apagada ? "#CBD3D0" : "#9AA7B0"} />
          <line x1="0" y1="39" x2="120" y2="39" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="5 4" />
        </g>
      )}
      {tipo === "TASACION" && (
        <g>
          {[[22, 40], [42, 30], [62, 22], [82, 14]].map(([x, h]) => (
            <rect key={x} x={x} y={62 - h} width="14" height={h} fill={trazo} opacity={0.85} />
          ))}
          <line x1="14" y1="62" x2="106" y2="62" stroke={trazo} strokeWidth="1.2" />
        </g>
      )}
    </svg>
  );
}

function TarjetaDocumento({ codigo, documento, esRevisor, alCambiar }: {
  codigo: string; documento: DocumentoLote; esRevisor: boolean; alCambiar: () => void;
}) {
  const [visor, setVisor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { tipo, estado } = documento;
  const { tono, Icono: IconoEstado } = ESTADO_DOCUMENTO[estado];
  const Icono = ICONO[tipo];
  const hay = hayDocumento(estado);
  const ruta = `/casos/${codigo}/documentos-lote/${tipo}/documento`;
  const conArchivo = hay && documento.documento?.origen !== "FALTA";
  const generado = documento.documento?.origen === "GENERADO";

  return (
    <li
      className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card transition-all duration-500 ease-expo hover:-translate-y-1 hover:border-primary/40 hover:shadow-elevada"
      data-documento-lote={tipo}
    >
      <div className="relative h-28 overflow-hidden border-b border-border">
        <div className="h-full w-full transition-transform duration-700 ease-expo group-hover:scale-105">
          <Miniatura tipo={tipo} apagada={!hay} />
        </div>
        <span className="absolute left-3 top-3 grid size-10 place-items-center rounded-xl bg-card text-primary shadow-tarjeta">
          <Icono className="size-5" aria-hidden="true" />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-extrabold leading-snug text-foreground">{ETIQUETA_DOCUMENTO_LOTE[tipo]}</h3>
          <Badge tono={tono} icono={IconoEstado} tamano="sm">{ETIQUETA_ESTADO_PLANO[estado]}</Badge>
        </div>
        <p className="text-sm leading-relaxed text-tinta-2">{QUE_MUESTRA_LOTE[tipo]}</p>
        <p className="text-xs font-bold text-tinta-2">{EFECTO_DOCUMENTO_LOTE[tipo]}</p>

        {documento.resumen && (
          <p className="rounded-xl border border-border bg-superficie p-3 text-sm text-foreground">{documento.resumen}</p>
        )}
        {!hay && (
          <p className="rounded-xl border border-dashed border-sem-gris/60 bg-sem-gris-suave p-3 text-sm font-semibold text-sem-gris-tinta">
            {estado === "NO_APLICA" ? "No aplica a este lote." : "No presentado: el expediente aún no tiene este documento."}
          </p>
        )}
        {documento.observacion && (
          <p className="rounded-xl border border-border bg-superficie p-3 text-sm text-foreground">Observación: {documento.observacion}</p>
        )}
        {hay && <OrigenDocumento info={documento.documento} ruta={ruta} nombre={archivo(codigo, tipo)} />}

        {conArchivo && (
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setVisor(true)}>
              <Eye aria-hidden="true" /> Ver documento
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => abrirPdf(ruta).catch((e) => setError(e instanceof Error ? e.message : "No se pudo abrir el documento"))}
            >
              PDF <ExternalLink aria-hidden="true" />
            </Button>
          </div>
        )}
        {esRevisor && estado !== "NO_APLICA" && (
          <SubirPdf
            id={`documento-lote-pdf-${tipo}`}
            ruta={ruta}
            etiqueta={`PDF del documento ${ETIQUETA_DOCUMENTO_LOTE[tipo]}`}
            textoBoton={documento.tieneDocumentoPropio ? "Reemplazar PDF" : hay ? "Subir PDF real" : "Subir PDF (queda presentado)"}
            alSubir={alCambiar}
          />
        )}
        {error && <p role="alert" className="text-sm font-semibold text-sem-rojo-tinta">{error}</p>}
      </div>
      {conArchivo && (
        <VisorPdf
          ruta={ruta}
          titulo={ETIQUETA_DOCUMENTO_LOTE[tipo]}
          descripcion={generado
            ? "Documento referencial generado con los datos del expediente, con marca de agua y sin sello ni firma."
            : "Archivo guardado en el expediente, tal como se subió o se publicó en su fuente."}
          abierto={visor}
          alCerrar={() => setVisor(false)}
        />
      )}
    </li>
  );
}

/**
 * v0.9: documentos del expediente de un lote (plano perimétrico, memoria descriptiva, zonificación y tasación). Cada uno
 * dice cómo pesa en el indicador A; el revisor sube su PDF y el servidor recalcula.
 */
export function DocumentosDelLote({ detalle, esRevisor, alCambiar }: {
  detalle: DetalleCaso; esRevisor: boolean; alCambiar: () => void;
}) {
  const recibidos = detalle.expediente.documentosLote ?? [];
  const documentos: DocumentoLote[] = DOCUMENTOS_LOTE.map((tipo) => recibidos.find((d) => d.tipo === tipo) ?? {
    tipo, tipoEtiqueta: ETIQUETA_DOCUMENTO_LOTE[tipo], estado: "NO_PRESENTADO", observacion: null, resumen: null,
    tieneDocumentoPropio: false, documento: null,
  });
  const presentes = documentos.filter((d) => hayDocumento(d.estado)).length;

  return (
    <>
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-tinta-2">
          <span>Documentos presentados</span>
          <span className="cifras text-foreground">{presentes} de {documentos.length}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700 ease-expo"
            style={{ width: `${(presentes / documentos.length) * 100}%` }}
          />
        </div>
      </div>
      <ul className="grid gap-5 sm:grid-cols-2">
        {documentos.map((d) => (
          <TarjetaDocumento key={d.tipo} codigo={detalle.codigo} documento={d} esRevisor={esRevisor} alCambiar={alCambiar} />
        ))}
      </ul>
    </>
  );
}
