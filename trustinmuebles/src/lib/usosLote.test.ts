import { describe, expect, it } from "vitest";
import { areaMinimaHabitual, buscarZona, CATEGORIAS_USO, compatibilidadUso, USOS_LOTE, usosDelLote } from "./usosLote";

/* v1.0 (etapa 5): usos que suelen permitirse según la zonificación y el área (contenido/usos-lote.json). */

describe("contenido de usos del lote", () => {
  it("cada zona tiene usos de las cuatro categorías conocidas y con área mínima positiva", () => {
    expect(USOS_LOTE.zonas.length).toBeGreaterThanOrEqual(5);
    for (const z of USOS_LOTE.zonas) {
      expect(z.usos.length).toBeGreaterThan(0);
      for (const u of z.usos) {
        expect(CATEGORIAS_USO).toContain(u.categoria);
        expect(u.areaMinimaM2).toBeGreaterThan(0);
      }
    }
  });

  it("cubre las zonificaciones que usan los proyectos precargados (RDM y CV)", () => {
    expect(buscarZona("RDM")?.nombre).toBe("Residencial de densidad media");
    expect(buscarZona("CV")?.nombre).toBe("Comercio vecinal");
  });

  it("el aviso pide verificar el certificado de parámetros de la municipalidad", () => {
    expect(USOS_LOTE.aviso).toBe("Verifica el certificado de parámetros urbanísticos de la municipalidad antes de comprar.");
    expect(USOS_LOTE.sinZonificacion).toMatch(/consulta los parámetros/);
  });

  it("no promete nada ni se presenta como un documento oficial", () => {
    const todo = JSON.stringify(USOS_LOTE);
    expect(todo).not.toMatch(/garantiz|asegur|compra segura|saneamiento|certificamos|emitido por/i);
  });
});

describe("usos del lote según su zonificación y área", () => {
  it("sin zonificación: «consulta los parámetros», con el aviso", () => {
    for (const z of [null, undefined, "", "  "]) {
      const u = usosDelLote(z, 120);
      expect(u.estado).toBe("SIN_ZONIFICACION");
      expect(u.aviso).toBe(USOS_LOTE.aviso);
    }
  });

  it("una zonificación desconocida tampoco inventa usos", () => {
    const u = usosDelLote("ZXX", 120);
    expect(u.estado).toBe("ZONA_DESCONOCIDA");
    if (u.estado === "ZONA_DESCONOCIDA") expect(u.mensaje).toMatch(/consulta los parámetros/);
  });

  it("RDM con 120 m²: casa, negocio en el primer piso y departamentos para alquilar", () => {
    const u = usosDelLote("RDM", 120);
    expect(u.estado).toBe("CON_ZONIFICACION");
    if (u.estado !== "CON_ZONIFICACION") return;
    expect(u.permitidos.map((x) => x.categoria)).toEqual(["CASA", "NEGOCIO", "ALQUILAR"]);
    expect(u.conMasArea).toEqual([]);
  });

  it("RDM con 100 m²: los departamentos para alquilar suelen pedir un lote más grande", () => {
    const u = usosDelLote("RDM", 100);
    if (u.estado !== "CON_ZONIFICACION") throw new Error("se esperaba zonificación");
    expect(u.permitidos.map((x) => x.categoria)).toEqual(["CASA", "NEGOCIO"]);
    expect(u.conMasArea.map((x) => [x.categoria, x.areaMinimaM2])).toEqual([["ALQUILAR", 120]]);
  });

  it("sin área conocida se muestran todos los usos de la zona", () => {
    const u = usosDelLote("CV", null);
    if (u.estado !== "CON_ZONIFICACION") throw new Error("se esperaba zonificación");
    expect(u.conMasArea).toEqual([]);
    expect(u.permitidos).toHaveLength(buscarZona("CV")!.usos.length);
  });

  it("acepta minúsculas, sufijos y códigos antiguos («rdm-1», «R4»)", () => {
    expect(buscarZona(" rdm-1 ")?.codigo).toBe("RDM");
    expect(buscarZona("R4")?.codigo).toBe("RDM");
    expect(buscarZona("R1")?.codigo).toBe("RDB");
  });
});

describe("compatibilidad de un uso (para el asistente)", () => {
  it("SI, NO o DESCONOCIDO", () => {
    expect(compatibilidadUso("CV", 120, "NEGOCIO").resultado).toBe("SI");
    expect(compatibilidadUso("RDM", 120, "ALMACEN").resultado).toBe("NO");
    expect(compatibilidadUso("CV", 120, "ALMACEN").resultado).toBe("NO");
    expect(compatibilidadUso("CV", 250, "ALMACEN").resultado).toBe("SI");
    expect(compatibilidadUso(null, 120, "CASA").resultado).toBe("DESCONOCIDO");
  });

  it("área mínima habitual de cada uso", () => {
    expect(areaMinimaHabitual("CASA")).toBe(90);
    expect(areaMinimaHabitual("ALMACEN")).toBe(200);
  });
});
