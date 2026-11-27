/*
 * v1.0 (etapa 4): interés, citas y bandeja de interesados. Aquí vive la lógica sin React: tipos, etiquetas, la
 * validación del formulario público (la misma que hace el servidor, para avisar antes de enviar), el cuerpo del envío,
 * el enlace de WhatsApp y las fechas de la agenda. El servidor vuelve a validar todo.
 */

export type Modalidad = "VISITA_AL_LOTE" | "REUNION_EN_OFICINA" | "LLAMADA";
export type FranjaCita = "MANANA" | "TARDE";
export type Medio = "CELULAR" | "CORREO";
export type FormaPago = "CONTADO" | "FINANCIADO" | "POR_DEFINIR";
/** v2.0 (RF36): con Revisado y Acuerdo, el seguimiento va contactado → revisado → … → acuerdo → separación → venta. */
export type EtapaInteres =
  | "NUEVO" | "CONTACTADO" | "REVISADO" | "CITA_AGENDADA" | "VISITA_REALIZADA" | "ACUERDO" | "SEPARACION" | "VENTA"
  | "DESCARTADO";
export type EstadoCita = "SOLICITADA" | "CONFIRMADA" | "REPROGRAMADA" | "RECHAZADA";

export const MODALIDADES: { valor: Modalidad; etiqueta: string; ayuda: string }[] = [
  { valor: "VISITA_AL_LOTE", etiqueta: "Visita al lote", ayuda: "Un asesor te acompaña a conocer el lote." },
  { valor: "REUNION_EN_OFICINA", etiqueta: "Reunión en oficina", ayuda: "Revisas el plano y los documentos con un asesor." },
  { valor: "LLAMADA", etiqueta: "Llamada", ayuda: "Un asesor te llama para resolver tus dudas." },
];

export const FRANJAS: { valor: FranjaCita; etiqueta: string }[] = [
  { valor: "MANANA", etiqueta: "Mañana (9:00 a 13:00)" },
  { valor: "TARDE", etiqueta: "Tarde (14:00 a 18:00)" },
];

export const FORMAS_PAGO: { valor: FormaPago; etiqueta: string }[] = [
  { valor: "POR_DEFINIR", etiqueta: "Aún no lo decido" },
  { valor: "CONTADO", etiqueta: "Al contado" },
  { valor: "FINANCIADO", etiqueta: "Financiado" },
];

export const ETAPAS: { valor: EtapaInteres; etiqueta: string }[] = [
  { valor: "NUEVO", etiqueta: "Nuevo" },
  { valor: "CONTACTADO", etiqueta: "Contactado" },
  { valor: "REVISADO", etiqueta: "Revisado" },
  { valor: "CITA_AGENDADA", etiqueta: "Cita agendada" },
  { valor: "VISITA_REALIZADA", etiqueta: "Visita realizada" },
  { valor: "ACUERDO", etiqueta: "Acuerdo" },
  { valor: "SEPARACION", etiqueta: "Separación" },
  { valor: "VENTA", etiqueta: "Venta" },
  { valor: "DESCARTADO", etiqueta: "Descartado" },
];

export const etiquetaEtapa = (e: EtapaInteres) => ETAPAS.find((x) => x.valor === e)?.etiqueta ?? e;
export const etiquetaFranja = (f: FranjaCita | null | undefined) => (f === "TARDE" ? "Tarde" : f === "MANANA" ? "Mañana" : "");

// ------------------------------------------------------------------------------------------------- tipos de la API

export interface ConfigContacto { whatsapp: string | null; consentimientoVersion: string; consentimientoTexto: string }
export interface Recibido { recibido: boolean; conCita: boolean; mensaje: string }

