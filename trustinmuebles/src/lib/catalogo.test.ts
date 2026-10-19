import { describe, expect, it } from "vitest";
import { FILTROS_VACIOS, filtrosAURL, filtrosDesdeURL, hayFiltros, rutaCatalogo, textoResultados } from "./catalogo";

describe("filtros del catálogo", () => {
  it("se combinan y se escriben en la URL con los mismos nombres que la API", () => {
    const f = { ...FILTROS_VACIOS, tipo: "VIVIENDA_URBANA" as const, indicadorA: "AMARILLO" as const, indicadorB: "INFORME_EMITIDO" as const };
    expect(filtrosAURL(f).toString()).toBe("tipoInmueble=VIVIENDA_URBANA&estado=AMARILLO&estadoTecnico=INFORME_EMITIDO");
    expect(rutaCatalogo(f)).toBe("/casos?tipoInmueble=VIVIENDA_URBANA&estado=AMARILLO&estadoTecnico=INFORME_EMITIDO");
  });

  it("«con riesgo físico detectado» se envía como riesgoFisicoDetectado=true", () => {
    const f = { ...FILTROS_VACIOS, indicadorB: "RIESGO" as const, indicadorA: "VERDE" as const };
    expect(rutaCatalogo(f)).toBe("/casos?estado=VERDE&riesgoFisicoDetectado=true");
  });

  it("al recargar la URL se recuperan exactamente los mismos filtros (ida y vuelta)", () => {
    const casos = [
      { ...FILTROS_VACIOS, tipo: "LOTE_URBANO" as const },
      { ...FILTROS_VACIOS, indicadorA: "ROJO" as const, indicadorB: "SOLICITADA" as const },
      { ...FILTROS_VACIOS, indicadorB: "RIESGO" as const, q: "Salas" },
      { tipo: "VIVIENDA_URBANA" as const, indicadorA: "GRIS" as const, indicadorB: "NO_SOLICITADA" as const, q: "11061555" },
    ];
    for (const f of casos) expect(filtrosDesdeURL(filtrosAURL(f))).toEqual(f);
  });

  it("la búsqueda de texto va en la URL pero no al servidor", () => {
    const f = { ...FILTROS_VACIOS, q: "  Parcona " };
    expect(filtrosAURL(f).get("q")).toBe("Parcona");
    expect(rutaCatalogo(f)).toBe("/casos");
  });

  it("ignora valores desconocidos y acepta EMITIDO como sinónimo de INFORME_EMITIDO", () => {
    expect(filtrosDesdeURL(new URLSearchParams("tipoInmueble=CASTILLO&estado=AZUL&estadoTecnico=X"))).toEqual(FILTROS_VACIOS);
    expect(filtrosDesdeURL(new URLSearchParams("estadoTecnico=EMITIDO")).indicadorB).toBe("INFORME_EMITIDO");
  });

  it("sin filtros, la ruta es el catálogo completo y el botón de limpiar no hace falta", () => {
    expect(rutaCatalogo(FILTROS_VACIOS)).toBe("/casos");
    expect(hayFiltros(FILTROS_VACIOS)).toBe(false);
    expect(hayFiltros({ ...FILTROS_VACIOS, indicadorA: "VERDE" })).toBe(true);
  });

  it("el contador dice cuántos inmuebles hay en singular y plural", () => {
    expect(textoResultados(0)).toBe("Ningún inmueble");
    expect(textoResultados(1)).toBe("1 inmueble");
    expect(textoResultados(4)).toBe("4 inmuebles");
  });
});
