import { describe, expect, it } from "vitest";
import { fechaHora, formatearEntrada, lineaDeTiempo, transicion } from "./historial";
import type { EntradaHistorial } from "./types";

const entrada = (p: Partial<EntradaHistorial>): EntradaHistorial => ({
  registradaEn: "2026-10-20T15:30:00Z", estadoAnterior: "AMARILLO", estadoNuevo: "VERDE",
  motivos: [{ tipo: "LIMITE", texto: "No se detectaron alertas." }], faltantes: [], versionReglas: "v0.4",
  origen: "PLANO_ADJUNTO", cuentaCodigo: "revisor-01", ...p,
});

describe("línea de tiempo del historial", () => {
  it("formatea color anterior → nuevo, origen, cuenta y versión", () => {
    const e = formatearEntrada(entrada({}), 0);
    expect(e.transicion).toBe("Amarillo → Verde");
    expect(e.cambioDeColor).toBe(true);
    expect(e.origen).toBe("Plano incorporado o adjuntado");
    expect(e.cuenta).toBe("revisor-01");
    expect(e.versionReglas).toBe("v0.4");
    expect(e.motivos).toEqual(["No se detectaron alertas."]);
    expect(e.fecha).not.toBe("");
  });

  it("la primera evaluación no tiene color anterior y la carga figura como el sistema", () => {
    const e = formatearEntrada(entrada({ estadoAnterior: null, estadoNuevo: "GRIS", origen: "CARGA_INICIAL", cuentaCodigo: "sistema" }), 0);
    expect(e.transicion).toBe("Primera evaluación: Gris");
    expect(e.cambioDeColor).toBe(false);
    expect(e.origen).toBe("Carga inicial");
    expect(e.cuenta).toBe("Sistema (carga de contenido)");
  });

  it("un recálculo sin cambio de color se marca como tal", () => {
    expect(formatearEntrada(entrada({ estadoAnterior: "ROJO", estadoNuevo: "ROJO" }), 0).cambioDeColor).toBe(false);
    expect(transicion("ROJO", "ROJO")).toBe("Rojo → Rojo");
  });

  it("ordena de la más reciente a la más antigua sin agregar ni quitar entradas", () => {
    const l = lineaDeTiempo([
      entrada({ origen: "PARTIDA_TRANSCRITA", estadoAnterior: null, estadoNuevo: "AMARILLO" }),
      entrada({ origen: "PLANO_ADJUNTO" }),
    ]);
    expect(l).toHaveLength(2);
    expect(l[0].origen).toBe("Plano incorporado o adjuntado");
    expect(l[1].origen).toBe("Partida transcrita incorporada");
  });

  it("sin datos o con campos ausentes no inventa nada", () => {
    expect(lineaDeTiempo(null)).toEqual([]);
    expect(lineaDeTiempo(undefined)).toEqual([]);
    expect(lineaDeTiempo([])).toEqual([]);
    const e = formatearEntrada(entrada({ motivos: undefined as never, faltantes: undefined as never }), 0);
    expect(e.motivos).toEqual([]);
    expect(e.faltantes).toEqual([]);
    expect(fechaHora(null)).toBe("");
    expect(fechaHora("no-es-fecha")).toBe("");
  });
});
