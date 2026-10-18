// Limpieza de datos personales de una partida transcrita (Ley 29733, reglamento arts. 11.3 y 133.7).
// Todo ocurre en el navegador: los nombres originales nunca se envían al servidor.
// Es una ayuda, no una garantía: el revisor revisa la vista previa y confirma antes de guardar.

export interface Persona { etiqueta: string; nombre: string }
export interface ResultadoDisociacion { textos: string[]; personas: Persona[]; omitidos: number }
export interface OpcionesDisociacion {
  /** Nombres que el revisor marcó a mano porque no se detectaron solos. */
  extras?: string[];
  /** Nombres detectados que el revisor indicó que no son personas (por ejemplo, un lugar). */
  ignorar?: string[];
}

/** Minúsculas y sin tildes, conservando la longitud: sirve para buscar sin distinguir tildes ni mayúsculas. */
export const plegar = (s: string) => s.normalize("NFC").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const MAY = "A-ZÁÉÍÓÚÑÜ";
const MIN = "a-záéíóúñü";
const PALABRA_TITULO = `[${MAY}][${MIN}]+`;
const PALABRA_MAYUS = `[${MAY}]{2,}`;
const CONECTOR = "(?:(?:de|del|la|las|los)\\s+)";
// Dos a cinco palabras con mayúscula inicial. «y» no es conector: separa a dos personas.
const NOMBRE_TITULO = `${PALABRA_TITULO}(?:\\s+${CONECTOR}*${PALABRA_TITULO}){1,4}`;
const NOMBRE_MAYUS = `${PALABRA_MAYUS}(?:\\s+${CONECTOR}*${PALABRA_MAYUS}){1,4}`;

/** Palabras que delatan una institución, un lugar o un término jurídico: un nombre que las contiene no es una persona. */
const NO_PERSONA = new Set(`registro registral registrales predios predio zona oficina partida asiento asientos rubro titulo titulos
dominio gravamenes cargas cancelaciones descripcion inmueble antecedente dominial ica parcona tinguina subtanjalla
ocucaje aquijes lima peru departamento provincia distrito region urbanizacion urb habilitacion hab urbana
asociacion mz manzana lote calle avenida av jiron jr pasaje psje sector zonal codigo civil penal procesal notario notaria
publico publica escritura juzgado corte superior justicia poder judicial juez fiscal sala municipalidad gobierno regional
nacional superintendencia sunarp sbn cofopri banco caja financiera cooperativa inmobiliaria constructora empresa consorcio
sociedad anonima cerrada limitada comercial servicios inversiones compania estado republica ministerio vivienda universidad
colegio instituto hipoteca embargo demanda medida cautelar bloqueo servidumbre carga tecnica cancelacion compraventa
independizacion sucesion anotacion inscripcion presentacion resolucion administrativa expediente numero fecha monto precio
enero febrero marzo abril junio julio agosto setiembre septiembre octubre noviembre diciembre persona natural dni
registrador tribunal nacional ley decreto supremo articulo conoce aqui conocimiento soles dolares mercantil acreedor
deudor hipotecario hipotecaria garantia prestamo credito frente derecha izquierda fondo linderos medidas perimetricas`.split(/\s+/));

const HONORIFICOS = new Set(["senor", "senora", "senores", "don", "dona", "sr", "sra", "srta", "dr", "dra", "doctor", "doctora", "ing", "arq", "abg"]);

const SUFIJO_EMPRESA = /^[\s,]*(?:S\.\s?A\.\s?C\.?|S\.\s?A\.\s?A\.?|S\.\s?A\.?|S\.\s?R\.\s?L\.?|E\.\s?I\.\s?R\.\s?L\.?|S\.\s?C\.\s?R\.\s?L\.?|SAC\b|SAA\b|SRL\b|EIRL\b|Sociedad\b|Asociaci[oó]n\b)/i;
const PREFIJO_LUGAR = /(?:urb\.?|urbanizaci[oó]n|habilitaci[oó]n\s+urbana|hab\.?\s*urb\.?|asociaci[oó]n|calle|avenida|av\.?|jir[oó]n|jr\.?|pasaje|sector|distrito\s+de|provincia\s+de|departamento\s+de|partida|lote\s+matriz\s+de)\s*$/i;

