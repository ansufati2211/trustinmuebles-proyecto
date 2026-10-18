import { describe, expect, it } from "vitest";
import { disociar, plegar } from "./disociar";

describe("disociar", () => {
  it("reemplaza el nombre de una persona después de «a favor de» y conserva la empresa", () => {
    const r = disociar(["Inmobiliaria Santa Elvira S.A.C. transfirió el predio a favor de Rosa Elena Cárdenas Vilca, de estado civil soltera."]);
    expect(r.textos[0]).toContain("a favor de Persona natural 1");
    expect(r.textos[0]).toContain("Inmobiliaria Santa Elvira S.A.C.");
    expect(r.textos[0]).not.toMatch(/Rosa|Cárdenas|estado civil|soltera/);
    expect(r.personas).toEqual([{ etiqueta: "Persona natural 1", nombre: "Rosa Elena Cárdenas Vilca" }]);
  });

  it("da la misma etiqueta a la misma persona en todos los textos, con tildes o mayúsculas distintas", () => {
    const r = disociar([
      "Compraventa a favor de Marco Antonio Quispe Huamaní y Lucía Fernanda Torres Gutiérrez.",
      "Embargo contra MARCO ANTONIO QUISPE HUAMANI por deuda.",
      "Se cancela. Titular: Lucía Fernanda Torres Gutiérrez.",
    ]);
    expect(r.personas.map((p) => p.etiqueta)).toEqual(["Persona natural 1", "Persona natural 2"]);
    expect(r.textos[0]).toBe("Compraventa a favor de Persona natural 1 y Persona natural 2.");
    expect(r.textos[1]).toBe("Embargo contra Persona natural 1 por deuda.");
    expect(r.textos[2]).toBe("Se cancela. Titular: Persona natural 2.");
  });

  it("omite DNI, estado civil y domicilio", () => {
    const r = disociar(["Pedro Luis Salazar Ramos, identificado con DNI N° 45678912, de estado civil casado, con domicilio en Av. Los Álamos 123, Ica, compró el lote."]);
    expect(r.textos[0]).not.toMatch(/45678912|casado|Álamos|Pedro|Salazar/);
    expect(r.textos[0]).toMatch(/^Persona natural 1, \[DNI omitido\]/);
    expect(r.textos[0]).toContain("[DNI omitido]");
    expect(r.textos[0]).toContain("[domicilio omitido]");
    expect(r.omitidos).toBeGreaterThanOrEqual(3);
  });

  it("conserva el Estado, las instituciones y los lugares", () => {
    const entrada = "Hipoteca a favor de Financiera del Valle S.A. Inscrita en la Zona Registral N.° XI, Oficina Registral de Ica, Hab. Urb. Santa Elvira, distrito de Parcona. Embargo del Banco de Crédito. Terreno del Estado Peruano.";
    const r = disociar([entrada]);
    expect(r.personas).toEqual([]);
    expect(r.textos[0]).toBe(entrada);
  });

  it("permite marcar a mano un nombre que no se detectó y descartar un falso positivo", () => {
    const a = disociar(["Linda por la derecha con el predio del vecino, el sr. Quispe."], { extras: ["Quispe"] });
    expect(a.textos[0]).toContain("Persona natural 1");
    const b = disociar(["Colinda con Campo Verde por el fondo."], { ignorar: ["Campo Verde"] });
    expect(b.textos[0]).toBe("Colinda con Campo Verde por el fondo.");
  });

  it("no deja rastros de los nombres detectados, escritos con mayúsculas del registro", () => {
    const r = disociar(["Transferencia a favor de ROSA ELENA CARDENAS VILCA, soltera."]);
    expect(plegar(r.textos[0])).not.toMatch(/rosa|cardenas|vilca/);
  });
});
