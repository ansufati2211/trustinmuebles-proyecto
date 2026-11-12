import { describe, expect, it } from "vitest";
import {
  contarFiltros, errorDeRangos, FILTROS_PUBLICO_VACIOS, filtrosALaUrl, filtrosDeLaUrl, hayFiltrosPublico,
  numeroValido, OPCIONES_ORDEN, rutaCatalogoPublico, sentidoPorOmision, sinFiltros, textoContador, valorDeOrden,
  type FiltrosPublico,
} from "./filtrosPublico";

const url = (q: string) => new URLSearchParams(q);
const con = (parcial: Partial<FiltrosPublico>): FiltrosPublico => ({ ...FILTROS_PUBLICO_VACIOS, ...parcial });

describe("filtros del catálogo público en la URL (v1.0 etapa 2)", () => {
  it("una URL sin parámetros es el catálogo sin filtros, ordenado por novedad", () => {
    expect(filtrosDeLaUrl(url(""))).toEqual(FILTROS_PUBLICO_VACIOS);
    expect(hayFiltrosPublico(filtrosDeLaUrl(url("")))).toBe(false);
    expect(filtrosALaUrl(FILTROS_PUBLICO_VACIOS).toString()).toBe("");
  });

  it("lee todos los filtros", () => {
    const f = filtrosDeLaUrl(url(
      "proyecto=Santa+Elvira&distrito=Parcona&tipo=LOTE&estadoComercial=DISPONIBLE&moneda=USD&precioMin=50000&precioMax=90000"
      + "&precioM2Min=300&precioM2Max=900.5&areaMin=120&areaMax=250&indicadorA=VERDE&tipoAlerta=RV-02&orden=precioM2&sentido=desc"));
    expect(f).toEqual({
      proyecto: "Santa Elvira", distrito: "Parcona", tipo: "LOTE", estadoComercial: "DISPONIBLE", moneda: "USD",
      precioMin: "50000", precioMax: "90000", precioM2Min: "300", precioM2Max: "900.5", areaMin: "120", areaMax: "250",
      indicadorA: "VERDE", tipoAlerta: "RV-02", orden: "precioM2", sentido: "desc",
    });
    expect(contarFiltros(f)).toBe(10);
  });

  it("ida y vuelta: lo que se escribe en la URL se lee igual, con la URL más corta posible", () => {
    const f = con({ tipo: "VIVIENDA", distrito: "Salas", precioMax: "150000", moneda: "PEN", orden: "area", sentido: "desc" });
    const q = filtrosALaUrl(f);
    expect(filtrosDeLaUrl(q)).toEqual(f);
    // El orden por omisión y su sentido natural no ensucian la URL.
    expect(filtrosALaUrl(con({ orden: "precio", sentido: "asc" })).toString()).toBe("orden=precio");
    expect(filtrosALaUrl(con({ orden: "precio", sentido: "desc" })).toString()).toBe("orden=precio&sentido=desc");
    expect(filtrosALaUrl(con({ orden: "novedad", sentido: "asc" })).toString()).toBe("sentido=asc");
  });

  it("la página va como número humano y la primera no lleva parámetro", () => {
    expect(filtrosALaUrl(con({ tipo: "LOTE" }), 0).toString()).toBe("tipo=LOTE");
    expect(filtrosALaUrl(con({ tipo: "LOTE" }), 2).toString()).toBe("tipo=LOTE&pagina=3");
  });

  it("ignora los valores que no conoce, en vez de romper o pedir algo inválido al servidor", () => {
    const f = filtrosDeLaUrl(url("tipo=casa&estadoComercial=ROTO&moneda=EUR&indicadorA=AZUL&tipoAlerta=ZZ&orden=popular&sentido=up"
      + "&precioMin=abc&precioMax=-5&areaMin=1e3&areaMax=1,5"));
    expect(f).toEqual({ ...FILTROS_PUBLICO_VACIOS, areaMax: "1.5" });
  });

  it("los números aceptan coma decimal pero no separador de miles ni signos", () => {
    expect(numeroValido("150000")).toBe("150000");
    expect(numeroValido(" 1200,5 ")).toBe("1200.5");
    expect(numeroValido("1.500.000")).toBe("");
    expect(numeroValido("-1")).toBe("");
    expect(numeroValido("")).toBe("");
    expect(numeroValido(null)).toBe("");
    expect(numeroValido("12.345")).toBe("");
  });

  it("la ruta de la API siempre lleva página (desde 0), orden y sentido explícitos", () => {
    expect(rutaCatalogoPublico(FILTROS_PUBLICO_VACIOS)).toBe("/publico/inmuebles?sentido=desc&orden=novedad&pagina=0");
    const f = con({ tipo: "LOTE", precioMin: "50000", moneda: "PEN", orden: "precio", sentido: "asc" });
    const ruta = rutaCatalogoPublico(f, 2);
    const q = new URLSearchParams(ruta.split("?")[1]);
    expect(ruta.startsWith("/publico/inmuebles?")).toBe(true);
    expect(Object.fromEntries(q)).toEqual({
      tipo: "LOTE", precioMin: "50000", moneda: "PEN", orden: "precio", sentido: "asc", pagina: "2",
    });
    expect(rutaCatalogoPublico(f, -3)).toContain("pagina=0");
  });

  it("el orden no cuenta como filtro y Limpiar filtros lo conserva", () => {
    expect(contarFiltros(con({ orden: "precio", sentido: "desc" }))).toBe(0);
    const f = con({ tipo: "LOTE", precioMin: "1", precioMax: "2", areaMin: "3", orden: "area", sentido: "desc" });
    expect(contarFiltros(f)).toBe(3); // el rango de precio, aunque tenga mínimo y máximo, es un solo filtro
    expect(sinFiltros(f)).toEqual(con({ orden: "area", sentido: "desc" }));
    expect(hayFiltrosPublico(sinFiltros(f))).toBe(false);
  });

  it("avisa de un mínimo mayor que el máximo antes de pedirlo", () => {
    expect(errorDeRangos(con({ precioMin: "200000", precioMax: "100000" }))).toMatch(/precio mínimo/);
    expect(errorDeRangos(con({ areaMin: "300", areaMax: "100" }))).toMatch(/área mínima/);
    expect(errorDeRangos(con({ precioM2Min: "9", precioM2Max: "1" }))).toMatch(/m²/);
    expect(errorDeRangos(con({ precioMin: "100", precioMax: "100" }))).toBeNull();
    expect(errorDeRangos(con({ precioMin: "100" }))).toBeNull();
  });

  it("los ordenes ofrecidos cubren novedad, precio, precio por m² y área en los dos sentidos", () => {
    expect(OPCIONES_ORDEN.map((o) => o.valor)).toEqual([
      "novedad-desc", "novedad-asc", "precio-asc", "precio-desc", "precioM2-asc", "precioM2-desc", "area-asc", "area-desc",
    ]);
    for (const o of OPCIONES_ORDEN) expect(valorDeOrden({ orden: o.orden, sentido: o.sentido })).toBe(o.valor);
    expect(sentidoPorOmision("novedad")).toBe("desc");
    expect(sentidoPorOmision("area")).toBe("asc");
  });

  it("el contador dice cuántos inmuebles hay y si es con filtros", () => {
    expect(textoContador(30, false)).toBe("30 inmuebles");
    expect(textoContador(1, false)).toBe("1 inmueble");
    expect(textoContador(4, true)).toBe("4 inmuebles con los filtros elegidos");
    expect(textoContador(0, true)).toMatch(/Ningún inmueble cumple/);
    expect(textoContador(0, false)).toMatch(/Todavía no hay/);
  });
});