export interface Interesado {
  id: number; creadoEn: string; origen: "CASO" | "LOTE" | "PROYECTO" | "GENERAL"; referencia: string | null;
  inmueble: string | null; casoCodigo: string | null; proyectoCodigo: string | null; loteClave: string | null;
  zona: string | null; tipo: "LOTE" | "VIVIENDA" | null; presupuestoMin: number | null; presupuestoMax: number | null;
  moneda: string | null; areaDeseada: number | null; formaPago: FormaPago; formaPagoEtiqueta: string; nombre: string;
  medio: Medio; contacto: string; etapa: EtapaInteres; etapaEtiqueta: string; responsable: string | null;
  proximaAccion: string | null; proximaAccionFecha: string | null; vencido: boolean; citaPorConfirmar: boolean;
  notas: number;
  /** v1.0 (etapa 8): por dónde llegó (WEB: el formulario público). */
  canal?: Canal; canalEtiqueta?: string;
}
export interface NotaInteres { id: number; texto: string; cuentaCodigo: string; creadaEn: string }
export interface OpcionCita { opcion: number; fecha: string; franja: FranjaCita; franjaEtiqueta: string }
export interface Cita {
  id: number; interesId: number; nombre: string | null; referencia: string | null; inmueble: string | null;
  modalidad: Modalidad; modalidadEtiqueta: string; opciones: OpcionCita[]; estado: EstadoCita; estadoEtiqueta: string;
  fechaAcordada: string | null; franjaAcordada: FranjaCita | null; franjaAcordadaEtiqueta: string | null;
  motivoRechazo: string | null; atendidaPor: string | null; creadaEn: string;
  /** v2.0 (RF35): asesor a cargo (el de la cita o, si no tiene, el responsable del interesado). */
  asesor?: string | null;
}
export interface InteresadoDetalle {
  interes: Interesado; mensaje: string | null; consentimientoVersion: string; consentimientoEn: string;
  notas: NotaInteres[]; citas: Cita[]; puedeMarcarLote: boolean;
  /** v1.0 (etapa 8): casilla del formulario o verbal (con la cuenta que lo registró). */
  consentimientoForma?: "FORMULARIO" | "VERBAL"; consentimientoFormaEtiqueta?: string; consentimientoRegistradoPor?: string | null;
  /** v2.0: historial de etapas (RF36), separación o venta vigente (RF41), descartes (RN31) y si se puede liberar (RF42). */
  historialEtapas?: CambioDeEtapa[]; separacion?: Separacion | null; descartes?: number; puedeLiberar?: boolean;
}

/** v2.0 (RF36): un cambio de etapa con quién lo hizo y cuándo. */
export interface CambioDeEtapa {
  desde: EtapaInteres; desdeEtiqueta: string; hacia: EtapaInteres; haciaEtiqueta: string; cuentaCodigo: string;
  registradoEn: string; motivo: string | null;
}

/** v2.0 (RF41): la separación (ACTIVA) o venta (VENDIDA) vigente del interesado. */
export interface Separacion { id: number; estado: "ACTIVA" | "VENDIDA"; conDeposito: boolean; creadaEn: string; creadaPor: string }

/** v2.0 (RF37): una cita del asesor en su día. */
export interface CitaDelDia { cita: Cita; fecha: string; franja: FranjaCita; franjaEtiqueta: string; porConfirmar: boolean }

/** v2.0 (RF37): el día del asesor (GET /interesados/mi-dia). */
export interface MiDia {
  cuenta: string; hoy: string; hoyCitas: CitaDelDia[]; proximas: CitaDelDia[]; seguimientosPendientes: number;
  seguimientosVencidos: number; alerta: boolean;
}
export interface CitaEnAgenda { cita: Cita; porConfirmar: boolean; opcion: number | null; franja: FranjaCita; franjaEtiqueta: string }
export interface Agenda { desde: string; hasta: string; dias: { fecha: string; citas: CitaEnAgenda[] }[] }
export interface Conteo { clave: string; etiqueta: string; interesados: number }
export interface ResumenDemanda {
  activos: number; porEtapa: Record<EtapaInteres, number>; porZona: Conteo[]; porTipo: Conteo[];
  porPresupuesto: Conteo[]; porProyecto: Conteo[];
}
export interface OpcionesBandeja {
  proyectos: { codigo: string; nombre: string; distrito: string | null }[]; responsables: string[];
  /** v2.0 (RN28): la cuenta que pide y si ve a todos (coordinación) o solo a los suyos y a los sin asignar. */
  cuenta?: string; veTodo?: boolean;
}

