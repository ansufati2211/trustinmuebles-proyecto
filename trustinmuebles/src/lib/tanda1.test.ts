import { describe, expect, it } from "vitest";
import { cerrarFicha, datosFicha, fichaVisible, pasarSobre, SIN_FICHA, tocarLote } from "@/lib/fichaLote";
import { FILTROS_PUBLICO_VACIOS, contarFiltros, filtrosALaUrl, filtrosDeLaUrl, rutaCatalogoPublico, rutaRecomendables } from "@/lib/filtrosPublico";
import { COLUMNAS_CSV } from "@/lib/cargaLotes";
import { cumplePosicion, etiquetaPosicion, posicionesDe, sinDatoDePosicion } from "@/lib/posicionLote";
import {
  VISTA_INICIAL, ZOOM_MAX, acotarVista, centrarEn, esVisible, factorRueda, mover, siguienteNivel, tamanoMarcador, textoZoom, zoomEn,
} from "@/lib/planoZoom";
import { precio } from "@/lib/formato";
import type { LoteProyecto } from "@/lib/types";

/* v2.0 (tanda 1): lógica del plano interactivo (RF43), la ficha del lote (RF43) y la posición del lote (RF49). */

function lote(clave: string, extra: Partial<LoteProyecto> = {}): LoteProyecto {
  const [manzana, n] = clave.split("-");
  return {
    codigo: `x-${clave}`, clave, manzana, numero: Number(n), areaM2: 140, precio: 35000, moneda: "PEN", precioPorM2: 250,
    estadoComercial: "DISPONIBLE", estadoComercialEtiqueta: "Disponible", independizacion: "EN_PARTIDA_MATRIZ",
    independizacionEtiqueta: "En partida matriz", zonificacion: "RDM", publicado: true, casoCodigo: null, ...extra,
  };
}

describe("RF49: posición del lote", () => {
  it("lee los códigos del servidor y descarta lo desconocido", () => {
    expect(posicionesDe("ESQUINA+PARQUE")).toEqual(["ESQUINA", "PARQUE"]);
    expect(posicionesDe("parque,esquina")).toEqual(["ESQUINA", "PARQUE"]);
    expect(posicionesDe("RINCON")).toEqual([]);
    expect(posicionesDe(null)).toEqual([]);
    expect(posicionesDe(undefined)).toEqual([]);
  });

  it("escribe la etiqueta o «Sin dato»", () => {
    expect(etiquetaPosicion("ESQUINA")).toBe("Esquina");
    expect(etiquetaPosicion("ESQUINA+AVENIDA")).toBe("Esquina · Frente a avenida");
    expect(etiquetaPosicion(null)).toBe("Sin dato");
    expect(etiquetaPosicion("")).toBe("Sin dato");
  });

  it("un lote sin dato no cumple el filtro de posición, pero sin filtro todos cumplen", () => {
    expect(cumplePosicion("ESQUINA+PARQUE", "ESQUINA")).toBe(true);
    expect(cumplePosicion("ESQUINA+PARQUE", "PARQUE")).toBe(true);
    expect(cumplePosicion("AVENIDA", "ESQUINA")).toBe(false);
    expect(cumplePosicion(null, "ESQUINA")).toBe(false);
    expect(cumplePosicion(undefined, "PARQUE,AVENIDA")).toBe(false);
    expect(cumplePosicion(null, undefined)).toBe(true);
    expect(cumplePosicion("ESQUINA", "")).toBe(true);
  });

  it("cuenta los lotes sin dato", () => {
    expect(sinDatoDePosicion([lote("A-1"), lote("A-2", { posicion: "ESQUINA" }), lote("A-3", { posicion: null })])).toBe(2);
    expect(sinDatoDePosicion([])).toBe(0);
  });

  it("el filtro viaja por la URL y por la API como los demás, y cuenta como filtro activo", () => {
    const f = filtrosDeLaUrl(new URLSearchParams("posicion=parque,esquina,xx"));
    expect(f.posicion).toBe("ESQUINA,PARQUE");
    expect(contarFiltros(f)).toBe(1);
    expect(filtrosALaUrl(f).get("posicion")).toBe("ESQUINA,PARQUE");
    expect(rutaCatalogoPublico(f)).toContain("posicion=ESQUINA%2CPARQUE");
    expect(rutaRecomendables(f)).toContain("posicion=ESQUINA%2CPARQUE");
    // Sin posición: la URL queda limpia y no cuenta.
    expect(filtrosALaUrl(FILTROS_PUBLICO_VACIOS).has("posicion")).toBe(false);
    expect(contarFiltros(filtrosDeLaUrl(new URLSearchParams("posicion=nada")))).toBe(0);
  });

  it("la carga CSV acepta la columna opcional posicion", () => {
    expect(COLUMNAS_CSV).toContain("posicion");
    expect(COLUMNAS_CSV.slice(0, 9)).toEqual(["manzana", "lote", "area_m2", "precio", "moneda", "estado", "independizacion", "zonificacion", "codigo_caso"]);
  });
});