/** Palabras que anuncian que lo que sigue es una persona. */
const DISPARADORES = [
  "a favor de", "a favor del", "a favor de la", "de propiedad de", "otorgada por", "otorgado por", "otorgante[s]?",
  "vendedor[a]?", "comprador[a]?", "c[oó]nyuge", "esposa", "esposo", "viuda", "viudo", "heredero[s]?", "herederos?",
  "titular(?:es)?", "propietari[oa]s?", "adquirente[s]?", "deudor[a]?", "acreedor[a]?", "demandante", "demandado[a]?",
  "representad[oa] por", "apoderad[oa]", "casad[oa] con", "soltero|soltera", "se[nñ]or(?:a|es)?", "do[nñ]a?", "sr\\.", "sra\\.",
  "donante", "donatario[a]?", "causante", "fallecid[oa]", "poderdante", "inscrito a nombre de", "a nombre de",
].join("|");

interface Hallazgo { texto: number; inicio: number; fin: number; nombre: string }

function limpiarNombre(nombre: string): string | null {
  const tokens = nombre.trim().split(/\s+/);
  while (tokens.length && HONORIFICOS.has(plegar(tokens[0].replace(/\.$/, "")))) tokens.shift();
  if (tokens.length < 2) return null;
  if (tokens.some((t) => NO_PERSONA.has(plegar(t)))) return null;
  return tokens.join(" ");
}

function esPersona(texto: string, inicio: number, fin: number, nombre: string): boolean {
  if (limpiarNombre(nombre) === null) return false;
  if (SUFIJO_EMPRESA.test(texto.slice(fin, fin + 30))) return false;
  if (PREFIJO_LUGAR.test(texto.slice(Math.max(0, inicio - 30), inicio))) return false;
  return true;
}

function detectar(textos: string[]): Hallazgo[] {
  const halladas: Hallazgo[] = [];
  const agregar = (t: number, texto: string, inicio: number, nombre: string) => {
    const limpio = limpiarNombre(nombre);
    const fin = inicio + nombre.length;
    if (limpio && esPersona(texto, inicio, fin, nombre)) {
      const desplazamiento = nombre.indexOf(limpio.split(/\s+/)[0]);
      halladas.push({ texto: t, inicio: inicio + Math.max(0, desplazamiento), fin, nombre: limpio });
    }
  };
  textos.forEach((texto, t) => {
    // 1. Después de una palabra que anuncia a una persona (también en mayúsculas, como las imprime el registro).
    //    El disparador no distingue mayúsculas; el nombre sí, y se busca justo después con una expresión pegajosa.
    const disparador = new RegExp(`(?:^|[^${MAY}${MIN}])(?:${DISPARADORES})[:\\s,]+`, "gi");
    for (const m of texto.matchAll(disparador)) {
      const desde = (m.index ?? 0) + m[0].length;
      for (const patron of [NOMBRE_TITULO, NOMBRE_MAYUS]) {
        const re = new RegExp(patron, "y");
        re.lastIndex = desde;
        const n = re.exec(texto);
        if (n) { agregar(t, texto, desde, n[0]); break; }
      }
    }
    // 2. Cualquier secuencia de palabras con mayúscula inicial que no sea una institución, un lugar ni una empresa.
    for (const m of texto.matchAll(new RegExp(NOMBRE_TITULO, "g"))) agregar(t, texto, m.index ?? 0, m[0]);
  });
  return halladas;
}

const ESCAPAR = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Reemplaza nombres, DNI, estado civil y domicilios. Cada persona recibe la misma etiqueta en todos los textos
 * («Persona natural 1», «Persona natural 2»…), numeradas por orden de aparición.
 */
