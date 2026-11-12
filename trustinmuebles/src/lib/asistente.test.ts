import { describe, expect, it } from "vitest";
import {
  aNumero, busquedaDe, etiquetasDe, filtrosDe, interpretar, normalizar, quitarEtiqueta, recomendar, sugerencias,
  type Contexto,
} from "./asistente";
import { FILTROS_PUBLICO_VACIOS, type FiltrosPublico } from "./filtrosPublico";
import type { InmueblePublico, Predio } from "./types";

/* v1.0 (etapa 5): asistente de búsqueda por reglas. Cada prueba es una frase como la escribiría un comprador. */

const CTX: Contexto = {
  proyectos: ["Altos de Ventisca", "Horizonte de Los Aquijes", "Rinconada del Lúcumo", "Terrazas de Sauzal"],
  distritos: ["Ica", "La Tinguiña", "Los Aquijes", "Parcona", "Salas", "Subtanjalla"],
};
const leer = (frase: string) => interpretar(frase, CTX);
const filtros = (frase: string) => leer(frase).filtros;

describe("asistente: tipo de inmueble", () => {
  it("«lote» y «terreno» son lotes", () => {
    expect(filtros("busco un lote")).toEqual({ tipo: "LOTE" });
    expect(filtros("Terrenos")).toEqual({ tipo: "LOTE" });
  });

  it("«casa» y «vivienda» son viviendas", () => {
    expect(filtros("quiero una casa")).toEqual({ tipo: "VIVIENDA" });
    expect(filtros("viviendas en venta")).toEqual({ tipo: "VIVIENDA" });
  });

  it("si menciona lotes y casas a la vez, no filtra por tipo", () => {
    expect(filtros("casa o lote")).toEqual({});
  });

  it("«lote para casa» es un lote para el uso casa, no una vivienda", () => {
    const i = leer("lote para casa");
    expect(i.filtros).toEqual({ tipo: "LOTE" });
    expect(i.uso).toBe("CASA");
  });
});

describe("asistente: proyectos y distritos cargados", () => {
  it("reconoce un distrito sin tildes ni mayúsculas", () => {
    expect(filtros("lotes en la tinguina")).toEqual({ tipo: "LOTE", distrito: "La Tinguiña" });
  });

  it("reconoce un proyecto por su nombre completo", () => {
    expect(filtros("lotes en Rinconada del Lucumo")).toEqual({ tipo: "LOTE", proyecto: "Rinconada del Lúcumo" });
  });

  it("reconoce un proyecto por una palabra propia («Ventisca»)", () => {
    expect(filtros("algo en ventisca")).toEqual({ proyecto: "Altos de Ventisca" });
  });

  it("el nombre del proyecto no se confunde con el distrito del mismo nombre", () => {
    expect(filtros("Horizonte de Los Aquijes")).toEqual({ proyecto: "Horizonte de Los Aquijes" });
    expect(filtros("terreno en Los Aquijes")).toEqual({ tipo: "LOTE", distrito: "Los Aquijes" });
  });

  it("«Ica» como distrito, entero y no dentro de otra palabra", () => {
    expect(filtros("casa en Ica")).toEqual({ tipo: "VIVIENDA", distrito: "Ica" });
    expect(filtros("casa económica")).not.toHaveProperty("distrito");
  });

  it("sin catálogo cargado no inventa proyectos ni distritos", () => {
    expect(interpretar("lote en Subtanjalla").filtros).toEqual({ tipo: "LOTE" });
  });
});

