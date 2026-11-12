import { describe, expect, it } from "vitest";
import {
  ESTILO_LOTE, PLANO, activaLote, conteoPlano, descripcionLote, dibujarPlano, enlaceCatalogoDelProyecto, enlaceInmueble,
  enlaceLote, estadoEnPlano, nombreLote, recorridoDe, rutaLotePublico, rutaProyectoPublico, siguienteIndice,
  urlDocumentoProyecto,
} from "./proyectos";
import { precio } from "./formato";
import type { EstadoComercial, LoteProyecto } from "./types";

function lote(manzana: string, numero: number, extra: Partial<LoteProyecto> = {}): LoteProyecto {
  const estado: EstadoComercial = extra.estadoComercial ?? "DISPONIBLE";
  return {
    codigo: `proyecto-${manzana}-${numero}`, clave: `${manzana}-${numero}`, manzana, numero, areaM2: 140, precio: 35000,
    moneda: "PEN", precioPorM2: 250, estadoComercial: estado, estadoComercialEtiqueta: estado.charAt(0) + estado.slice(1).toLowerCase(),
    independizacion: "EN_PARTIDA_MATRIZ", independizacionEtiqueta: "En partida matriz", zonificacion: null, publicado: true,
    casoCodigo: null, ...extra,
  };
}

describe("rutas y enlaces de proyectos (v1.0, etapa 3a)", () => {
  it("arma las rutas de la API y de la interfaz", () => {
    expect(rutaProyectoPublico("altos-de-ventisca")).toBe("/publico/proyectos/altos-de-ventisca");
    expect(rutaLotePublico("altos-de-ventisca", "A-7")).toBe("/publico/proyectos/altos-de-ventisca/lotes/A-7");
    expect(urlDocumentoProyecto("p", "TASACION")).toBe("/api/v1/publico/proyectos/p/documentos/TASACION");
    expect(enlaceCatalogoDelProyecto("Rinconada del Lúcumo")).toBe("/inmuebles?proyecto=Rinconada+del+L%C3%BAcumo");
  });

  it("la ficha de un lote es la de su caso propio si lo tiene", () => {
    expect(enlaceLote("p", { clave: "A-7", casoCodigo: null })).toBe("/proyectos/p/lotes/A-7");
    expect(enlaceLote("p", { clave: "A-7", casoCodigo: "11081204" })).toBe("/inmuebles/11081204");
  });

  it("en el catálogo, un caso enlaza a su ficha y un lote de proyecto a la suya", () => {
    expect(enlaceInmueble({ codigo: "11048217", clase: "CASO", proyectoCodigo: "santa-elvira", lote: null }))
      .toBe("/inmuebles/11048217");
    expect(enlaceInmueble({ codigo: "11048217" })).toBe("/inmuebles/11048217");
    expect(enlaceInmueble({ codigo: "p-B-3", clase: "LOTE_PROYECTO", proyectoCodigo: "p", lote: "B-3" }))
      .toBe("/proyectos/p/lotes/B-3");
  });

  it("nombra el lote por manzana y número", () => {
    expect(nombreLote("A-7")).toBe("Mz. A · Lote 7");
    expect(nombreLote("AB-12")).toBe("Mz. AB · Lote 12");
    expect(nombreLote("raro")).toBe("raro");
  });
});

describe("estados del plano", () => {
  it("un lote no publicado se muestra como tal, sin importar su estado comercial", () => {
    expect(estadoEnPlano(lote("A", 1))).toBe("DISPONIBLE");
    expect(estadoEnPlano(lote("A", 1, { estadoComercial: "VENDIDO" }))).toBe("VENDIDO");
    expect(estadoEnPlano(lote("A", 1, { publicado: false, estadoComercial: "SEPARADO" }))).toBe("NO_PUBLICADO");
  });

  it("cuenta los lotes por estado", () => {
    const n = conteoPlano([lote("A", 1), lote("A", 2, { estadoComercial: "SEPARADO" }),
      lote("A", 3, { estadoComercial: "VENDIDO" }), lote("A", 4, { publicado: false })]);
    expect(n).toEqual({ DISPONIBLE: 1, SEPARADO: 1, VENDIDO: 1, NO_PUBLICADO: 1 });
  });

  it("no usa los colores del semáforo y cada estado tiene su texto", () => {
    const semaforo = ["#22A05A", "#E0A21B", "#D33A2C", "#8A9690"];
    for (const e of Object.values(ESTILO_LOTE)) {
      expect(e.etiqueta.length).toBeGreaterThan(0);
      expect(semaforo).not.toContain(e.relleno.toUpperCase());
      expect(semaforo).not.toContain(e.borde.toUpperCase());
    }
    // Separado y vendido llevan además un patrón: el estado no depende solo del color.
    expect(ESTILO_LOTE.SEPARADO.patron).not.toBeNull();
    expect(ESTILO_LOTE.VENDIDO.patron).not.toBeNull();
  });

  it("describe el lote para lectores de pantalla", () => {
    expect(descripcionLote(lote("B", 3, { estadoComercial: "SEPARADO" }), precio))
      .toBe(`Manzana B, lote 3: separado, 140 m², ${precio(35000, "PEN")}`);
    expect(descripcionLote(lote("B", 4, { publicado: false, precio: null }), precio))
      .toBe("Manzana B, lote 4: no publicado en línea, 140 m²");
  });
});