// ------------------------------------------------------------------------------------------------- v2.0 (tanda 2)

/**
 * RN28: a quién puede asignar la cuenta. Un coordinador, a cualquiera de la lista; un asesor, solo a sí mismo (o dejarlo
 * sin asignar). El servidor lo vuelve a validar.
 */
export function responsablesPermitidos(o: OpcionesBandeja | null | undefined): string[] {
  if (!o) return [];
  if (o.veTodo !== false || !o.cuenta) return o.responsables;
  return o.responsables.filter((r) => r === o.cuenta);
}

/** RN28: título de la bandeja: «Mis interesados» para un asesor; «Interesados» para quien coordina. */
export const tituloBandeja = (o: OpcionesBandeja | null | undefined) =>
  o && o.veTodo === false ? "Mis interesados" : "Interesados";

/** RF35: formulario de una cita agendada por el asesor. */
export interface FormularioCitaPanel { tipo: Modalidad | ""; fecha: string; franja: FranjaCita; fechaOpcional: string; franjaOpcional: FranjaCita }

export const formularioCitaVacio = (): FormularioCitaPanel =>
  ({ tipo: "", fecha: "", franja: "MANANA", fechaOpcional: "", franjaOpcional: "TARDE" });

/** RF35: el primer problema del formulario de cita, o null. Las fechas van desde hoy (el servidor lo vuelve a validar). */
export function validarCitaPanel(f: FormularioCitaPanel, hoy: string): string | null {
  if (!f.tipo) return "Elige el tipo de cita: visita al lote, reunión en oficina o llamada.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.fecha)) return "Indica la fecha principal.";
  if (f.fecha < hoy) return "La fecha principal no puede ser anterior a hoy.";
  if (f.fechaOpcional) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.fechaOpcional)) return "La fecha opcional no es válida.";
    if (f.fechaOpcional < hoy) return "La fecha opcional no puede ser anterior a hoy.";
    if (f.fechaOpcional === f.fecha && f.franjaOpcional === f.franja) return "La fecha opcional debe ser distinta de la principal.";
  }
  return null;
}

/** RF35: cuerpo de POST /interesados/{id}/citas. Sin fecha opcional, no se envía. */
export function cuerpoCitaPanel(f: FormularioCitaPanel): Record<string, string> {
  const c: Record<string, string> = { tipo: f.tipo, fecha: f.fecha, franja: f.franja };
  if (f.fechaOpcional) { c.fechaOpcional = f.fechaOpcional; c.franjaOpcional = f.franjaOpcional; }
  return c;
}

/** RN29: una venta con depósito ya no se retrotrae; la etapa queda fija. */
export const etapaBloqueada = (d: Pick<InteresadoDetalle, "separacion">) =>
  !!d.separacion && d.separacion.estado === "VENDIDA" && d.separacion.conDeposito;

/**
 * RF41 y RF42: con el lote separado o vendido para este interesado, la etapa solo avanza a Venta; para retroceder se
 * libera con motivo. Sin separación, todas las etapas.
 */
export function etapasDisponibles(d: Pick<InteresadoDetalle, "separacion" | "interes">): { valor: EtapaInteres; etiqueta: string }[] {
  if (!d.separacion) return ETAPAS;
  if (etapaBloqueada(d)) return ETAPAS.filter((e) => e.valor === d.interes.etapa);
  return ETAPAS.filter((e) => e.valor === d.interes.etapa || e.valor === "VENTA");
}

/** RF37: ¿mostrar el aviso grande? Solo con citas o llamadas hoy o mañana (lo decide el servidor en {@code alerta}). */
export const mostrarAlertaDia = (d: MiDia | null | undefined) => !!d && d.alerta && d.hoyCitas.length + d.proximas.length > 0;

