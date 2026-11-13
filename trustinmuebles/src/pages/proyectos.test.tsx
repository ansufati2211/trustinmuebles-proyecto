import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { PlanoLotes, PanelLote } from "@/components/PlanoLotes";
import { TarjetaPredio } from "@/components/TarjetaPredio";
import { Navbar } from "@/components/layout/Navbar";
import Proyecto from "@/pages/Proyecto";
import FichaLote from "@/pages/FichaLote";
import type { EstadoComercial, Evaluacion, InmueblePublico, LoteProyecto, LotePublico, ProyectoPublico } from "@/lib/types";

/*
 * v1.0 (etapa 3a): pruebas de pantalla del plano de lotes, la página del proyecto, la ficha del lote, la tarjeta de un
 * lote en el catálogo y la barra de navegación. Se dibujan en el servidor (sin navegador) con datos fijos.
 */

const respuesta: { data: unknown } = { data: null };
vi.mock("@/lib/useApi", () => ({
  useApi: () => ({ data: respuesta.data, loading: false, error: null, reload: () => {} }),
}));
const sesion: { usuario: { codigo: string; rol: string } | null } = { usuario: null };
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ usuario: sesion.usuario, logout: () => {} }) }));

function lote(manzana: string, numero: number, extra: Partial<LoteProyecto> = {}): LoteProyecto {
  const estado: EstadoComercial = extra.estadoComercial ?? "DISPONIBLE";
  const etiquetas: Record<EstadoComercial, string> = { DISPONIBLE: "Disponible", SEPARADO: "Separado", VENDIDO: "Vendido" };
  return {
    codigo: `altos-de-ventisca-${manzana}-${numero}`, clave: `${manzana}-${numero}`, manzana, numero, areaM2: 140,
    precio: 35000, moneda: "PEN", precioPorM2: 250, estadoComercial: estado, estadoComercialEtiqueta: etiquetas[estado],
    independizacion: "EN_PARTIDA_MATRIZ", independizacionEtiqueta: "En partida matriz", zonificacion: "RDM",
    publicado: true, casoCodigo: null, ...extra,
  };
}

const LOTES = [
  lote("A", 1, { areaM2: 166.25, precio: 41600, precioPorM2: 250.23 }), lote("A", 2, { estadoComercial: "SEPARADO" }),
  lote("A", 3, { estadoComercial: "VENDIDO" }), lote("A", 4), lote("B", 1), lote("B", 2, { publicado: false, precio: null, precioPorM2: null, moneda: null }),
];

const EVALUACION: Evaluacion = {
  estado: "VERDE", etiqueta: "Sin alertas", motivos: [{ tipo: "SIN_ALERTAS", texto: "No se encontraron alertas en los campos evaluados." }],
  faltantes: [], alertas: [], noDescartaOtras: false, versionReglas: "v0.5", reglasAplicadas: [],
  limite: "Resultado informativo sobre los datos registrados en el expediente.", calculadaEn: "2026-11-12T00:00:00Z",
  expedienteVersion: 0,
} as unknown as Evaluacion;

const INDICADOR = { fuente: "PARTIDA_MATRIZ" as const, rotulo: "Indicador A de la partida matriz del proyecto",
  casoCodigo: "11112001", evaluacion: EVALUACION };

const PROYECTO: ProyectoPublico = {
  codigo: "altos-de-ventisca", nombre: "Altos de Ventisca", distrito: "Subtanjalla",
  descripcion: "Lotización residencial de 56 lotes.", recorridoUrl: null,
  hitos: [
    { orden: 1, nombre: "Compra del terreno matriz", estado: "COMPLETADO", estadoEtiqueta: "Completado", fecha: "2024-06-10" },
    { orden: 2, nombre: "Redes de agua potable y desagüe", estado: "EN_PROCESO", estadoEtiqueta: "En proceso", fecha: null },
    { orden: 3, nombre: "Red eléctrica y alumbrado público", estado: "PENDIENTE", estadoEtiqueta: "Pendiente", fecha: null },
  ],
  lotes: LOTES, conteo: { disponibles: 4, separados: 1, vendidos: 1 }, indicadorA: INDICADOR,
  documentos: [
    { tipo: "PLANO_PERIMETRICO", tipoEtiqueta: "Plano perimétrico y de ubicación", estado: "PRESENTADO", resumen: "Terreno matriz.", disponible: true },
    { tipo: "TASACION", tipoEtiqueta: "Tasación", estado: "NO_PRESENTADO", resumen: null, disponible: false },
  ],
  inmueblesPublicados: 0,
};

