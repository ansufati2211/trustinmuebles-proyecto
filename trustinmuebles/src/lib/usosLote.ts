import contenido from "@/contenido/usos-lote.json";

/*
 * v1.0 (etapa 5): usos que suelen permitirse en un lote según su zonificación y su área. Es una guía orientativa
 * (contenido/usos-lote.json): siempre va con el aviso de verificar el certificado de parámetros urbanísticos de la
 * municipalidad. No interviene en el indicador A ni en ninguna regla.
 */

export type CategoriaUso = "CASA" | "NEGOCIO" | "ALQUILAR" | "ALMACEN";

export interface UsoTipico { categoria: CategoriaUso; texto: string; areaMinimaM2: number }
export interface ZonaUsos { codigo: string; nombre: string; alias: string[]; usos: UsoTipico[] }

export const USOS_LOTE = contenido as {
  version: string; titulo: string; aviso: string; sinZonificacion: string; zonaDesconocida: string; nota: string;
  categorias: Record<CategoriaUso, string>; zonas: ZonaUsos[];
};

export const CATEGORIAS_USO = Object.keys(USOS_LOTE.categorias) as CategoriaUso[];
export const etiquetaUso = (c: CategoriaUso) => USOS_LOTE.categorias[c];

/** «RDM», «rdm», «RDM-1» o «R4» llevan a la misma zona; null si no se conoce. */
export function buscarZona(zonificacion: string | null | undefined): ZonaUsos | null {
  const z = (zonificacion ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!z) return null;
  const base = z.split(/[-/(]/)[0];
  return USOS_LOTE.zonas.find((x) => x.codigo === z || x.codigo === base || x.alias.includes(z) || x.alias.includes(base)) ?? null;
}

export interface UsoEvaluado extends UsoTipico { alcanzaArea: boolean }

export type Usos =
  | { estado: "SIN_ZONIFICACION"; mensaje: string; aviso: string }
  | { estado: "ZONA_DESCONOCIDA"; zonificacion: string; mensaje: string; aviso: string }
  | {
      estado: "CON_ZONIFICACION"; zona: ZonaUsos; zonificacion: string;
      /** Los que el área del lote alcanza (o todos, si no se conoce el área). */
      permitidos: UsoEvaluado[];
      /** Los que suelen pedir un lote más grande que este. */
      conMasArea: UsoEvaluado[];
      aviso: string;
    };

/** Usos típicos de un lote con esta zonificación y esta área. */
export function usosDelLote(zonificacion: string | null | undefined, areaM2: number | null | undefined): Usos {
  const aviso = USOS_LOTE.aviso;
  if (!zonificacion || !zonificacion.trim()) return { estado: "SIN_ZONIFICACION", mensaje: USOS_LOTE.sinZonificacion, aviso };
  const zona = buscarZona(zonificacion);
  if (!zona) return { estado: "ZONA_DESCONOCIDA", zonificacion: zonificacion.trim(), mensaje: USOS_LOTE.zonaDesconocida, aviso };
  const evaluados = zona.usos.map((u) => ({ ...u, alcanzaArea: areaM2 == null || areaM2 >= u.areaMinimaM2 }));
  return {
    estado: "CON_ZONIFICACION", zona, zonificacion: zonificacion.trim(), aviso,
    permitidos: evaluados.filter((u) => u.alcanzaArea),
    conMasArea: evaluados.filter((u) => !u.alcanzaArea),
  };
}

/**
 * Para el asistente: SI si la zonificación suele permitir ese uso y el área alcanza; NO si no lo contempla o el área no
 * alcanza; DESCONOCIDO si no hay zonificación o no se conoce.
 */
export function compatibilidadUso(zonificacion: string | null | undefined, areaM2: number | null | undefined,
  categoria: CategoriaUso): { resultado: "SI" | "NO" | "DESCONOCIDO"; uso?: UsoTipico; zona?: ZonaUsos } {
  const zona = buscarZona(zonificacion);
  if (!zona) return { resultado: "DESCONOCIDO" };
  const uso = zona.usos.find((u) => u.categoria === categoria);
  if (!uso) return { resultado: "NO", zona };
  return { resultado: areaM2 == null || areaM2 >= uso.areaMinimaM2 ? "SI" : "NO", uso, zona };
}

/** Área mínima con la que una categoría de uso suele ser posible en alguna zonificación conocida. */
export function areaMinimaHabitual(categoria: CategoriaUso): number | null {
  const areas = USOS_LOTE.zonas.flatMap((z) => z.usos).filter((u) => u.categoria === categoria).map((u) => u.areaMinimaM2);
  return areas.length ? Math.min(...areas) : null;
}
