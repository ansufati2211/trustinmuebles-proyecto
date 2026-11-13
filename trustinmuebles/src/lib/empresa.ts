import contenido from "@/contenido/empresa.json";

/*
 * v1.0 (etapa 8): datos de la inmobiliaria que opera el portal (LEDCONS), autorizados de forma verbal el 13/11/2026 (la
 * autorización escrita está pendiente: docs/decisiones.md, D72). Copia idéntica de
 * trustinmuebles-backend/src/main/resources/contenido/empresa.json (lib/empresa.test.ts compara las dos). El producto
 * queda como «con tecnología Trustinmuebles» en el pie.
 */
export interface Empresa {
  nombreComercial: string;
  razonSocial: string;
  ruc: string;
  eslogan: string;
  direccion: string;
  telefonos: string[];
  whatsapp: string;
  facebook: string;
  logo: string;
  logoPdf: string;
  producto: string;
}

export const EMPRESA: Empresa = contenido;

/** Enlace tel: de un teléfono escrito con espacios (Perú, +51). */
export const enlaceTelefono = (t: string) => `tel:+51${t.replace(/\D/g, "")}`;

/** WhatsApp para mostrar: «+51 991 108 224». */
export function whatsappLegible(numero: string = EMPRESA.whatsapp): string {
  const d = numero.replace(/\D/g, "");
  const local = d.startsWith("51") && d.length === 11 ? d.slice(2) : d;
  const grupos = local.length === 9 ? `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}` : local;
  return d.startsWith("51") && d.length === 11 ? `+51 ${grupos}` : grupos;
}

/** Enlace wa.me de la inmobiliaria con un saludo opcional (solo dígitos en el número, como pide wa.me). */
export function enlaceWhatsappEmpresa(texto?: string, numero: string = EMPRESA.whatsapp): string {
  const base = `https://wa.me/${numero.replace(/\D/g, "")}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}
