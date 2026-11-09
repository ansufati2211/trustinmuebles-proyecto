const SOLES = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const SOLES_ENTEROS = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 0 });
// El símbolo del dólar se escribe aparte: según la versión de ICU, «es-PE» lo muestra como «US$» o como «USD».
const NUMERO = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUMERO_ENTERO = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });

/** «S/ 250.00». Con {@code enteros}, «S/ 185,000» para precios de inmuebles. */
export const soles = (n: number | null | undefined, enteros = false) =>
  n == null ? "" : (enteros ? SOLES_ENTEROS : SOLES).format(n);

/**
 * v0.9: precio en su moneda. «S/ 185,000» en soles (o sin moneda) y «US$ 90,096» en dólares, como el precio base de una
 * subasta de la SBN.
 */
export const precio = (n: number | null | undefined, moneda: string | null | undefined, enteros = false) => {
  if (n == null) return "";
  if (moneda === "USD") return `US$ ${(enteros ? NUMERO_ENTERO : NUMERO).format(n)}`;
  return soles(n, enteros);
};

/** «84.50 m²». */
export const m2 = (n: number | null | undefined) => (n == null ? "" : `${n.toFixed(2)} m²`);
