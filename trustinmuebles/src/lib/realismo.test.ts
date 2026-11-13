import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  contarFiltros, FILTROS_PUBLICO_VACIOS, filtrosALaUrl, filtrosDeLaUrl, rutaCatalogoPublico, rutaRecomendables,
  sinFiltros, type FiltrosPublico,
} from "./filtrosPublico";
import { etiquetasDe, quitarEtiqueta, recomendar, type Recomendable } from "./asistente";
import { numeroValidoParaOrigen, normalizarNumero } from "./fuentes";
import { COLEGIATURA_PENDIENTE, partidaOculta, partidaVisible, pdfsPublicos, textoColegiatura } from "./publico";
import { contenidoMetaRobots, aplicarIndexacion, META_NO_INDEXAR } from "./sitio";
import { CREDITOS_IMAGENES, FOTOS_LIBRES, licenciaLibre } from "./creditos";
import { fotoDePredio } from "./predios";
import { opcionesMenuMovil, navegacion } from "./permisos";
import type { Predio, Rol } from "./types";

/*
 * v1.0 (etapa 6): realismo del contenido. Sin palabras de prueba en la interfaz, filtros por zonificación y uso,
 * recomendaciones con variedad, INT-, partida oculta, colegiatura, PDF públicos, robots, créditos y menú ☰.
 */

const url = (q: string) => new URLSearchParams(q);
const f = (p: Partial<FiltrosPublico> = {}): FiltrosPublico => ({ ...FILTROS_PUBLICO_VACIOS, ...p });

/** Archivos de la interfaz (sin las pruebas). */
function fuentes(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const r = join(dir, n);
    if (statSync(r).isDirectory()) return fuentes(r);
    return /\.(tsx?|json)$/.test(n) && !/\.test\./.test(n) ? [r] : [];
  });
}

describe("sin palabras de prueba en la interfaz", () => {
  it("ningún archivo de la interfaz dice demostración, prueba, ficticio, simulado ni «de ejemplo»", () => {
    const archivos = [...fuentes("src"), "index.html"];
    expect(archivos.length).toBeGreaterThan(50);
    for (const a of archivos) {
      // Los nombres internos del origen (SIMULADA_DEMOSTRACION, PARTIDA_SIMULADA) y la variable «simulada» no se muestran.
      const t = readFileSync(a, "utf8").replace(/SIMULADA_DEMOSTRACION|PARTIDA_SIMULADA|\bsimulada\b/g, "");
      expect(t, a).not.toMatch(/demostraci[oó]n|\bprueba\b|fictici[oa]|simulad[oa]|de ejemplo/i);
    }
  });
});

describe("filtro por zonificación y uso (en la URL)", () => {
  it("lee y escribe zonificación, uso e incluirSinZonificacion, con la URL más corta posible", () => {
    const g = filtrosDeLaUrl(url("zonificacion=rdm,CV,rdm&uso=casa&incluirSinZonificacion=true"));
    expect(g).toEqual({ ...FILTROS_PUBLICO_VACIOS, zonificacion: "RDM,CV", uso: "CASA", incluirSinZonificacion: true });
    expect(filtrosALaUrl(g).toString()).toBe("zonificacion=RDM%2CCV&uso=CASA&incluirSinZonificacion=true");
    expect(filtrosDeLaUrl(filtrosALaUrl(g))).toEqual(g);
    expect(contarFiltros(g)).toBe(2);
  });

  it("incluirSinZonificacion solo vale junto a una zonificación o un uso; lo desconocido se ignora", () => {
    expect(filtrosDeLaUrl(url("incluirSinZonificacion=true"))).toEqual(FILTROS_PUBLICO_VACIOS);
    expect(filtrosDeLaUrl(url("uso=piscina&zonificacion=<x>"))).toEqual(FILTROS_PUBLICO_VACIOS);
    expect(filtrosALaUrl(f({ incluirSinZonificacion: true })).toString()).toBe("");
    expect(sinFiltros(f({ uso: "NEGOCIO", zonificacion: "CV" }))).toEqual(FILTROS_PUBLICO_VACIOS);
  });

  it("los parámetros nuevos viajan a la API del catálogo y a la de recomendables", () => {
    const g = f({ tipo: "LOTE", uso: "ALMACEN", incluirSinZonificacion: true });
    expect(rutaCatalogoPublico(g, 1)).toContain("uso=ALMACEN&incluirSinZonificacion=true");
    const r = rutaRecomendables(g);
    expect(r.startsWith("/publico/inmuebles/recomendables?")).toBe(true);
    expect(r).toContain("tipo=LOTE");
    expect(r).toContain("uso=ALMACEN");
    expect(r).toContain("orden=novedad");
    expect(r).not.toContain("pagina=");
  });

  it("las etiquetas del asistente siguen al uso y la zonificación de la URL, y se pueden quitar", () => {
    const g = f({ uso: "CASA", zonificacion: "RDM", incluirSinZonificacion: true });
    const textos = etiquetasDe(g, null).map((e) => e.texto);
    expect(textos).toEqual(["Zonificación RDM", "Para casa (y los sin zonificación)"]);
    const sinUso = quitarEtiqueta(g, "CASA", "uso");
    expect(sinUso.uso).toBeNull();
    expect(sinUso.filtros.uso).toBeUndefined();
    expect(sinUso.filtros.incluirSinZonificacion).toBe(true); // queda la zonificación
    const nada = quitarEtiqueta(sinUso.filtros, null, "zonificacion").filtros;
    expect(filtrosALaUrl(nada).toString()).toBe("");
  });
});

