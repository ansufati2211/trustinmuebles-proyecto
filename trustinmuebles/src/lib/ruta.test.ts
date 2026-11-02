import { describe, expect, it } from "vitest";
import { ETIQUETA_ESFUERZO, gestiona, ordenarPorEsfuerzo } from "./ruta";
import type { Esfuerzo, ItemRuta } from "./types";

const item = (clave: string, esfuerzo: Esfuerzo): ItemRuta => ({
  tipo: "ALERTA", clave, referencia: null, titulo: clave, pasos: ["paso"], gestiona: "propietario",
  documentoRequerido: "doc", esfuerzo, esfuerzoEtiqueta: esfuerzo, nota: null,
});

describe("ruta de regularización (v0.8)", () => {
  it("ordena de mayor a menor esfuerzo y conserva el orden entre iguales", () => {
    const r = ordenarPorEsfuerzo([item("RV-04a", "BAJO"), item("RV-02", "MEDIO"), item("RV-04b", "BAJO"), item("RP-01", "ALTO")]);
    expect(r.map((i) => i.clave)).toEqual(["RP-01", "RV-02", "RV-04a", "RV-04b"]);
  });

  it("nombra el esfuerzo y quién gestiona con palabras", () => {
    expect(ETIQUETA_ESFUERZO.ALTO).toBe("Esfuerzo alto");
    expect(gestiona("notaría")).toBe("Notaría");
    expect(gestiona("otro")).toBe("otro");
  });
});