const enRuta = (ruta: string, patron: string, elemento: ReactElement) => renderToStaticMarkup(
  <MemoryRouter initialEntries={[ruta]}><Routes><Route path={patron} element={elemento} /></Routes></MemoryRouter>,
);

const conRouter = (elemento: ReactElement) => renderToStaticMarkup(<MemoryRouter>{elemento}</MemoryRouter>);

beforeEach(() => {
  respuesta.data = null;
});

describe("plano de lotes", () => {
  it("dibuja cada lote con su número, su estado y un nombre accesible", () => {
    const html = conRouter(<PlanoLotes proyectoCodigo="altos-de-ventisca" lotes={LOTES} />);
    expect(html).toContain("<svg");
    expect(html.match(/role="button"/g)).toHaveLength(LOTES.length);
    expect(html).toContain('aria-label="Manzana A, lote 2: separado, 140 m²');
    expect(html).toContain('data-lote="A-3" data-estado="VENDIDO"');
    expect(html).toContain('data-lote="B-2" data-estado="NO_PUBLICADO"');
    expect(html).toContain("Mz. A");
    expect(html).toContain("Mz. B");
    // Se entra al plano con una sola parada de tabulación; las flechas recorren el resto.
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html.match(/tabindex="-1"/g)).toHaveLength(LOTES.length - 1);
    expect(html).toContain("Usa las flechas para recorrerlos y Enter para ver uno");
  });

  it("la leyenda dice cada estado con texto y su cantidad", () => {
    const html = conRouter(<PlanoLotes proyectoCodigo="p" lotes={LOTES} />);
    expect(html).toContain('aria-label="Leyenda del plano"');
    for (const t of ["Disponible", "Separado", "Vendido", "No publicado en línea"]) expect(html).toContain(t);
    expect(html).toMatch(/Disponible<\/span><span[^>]*>\(3\)/);
    // Sin lotes no publicados, la leyenda no los menciona.
    expect(conRouter(<PlanoLotes proyectoCodigo="p" lotes={LOTES.slice(0, 4)} />)).not.toContain("No publicado en línea");
  });

  it("al elegir un lote, el panel muestra área, precio, precio por m², estado y el enlace a su ficha", () => {
    const html = conRouter(<PlanoLotes proyectoCodigo="altos-de-ventisca" lotes={LOTES} inicial="A-1" />);
    expect(html).toContain('data-panel-lote="A-1"');
    expect(html).toContain("166.25 m²");
    expect(html).toMatch(/S\/\s?41,600/);
    expect(html).toMatch(/S\/\s?250\.23/);
    expect(html).toContain("Disponible");
    expect(html).toContain("RDM");
    expect(html).toContain('href="/proyectos/altos-de-ventisca/lotes/A-1"');
    expect(html).toContain('aria-pressed="true"');
  });

  it("sin lote elegido invita a elegir uno; un lote no publicado no tiene precio ni ficha", () => {
    expect(conRouter(<PanelLote proyectoCodigo="p" lote={null} cerrar={() => {}} />)).toContain("Elige un lote en el plano");
    const html = conRouter(<PanelLote proyectoCodigo="p" lote={LOTES[5]} cerrar={() => {}} />);
    expect(html).toContain("A consultar");
    expect(html).toContain("no se ofrece en línea");
    expect(html).not.toContain("/lotes/B-2");
  });

  it("un lote con caso propio enlaza a la ficha de su caso", () => {
    const html = conRouter(<PanelLote proyectoCodigo="p" lote={lote("C", 1, { casoCodigo: "11081204" })} cerrar={() => {}} />);
    expect(html).toContain('href="/inmuebles/11081204"');
  });

  it("sin lotes, lo dice", () => {
    expect(conRouter(<PlanoLotes proyectoCodigo="p" lotes={[]} />)).toContain("todavía no tiene un plano de lotes publicado");
  });
});

