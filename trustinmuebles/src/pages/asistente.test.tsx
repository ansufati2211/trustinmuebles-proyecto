import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { AsistenteBusqueda } from "@/components/AsistenteBusqueda";
import { UsosDelLote } from "@/components/UsosDelLote";
import FichaLote from "@/pages/FichaLote";
import { filtrosDe, interpretar } from "@/lib/asistente";
import { FILTROS_PUBLICO_VACIOS } from "@/lib/filtrosPublico";
import type { InmueblePublico, LoteProyecto, LotePublico, OpcionesFiltro } from "@/lib/types";

/*
 * v1.0 (etapa 5): el asistente de búsqueda en el catálogo y los usos del lote en la ficha. Se dibujan en el servidor
 * (sin navegador) con datos fijos.
 */

const porRuta: Record<string, unknown> = {};
vi.mock("@/lib/useApi", () => ({
  useApi: (ruta: string | null) => ({ data: ruta === null ? null : porRuta[ruta] ?? null, loading: false, error: null, reload: () => {}, setData: () => {} }),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ usuario: null, logout: () => {} }) }));

const conRouter = (el: ReactElement) => renderToStaticMarkup(<MemoryRouter>{el}</MemoryRouter>);
const OPCIONES: OpcionesFiltro = { proyectos: ["Altos de Ventisca", "Terrazas de Sauzal"], distritos: ["Salas", "Subtanjalla"], tiposAlerta: [] };

const inmueble = (codigo: string, extra: Partial<InmueblePublico["predio"]>, estado: InmueblePublico["estado"] = "VERDE"): InmueblePublico => ({
  codigo, denominacion: `Mz. A Lote ${codigo} · Terrazas de Sauzal`, contexto: "", estado, etiqueta: null, origen: "PROYECTO",
  fuente: null, fechaConsulta: null, estadoTecnico: "NO_SOLICITADA", resultadoTecnico: null, riesgoFisicoDetectado: false,
  clase: "LOTE_PROYECTO", proyectoCodigo: "terrazas-de-sauzal", lote: `A-${codigo}`, fuenteIndicadorA: "PARTIDA_MATRIZ",
  predio: {
    tipoInmueble: "LOTE_URBANO", tipoInmuebleEtiqueta: "Lote o terreno", distrito: "Salas", areaM2: 120,
    areaConstruidaInscrita: null, precioReferencial: 30000, moneda: "PEN", precioNota: null, precioPorM2: 250,
    proyecto: "Terrazas de Sauzal", proyectoCodigo: "terrazas-de-sauzal", estadoComercial: "DISPONIBLE", zonificacion: "RDM", ...extra,
  },
});

