import { describe, expect, it } from "vitest";
import {
  cuerpoInteres, enlaceWhatsapp, estadoSugerido, formularioVacio, hoyLima, mensajeWhatsapp, normalizarCelular,
  ofreceMarcarLote, rutaInteresados, sumarDias, textoPresupuesto, validarFormulario, type FormularioInteres,
} from "./interes";

/* v1.0 (etapa 4): formulario público de interés y cita, WhatsApp y bandeja. */

const HOY = "2026-11-16";
const valido = (extra: Partial<FormularioInteres> = {}): FormularioInteres => ({
  ...formularioVacio(true), nombre: "Valeria", medio: "CORREO", contacto: "valeria@example.com",
  fecha1: "2026-11-18", consentimiento: true, ...extra,
});

describe("formulario de interés y cita", () => {
  it("un formulario completo no tiene errores", () => {
    expect(validarFormulario(valido(), HOY)).toEqual({});
  });

  it("el consentimiento es obligatorio", () => {
    expect(validarFormulario(valido({ consentimiento: false }), HOY).consentimiento).toBeTruthy();
  });

  it("nombre de pila con letras y contacto válido según el medio", () => {
    expect(validarFormulario(valido({ nombre: "" }), HOY).nombre).toBeTruthy();
    expect(validarFormulario(valido({ nombre: "Ana 2" }), HOY).nombre).toBeTruthy();
    expect(validarFormulario(valido({ nombre: "María José" }), HOY).nombre).toBeUndefined();
    expect(validarFormulario(valido({ contacto: "sin-arroba" }), HOY).contacto).toBeTruthy();
    expect(validarFormulario(valido({ medio: "CELULAR", contacto: "812345678" }), HOY).contacto).toBeTruthy();
    expect(validarFormulario(valido({ medio: "CELULAR", contacto: "+51 900 000 000" }), HOY).contacto).toBeUndefined();
  });

  it("nunca DNI: ocho dígitos seguidos en el mensaje no se aceptan", () => {
    expect(validarFormulario(valido({ mensaje: "Mi DNI es 12345678" }), HOY).mensaje).toMatch(/DNI/);
    expect(validarFormulario(valido({ mensaje: "x".repeat(301) }), HOY).mensaje).toBeTruthy();
    expect(validarFormulario(valido({ mensaje: "Mz. A lote 7, 140 m²" }), HOY).mensaje).toBeUndefined();
  });

  it("las fechas van desde mañana y hasta 90 días; la segunda no repite la primera", () => {
    expect(validarFormulario(valido({ fecha1: "" }), HOY).fecha1).toBeTruthy();
    expect(validarFormulario(valido({ fecha1: HOY }), HOY).fecha1).toBeTruthy();
    expect(validarFormulario(valido({ fecha1: sumarDias(HOY, 91) }), HOY).fecha1).toBeTruthy();
    expect(validarFormulario(valido({ fecha2: "2026-11-18", franja2: "MANANA" }), HOY).fecha2).toBeTruthy();
    expect(validarFormulario(valido({ fecha2: "2026-11-18", franja2: "TARDE" }), HOY).fecha2).toBeUndefined();
    expect(validarFormulario(valido({ quiereCita: false, fecha1: "" }), HOY)).toEqual({});
  });

  it("el cuerpo lleva el lote y su proyecto, la cita y la versión del consentimiento; nunca un DNI", () => {
    const c = cuerpoInteres({ proyectoCodigo: "altos-de-ventisca", lote: "A-7", nombre: "Mz. A Lote 7", referencia: "x" },
      valido({ medio: "CELULAR", contacto: "+51 900-000-000", fecha2: "2026-11-19", presupuestoMax: "45,000" }), "v9");
    expect(c).toMatchObject({
      proyectoCodigo: "altos-de-ventisca", lote: "A-7", contacto: "900000000", consentimiento: true,
      consentimientoVersion: "v9", presupuestoMax: 45000, moneda: "PEN",
      cita: { modalidad: "VISITA_AL_LOTE", opciones: [{ fecha: "2026-11-18", franja: "MANANA" }, { fecha: "2026-11-19", franja: "TARDE" }] },
    });
    expect(Object.keys(c)).not.toContain("dni");
    expect(Object.keys(c)).not.toContain("sitioWeb");
    expect(cuerpoInteres({ casoCodigo: "11081204", nombre: "n", referencia: "r" }, valido({ quiereCita: false }), "v")).not.toHaveProperty("cita");
    expect(cuerpoInteres({ nombre: "n", referencia: "r" }, valido({ sitioWeb: "robot" }), "v")).toHaveProperty("sitioWeb", "robot");
  });

  it("celular peruano normalizado", () => {
    expect(normalizarCelular("900 000 000")).toBe("900000000");
    expect(normalizarCelular("51900000000")).toBe("900000000");
    expect(normalizarCelular("12345")).toBeNull();
  });

  it("fechas en Lima y suma de días", () => {
    expect(hoyLima(new Date("2026-11-17T03:00:00Z"))).toBe("2026-11-16");
    expect(sumarDias("2026-11-30", 1)).toBe("2026-12-01");
    expect(sumarDias("2026-11-16", -7)).toBe("2026-11-09");
  });
});