describe("página del proyecto (#/proyectos/{codigo})", () => {
  it("muestra plano, indicador A rotulado, hitos informativos y documentos", () => {
    respuesta.data = PROYECTO;
    const html = enRuta("/proyectos/altos-de-ventisca", "/proyectos/:codigo", <Proyecto />);
    expect(html).toContain("Altos de Ventisca");
    expect(html).toContain("Subtanjalla, Ica");
    expect(html).toContain("Plano de lotes");
    expect(html).toContain("Indicador A de la partida matriz del proyecto");
    // v1.0 (etapa 7): sin sesión, la partida matriz sale parcialmente oculta (antes, completa).
    expect(html).toContain("(N.° 1111••••)");
    expect(html).not.toContain("11112001");
    expect(html).toContain("Compra del terreno matriz");
    expect(html).toContain('data-hito="EN_PROCESO"');
    expect(html).toContain("El avance es informativo y no cambia el indicador A.");
    expect(html).toContain('href="/api/v1/publico/proyectos/altos-de-ventisca/documentos/PLANO_PERIMETRICO"');
    expect(html).not.toContain("/documentos/TASACION");
    expect(html).toContain('href="/inmuebles?proyecto=Altos+de+Ventisca"');
    expect(html).not.toMatch(/compra segura|saneado|garantizad/i);
  });

  it("con sesión, la partida matriz se ve completa y los documentos se piden con la sesión (etapa 7)", () => {
    respuesta.data = PROYECTO;
    try {
      sesion.usuario = { codigo: "asesor-01", rol: "ASESOR" };
      const html = enRuta("/proyectos/altos-de-ventisca", "/proyectos/:codigo", <Proyecto />);
      expect(html).toContain("(N.° 11112001)");
      expect(html).toContain('data-con-sesion="true"');
      expect(html).not.toContain('href="/api/v1/publico/proyectos/altos-de-ventisca/documentos/PLANO_PERIMETRICO"');
      expect(html).toContain("Ver documento (PDF)");
    } finally {
      sesion.usuario = null;
    }
  });

  it("sin enlace no hay sección de recorrido; con un video de YouTube se incrusta desde youtube-nocookie.com", () => {
    respuesta.data = PROYECTO;
    expect(enRuta("/proyectos/x", "/proyectos/:codigo", <Proyecto />)).not.toContain("Recorrido del proyecto");
    respuesta.data = { ...PROYECTO, recorridoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" };
    const html = enRuta("/proyectos/x", "/proyectos/:codigo", <Proyecto />);
    expect(html).toContain("Recorrido del proyecto");
    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0"');
    expect(html).not.toContain("https://www.youtube.com/embed");
    respuesta.data = { ...PROYECTO, recorridoUrl: "https://recorridos.example.com/v/1" };
    const otro = enRuta("/proyectos/x", "/proyectos/:codigo", <Proyecto />);
    expect(otro).not.toContain("<iframe");
    expect(otro).toContain('href="https://recorridos.example.com/v/1"');
  });

  it("sin partida matriz evaluada dice «sin evaluación documental»", () => {
    respuesta.data = { ...PROYECTO, indicadorA: { fuente: "SIN_EVALUACION", rotulo: "Sin evaluación documental", casoCodigo: null, evaluacion: null } };
    const html = enRuta("/proyectos/x", "/proyectos/:codigo", <Proyecto />);
    expect(html).toContain("Sin evaluación documental");
    expect(html).toContain('data-fuente-indicador="SIN_EVALUACION"');
  });
});

describe("ficha del lote", () => {
  it("muestra precio, precio por m², zonificación e indicador A de la partida matriz", () => {
    const l = LOTES[0];
    respuesta.data = {
      codigo: l.codigo, denominacion: "Mz. A Lote 1 · Altos de Ventisca · Subtanjalla, Ica", proyectoCodigo: "altos-de-ventisca",
      proyectoNombre: "Altos de Ventisca", lote: l, indicadorA: INDICADOR,
      predio: { tipoInmueble: "LOTE_URBANO", tipoInmuebleEtiqueta: "Lote o terreno", distrito: "Subtanjalla", areaM2: 166.25,
        areaConstruidaInscrita: null, precioReferencial: 41600, moneda: "PEN", precioNota: "Precio referencial e informativo.",
        precioPorM2: 250.23, proyecto: "Altos de Ventisca", estadoComercial: "DISPONIBLE", estadoComercialEtiqueta: "Disponible",
        independizacion: "EN_PARTIDA_MATRIZ", independizacionEtiqueta: "En partida matriz",
        independizacionExplicacion: "El lote todavía forma parte de la partida matriz.", zonificacion: "RDM", proyectoCodigo: "altos-de-ventisca" },
    } satisfies LotePublico;
    const html = enRuta("/proyectos/altos-de-ventisca/lotes/A-1", "/proyectos/:codigo/lotes/:lote", <FichaLote />);
    expect(html).toContain("Mz. A Lote 1 · Altos de Ventisca · Subtanjalla, Ica");
    expect(html).toMatch(/S\/\s?41,600/);
    expect(html).toMatch(/S\/\s?250\.23<!-- --> por m²|S\/\s?250\.23 por m²/);
    expect(html).toContain("Zonificación RDM");
    expect(html).toContain("Independización: En partida matriz.");
    expect(html).toContain("Indicador A de la partida matriz del proyecto");
    expect(html).toContain('href="/proyectos/altos-de-ventisca"');
  });
});

describe("tarjeta de un lote de proyecto en el catálogo", () => {
  const item: InmueblePublico = {
    codigo: "altos-de-ventisca-B-3", denominacion: "Mz. B Lote 3 · Altos de Ventisca · Subtanjalla, Ica",
    contexto: "Subtanjalla, Ica", estado: "AMARILLO", etiqueta: "Requiere revisión", origen: "PROYECTO", fuente: null,
    fechaConsulta: null, estadoTecnico: "NO_SOLICITADA", resultadoTecnico: null, riesgoFisicoDetectado: false,
    predio: { tipoInmueble: "LOTE_URBANO", tipoInmuebleEtiqueta: "Lote o terreno", distrito: "Subtanjalla", areaM2: 140,
      areaConstruidaInscrita: null, precioReferencial: 35000, moneda: "PEN", precioNota: null, precioPorM2: 250,
      proyecto: "Altos de Ventisca", estadoComercial: "DISPONIBLE", estadoComercialEtiqueta: "Disponible" },
    tiposAlerta: ["RV-02"], titularidadComercial: "INMOBILIARIA", clase: "LOTE_PROYECTO",
    proyectoCodigo: "altos-de-ventisca", lote: "B-3", fuenteIndicadorA: "PARTIDA_MATRIZ",
    rotuloIndicadorA: "Indicador A de la partida matriz del proyecto",
  };

  it("enlaza a la ficha del lote, lo nombra por manzana y lote, y rotula el indicador A", () => {
    const html = conRouter(<TarjetaPredio c={item} publico />);
    expect(html).toContain('href="/proyectos/altos-de-ventisca/lotes/B-3"');
    expect(html).toContain("Mz. B · Lote 3");
    expect(html).toContain("Indicador A de la partida matriz del proyecto");
    expect(html).not.toContain("Técnico:"); // la inspección técnica no aplica a un lote sin construir
    expect(html).toContain("Venta directa");
  });

  // v1.0 (etapa 7): sin sesión la tarjeta muestra la partida parcialmente oculta, como la ficha pública; con sesión,
  // completa. El enlace sigue usando el código en los dos casos.
  it("un caso sigue enlazando a su ficha y mostrando su número de partida (oculto sin sesión, completo con sesión)", () => {
    const caso: InmueblePublico = { ...item, codigo: "11048217", clase: "CASO", lote: null, origen: "SINTETICO",
      fuenteIndicadorA: "PROPIO", rotuloIndicadorA: "Indicador A del inmueble" };
    try {
      sesion.usuario = null;
      const sinSesion = conRouter(<TarjetaPredio c={caso} publico />);
      expect(sinSesion).toContain('href="/inmuebles/11048217"');
      expect(sinSesion).toContain("N.° 1104••••");
      expect(sinSesion).not.toContain("N.° 11048217");
      expect(sinSesion).toContain("Técnico:");

      sesion.usuario = { codigo: "comprador-01", rol: "COMPRADOR" };
      const conSesion = conRouter(<TarjetaPredio c={caso} publico />);
      expect(conSesion).toContain('href="/inmuebles/11048217"');
      expect(conSesion).toContain("N.° 11048217");
      expect(conSesion).toContain("Técnico:");
    } finally {
      sesion.usuario = null;
    }
  });
});

describe("barra de navegación a 390 px", () => {
  it("sin sesión, «Ingresar» conserva su nombre accesible aunque se vea solo el ícono en pantallas angostas", () => {
    const html = conRouter(<Navbar />);
    expect(html).toContain('aria-label="Ingresar"');
    expect(html).toContain('max-[399px]:sr-only">Ingresar</span>');
    // El nombre puede achicarse (truncate) antes que encimarse con «Inmuebles», y los dos lados tienen separación.
    expect(html.match(/<a[^>]*data-marca="true"[^>]*>/)?.[0]).toContain("min-w-0");
    // v1.0 (etapa 8): el nombre que se trunca es el de la inmobiliaria (LEDCONS).
    expect(html).toMatch(/class="truncate[^"]*">LEDCONS</);
    expect(html).toContain("justify-between gap-2");
    expect(html).toContain(">Inmuebles<");
  });
});
