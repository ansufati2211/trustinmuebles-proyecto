import type { Esfuerzo, ItemRuta } from "./types";

export const ESFUERZOS: Esfuerzo[] = ["BAJO", "MEDIO", "ALTO"];

/** Texto del esfuerzo: siempre con palabras, nunca solo con un color (REQ-NF01). */
export const ETIQUETA_ESFUERZO: Record<Esfuerzo, string> = {
  BAJO: "Esfuerzo bajo", MEDIO: "Esfuerzo medio", ALTO: "Esfuerzo alto",
};

/** Quién gestiona cada paso, con mayúscula inicial y sin abreviaturas. */
export const ETIQUETA_GESTIONA: Record<string, string> = {
  propietario: "Propietario", acreedor: "Acreedor", revisor: "Revisor de la inmobiliaria", juzgado: "Juzgado",
  municipalidad: "Municipalidad", "notaría": "Notaría",
};

export const gestiona = (g: string) => ETIQUETA_GESTIONA[g] ?? g;

export const AVISO_RUTA = "Orientativo: no es asesoría legal ni recomendación de compra";

/** Ordena los pasos de mayor a menor esfuerzo, conservando el orden del servidor entre iguales. */
export function ordenarPorEsfuerzo(items: ItemRuta[]): ItemRuta[] {
  return items.map((it, i) => ({ it, i }))
    .sort((a, b) => ESFUERZOS.indexOf(b.it.esfuerzo) - ESFUERZOS.indexOf(a.it.esfuerzo) || a.i - b.i)
    .map((x) => x.it);
}
