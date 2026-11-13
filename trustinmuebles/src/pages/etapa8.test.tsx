import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import Landing from "@/pages/Landing";
import { FormularioRegistroPanel } from "@/pages/Interesados";
import {
  CANALES_PANEL, cuerpoRegistroPanel, formularioPanelVacio, validarFormularioPanel, type FormularioPanel,
} from "@/lib/interes";
import type { Usuario } from "@/lib/types";

/*
 * v1.0 (etapa 8): marca de la inmobiliaria en la barra y el pie, cifras reales de la portada y registro de interesados
 * desde el panel. Se dibujan en el servidor (sin navegador).
 */

const sesion: { usuario: Usuario | null } = { usuario: null };
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ usuario: sesion.usuario, logout: () => {} }) }));
const porRuta: Record<string, unknown> = {};
vi.mock("@/lib/useApi", () => ({
  useApi: (ruta: string | null) => ({ data: ruta === null ? null : porRuta[ruta] ?? null, loading: false, error: null, reload: () => {}, setData: () => {} }),
}));

const conRouter = (el: ReactElement) => renderToStaticMarkup(<MemoryRouter>{el}</MemoryRouter>);

beforeEach(() => {
  sesion.usuario = null;
  for (const k of Object.keys(porRuta)) delete porRuta[k];
});