/** RF37: «Hoy tienes 2 citas y 1 llamada» o «Mañana tienes 1 cita». */
export function textoAlertaDia(d: MiDia): string {
  const contar = (l: CitaDelDia[]) => {
    const llamadas = l.filter((c) => c.cita.modalidad === "LLAMADA").length;
    const citas = l.length - llamadas;
    const partes: string[] = [];
    if (citas) partes.push(`${citas} ${citas === 1 ? "cita" : "citas"}`);
    if (llamadas) partes.push(`${llamadas} ${llamadas === 1 ? "llamada" : "llamadas"}`);
    return partes.join(" y ");
  };
  const partes: string[] = [];
  if (d.hoyCitas.length) partes.push(`Hoy tienes ${contar(d.hoyCitas)}`);
  if (d.proximas.length) partes.push(`${partes.length ? "mañana" : "Mañana tienes"} ${contar(d.proximas)}`);
  return partes.join(" y ") + ".";
}

/** RF37: «3 seguimientos pendientes (1 vencido)». */
export function textoSeguimientos(d: Pick<MiDia, "seguimientosPendientes" | "seguimientosVencidos">): string {
  const n = d.seguimientosPendientes;
  if (n === 0) return "Sin seguimientos pendientes";
  const base = `${n} ${n === 1 ? "seguimiento pendiente" : "seguimientos pendientes"}`;
  return d.seguimientosVencidos ? `${base} (${d.seguimientosVencidos} ${d.seguimientosVencidos === 1 ? "vencido" : "vencidos"})` : base;
}

// ------------------------------------------------------------------------------------------------- formulario público

/** A qué se refiere el interés: un caso publicado, o un lote o un proyecto. {@code nombre} y {@code referencia}, para mostrar. */
export interface DestinoInteres {
  casoCodigo?: string; proyectoCodigo?: string; lote?: string; nombre: string; referencia: string;
  /**
   * v1.0 (etapa 5): lo que buscó en el asistente (zona, tipo, presupuesto y área), para que el asesor lo vea en la
   * bandeja. Un presupuesto escrito en el formulario reemplaza al de la búsqueda.
   */
  busqueda?: {
    zona?: string; tipo?: "LOTE" | "VIVIENDA"; presupuestoMin?: number; presupuestoMax?: number; moneda?: "PEN" | "USD";
    areaDeseada?: number;
  };
}

/** Una visita al lote exige un lote o un inmueble: en una búsqueda general solo se ofrecen la reunión y la llamada. */
export const modalidadesPara = (destino: DestinoInteres) =>
  destino.casoCodigo || destino.lote ? MODALIDADES : MODALIDADES.filter((m) => m.valor !== "VISITA_AL_LOTE");

export interface FormularioInteres {
  nombre: string; medio: Medio; contacto: string; formaPago: FormaPago; presupuestoMax: string; mensaje: string;
  quiereCita: boolean; modalidad: Modalidad; fecha1: string; franja1: FranjaCita; fecha2: string; franja2: FranjaCita;
  consentimiento: boolean;
  /** Campo trampa: oculto para las personas; si llega con algo, el servidor no guarda nada. */
  sitioWeb: string;
}

export const formularioVacio = (quiereCita = true): FormularioInteres => ({
  nombre: "", medio: "CELULAR", contacto: "", formaPago: "POR_DEFINIR", presupuestoMax: "", mensaje: "", quiereCita,
  modalidad: "VISITA_AL_LOTE", fecha1: "", franja1: "MANANA", fecha2: "", franja2: "TARDE", consentimiento: false,
  sitioWeb: "",
});