describe("asistente de búsqueda en el catálogo", () => {
  const props = {
    opciones: OPCIONES, uso: null, cargando: false, alBuscar: () => {}, alQuitar: () => {}, alCerrar: () => {},
  };

  it("antes de buscar muestra solo el campo para escribir, con un ejemplo", () => {
    const html = conRouter(<AsistenteBusqueda {...props} filtros={FILTROS_PUBLICO_VACIOS} activo={false} resultados={null} />);
    expect(html).toContain("Asistente de búsqueda");
    expect(html).toContain("para casa");
    expect(html).not.toContain("Te recomendamos");
  });

  it("muestra lo entendido como etiquetas que se pueden quitar, 3 recomendaciones con motivo y la cita", () => {
    const i = interpretar("lote en Salas hasta 60 mil para casa, lo más barato", OPCIONES);
    const items = ["1", "2", "3", "4"].map((n, k) => inmueble(n, { precioReferencial: 30000 + k * 1000, precioPorM2: 250 + k * 5 }));
    const html = conRouter(<AsistenteBusqueda {...props} uso={i.uso} filtros={filtrosDe(i)} activo resultados={items} />);
    for (const t of ["Lotes o terrenos", "En Salas", "Hasta S/", "Más barato primero", "Para casa"]) expect(html).toContain(t);
    expect(html.match(/aria-label="Quitar «/g)).toHaveLength(5);
    expect(html.match(/Opción \d/g)).toEqual(["Opción 1", "Opción 2", "Opción 3"]);
    expect(html).toContain("Tiene el menor precio entre los resultados");
    expect(html).toContain("suele permitir");
    expect(html).toContain('href="/proyectos/terrazas-de-sauzal/lotes/A-1"');
    expect(html).toContain("Solicitar cita");
    expect(html).not.toMatch(/compra segura|garantiz|saneamiento/i);
  });

  it("sin resultados lo dice y sugiere quitar etiquetas, y sigue ofreciendo la cita", () => {
    const html = conRouter(<AsistenteBusqueda {...props} filtros={{ ...FILTROS_PUBLICO_VACIOS, tipo: "LOTE" }} activo resultados={[]} />);
    expect(html).toContain("Quita alguna etiqueta");
    expect(html).toContain("Solicitar cita");
  });
});

describe("usos del lote en las fichas", () => {
  const lote = (zonificacion: string | null): LoteProyecto => ({
    codigo: "terrazas-de-sauzal-A-1", clave: "A-1", manzana: "A", numero: 1, areaM2: 100, precio: 30000, moneda: "PEN",
    precioPorM2: 300, estadoComercial: "DISPONIBLE", estadoComercialEtiqueta: "Disponible", independizacion: "EN_PARTIDA_MATRIZ",
    independizacionEtiqueta: "En partida matriz", zonificacion, publicado: true, casoCodigo: null,
  });
  const ficha = (zonificacion: string | null) => {
    const l = lote(zonificacion);
    porRuta["/publico/proyectos/terrazas-de-sauzal/lotes/A-1"] = {
      codigo: l.codigo, denominacion: "Mz. A Lote 1 · Terrazas de Sauzal", proyectoCodigo: "terrazas-de-sauzal",
      proyectoNombre: "Terrazas de Sauzal", lote: l,
      indicadorA: { fuente: "SIN_EVALUACION", rotulo: "Sin evaluación documental", casoCodigo: null, evaluacion: null },
      predio: { tipoInmueble: "LOTE_URBANO", tipoInmuebleEtiqueta: "Lote o terreno", distrito: "Salas", areaM2: 100,
        areaConstruidaInscrita: null, precioReferencial: 30000, moneda: "PEN", precioNota: null, precioPorM2: 300,
        zonificacion, proyectoCodigo: "terrazas-de-sauzal" },
    } as unknown as LotePublico;
    return renderToStaticMarkup(
      <MemoryRouter initialEntries={["/proyectos/terrazas-de-sauzal/lotes/A-1"]}>
        <Routes><Route path="/proyectos/:codigo/lotes/:lote" element={<FichaLote />} /></Routes>
      </MemoryRouter>,
    );
  };

  it("con zonificación RDM muestra los usos que suelen permitirse y el aviso de verificar", () => {
    const html = ficha("RDM");
    expect(html).toContain("Usos que suelen permitirse");
    expect(html).toContain("Residencial de densidad media");
    expect(html).toContain("Casa unifamiliar");
    // 100 m²: los departamentos para alquilar suelen pedir 120 m².
    expect(html).toContain("Suelen pedir un lote más grande");
    expect(html).toContain("Verifica el certificado de parámetros urbanísticos de la municipalidad antes de comprar.");
  });

  it("sin zonificación, «consulta los parámetros», también con el aviso", () => {
    const html = ficha(null);
    expect(html).toContain("consulta los parámetros");
    expect(html).not.toContain("Casa unifamiliar");
    expect(html).toContain("Verifica el certificado de parámetros urbanísticos");
  });

  it("el bloque de una vivienda sin zonificación (ficha pública de un caso)", () => {
    const html = renderToStaticMarkup(<UsosDelLote zonificacion={undefined} areaM2={160} />);
    expect(html).toContain("consulta los parámetros");
    expect(html).toContain("antes de comprar");
  });
});
