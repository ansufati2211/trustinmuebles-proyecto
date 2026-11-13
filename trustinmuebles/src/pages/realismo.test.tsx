import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { accionTeclaMenu, BotonMenuMovil, ID_MENU_MOVIL, MenuMovil, moverFoco } from "@/components/layout/MenuMovil";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import FichaPublica from "@/pages/FichaPublica";
import Creditos from "@/pages/Creditos";
import { opcionesMenuMovil } from "@/lib/permisos";
import type { Rol, Usuario } from "@/lib/types";

/*
 * v1.0 (etapa 6): pantallas de la etapa. Se dibujan en el servidor (sin navegador): el menú ☰ y su accesibilidad, la
 * ficha pública con la partida oculta y los PDF, la página de créditos y su enlace en el pie.
 */

const sesion: { usuario: Usuario | null } = { usuario: null };
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ usuario: sesion.usuario, logout: () => {} }) }));
const porRuta: Record<string, unknown> = {};
vi.mock("@/lib/useApi", () => ({
  useApi: (ruta: string | null) => ({ data: ruta === null ? null : porRuta[ruta] ?? null, loading: false, error: null, reload: () => {} }),
}));

const conRouter = (el: ReactElement, ruta = "/") => renderToStaticMarkup(<MemoryRouter initialEntries={[ruta]}>{el}</MemoryRouter>);
const usuario = (rol: Rol): Usuario => ({ codigoCuenta: `${rol.toLowerCase()}-01`, rol } as Usuario);

beforeEach(() => { sesion.usuario = null; });

