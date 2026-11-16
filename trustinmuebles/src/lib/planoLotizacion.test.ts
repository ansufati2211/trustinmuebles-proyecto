import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cargarPlano, esPlano, olvidarPlanos, posicionEnVentana, rutaPlano, ventanaDe, VENTANA_COMPLETA, type PlanoLotizacion } from "./planoLotizacion";

/* v1.0 (etapa 11): plano de la lotización con la posición de cada lote. */

const PLANO: PlanoLotizacion = {
  proyecto: "p", imagen: "/planos/p.jpg", ancho: 4000, alto: 4000,
  lotes: { "A-1": [0.5, 0.5], "A-2": [0.01, 0.02], "A-3": [0.99, 0.98] },
};

describe("ventana de un lote", () => {
  it("se centra en el lote y mantiene la proporción 4:3", () => {
    const v = ventanaDe(PLANO, "A-1")!;
    expect(v.w).toBeCloseTo(0.16);
    expect((v.w * PLANO.ancho) / (v.h * PLANO.alto)).toBeCloseTo(4 / 3);
    expect(v.x + v.w / 2).toBeCloseTo(0.5);
    expect(v.y + v.h / 2).toBeCloseTo(0.5);
    const p = posicionEnVentana(PLANO.lotes["A-1"], v);
    expect(p.izq).toBeCloseTo(50);
    expect(p.arr).toBeCloseTo(50);
  });

  it("no se sale de la imagen en las esquinas y el pin sigue dentro de la ventana", () => {
    for (const k of ["A-2", "A-3"]) {
      const v = ventanaDe(PLANO, k)!;
      expect(v.x).toBeGreaterThanOrEqual(0);
      expect(v.y).toBeGreaterThanOrEqual(0);
      expect(v.x + v.w).toBeLessThanOrEqual(1 + 1e-9);
      expect(v.y + v.h).toBeLessThanOrEqual(1 + 1e-9);
      const p = posicionEnVentana(PLANO.lotes[k], v);
      expect(p.izq).toBeGreaterThanOrEqual(0);
      expect(p.izq).toBeLessThanOrEqual(100);
      expect(p.arr).toBeGreaterThanOrEqual(0);
      expect(p.arr).toBeLessThanOrEqual(100);
    }
  });

  it("un lote que no está en el plano no tiene ventana; el plano entero pone cada punto en su fracción", () => {
    expect(ventanaDe(PLANO, "Z-9")).toBeNull();
    expect(posicionEnVentana([0.25, 0.75], VENTANA_COMPLETA)).toEqual({ izq: 25, arr: 75 });
  });
});

describe("lectura del plano", () => {
  afterEach(() => { olvidarPlanos(); vi.unstubAllGlobals(); });

  it("reconoce un plano válido y rechaza lo que no lo es", () => {
    expect(esPlano(PLANO)).toBe(true);
    expect(esPlano(null)).toBe(false);
    expect(esPlano({ ...PLANO, imagen: "https://otro.sitio/x.jpg" })).toBe(false);
    expect(esPlano({ ...PLANO, lotes: { "A-1": [1.5, 0.2] } })).toBe(false);
    expect(esPlano({ ...PLANO, ancho: 0 })).toBe(false);
  });

  it("devuelve el plano una sola vez por proyecto y null si no hay (404, otra cosa o error de red)", async () => {
    const fetchSim = vi.fn(async (url: string) => {
      if (url === rutaPlano("p")) return { ok: true, json: async () => PLANO };
      if (url === rutaPlano("html")) return { ok: true, json: async () => { throw new SyntaxError("no es JSON"); } };
      if (url === rutaPlano("red")) throw new Error("sin red");
      return { ok: false, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchSim);
    expect(await cargarPlano("p")).toEqual(PLANO);
    expect(await cargarPlano("p")).toEqual(PLANO);
    expect(fetchSim).toHaveBeenCalledTimes(1);
    expect(await cargarPlano("no-tiene")).toBeNull();
    expect(await cargarPlano("html")).toBeNull();
    expect(await cargarPlano("red")).toBeNull();
  });
});

describe("plano de Sol de Carhuaz – IV etapa (archivo publicado)", () => {
  const raiz = path.resolve(__dirname, "..", "..");
  const plano = JSON.parse(readFileSync(path.join(raiz, "public", "planos", "sol-de-carhuaz-iv-etapa.json"), "utf8"));
  const csv = readFileSync(path.join(raiz, "..", "docs", "demo", "kit", "sol-de-carhuaz-iv-etapa-lotes.csv"), "utf8")
    .trim().split(/\r?\n/).slice(1).map((f) => f.split(","));

  it("es un plano válido con la imagen publicada y la proporción real", () => {
    expect(esPlano(plano)).toBe(true);
    expect(plano.proyecto).toBe("sol-de-carhuaz-iv-etapa");
    expect(plano.imagen).toBe("/planos/sol-de-carhuaz-iv-etapa.jpg");
    expect(plano.ancho / plano.alto).toBeCloseTo(11589 / 13205, 2);
  });

  it("tiene la posición de los 214 lotes del CSV, ni uno más ni uno menos", () => {
    const claves = csv.map(([mz, lote]) => `${mz}-${lote}`);
    expect(claves).toHaveLength(214);
    expect(Object.keys(plano.lotes).sort()).toEqual([...claves].sort());
  });

  it("dos lotes no comparten la misma posición", () => {
    const vistos = new Set(Object.values(plano.lotes).map((p) => (p as number[]).join(",")));
    expect(vistos.size).toBe(214);
  });
});
