import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { EMPRESA, enlaceTelefono, enlaceWhatsappEmpresa, whatsappLegible } from "./empresa";
import { enlaceWhatsapp } from "./interes";
import { cifrasPortada, textoCatalogoPortada } from "./sitio";

/* v1.0 (etapa 8): datos de la inmobiliaria, enlace de WhatsApp y cifras de la portada. */

describe("empresa.json", () => {
  it("la copia de la interfaz es idéntica a la del servidor", () => {
    const interfaz = JSON.parse(readFileSync("src/contenido/empresa.json", "utf8"));
    const servidor = JSON.parse(readFileSync("../trustinmuebles-backend/src/main/resources/contenido/empresa.json", "utf8"));
    expect(interfaz).toEqual(servidor);
  });

  it("tiene los datos de LEDCONS autorizados y el logo en public/ y en el backend", () => {
    expect(EMPRESA.nombreComercial).toBe("LEDCONS");
    expect(EMPRESA.razonSocial).toBe("LEDCONS E.I.R.L.");
    expect(EMPRESA.ruc).toBe("20600817133");
    expect(EMPRESA.eslogan).toBe("Inmobiliaria y Constructora");
    expect(EMPRESA.direccion).toBe("Av. San Martín 577, 2.º piso, oficina 32, Ica");
    expect(EMPRESA.telefonos).toEqual(["991 108 224", "904 958 416"]);
    expect(EMPRESA.whatsapp).toBe("51991108224");
    expect(EMPRESA.facebook).toBe("https://www.facebook.com/Constructora.Inmobiliaria.Ledcons.sac/");
    expect(EMPRESA.logo).toBe("/img/marca/ledcons-logo.png");
    const png = readFileSync(`public${EMPRESA.logo}`);
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(readFileSync(`../trustinmuebles-backend/src/main/resources/${EMPRESA.logoPdf}`).equals(png)).toBe(true);
  });
});

describe("WhatsApp y teléfonos", () => {
  it("el botón de WhatsApp arma el enlace wa.me con solo dígitos y el mensaje codificado", () => {
    expect(enlaceWhatsappEmpresa()).toBe("https://wa.me/51991108224");
    expect(enlaceWhatsappEmpresa("Hola, quiero información")).toBe("https://wa.me/51991108224?text=Hola%2C%20quiero%20informaci%C3%B3n");
    expect(enlaceWhatsappEmpresa(undefined, "+51 991 108 224")).toBe("https://wa.me/51991108224");
    // El de la ficha (SolicitarCita) usa el número que da el servidor, que ahora cae en el de empresa.json.
    expect(enlaceWhatsapp(EMPRESA.whatsapp, "Lote A-7", "ALTOS-A-7"))
      .toBe("https://wa.me/51991108224?text=Hola%2C%20me%20interesa%20Lote%20A-7%20(ref.%20ALTOS-A-7)");
  });

  it("muestra el WhatsApp legible y arma los enlaces tel:", () => {
    expect(whatsappLegible()).toBe("+51 991 108 224");
    expect(enlaceTelefono("991 108 224")).toBe("tel:+51991108224");
    expect(enlaceTelefono("904 958 416")).toBe("tel:+51904958416");
  });
});

describe("cifras de la portada", () => {
  it("salen de /publico/sitio y, sin datos, muestran «—» (nunca un número fijo)", () => {
    const vacias = cifrasPortada(null);
    expect(vacias.map((c) => c.n)).toEqual(["—", "—", "—"]);
    expect(vacias.map((c) => c.t)).toEqual(["inmuebles publicados", "proyectos en venta", "lotes disponibles"]);
    const reales = cifrasPortada({ inmueblesPublicados: 1179, proyectos: 3, lotesDisponibles: 1 });
    expect(reales.map((c) => c.n)).toEqual([(1179).toLocaleString("es-PE"), "3", "1"]);
    expect(reales[2].t).toBe("lote disponible");
  });

  it("la frase del catálogo usa el total real o ninguno", () => {
    expect(textoCatalogoPortada(null)).not.toMatch(/\d/);
    expect(textoCatalogoPortada({ inmueblesPublicados: 98, proyectos: 3, lotesDisponibles: 60 })).toContain("98 lotes y viviendas");
  });
});
