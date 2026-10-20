import { describe, expect, it } from "vitest";
import { compararAreas } from "./areas";

describe("comparador de áreas (plano arquitectónico frente a la partida)", () => {
  it("detecta la ampliación no declarada de Pachacútec: 98 m² en el plano contra 72 m² inscritos", () => {
    const r = compararAreas(98, 72);
    expect(r.estado).toBe("discrepa");
    if (r.estado !== "discrepa") return;
    expect(r.diferencia).toBe(26);
    expect(r.porcentaje).toBe(36.1);
    expect(r.anchoPlano).toBe(100);
    expect(r.anchoInscrita).toBe(73.5);
  });

  it("coincide con una diferencia de hasta 1 % (el margen de RV-05)", () => {
    expect(compararAreas(84.5, 84.5).estado).toBe("coincide");
    expect(compararAreas(85.34, 84.5).estado).toBe("coincide");
    expect(compararAreas(85.4, 84.5).estado).toBe("discrepa");
  });

  it("una diferencia hacia abajo también es discrepancia y queda negativa", () => {
    const r = compararAreas(60, 72);
    expect(r.estado).toBe("discrepa");
    if (r.estado === "discrepa") expect(r.diferencia).toBe(-12);
  });

  it("sin área en el plano o sin área inscrita no hay comparación", () => {
    expect(compararAreas(null, 72).estado).toBe("sin-plano");
    expect(compararAreas(98, null).estado).toBe("sin-inscrita");
    expect(compararAreas(98, 0).estado).toBe("sin-inscrita");
  });
});
