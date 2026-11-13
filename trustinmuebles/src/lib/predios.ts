import { FOTOS_LIBRES } from "./creditos";
import type { TipoInmueble } from "./types";

/** Variantes de la ilustración del predio. Son dibujos propios (SVG), no fotos: no muestran el inmueble real. */
export type VariantePredio = "casa1" | "casa2" | "adobe" | "lote";

export interface PaletaPredio {
  fachada: string; fachada2: string; carpinteria: string; acento: string; vidrio: string;
}

export interface ConfigPredio {
  variante: VariantePredio;
  paleta: PaletaPredio;
  cielo: "dia" | "tarde";
  arbol: "huarango" | "palmera" | null;
  arbolLado: "izq" | "der";
  reja: boolean;
  /** Segundo piso en construcción (ampliación no declarada). Solo en casa2. */
  obra: boolean;
  descripcion: string;
}

export const PALETAS: Record<string, PaletaPredio> = {
  crema: { fachada: "#F3EADB", fachada2: "#E0CFB5", carpinteria: "#5B4636", acento: "#2B6E57", vidrio: "#BFD9E6" },
  terracota: { fachada: "#EDD3B8", fachada2: "#C98F63", carpinteria: "#3F3A36", acento: "#1E5242", vidrio: "#C6DDE8" },
  grafito: { fachada: "#F2F2EE", fachada2: "#7F8C86", carpinteria: "#2F3B36", acento: "#D99A3D", vidrio: "#B7D3E1" },
  salvia: { fachada: "#DFE8DC", fachada2: "#9DB49A", carpinteria: "#4A3B2E", acento: "#7A4A0B", vidrio: "#C3DCE6" },
  ocre: { fachada: "#F0DFB0", fachada2: "#C9A35A", carpinteria: "#4D3A22", acento: "#8F1D14", vidrio: "#C9E0EA" },
  bruma: { fachada: "#E4E9EE", fachada2: "#93A3B5", carpinteria: "#33404D", acento: "#2B6E57", vidrio: "#BED6E4" },
  adobe: { fachada: "#D5B08A", fachada2: "#B48A62", carpinteria: "#5A3A22", acento: "#2F5D8A", vidrio: "#3A2A1E" },
  terreno: { fachada: "#C9A878", fachada2: "#A88757", carpinteria: "#6B5B4B", acento: "#D33A2C", vidrio: "#FFFFFF" },
};

const caso = (variante: VariantePredio, paleta: keyof typeof PALETAS, extra: Partial<ConfigPredio> & { descripcion: string }): ConfigPredio => ({
  variante, paleta: PALETAS[paleta], cielo: "dia", arbol: null, arbolLado: "der", reja: false, obra: false, ...extra,
});

/** Una ilustración distinta por cada expediente del catálogo, para que las tarjetas no se vean iguales. */
export const PREDIOS: Record<string, ConfigPredio> = {
  "11048217": caso("casa1", "crema", { arbol: "huarango", reja: true, descripcion: "vivienda moderna de un piso con fachada crema, reja y un huarango" }),
  "11052690": caso("casa2", "terracota", { arbol: "palmera", arbolLado: "izq", descripcion: "vivienda moderna de dos pisos con fachada terracota y una palmera" }),
  "11061555": caso("casa1", "grafito", { cielo: "tarde", descripcion: "vivienda moderna de un piso con fachada blanca y gris, al atardecer" }),
  "11070419": caso("casa1", "ocre", { arbol: "huarango", arbolLado: "izq", descripcion: "vivienda de un piso con fachada ocre y un huarango" }),
  "11075836": caso("casa2", "bruma", { reja: true, descripcion: "vivienda de dos pisos con fachada gris azulada y reja" }),
  "11081204": caso("lote", "terreno", { arbol: "huarango", arbolLado: "der", descripcion: "lote urbano cercado con hitos en las esquinas y vereda" }),
  "11087751": caso("adobe", "adobe", { arbol: "huarango", descripcion: "vivienda tradicional de adobe con puerta de madera y un huarango" }),
  "11093320": caso("casa1", "salvia", { cielo: "tarde", arbol: "palmera", descripcion: "vivienda de un piso con fachada verde salvia y una palmera, al atardecer" }),
  "11098467": caso("casa2", "crema", { obra: true, descripcion: "vivienda con un segundo piso en construcción" }),
  "11104029": caso("casa2", "grafito", { arbol: "palmera", arbolLado: "izq", descripcion: "vivienda moderna de dos pisos con fachada blanca y gris y una palmera" }),
};

/** Ilustración de un expediente. Una partida transcrita (sin dibujo propio) recibe una según su tipo y su número. */
export function configPredio(codigo: string, tipo: TipoInmueble): ConfigPredio {
  const limpio = codigo.replace(/^SIM-/, "");
  const fijo = PREDIOS[limpio] ?? PREDIOS[codigo];
  if (fijo) return fijo;
  if (tipo === "LOTE_URBANO") return PREDIOS["11081204"];
  const claves = ["crema", "terracota", "grafito", "salvia", "ocre", "bruma"] as const;
  const h = Array.from(codigo).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const paleta = claves[h % claves.length];
  return caso(h % 2 ? "casa1" : "casa2", paleta, { arbol: h % 3 === 0 ? "huarango" : null, descripcion: "vivienda urbana" });
}

/** Texto alternativo: dice qué se ve y aclara que no es una foto del inmueble. */
export const textoAlternativo = (c: ConfigPredio) =>
  `Ilustración referencial: ${c.descripcion}. No es una foto del inmueble.`;

/**
 * Fotografías reales de inmuebles y parajes peruanos acordes con la descripción y ubicación de cada expediente
 * (Wikimedia Commons, licencias libres CC / dominio público; ver public/img/casas/CREDITOS.md).
 * En la interfaz llevan el rótulo «Imagen referencial».
 */
/**
 * v1.0 (etapa 6): la foto de un predio, solo si su licencia es libre (está en FOTOS_LIBRES de lib/creditos.ts). Las que
 * eran «Referencial académico» ya no se muestran: el predio usa su ilustración hasta que se agreguen fotos de Unsplash.
 */
export function fotoDePredio(codigo: string): { archivo: string; descripcion: string } | undefined {
  const clave = codigo.replace(/^(SIM|INT)-/, "");
  return FOTOS_LIBRES[clave] ? FOTOS_PREDIO[clave] : undefined;
}

export const FOTOS_PREDIO: Record<string, { archivo: string; descripcion: string }> = {
  "11048217": { archivo: "casa-1.jpg", descripcion: "vivienda peruana de un piso en buen estado con reja frontal, cochera y árbol en la acera" },
  "11052690": { archivo: "casa-2.jpg", descripcion: "vivienda en urbanización peruana con fachada de ladrillo caravista, reja y portón de cochera" },
  "11070419": { archivo: "casa-4.jpg", descripcion: "vivienda peruana de fachada clara con borde terracota y dos portones de madera de cochera" },
  "11075836": { archivo: "casa-5.jpg", descripcion: "vivienda urbana peruana de fachada crema y gris con portón de madera y árbol al frente" },
  "11098467": { archivo: "casa-8.jpg", descripcion: "vivienda peruana de un piso pintado con ampliación de segundo piso en ladrillo sin tarrajear" },
  "11081204": { archivo: "lote-santiago.jpg", descripcion: "lote urbano cercado con muro de ladrillo sobre terreno costero en habilitación urbana peruana" },
  "80194645": { archivo: "lote-supe.jpg", descripcion: "terreno eriazo arenoso al pie de los cerros y el valle de Supe, Barranca" },
};
