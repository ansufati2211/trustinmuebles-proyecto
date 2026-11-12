import type { PaginaPublica } from "./types";

/*
 * v1.0: portal público. El catálogo y la ficha se leen sin sesión (GET /publico/inmuebles), solo de inmuebles
 * publicados, y nunca traen el semáforo de gestión, las decisiones de captación ni el código del propietario.
 */

/** Inmuebles por página: lo fija el servidor (24); se repite aquí solo para los textos mientras carga. */
export const TAMANO_PAGINA = 24;

/** En la URL la página empieza en 1 (?pagina=2); en la API, en 0. Un valor inválido lleva a la primera. */
export function paginaDeLaUrl(valor: string | null): number {
  if (valor === null || !/^\d+$/.test(valor)) return 0;
  const n = Number(valor);
  return n >= 1 ? n - 1 : 0;
}

/** Valor de ?pagina para una página de la API; la primera no lleva parámetro. */
export const paginaParaLaUrl = (pagina: number): string | null => (pagina <= 0 ? null : String(pagina + 1));

/** Ruta de la API para una página del catálogo público. */
export const rutaPaginaPublica = (pagina: number) => `/publico/inmuebles?pagina=${Math.max(0, Math.floor(pagina))}`;

/** Ruta de la API para la ficha pública de un inmueble. */
export const rutaFichaPublica = (codigo: string) => `/publico/inmuebles/${encodeURIComponent(codigo)}`;

/** «Mostrando 25–30 de 30 inmuebles», o un texto para una página vacía. */
export function textoRango(p: Pick<PaginaPublica, "pagina" | "tamano" | "total" | "items">): string {
  if (p.total === 0) return "Todavía no hay inmuebles publicados.";
  if (p.items.length === 0) return `Esta página no tiene inmuebles. Hay ${p.total} en total.`;
  const desde = p.pagina * p.tamano + 1;
  const hasta = desde + p.items.length - 1;
  return `Mostrando ${desde}–${hasta} de ${p.total} inmueble${p.total === 1 ? "" : "s"}`;
}

/** Páginas que se ofrecen en el paginador: la primera, la última y las vecinas de la actual (null = salto). */
export function paginasVisibles(actual: number, totalPaginas: number): (number | null)[] {
  if (totalPaginas <= 1) return [];
  const set = new Set<number>([0, totalPaginas - 1, actual - 1, actual, actual + 1]);
  const lista = [...set].filter((n) => n >= 0 && n < totalPaginas).sort((a, b) => a - b);
  const salida: (number | null)[] = [];
  lista.forEach((n, i) => {
    if (i > 0 && n - lista[i - 1] > 1) salida.push(null);
    salida.push(n);
  });
  return salida;
}

/** Cómo funciona, en 5 pasos: de la captación del inmueble a la cita con el comprador. */
export const PASOS_COMO_FUNCIONA = [
  {
    n: 1, titulo: "Registrar",
    texto: "El asesor registra cada lote o casa con su partida, sus documentos y la autorización para ofrecerlo.",
  },
  {
    n: 2, titulo: "Evaluar y completar",
    texto: "Las reglas revisan la partida y los documentos; el equipo completa lo que falta antes de ofrecerlo.",
  },
  {
    n: 3, titulo: "Publicar",
    texto: "Solo se publica un inmueble con autorización vigente, junto con lo que se encontró en sus documentos.",
  },
  {
    n: 4, titulo: "Buscar",
    texto: "Recorre el catálogo sin crear una cuenta y abre la ficha de cada inmueble con sus indicadores.",
  },
  {
    n: 5, titulo: "Solicitar cita",
    texto: "Cuando un inmueble te interesa, pides que un asesor te contacte para visitarlo y resolver tus dudas.",
  },
] as const;