export const MAX_MENSAJE = 300;
const NOMBRE = /^\p{L}[\p{L}' -]{1,39}$/u;
const CORREO = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const OCHO_DIGITOS = /(?<!\d)\d{8}(?!\d)/;

/** «+51 912 345 678» → «912345678»; null si no es un celular peruano (9 dígitos que empiezan con 9). */
export function normalizarCelular(v: string): string | null {
  let d = v.replace(/[\s-]/g, "");
  if (d.startsWith("+51")) d = d.slice(3);
  else if (d.length === 11 && d.startsWith("51")) d = d.slice(2);
  return /^9\d{8}$/.test(d) ? d : null;
}

/** Fecha local de Lima en AAAA-MM-DD (la del servidor). */
export function hoyLima(ahora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(ahora);
}

export function sumarDias(iso: string, n: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + n));
  return f.toISOString().slice(0, 10);
}

/** Errores por campo, con los mismos criterios que el servidor. Vacío: se puede enviar. */
export function validarFormulario(f: FormularioInteres, hoy: string): Partial<Record<keyof FormularioInteres, string>> {
  const e: Partial<Record<keyof FormularioInteres, string>> = {};
  const nombre = f.nombre.trim().replace(/\s+/g, " ");
  if (!nombre) e.nombre = "Escribe tu nombre de pila.";
  else if (!NOMBRE.test(nombre)) e.nombre = "Solo tu nombre de pila, con letras.";
  const contacto = f.contacto.trim();
  if (!contacto) e.contacto = f.medio === "CORREO" ? "Escribe tu correo." : "Escribe tu celular.";
  else if (f.medio === "CORREO" && !CORREO.test(contacto.toLowerCase())) e.contacto = "El correo no es válido.";
  else if (f.medio === "CELULAR" && !normalizarCelular(contacto)) e.contacto = "El celular debe tener 9 dígitos y empezar con 9.";
  if (f.presupuestoMax.trim()) {
    const n = Number(f.presupuestoMax.replace(/[\s,]/g, ""));
    if (!Number.isFinite(n) || n <= 0) e.presupuestoMax = "Escribe un monto en soles, sin letras.";
  }
  if (f.mensaje.length > MAX_MENSAJE) e.mensaje = `Máximo ${MAX_MENSAJE} caracteres.`;
  else if (OCHO_DIGITOS.test(f.mensaje)) e.mensaje = "No escribas tu DNI ni otros números de documento.";
  if (f.quiereCita) {
    const desde = sumarDias(hoy, 1);
    const hasta = sumarDias(hoy, 90);
    if (!f.fecha1) e.fecha1 = "Elige una fecha.";
    else if (f.fecha1 < desde || f.fecha1 > hasta) e.fecha1 = "Elige una fecha desde mañana y dentro de 90 días.";
    if (f.fecha2 && (f.fecha2 < desde || f.fecha2 > hasta)) e.fecha2 = "Elige una fecha desde mañana y dentro de 90 días.";
    else if (f.fecha2 && f.fecha2 === f.fecha1 && f.franja2 === f.franja1) e.fecha2 = "La segunda opción es igual a la primera.";
  }
  if (!f.consentimiento) e.consentimiento = "Debes aceptar el uso de tus datos para que te contactemos.";
  return e;
}

