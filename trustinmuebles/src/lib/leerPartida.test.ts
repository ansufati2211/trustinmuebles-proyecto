import { describe, expect, it } from "vitest";
import { deducirActo, fechaIso, leerPartida } from "./leerPartida";

const TEXTO = `
RUBRO: TITULOS DE DOMINIO
C00001
COMPRAVENTA
Por escritura pública de fecha 14 de marzo de 2018, Inmobiliaria Santa Elvira S.A.C. transfirió el predio a favor de Persona natural 1. Título N° 2018-00012345. Fecha de presentación: 15/03/2018. Fecha de inscripción: 22/03/2018.
RUBRO: GRAVAMENES Y CARGAS
D00001
HIPOTECA
Hipoteca a favor de Financiera del Valle S.A., en garantía de un préstamo. Título 2018-00013102. Fecha de inscripción: 02/04/2018.
D00002
EMBARGO
Embargo en forma de inscripción dispuesto por el Juzgado Civil de Ica. Fecha de inscripción: 10/05/2020.
RUBRO: CANCELACIONES
E00001
Se cancela la hipoteca inscrita en el asiento D00001 por pago total. Fecha de inscripción: 11/02/2022.
`;

describe("leerPartida", () => {
  const r = leerPartida(TEXTO);

  it("divide el texto en sus asientos con el rubro correcto", () => {
    expect(r.asientos.map((a) => a.referencia)).toEqual(["C00001", "D00001", "D00002", "E00001"]);
  });

  it("deduce el tipo de acto, el estado inicial y la cancelación", () => {
    expect(r.asientos.map((a) => a.tipoActo)).toEqual(["COMPRAVENTA", "HIPOTECA", "EMBARGO", "CANCELACION"]);
    expect(r.asientos[1].estado).toBe("VIGENTE");
    expect(r.asientos[3].canceloNumero).toBe("D00001");
  });

  it("deduce fechas, título y titulares", () => {
    const c = r.asientos[0];
    expect(c.fechaPresentacion).toBe("2018-03-15");
    expect(c.fechaInscripcion).toBe("2018-03-22");
    expect(c.tituloNumero).toBe("2018-00012345");
    expect(c.titulares).toBe("Persona natural 1");
    expect(r.asientos[1].tituloNumero).toBe("2018-00013102");
  });

  it("no divide un asiento por mencionar a otro dentro de su texto", () => {
    expect(r.asientos).toHaveLength(4);
    expect(r.asientos[3].texto).toContain("D00001");
  });

  it("devuelve una sola fila para revisar a mano si no reconoce asientos", () => {
    const x = leerPartida("Texto sin números de asiento.");
    expect(x.asientos).toHaveLength(1);
    expect(x.asientos[0].tipoActo).toBe("OTRO");
    expect(x.avisos.join(" ")).toMatch(/No se reconocieron/);
  });

  it("convierte fechas en distintos formatos", () => {
    expect(fechaIso("14 de marzo de 2018")).toBe("2018-03-14");
    expect(fechaIso("5-1-2020")).toBe("2020-01-05");
    expect(fechaIso("2021-12-31")).toBe("2021-12-31");
    expect(deducirActo("F", "Servidumbre de paso")).toBe("SERVIDUMBRE");
  });
});
