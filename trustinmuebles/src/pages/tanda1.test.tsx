import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { FichaRapidaLote } from "@/components/FichaRapidaLote";
import { FiltrosInmuebles } from "@/components/FiltrosInmuebles";
import { NotaSinDatoPosicion } from "@/components/PlanoCatalogo";
import { PlanoInteractivo } from "@/components/PlanoInteractivo";
import { Leyenda, PanelLote, PlanoLotes } from "@/components/PlanoLotes";
import { TarjetaPredio } from "@/components/TarjetaPredio";
import { SIN_FICHA, tocarLote } from "@/lib/fichaLote";
import { FILTROS_PUBLICO_VACIOS, type FiltrosPublico } from "@/lib/filtrosPublico";
import type { PlanoLotizacion } from "@/lib/planoLotizacion";
import { conteoPlano } from "@/lib/proyectos";
import type { EstadoComercial, InmueblePublico, LoteProyecto } from "@/lib/types";

/*
 * v2.0 (tanda 1): pruebas de pantalla (dibujadas en el servidor, como las demás) de la señalización de los tres estados
 * (RF40), la ficha del lote al tocarlo (RF43) y los filtros por posición, incluido el caso «sin dato» (RF49).
 */

const rutas: Record<string, unknown> = {};
vi.mock("@/lib/useApi", () => ({
  useApi: (ruta: string | null) => {
    const clave = Object.keys(rutas).find((k) => ruta?.startsWith(k));
    return { data: clave ? rutas[clave] : null, loading: false, error: null, reload: () => {} };
  },
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ usuario: null, logout: () => {} }) }));

const conRouter = (el: ReactElement) => renderToStaticMarkup(<MemoryRouter>{el}</MemoryRouter>);

function lote(clave: string, extra: Partial<LoteProyecto> = {}): LoteProyecto {
  const [manzana, n] = clave.split("-");
  const estado: EstadoComercial = extra.estadoComercial ?? "DISPONIBLE";
  const etiquetas: Record<EstadoComercial, string> = { DISPONIBLE: "Disponible", SEPARADO: "Separado", VENDIDO: "Vendido" };
  return {
    codigo: `demo-${clave}`, clave, manzana, numero: Number(n), areaM2: 140, precio: 35000, moneda: "PEN", precioPorM2: 250,
    estadoComercial: estado, estadoComercialEtiqueta: etiquetas[estado], independizacion: "EN_PARTIDA_MATRIZ",
    independizacionEtiqueta: "En partida matriz", zonificacion: "RDM", publicado: true, casoCodigo: null, ...extra,
  };
}

const LOTES = [
  lote("A-1", { posicion: "ESQUINA" }), lote("A-2", { estadoComercial: "SEPARADO", posicion: "ESQUINA+PARQUE" }),
  lote("A-3", { estadoComercial: "VENDIDO" }), lote("A-4", { posicion: "AVENIDA" }),
];

const PLANO: PlanoLotizacion = {
  proyecto: "demo", imagen: "/planos/demo.jpg", ancho: 1000, alto: 800,
  lotes: { "A-1": [0.1, 0.2], "A-2": [0.3, 0.4], "A-3": [0.5, 0.6], "A-4": [0.7, 0.8] },
};