describe("dibujo del plano", () => {
  const lotes = [
    ...[1, 2, 3, 4, 5, 6].map((n) => lote("A", n)),
    ...[1, 2, 3, 4].map((n) => lote("B", n)),
    ...[1, 2, 3].map((n) => lote("C", n)),
  ];

  it("cada manzana tiene dos filas: la de arriba hacia la derecha y la de abajo de vuelta", () => {
    const p = dibujarPlano(lotes);
    const a = p.manzanas.find((m) => m.manzana === "A")!;
    const pos = Object.fromEntries(a.lotes.map((l) => [l.lote.numero, l]));
    expect(pos[1].y).toBe(pos[3].y);
    expect(pos[1].x).toBeLessThan(pos[2].x);
    expect(pos[2].x).toBeLessThan(pos[3].x);
    expect(pos[4].y).toBeGreaterThan(pos[1].y);
    expect(pos[4].x).toBe(pos[3].x); // el 4 queda bajo el 3
    expect(pos[6].x).toBe(pos[1].x); // y el 6 bajo el 1
    // Una manzana impar: la fila de abajo tiene uno menos.
    const c = p.manzanas.find((m) => m.manzana === "C")!;
    expect(c.lotes.filter((l) => l.y === c.y)).toHaveLength(2);
  });

  it("los lotes no se superponen y caben en el lienzo", () => {
    const p = dibujarPlano(lotes);
    const todos = p.manzanas.flatMap((m) => m.lotes);
    expect(todos).toHaveLength(lotes.length);
    for (const l of todos) {
      expect(l.x).toBeGreaterThanOrEqual(0);
      expect(l.y).toBeGreaterThanOrEqual(0);
      expect(l.x + l.w).toBeLessThanOrEqual(p.ancho);
      expect(l.y + l.h).toBeLessThanOrEqual(p.alto);
    }
    for (let i = 0; i < todos.length; i++) {
      for (let j = i + 1; j < todos.length; j++) {
        const a = todos[i], b = todos[j];
        const separados = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(separados, `${a.lote.clave} y ${b.lote.clave}`).toBe(true);
      }
    }
  });

  it("acomoda dos manzanas por fila, separadas por una calle, y ordena por manzana y número", () => {
    const p = dibujarPlano([...lotes].reverse());
    expect(p.manzanas.map((m) => m.manzana)).toEqual(["A", "B", "C"]);
    expect(p.orden.map((l) => l.clave)).toEqual(lotes.map((l) => l.clave));
    const [a, b, c] = p.manzanas;
    expect(a.y).toBe(b.y);
    expect(c.y).toBeGreaterThan(a.y + a.h);
    expect(c.y - (a.y + a.h)).toBeGreaterThanOrEqual(PLANO.calle);
  });

  it("sin lotes no dibuja nada", () => {
    expect(dibujarPlano([]).manzanas).toEqual([]);
  });
});

describe("teclado del plano", () => {
  it("las flechas recorren los lotes y no se salen de los extremos", () => {
    expect(siguienteIndice(0, "ArrowRight", 5)).toBe(1);
    expect(siguienteIndice(0, "ArrowDown", 5)).toBe(1);
    expect(siguienteIndice(4, "ArrowRight", 5)).toBe(4);
    expect(siguienteIndice(3, "ArrowLeft", 5)).toBe(2);
    expect(siguienteIndice(0, "ArrowUp", 5)).toBe(0);
    expect(siguienteIndice(2, "Home", 5)).toBe(0);
    expect(siguienteIndice(2, "End", 5)).toBe(4);
    expect(siguienteIndice(2, "a", 5)).toBeNull();
    expect(siguienteIndice(0, "ArrowRight", 0)).toBeNull();
  });

  it("Enter y la barra espaciadora abren el lote", () => {
    expect(activaLote("Enter")).toBe(true);
    expect(activaLote(" ")).toBe(true);
    expect(activaLote("Tab")).toBe(false);
  });
});

describe("recorrido o video del proyecto", () => {
  it("un video de YouTube se incrusta siempre desde youtube-nocookie.com", () => {
    const esperado = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0";
    for (const url of ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10", "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"]) {
      expect(recorridoDe(url), url).toEqual({ tipo: "youtube", id: "dQw4w9WgXcQ", src: esperado });
    }
  });

  it("otro enlace https se ofrece para abrirlo aparte", () => {
    expect(recorridoDe("https://recorridos.example.com/proyecto/1")).toEqual({
      tipo: "enlace", href: "https://recorridos.example.com/proyecto/1",
    });
  });

  it("sin enlace, sin https o con un video mal formado, no se muestra nada", () => {
    for (const url of [null, undefined, "", "   ", "no es un enlace", "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "javascript:alert(1)", "https://www.youtube.com/watch?v=corto", "https://www.youtube.com/watch",
      "https://youtu.be/", "https://www.youtube.com/channel/abc"]) {
      expect(recorridoDe(url as string | null), String(url)).toBeNull();
    }
  });
});
