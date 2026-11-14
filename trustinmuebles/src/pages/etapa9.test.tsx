import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { Navbar } from "@/components/layout/Navbar";
import { MenuMovil } from "@/components/layout/MenuMovil";
import { AvisoNuevos } from "@/components/layout/AvisoNuevos";
import { CondicionesPago, UbicacionProyecto } from "@/components/UbicacionProyecto";
import Proyecto from "@/pages/Proyecto";
import FichaLote from "@/pages/FichaLote";
import ProyectosEquipo, { FormularioDatosProyecto } from "@/pages/ProyectosEquipo";
import { TablaEmbudo } from "@/pages/Interesados";
import { nombreDeDescarga } from "@/lib/api";
import {
  burbujaNuevos, rutaExportarInteresados, textoAvisoNuevos, textoEtapaEmbudo, type Embudo, type EtapaInteres,
} from "@/lib/interes";
import {
  cuerpoDatosProyecto, datosDe, enlaceComoLlegar, rutaExportarLotes, validarDatosProyecto,
} from "@/lib/proyectos";
import { navegacion, opcionesMenuMovil } from "@/lib/permisos";
import type { LoteProyecto, LotePublico, ProyectoPublico, ResumenProyecto, Rol, Usuario } from "@/lib/types";

/*
 * v1.0 (etapa 9): exportar a CSV, ubicación y condiciones de pago del proyecto, aviso de interesados nuevos en el menú y
 * embudo por etapa. Se dibujan en el servidor (sin navegador).
 */

const sesion: { usuario: Usuario | null } = { usuario: null };
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ usuario: sesion.usuario, logout: () => {} }) }));
const porRuta: Record<string, unknown> = {};
vi.mock("@/lib/useApi", () => ({
  useApi: (ruta: string | null) => ({ data: ruta === null ? null : porRuta[ruta] ?? null, loading: false, error: null, reload: () => {}, setData: () => {} }),
}));

const conRouter = (el: ReactElement) => renderToStaticMarkup(<MemoryRouter>{el}</MemoryRouter>);
const enRuta = (ruta: string, patron: string, el: ReactElement) => renderToStaticMarkup(
  <MemoryRouter initialEntries={[ruta]}><Routes><Route path={patron} element={el} /></Routes></MemoryRouter>,
);
const cuenta = (rol: Rol): Usuario => ({ id: 1, codigoCuenta: rol === "GESTOR" ? "gestor-01" : "asesor-01", rol });

beforeEach(() => {
  sesion.usuario = null;
  for (const k of Object.keys(porRuta)) delete porRuta[k];
});

const LOTE: LoteProyecto = {
  codigo: "rinconada-del-lucumo-A-1", clave: "A-1", manzana: "A", numero: 1, areaM2: 160, precio: 48000, moneda: "PEN",
  precioPorM2: 300, estadoComercial: "DISPONIBLE", estadoComercialEtiqueta: "Disponible", independizacion: "EN_PARTIDA_MATRIZ",
  independizacionEtiqueta: "En partida matriz", zonificacion: "RDM", publicado: true, casoCodigo: null,
};
const INDICADOR = { fuente: "SIN_EVALUACION" as const, rotulo: "Sin evaluación documental", casoCodigo: null, evaluacion: null };
const MAPA = "https://maps.app.goo.gl/EjemploLucumo123";

const proyecto = (extra: Partial<ProyectoPublico> = {}): ProyectoPublico => ({
  codigo: "rinconada-del-lucumo", nombre: "Rinconada del Lúcumo", distrito: "La Tinguiña", descripcion: "Lotización.",
  recorridoUrl: null, hitos: [], lotes: [LOTE], conteo: { disponibles: 1, separados: 0, vendidos: 0 },
  indicadorA: INDICADOR as unknown as ProyectoPublico["indicadorA"], documentos: [], inmueblesPublicados: 0,
  direccion: "Camino a Chanchajalla s/n, a 1 km de la plaza de La Tinguiña, Ica", mapaUrl: null, condicionesPago: null,
  ...extra,
});

