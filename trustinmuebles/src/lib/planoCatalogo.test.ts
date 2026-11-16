import { describe, expect, it } from "vitest";
import { clavesQueCoinciden, conVista, proyectoInicial, proyectosConLotes, vistaDeLaUrl } from "./planoCatalogo";
import type { InmuebleRecomendable } from "./types";

/* v1.0 (etapa 14): vista «Plano» del catálogo. */

const r = (clase: "CASO" | "LOTE_PROYECTO", proyectoCodigo: string | null, lote: string | null, proyecto: string | null = null): InmuebleRecomendable =>
  ({ codigo: `${proyectoCodigo}-${lote}`, denominacion: "x", clase, proyectoCodigo, lote, estado: null, fuenteIndicadorA: "PROPIO",
    predio: { proyecto } } as unknown as InmuebleRecomendable);

const ITEMS = [
  r("LOTE_PROYECTO", "altos", "A-1", "Altos de Ventisca"), r("LOTE_PROYECTO", "sol", "228A-10A", "Sol de Carhuaz – IV etapa"),
  r("LOTE_PROYECTO", "sol", "236-10B", "Sol de Carhuaz – IV etapa"), r("LOTE_PROYECTO", "sol", "219-6", "Sol de Carhuaz – IV etapa"),
  r("CASO", "santa", null, "Santa Elvira"), r("CASO", null, null),
];

describe("proyectos con lotes que cumplen los filtros", () => {
  it("cuenta solo los lotes de proyecto y ordena por cantidad y nombre", () => {
    expect(proyectosConLotes(ITEMS)).toEqual([
      { codigo: "sol", nombre: "Sol de Carhuaz – IV etapa", coinciden: 3 }, { codigo: "altos", nombre: "Altos de Ventisca", coinciden: 1 }]);
    expect(proyectosConLotes([])).toEqual([]);
  });

  it("da las claves de los lotes que cumplen en un proyecto", () => {
    expect([...clavesQueCoinciden(ITEMS, "sol")].sort()).toEqual(["219-6", "228A-10A", "236-10B"]);
    expect(clavesQueCoinciden(ITEMS, "no-existe").size).toBe(0);
  });

  it("abre con el proyecto del filtro, o con el primero", () => {
    const lista = proyectosConLotes(ITEMS);
    expect(proyectoInicial(lista, "altos de ventisca")).toBe("altos");
    expect(proyectoInicial(lista, "")).toBe("sol");
    expect(proyectoInicial(lista, "Otro proyecto")).toBe("sol");
    expect(proyectoInicial([], "")).toBeNull();
  });
});

describe("la vista en la URL", () => {
  it("«plano» va en la URL y «lista» la quita, sin tocar los filtros", () => {
    const base = new URLSearchParams("proyecto=Altos&precioMax=30000");
    expect(conVista(base, "plano").toString()).toBe("proyecto=Altos&precioMax=30000&vista=plano");
    expect(conVista(new URLSearchParams("proyecto=Altos&vista=plano"), "lista").toString()).toBe("proyecto=Altos");
    expect(base.toString()).toBe("proyecto=Altos&precioMax=30000"); // no cambia el original
    expect(vistaDeLaUrl(new URLSearchParams("vista=plano"))).toBe("plano");
    expect(vistaDeLaUrl(new URLSearchParams("vista=otra"))).toBe("lista");
    expect(vistaDeLaUrl(new URLSearchParams(""))).toBe("lista");
  });
});
