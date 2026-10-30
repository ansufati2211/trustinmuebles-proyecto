import { describe, expect, it } from "vitest";
import { numeroValidoParaOrigen } from "./fuentes";

describe("número de partida según el origen de la captación", () => {
  it("una transcrita acepta ocho dígitos con letra opcional y rechaza el prefijo SIM-", () => {
    expect(numeroValidoParaOrigen("11012345", "TRANSCRITA_CONOCE_AQUI")).toBe(true);
    expect(numeroValidoParaOrigen("P07044600", "TRANSCRITA_CONOCE_AQUI")).toBe(true);
    expect(numeroValidoParaOrigen("SIM-99000404", "TRANSCRITA_CONOCE_AQUI")).toBe(false);
  });

  it("una simulada exige el prefijo SIM- y ocho dígitos", () => {
    expect(numeroValidoParaOrigen("SIM-99000404", "SIMULADA_DEMOSTRACION")).toBe(true);
    expect(numeroValidoParaOrigen("99000404", "SIMULADA_DEMOSTRACION")).toBe(false);
    expect(numeroValidoParaOrigen("SIM-1234", "SIMULADA_DEMOSTRACION")).toBe(false);
  });
});