const lotePublico = (extra: Partial<LotePublico> = {}): LotePublico => ({
  codigo: LOTE.codigo, denominacion: "Mz. A Lote 1 · Rinconada del Lúcumo", proyectoCodigo: "rinconada-del-lucumo",
  proyectoNombre: "Rinconada del Lúcumo", lote: LOTE, indicadorA: INDICADOR as unknown as LotePublico["indicadorA"],
  predio: { tipoInmueble: "LOTE_URBANO", tipoInmuebleEtiqueta: "Lote o terreno", distrito: "La Tinguiña", areaM2: 160,
    areaConstruidaInscrita: null, precioReferencial: 48000, moneda: "PEN", precioNota: null, precioPorM2: 300,
    proyecto: "Rinconada del Lúcumo", estadoComercial: "DISPONIBLE", estadoComercialEtiqueta: "Disponible",
    independizacion: "EN_PARTIDA_MATRIZ", independizacionEtiqueta: "En partida matriz",
    independizacionExplicacion: "El lote todavía forma parte de la partida matriz.", zonificacion: "RDM",
    proyectoCodigo: "rinconada-del-lucumo" } as unknown as LotePublico["predio"],
  proyectoDireccion: "Camino a Chanchajalla s/n, a 1 km de la plaza de La Tinguiña, Ica", proyectoMapaUrl: MAPA,
  ...extra,
});

// ------------------------------------------------------------------------------------------------- exportar

describe("exportar a CSV", () => {
  it("la exportación de interesados lleva los mismos filtros que la bandeja", () => {
    expect(rutaExportarInteresados({})).toBe("/interesados/exportar.csv");
    expect(rutaExportarInteresados({ etapa: "NUEVO", proyecto: "altos-de-ventisca", vencidos: true }))
      .toBe("/interesados/exportar.csv?etapa=NUEVO&proyecto=altos-de-ventisca&vencidos=true");
    expect(rutaExportarLotes("altos-de-ventisca")).toBe("/proyectos/altos-de-ventisca/lotes/exportar.csv");
  });

  it("toma el nombre del archivo que manda el servidor y descarta uno con caracteres raros", () => {
    expect(nombreDeDescarga('attachment; filename="interesados-2026-11-16.csv"', "x.csv")).toBe("interesados-2026-11-16.csv");
    expect(nombreDeDescarga(null, "x.csv")).toBe("x.csv");
    expect(nombreDeDescarga('attachment; filename="../../a b.csv"', "x.csv")).toBe("x.csv");
  });

  it("la lista de proyectos del equipo ofrece «Exportar lotes (CSV)» y «Ubicación y pago»", () => {
    const p: ResumenProyecto = { codigo: "altos-de-ventisca", nombre: "Altos de Ventisca", distrito: "Subtanjalla",
      casoMatrizCodigo: "11112001", autorizacionVigente: true, lotes: 56, publicados: 56,
      conteo: { disponibles: 34, separados: 14, vendidos: 8 }, direccion: "Sector La Ventisca, Subtanjalla, Ica", mapaUrl: null,
      condicionesPago: null };
    const vacio: ResumenProyecto = { ...p, codigo: "horizonte-de-los-aquijes", nombre: "Horizonte", lotes: 0, publicados: 0, direccion: null };
    porRuta["/proyectos"] = [p, vacio];
    const html = conRouter(<ProyectosEquipo />);
    expect(html).toContain('data-exportar-lotes="altos-de-ventisca"');
    expect(html).toContain("Exportar lotes (CSV)");
    expect(html).toContain('data-editar-datos="altos-de-ventisca"');
    expect(html).toContain("Sector La Ventisca, Subtanjalla, Ica");
    expect(html).toContain("Sin dirección registrada");
    // Sin lotes no hay nada que exportar.
    expect(html).toMatch(/disabled=""[^>]*data-exportar-lotes="horizonte-de-los-aquijes"/);
  });
});

// ------------------------------------------------------------------------------------------------- ubicación

