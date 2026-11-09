import type { DocumentoInfo, DocumentoSubido, EstadoPlano, Plano } from "./types";

/** Límites de la subida de PDF (v0.8, decisión 4). Los mismos valores están en application.properties del backend. */
export const LIMITES_PDF = { entradaMb: 25, umbralMb: 5, almacenadoMb: 10 } as const;

const MB = 1024 * 1024;

/** «18,2 MB»; sin decimales si es entero («25 MB»). */
export function mb(bytes: number): string {
  const v = bytes / MB;
  const texto = Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ",");
  return `${texto} MB`;
}

export type AvisoTamano = { tipo: "ok" | "optimizara" | "excede"; mensaje: string | null };

/** Aviso inmediato antes de subir: más de 25 MB no se envía; más de 5 MB se optimizará en el servidor. */
export function avisoTamano(bytes: number): AvisoTamano {
  if (bytes > LIMITES_PDF.entradaMb * MB) {
    return { tipo: "excede", mensaje: `El archivo pesa ${mb(bytes)} y supera ${LIMITES_PDF.entradaMb} MB. Reduce su resolución o divídelo.` };
  }
  if (bytes > LIMITES_PDF.umbralMb * MB) {
    return { tipo: "optimizara", mensaje: `Se optimizará automáticamente: pesa ${mb(bytes)} y el máximo guardado es ${LIMITES_PDF.almacenadoMb} MB.` };
  }
  return { tipo: "ok", mensaje: null };
}

/** «Optimizado: 18,2 MB → 6,4 MB», o null si el servidor guardó el archivo tal cual. */
export function resumenOptimizacion(r: Pick<DocumentoSubido, "optimizado" | "tamanoOriginalBytes" | "tamanoBytes">): string | null {
  return r.optimizado ? `Optimizado: ${mb(r.tamanoOriginalBytes)} → ${mb(r.tamanoBytes)}` : null;
}

export const TEXTO_GENERADO = "Generado por el sistema a partir de la transcripción, no es un documento oficial";
export const TEXTO_FALTA = "Falta el archivo";
/** v0.9: cuenta con la que el backend registra los archivos que trae la carga de contenido. */
export const CARGA_INICIAL = "carga-inicial";

/** De dónde sale un PDF, en una frase. {@code fecha} formatea la fecha de subida. */
export function origenDocumento(info: DocumentoInfo | null | undefined, fecha: (iso: string) => string): string {
  if (!info || info.origen === "FALTA") return TEXTO_FALTA;
  if (info.origen === "GENERADO") return TEXTO_GENERADO;
  // v0.9: un archivo que trae el contenido (por ejemplo, el plano oficial de la SBN) no lo subió ninguna cuenta.
  const partes = [info.subidoPor === CARGA_INICIAL ? "Archivo original de la fuente, cargado con el contenido"
    : `Subido por ${info.subidoPor ?? "una cuenta"}`];
  if (info.subidoEn) partes.push(`el ${fecha(info.subidoEn)}`);
  const tamano = info.tamanoBytes == null ? "" : `, ${mb(info.tamanoBytes)}`;
  const opt = info.optimizado && info.tamanoOriginalBytes != null ? ` (optimizado desde ${mb(info.tamanoOriginalBytes)})` : "";
  return `${partes.join(" ")}${tamano}${opt}`;
}

const presentado = (e: EstadoPlano | undefined) => e === "PRESENTADO" || e === "OBSERVADO";

/**
 * ¿Se puede elegir «Presentado» u «Observado» para este plano? Solo si ya tiene su PDF o si ya estaba presentado (por
 * ejemplo, las láminas generadas de los casos de demostración). Es la misma regla que aplica el servidor (422).
 */
export function puedeMarcarPresentado(plano: Pick<Plano, "estado" | "tieneDocumentoPropio"> | null | undefined): boolean {
  return !!plano && (plano.tieneDocumentoPropio || presentado(plano.estado));
}
