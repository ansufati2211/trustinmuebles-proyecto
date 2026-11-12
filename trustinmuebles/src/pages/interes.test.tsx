import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { PanelLote } from "@/components/PlanoLotes";
import FichaLote from "@/pages/FichaLote";
import Interesados from "@/pages/Interesados";
import type { Interesado } from "@/lib/interes";
import type { LoteProyecto, LotePublico } from "@/lib/types";

/*
 * v1.0 (etapa 4): «Solicitar cita» en el plano y en la ficha de un lote sin caso propio, y la bandeja de interesados con
 * los vencidos resaltados. Se dibujan en el servidor (sin navegador) con datos fijos por ruta.
 */

const porRuta: Record<string, unknown> = {};
vi.mock("@/lib/useApi", () => ({
  useApi: (ruta: string | null) => ({
    data: ruta === null ? null : ruta.startsWith("/interesados?") || ruta === "/interesados" ? porRuta["/interesados"] : porRuta[ruta] ?? null,
    loading: false, error: null, reload: () => {}, setData: () => {},
  }),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ usuario: null, logout: () => {} }) }));

const conRouter = (el: ReactElement) => renderToStaticMarkup(<MemoryRouter>{el}</MemoryRouter>);

const lote = (extra: Partial<LoteProyecto> = {}): LoteProyecto => ({
  codigo: "altos-de-ventisca-A-7", clave: "A-7", manzana: "A", numero: 7, areaM2: 140, precio: 35000, moneda: "PEN",
  precioPorM2: 250, estadoComercial: "DISPONIBLE", estadoComercialEtiqueta: "Disponible", independizacion: "EN_PARTIDA_MATRIZ",
  independizacionEtiqueta: "En partida matriz", zonificacion: null, publicado: true, casoCodigo: null, ...extra,
});

describe("solicitar cita desde el plano y la ficha del lote", () => {
  it("el panel de un lote publicado sin caso propio ofrece «Solicitar cita»", () => {
    expect(conRouter(<PanelLote proyectoCodigo="altos-de-ventisca" lote={lote()} cerrar={() => {}} />)).toContain("Solicitar cita");
  });

  it("un lote con caso propio la pide desde su caso; uno no publicado no la ofrece", () => {
    expect(conRouter(<PanelLote proyectoCodigo="p" lote={lote({ casoCodigo: "11081204" })} cerrar={() => {}} />)).not.toContain("Solicitar cita");
    expect(conRouter(<PanelLote proyectoCodigo="p" lote={lote({ publicado: false, precio: null })} cerrar={() => {}} />)).not.toContain("Solicitar cita");
  });

  it("la ficha de un lote sin caso propio tiene el botón y sigue llevando al proyecto", () => {
    const l = lote();
    porRuta["/publico/proyectos/altos-de-ventisca/lotes/A-7"] = {
      codigo: l.codigo, denominacion: "Mz. A Lote 7 · Altos de Ventisca · Subtanjalla, Ica", proyectoCodigo: "altos-de-ventisca",
      proyectoNombre: "Altos de Ventisca", lote: l,
      indicadorA: { fuente: "SIN_EVALUACION", rotulo: "Sin evaluación documental", casoCodigo: null, evaluacion: null },
      predio: { tipoInmueble: "LOTE_URBANO", tipoInmuebleEtiqueta: "Lote o terreno", distrito: "Subtanjalla", areaM2: 140,
        areaConstruidaInscrita: null, precioReferencial: 35000, moneda: "PEN", precioNota: null, precioPorM2: 250,
        proyecto: "Altos de Ventisca", estadoComercial: "DISPONIBLE", estadoComercialEtiqueta: "Disponible",
        independizacion: "EN_PARTIDA_MATRIZ", independizacionEtiqueta: "En partida matriz",
        independizacionExplicacion: "El lote todavía forma parte de la partida matriz.", zonificacion: null, proyectoCodigo: "altos-de-ventisca" },
    } as unknown as LotePublico;
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/proyectos/altos-de-ventisca/lotes/A-7"]}>
        <Routes><Route path="/proyectos/:codigo/lotes/:lote" element={<FichaLote />} /></Routes>
      </MemoryRouter>,
    );
    expect(html).toContain("Solicitar cita");
    expect(html).toContain('href="/proyectos/altos-de-ventisca"');
    // Sin WhatsApp configurado no aparece el botón.
    expect(html).not.toContain("wa.me");
  });
});

describe("bandeja de interesados", () => {
  const base: Interesado = {
    id: 1, creadoEn: "2026-11-10T10:00:00Z", origen: "LOTE", referencia: "altos-de-ventisca-A-7",
    inmueble: "Mz. A Lote 7 · Altos de Ventisca", casoCodigo: null, proyectoCodigo: "altos-de-ventisca", loteClave: "A-7",
    zona: "Subtanjalla", tipo: "LOTE", presupuestoMin: null, presupuestoMax: 45000, moneda: "PEN", areaDeseada: 140,
    formaPago: "CONTADO", formaPagoEtiqueta: "Al contado", nombre: "Pedro", medio: "CORREO", contacto: "pedro@example.com",
    etapa: "VISITA_REALIZADA", etapaEtiqueta: "Visita realizada", responsable: "asesor-01",
    proximaAccion: "Llamar para conocer su decisión", proximaAccionFecha: "2026-11-09", vencido: true,
    citaPorConfirmar: false, notas: 2,
  };

  it("resalta los vencidos, muestra etapa y presupuesto y conserva las solicitudes de compradores con cuenta", () => {
    porRuta["/interesados"] = [base, { ...base, id: 2, nombre: "Ana", vencido: false, etapa: "CITA_AGENDADA",
      etapaEtiqueta: "Cita agendada", proximaAccion: "Visita al lote", proximaAccionFecha: "2026-11-20", citaPorConfirmar: true }];
    porRuta["/interesados/opciones"] = { proyectos: [{ codigo: "altos-de-ventisca", nombre: "Altos de Ventisca", distrito: "Subtanjalla" }], responsables: ["asesor-01", "gestor-01"] };
    porRuta["/contactos?estado=PENDIENTE"] = [];
    const html = conRouter(<Interesados />);
    expect(html).toContain("Agenda de citas");
    expect(html).toContain("Demanda");
    expect(html.match(/data-vencido="true"/g)).toHaveLength(1);
    expect(html).toMatch(/Vencida: (<!-- -->)?Llamar para conocer su decisión/);
    expect(html).toContain("Visita realizada");
    expect(html).toContain("hasta S/ 45,000");
    expect(html).toContain("Tiene una cita por confirmar");
    expect(html).toContain("Altos de Ventisca</option>");
    expect(html).toContain("Solicitudes de compradores con cuenta");
  });
});
