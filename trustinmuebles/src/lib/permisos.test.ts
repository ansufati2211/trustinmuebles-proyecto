import { describe, expect, it } from "vitest";
import { puedeEditarExpediente, puedeEmitirInforme, puedeSolicitarInspeccion, veBotonSolicitar } from "./permisos";

describe("visibilidad por rol", () => {
  it("solo el comprador ve el botón «Solicitar inspección técnica»", () => {
    expect(veBotonSolicitar("COMPRADOR")).toBe(true);
    expect(veBotonSolicitar("REVISOR")).toBe(false);
    expect(veBotonSolicitar("ESPECIALISTA")).toBe(false);
    expect(veBotonSolicitar(undefined)).toBe(false);
  });

  it("el comprador solo puede solicitar mientras no haya otra solicitud", () => {
    expect(puedeSolicitarInspeccion("COMPRADOR", "NO_SOLICITADA")).toBe(true);
    for (const estado of ["SOLICITADA", "EN_INSPECCION", "EMITIDO"] as const) {
      expect(puedeSolicitarInspeccion("COMPRADOR", estado)).toBe(false);
    }
    expect(puedeSolicitarInspeccion("REVISOR", "NO_SOLICITADA")).toBe(false);
  });

  it("solo el especialista llena el informe, y solo con una solicitud", () => {
    expect(puedeEmitirInforme("ESPECIALISTA", "SOLICITADA")).toBe(true);
    expect(puedeEmitirInforme("ESPECIALISTA", "NO_SOLICITADA")).toBe(false);
    expect(puedeEmitirInforme("COMPRADOR", "SOLICITADA")).toBe(false);
    expect(puedeEmitirInforme("REVISOR", "EN_INSPECCION")).toBe(false);
  });

  it("solo el revisor edita el expediente", () => {
    expect(puedeEditarExpediente("REVISOR")).toBe(true);
    expect(puedeEditarExpediente("COMPRADOR")).toBe(false);
    expect(puedeEditarExpediente("ESPECIALISTA")).toBe(false);
  });
});