/** Cuerpo del POST público. Nunca lleva DNI: solo nombre de pila y un medio de contacto. */
export function cuerpoInteres(destino: DestinoInteres, f: FormularioInteres, version: string) {
  const cuerpo: Record<string, unknown> = {
    nombre: f.nombre.trim().replace(/\s+/g, " "),
    medio: f.medio,
    contacto: f.medio === "CELULAR" ? normalizarCelular(f.contacto) ?? f.contacto.trim() : f.contacto.trim().toLowerCase(),
    formaPago: f.formaPago,
    consentimiento: f.consentimiento,
    consentimientoVersion: version,
  };
  if (destino.casoCodigo) cuerpo.casoCodigo = destino.casoCodigo;
  if (destino.proyectoCodigo) cuerpo.proyectoCodigo = destino.proyectoCodigo;
  if (destino.lote) cuerpo.lote = destino.lote;
  const b = destino.busqueda;
  if (b) {
    for (const k of ["zona", "tipo", "presupuestoMin", "presupuestoMax", "moneda", "areaDeseada"] as const) {
      if (b[k] != null && b[k] !== "") cuerpo[k] = b[k];
    }
  }
  if (f.mensaje.trim()) cuerpo.mensaje = f.mensaje.trim();
  if (f.presupuestoMax.trim()) {
    cuerpo.presupuestoMax = Number(f.presupuestoMax.replace(/[\s,]/g, ""));
    cuerpo.moneda = "PEN";
    // El mínimo de la búsqueda solo se conserva si sigue siendo coherente con el máximo escrito en soles.
    if (b?.moneda !== "PEN" || (b.presupuestoMin ?? 0) > (cuerpo.presupuestoMax as number)) delete cuerpo.presupuestoMin;
  }
  if (f.sitioWeb) cuerpo.sitioWeb = f.sitioWeb;
  if (f.quiereCita) {
    const opciones = [{ fecha: f.fecha1, franja: f.franja1 }];
    if (f.fecha2) opciones.push({ fecha: f.fecha2, franja: f.franja2 });
    cuerpo.cita = { modalidad: f.modalidad, opciones };
  }
  return cuerpo;
}

/** Mensaje armado para WhatsApp: «Hola, me interesa <lote o inmueble> (ref. <código>)». Sin referencia (una búsqueda), sin «ref.». */
export const mensajeWhatsapp = (nombre: string, referencia: string) =>
  referencia ? `Hola, me interesa ${nombre} (ref. ${referencia})` : `Hola, me interesa ${nombre}`;

/** Enlace de WhatsApp, o null si la inmobiliaria no configuró un número (app.contacto.whatsapp vacío). */
export function enlaceWhatsapp(numero: string | null | undefined, nombre: string, referencia: string): string | null {
  const d = (numero ?? "").replace(/\D/g, "");
  if (!d) return null;
  return `https://wa.me/${d}?text=${encodeURIComponent(mensajeWhatsapp(nombre, referencia))}`;
}

// ------------------------------------------------------------------------------------------------- bandeja

export const rutaInteresados = (f: { etapa?: string; proyecto?: string; responsable?: string; vencidos?: boolean }) => {
  const p = new URLSearchParams();
  if (f.etapa) p.set("etapa", f.etapa);
  if (f.proyecto) p.set("proyecto", f.proyecto);
  if (f.responsable) p.set("responsable", f.responsable);
  if (f.vencidos) p.set("vencidos", "true");
  const q = p.toString();
  return `/interesados${q ? `?${q}` : ""}`;
};

/** v1.0 (etapa 9): la misma bandeja (con los filtros aplicados) en CSV para Excel. */
export const rutaExportarInteresados = (f: Parameters<typeof rutaInteresados>[0]) =>
  rutaInteresados(f).replace(/^\/interesados/, "/interesados/exportar.csv");

/** v1.0 (etapa 9): ruta del aviso de interesados nuevos del menú. */
export const RUTA_NUEVOS = "/interesados/nuevos";
/** Evento que avisa al menú que la bandeja cambió (una etapa, un registro o una eliminación). */
export const EVENTO_INTERESADOS = "tm:interesados-cambio";
export const avisarCambioInteresados = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_INTERESADOS));
};

/** v1.0 (etapa 9): texto del aviso para lectores de pantalla. 0 o menos: sin aviso. */
export function textoAvisoNuevos(n: number): string | null {
  if (!Number.isFinite(n) || n <= 0) return null;
  return n === 1 ? "1 interesado nuevo" : `${n} interesados nuevos`;
}

/** Lo que se dibuja en la burbuja: hasta 99 y luego «99+». */
export const burbujaNuevos = (n: number) => (n > 99 ? "99+" : String(n));

export interface EtapaEmbudo { etapa: EtapaInteres; etiqueta: string; cantidad: number; porcentaje: number }
export interface FilaEmbudo { clave: string; etiqueta: string; total: number; etapas: EtapaEmbudo[] }
export interface Embudo { total: FilaEmbudo; porProyecto: FilaEmbudo[] }

