import { describe, expect, it } from "vitest";
import { FILTRO_CARTERA_VACIO, filtrarCartera, totalesDeCasos, totalesDelPanel } from "./cartera";
import type { EstadoPublicacion, EstadoSemaforo, ResumenCaso } from "./types";

const caso = (codigo: string, estado: EstadoSemaforo | null, estadoPublicacion: EstadoPublicacion, distrito = "Ica"): ResumenCaso => ({
  codigo, denominacion: `Lote ${codigo}`, contexto: "Ica", estado, etiqueta: null, pendientes: 0, origen: "SINTETICO",
  fuente: null, fechaConsulta: null, estadoTecnico: "NO_SOLICITADA", resultadoTecnico: null, riesgoFisicoDetectado: false,
  predio: { tipoInmueble: "VIVIENDA_URBANA", tipoInmuebleEtiqueta: "Vivienda urbana", distrito, areaM2: null,
    areaConstruidaInscrita: null, precioReferencial: null, moneda: null, precioNota: null },
  estadoPublicacion,
});

const LISTA = [
  caso("SIM-1", "VERDE", "PUBLICADO", "Parcona"),
  caso("SIM-2", "AMARILLO", "PUBLICADO", "Salas"),
  caso("SIM-3", "ROJO", "RETIRADO", "Santiago"),
  caso("SIM-4", "AMARILLO", "BORRADOR", "Ica"),
  caso("SIM-5", null, "BORRADOR", "Ica"),
];

describe("totales del panel de cartera", () => {
  it("cuenta por color de A y por estado de publicación", () => {
    const t = totalesDeCasos(LISTA);
    expect(t.total).toBe(5);
    expect(t.porColor).toEqual({ VERDE: 1, AMARILLO: 2, ROJO: 1, GRIS: 0 });
    expect(t.sinEvaluar).toBe(1);
    expect(t.porPublicacion).toEqual({ BORRADOR: 2, PUBLICADO: 2, RETIRADO: 1 });
  });

  it("una lista vacía o ausente da todo en cero", () => {
    for (const l of [[], null, undefined]) {
      const t = totalesDeCasos(l);
      expect(t.total).toBe(0);
      expect(Object.values(t.porColor).every((n) => n === 0)).toBe(true);
      expect(Object.values(t.porPublicacion).every((n) => n === 0)).toBe(true);
    }
  });

  it("toma los totales del servidor tal cual y pone cero en lo que falte", () => {
    const t = totalesDelPanel({ totalCasos: 10, porColor: { VERDE: 2, AMARILLO: 4, ROJO: 2, GRIS: 2 },
      porEstadoPublicacion: { PUBLICADO: 10 } });
    expect(t.total).toBe(10);
    expect(t.porColor).toEqual({ VERDE: 2, AMARILLO: 4, ROJO: 2, GRIS: 2 });
    expect(t.porPublicacion).toEqual({ BORRADOR: 0, PUBLICADO: 10, RETIRADO: 0 });
    expect(t.sinEvaluar).toBe(0);
  });

  it("un panel ausente o con datos inválidos no rompe la vista", () => {
    expect(totalesDelPanel(null).total).toBe(0);
    expect(totalesDelPanel(undefined).porColor.VERDE).toBe(0);
    const raro = totalesDelPanel({ totalCasos: Number.NaN, porColor: { VERDE: "3" as unknown as number } });
    expect(raro.total).toBe(0);
    expect(raro.porColor.VERDE).toBe(0);
    expect(totalesDelPanel({ totalCasos: 3, porColor: { VERDE: 1 } }).sinEvaluar).toBe(2);
  });
});

describe("filtros del panel de cartera", () => {
  const codigos = (l: ResumenCaso[]) => l.map((c) => c.codigo);

  it("sin filtros devuelve todo", () => {
    expect(codigos(filtrarCartera(LISTA, FILTRO_CARTERA_VACIO))).toEqual(["SIM-1", "SIM-2", "SIM-3", "SIM-4", "SIM-5"]);
  });

  it("combina color, publicación y texto con «y»", () => {
    expect(codigos(filtrarCartera(LISTA, { color: "AMARILLO", publicacion: "", q: "" }))).toEqual(["SIM-2", "SIM-4"]);
    expect(codigos(filtrarCartera(LISTA, { color: "AMARILLO", publicacion: "BORRADOR", q: "" }))).toEqual(["SIM-4"]);
    expect(codigos(filtrarCartera(LISTA, { color: "", publicacion: "", q: "salas" }))).toEqual(["SIM-2"]);
    expect(codigos(filtrarCartera(LISTA, { color: "", publicacion: "", q: "  sim-3 " }))).toEqual(["SIM-3"]);
  });

  it("filtros incompatibles o lista vacía dan una lista vacía", () => {
    expect(filtrarCartera(LISTA, { color: "VERDE", publicacion: "RETIRADO", q: "" })).toEqual([]);
    expect(filtrarCartera(LISTA, { color: "GRIS", publicacion: "", q: "" })).toEqual([]);
    expect(filtrarCartera(null, { color: "VERDE", publicacion: "", q: "" })).toEqual([]);
    expect(filtrarCartera([], FILTRO_CARTERA_VACIO)).toEqual([]);
  });
});
