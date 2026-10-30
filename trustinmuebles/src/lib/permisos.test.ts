import { describe, expect, it } from "vitest";
import { puedeEditarExpediente, puedeEmitirInforme, puedeSolicitarInspeccion, veBotonSolicitar } from "./permisos";

describe("visibilidad por rol", () => {
  it("solo el comprador ve el botón «Solicitar inspección técnica»", () => {
    expect(veBotonSolicitar("COMPRADOR")).toBe(true);
    expect(veBotonSolicitar("REVISOR")).toBe(false);
    expect(veBotonSolicitar("ESPECIALISTA")).toBe(false);
    expect(veBotonSolicitar(undefined)).toBe(false);
  });

  it("el comprador solo puede solicitar mientras no haya otra solicitud", () => {
    expect(puedeSolicitarInspeccion("COMPRADOR", "NO_SOLICITADA")).toBe(true);
    for (const estado of ["SOLICITADA", "EN_INSPECCION", "EMITIDO"] as const) {
      expect(puedeSolicitarInspeccion("COMPRADOR", estado)).toBe(false);
    }
    expect(puedeSolicitarInspeccion("REVISOR", "NO_SOLICITADA")).toBe(false);
  });

  it("solo el especialista llena el informe, y solo con una solicitud", () => {
    expect(puedeEmitirInforme("ESPECIALISTA", "SOLICITADA", "especialista-01", "especialista-01")).toBe(true);
    expect(puedeEmitirInforme("ESPECIALISTA", "NO_SOLICITADA", "especialista-01", "especialista-01")).toBe(false);
    expect(puedeEmitirInforme("COMPRADOR", "SOLICITADA")).toBe(false);
    expect(puedeEmitirInforme("REVISOR", "EN_INSPECCION")).toBe(false);
  });

  it("solo el revisor edita el expediente", () => {
    expect(puedeEditarExpediente("REVISOR")).toBe(true);
    expect(puedeEditarExpediente("COMPRADOR")).toBe(false);
    expect(puedeEditarExpediente("ESPECIALISTA")).toBe(false);
  });
});

// ------------------------------------------------------------------ v0.7

import {
  claveDeRuta, esPropietarioDe, navegacion, puedeAbrirVista, puedeAsignarEspecialista, puedeAutorizar, puedePublicar,
  puedeRetirarAutorizacion, puedeRetirarPublicacion, puedeSolicitarContacto, puedeVerHistorial,
} from "./permisos";
import type { Publicacion, Rol, Usuario } from "./types";

const TODOS: Rol[] = ["COMPRADOR", "REVISOR", "ESPECIALISTA", "GESTOR", "PROPIETARIO"];
const pub = (p: Partial<Publicacion>): Publicacion =>
  ({ estado: "BORRADOR", propietarioCodigo: "propietario-01", autorizada: false, autorizacionFecha: null, ...p });
const cuenta = (codigoCuenta: string, rol: Rol): Usuario => ({ id: 1, codigoCuenta, rol });

describe("navegación por rol (v0.7)", () => {
  const claves = (rol: Rol | undefined) => navegacion(rol).map((e) => e.clave);

  it("cada rol ve solo sus vistas", () => {
    expect(claves(undefined)).toEqual(["inicio"]);
    expect(claves("COMPRADOR")).toEqual(["inicio", "casos"]);
    expect(claves("ESPECIALISTA")).toEqual(["inicio", "casos"]);
    expect(claves("REVISOR")).toEqual(["inicio", "casos", "registrar"]);
    expect(claves("GESTOR")).toEqual(["inicio", "casos", "cartera"]);
    expect(claves("PROPIETARIO")).toEqual(["inicio", "mis-inmuebles"]);
  });

  it("la guarda de rutas rechaza las vistas de otro rol aunque se escriba la URL", () => {
    for (const rol of TODOS) {
      expect(puedeAbrirVista(rol, "cartera")).toBe(rol === "GESTOR");
      expect(puedeAbrirVista(rol, "mis-inmuebles")).toBe(rol === "PROPIETARIO");
      expect(puedeAbrirVista(rol, "registrar")).toBe(rol === "REVISOR");
      expect(puedeAbrirVista(rol, "inicio")).toBe(true);
    }
    expect(puedeAbrirVista(undefined, "casos")).toBe(false);
    expect(puedeAbrirVista(undefined, "cartera")).toBe(false);
  });

  it("los enlaces del menú siempre son vistas que el rol puede abrir", () => {
    for (const rol of TODOS) for (const e of navegacion(rol)) expect(puedeAbrirVista(rol, e.clave)).toBe(true);
  });

  it("resalta el enlace según la ruta", () => {
    expect(claveDeRuta("/")).toBe("inicio");
    expect(claveDeRuta("/casos/SIM-11048217")).toBe("casos");
    expect(claveDeRuta("/casos/nueva")).toBe("registrar");
    expect(claveDeRuta("/cartera")).toBe("cartera");
    expect(claveDeRuta("/mis-inmuebles")).toBe("mis-inmuebles");
    expect(claveDeRuta("/login")).toBeNull();
  });
});