export function disociar(textosEntrada: string[], opciones: OpcionesDisociacion = {}): ResultadoDisociacion {
  const textos = textosEntrada.map((t) => t.normalize("NFC"));
  const ignorar = new Set((opciones.ignorar ?? []).map(plegar));
  let omitidos = 0;

  // Datos que se omiten siempre, sin etiqueta.
  const omitir = (s: string): string => {
    const cambiar = (re: RegExp, por: string) => {
      s = s.replace(re, () => { omitidos++; return por; });
    };
    cambiar(/(?:\bd\.?\s?n\.?\s?i\.?\b|documento\s+nacional\s+de\s+identidad|identificad[oa]\s+con|carn[eé]\s+de\s+extranjer[ií]a|\bc\.?\s?e\.?\b)[^0-9\n]{0,30}\d{8,12}/gi, "[DNI omitido]");
    cambiar(/,?\s*de\s+estado\s+civil\s+\p{L}+/giu, "");
    cambiar(/,?\s*estado\s+civil\s*[:\-]?\s*\p{L}+/giu, "");
    // El domicilio llega hasta el final de la oración; los puntos de abreviaturas (Av., Jr., Mz.) no la terminan.
    s = s.replace(
      /((?:con\s+domicilio\s+(?:real\s+|legal\s+|fiscal\s+)?en|domiciliad[oa]\s+en)\s+)(?!\[)[^;\n]*?(?:(?<!\b(?:av|jr|mz|lt|urb|hab|psje|dpto|int|nro|cdra|sr|sra|n))\.(?=\s|$)|(?=;)|(?=\n)|$)/gi,
      (_m, pre) => {
        omitidos++;
        return `${pre}[domicilio omitido]`;
      });
    return s;
  };

  const hallazgos = detectar(textos).filter((h) => !ignorar.has(plegar(h.nombre)));
  const extras = (opciones.extras ?? []).map((e) => e.trim()).filter((e) => e.split(/\s+/).length >= 1 && e.length >= 3);
  extras.forEach((nombre) => {
    const pliegue = plegar(nombre);
    textos.forEach((texto, t) => {
      const re = new RegExp(ESCAPAR(pliegue).replace(/\s+/g, "\\s+"), "g");
      for (const m of plegar(texto).matchAll(re)) hallazgos.push({ texto: t, inicio: m.index ?? 0, fin: (m.index ?? 0) + m[0].length, nombre });
    });
  });

  // Orden de aparición para numerar, sin repetir a la misma persona (con o sin tildes y mayúsculas).
  hallazgos.sort((a, b) => a.texto - b.texto || a.inicio - b.inicio);
  const etiquetas = new Map<string, Persona>();
  for (const h of hallazgos) {
    const clave = plegar(h.nombre).replace(/\s+/g, " ");
    if (!etiquetas.has(clave)) etiquetas.set(clave, { etiqueta: `Persona natural ${etiquetas.size + 1}`, nombre: h.nombre });
  }

  // Todas las apariciones de cada nombre, en cada texto.
  const resultado = textos.map((texto, t) => {
    const plegado = plegar(texto);
    const rangos: { inicio: number; fin: number; etiqueta: string }[] = [];
    for (const [clave, persona] of etiquetas) {
      const re = new RegExp(`(?<![\\p{L}])${ESCAPAR(clave).replace(/ /g, "\\s+")}(?![\\p{L}])`, "gu");
      for (const m of plegado.matchAll(re)) rangos.push({ inicio: m.index ?? 0, fin: (m.index ?? 0) + m[0].length, etiqueta: persona.etiqueta });
    }
    rangos.sort((a, b) => a.inicio - b.inicio || b.fin - a.fin);
    let salida = "";
    let cursor = 0;
    for (const r of rangos) {
      if (r.inicio < cursor) continue; // se superpone con uno ya reemplazado
      salida += texto.slice(cursor, r.inicio) + r.etiqueta;
      cursor = r.fin;
    }
    salida += texto.slice(cursor);
    return omitir(salida);
  });

  return { textos: resultado, personas: [...etiquetas.values()], omitidos };
}