describe("menú ☰ en pantallas de menos de 1024 px", () => {
  it("el botón solo se ve por debajo de 1024 px y dice si está abierto y qué controla", () => {
    const cerrado = conRouter(<BotonMenuMovil abierto={false} alCambiar={() => {}} />);
    expect(cerrado).toContain('aria-expanded="false"');
    expect(cerrado).toContain(`aria-controls="${ID_MENU_MOVIL}"`);
    expect(cerrado).toContain('aria-label="Abrir el menú"');
    expect(cerrado).toContain("lg:hidden");
    expect(cerrado).toContain('type="button"');
    const abierto = conRouter(<BotonMenuMovil abierto alCambiar={() => {}} />);
    expect(abierto).toContain('aria-expanded="true"');
    expect(abierto).toContain('aria-label="Cerrar el menú"');
  });

  it("abierto, muestra todas las opciones del rol como enlaces de una navegación con nombre, y marca la actual", () => {
    for (const rol of ["ASESOR", "GESTOR", "REVISOR", "PROPIETARIO", "COMPRADOR"] as Rol[]) {
      const opciones = opcionesMenuMovil(rol);
      const html = conRouter(<MenuMovil abierto enlaces={opciones} claveActiva="casos" alCerrar={() => {}} />);
      expect(html).toContain(`<nav id="${ID_MENU_MOVIL}" aria-label="Menú"`);
      for (const o of opciones) expect(html, `${rol}: ${o.etiqueta}`).toContain(`>${o.etiqueta}</a>`);
      expect(html.match(/<a /g)).toHaveLength(opciones.length);
      if (opciones.some((o) => o.clave === "casos")) expect(html).toMatch(/aria-current="page"[^>]*>Expedientes</);
    }
    expect(conRouter(<MenuMovil abierto={false} enlaces={opcionesMenuMovil("ASESOR")} claveActiva={null} alCerrar={() => {}} />)).toBe("");
  });

  it("con teclado: Escape cierra, las flechas recorren con vuelta, Inicio y Fin van a los extremos", () => {
    expect(accionTeclaMenu("Escape")).toBe("cerrar");
    expect(accionTeclaMenu("Tab")).toBeNull();
    expect(moverFoco(-1, 6, accionTeclaMenu("ArrowDown"))).toBe(0);
    expect(moverFoco(5, 6, accionTeclaMenu("ArrowDown"))).toBe(0);
    expect(moverFoco(0, 6, accionTeclaMenu("ArrowUp"))).toBe(5);
    expect(moverFoco(3, 6, accionTeclaMenu("Home"))).toBe(0);
    expect(moverFoco(3, 6, accionTeclaMenu("End"))).toBe(5);
    expect(moverFoco(0, 0, "siguiente")).toBe(-1);
  });

  it("la barra trae el botón ☰ para todos los roles y el menú de escritorio solo desde 1024 px", () => {
    for (const u of [null, usuario("ASESOR"), usuario("COMPRADOR")]) {
      sesion.usuario = u;
      const html = conRouter(<Navbar />);
      expect(html).toContain("data-boton-menu");
      expect(html).toContain(`aria-controls="${ID_MENU_MOVIL}"`);
      expect(html).toMatch(/<nav aria-label="Principal" class="relative hidden lg:flex/);
    }
  });
});

const DETALLE = {
  codigo: "11052690", denominacion: "Mz. K Lote 12 · Hab. Urb. Rincón del Sauce · La Tinguiña, Ica", contexto: "La Tinguiña, Ica",
  evaluacion: null,
  evaluacionTecnica: { estado: "EMITIDO", resultado: "CON_OBSERVACIONES", conclusiones: null, limite: "Referencial." },
  expediente: {
    planos: [{ especialidad: "ARQUITECTURA", especialidadEtiqueta: "Arquitectura", estado: "PRESENTADO" },
      { especialidad: "ELECTRICAS", especialidadEtiqueta: "Eléctricas", estado: "NO_PRESENTADO" }],
    documentosLote: [],
  },
  predio: { tipoInmueble: "VIVIENDA_URBANA", tipoInmuebleEtiqueta: "Vivienda", distrito: "La Tinguiña", areaM2: 200,
    areaConstruidaInscrita: 96, precioReferencial: 210000, moneda: "PEN", precioNota: null, precioPorM2: 1050 },
  publicacion: null,
};

describe("ficha pública", () => {
  const ficha = () => {
    porRuta["/publico/inmuebles/11052690"] = DETALLE;
    return conRouter(<Routes><Route path="/inmuebles/:codigo" element={<FichaPublica />} /></Routes>, "/inmuebles/11052690");
  };

  it("sin sesión, la partida va parcialmente oculta y los PDF se abren sin ingresar (no el informe técnico)", () => {
    const html = ficha();
    expect(html).toContain("Partida N.° 1105••••");
    expect(html).not.toContain("Partida N.° 11052690");
    expect(html).toContain('href="/api/v1/publico/inmuebles/11052690/documento"');
    expect(html).toContain('href="/api/v1/publico/inmuebles/11052690/planos/ARQUITECTURA/documento"');
    expect(html).not.toContain("planos/ELECTRICAS/documento");
    expect(html).not.toContain("inspeccion/documento");
    expect(html).toContain("Ficha registral del inmueble");
    expect(html).toContain("no reemplazan la copia literal que emite SUNARP");
  });

  it("con sesión del personal, la partida se ve completa", () => {
    sesion.usuario = usuario("ASESOR");
    expect(ficha()).toContain("Partida N.° 11052690");
  });
});

describe("créditos de imágenes", () => {
  it("lista cada foto con su obra y su licencia, sin fotos «Referencial académico»", () => {
    const html = conRouter(<Creditos />);
    expect(html).toContain("Créditos de imágenes");
    expect(html).toContain("CC0 1.0");
    expect(html).toContain("Licencia de Unsplash");
    expect(html).toContain('href="https://commons.wikimedia.org/wiki/File:Valle_del_supe.jpg"');
    expect(html).not.toContain("Referencial académico");
  });

  it("el pie enlaza a los créditos y mantiene el aviso legal", () => {
    const html = conRouter(<Footer />);
    expect(html).toContain('href="/creditos"');
    expect(html).toContain("Créditos de imágenes");
    expect(html).toContain('aria-label="Límites legales"');
  });
});
