import { describe, expect, it } from "vitest";
import {
  FILAS_VISIBLES, MAX_FILAS, TAMANO_MAXIMO_BYTES, errorDeArchivo, filasAMostrar, rutaCarga, rutaConfirmar, rutaHistorialLote,
  rutaPlantilla, rutaVistaPrevia, sePuedeConfirmar, tamanoLegible, textoConfirmar, textoResultado, textoResumen,
} from "./cargaLotes";
import { claveDeRuta, puedeAbrirVista } from "./permisos";
import type { AccionFilaCarga, FilaCarga, VistaPreviaCarga } from "./types";

function fila(n: number, accion: AccionFilaCarga = "NUEVO", errores: string[] = []): FilaCarga {
  return { fila: n, manzana: "A", lote: n, clave: `A-${n}`, accion, cambios: accion === "ERROR" ? [] : ["area_m2: 140.00"], errores };
}

function vista(filas: FilaCarga[], extra: Partial<VistaPreviaCarga> = {}): VistaPreviaCarga {
  const conErrores = filas.filter((f) => f.errores.length > 0).length;
  return {
    proyectoCodigo: "p", bytes: 1000, totalFilas: filas.length, nuevas: filas.filter((f) => f.accion === "NUEVO").length,
    actualizadas: filas.filter((f) => f.accion === "ACTUALIZA").length, sinCambios: filas.filter((f) => f.accion === "SIN_CAMBIOS").length,
    conErrores, erroresGenerales: [], valida: conErrores === 0 && filas.length > 0, filas, ...extra,
  };
}

describe("carga masiva de lotes: rutas (v1.0, etapa 3b)", () => {
  it("arma las rutas de la API y de la pantalla", () => {
    expect(rutaPlantilla("altos-de-ventisca")).toBe("/proyectos/altos-de-ventisca/lotes/plantilla.csv");
    expect(rutaVistaPrevia("p")).toBe("/proyectos/p/lotes/carga/vista-previa");
    expect(rutaConfirmar("p")).toBe("/proyectos/p/lotes/carga");
    expect(rutaHistorialLote("p", "A-7")).toBe("/proyectos/p/lotes/A-7/historial");
    expect(rutaCarga("p")).toBe("/proyectos/p/carga");
  });

  it("la carga y el panel de proyectos son de gestor y asesor; la página pública de un proyecto sigue siendo del catálogo", () => {
    for (const rol of ["GESTOR", "ASESOR"] as const) expect(puedeAbrirVista(rol, "proyectos")).toBe(true);
    for (const rol of ["COMPRADOR", "REVISOR", "ESPECIALISTA", "PROPIETARIO"] as const) expect(puedeAbrirVista(rol, "proyectos")).toBe(false);
    expect(puedeAbrirVista(undefined, "proyectos")).toBe(false);
    expect(claveDeRuta("/proyectos")).toBe("proyectos");
    expect(claveDeRuta("/proyectos/altos-de-ventisca/carga")).toBe("proyectos");
    expect(claveDeRuta("/proyectos/altos-de-ventisca")).toBe("inmuebles");
    expect(claveDeRuta("/proyectos/altos-de-ventisca/lotes/A-7")).toBe("inmuebles");
  });
});

describe("revisión del archivo antes de enviarlo", () => {
  it("solo acepta .csv que no esté vacío y no pase de 1 MB", () => {
    expect(errorDeArchivo({ name: "lotes.csv", size: 500 })).toBeNull();
    expect(errorDeArchivo({ name: "LOTES.CSV", size: TAMANO_MAXIMO_BYTES })).toBeNull();
    expect(errorDeArchivo({ name: "lotes.xlsx", size: 500 })).toContain(".csv");
    expect(errorDeArchivo({ name: "lotes", size: 500 })).toContain(".csv");
    expect(errorDeArchivo({ name: "lotes.csv", size: 0 })).toBe("El archivo está vacío.");
    const grande = errorDeArchivo({ name: "lotes.csv", size: TAMANO_MAXIMO_BYTES + 1 });
    expect(grande).toContain("máximo es 1 MB");
    expect(grande).toContain(String(MAX_FILAS));
  });

  it("escribe el tamaño en una unidad legible", () => {
    expect(tamanoLegible(300)).toBe("300 bytes");
    expect(tamanoLegible(2048)).toBe("2 KB");
    expect(tamanoLegible(1.5 * 1024 * 1024)).toBe("1,5 MB");
  });
});

describe("vista previa", () => {
  it("resume lo que se crearía, actualizaría y lo que tiene errores", () => {
    const v = vista([fila(1), fila(2, "ACTUALIZA"), fila(3, "SIN_CAMBIOS"), fila(4, "ERROR", ["area_m2: negativo"])]);
    expect(textoResumen(v)).toBe("1 lote nuevo · 1 por actualizar · 1 sin cambios · 1 fila con errores");
    expect(textoResumen({ nuevas: 80, actualizadas: 0, sinCambios: 0, conErrores: 0 })).toBe("80 lotes nuevos · 0 por actualizar · 0 sin cambios · 0 filas con errores");
  });

  it("solo se confirma un archivo válido que tenga algo que guardar", () => {
    const bueno = vista([fila(1), fila(2, "ACTUALIZA")]);
    expect(sePuedeConfirmar(bueno)).toBe(true);
    expect(textoConfirmar(bueno)).toBe("Confirmar 2 lotes");
    expect(textoConfirmar(vista([fila(1)]))).toBe("Confirmar 1 lote");
    const malo = vista([fila(1), fila(2, "ERROR", ["x"])]);
    expect(sePuedeConfirmar(malo)).toBe(false);
    expect(textoConfirmar(malo)).toContain("Corrige");
    const igual = vista([fila(1, "SIN_CAMBIOS")]);
    expect(sePuedeConfirmar(igual)).toBe(false);
    expect(textoConfirmar(igual)).toBe("No hay nada que guardar");
    const general = vista([], { erroresGenerales: ["Falta la columna obligatoria «area_m2»."], valida: false });
    expect(sePuedeConfirmar(general)).toBe(false);
  });

  it("muestra las primeras filas y, si se pide, solo las que tienen errores", () => {
    const filas = Array.from({ length: 300 }, (_, i) => (i % 100 === 0 ? fila(i + 2, "ERROR", ["mal"]) : fila(i + 2)));
    const v = vista(filas);
    const todas = filasAMostrar(v, false);
    expect(todas.filas).toHaveLength(FILAS_VISIBLES);
    expect(todas.ocultas).toBe(100);
    expect(todas.total).toBe(300);
    const errores = filasAMostrar(v, true);
    expect(errores.filas.map((f) => f.fila)).toEqual([2, 102, 202]);
    expect(errores.ocultas).toBe(0);
    expect(filasAMostrar(v, false, 10).ocultas).toBe(290);
  });

  it("cuenta el resultado de la carga", () => {
    expect(textoResultado({ cargaId: "x", proyectoCodigo: "p", creados: 80, actualizados: 0, sinCambios: 0 })).toBe("80 lotes nuevos, 0 actualizados y 0 sin cambios.");
    expect(textoResultado({ cargaId: "x", proyectoCodigo: "p", creados: 1, actualizados: 1, sinCambios: 2 })).toBe("1 lote nuevo, 1 actualizado y 2 sin cambios.");
  });
});