describe("asistente: precio", () => {
  it("«menos de 50 mil» es un máximo en soles", () => {
    expect(filtros("lote de menos de 50 mil")).toEqual({ tipo: "LOTE", precioMax: "50000", moneda: "PEN" });
  });

  it("«hasta S/ 80,000» con separador de miles", () => {
    expect(filtros("hasta S/ 80,000")).toEqual({ precioMax: "80000", moneda: "PEN" });
  });

  it("«entre 40 y 60 mil soles»: el «mil» vale para los dos", () => {
    expect(filtros("entre 40 y 60 mil soles")).toEqual({ precioMin: "40000", precioMax: "60000", moneda: "PEN" });
  });

  it("«entre 40 mil y 60 mil», con el orden invertido también", () => {
    expect(filtros("entre 60 mil y 40 mil")).toEqual({ precioMin: "40000", precioMax: "60000", moneda: "PEN" });
  });

  it("dólares con «$» o con la palabra", () => {
    expect(filtros("casa hasta $90000")).toEqual({ tipo: "VIVIENDA", precioMax: "90000", moneda: "USD" });
    expect(filtros("casa de menos de 100 mil dólares")).toEqual({ tipo: "VIVIENDA", precioMax: "100000", moneda: "USD" });
  });

  it("un monto suelto con «mil» o moneda es el presupuesto máximo", () => {
    expect(filtros("lote 45 mil soles")).toEqual({ tipo: "LOTE", precioMax: "45000", moneda: "PEN" });
    expect(filtros("tengo 70 mil")).toEqual({ precioMax: "70000", moneda: "PEN" });
  });

  it("«más de 100 mil» es un mínimo", () => {
    expect(filtros("casa de más de 100 mil")).toEqual({ tipo: "VIVIENDA", precioMin: "100000", moneda: "PEN" });
  });

  it("«80k» y «1.5 millones»", () => {
    expect(filtros("hasta 80k")).toEqual({ precioMax: "80000", moneda: "PEN" });
    expect(filtros("hasta 1.5 millones")).toEqual({ precioMax: "1500000", moneda: "PEN" });
  });

  it("un número chico sin unidad ni moneda no se toma como precio", () => {
    expect(filtros("hasta 200")).toEqual({});
  });

  it("precio por m²: «a menos de 300 soles el m2»", () => {
    expect(filtros("lote a menos de 300 soles el m2")).toEqual({ tipo: "LOTE", precioM2Max: "300" });
  });
});

describe("asistente: área", () => {
  it("«más de 200 m2» es un área mínima y no el orden «más grande»", () => {
    expect(filtros("lote de más de 200 m2")).toEqual({ tipo: "LOTE", areaMin: "200" });
  });

  it("«al menos 150 metros» y «m²»", () => {
    expect(filtros("al menos 150 metros")).toEqual({ areaMin: "150" });
    expect(filtros("por lo menos 120 m²")).toEqual({ areaMin: "120" });
  });

  it("«entre 100 y 160 m2»", () => {
    expect(filtros("entre 100 y 160 m2")).toEqual({ areaMin: "100", areaMax: "160" });
  });

  it("«hasta 300 m2» es un máximo", () => {
    expect(filtros("terreno de hasta 300 m2")).toEqual({ tipo: "LOTE", areaMax: "300" });
  });

  it("«un lote de 120 m2» busca 120 m² o más; «8 x 20» son 160 m²", () => {
    expect(filtros("un lote de 120 m2")).toEqual({ tipo: "LOTE", areaMin: "120" });
    expect(filtros("lote de 8 x 20")).toEqual({ tipo: "LOTE", areaMin: "160" });
  });

  it("área y precio en la misma frase no se mezclan", () => {
    expect(filtros("lote de 150 m2 hasta 60 mil")).toEqual({ tipo: "LOTE", areaMin: "150", precioMax: "60000", moneda: "PEN" });
  });
});

