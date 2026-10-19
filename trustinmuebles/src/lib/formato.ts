const SOLES = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const SOLES_ENTEROS = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 0 });

/** «S/ 250.00». Con {@code enteros}, «S/ 185,000» para precios de inmuebles. */
export const soles = (n: number | null | undefined, enteros = false) =>
  n == null ? "" : (enteros ? SOLES_ENTEROS : SOLES).format(n);

/** «84.50 m²». */
export const m2 = (n: number | null | undefined) => (n == null ? "" : `${n.toFixed(2)} m²`);