describe("RF40: los tres estados se distinguen de inmediato (color + ícono + etiqueta)", () => {
  it("la leyenda nombra y cuenta los tres estados, cada uno con su ícono", () => {
    const html = conRouter(<Leyenda conteo={conteoPlano(LOTES)} />);
    for (const t of ["Disponible", "Separado", "Vendido"]) expect(html).toContain(t);
    expect(html).toContain("var(--lote-disponible)");
    expect(html).toContain("var(--lote-separado)");
    expect(html).toContain("var(--lote-vendido)");
    expect(html.match(/<svg/g)!.length).toBeGreaterThanOrEqual(6); // un cuadro y un ícono por estado
  });

  it("el plano de manzanas marca cada lote con el ícono de su estado y, separado y vendido, con una franja y su etiqueta escrita", () => {
    const html = conRouter(<PlanoLotes proyectoCodigo="demo" lotes={LOTES} />);
    for (const e of ["DISPONIBLE", "SEPARADO", "VENDIDO"]) expect(html).toContain(`data-icono-estado="${e}"`);
    expect(html).toContain('data-banda-estado="SEPARADO"');
    expect(html).toContain('data-banda-estado="VENDIDO"');
    expect(html).not.toContain('data-banda-estado="DISPONIBLE"');
    expect(html).toContain(">SEPARADO<");
    expect(html).toContain(">VENDIDO<");
    // El estado también va en el nombre accesible del lote.
    expect(html).toMatch(/aria-label="Manzana A, lote 2: separado/);
    expect(html).toMatch(/aria-label="Manzana A, lote 3: vendido/);
  });

  it("en el plano interactivo, cada lote es un marcador con su estado sin necesidad de hacer clic; al acercar, escribe la etiqueta", () => {
    const lejos = conRouter(<PlanoInteractivo plano={PLANO} lotes={LOTES} />);
    for (const [clave, estado] of [["A-1", "DISPONIBLE"], ["A-2", "SEPARADO"], ["A-3", "VENDIDO"]]) {
      expect(lejos).toMatch(new RegExp(`data-punto-lote="${clave}"[^>]*data-estado="${estado}"`));
    }
    // Los separados y vendidos son más grandes que los disponibles (1,3×) y llevan etiqueta escrita.
    expect(lejos).toContain(">SEPARADO<");
    expect(lejos).toContain(">VENDIDO<");
    expect(lejos).toContain("--etiqueta:none");
    const cerca = conRouter(<PlanoInteractivo plano={PLANO} lotes={LOTES} vistaInicial={{ k: 3, x: -100, y: -100 }} />);
    expect(cerca).toContain("--etiqueta:inline-flex");
    expect(cerca).toContain(">3×<");
  });

  it("la tarjeta del catálogo muestra una insignia fuerte para separado y vendido, y ninguna sobre la foto para disponible", () => {
    const item = (estado: EstadoComercial): InmueblePublico => ({
      codigo: "demo-A-3", denominacion: "Mz. A Lote 3 · Demo", contexto: "Ica", estado: "VERDE", etiqueta: "Sin alertas",
      origen: "PROYECTO", fuente: null, fechaConsulta: null, estadoTecnico: "NO_SOLICITADA", resultadoTecnico: null,
      riesgoFisicoDetectado: false,
      predio: { tipoInmueble: "LOTE_URBANO", tipoInmuebleEtiqueta: "Lote o terreno", distrito: "Ica", areaM2: 140,
        areaConstruidaInscrita: null, precioReferencial: 35000, moneda: "PEN", precioNota: null, precioPorM2: 250,
        proyecto: "Demo", estadoComercial: estado, estadoComercialEtiqueta: estado },
      tiposAlerta: [], titularidadComercial: "INMOBILIARIA", clase: "LOTE_PROYECTO", proyectoCodigo: "demo", lote: "A-3",
      fuenteIndicadorA: "PARTIDA_MATRIZ", rotuloIndicadorA: "Indicador A de la partida matriz del proyecto",
    } as InmueblePublico);
    const separado = conRouter(<TarjetaPredio c={item("SEPARADO")} publico />);
    expect(separado).toContain('data-insignia-estado="SEPARADO"');
    expect(separado.match(/data-insignia-estado="SEPARADO"/g)).toHaveLength(2); // sobre la foto y en el cuadro de indicadores
    const vendido = conRouter(<TarjetaPredio c={item("VENDIDO")} publico />);
    expect(vendido.match(/data-insignia-estado="VENDIDO"/g)).toHaveLength(2);
    expect(vendido).toContain("Estado comercial: VENDIDO");
    const disponible = conRouter(<TarjetaPredio c={item("DISPONIBLE")} publico />);
    expect(disponible.match(/data-insignia-estado="DISPONIBLE"/g)).toHaveLength(1);
  });
});

describe("RF43: la ficha del lote", () => {
  it("sin clic no hay ficha; con un clic en un lote (estado de la selección) aparece con sus datos y «Sin dato» en los que faltan", () => {
    expect(conRouter(<PlanoInteractivo plano={PLANO} lotes={LOTES} />)).not.toContain("data-ficha-lote");
    const abierta = conRouter(<PlanoInteractivo plano={PLANO} lotes={LOTES} fichaInicial={tocarLote(SIN_FICHA, "A-2")} />);
    expect(abierta).toContain('data-ficha-lote="A-2"');
    expect(abierta).toContain("Mz. A · Lote 2");
    expect(abierta).toContain("Separado");
    expect(abierta).toContain("140 m²");
    for (const d of ["frontis", "fondo", "nota"]) expect(abierta).toMatch(new RegExp(`data-dato-ficha="${d}"[^]*?Sin dato`));
    expect(abierta).toContain("Esquina · Frente al parque");
    expect(abierta).toContain("data-cerrar-ficha");
  });

  it("al pasar el mouse la ficha aparece sin botón de cierre y sin capturar el puntero", () => {
    const html = conRouter(<PlanoInteractivo plano={PLANO} lotes={LOTES} fichaInicial={{ fijo: null, sobre: "A-3" }} />);
    expect(html).toContain('data-ficha-lote="A-3"');
    expect(html).toContain("Vendido");
    expect(html).toMatch(/class="absolute inset-x-2 bottom-2[^"]*pointer-events-none"/);
    expect(html).not.toContain("data-cerrar-ficha");
  });

  it("la ficha muestra frontis, fondo y nota cuando el lote los trae", () => {
    const html = conRouter(<FichaRapidaLote lote={lote("B-1", { frontis: 8, fondo: 17.5, notaReserva: "5 % de descuento al contado", posicion: "ESQUINA" })} />);
    expect(html).toContain("8 m");
    expect(html).toContain("17,5 m");
    expect(html).toContain("5 % de descuento al contado");
    expect(html).not.toContain("Sin dato");
  });

  it("el panel del lote también dice «Sin dato» en lo que no viene", () => {
    const html = conRouter(<PanelLote proyectoCodigo="demo" lote={lote("A-4")} cerrar={() => {}} />);
    for (const d of ["frontis", "fondo", "nota", "posicion"]) expect(html).toMatch(new RegExp(`data-dato-panel="${d}"[^]*?Sin dato`));
  });

  it("el plano se puede mover y acercar: hay botones, un recuadro enfocable y la capa que se transforma", () => {
    const html = conRouter(<PlanoInteractivo plano={PLANO} lotes={LOTES} vistaInicial={{ k: 2, x: -50, y: -30 }} />);
    expect(html).toContain('data-zoom="mas"');
    expect(html).toContain('data-zoom="menos"');
    expect(html).toContain('data-zoom="todo"');
    expect(html).toContain("data-plano-viewport");
    expect(html).toContain("translate(-50px, -30px) scale(2)");
    expect(html).toContain("touch-action:none");
    // A 1× el dedo sigue desplazando la página.
    expect(conRouter(<PlanoInteractivo plano={PLANO} lotes={LOTES} />)).toContain("touch-action:pan-y");
  });
});

describe("RF49: filtros por posición", () => {
  const filtros = (extra: Partial<FiltrosPublico> = {}): FiltrosPublico => ({ ...FILTROS_PUBLICO_VACIOS, ...extra });
  const dibujar = (f: FiltrosPublico) => conRouter(<FiltrosInmuebles filtros={f} opciones={null} cambiar={() => {}} limpiar={() => {}} total={3} />);

  it("el catálogo ofrece esquina, frente al parque y frente a avenida, y avisa de los lotes sin dato", () => {
    const html = dibujar(filtros());
    expect(html).toContain('id="f-posicion"');
    for (const t of ["Esquina", "Frente al parque", "Frente a avenida"]) expect(html).toContain(`>${t}</option>`);
    expect(html).toContain("Los lotes sin dato de posición se ven en todo lo demás.");
  });

  it("con una posición elegida, la opción sale marcada y se avisa que los lotes sin dato no aparecen", () => {
    const html = dibujar(filtros({ posicion: "PARQUE" }));
    expect(html).toMatch(/<option value="PARQUE" selected="">Frente al parque<\/option>/);
    expect(html).toContain("Los lotes sin dato de posición no aparecen con este filtro.");
    expect(html).toContain('<span class="cifras rounded-full bg-primary px-2 py-0.5 text-xs text-white">1</span>');
  });

  it("en el plano del catálogo, con el filtro de posición, avisa cuántos lotes no tienen dato y que siguen visibles", () => {
    const algunos = conRouter(<NotaSinDatoPosicion lotes={LOTES} />); // A-3 y... A-3 sin dato (A-1, A-2 y A-4 tienen)
    expect(algunos).toContain("Sin dato de posición: 1 lote.");
    expect(algunos).toContain("siguen visibles en el plano");
    const varios = conRouter(<NotaSinDatoPosicion lotes={[lote("A-1"), lote("A-2"), lote("A-3", { posicion: "ESQUINA" })]} />);
    expect(varios).toContain("Sin dato de posición: 2 lotes.");
    const ninguno = conRouter(<NotaSinDatoPosicion lotes={LOTES.map((l) => ({ ...l, posicion: "ESQUINA" }))} />);
    expect(ninguno).toContain("Todos los lotes de este proyecto tienen dato de posición.");
    const todos = conRouter(<NotaSinDatoPosicion lotes={[lote("A-1"), lote("A-2")]} />);
    expect(todos).toContain("Sin dato: este proyecto todavía no tiene la posición de sus lotes");
  });

  it("el plano con filtros resalta con aro dorado los lotes que cumplen y atenúa los demás, sin perder su ícono", () => {
    const cumplen = new Set(["A-1", "A-2"]); // esquinas; A-3 y A-4 no cumplen (A-3 sin dato)
    const html = conRouter(<PlanoInteractivo plano={PLANO} lotes={LOTES} resaltados={cumplen} destacar />);
    expect(html).toMatch(/data-punto-lote="A-1"[^>]*data-cumple="true"/);
    expect(html).toMatch(/data-punto-lote="A-3"[^>]*data-cumple="false"/);
    expect(html).toMatch(/data-punto-lote="A-3"[^>]*opacity:0.4/);
    expect(html).toMatch(/data-punto-lote="A-1"[^>]*var\(--paleta-dorado\)/);
    expect(html).not.toMatch(/data-punto-lote="A-3"[^>]*var\(--paleta-dorado\)/);
    // El lote vendido sin dato sigue siendo reconocible aunque no cumpla el filtro.
    expect(html).toMatch(/data-punto-lote="A-3" data-estado="VENDIDO"/);
    const manzanas = conRouter(<PlanoLotes proyectoCodigo="demo" lotes={LOTES} resaltados={cumplen} destacar />);
    expect(manzanas.match(/data-destacado/g)).toHaveLength(2);
    expect(manzanas).toMatch(/data-cumple="false"[^>]*data-lote="A-3"/);
  });

  it("sin filtros no se resalta ni se atenúa ningún lote", () => {
    const html = conRouter(<PlanoInteractivo plano={PLANO} lotes={LOTES} />);
    expect(html).not.toContain('data-cumple="false"');
    expect(html).not.toContain("var(--paleta-dorado)");
  });
});