/** «6 (35.3 %)»: cantidad y porcentaje con un decimal, con el punto decimal de es-PE como el resto del sitio. */
export function textoEtapaEmbudo(e: Pick<EtapaEmbudo, "cantidad" | "porcentaje">): string {
  const pct = Number(e.porcentaje).toLocaleString("es-PE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${e.cantidad} (${pct} %)`;
}

/** Se ofrece marcar el lote solo en Separación o en Venta, y con el interesado vinculado a un lote o inmueble. */
export const ofreceMarcarLote = (i: Pick<Interesado, "etapa" | "origen">) =>
  (i.etapa === "SEPARACION" || i.etapa === "VENTA") && (i.origen === "LOTE" || i.origen === "CASO");

/** Estado sugerido según la etapa: SEPARADO en Separación y VENDIDO en Venta. */
export const estadoSugerido = (e: EtapaInteres) => (e === "VENTA" ? "VENDIDO" : "SEPARADO");

/** «2026-11-16» → «lunes 16 de noviembre». */
export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).toLocaleDateString("es-PE", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  });
}

/** «2026-11-16» → «lun 16 nov». */
export function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).toLocaleDateString("es-PE", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
  });
}

/** Presupuesto legible: «hasta S/ 45,000», «S/ 30,000 a 45,000» o «sin presupuesto». */
export function textoPresupuesto(i: Pick<Interesado, "presupuestoMin" | "presupuestoMax" | "moneda">): string {
  const s = i.moneda === "USD" ? "US$" : "S/";
  const n = (x: number) => x.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (i.presupuestoMin != null && i.presupuestoMax != null) return `${s} ${n(i.presupuestoMin)} a ${n(i.presupuestoMax)}`;
  if (i.presupuestoMax != null) return `hasta ${s} ${n(i.presupuestoMax)}`;
  if (i.presupuestoMin != null) return `desde ${s} ${n(i.presupuestoMin)}`;
  return "sin presupuesto";
}

// ------------------------------------------------------------------------------------------------- registro desde el panel

/*
 * v1.0 (etapa 8): el asesor o el gestor registra a un interesado que llegó por llamada, oficina, WhatsApp o referido
 * (POST /interesados). Los mismos campos y criterios del formulario público, más el canal y la constancia de que el
 * interesado aceptó de palabra; el servidor guarda quién lo registró y cuándo. No hay límite por IP.
 */
export type Canal = "WEB" | "LLAMADA" | "OFICINA" | "WHATSAPP" | "REFERIDO";

export const CANALES_PANEL: { valor: Exclude<Canal, "WEB">; etiqueta: string }[] = [
  { valor: "LLAMADA", etiqueta: "Llamada" },
  { valor: "OFICINA", etiqueta: "Oficina" },
  { valor: "WHATSAPP", etiqueta: "WhatsApp" },
  { valor: "REFERIDO", etiqueta: "Referido" },
];

export const TEXTO_CONSENTIMIENTO_VERBAL =
  "El interesado aceptó de palabra que la inmobiliaria use su nombre y su contacto solo para responderle y coordinar, y sabe que puede pedir que se eliminen.";

export interface FormularioPanel {
  canal: Exclude<Canal, "WEB"> | ""; nombre: string; medio: Medio; contacto: string; proyectoCodigo: string; lote: string;
  zona: string; tipo: "" | "LOTE" | "VIVIENDA"; presupuestoMin: string; presupuestoMax: string; areaDeseada: string;
  formaPago: FormaPago; mensaje: string; consentimientoVerbal: boolean;
}

export const formularioPanelVacio = (): FormularioPanel => ({
  canal: "", nombre: "", medio: "CELULAR", contacto: "", proyectoCodigo: "", lote: "", zona: "", tipo: "",
  presupuestoMin: "", presupuestoMax: "", areaDeseada: "", formaPago: "POR_DEFINIR", mensaje: "", consentimientoVerbal: false,
});

