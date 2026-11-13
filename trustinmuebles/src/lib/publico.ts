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

// ------------------------------------------------------------------ v1.0 (etapa 6): realismo del contenido

/** Número de partida en el portal público: los primeros 4 caracteres y «••••». El personal autenticado lo ve completo. */
export function partidaOculta(codigo: string): string {
  return `${codigo.slice(0, 4)}••••`;
}

/** Cómo se muestra la partida en la ficha pública según haya sesión del personal o no. */
export const partidaVisible = (codigo: string, conSesion: boolean) => (conSesion ? codigo : partidaOculta(codigo));

/** Los especialistas no tienen número de colegiatura en el sistema: se registra al asignar al profesional. */
export const COLEGIATURA_PENDIENTE = "Colegiatura: se registra al asignar al profesional";
export const textoColegiatura = (c: string | null | undefined) =>
  c && c.trim() ? `Colegiatura: ${c.trim()}` : COLEGIATURA_PENDIENTE;

/**
 * PDF que se abren sin sesión desde la ficha de un caso PUBLICADO: la ficha registral, las láminas de los planos y los
 * documentos del lote presentados u observados. El informe técnico (B) no está: sigue pidiendo sesión.
 */
export interface PdfPublico { clave: string; nombre: string; url: string }

export function pdfsPublicos(d: {
  codigo: string;
  expediente: {
    planos: { especialidad: string; especialidadEtiqueta: string; estado: string }[];
    documentosLote?: { tipo: string; tipoEtiqueta: string; estado: string }[] | null;
  };
}): PdfPublico[] {
  const base = `/api/v1/publico/inmuebles/${encodeURIComponent(d.codigo)}`;
  const hay = (estado: string) => estado === "PRESENTADO" || estado === "OBSERVADO";
  return [
    { clave: "ficha", nombre: "Ficha registral del inmueble", url: `${base}/documento` },
    ...(d.expediente.documentosLote ?? []).filter((x) => hay(x.estado))
      .map((x) => ({ clave: x.tipo, nombre: x.tipoEtiqueta, url: `${base}/documentos-lote/${x.tipo}/documento` })),
    ...d.expediente.planos.filter((x) => hay(x.estado)).map((x) => ({
      clave: x.especialidad, nombre: nombrePlano(x.especialidadEtiqueta),
      url: `${base}/planos/${x.especialidad}/documento`,
    })),
  ];
}

/**
 * v1.0 (etapa 7): nombre de un plano en el portal. La etiqueta del servidor ya empieza con «Plano» («Plano
 * arquitectónico»): se usa tal cual; si no, se antepone «Plano de». Antes salía «Plano de plano arquitectónico».
 */
export function nombrePlano(etiqueta: string): string {
  return /^plano\b/i.test(etiqueta.trim()) ? etiqueta.trim() : `Plano de ${etiqueta.trim().toLowerCase()}`;
}

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
