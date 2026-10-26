import type { MotivoContacto } from "./types";

/** Lista cerrada de motivos (I11). No hay texto libre: el servidor rechaza cualquier otro campo. */
export const MOTIVOS_CONTACTO: { valor: MotivoContacto; etiqueta: string }[] = [
  { valor: "INFORMACION_GENERAL", etiqueta: "Información general" },
  { valor: "CONSULTA_DOCUMENTOS", etiqueta: "Consulta de documentos" },
  { valor: "CONSULTA_INSPECCION", etiqueta: "Consulta de inspección" },
];

export const etiquetaMotivo = (m: MotivoContacto | string | null | undefined) =>
  MOTIVOS_CONTACTO.find((x) => x.valor === m)?.etiqueta ?? (m ?? "");

/** Cuerpo exacto que acepta POST /casos/{codigo}/contactos: solo el motivo. */
export const cuerpoContacto = (motivo: MotivoContacto) => ({ motivo });

/** Mensaje claro para el error de una solicitud de contacto, según el código HTTP que devolvió el servidor. */
export function mensajeErrorContacto(status: number, detalle?: string): string {
  if (status === 409) return "Ya tienes una solicitud de contacto pendiente para este inmueble. La inmobiliaria te responderá.";
  if (status === 404) return "Este inmueble ya no está publicado: no se puede solicitar contacto.";
  if (status === 403) return "Tu cuenta no puede solicitar contacto.";
  return detalle || "No se pudo enviar la solicitud de contacto.";
}
