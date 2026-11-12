import { describe, expect, it } from "vitest";
import {
  PASOS_COMO_FUNCIONA, paginaDeLaUrl, paginaParaLaUrl, paginasVisibles, rutaFichaPublica, rutaPaginaPublica, textoRango,
} from "./publico";
import {
  actuaComoGestor, actuaComoRevisor, claveDeRuta, navegacion, puedeAbrirVista, puedeAsignarEspecialista,
  puedeAutorizar, puedeEditarExpediente, puedePublicar, puedeRetirarAutorizacion, puedeVerHistorial,
} from "./permisos";
import { puedeVerGestion } from "./gestion";
import type { Publicacion, Rol, Usuario } from "./types";

describe("portal público (v1.0)", () => {
  it("la página de la URL empieza en 1 y la de la API en 0", () => {
    expect(paginaDeLaUrl(null)).toBe(0);
    expect(paginaDeLaUrl("1")).toBe(0);
    expect(paginaDeLaUrl("3")).toBe(2);
    expect(paginaDeLaUrl("0")).toBe(0);
    expect(paginaDeLaUrl("-2")).toBe(0);
    expect(paginaDeLaUrl("abc")).toBe(0);
    expect(paginaParaLaUrl(0)).toBeNull();
    expect(paginaParaLaUrl(2)).toBe("3");
  });

  it("arma las rutas públicas de la API", () => {
    expect(rutaPaginaPublica(0)).toBe("/publico/inmuebles?pagina=0");
    expect(rutaPaginaPublica(-1)).toBe("/publico/inmuebles?pagina=0");
    expect(rutaFichaPublica("11081204")).toBe("/publico/inmuebles/11081204");
  });

  it("describe el rango mostrado", () => {
    expect(textoRango({ pagina: 0, tamano: 24, total: 30, items: new Array(24) })).toBe("Mostrando 1–24 de 30 inmuebles");
    expect(textoRango({ pagina: 1, tamano: 24, total: 30, items: new Array(6) })).toBe("Mostrando 25–30 de 30 inmuebles");
    expect(textoRango({ pagina: 0, tamano: 24, total: 1, items: new Array(1) })).toBe("Mostrando 1–1 de 1 inmueble");
    expect(textoRango({ pagina: 0, tamano: 24, total: 0, items: [] })).toBe("Todavía no hay inmuebles publicados.");
    expect(textoRango({ pagina: 4, tamano: 24, total: 30, items: [] })).toContain("30 en total");
  });

  it("el paginador muestra la primera, la última y las vecinas", () => {
    expect(paginasVisibles(0, 1)).toEqual([]);
    expect(paginasVisibles(0, 3)).toEqual([0, 1, 2]);
    expect(paginasVisibles(5, 20)).toEqual([0, null, 4, 5, 6, null, 19]);
    expect(paginasVisibles(19, 20)).toEqual([0, null, 18, 19]);
  });

  it("cómo funciona en 5 pasos, en orden", () => {
    expect(PASOS_COMO_FUNCIONA.map((p) => p.titulo)).toEqual([
      "Registrar", "Evaluar y completar", "Publicar", "Buscar", "Solicitar cita",
    ]);
    const textos = PASOS_COMO_FUNCIONA.map((p) => `${p.titulo} ${p.texto}`).join(" ").toLowerCase();
    for (const prohibido of ["prueba", "demostración", "compra segura", "saneamiento", "garantiza"]) {
      expect(textos).not.toContain(prohibido);
    }
  });
});

describe("rol asesor (v1.0)", () => {
  const pub = (p: Partial<Publicacion>): Publicacion =>
    ({ estado: "BORRADOR", propietarioCodigo: "propietario-01", autorizada: false, autorizacionFecha: null, ...p });
  const cuenta = (codigoCuenta: string, rol: Rol): Usuario => ({ id: 1, codigoCuenta, rol });
  const asesor = cuenta("asesor-01", "ASESOR");

  it("reúne los permisos del revisor y del gestor", () => {
    expect(actuaComoRevisor("ASESOR")).toBe(true);
    expect(actuaComoGestor("ASESOR")).toBe(true);
    expect(puedeEditarExpediente("ASESOR")).toBe(true);
    expect(puedePublicar("ASESOR", pub({ autorizada: true }))).toBe(true);
    expect(puedePublicar("ASESOR", pub({ autorizada: false }))).toBe(false);
    expect(puedeAsignarEspecialista("ASESOR", "SOLICITADA")).toBe(true);
    expect(puedeVerHistorial("ASESOR")).toBe(true);
    expect(puedeVerGestion("ASESOR")).toBe(true);
    expect(actuaComoRevisor("GESTOR")).toBe(false);
    expect(actuaComoGestor("REVISOR")).toBe(false);
  });

  it("no autoriza por un particular; en un inmueble de la inmobiliaria, sí (y el gestor también)", () => {
    expect(puedeAutorizar(asesor, pub({}))).toBe(false);
    expect(puedeAutorizar(asesor, pub({ titularidadComercial: "PARTICULAR" }))).toBe(false);
    const inmobiliaria = pub({ titularidadComercial: "INMOBILIARIA", propietarioCodigo: null });
    expect(puedeAutorizar(asesor, inmobiliaria)).toBe(true);
    expect(puedeAutorizar(cuenta("gestor-01", "GESTOR"), inmobiliaria)).toBe(true);
    expect(puedeAutorizar(cuenta("revisor-01", "REVISOR"), inmobiliaria)).toBe(false);
    expect(puedeAutorizar(cuenta("propietario-01", "PROPIETARIO"),
      pub({ titularidadComercial: "INMOBILIARIA" }))).toBe(false);
    expect(puedeRetirarAutorizacion(asesor, { ...inmobiliaria, autorizada: true })).toBe(true);
  });

  it("menú del asesor: Registrar, Proyectos, Cartera, Interesados", () => {
    const enlaces = navegacion("ASESOR");
    expect(enlaces.map((e) => e.etiqueta)).toEqual(["Registrar", "Proyectos", "Cartera", "Interesados"]);
    for (const e of enlaces) expect(puedeAbrirVista("ASESOR", e.clave)).toBe(true);
    expect(puedeAbrirVista("COMPRADOR", "interesados")).toBe(false);
    expect(puedeAbrirVista("GESTOR", "interesados")).toBe(true);
  });

  it("sin sesión: inicio y catálogo público; las vistas internas siguen cerradas", () => {
    expect(navegacion(undefined).map((e) => e.clave)).toEqual(["inicio", "inmuebles"]);
    expect(puedeAbrirVista(undefined, "inmuebles")).toBe(true);
    expect(puedeAbrirVista(undefined, "casos")).toBe(false);
    expect(puedeAbrirVista(undefined, "interesados")).toBe(false);
    expect(claveDeRuta("/inmuebles")).toBe("inmuebles");
    expect(claveDeRuta("/inmuebles/11081204")).toBe("inmuebles");
    expect(claveDeRuta("/interesados")).toBe("interesados");
  });
});