const monto = (v: string) => Number(v.replace(/[\s,]/g, ""));

/** Errores por campo del registro desde el panel, con los criterios del servidor. Vacío: se puede enviar. */
export function validarFormularioPanel(f: FormularioPanel): Partial<Record<keyof FormularioPanel, string>> {
  const e: Partial<Record<keyof FormularioPanel, string>> = {};
  if (!f.canal) e.canal = "Indica por dónde llegó el interesado.";
  const nombre = f.nombre.trim().replace(/\s+/g, " ");
  if (!nombre) e.nombre = "Escribe el nombre de pila.";
  else if (!NOMBRE.test(nombre)) e.nombre = "Solo el nombre de pila, con letras (sin apellidos ni documentos).";
  const contacto = f.contacto.trim();
  if (!contacto) e.contacto = f.medio === "CORREO" ? "Escribe el correo." : "Escribe el celular.";
  else if (f.medio === "CORREO" && !CORREO.test(contacto.toLowerCase())) e.contacto = "El correo no es válido.";
  else if (f.medio === "CELULAR" && !normalizarCelular(contacto)) e.contacto = "El celular debe tener 9 dígitos y empezar con 9.";
  for (const k of ["presupuestoMin", "presupuestoMax", "areaDeseada"] as const) {
    if (f[k].trim() && (!Number.isFinite(monto(f[k])) || monto(f[k]) <= 0)) e[k] = "Escribe un número mayor que 0.";
  }
  if (!e.presupuestoMin && !e.presupuestoMax && f.presupuestoMin.trim() && f.presupuestoMax.trim()
    && monto(f.presupuestoMin) > monto(f.presupuestoMax)) e.presupuestoMin = "El mínimo no puede ser mayor que el máximo.";
  if (f.lote.trim() && !f.proyectoCodigo) e.lote = "Elige primero el proyecto del lote.";
  if (f.mensaje.length > MAX_MENSAJE) e.mensaje = `Máximo ${MAX_MENSAJE} caracteres.`;
  else if (OCHO_DIGITOS.test(f.mensaje)) e.mensaje = "No anotes DNI ni otros números de documento.";
  if (!f.consentimientoVerbal) e.consentimientoVerbal = "Confirma que el interesado aceptó de palabra.";
  return e;
}

/** Cuerpo de POST /interesados: solo los campos con valor. Nunca lleva DNI ni la casilla del formulario público. */
export function cuerpoRegistroPanel(f: FormularioPanel): Record<string, unknown> {
  const cuerpo: Record<string, unknown> = {
    canal: f.canal,
    consentimientoVerbal: f.consentimientoVerbal,
    nombre: f.nombre.trim().replace(/\s+/g, " "),
    medio: f.medio,
    contacto: f.medio === "CELULAR" ? normalizarCelular(f.contacto) ?? f.contacto.trim() : f.contacto.trim().toLowerCase(),
    formaPago: f.formaPago,
  };
  if (f.proyectoCodigo) cuerpo.proyectoCodigo = f.proyectoCodigo;
  if (f.proyectoCodigo && f.lote.trim()) cuerpo.lote = f.lote.trim().toUpperCase();
  if (f.zona.trim()) cuerpo.zona = f.zona.trim();
  if (f.tipo) cuerpo.tipo = f.tipo;
  if (f.presupuestoMin.trim()) cuerpo.presupuestoMin = monto(f.presupuestoMin);
  if (f.presupuestoMax.trim()) cuerpo.presupuestoMax = monto(f.presupuestoMax);
  if (cuerpo.presupuestoMin != null || cuerpo.presupuestoMax != null) cuerpo.moneda = "PEN";
  if (f.areaDeseada.trim()) cuerpo.areaDeseada = monto(f.areaDeseada);
  if (f.mensaje.trim()) cuerpo.mensaje = f.mensaje.trim();
  return cuerpo;
}
