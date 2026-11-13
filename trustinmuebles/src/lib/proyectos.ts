import type { EstadoComercial, InmueblePublico, LoteProyecto } from "./types";

/*
 * v1.0 (etapa 3a): proyectos de urbanización en el portal público. Aquí vive la lógica sin React: rutas, el dibujo del
 * plano (posición de cada lote), los colores y textos de la leyenda, la navegación con teclado y el video del recorrido.
 */

// ------------------------------------------------------------------------------------------------- rutas

export const rutaProyectoPublico = (codigo: string) => `/publico/proyectos/${encodeURIComponent(codigo)}`;
export const rutaLotePublico = (codigo: string, clave: string) =>
  `/publico/proyectos/${encodeURIComponent(codigo)}/lotes/${encodeURIComponent(clave)}`;
/** El PDF de un documento del proyecto se abre sin sesión: es un enlace directo a la API. */
/** Ruta de la API (sin «/api/v1») de un documento del proyecto, para abrirlo con la sesión (v1.0, etapa 7). */
export const rutaDocumentoProyecto = (codigo: string, tipo: string) =>
  `/publico/proyectos/${encodeURIComponent(codigo)}/documentos/${encodeURIComponent(tipo)}`;

/** Enlace directo, sin sesión: el servidor entrega la partida matriz parcialmente oculta. */
export const urlDocumentoProyecto = (codigo: string, tipo: string) => `/api/v1${rutaDocumentoProyecto(codigo, tipo)}`;

export const enlaceProyecto = (codigo: string) => `/proyectos/${encodeURIComponent(codigo)}`;

/** La ficha de un lote: la de su caso propio si lo tiene, o la del lote dentro del proyecto. */
export function enlaceLote(proyectoCodigo: string, lote: Pick<LoteProyecto, "clave" | "casoCodigo">): string {
  if (lote.casoCodigo) return `/inmuebles/${encodeURIComponent(lote.casoCodigo)}`;
  return `${enlaceProyecto(proyectoCodigo)}/lotes/${encodeURIComponent(lote.clave)}`;
}

/** La ficha de un inmueble del catálogo: un caso o un lote de proyecto sin caso propio. */
export function enlaceInmueble(c: Pick<InmueblePublico, "codigo" | "clase" | "proyectoCodigo" | "lote">): string {
  if (c.clase === "LOTE_PROYECTO" && c.proyectoCodigo && c.lote) {
    return enlaceLote(c.proyectoCodigo, { clave: c.lote, casoCodigo: null });
  }
  return `/inmuebles/${encodeURIComponent(c.codigo)}`;
}

/** «A-7» → «Mz. A · Lote 7». */
export function nombreLote(clave: string): string {
  const i = clave.lastIndexOf("-");
  return i <= 0 ? clave : `Mz. ${clave.slice(0, i)} · Lote ${clave.slice(i + 1)}`;
}

// ------------------------------------------------------------------------------------------------- estados

export type EstadoPlano = EstadoComercial | "NO_PUBLICADO";

/**
 * Cómo se ve cada estado en el plano. No usa los colores del semáforo (el indicador A): el color siempre va con un
 * patrón y con el texto de la leyenda, para que no dependa solo del color.
 */
export const ESTILO_LOTE: Record<EstadoPlano, { etiqueta: string; relleno: string; borde: string; texto: string; patron: string | null; trazo?: string }> = {
  DISPONIBLE: { etiqueta: "Disponible", relleno: "#ECFDF5", borde: "#047857", texto: "#022C22", patron: null },
  SEPARADO: { etiqueta: "Separado", relleno: "#F3EAD8", borde: "#7C5A2A", texto: "#3F2D12", patron: "puntos" },
  VENDIDO: { etiqueta: "Vendido", relleno: "#E3EEF8", borde: "#1C4A73", texto: "#132F4A", patron: "rayas" },
  NO_PUBLICADO: { etiqueta: "No publicado en línea", relleno: "#FFFFFF", borde: "#6B7771", texto: "#36423C", patron: null, trazo: "4 3" },
};

export const ORDEN_LEYENDA: EstadoPlano[] = ["DISPONIBLE", "SEPARADO", "VENDIDO", "NO_PUBLICADO"];

export const estadoEnPlano = (l: Pick<LoteProyecto, "publicado" | "estadoComercial">): EstadoPlano =>
  l.publicado ? l.estadoComercial : "NO_PUBLICADO";

/** Cuántos lotes hay en cada estado del plano; la leyenda solo muestra los que tienen alguno. */
export function conteoPlano(lotes: Pick<LoteProyecto, "publicado" | "estadoComercial">[]): Record<EstadoPlano, number> {
  const n: Record<EstadoPlano, number> = { DISPONIBLE: 0, SEPARADO: 0, VENDIDO: 0, NO_PUBLICADO: 0 };
  for (const l of lotes) n[estadoEnPlano(l)]++;
  return n;
}

/** Texto para lectores de pantalla: «Manzana A, lote 7: disponible, 140 m², S/ 35,000». */
export function descripcionLote(l: LoteProyecto, formatoPrecio: (monto: number, moneda: string | null) => string): string {
  const partes = [`Manzana ${l.manzana}, lote ${l.numero}: ${ESTILO_LOTE[estadoEnPlano(l)].etiqueta.toLowerCase()}`,
    `${formatoArea(l.areaM2)} m²`];
  if (l.precio != null) partes.push(formatoPrecio(l.precio, l.moneda));
  return partes.join(", ");
}

const formatoArea = (n: number) => n.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

