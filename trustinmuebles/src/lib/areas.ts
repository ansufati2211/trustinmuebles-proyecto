/** Margen de coincidencia entre el área del plano y la inscrita: el mismo 1 % de la regla RV-05 del backend. */
export const MARGEN = 0.01;

export type ResultadoAreas =
  | { estado: "sin-plano"; plano: number | null; inscrita: number | null }
  | { estado: "sin-inscrita"; plano: number; inscrita: number | null }
  | {
      estado: "coincide" | "discrepa"; plano: number; inscrita: number;
      /** Diferencia en m², positiva si el plano es mayor que lo inscrito. */
      diferencia: number;
      /** Diferencia relativa a lo inscrito, en porcentaje con un decimal. */
      porcentaje: number;
      /** Ancho de cada barra (0 a 100) para dibujarlas a la misma escala. */
      anchoPlano: number; anchoInscrita: number;
    };

/**
 * Compara el área construida del plano arquitectónico con la inscrita en la partida. Es documental: una discrepancia
 * no dice qué está mal, solo que los documentos no coinciden (por ejemplo, una ampliación no declarada).
 */
export function compararAreas(plano: number | null | undefined, inscrita: number | null | undefined): ResultadoAreas {
  if (plano == null || plano <= 0) return { estado: "sin-plano", plano: plano ?? null, inscrita: inscrita ?? null };
  if (inscrita == null || inscrita <= 0) return { estado: "sin-inscrita", plano, inscrita: inscrita ?? null };
  const diferencia = Math.round((plano - inscrita) * 100) / 100;
  const relativa = Math.abs(diferencia) / inscrita;
  const mayor = Math.max(plano, inscrita);
  return {
    estado: relativa <= MARGEN + 1e-9 ? "coincide" : "discrepa",
    plano, inscrita, diferencia,
    porcentaje: Math.round(relativa * 1000) / 10,
    anchoPlano: Math.round((plano / mayor) * 1000) / 10,
    anchoInscrita: Math.round((inscrita / mayor) * 1000) / 10,
  };
}
