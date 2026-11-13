// Genera los PDF de apoyo de la demostración, sin datos de nadie y sin dependencias (PDF escrito a mano).
//
// 1. (v0.8) Dos PDF para mostrar los límites de tamaño: un plano chico y un «escaneo» de unos 5,4 MB que el servidor optimiza
//    al subirlo. Van a la carpeta indicada (por defecto, la temporal del sistema) y no se guardan en el repositorio.
// 2. (v1.0, etapa 7) El kit en docs/demo/kit/pdf/: los 4 documentos del lote de INT-99000612 e INT-99000613 y las 4 láminas
//    de la vivienda INT-99000611, rotulados por la inmobiliaria. Ninguno se presenta como emitido por SUNARP, una
//    municipalidad o un colegio profesional: no llevan escudos, sellos, firmas, números de colegiatura ni códigos de
//    verificación.
//
// Uso: node scripts/generar-pdf-demo.mjs [carpeta-v08] [--sin-kit] [--kit=carpeta]
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ------------------------------------------------------------------------------------------------ PDF mínimo

/** Ensambla un PDF 1.4 a partir de objetos ya escritos (Buffer o texto). El objeto 1 debe ser el catálogo. */
function ensamblar(objetos, info) {
  const partes = [];
  const offsets = [];
  let largo = 0;
  const agregar = (b) => { partes.push(b); largo += b.length; };
  agregar(Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1"));
  objetos.forEach((cuerpo, i) => {
    const n = i + 1;
    offsets[n] = largo;
    agregar(Buffer.from(`${n} 0 obj\n`, "latin1"));
    agregar(Buffer.isBuffer(cuerpo) ? cuerpo : Buffer.from(cuerpo, "latin1"));
    agregar(Buffer.from("\nendobj\n", "latin1"));
  });
  const total = objetos.length;
  const xref = largo;
  let tabla = `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n <= total; n++) tabla += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  const infoRef = info ? ` /Info ${info} 0 R` : "";
  agregar(Buffer.from(`${tabla}trailer\n<< /Size ${total + 1} /Root 1 0 R${infoRef} >>\nstartxref\n${xref}\n%%EOF\n`, "latin1"));
  return Buffer.concat(partes);
}

/** Un PDF de una página con una imagen RGB sin comprimir: degradado con ruido leve, como un plano escaneado (v0.8). */
function pdfConImagen(ancho, alto) {
  const px = Buffer.alloc(ancho * alto * 3);
  let semilla = 7;
  const azar = () => (semilla = (semilla * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const i = (y * ancho + x) * 3;
      px[i] = Math.min(255, (x * 255) / ancho + azar() * 18);
      px[i + 1] = Math.min(255, (y * 255) / alto + azar() * 18);
      px[i + 2] = Math.min(255, 120 + azar() * 18);
    }
  }
  const contenido = "q 555 0 0 802 20 20 cm /Im1 Do Q";
  return ensamblar([
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>",
    Buffer.concat([
      Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${ancho} /Height ${alto} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${px.length} >>\nstream\n`, "latin1"),
      px,
      Buffer.from("\nendstream", "latin1"),
    ]),
    `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
  ]);
}

// Texto en WinAnsiEncoding: latín-1 más algunos signos tipográficos.
const WIN_ANSI = { "•": 0x95, "–": 0x96, "—": 0x97, "…": 0x85, "’": 0x92, "‘": 0x91, "“": 0x93, "”": 0x94 };
function winAnsi(s) {
  const bytes = [];
  for (const ch of s.normalize("NFC")) {
    const c = ch.codePointAt(0);
    const b = WIN_ANSI[ch] ?? (c <= 0xff ? c : 0x3f);
    if (b === 0x28 || b === 0x29 || b === 0x5c) bytes.push(0x5c);
    bytes.push(b);
  }
  return Buffer.from(bytes).toString("latin1");
}

/** Lienzo de una página: acumula operadores de dibujo y de texto. */
class Lienzo {
  constructor(ancho, alto) { this.ancho = ancho; this.alto = alto; this.ops = []; }
  texto(x, y, s, { tam = 10, negrita = false, gris = 0 } = {}) {
    this.ops.push(`BT ${gris} g /${negrita ? "F2" : "F1"} ${tam} Tf ${x} ${y} Td (${winAnsi(s)}) Tj ET`);
    return this;
  }
  /** Párrafo con corte de línea aproximado por cantidad de caracteres. Devuelve la y siguiente. */
  parrafo(x, y, s, { tam = 10, ancho = 90, interlineado = 1.45 } = {}) {
    const palabras = s.split(/\s+/);
    let linea = "";
    for (const p of palabras) {
      if ((linea + " " + p).trim().length > ancho) { this.texto(x, y, linea.trim(), { tam }); y -= tam * interlineado; linea = ""; }
      linea += " " + p;
    }
    if (linea.trim()) { this.texto(x, y, linea.trim(), { tam }); y -= tam * interlineado; }
    return y;
  }
  linea(x1, y1, x2, y2, grosor = 1) { this.ops.push(`${grosor} w 0 G ${x1} ${y1} m ${x2} ${y2} l S`); return this; }
  rect(x, y, w, h, { grosor = 1, relleno = null } = {}) {
    this.ops.push(relleno == null ? `${grosor} w 0 G ${x} ${y} ${w} ${h} re S` : `${relleno} g ${x} ${y} ${w} ${h} re f 0 g`);
    return this;
  }
  /** Marca de agua diagonal, gris claro. */
  marcaDeAgua(s) {
    const a = Math.PI / 6;
    const [c, n] = [Math.cos(a).toFixed(4), Math.sin(a).toFixed(4)];
    this.ops.push(`BT 0.88 g /F2 54 Tf ${c} ${n} ${-n} ${c} ${this.ancho * 0.18} ${this.alto * 0.3} Tm (${winAnsi(s)}) Tj ET 0 g`);
    return this;
  }
}

/** PDF de texto y dibujo vectorial, con Helvetica y metadatos del autor (la inmobiliaria). */
function pdfDeLienzos(lienzos, { titulo, asunto }) {
  const objetos = ["<< /Type /Catalog /Pages 2 0 R >>", null,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"];
  const hijos = [];
  for (const l of lienzos) {
    const contenido = l.ops.join("\n");
    const nPagina = objetos.length + 1;
    objetos.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${l.ancho} ${l.alto}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${nPagina + 1} 0 R >>`);
    objetos.push(`<< /Length ${Buffer.byteLength(contenido, "latin1")} >>\nstream\n${contenido}\nendstream`);
    hijos.push(`${nPagina} 0 R`);
  }
  objetos[1] = `<< /Type /Pages /Kids [${hijos.join(" ")}] /Count ${hijos.length} >>`;
  objetos.push(`<< /Title (${winAnsi(titulo)}) /Author (${winAnsi(ROTULO.autor)}) /Subject (${winAnsi(asunto)}) /Creator (${winAnsi("Trustinmuebles 1.0.0")}) >>`);
  return ensamblar(objetos, objetos.length);
}

