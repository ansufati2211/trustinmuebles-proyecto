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

/** Una ilustración distinta por cada expediente de la demostración, para que las tarjetas no se vean iguales. */
export const PREDIOS: Record<string, ConfigPredio> = {
  "SIM-11048217": caso("casa1", "crema", { arbol: "huarango", reja: true, descripcion: "vivienda moderna de un piso con fachada crema, reja y un huarango" }),
  "SIM-11052690": caso("casa2", "terracota", { arbol: "palmera", arbolLado: "izq", descripcion: "vivienda moderna de dos pisos con fachada terracota y una palmera" }),
  "SIM-11061555": caso("casa1", "grafito", { cielo: "tarde", descripcion: "vivienda moderna de un piso con fachada blanca y gris, al atardecer" }),
  "SIM-11070419": caso("casa1", "ocre", { arbol: "huarango", arbolLado: "izq", descripcion: "vivienda de un piso con fachada ocre y un huarango" }),
  "SIM-11075836": caso("casa2", "bruma", { reja: true, descripcion: "vivienda de dos pisos con fachada gris azulada y reja" }),
  "SIM-11081204": caso("lote", "terreno", { arbol: "huarango", arbolLado: "der", descripcion: "lote urbano cercado con hitos en las esquinas y vereda" }),
  "SIM-11087751": caso("adobe", "adobe", { arbol: "huarango", descripcion: "vivienda tradicional de adobe con puerta de madera y un huarango" }),
  "SIM-11093320": caso("casa1", "salvia", { cielo: "tarde", arbol: "palmera", descripcion: "vivienda de un piso con fachada verde salvia y una palmera, al atardecer" }),
  "SIM-11098467": caso("casa2", "crema", { obra: true, descripcion: "vivienda con un segundo piso en construcción" }),
  "SIM-11104029": caso("casa2", "grafito", { arbol: "palmera", arbolLado: "izq", descripcion: "vivienda moderna de dos pisos con fachada blanca y gris y una palmera" }),
};

/** Ilustración de un expediente. Una partida transcrita (sin dibujo propio) recibe una según su tipo y su número. */
export function configPredio(codigo: string, tipo: TipoInmueble): ConfigPredio {
  const fijo = PREDIOS[codigo];
  if (fijo) return fijo;
  if (tipo === "LOTE_URBANO") return PREDIOS["SIM-11081204"];
  const claves = ["crema", "terracota", "grafito", "salvia", "ocre", "bruma"] as const;
  const h = Array.from(codigo).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const paleta = claves[h % claves.length];
  return caso(h % 2 ? "casa1" : "casa2", paleta, { arbol: h % 3 === 0 ? "huarango" : null, descripcion: "vivienda urbana" });
}

/** Texto alternativo: dice qué se ve y aclara que no es una foto del inmueble. */
export const textoAlternativo = (c: ConfigPredio) =>
  `Ilustración referencial: ${c.descripcion}. No es una foto del inmueble.`;
