import { describe, expect, it } from "vitest";
import { etapasStepper, pasosInspeccion } from "./etapas";

const estados = (e: Parameters<typeof etapasStepper>[0]) => etapasStepper(e).map((x) => x.estado);

describe("stepper del indicador B", () => {
  it("tiene 4 etapas en orden", () => {
    expect(etapasStepper("NO_SOLICITADA").map((e) => e.etiqueta))
      .toEqual(["No solicitada", "Solicitada", "En inspección", "Informe emitido"]);
  });

  it("marca la etapa actual y completa las anteriores", () => {
    expect(estados("NO_SOLICITADA")).toEqual(["actual", "pendiente", "pendiente", "pendiente"]);
    expect(estados("SOLICITADA")).toEqual(["completada", "actual", "pendiente", "pendiente"]);
    expect(estados("EN_INSPECCION")).toEqual(["completada", "completada", "actual", "pendiente"]);
  });

  it("con el informe emitido el proceso terminó: todas completadas", () => {
    expect(estados("EMITIDO")).toEqual(["completada", "completada", "completada", "completada"]);
  });
});

describe("avance de los 6 pasos", () => {
  it("antes de la visita solo muestran el alcance", () => {
    expect(pasosInspeccion("NO_SOLICITADA")).toEqual(Array(6).fill("pendiente"));
    expect(pasosInspeccion("SOLICITADA")).toEqual(Array(6).fill("pendiente"));
  });

  it("en inspección: revisión documental y de planos hechas, visita en curso", () => {
    expect(pasosInspeccion("EN_INSPECCION")).toEqual(["hecho", "hecho", "en-curso", "pendiente", "pendiente", "pendiente"]);
  });

  it("con el informe emitido, los 6 pasos están hechos", () => {
    expect(pasosInspeccion("EMITIDO")).toEqual(Array(6).fill("hecho"));
  });
});