describe("recomendaciones sobre todos los resultados, con variedad", () => {
  const predio = (p: Partial<Predio>): Predio => ({
    tipoInmueble: "LOTE_URBANO", tipoInmuebleEtiqueta: "Lote", distrito: "Salas", areaM2: 120, areaConstruidaInscrita: null,
    precioReferencial: 30000, moneda: "PEN", precioNota: null, precioPorM2: 250, estadoComercial: "DISPONIBLE", ...p,
  });
  const lote = (proyecto: string, clave: string, p: Partial<Predio> = {}): Recomendable => ({
    codigo: `${proyecto}-${clave}`, denominacion: `${clave} · ${proyecto}`, estado: "VERDE", clase: "LOTE_PROYECTO",
    proyectoCodigo: proyecto, lote: clave, fuenteIndicadorA: "PARTIDA_MATRIZ", predio: predio(p),
  });

  it("con empate, prefiere otro proyecto antes que repetir", () => {
    // Todos iguales: sin variedad saldrían los tres de «ventisca» (por código).
    const items = [lote("ventisca", "A-1"), lote("ventisca", "A-2"), lote("ventisca", "B-1"), lote("sauzal", "A-1"),
      lote("lucumo", "C-4")];
    const r = recomendar(items, f(), null).map((x) => x.inmueble.proyectoCodigo);
    expect(new Set(r).size).toBe(3);
  });

  it("si solo hay un proyecto, prefiere otra manzana", () => {
    const items = [lote("ventisca", "A-1"), lote("ventisca", "A-2"), lote("ventisca", "A-3"), lote("ventisca", "B-1"),
      lote("ventisca", "C-1")];
    const manzanas = recomendar(items, f(), null).map((x) => x.inmueble.lote!.split("-")[0]);
    expect(new Set(manzanas).size).toBe(3);
  });

  it("la variedad nunca deja pasar a uno de menor puntaje", () => {
    const items = [
      lote("ventisca", "A-1", { precioReferencial: 20000 }), // el más barato: +1
      lote("ventisca", "A-2"), lote("ventisca", "A-3"),
      lote("sauzal", "A-1", { estadoComercial: "SEPARADO" }), // separado: −4
    ];
    const r = recomendar(items, f(), null);
    expect(r[0].inmueble.codigo).toBe("ventisca-A-1");
    expect(r.map((x) => x.inmueble.codigo)).not.toContain("sauzal-A-1");
  });

  it("recomienda sobre la lista completa que recibe (más de una página)", () => {
    const items = Array.from({ length: 60 }, (_, i) => lote(i < 30 ? "ventisca" : "sauzal", `A-${i + 1}`,
      { precioReferencial: 40000 - i * 100, precioPorM2: 300 - i }));
    const r = recomendar(items, f({ orden: "precio", sentido: "asc" }), null);
    expect(r[0].inmueble.codigo).toBe("sauzal-A-60"); // el más barato está fuera de los primeros 24
    expect(r[0].motivos).toContain("Tiene el menor precio entre los resultados");
  });
});

describe("registro interno de cartera: INT-", () => {
  it("acepta INT-######## y, como antes, SIM-########; una transcrita no admite prefijo", () => {
    expect(numeroValidoParaOrigen("INT-99000404", "SIMULADA_DEMOSTRACION")).toBe(true);
    expect(numeroValidoParaOrigen("SIM-99000404", "SIMULADA_DEMOSTRACION")).toBe(true);
    expect(numeroValidoParaOrigen("INT-9900", "SIMULADA_DEMOSTRACION")).toBe(false);
    expect(numeroValidoParaOrigen("INT-99000404", "TRANSCRITA_CONOCE_AQUI")).toBe(false);
    expect(normalizarNumero("INT-99000404")).toBe("99000404");
  });
});