describe("publicación y autorización (v0.7)", () => {
  it("solo el gestor publica, y solo con autorización vigente y si no está publicado (I14)", () => {
    expect(puedePublicar("GESTOR", pub({ autorizada: true }))).toBe(true);
    expect(puedePublicar("GESTOR", pub({ autorizada: true, estado: "RETIRADO" }))).toBe(true);
    expect(puedePublicar("GESTOR", pub({ autorizada: false }))).toBe(false);
    expect(puedePublicar("GESTOR", pub({ autorizada: true, estado: "PUBLICADO" }))).toBe(false);
    expect(puedePublicar("GESTOR", null)).toBe(false);
    for (const rol of TODOS.filter((r) => r !== "GESTOR")) {
      expect(puedePublicar(rol, pub({ autorizada: true }))).toBe(false);
    }
  });

  it("solo el gestor retira, y solo un caso publicado", () => {
    expect(puedeRetirarPublicacion("GESTOR", pub({ estado: "PUBLICADO", autorizada: true }))).toBe(true);
    expect(puedeRetirarPublicacion("GESTOR", pub({ estado: "BORRADOR" }))).toBe(false);
    expect(puedeRetirarPublicacion("GESTOR", pub({ estado: "RETIRADO" }))).toBe(false);
    expect(puedeRetirarPublicacion("REVISOR", pub({ estado: "PUBLICADO" }))).toBe(false);
    expect(puedeRetirarPublicacion("GESTOR", undefined)).toBe(false);
  });

  it("el propietario solo autoriza o retira lo suyo; el revisor nunca autoriza (I13)", () => {
    const p1 = cuenta("propietario-01", "PROPIETARIO");
    const p2 = cuenta("propietario-02", "PROPIETARIO");
    expect(puedeAutorizar(p1, pub({}))).toBe(true);
    expect(puedeAutorizar(p2, pub({}))).toBe(false);
    expect(puedeAutorizar(cuenta("revisor-01", "REVISOR"), pub({}))).toBe(false);
    expect(puedeAutorizar(cuenta("propietario-01", "GESTOR"), pub({}))).toBe(false);
    expect(puedeAutorizar(p1, pub({ autorizada: true }))).toBe(false);
    expect(puedeRetirarAutorizacion(p1, pub({ autorizada: true }))).toBe(true);
    expect(puedeRetirarAutorizacion(p1, pub({ autorizada: false }))).toBe(false);
    expect(puedeRetirarAutorizacion(p2, pub({ autorizada: true }))).toBe(false);
    // El comprador recibe el código del propietario en null: nunca coincide.
    expect(esPropietarioDe(p1, pub({ propietarioCodigo: null }))).toBe(false);
    expect(esPropietarioDe(null, pub({}))).toBe(false);
  });
});

describe("contacto, asignación e historial (v0.7)", () => {
  it("solo el comprador pide contacto, y solo sobre un caso publicado (I10)", () => {
    expect(puedeSolicitarContacto("COMPRADOR", "PUBLICADO")).toBe(true);
    expect(puedeSolicitarContacto("COMPRADOR", "BORRADOR")).toBe(false);
    expect(puedeSolicitarContacto("COMPRADOR", "RETIRADO")).toBe(false);
    expect(puedeSolicitarContacto("COMPRADOR", undefined)).toBe(false);
    for (const rol of TODOS.filter((r) => r !== "COMPRADOR")) expect(puedeSolicitarContacto(rol, "PUBLICADO")).toBe(false);
  });

  it("el gestor asigna solo inspecciones solicitadas o en curso", () => {
    expect(puedeAsignarEspecialista("GESTOR", "SOLICITADA")).toBe(true);
    expect(puedeAsignarEspecialista("GESTOR", "EN_INSPECCION")).toBe(true);
    expect(puedeAsignarEspecialista("GESTOR", "EMITIDO")).toBe(false);
    expect(puedeAsignarEspecialista("GESTOR", "NO_SOLICITADA")).toBe(false);
    expect(puedeAsignarEspecialista("REVISOR", "SOLICITADA")).toBe(false);
    expect(puedeAsignarEspecialista("ESPECIALISTA", "SOLICITADA")).toBe(false);
  });

  it("con asignación solo emite el especialista asignado; sin ella, nadie", () => {
    expect(puedeEmitirInforme("ESPECIALISTA", "SOLICITADA", "especialista-02", "especialista-02")).toBe(true);
    expect(puedeEmitirInforme("ESPECIALISTA", "SOLICITADA", "especialista-02", "especialista-01")).toBe(false);
    expect(puedeEmitirInforme("ESPECIALISTA", "EN_INSPECCION", null, "especialista-01")).toBe(false);
    expect(puedeEmitirInforme("GESTOR", "SOLICITADA", null, "gestor-01")).toBe(false);
  });

  it("el historial lo ven el equipo y el propietario, nunca el comprador", () => {
    expect(TODOS.filter(puedeVerHistorial)).toEqual(["REVISOR", "ESPECIALISTA", "GESTOR", "PROPIETARIO"]);
    expect(puedeVerHistorial(undefined)).toBe(false);
  });
});
