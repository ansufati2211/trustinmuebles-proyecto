// Lee el texto de una partida pegado desde Conoce Aquí y lo divide en asientos. Es una ayuda: deduce lo que puede y
// deja el resto para que el revisor lo corrija en el formulario.
import type { EstadoAnotacion, TipoActo } from "./types";
import { plegar } from "./disociar";

export interface AsientoLeido {
  referencia: string; tipoActo: TipoActo; estado: EstadoAnotacion | null; fechaInscripcion: string;
  tituloNumero: string; fechaPresentacion: string; texto: string; canceloNumero: string; titulares: string;
}

export interface PartidaLeida {
  asientos: AsientoLeido[]; areaM2: string; linderos: string; antecedenteDominial: string; avisos: string[];
}

const MESES: Record<string, string> = {
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06", julio: "07", agosto: "08",
  setiembre: "09", septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12",
};

const dos = (n: string | number) => String(n).padStart(2, "0");

/** Convierte «14 de marzo de 2018», «14/03/2018», «14-03-2018» o «2018-03-14» en ISO (aaaa-mm-dd). */
export function fechaIso(texto: string): string {
  const f = plegar(texto);
  let m = f.match(/(\d{1,2})\s+de\s+([a-z]+)\s+(?:de|del)\s+(\d{4})/);
  if (m && MESES[m[2]]) return `${m[3]}-${MESES[m[2]]}-${dos(m[1])}`;
  m = f.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) return `${m[3]}-${dos(m[2])}-${dos(m[1])}`;
  m = f.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return "";
}

const FECHA = String.raw`(\d{1,2}\s+de\s+[a-z]+\s+(?:de|del)\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}-\d{2}-\d{2})`;

/** Primera fecha que aparece después de alguna de las etiquetas. */
function fechaTrasEtiqueta(texto: string, etiquetas: string): string {
  const m = plegar(texto).match(new RegExp(`(?:${etiquetas})[^0-9a-z]{0,40}?${FECHA}`));
  return m ? fechaIso(m[1]) : "";
}

export function deducirActo(rubro: string, texto: string): TipoActo {
  if (rubro === "E") return "CANCELACION";
  const f = plegar(texto);
  // El encabezado del asiento (sus primeras palabras) manda sobre el resto del texto.
  const cabeza = f.slice(0, 90);
  const reglas: [RegExp, TipoActo][] = [
    [/hipoteca/, "HIPOTECA"],
    [/embargo/, "EMBARGO"],
    [/anotacion de demanda|demanda/, "ANOTACION_DEMANDA"],
    [/medida cautelar|prohibicion de enajenar|inhibicion/, "MEDIDA_CAUTELAR"],
    [/bloqueo/, "BLOQUEO"],
    [/servidumbre/, "SERVIDUMBRE"],
    [/carga tecnica|restriccion|afectacion en uso/, "CARGA_TECNICA"],
    [/independizacion/, "INDEPENDIZACION"],
    [/sucesion|declaratoria de herederos|heredero/, "SUCESION"],
    [/compraventa|compra venta|adjudicacion|donacion|permuta/, "COMPRAVENTA"],
    [/primera inscripcion|inmatriculacion/, "PRIMERA_INSCRIPCION"],
  ];
  for (const zona of [cabeza, f]) for (const [re, acto] of reglas) if (re.test(zona)) return acto;
  return "OTRO";
}

function titulares(texto: string): string {
  const m = texto.match(/(?:a favor (?:de|del|de la)|adquirente[s]?:?|titular(?:es)?:?|propietari[oa]s?:?)\s+(.+?)(?=\.(?:\s|$)|,\s*(?:de estado|con domicilio|identificad|por la suma|en garant|quien)|;|\n|$)/i);
  if (!m) return "";
  let t = m[1].trim();
  if (/\b(?:S\.A|S\.A\.C|S\.R\.L|E\.I\.R\.L|S\.A\.A)$/i.test(t)) t += ".";
  return t;
}

