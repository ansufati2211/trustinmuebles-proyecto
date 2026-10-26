import { describe, expect, it } from "vitest";
import { cuerpoContacto, etiquetaMotivo, mensajeErrorContacto, MOTIVOS_CONTACTO } from "./contacto";

describe("solicitud de contacto", () => {
  it("la lista de motivos es cerrada y coincide con la del servidor", () => {
    expect(MOTIVOS_CONTACTO.map((m) => m.valor)).toEqual(["INFORMACION_GENERAL", "CONSULTA_DOCUMENTOS", "CONSULTA_INSPECCION"]);
    expect(MOTIVOS_CONTACTO.map((m) => m.etiqueta)).toEqual(["Información general", "Consulta de documentos", "Consulta de inspección"]);
  });

  it("el cuerpo lleva solo el motivo: sin texto libre ni datos personales (I11)", () => {
    expect(Object.keys(cuerpoContacto("CONSULTA_DOCUMENTOS"))).toEqual(["motivo"]);
  });

  it("explica el 409 de una solicitud pendiente duplicada y los demás errores", () => {
    expect(mensajeErrorContacto(409)).toContain("pendiente");
    expect(mensajeErrorContacto(404)).toContain("no está publicado");
    expect(mensajeErrorContacto(403)).toContain("no puede");
    expect(mensajeErrorContacto(500, "Error del servidor")).toBe("Error del servidor");
    expect(mensajeErrorContacto(0)).toBe("No se pudo enviar la solicitud de contacto.");
  });

  it("un motivo desconocido o ausente se muestra sin inventar etiqueta", () => {
    expect(etiquetaMotivo("INFORMACION_GENERAL")).toBe("Información general");
    expect(etiquetaMotivo("OTRO")).toBe("OTRO");
    expect(etiquetaMotivo(null)).toBe("");
  });
});
