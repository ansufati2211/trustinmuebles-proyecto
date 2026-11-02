import { describe, expect, it } from "vitest";
import { CONFIRMAR_PUBLICAR, ESTADOS_GESTION, GESTION, confirmacionAlPublicar, puedeVerGestion } from "./gestion";
import { ESTADOS } from "./semaforo";
import type { DecisionCaptacion, DecisionCaptacionTipo } from "./types";

const decision = (id: number, d: DecisionCaptacionTipo): DecisionCaptacion => ({
  id, casoCodigo: "SIM-1", decision: d, decisionEtiqueta: d, motivo: "OTRO_MOTIVO_COMERCIAL", motivoEtiqueta: "Otro",
  cuentaCodigo: "gestor-01", registradaEn: "2026-11-02T10:00:00Z",
});

describe("semáforo de gestión (v0.8, I15)", () => {
  it("solo el gestor y el revisor lo ven", () => {
    expect(puedeVerGestion("GESTOR")).toBe(true);
    expect(puedeVerGestion("REVISOR")).toBe(true);
    for (const r of ["COMPRADOR", "PROPIETARIO", "ESPECIALISTA"] as const) expect(puedeVerGestion(r)).toBe(false);
    expect(puedeVerGestion(undefined)).toBe(false);
  });

  it("usa íconos distintos de los del indicador A y siempre texto", () => {
    const iconosA = new Set(Object.values(ESTADOS).map((e) => e.Icono));
    for (const e of ESTADOS_GESTION) {
      expect(iconosA.has(GESTION[e].Icono)).toBe(false);
      expect(GESTION[e].etiqueta.length).toBeGreaterThan(3);
      expect(GESTION[e].contorno).not.toMatch(/\bbg-/);
    }
  });

  it("pide confirmación al publicar solo si la última decisión es no captar por ahora", () => {
    expect(confirmacionAlPublicar([])).toBeNull();
    expect(confirmacionAlPublicar([decision(1, "NO_CAPTAR_POR_AHORA"), decision(2, "CAPTAR")])).toBeNull();
    expect(confirmacionAlPublicar([decision(1, "CAPTAR"), decision(2, "NO_CAPTAR_POR_AHORA")])).toBe(CONFIRMAR_PUBLICAR);
  });
});