describe("ubicación del proyecto", () => {
  it("«Cómo llegar» solo con un enlace https con dominio", () => {
    expect(enlaceComoLlegar(MAPA)).toBe(MAPA);
    expect(enlaceComoLlegar("http://maps.google.com/x")).toBeNull();
    expect(enlaceComoLlegar("javascript:alert(1)")).toBeNull();
    expect(enlaceComoLlegar("https://localhost/x")).toBeNull();
    expect(enlaceComoLlegar("")).toBeNull();
    expect(enlaceComoLlegar(null)).toBeNull();
  });

  it("la página del proyecto muestra la dirección y, con enlace, el botón que abre otra pestaña", () => {
    porRuta["/publico/proyectos/rinconada-del-lucumo"] = proyecto({ mapaUrl: MAPA });
    const html = enRuta("/proyectos/rinconada-del-lucumo", "/proyectos/:codigo", <Proyecto />);
    expect(html).toContain("Camino a Chanchajalla s/n, a 1 km de la plaza de La Tinguiña, Ica");
    expect(html).toContain(`href="${MAPA}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Cómo llegar");
    expect(html).toContain('aria-label="Cómo llegar a Rinconada del Lúcumo (abre el mapa en otra pestaña)"');
    expect(html).not.toContain("<iframe");
  });

  it("sin enlace (la precarga) se muestra la dirección y no hay botón ni búsqueda inventada", () => {
    porRuta["/publico/proyectos/rinconada-del-lucumo"] = proyecto();
    const html = enRuta("/proyectos/rinconada-del-lucumo", "/proyectos/:codigo", <Proyecto />);
    expect(html).toContain("Camino a Chanchajalla s/n");
    expect(html).not.toContain("data-como-llegar");
    expect(html).not.toContain("google.com/maps/search");
  });

  it("la ficha del lote muestra la dirección del proyecto y «Cómo llegar»", () => {
    porRuta["/publico/proyectos/rinconada-del-lucumo/lotes/A-1"] = lotePublico();
    const html = enRuta("/proyectos/rinconada-del-lucumo/lotes/A-1", "/proyectos/:codigo/lotes/:lote", <FichaLote />);
    expect(html).toContain("Camino a Chanchajalla s/n, a 1 km de la plaza de La Tinguiña, Ica");
    expect(html).toContain(`href="${MAPA}"`);
    expect(html).toContain("Cómo llegar");
  });

  it("sin dirección ni enlace no se dibuja nada", () => {
    expect(conRouter(<UbicacionProyecto nombre="X" direccion={null} mapaUrl={null} />)).toBe("");
  });
});

// ------------------------------------------------------------------------------------------------- condiciones de pago

describe("condiciones de pago", () => {
  it("se muestran con su título y la nota «Consulta con un asesor», sin simulador ni tasas", () => {
    porRuta["/publico/proyectos/rinconada-del-lucumo"] = proyecto({ condicionesPago: "Inicial desde S/ 5,000.\nSaldo en cuotas." });
    const html = enRuta("/proyectos/rinconada-del-lucumo", "/proyectos/:codigo", <Proyecto />);
    expect(html).toContain("Condiciones de pago</h2>");
    expect(html).toContain("Inicial desde S/ 5,000.\nSaldo en cuotas.");
    expect(html).toContain("Consulta con un asesor.");
    expect(html).toContain("whitespace-pre-line");
    expect(html).not.toMatch(/simulador|TEA|TCEA|cuota mensual de/i);
  });

  it("vacías (la precarga) no se muestra la sección", () => {
    porRuta["/publico/proyectos/rinconada-del-lucumo"] = proyecto({ condicionesPago: null });
    expect(enRuta("/proyectos/rinconada-del-lucumo", "/proyectos/:codigo", <Proyecto />)).not.toContain("Condiciones de pago");
    expect(conRouter(<CondicionesPago texto="   " />)).toBe("");
  });

  it("el formulario valida con los límites del servidor y manda vacío como null", () => {
    const d = datosDe({ direccion: "Av. Los Aquijes s/n", mapaUrl: null, condicionesPago: null });
    expect(validarDatosProyecto(d)).toEqual({});
    expect(validarDatosProyecto({ ...d, condicionesPago: "x".repeat(501) }).condicionesPago).toContain("500");
    expect(validarDatosProyecto({ ...d, condicionesPago: "x".repeat(500) }).condicionesPago).toBeUndefined();
    expect(validarDatosProyecto({ ...d, direccion: "d".repeat(201) }).direccion).toContain("200");
    expect(validarDatosProyecto({ ...d, mapaUrl: "http://x.com" }).mapaUrl).toContain("https");
    expect(cuerpoDatosProyecto({ direccion: " ", mapaUrl: "", condicionesPago: " Al contado. " }))
      .toEqual({ direccion: null, mapaUrl: null, condicionesPago: "Al contado." });
  });

  it("el formulario muestra los tres campos con el contador de caracteres", () => {
    const p = { codigo: "c", nombre: "N", distrito: null, casoMatrizCodigo: null, autorizacionVigente: true, lotes: 1,
      publicados: 1, conteo: { disponibles: 1, separados: 0, vendidos: 0 }, direccion: "Calle 1", mapaUrl: null,
      condicionesPago: "Contado" } satisfies ResumenProyecto;
    const html = conRouter(<FormularioDatosProyecto proyecto={p} alCancelar={() => {}} alGuardar={() => {}} />);
    expect(html).toContain("Dirección");
    expect(html).toContain("Enlace de mapa (opcional)");
    expect(html).toContain("Condiciones de pago (opcional)");
    expect(html).toContain("7 de 500 caracteres");
    expect(html).toContain('maxLength="500"');
  });
});

// ------------------------------------------------------------------------------------------------- aviso de nuevos

describe("aviso de interesados nuevos", () => {
  it("el texto para lectores de pantalla y la burbuja", () => {
    expect(textoAvisoNuevos(0)).toBeNull();
    expect(textoAvisoNuevos(1)).toBe("1 interesado nuevo");
    expect(textoAvisoNuevos(4)).toBe("4 interesados nuevos");
    expect(burbujaNuevos(7)).toBe("7");
    expect(burbujaNuevos(120)).toBe("99+");
    const html = renderToStaticMarkup(<AvisoNuevos n={3} />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain(">3<");
    expect(html).toContain('<span class="sr-only">, 3 interesados nuevos</span>');
    expect(renderToStaticMarkup(<AvisoNuevos n={0} />)).toBe("");
  });

  it("el gestor también tiene «Interesados» en el menú", () => {
    expect(navegacion("GESTOR").map((e) => e.clave)).toContain("interesados");
    expect(navegacion("ASESOR").map((e) => e.clave)).toContain("interesados");
    expect(navegacion("REVISOR").map((e) => e.clave)).not.toContain("interesados");
  });

  for (const rol of ["ASESOR", "GESTOR"] as Rol[]) {
    it(`la barra del ${rol.toLowerCase()} muestra la cantidad en etapa NUEVO junto a «Interesados»`, () => {
      sesion.usuario = cuenta(rol);
      porRuta["/interesados/nuevos"] = { nuevos: 5 };
      const html = conRouter(<Navbar />);
      expect(html).toMatch(/Interesados<span aria-hidden="true" data-aviso-nuevos="5"[^>]*>5<\/span><span class="sr-only">, 5 interesados nuevos<\/span>/);
    });
  }

  it("el menú ☰ también lo muestra; sin nuevos no hay burbuja; otros roles no preguntan", () => {
    const html = conRouter(<MenuMovil abierto enlaces={opcionesMenuMovil("ASESOR")} claveActiva={null} alCerrar={() => {}} nuevos={2} />);
    expect(html).toContain('data-aviso-nuevos="2"');
    expect(html).toContain("2 interesados nuevos");
    sesion.usuario = cuenta("ASESOR");
    porRuta["/interesados/nuevos"] = { nuevos: 0 };
    expect(conRouter(<Navbar />)).not.toContain("data-aviso-nuevos");
    sesion.usuario = { id: 2, codigoCuenta: "revisor-01", rol: "REVISOR" };
    porRuta["/interesados/nuevos"] = { nuevos: 9 };
    expect(conRouter(<Navbar />)).not.toContain("data-aviso-nuevos");
  });
});

// ------------------------------------------------------------------------------------------------- embudo

const ETAPAS: [EtapaInteres, string][] = [["NUEVO", "Nuevo"], ["CONTACTADO", "Contactado"], ["CITA_AGENDADA", "Cita agendada"],
  ["VISITA_REALIZADA", "Visita realizada"], ["SEPARACION", "Separación"], ["VENTA", "Venta"], ["DESCARTADO", "Descartado"]];
const fila = (clave: string, etiqueta: string, cantidades: number[]) => {
  const total = cantidades.reduce((a, b) => a + b, 0);
  return { clave, etiqueta, total, etapas: ETAPAS.map(([etapa, et], i) => ({ etapa, etiqueta: et, cantidad: cantidades[i],
    porcentaje: total ? Math.round((cantidades[i] * 1000) / total) / 10 : 0 })) };
};

describe("embudo", () => {
  it("cantidad y porcentaje con un decimal", () => {
    expect(textoEtapaEmbudo({ cantidad: 6, porcentaje: 35.3 })).toBe("6 (35.3 %)");
    expect(textoEtapaEmbudo({ cantidad: 0, porcentaje: 0 })).toBe("0 (0.0 %)");
  });

  it("una fila del total y una por proyecto, con todas las etapas", () => {
    const e: Embudo = {
      total: fila("TOTAL", "Todos los interesados", [6, 3, 2, 1, 1, 1, 3]),
      porProyecto: [fila("altos-de-ventisca", "Altos de Ventisca", [3, 2, 1, 0, 1, 0, 1]),
        fila("SIN_PROYECTO", "Sin proyecto (búsqueda general o inmueble suelto)", [3, 1, 1, 1, 0, 1, 2])],
    };
    const html = renderToStaticMarkup(<TablaEmbudo embudo={e} />);
    expect(html).toContain("Embudo de 17 interesados");
    expect(html).toContain('data-fila-embudo="TOTAL"');
    expect(html).toContain('data-fila-embudo="altos-de-ventisca"');
    expect(html).toContain('data-fila-embudo="SIN_PROYECTO"');
    expect(html).toContain("6 (35.3 %)");
    expect(html).toContain("3 (37.5 %)");
    for (const [, et] of ETAPAS) expect(html).toContain(`>${et}</th>`);
    expect(html).toContain("<caption");
  });
});