describe("marca de la inmobiliaria", () => {
  it("la barra muestra el logo y el nombre LEDCONS con su eslogan", () => {
    const html = conRouter(<Navbar />);
    expect(html).toContain('src="/img/marca/ledcons-logo.png"');
    expect(html).toContain(">LEDCONS<");
    expect(html).toContain("Inmobiliaria y Constructora");
    expect(html).toContain('aria-label="LEDCONS, ir al inicio"');
    expect(html).not.toContain(">Trustinmuebles<");
  });

  it("el pie muestra razón social y RUC, dirección, teléfonos, WhatsApp, Facebook y «con tecnología Trustinmuebles»", () => {
    const html = conRouter(<Footer />);
    expect(html).toContain("LEDCONS E.I.R.L. · RUC 20600817133");
    expect(html).toContain("Av. San Martín 577, 2.º piso, oficina 32, Ica");
    expect(html).toContain('href="tel:+51991108224"');
    expect(html).toContain('href="tel:+51904958416"');
    expect(html).toContain(">991 108 224<");
    expect(html).toContain(">904 958 416<");
    expect(html).toContain('href="https://wa.me/51991108224"');
    expect(html).toContain("WhatsApp +51 991 108 224");
    expect(html).toContain('href="https://www.facebook.com/Constructora.Inmobiliaria.Ledcons.sac/"');
    expect(html).toContain("con tecnología Trustinmuebles");
    expect(html).toContain('src="/img/marca/ledcons-logo.png"');
  });

  it("los botones principales usan el verde del logo y el indicador A conserva sus colores", () => {
    const css = readFileSync("src/index.css", "utf8");
    expect(css).toMatch(/--marca-verde:\s*#1B4D2E/);
    expect(css).toMatch(/--marca-dorado:\s*#A8812F/);
    // Sin cambios: el primario (estado comercial «Disponible») y los colores del semáforo de A.
    expect(css).toMatch(/--primary:\s*#059669/);
    expect(css).toMatch(/--sem-verde:\s*#22A05A/);
    expect(css).toMatch(/--sem-amarillo:\s*#E0A21B/);
    expect(css).toMatch(/--sem-rojo:\s*#D33A2C/);
    const html = conRouter(<FormularioRegistroPanel opciones={null} alCancelar={() => {}} alRegistrar={() => {}} />);
    expect(html).toContain("bg-marca-verde");
  });
});

describe("portada con cifras reales", () => {
  it("sin respuesta del servidor no muestra números fijos (ni «12 expedientes»)", () => {
    const html = conRouter(<Landing />);
    expect(html).not.toContain("12 expedientes");
    expect(html).not.toContain("12 lotes y viviendas");
    expect(html).not.toContain("planos por vivienda");
    expect(html).toMatch(/data-cifra="inmueblesPublicados"[^>]*><dt[^>]*>—</);
  });

  it("con /publico/sitio muestra inmuebles publicados, proyectos y lotes disponibles", () => {
    porRuta["/publico/sitio"] = { indexable: false, version: "1.0.0", cifras: { inmueblesPublicados: 98, proyectos: 3, lotesDisponibles: 60 } };
    const html = conRouter(<Landing />);
    expect(html).toMatch(/data-cifra="inmueblesPublicados"[^>]*><dt[^>]*>98</);
    expect(html).toMatch(/data-cifra="proyectos"[^>]*><dt[^>]*>3</);
    expect(html).toMatch(/data-cifra="lotesDisponibles"[^>]*><dt[^>]*>60</);
    expect(html).toContain("98 lotes y viviendas en venta");
    expect(html).toContain("Abrir los expedientes");
  });
});

describe("registro de interesados desde el panel", () => {
  const lleno = (p: Partial<FormularioPanel> = {}): FormularioPanel => ({
    ...formularioPanelVacio(), canal: "LLAMADA", nombre: "Teresa", medio: "CELULAR", contacto: "912 345 678",
    consentimientoVerbal: true, ...p,
  });

  it("el formulario pide canal, nombre de pila, un medio de contacto y la constancia del consentimiento verbal", () => {
    const html = conRouter(<FormularioRegistroPanel opciones={{ proyectos: [{ codigo: "altos-de-ventisca", nombre: "Altos de Ventisca", distrito: "Subtanjalla" }], responsables: [] }}
      alCancelar={() => {}} alRegistrar={() => {}} />);
    expect(html).toContain(">Registrar</button>");
    for (const c of CANALES_PANEL) expect(html).toContain(`>${c.etiqueta}</option>`);
    expect(html).not.toContain('value="WEB"');
    expect(html).toContain("Nombre de pila");
    expect(html).toContain("aceptó de palabra");
    expect(html).toContain(">Altos de Ventisca</option>");
    expect(html).not.toMatch(/DNI<\/label>|name="dni"/);
  });

  it("valida como el servidor: canal, nombre, contacto, montos, lote sin proyecto, DNI en la nota y consentimiento", () => {
    expect(validarFormularioPanel(lleno())).toEqual({});
    const e = validarFormularioPanel({ ...formularioPanelVacio() });
    expect(Object.keys(e).sort()).toEqual(["canal", "consentimientoVerbal", "contacto", "nombre"]);
    expect(validarFormularioPanel(lleno({ nombre: "Ana 123" })).nombre).toBeDefined();
    expect(validarFormularioPanel(lleno({ contacto: "812345678" })).contacto).toBeDefined();
    expect(validarFormularioPanel(lleno({ medio: "CORREO", contacto: "no-es-correo" })).contacto).toBeDefined();
    expect(validarFormularioPanel(lleno({ presupuestoMin: "90000", presupuestoMax: "50000" })).presupuestoMin).toBeDefined();
    expect(validarFormularioPanel(lleno({ areaDeseada: "-3" })).areaDeseada).toBeDefined();
    expect(validarFormularioPanel(lleno({ lote: "A-7" })).lote).toBeDefined();
    expect(validarFormularioPanel(lleno({ mensaje: "DNI 12345678" })).mensaje).toBeDefined();
    expect(validarFormularioPanel(lleno({ consentimientoVerbal: false })).consentimientoVerbal).toBeDefined();
  });

  it("arma el cuerpo de POST /interesados sin DNI ni casilla del formulario público", () => {
    const c = cuerpoRegistroPanel(lleno({ canal: "WHATSAPP", proyectoCodigo: "altos-de-ventisca", lote: " a-7 ", presupuestoMax: "90,000", mensaje: " Prefiere esquina " }));
    expect(c).toEqual({
      canal: "WHATSAPP", consentimientoVerbal: true, nombre: "Teresa", medio: "CELULAR", contacto: "912345678",
      formaPago: "POR_DEFINIR", proyectoCodigo: "altos-de-ventisca", lote: "A-7", presupuestoMax: 90000, moneda: "PEN",
      mensaje: "Prefiere esquina",
    });
    expect(c).not.toHaveProperty("consentimiento");
    expect(c).not.toHaveProperty("sitioWeb");
    expect(cuerpoRegistroPanel(lleno({ medio: "CORREO", contacto: " Teresa@Example.com " })).contacto).toBe("teresa@example.com");
  });
});