describe("asistente: uso, orden e indicador A", () => {
  it("los cuatro usos", () => {
    expect(leer("terreno para negocio").uso).toBe("NEGOCIO");
    expect(leer("lote para poner una bodega").uso).toBe("NEGOCIO");
    expect(leer("algo para alquilar").uso).toBe("ALQUILAR");
    expect(leer("terreno para almacén").uso).toBe("ALMACEN");
    expect(leer("lote para construir mi casa").uso).toBe("CASA");
  });

  it("el uso no es un filtro del catálogo", () => {
    expect(leer("para negocio").filtros).toEqual({});
    expect(leer("para negocio").entendido).toBe(true);
  });

  it("«más barato» ordena por precio de menor a mayor", () => {
    expect(filtros("el lote más barato")).toEqual({ tipo: "LOTE", orden: "precio", sentido: "asc" });
  });

  it("«más grande» ordena por área de mayor a menor", () => {
    expect(filtros("la casa más grande")).toEqual({ tipo: "VIVIENDA", orden: "area", sentido: "desc" });
  });

  it("«sin problemas» es el indicador A en verde", () => {
    expect(filtros("lote sin problemas")).toEqual({ tipo: "LOTE", indicadorA: "VERDE" });
    expect(filtros("casa con papeles en orden")).toEqual({ tipo: "VIVIENDA", indicadorA: "VERDE" });
  });

  it("una frase completa", () => {
    const i = leer("Busco un lote en Subtanjalla de al menos 120 m2, hasta 60 mil soles, para casa, sin problemas y lo más barato");
    expect(i.filtros).toEqual({
      tipo: "LOTE", distrito: "Subtanjalla", areaMin: "120", precioMax: "60000", moneda: "PEN", indicadorA: "VERDE",
      orden: "precio", sentido: "asc",
    });
    expect(i.uso).toBe("CASA");
  });
});

describe("asistente: lo que no entiende", () => {
  it("una frase sin nada reconocible no se entiende", () => {
    expect(leer("hola, ¿qué tal?").entendido).toBe(false);
    expect(leer("").entendido).toBe(false);
  });

  it("ofrece sugerencias que sí entiende, con los proyectos cargados", () => {
    const s = sugerencias(CTX);
    expect(s.length).toBeGreaterThanOrEqual(6);
    for (const x of s) expect(interpretar(x.frase, CTX).entendido).toBe(true);
    expect(s.some((x) => x.texto.includes("Altos de Ventisca"))).toBe(true);
  });
});

describe("asistente: filtros y etiquetas", () => {
  it("la búsqueda empieza de cero y conserva solo lo entendido", () => {
    const f = filtrosDe(leer("casa en Ica"));
    expect(f).toEqual({ ...FILTROS_PUBLICO_VACIOS, tipo: "VIVIENDA", distrito: "Ica" });
  });

  it("muestra cada cosa entendida como una etiqueta", () => {
    const i = leer("lote en Salas entre 40 y 60 mil, más de 100 m2, sin problemas, más barato, para negocio");
    const textos = etiquetasDe(filtrosDe(i), i.uso).map((e) => e.texto.replace(/ /g, " "));
    expect(textos).toEqual([
      "Lotes o terrenos", "En Salas", "Entre S/ 40,000 y S/ 60,000", "Al menos 100 m²",
      "Sin alertas en documentos (indicador A verde)", "Más barato primero", "Para negocio",
    ]);
  });

  it("quitar una etiqueta quita solo ese filtro", () => {
    const i = leer("lote en Salas hasta 60 mil para negocio");
    const f = filtrosDe(i);
    const sinPrecio = quitarEtiqueta(f, i.uso, "precio");
    expect(sinPrecio.filtros).toEqual({ ...f, precioMax: "", moneda: "" });
    expect(sinPrecio.uso).toBe("NEGOCIO");
    expect(quitarEtiqueta(f, i.uso, "uso")).toEqual({ filtros: f, uso: null });
    expect(quitarEtiqueta(f, i.uso, "distrito").filtros.distrito).toBe("");
  });

  it("la búsqueda viaja con la cita: zona, tipo, presupuesto y área", () => {
    expect(busquedaDe(filtrosDe(leer("lote en Salas de 120 m2 hasta 60 mil")))).toEqual({
      zona: "Salas", tipo: "LOTE", presupuestoMax: 60000, moneda: "PEN", areaDeseada: 120,
    });
    expect(busquedaDe(FILTROS_PUBLICO_VACIOS)).toEqual({});
  });
});

