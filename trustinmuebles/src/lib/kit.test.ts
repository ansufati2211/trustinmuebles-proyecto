import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { leerPartida } from "./leerPartida";
import { disociar } from "./disociar";
import { numeroValidoParaOrigen } from "./fuentes";
import { VERSION } from "./version";
import { nombrePlano, pdfsPublicos } from "./publico";

/*
 * v1.0 (etapa 7): kit de respaldo de la demostración (docs/demo/kit). Los tres textos de partida se leen sin avisos, con
 * su código INT-, los asientos esperados y sin nombres de personas; los PDF del kit existen; la versión es la 1.0.0.
 */

const RAIZ = join(__dirname, "..", "..", "..");
const KIT = join(RAIZ, "docs", "demo", "kit");
const leer = (archivo: string) => readFileSync(join(KIT, "partidas", archivo), "utf8");

const PARTIDAS = [
  { archivo: "INT-99000611-vivienda-sin-cargas.txt", codigo: "INT-99000611", area: "180.00",
    actos: [["C00001", "COMPRAVENTA", null], ["F00001", "OTRO", null]] },
  { archivo: "INT-99000612-lote-con-hipoteca.txt", codigo: "INT-99000612", area: "160.00",
    actos: [["C00001", "COMPRAVENTA", null], ["D00001", "HIPOTECA", "VIGENTE"]] },
  { archivo: "INT-99000613-lote-con-embargo.txt", codigo: "INT-99000613", area: "150.00",
    actos: [["C00001", "COMPRAVENTA", null], ["D00001", "EMBARGO", "VIGENTE"]] },
] as const;

describe("kit: textos de partida listos para pegar", () => {
  it("son exactamente tres, uno por situación (vivienda sin cargas, hipoteca vigente, embargo)", () => {
    expect(readdirSync(join(KIT, "partidas")).filter((f) => f.endsWith(".txt")).sort())
      .toEqual(PARTIDAS.map((p) => p.archivo).sort());
  });

  for (const p of PARTIDAS) {
    it(`${p.archivo}: se lee sin avisos, con su código INT-, área, linderos y asientos`, () => {
      const texto = leer(p.archivo);
      expect(texto).toContain(`PARTIDA N.° ${p.codigo} (REGISTRO INTERNO DE CARTERA)`);
      expect(numeroValidoParaOrigen(p.codigo, "SIMULADA_DEMOSTRACION")).toBe(true);
      const r = leerPartida(texto);
      expect(r.avisos).toEqual([]);
      expect(r.areaM2).toBe(p.area);
      expect(r.linderos).toMatch(/^Por el frente:/);
      expect(r.antecedenteDominial).toMatch(/^Independizado de la partida/);
      expect(r.asientos.map((a) => [a.referencia, a.tipoActo, a.estado])).toEqual(p.actos);
      expect(r.asientos.every((a) => a.fechaInscripcion && a.tituloNumero)).toBe(true);
    });

    it(`${p.archivo}: no tiene nombres de personas, DNI, celulares ni palabras de prueba`, () => {
      const texto = leer(p.archivo);
      const r = leerPartida(texto);
      expect(disociar(r.asientos.map((a) => a.texto)).personas).toEqual([]);
      expect(texto).not.toMatch(/DNI|\b9\d{8}\b/); // ni DNI ni celulares
      expect(texto).not.toMatch(/ficticia|simulad|demostraci|de prueba/i);
      expect(texto).not.toMatch(/compra segura|saneado|garantizad/i);
    });
  }
});

describe("kit: archivos de apoyo", () => {
  it("trae los PDF de los documentos del lote y de las láminas, con el rótulo de la inmobiliaria en el nombre", () => {
    const pdf = join(KIT, "pdf");
    const lote = ["plano-perimetrico.pdf", "memoria-descriptiva.pdf", "certificado-zonificacion.pdf", "tasacion.pdf"];
    const laminas = ["plano-arquitectura.pdf", "plano-estructuras.pdf", "plano-electricas.pdf", "plano-sanitarias.pdf"];
    const archivos = [...laminas.map((f) => join("INT-99000611", f)), ...lote.map((f) => join("INT-99000612", f)),
      ...lote.map((f) => join("INT-99000613", f))];
    for (const f of archivos) {
      expect(existsSync(join(pdf, f)), f).toBe(true);
      const contenido = readFileSync(join(pdf, f)).toString("latin1");
      expect(contenido.startsWith("%PDF-1.4"), f).toBe(true);
      expect(contenido, f).toContain("LEDCONS"); // v1.0 (etapa 8): rótulo de la inmobiliaria que opera el portal
      expect(contenido, f).not.toMatch(/SUNARP emite este|Municipalidad Provincial de Ica certifica|Colegio de/);
    }
  });

  it("datos-cita.md usa solo un nombre de pila y un correo @example.com", () => {
    const t = readFileSync(join(KIT, "datos-cita.md"), "utf8");
    const correos = t.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? [];
    expect(correos.length).toBeGreaterThan(0);
    expect(correos.every((c) => c.endsWith("@example.com"))).toBe(true);
    expect(t).not.toMatch(/\b9\d{8}\b|\bDNI\s*:?\s*\d/);
  });

  it("LEEME-KIT.md nombra cada archivo del kit", () => {
    const t = readFileSync(join(KIT, "LEEME-KIT.md"), "utf8");
    for (const f of [...PARTIDAS.map((p) => p.archivo), "proyecto-nuevo-80-lotes.csv", "proyecto-con-errores.csv",
      "frases-asistente.md", "datos-cita.md", "plano-perimetrico.pdf", "plano-arquitectura.pdf"]) {
      expect(t, f).toContain(f);
    }
  });
});

describe("versión 1.0.0", () => {
  it("la constante de la interfaz coincide con package.json y con pom.xml", () => {
    const paquete = JSON.parse(readFileSync(join(RAIZ, "trustinmuebles", "package.json"), "utf8")) as { version: string };
    expect(VERSION).toBe("1.0.0");
    expect(paquete.version).toBe(VERSION);
    const pom = readFileSync(join(RAIZ, "trustinmuebles-backend", "pom.xml"), "utf8");
    expect(pom).toMatch(/<artifactId>backend<\/artifactId>\s*<version>1\.0\.0<\/version>/);
  });
});

describe("nombre de los planos en el portal (etapa 7)", () => {
  it("no repite «Plano de plano»", () => {
    expect(nombrePlano("Plano arquitectónico")).toBe("Plano arquitectónico");
    expect(nombrePlano("Plano de instalaciones eléctricas (II.EE.)")).toBe("Plano de instalaciones eléctricas (II.EE.)");
    expect(nombrePlano("Estructuras")).toBe("Plano de estructuras");
    const pdfs = pdfsPublicos({ codigo: "INT-99000611", expediente: { documentosLote: null, planos: [
      { especialidad: "ARQUITECTURA", especialidadEtiqueta: "Plano arquitectónico", estado: "PRESENTADO" }] } });
    expect(pdfs.map((x) => x.nombre)).toEqual(["Ficha registral del inmueble", "Plano arquitectónico"]);
  });
});