describe("ficha pública: partida, colegiatura y PDF", () => {
  it("la partida va parcialmente oculta sin sesión y completa con sesión", () => {
    expect(partidaOculta("11052690")).toBe("1105••••");
    expect(partidaVisible("11052690", false)).toBe("1105••••");
    expect(partidaVisible("11052690", true)).toBe("11052690");
  });

  it("sin número de colegiatura, dice que se registra al asignar al profesional", () => {
    expect(textoColegiatura(null)).toBe("Colegiatura: se registra al asignar al profesional");
    expect(textoColegiatura("  ")).toBe(COLEGIATURA_PENDIENTE);
    expect(textoColegiatura("CIP 1")).toBe("Colegiatura: CIP 1");
  });

  it("ofrece la ficha registral, las láminas y los documentos presentados u observados; nunca el informe técnico", () => {
    const pdfs = pdfsPublicos({
      codigo: "11052690",
      expediente: {
        planos: [
          { especialidad: "ARQUITECTURA", especialidadEtiqueta: "Arquitectura", estado: "PRESENTADO" },
          { especialidad: "ESTRUCTURAS", especialidadEtiqueta: "Estructuras", estado: "OBSERVADO" },
          { especialidad: "ELECTRICAS", especialidadEtiqueta: "Eléctricas", estado: "NO_PRESENTADO" },
        ],
        documentosLote: [{ tipo: "TASACION", tipoEtiqueta: "Tasación", estado: "PRESENTADO" },
          { tipo: "MEMORIA_DESCRIPTIVA", tipoEtiqueta: "Memoria descriptiva", estado: "NO_APLICA" }],
      },
    });
    expect(pdfs.map((p) => p.url)).toEqual([
      "/api/v1/publico/inmuebles/11052690/documento",
      "/api/v1/publico/inmuebles/11052690/documentos-lote/TASACION/documento",
      "/api/v1/publico/inmuebles/11052690/planos/ARQUITECTURA/documento",
      "/api/v1/publico/inmuebles/11052690/planos/ESTRUCTURAS/documento",
    ]);
    expect(pdfs[0].nombre).toBe("Ficha registral del inmueble");
    expect(pdfs.map((p) => p.url).join(" ")).not.toContain("inspeccion");
  });
});

describe("no indexar", () => {
  it("index.html trae meta robots noindex y la interfaz solo la cambia si el sitio es indexable", () => {
    expect(readFileSync("index.html", "utf8")).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(contenidoMetaRobots(false)).toBe(META_NO_INDEXAR);
    expect(contenidoMetaRobots(true)).toBe("index, follow");
    const meta = { name: "robots", content: META_NO_INDEXAR };
    const doc = { head: { querySelector: () => meta, appendChild: () => {} }, createElement: () => meta } as unknown as Document;
    aplicarIndexacion(doc, false);
    expect(meta.content).toBe("noindex, nofollow");
    aplicarIndexacion(doc, true);
    expect(meta.content).toBe("index, follow");
  });

  it("robots.txt lo arma el servidor: el proxy de desarrollo y nginx lo reenvían", () => {
    expect(readFileSync("vite.config.ts", "utf8")).toContain("'/robots.txt': 'http://localhost:8080'");
    expect(readFileSync("nginx.conf", "utf8")).toContain("location = /robots.txt");
  });
});

describe("fotos con licencia libre y créditos", () => {
  it("solo se muestran fotos con licencia libre; las «Referencial académico» pasan a ilustración", () => {
    expect(CREDITOS_IMAGENES.every((c) => licenciaLibre(c.licencia))).toBe(true);
    expect(licenciaLibre("Referencial académico")).toBe(false);
    for (const codigo of ["11061555", "11087751", "11093320", "11104029", "11045763"]) {
      expect(fotoDePredio(codigo), codigo).toBeUndefined();
    }
    for (const codigo of Object.keys(FOTOS_LIBRES)) expect(fotoDePredio(codigo), codigo).toBeDefined();
    const creditos = readFileSync("public/img/casas/CREDITOS.md", "utf8");
    expect(creditos).not.toMatch(/\| Referencial académico \|/);
    for (const c of Object.values(FOTOS_LIBRES)) expect(creditos).toContain(c.archivo.replace("casas/", ""));
  });

  it("la guía de usos del lote es la misma que usa el servidor", () => {
    const interfaz = JSON.parse(readFileSync("src/contenido/usos-lote.json", "utf8"));
    const servidor = JSON.parse(readFileSync("../trustinmuebles-backend/src/main/resources/contenido/usos-lote.json", "utf8"));
    expect(servidor).toEqual(interfaz);
  });
});

describe("menú ☰: todas las opciones del rol", () => {
  const ROLES: (Rol | undefined)[] = [undefined, "COMPRADOR", "REVISOR", "ESPECIALISTA", "GESTOR", "PROPIETARIO", "ASESOR"];
  it("tiene las mismas vistas que el menú de escritorio, más «Cómo funciona»", () => {
    for (const rol of ROLES) {
      const m = opcionesMenuMovil(rol);
      expect(m.slice(0, -1)).toEqual(navegacion(rol));
      expect(m[m.length - 1]).toEqual({ clave: "como-funciona", etiqueta: "Cómo funciona", ruta: "/" });
    }
    expect(opcionesMenuMovil("ASESOR").map((e) => e.etiqueta))
      .toEqual(["Registrar", "Proyectos", "Expedientes", "Cartera", "Interesados", "Cómo funciona"]);
  });
});