describe("asistente: recomendación de los 3 mejores", () => {
  const predio = (p: Partial<Predio>): Predio => ({
    tipoInmueble: "LOTE_URBANO", tipoInmuebleEtiqueta: "Lote", distrito: "Salas", areaM2: 120, areaConstruidaInscrita: null,
    precioReferencial: 30000, moneda: "PEN", precioNota: null, precioPorM2: 250, estadoComercial: "DISPONIBLE", ...p,
  });
  const inm = (codigo: string, estado: InmueblePublico["estado"], p: Partial<Predio>): InmueblePublico => ({
    codigo, denominacion: `Lote ${codigo}`, contexto: "", estado, etiqueta: null, origen: "PROYECTO", fuente: null,
    fechaConsulta: null, estadoTecnico: "NO_SOLICITADA", resultadoTecnico: null, riesgoFisicoDetectado: false,
    predio: predio(p), clase: "LOTE_PROYECTO", fuenteIndicadorA: "PARTIDA_MATRIZ",
  });
  const items = [
    inm("A-1", "VERDE", { precioReferencial: 30000, areaM2: 120, precioPorM2: 250, zonificacion: "RDB" }),
    inm("A-2", "VERDE", { precioReferencial: 28000, areaM2: 80, precioPorM2: 350, zonificacion: "RDM" }),
    inm("A-3", "AMARILLO", { precioReferencial: 45000, areaM2: 200, precioPorM2: 225, zonificacion: "CV" }),
    inm("A-4", "VERDE", { precioReferencial: 20000, areaM2: 90, precioPorM2: 222, estadoComercial: "VENDIDO" }),
    inm("A-5", "ROJO", { precioReferencial: 26000, areaM2: 110, precioPorM2: 236, estadoComercial: "SEPARADO" }),
  ];
  const f = (parcial: Partial<FiltrosPublico> = {}) => ({ ...FILTROS_PUBLICO_VACIOS, ...parcial });

  it("recomienda 3, nunca un vendido, y cada uno con su motivo", () => {
    const r = recomendar(items, f(), null);
    expect(r).toHaveLength(3);
    expect(r.map((x) => x.inmueble.codigo)).not.toContain("A-4");
    for (const x of r) expect(x.motivos.length).toBeGreaterThan(0);
  });

  it("con «más barato», el de menor precio disponible va primero y lo dice", () => {
    const r = recomendar(items, f({ orden: "precio", sentido: "asc" }), null);
    expect(r[0].inmueble.codigo).toBe("A-2");
    expect(r[0].motivos).toContain("Tiene el menor precio entre los resultados");
  });

  it("para negocio prefiere la zonificación comercial y lo explica, sin prometer nada", () => {
    const r = recomendar(items, f(), "NEGOCIO");
    expect(r[0].inmueble.codigo).toBe("A-3");
    expect(r[0].motivos.join(" ")).toMatch(/zonificación \(CV\) suele permitir/);
    expect(r.flatMap((x) => x.motivos).join(" ")).not.toMatch(/segur|saneamiento|garantiz/i);
  });

  it("el indicador A verde de un lote se atribuye a la partida matriz del proyecto", () => {
    const verde = recomendar(items, f(), "CASA").find((x) => x.inmueble.estado === "VERDE");
    expect(verde?.motivos[0]).toMatch(/partida matriz del proyecto no encontró alertas/);
  });

  it("con menos de 3 resultados recomienda los que hay; sin resultados, ninguno", () => {
    expect(recomendar(items.slice(0, 2), f(), null)).toHaveLength(2);
    expect(recomendar([], f(), null)).toEqual([]);
  });
});

describe("asistente: utilidades", () => {
  it("normaliza tildes, ñ y m²", () => {
    expect(normalizar("  La TINGUIÑA, 120 m²  ")).toBe("la tinguina, 120 m2");
  });

  it("lee números con separadores de miles o decimales", () => {
    expect(aNumero("80,000")).toBe(80000);
    expect(aNumero("80.000")).toBe(80000);
    expect(aNumero("1,5")).toBe(1.5);
    expect(aNumero("60000.")).toBe(60000);
    expect(aNumero("abc")).toBeNull();
  });
});