// ------------------------------------------------------------------------------------------------- dibujo del plano

/** Medidas del dibujo, en unidades del viewBox. */
export const PLANO = { ancho: 34, fondo: 46, calle: 34, margen: 18, rotulo: 18, porFila: 2 } as const;

export interface LoteDibujado { lote: LoteProyecto; x: number; y: number; w: number; h: number }
export interface ManzanaDibujada { manzana: string; x: number; y: number; w: number; h: number; lotes: LoteDibujado[] }
export interface Plano { manzanas: ManzanaDibujada[]; ancho: number; alto: number; orden: LoteProyecto[] }

/**
 * Posición de cada lote. Cada manzana es un bloque de dos filas, como en un plano de lotización: la fila de arriba va
 * del lote 1 hacia la derecha y la de abajo vuelve hacia la izquierda. Las manzanas se acomodan en filas de dos (o las
 * que se pidan), separadas por calles. {@code orden} es el orden de lectura (manzana y número) que usa el teclado.
 */
export function dibujarPlano(lotes: LoteProyecto[], porFila: number = PLANO.porFila): Plano {
  const porManzana = new Map<string, LoteProyecto[]>();
  for (const l of lotes) {
    const lista = porManzana.get(l.manzana) ?? [];
    lista.push(l);
    porManzana.set(l.manzana, lista);
  }
  const nombres = [...porManzana.keys()].sort((a, b) => a.localeCompare(b, "es"));
  const bloques = nombres.map((m) => {
    const lista = porManzana.get(m)!.slice().sort((a, b) => a.numero - b.numero);
    const columnas = Math.max(1, Math.ceil(lista.length / 2));
    return { manzana: m, lista, columnas };
  });
  const filas = Math.max(1, porFila);
  const anchoColumna = Math.max(1, ...bloques.map((b) => b.columnas)) * PLANO.ancho;
  const altoBloque = PLANO.rotulo + 2 * PLANO.fondo;

  const manzanas: ManzanaDibujada[] = bloques.map((b, i) => {
    const col = i % filas;
    const fila = Math.floor(i / filas);
    const w = b.columnas * PLANO.ancho;
    const x0 = PLANO.margen + col * (anchoColumna + PLANO.calle) + (anchoColumna - w) / 2;
    const y0 = PLANO.margen + fila * (altoBloque + PLANO.calle);
    const yLotes = y0 + PLANO.rotulo;
    const dibujados = b.lista.map((lote, k) => {
      const arriba = k < b.columnas;
      const columna = arriba ? k : b.columnas - 1 - (k - b.columnas);
      return { lote, x: x0 + columna * PLANO.ancho, y: arriba ? yLotes : yLotes + PLANO.fondo, w: PLANO.ancho, h: PLANO.fondo };
    });
    return { manzana: b.manzana, x: x0, y: yLotes, w, h: 2 * PLANO.fondo, lotes: dibujados };
  });

  const usadas = Math.min(filas, Math.max(1, bloques.length));
  const ancho = 2 * PLANO.margen + usadas * anchoColumna + (usadas - 1) * PLANO.calle;
  const filasUsadas = Math.max(1, Math.ceil(bloques.length / filas));
  const alto = 2 * PLANO.margen + filasUsadas * altoBloque + (filasUsadas - 1) * PLANO.calle;
  return { manzanas, ancho, alto, orden: bloques.flatMap((b) => b.lista) };
}

// ------------------------------------------------------------------------------------------------- teclado

/**
 * Lote al que se mueve el foco con una tecla (en orden de manzana y número). Flechas a la derecha o abajo: el siguiente;
 * a la izquierda o arriba: el anterior; Inicio y Fin: el primero y el último. Otra tecla: null (no se mueve).
 */
export function siguienteIndice(actual: number, tecla: string, total: number): number | null {
  if (total <= 0) return null;
  switch (tecla) {
    case "ArrowRight":
    case "ArrowDown":
      return Math.min(total - 1, actual + 1);
    case "ArrowLeft":
    case "ArrowUp":
      return Math.max(0, actual - 1);
    case "Home":
      return 0;
    case "End":
      return total - 1;
    default:
      return null;
  }
}

/** Enter o la barra espaciadora abren el panel del lote, como un botón. */
export const activaLote = (tecla: string) => tecla === "Enter" || tecla === " " || tecla === "Spacebar";

// ------------------------------------------------------------------------------------------------- recorrido o video

export type Recorrido = { tipo: "youtube"; src: string; id: string } | { tipo: "enlace"; href: string };

/**
 * Cómo mostrar el enlace del recorrido. Un video de YouTube se incrusta desde youtube-nocookie.com (sin cookies de
 * seguimiento hasta que se reproduce); cualquier otro enlace https se ofrece como botón para abrirlo aparte. Un enlace
 * vacío, que no es https o que no se entiende, no se muestra.
 */
export function recorridoDe(url: string | null | undefined): Recorrido | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase().replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else {
      const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/);
      if (m) id = m[1];
    }
  }
  if (host === "youtu.be" || host === "youtube.com" || host === "youtube-nocookie.com") {
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return { tipo: "youtube", id, src: `https://www.youtube-nocookie.com/embed/${id}?rel=0` };
  }
  return { tipo: "enlace", href: u.toString() };
}

/** El catálogo filtrado por el proyecto (el filtro usa el nombre, como el selector de proyectos). */
export const enlaceCatalogoDelProyecto = (nombre: string) => `/inmuebles?${new URLSearchParams({ proyecto: nombre })}`;