// ------------------------------------------------------------------------------------------------ Kit v1.0

const ROTULO = {
  encabezado: "TRUSTINMUEBLES · INMOBILIARIA EN ICA",
  autor: "Trustinmuebles · Inmobiliaria en Ica",
  elaborado: "Documento informativo elaborado por la inmobiliaria Trustinmuebles.",
  profesional: "Profesional responsable: se registra al asignar al profesional.",
};

const LOTES = {
  "INT-99000612": {
    denominacion: "Mz. B Lote 14 · Hab. Urb. Las Dunas de Cachiche · Ica",
    ubicacion: "Mz. B Lote 14, Habilitación Urbana Las Dunas de Cachiche, distrito, provincia y departamento de Ica",
    area: "160.00", perimetro: "56.00", frente: 8, fondo: 20, calle: "Calle Los Espinos",
    vecinos: ["Lote 15 de la Mz. B", "Lote 13 de la Mz. B", "Lote 3 de la Mz. B"], zonificacion: "RDM",
    valor: "S/ 40,000", valorM2: "S/ 250",
  },
  "INT-99000613": {
    denominacion: "Mz. C Lote 6 · Hab. Urb. Las Dunas de Cachiche · Ica",
    ubicacion: "Mz. C Lote 6, Habilitación Urbana Las Dunas de Cachiche, distrito, provincia y departamento de Ica",
    area: "150.00", perimetro: "55.00", frente: 7.5, fondo: 20, calle: "Calle Los Espinos",
    vecinos: ["Lote 7 de la Mz. C", "Lote 5 de la Mz. C", "Lote 18 de la Mz. C"], zonificacion: "RDM",
    valor: "S/ 36,000", valorM2: "S/ 240",
  },
};

const VIVIENDA = {
  codigo: "INT-99000611", denominacion: "Mz. K Lote 9 · Urb. Los Viñedos de Ica · Ica",
  area: "180.00", construida: "120.00", frente: 9, fondo: 20,
};