describe("WhatsApp", () => {
  it("sin número configurado no hay enlace", () => {
    expect(enlaceWhatsapp(null, "Mz. A Lote 7", "altos-de-ventisca-A-7")).toBeNull();
    expect(enlaceWhatsapp("", "x", "y")).toBeNull();
  });

  it("con número, el mensaje va armado con el inmueble y su referencia", () => {
    expect(mensajeWhatsapp("Mz. A Lote 7", "altos-de-ventisca-A-7")).toBe("Hola, me interesa Mz. A Lote 7 (ref. altos-de-ventisca-A-7)");
    const url = enlaceWhatsapp("+51 900 000 000", "Mz. A Lote 7", "altos-de-ventisca-A-7")!;
    expect(url.startsWith("https://wa.me/51900000000?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toBe("Hola, me interesa Mz. A Lote 7 (ref. altos-de-ventisca-A-7)");
  });
});

describe("bandeja de interesados", () => {
  it("arma la ruta con los filtros", () => {
    expect(rutaInteresados({})).toBe("/interesados");
    expect(rutaInteresados({ etapa: "NUEVO", proyecto: "altos-de-ventisca", responsable: "asesor-01", vencidos: true }))
      .toBe("/interesados?etapa=NUEVO&proyecto=altos-de-ventisca&responsable=asesor-01&vencidos=true");
  });

  it("ofrece marcar el lote solo en Separación o Venta y con un lote o inmueble vinculado", () => {
    expect(ofreceMarcarLote({ etapa: "SEPARACION", origen: "LOTE" })).toBe(true);
    expect(ofreceMarcarLote({ etapa: "VENTA", origen: "CASO" })).toBe(true);
    expect(ofreceMarcarLote({ etapa: "CITA_AGENDADA", origen: "LOTE" })).toBe(false);
    expect(ofreceMarcarLote({ etapa: "VENTA", origen: "GENERAL" })).toBe(false);
    expect(estadoSugerido("SEPARACION")).toBe("SEPARADO");
    expect(estadoSugerido("VENTA")).toBe("VENDIDO");
  });

  it("presupuesto legible", () => {
    expect(textoPresupuesto({ presupuestoMin: null, presupuestoMax: 45000, moneda: "PEN" })).toBe("hasta S/ 45,000");
    expect(textoPresupuesto({ presupuestoMin: 30000, presupuestoMax: 45000, moneda: "PEN" })).toBe("S/ 30,000 a 45,000");
    expect(textoPresupuesto({ presupuestoMin: null, presupuestoMax: null, moneda: null })).toBe("sin presupuesto");
  });
});
