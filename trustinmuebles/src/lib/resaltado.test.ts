import { describe, expect, it } from "vitest";
import { resaltadoA } from "./resaltado";
import type { EstadoSemaforo } from "./types";

const TODOS: EstadoSemaforo[] = ["VERDE", "AMARILLO", "ROJO", "GRIS"];

describe("resaltado del indicador A (v0.8, B6)", () => {
  it("cada estado tiene borde izquierdo, fondo tenue y texto propios", () => {
    const vistos = new Set<string>();
    for (const e of TODOS) {
      const r = resaltadoA(e);
      expect(r.contenedor).toContain("border-l-4");
      expect(r.contenedor).toMatch(/bg-resaltado-[a-z]+-fondo/);
      expect(r.texto).toMatch(/^text-resaltado-[a-z]+-texto$/);
      vistos.add(r.contenedor);
    }
    expect(vistos.size).toBe(4);
  });

  it("nunca solo color: siempre una etiqueta con texto y un ícono", () => {
    expect(resaltadoA("VERDE").etiqueta).toBe("Sin alertas en los campos evaluados");
    expect(resaltadoA("AMARILLO").etiqueta).toBe("Requiere revisión");
    expect(resaltadoA("ROJO").etiqueta).toBe("Alerta prioritaria");
    expect(resaltadoA("GRIS").etiqueta).toBe("Información insuficiente o condición no evaluable");
    for (const e of TODOS) expect(resaltadoA(e).Icono).toBeTruthy();
  });

  it("un caso sin evaluación se muestra como «Sin evaluar»", () => {
    const r = resaltadoA(null);
    expect(r.etiqueta).toBe("Sin evaluar");
    expect(r.contenedor).toContain("gris");
  });
});