/** Encabezado y pie comunes de un documento vertical (A4). */
function hojaVertical(titulo, codigo, denominacion, aviso) {
  const l = new Lienzo(595, 842);
  l.marcaDeAgua("REFERENCIAL");
  l.rect(40, 790, 515, 30, { relleno: 0.93 });
  l.texto(50, 800, ROTULO.encabezado, { tam: 12, negrita: true });
  l.texto(50, 760, titulo.toUpperCase(), { tam: 15, negrita: true });
  l.texto(50, 740, `Registro interno de cartera ${codigo} · ${denominacion}`, { tam: 9, gris: 0.3 });
  l.linea(40, 730, 555, 730, 0.6);
  l.linea(40, 70, 555, 70, 0.6);
  l.texto(50, 55, ROTULO.elaborado, { tam: 8 });
  l.texto(50, 43, aviso, { tam: 8 });
  l.texto(50, 31, "Generado el 13/11/2026 para el expediente del inmueble. Sin sellos ni firmas.", { tam: 8, gris: 0.35 });
  return l;
}

function tabla(l, x, y, filas, anchoEtiqueta = 170) {
  for (const [k, v] of filas) {
    l.texto(x, y, k, { tam: 10, negrita: true });
    l.texto(x + anchoEtiqueta, y, v, { tam: 10 });
    y -= 18;
  }
  return y;
}

/** Croquis del lote: rectángulo a escala con medidas y la calle al frente. */
function croquisLote(l, x, y, d, escala = 9) {
  const w = d.frente * escala, h = d.fondo * escala;
  l.rect(x, y, w, h, { grosor: 1.6 });
  l.texto(x + w / 2 - 14, y - 14, `${d.frente.toFixed(2)} ml`, { tam: 9 });
  l.texto(x + w + 6, y + h / 2, `${d.fondo.toFixed(2)} ml`, { tam: 9 });
  l.texto(x + 6, y + h / 2, `${d.area} m²`, { tam: 10, negrita: true });
  l.linea(x - 30, y - 26, x + w + 30, y - 26, 0.6);
  l.texto(x - 30, y - 40, d.calle, { tam: 9 });
  l.texto(x + w + 6, y + h - 10, "N", { tam: 12, negrita: true });
  l.linea(x + w + 10, y + h - 14, x + w + 10, y + h - 40, 1);
}

