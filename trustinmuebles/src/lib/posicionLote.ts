/*
 * v2.0 (tanda 1, RF49): posición del lote en la lotización. El servidor la entrega como códigos separados por «+»
 * («ESQUINA+PARQUE»); sin dato es null o ausente. Un lote sin dato nunca cumple un filtro de posición, pero sigue visible
 * en todo lo demás.
 */

export type PosicionCodigo = "ESQUINA" | "PARQUE" | "AVENIDA";

export const OPCIONES_POSICION: { valor: PosicionCodigo; etiqueta: string }[] = [
  { valor: "ESQUINA", etiqueta: "Esquina" },
  { valor: "PARQUE", etiqueta: "Frente al parque" },
  { valor: "AVENIDA", etiqueta: "Frente a avenida" },
];

export const SIN_DATO = "Sin dato";

const CODIGOS = OPCIONES_POSICION.map((o) => o.valor) as string[];

/** Los códigos conocidos de un valor guardado o de un filtro (separados por «+», «|» o coma); lo desconocido se ignora. */
export function posicionesDe(valor: string | null | undefined): PosicionCodigo[] {
  const s = new Set<string>();
  for (const parte of (valor ?? "").toUpperCase().split(/[+,|]/)) {
    const c = parte.trim();
    if (CODIGOS.includes(c)) s.add(c);
  }
  return OPCIONES_POSICION.map((o) => o.valor).filter((c) => s.has(c));
}

/** «Esquina · Frente al parque», o «Sin dato». */
export function etiquetaPosicion(valor: string | null | undefined): string {
  const lista = posicionesDe(valor);
  if (lista.length === 0) return SIN_DATO;
  return lista.map((c) => OPCIONES_POSICION.find((o) => o.valor === c)!.etiqueta).join(" · ");
}

/** ¿Cumple el lote el filtro? Sin filtro, todos; con filtro, el que tenga alguna de las posiciones pedidas (sin dato, no). */
export function cumplePosicion(valorLote: string | null | undefined, filtro: string | undefined): boolean {
  const pedidas = posicionesDe(filtro);
  if (pedidas.length === 0) return true;
  const tiene = posicionesDe(valorLote);
  return pedidas.some((p) => tiene.includes(p));
}

/** Cuántos lotes no traen dato de posición. */
export const sinDatoDePosicion = (lotes: { posicion?: string | null }[]): number =>
  lotes.filter((l) => posicionesDe(l.posicion).length === 0).length;
