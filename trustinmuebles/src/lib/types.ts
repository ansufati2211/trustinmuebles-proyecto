// DTOs que devuelve el backend (trustinmuebles-backend)

export type Nivel = "VERDE" | "AMARILLO" | "ROJO";

export interface Usuario { id: number; nombre: string; email: string; rol: string }
export interface Sesion { token: string; usuario: Usuario }

export interface Tarjeta {
  id: number; title: string; location: string; price: number; beds: number; baths: number;
  area: number; legal: Nivel | null; struct: Nivel | null; img: string;
}

export interface Hallazgo {
  categoria: string; nivel: Nivel; codigo: string; titulo: string;
  explicacionSimple: string; recomendacion: string; textoRegistral: string | null;
}
export interface EvaluacionLegal {
  id: number; inmuebleId: number; nivel: Nivel; dominio: Nivel; gravamenes: Nivel; procesos: Nivel;
  hashCopia: string; fecha: string; desactualizada: boolean; hallazgos: Hallazgo[];
}
export interface Pin { id: number; x: number; y: number; severidad: Nivel; titulo: string; descripcion: string | null }
export interface Inspeccion {
  id: number; inmuebleId: number; planoId: number; inspector: string; dictamen: string | null;
  estado: string; nivel: Nivel; fecha: string; pines: Pin[];
}
export interface Plano { id: number; nombre: string; imagenUrl: string }
export interface InmuebleDetalle {
  id: number; titulo: string; ubicacion: string; direccion: string; descripcion: string | null;
  precioUsd: number; habitaciones: number; banos: number; areaM2: number; numeroPartida: string;
  vendedor: string; imagenUrl: string | null; semaforo: EvaluacionLegal | null;
  inspeccion: { inspeccion: Inspeccion; plano: Plano | null } | null;
}
export interface PartidaTraducida {
  numeroPartida: string; zonaRegistral: string; titularActual: string; areaRegistralM2: number;
  asientos: { tipo: string; textoRegistral: string; vigente: boolean; fecha: string | null; explicacionSimple: string }[];
}

export type EtapaCodigo = "OFERTA_ACEPTADA" | "AUDITORIA_APROBADA" | "FIRMA_MINUTA" | "ESCRITURA_PUBLICA" | "FINALIZADA";
export interface EtapaDto { codigo: EtapaCodigo; titulo: string; descripcion: string; estado: "COMPLETADA" | "ACTUAL" | "PENDIENTE"; fecha: string | null }
export interface DocumentoDto {
  id: number; nombre: string; tipo: string; estadoFirma: "NO_REQUIERE" | "PENDIENTE" | "FIRMADO";
  sha256: string; subidoEn: string; firmadoEn: string | null;
}
export interface TransaccionResumen {
  id: number; inmueble: { id: number; titulo: string; ubicacion: string; direccion: string; imagenUrl: string | null };
  etapa: EtapaCodigo; precioAcordado: number; creadaEn: string;
}
export interface TransaccionDetalle extends TransaccionResumen {
  gestor: Usuario | null; etapas: EtapaDto[]; documentos: DocumentoDto[];
  timeline: { id: number; tipo: string; descripcion: string; fecha: string; hash: string }[];
  mensajes: { id: number; autorId: number; autor: string; texto: string; fecha: string }[];
}
export interface Integridad { valida: boolean; eventos: number; primerEventoInvalido: number | null; ultimoHash: string }

export interface Propiedad {
  id: number; inmueble: { id: number; titulo: string; ubicacion: string; direccion: string };
  transaccionId: number; fechaCompra: string; valorCompra: number; valorEstimado: number; plusvaliaPct: number;
}
export interface ResumenPostventa { propietario: string; propiedades: Propiedad[] }
export interface Mantenimiento { id: number; propiedadId: number; fecha: string; servicio: string; inversionUsd: number; comprobanteUrl: string | null }
export interface Ticket {
  id: number; propiedadId: number; titulo: string; descripcion: string | null; proveedor: string | null;
  estado: "REPORTADO" | "INSPECCION_PROGRAMADA" | "EN_PROCESO" | "RESUELTO";
  prioridad: string; planoId: number; creadoEn: string; actualizadoEn: string;
}