function documentosDelLote(codigo) {
  const d = LOTES[codigo];
  const docs = {};

  let l = hojaVertical("Plano perimétrico y de ubicación", codigo, d.denominacion,
    "No reemplaza el plano visado por la municipalidad ni la información que emite SUNARP.");
  let y = tabla(l, 50, 705, [["Ubicación", d.ubicacion.slice(0, 70)], ["", d.ubicacion.slice(70)],
    ["Área del terreno", `${d.area} m²`], ["Perímetro", `${d.perimetro} ml`], ["Escala", "Referencial, sin escala gráfica"]]);
  croquisLote(l, 200, y - 250, d);
  l.texto(50, y - 290, "Linderos:", { tam: 10, negrita: true });
  y = l.parrafo(50, y - 306, `Por el frente con la ${d.calle} en ${d.frente.toFixed(2)} ml; por la derecha entrando con el ${d.vecinos[0]} en ${d.fondo.toFixed(2)} ml; por la izquierda entrando con el ${d.vecinos[1]} en ${d.fondo.toFixed(2)} ml; por el fondo con el ${d.vecinos[2]} en ${d.frente.toFixed(2)} ml.`, { ancho: 95 });
  docs["plano-perimetrico.pdf"] = pdfDeLienzos([l], { titulo: `Plano perimétrico y de ubicación ${codigo}`, asunto: "Documento referencial elaborado por la inmobiliaria" });

  l = hojaVertical("Memoria descriptiva", codigo, d.denominacion,
    "Resume los datos de la partida y del plano perimétrico; no reemplaza la verificación legal con un abogado o notario.");
  y = 705;
  for (const [t, p] of [
    ["1. Generalidades", `La presente memoria describe el lote ${d.denominacion}, que la inmobiliaria ofrece en su cartera.`],
    ["2. Ubicación", `${d.ubicacion}.`],
    ["3. Área y perímetro", `El lote tiene un área de ${d.area} m² y un perímetro de ${d.perimetro} ml, según la descripción inscrita.`],
    ["4. Linderos y medidas perimétricas", `Frente: ${d.calle}, ${d.frente.toFixed(2)} ml. Derecha: ${d.vecinos[0]}, ${d.fondo.toFixed(2)} ml. Izquierda: ${d.vecinos[1]}, ${d.fondo.toFixed(2)} ml. Fondo: ${d.vecinos[2]}, ${d.frente.toFixed(2)} ml.`],
    ["5. Situación del terreno", "Lote de terreno sin construir, con acceso por vía pública. Los servicios disponibles se confirman en la visita."],
    ["6. Observaciones", "Los datos registrales se verifican con la partida. Las cargas y gravámenes figuran en la ficha registral del inmueble."],
  ]) {
    l.texto(50, y, t, { tam: 11, negrita: true });
    y = l.parrafo(50, y - 16, p, { ancho: 95 }) - 10;
  }
  docs["memoria-descriptiva.pdf"] = pdfDeLienzos([l], { titulo: `Memoria descriptiva ${codigo}`, asunto: "Documento referencial elaborado por la inmobiliaria" });

  l = hojaVertical("Resumen de zonificación y vías", codigo, d.denominacion,
    "No es un certificado: el certificado de zonificación y vías y el de parámetros urbanísticos los emite la municipalidad.");
  y = tabla(l, 50, 705, [["Zonificación consultada", `${d.zonificacion} (Residencial de densidad media)`],
    ["Vía de acceso", d.calle], ["Fuente de la consulta", "Plano de zonificación publicado; consulta hecha a mano"],
    ["Fecha de la consulta", "13/11/2026"]], 190);
  y = l.parrafo(50, y - 10, "La zonificación indicada orienta sobre los usos que suelen permitirse (vivienda unifamiliar o multifamiliar y comercio vecinal compatible). Antes de comprar o construir, solicita el certificado de parámetros urbanísticos y edificatorios a la municipalidad.", { ancho: 95 });
  docs["certificado-zonificacion.pdf"] = pdfDeLienzos([l], { titulo: `Resumen de zonificación y vías ${codigo}`, asunto: "Documento referencial elaborado por la inmobiliaria" });

  l = hojaVertical("Tasación referencial", codigo, d.denominacion,
    "Valor comercial estimado por la inmobiliaria; no es una tasación reglamentaria ni la firma un perito.");
  y = tabla(l, 50, 705, [["Área del terreno", `${d.area} m²`], ["Valor por m² de la zona", d.valorM2],
    ["Valor comercial estimado", d.valor], ["Método", "Comparación con lotes de la zona"], ["Fecha", "13/11/2026"]], 190);
  y = l.parrafo(50, y - 10, `${ROTULO.profesional} El valor es referencial y puede cambiar con el mercado, el estado del lote y la situación registral.`, { ancho: 95 });
  docs["tasacion.pdf"] = pdfDeLienzos([l], { titulo: `Tasación referencial ${codigo}`, asunto: "Documento referencial elaborado por la inmobiliaria" });
  return docs;
}

/** Lámina horizontal (A4 apaisada) con cajetín de la inmobiliaria. */
function lamina(especialidad, titulo, dibujar) {
  const v = VIVIENDA;
  const l = new Lienzo(842, 595);
  l.marcaDeAgua("REFERENCIAL");
  l.rect(20, 20, 802, 555, { grosor: 1.4 });
  // Cajetín.
  l.rect(572, 20, 250, 150, { grosor: 1 });
  l.rect(572, 145, 250, 25, { relleno: 0.93 });
  l.texto(580, 153, ROTULO.encabezado, { tam: 9, negrita: true });
  l.texto(580, 130, titulo, { tam: 10, negrita: true });
  l.texto(580, 114, `${v.codigo} · ${v.denominacion}`, { tam: 7 });
  l.texto(580, 100, `Área del terreno: ${v.area} m² · Área construida: ${v.construida} m²`, { tam: 7 });
  l.texto(580, 86, `Lámina ${especialidad} · Escala referencial · 13/11/2026`, { tam: 7 });
  l.texto(580, 72, ROTULO.profesional, { tam: 7 });
  l.texto(580, 50, ROTULO.elaborado, { tam: 6.5 });
  l.texto(580, 40, "Sin sellos ni firmas. No reemplaza los planos de la licencia municipal.", { tam: 6.5 });
  // Planta: dos pisos de 60 m² (6 x 10 m) sobre un terreno de 9 x 20 m.
  const e = 12, x0 = 60, y0 = 120;
  l.rect(x0, y0, v.frente * e, v.fondo * e, { grosor: 0.6 });
  l.texto(x0, y0 - 16, `Terreno ${v.frente.toFixed(2)} x ${v.fondo.toFixed(2)} ml`, { tam: 8 });
  for (const [piso, dx] of [["Primer piso", 0], ["Segundo piso", 260]]) {
    const x = x0 + 150 + dx, y = y0 + 40;
    l.rect(x, y, 6 * e, 10 * e, { grosor: 1.8 });
    l.texto(x, y - 14, `${piso} · 60.00 m²`, { tam: 8, negrita: true });
    dibujar(l, x, y, e, piso);
  }
  return pdfDeLienzos([l], { titulo: `${titulo} ${v.codigo}`, asunto: "Lámina referencial elaborada por la inmobiliaria" });
}

