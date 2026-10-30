import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { Footer } from "@/components/layout/Footer";
import { LIMITES_LEGALES } from "./limitesLegales";

describe("límites legales del pie (I7)", () => {
  it("la constante incluye los cinco límites", () => {
    const texto = LIMITES_LEGALES.join(" ");
    expect(texto).toContain("No certifica saneamiento");
    expect(texto).toContain("No recomienda comprar");
    expect(texto).toContain("No reemplaza asesoría legal");
    expect(texto).toContain("Los datos y los especialistas son simulados");
    expect(texto).toContain("La verificación jurídica con abogado o notario se realiza fuera del sistema");
  });

  it("el pie activo muestra cada límite", () => {
    const html = renderToStaticMarkup(<MemoryRouter><Footer /></MemoryRouter>);
    for (const limite of LIMITES_LEGALES) expect(html).toContain(limite);
  });

  it("el pie atribuye la inspección a un especialista de la inmobiliaria con perfil ficticio", () => {
    const html = renderToStaticMarkup(<MemoryRouter><Footer /></MemoryRouter>);
    expect(html).toContain("especialista de la inmobiliaria");
    expect(html).toContain("perfiles de la demostración son ficticios");
    expect(html).not.toContain("independiente");
  });
});