/** Reconoce el número de área y los linderos, si aparecen fuera de los asientos. */
function descripcion(texto: string): Pick<PartidaLeida, "areaM2" | "linderos" | "antecedenteDominial"> {
  const area = texto.match(/[áa]rea[^0-9\n]{0,40}([\d.,]+)\s*m/i);
  let areaM2 = "";
  if (area) {
    const n = Number(area[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) areaM2 = n.toFixed(2);
  }
  const lind = texto.match(/linderos[^\n]*\n([\s\S]{15,800}?)(?=\n\s*\n|\bRUBRO\b|$)/i);
  const ant = texto.match(/antecedente\s+dominial[^\n]*\n?([\s\S]{10,400}?)(?=\n\s*\n|\bRUBRO\b|$)/i);
  return {
    areaM2,
    linderos: lind ? lind[1].replace(/\s*\n\s*/g, " ").trim() : "",
    antecedenteDominial: ant ? ant[1].replace(/\s*\n\s*/g, " ").trim() : "",
  };
}

export function leerPartida(entrada: string): PartidaLeida {
  const texto = entrada.normalize("NFC").replace(/\r/g, "");
  const avisos: string[] = [];
  const desc = descripcion(texto);

  // Cada asiento empieza en una línea con su número (C00001, D00001…), con o sin la palabra «ASIENTO».
  const inicio = /(?:^|\n)[ \t]*(?:ASIENTO[ \t]*:?[ \t]*)?([CDEF]\d{5})\b[ \t]*[:\-–]?/gi;
  const marcas = [...texto.matchAll(inicio)].map((m) => ({ ref: m[1].toUpperCase(), desde: (m.index ?? 0) + m[0].length, ini: m.index ?? 0 }));
  const asientos: AsientoLeido[] = [];
  const vistos = new Set<string>();

  marcas.forEach((m, i) => {
    if (vistos.has(m.ref)) { avisos.push(`El asiento ${m.ref} aparece más de una vez: se conservó la primera aparición.`); return; }
    vistos.add(m.ref);
    // Corta el cuerpo en el siguiente asiento o en un nuevo encabezado de rubro.
    let cuerpo = texto.slice(m.desde, i + 1 < marcas.length ? marcas[i + 1].ini : texto.length);
    cuerpo = cuerpo.replace(/\n\s*RUBRO\b[\s\S]*$/i, "").replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim();
    const rubro = m.ref[0];
    const tipoActo = deducirActo(rubro, cuerpo);
    const cancela = rubro === "E" ? (plegar(cuerpo).match(/\b(d\d{5})\b/)?.[1]?.toUpperCase() ?? "") : "";
    const titulo = cuerpo.match(/t[ií]tulo(?:\s+archivado)?\s*(?:n\.?\s?[°º]|n[uú]mero|n\.)?\s*[:.]?\s*((?:SIM-)?\d{4}-\d{4,8}|\d{6,10})/i);
    if (rubro === "E" && !cancela) avisos.push(`El asiento ${m.ref} no indica qué asiento D cancela: elígelo a mano.`);
    asientos.push({
      referencia: m.ref,
      tipoActo,
      estado: rubro === "D" ? "VIGENTE" : null,
      fechaInscripcion: fechaTrasEtiqueta(cuerpo, "fecha de inscripcion|inscrit[oa] el|inscripcion"),
      tituloNumero: titulo ? titulo[1] : "",
      fechaPresentacion: fechaTrasEtiqueta(cuerpo, "fecha de presentacion|presentad[oa] el|presentacion"),
      texto: cuerpo,
      canceloNumero: cancela,
      titulares: rubro === "C" ? titulares(cuerpo) : "",
    });
    if (rubro === "C" && !titulares(cuerpo)) avisos.push(`No se reconoció el titular del asiento ${m.ref}: escríbelo a mano.`);
  });

  if (asientos.length === 0 && texto.trim()) {
    avisos.push("No se reconocieron números de asiento (C00001, D00001…). Se creó una sola fila para completar a mano.");
    asientos.push({
      referencia: "F00001", tipoActo: "OTRO", estado: null, fechaInscripcion: "", tituloNumero: "",
      fechaPresentacion: "", texto: texto.replace(/\s*\n\s*/g, " ").trim().slice(0, 1500), canceloNumero: "", titulares: "",
    });
  }
  return { asientos, ...desc, avisos };
}