function laminasDeVivienda() {
  return {
    "plano-arquitectura.pdf": lamina("A-01", "Plano arquitectónico", (l, x, y, e, piso) => {
      l.linea(x, y + 5 * e, x + 6 * e, y + 5 * e, 1); l.linea(x + 3 * e, y, x + 3 * e, y + 5 * e, 1);
      const [a, b, c] = piso === "Primer piso" ? ["Sala", "Cocina", "Comedor"] : ["Dormitorio 1", "Baño", "Dormitorio 2"];
      l.texto(x + 6, y + 8 * e, a, { tam: 7 }); l.texto(x + 6, y + 2 * e, b, { tam: 7 }); l.texto(x + 3 * e + 6, y + 2 * e, c, { tam: 7 });
    }),
    "plano-estructuras.pdf": lamina("E-01", "Plano de estructuras", (l, x, y, e) => {
      for (const cx of [0, 3, 6]) for (const cy of [0, 5, 10]) l.rect(x + cx * e - 3, y + cy * e - 3, 6, 6, { relleno: 0 });
      l.texto(x + 6, y + 7 * e, "Columnas 25 x 25", { tam: 7 }); l.texto(x + 6, y + 6 * e, "Albañilería confinada", { tam: 7 });
    }),
    "plano-electricas.pdf": lamina("IE-01", "Plano de instalaciones eléctricas", (l, x, y, e) => {
      for (const [cx, cy] of [[1.5, 2.5], [4.5, 2.5], [1.5, 7.5], [4.5, 7.5]]) l.rect(x + cx * e - 4, y + cy * e - 4, 8, 8);
      l.texto(x + 6, y + 9 * e, "Tablero TG", { tam: 7 }); l.linea(x + 1.5 * e, y + 2.5 * e, x + 4.5 * e, y + 7.5 * e, 0.4);
    }),
    "plano-sanitarias.pdf": lamina("IS-01", "Plano de instalaciones sanitarias", (l, x, y, e) => {
      l.linea(x + e, y + e, x + 5 * e, y + e, 1.2); l.linea(x + 5 * e, y + e, x + 5 * e, y + 9 * e, 1.2);
      l.texto(x + 6, y + 1.6 * e, "Desagüe 4\"", { tam: 7 }); l.texto(x + 6, y + 8 * e, "Agua fría 1/2\"", { tam: 7 });
    }),
  };
}

// ------------------------------------------------------------------------------------------------ main

const args = process.argv.slice(2);
const sinKit = args.includes("--sin-kit");
const kitArg = args.find((a) => a.startsWith("--kit="));
const carpeta = args.find((a) => !a.startsWith("--")) ?? path.join(os.tmpdir(), "trustinmuebles-demo-v08");
mkdirSync(carpeta, { recursive: true });
const chico = path.join(carpeta, "plano-chico.pdf");
const grande = path.join(carpeta, "plano-escaneado-grande.pdf");
writeFileSync(chico, pdfConImagen(300, 200));
writeFileSync(grande, pdfConImagen(1700, 1100));
console.log(`PDF de la demo:\n  ${chico}\n  ${grande} (más de 5 MB: se optimiza al subirlo)`);

if (!sinKit) {
  const kit = kitArg ? path.resolve(kitArg.slice(6)) : path.join(RAIZ, "docs", "demo", "kit", "pdf");
  const escritos = [];
  const escribir = (sub, archivos) => {
    const dir = path.join(kit, sub);
    mkdirSync(dir, { recursive: true });
    for (const [nombre, datos] of Object.entries(archivos)) {
      writeFileSync(path.join(dir, nombre), datos);
      escritos.push(path.join(sub, nombre));
    }
  };
  escribir("INT-99000611", laminasDeVivienda());
  for (const codigo of Object.keys(LOTES)) escribir(codigo, documentosDelLote(codigo));
  console.log(`Kit (${escritos.length} PDF) en ${kit}:\n  ${escritos.join("\n  ")}`);
}