describe("RF43: ficha del lote", () => {
  it("trae manzana, lote, área, precio y estado, y deja frontis, fondo y nota preparados con «Sin dato»", () => {
    const d = Object.fromEntries(datosFicha(lote("A-7", { estadoComercial: "SEPARADO" }), precio).map((x) => [x.clave, x]));
    expect(d.manzana.valor).toBe("A");
    expect(d.lote.valor).toBe("7");
    expect(d.area.valor).toContain("140");
    expect(d.precio.valor).toBe(precio(35000, "PEN", true));
    expect(d.estado.valor).toBe("Separado");
    for (const k of ["posicion", "frontis", "fondo", "nota"]) {
      expect(d[k].valor, k).toBe("Sin dato");
      expect(d[k].sinDato, k).toBe(true);
    }
  });

  it("cuando vienen frontis, fondo, nota y posición, los muestra", () => {
    const d = Object.fromEntries(datosFicha(lote("B-3", { frontis: 8, fondo: 17.5, notaReserva: "Descuento por pago al contado", posicion: "ESQUINA" }), precio).map((x) => [x.clave, x]));
    expect(d.frontis.valor).toBe("8 m");
    expect(d.fondo.valor).toBe("17,5 m");
    expect(d.nota.valor).toBe("Descuento por pago al contado");
    expect(d.posicion.valor).toBe("Esquina");
    expect(d.frontis.sinDato).toBe(false);
  });

  it("un lote sin precio dice «A consultar»", () => {
    expect(datosFicha(lote("A-1", { precio: null, moneda: null }), precio).find((x) => x.clave === "precio")!.valor).toBe("A consultar");
  });

  it("hacer clic o tocar un lote abre su ficha; volver a tocarlo, o cerrar, la cierra", () => {
    let s = SIN_FICHA;
    expect(fichaVisible(s)).toBeNull();
    s = tocarLote(s, "A-1");
    expect(fichaVisible(s)).toBe("A-1");
    s = tocarLote(s, "A-2");
    expect(fichaVisible(s)).toBe("A-2");
    expect(fichaVisible(tocarLote(s, "A-2"))).toBeNull();
    expect(fichaVisible(cerrarFicha())).toBeNull();
  });

  it("pasar el mouse muestra la ficha del lote señalado y, al salir, vuelve a la del tocado", () => {
    let s = tocarLote(SIN_FICHA, "A-1");
    s = pasarSobre(s, "A-5");
    expect(fichaVisible(s)).toBe("A-5");
    s = pasarSobre(s, null);
    expect(fichaVisible(s)).toBe("A-1");
    expect(fichaVisible(pasarSobre(SIN_FICHA, "B-2"))).toBe("B-2");
  });
});

describe("RF43: movimiento y zoom del plano", () => {
  const W = 800, H = 600;

  it("la escala queda entre 1× y 6× y la imagen siempre cubre el recuadro", () => {
    expect(acotarVista({ k: 0.2, x: 50, y: 50 }, W, H)).toEqual(VISTA_INICIAL);
    expect(acotarVista({ k: 99, x: 0, y: 0 }, W, H).k).toBe(ZOOM_MAX);
    const v = acotarVista({ k: 2, x: 500, y: -9999 }, W, H);
    expect(v.x).toBe(0);
    expect(v.y).toBe(H * (1 - 2));
    expect(acotarVista({ k: Number.NaN, x: 0, y: 0 }, W, H).k).toBe(1);
  });

  it("el zoom deja quieto el punto que está bajo el cursor", () => {
    const antes = { k: 1, x: 0, y: 0 };
    const cx = 300, cy = 200;
    const fx = (cx - antes.x) / (W * antes.k), fy = (cy - antes.y) / (H * antes.k);
    const v = zoomEn(antes, 3, cx, cy, W, H);
    expect(v.k).toBe(3);
    expect(v.x + fx * W * v.k).toBeCloseTo(cx, 5);
    expect(v.y + fy * H * v.k).toBeCloseTo(cy, 5);
    // Y se puede volver a 1× sin que quede desplazado.
    expect(zoomEn(v, 1, cx, cy, W, H)).toEqual(VISTA_INICIAL);
  });

  it("arrastrar mueve la vista pero no más allá de los bordes; con 1× no hay nada que mover", () => {
    const z = zoomEn(VISTA_INICIAL, 2, 0, 0, W, H);
    expect(mover(z, -100, -50, W, H)).toEqual({ k: 2, x: -100, y: -50 });
    expect(mover(z, 500, 500, W, H)).toEqual({ k: 2, x: 0, y: 0 });
    expect(mover(z, -5000, -5000, W, H)).toEqual({ k: 2, x: -W, y: -H });
    expect(mover(VISTA_INICIAL, 40, 40, W, H)).toEqual(VISTA_INICIAL);
  });

  it("centra un lote y sabe si está a la vista", () => {
    const v = centrarEn(0.5, 0.5, 3, W, H);
    expect(esVisible(v, 0.5, 0.5, W, H)).toBe(true);
    expect(esVisible({ k: 3, x: 0, y: 0 }, 0.9, 0.9, W, H)).toBe(false);
    const borde = centrarEn(0.02, 0.02, 3, W, H);
    expect(borde.x).toBe(0);
    expect(borde.y).toBe(0);
  });

  it("rueda, botones y marcadores", () => {
    expect(factorRueda(-100)).toBeGreaterThan(1);
    expect(factorRueda(100)).toBeLessThan(1);
    expect(factorRueda(0)).toBe(1);
    expect(siguienteNivel(1, -1)).toBe(1);
    expect(siguienteNivel(1, 1)).toBe(2);
    expect(siguienteNivel(6, 1)).toBe(6);
    expect(siguienteNivel(2.4, 1)).toBe(3);
    expect(tamanoMarcador(1)).toBe(13);
    expect(tamanoMarcador(6)).toBe(30);
    expect(tamanoMarcador(3)).toBeGreaterThan(tamanoMarcador(1));
    expect(textoZoom(1)).toBe("1×");
    expect(textoZoom(2.5)).toBe("2,5×");
  });
});
