import type { EstadoPublicacion, EstadoTecnico, Publicacion, Rol, Usuario } from "./types";

/*
 * Qué muestra la interfaz según el rol. Es solo presentación: el servidor vuelve a comprobar cada permiso y responde 403
 * o 404 (I4). Ocultar un botón no es la protección.
 */

/** El botón «Solicitar inspección técnica» lo ve solo el comprador. */
export const veBotonSolicitar = (rol: Rol | undefined) => rol === "COMPRADOR";

/** El comprador puede solicitarla mientras no haya otra solicitud para ese inmueble. */
export const puedeSolicitarInspeccion = (rol: Rol | undefined, estado: EstadoTecnico) =>
  veBotonSolicitar(rol) && estado === "NO_SOLICITADA";

/**
 * Solo el especialista llena el informe, y solo si hay una solicitud. Si el gestor asignó la inspección (v0.7), solo el
 * especialista asignado; sin asignación, cualquiera.
 */
export const puedeEmitirInforme = (rol: Rol | undefined, estado: EstadoTecnico, asignado?: string | null,
  cuenta?: string | null) =>
  rol === "ESPECIALISTA" && estado !== "NO_SOLICITADA" && (!asignado || asignado === cuenta);

/** Solo el revisor edita la partida, los planos y el checklist. */
export const puedeEditarExpediente = (rol: Rol | undefined) => rol === "REVISOR";

// ------------------------------------------------------------------ navegación (v0.7)

export type Vista = "inicio" | "casos" | "cartera" | "mis-inmuebles" | "registrar";

export interface EnlaceNav { clave: Vista; etiqueta: string; ruta: string }

/** Vistas protegidas y los roles que pueden abrirlas. Las demás rutas solo exigen sesión. */
const ROLES_POR_VISTA: Record<Exclude<Vista, "inicio">, Rol[]> = {
  casos: ["COMPRADOR", "REVISOR", "ESPECIALISTA", "GESTOR", "PROPIETARIO"],
  cartera: ["GESTOR"],
  "mis-inmuebles": ["PROPIETARIO"],
  registrar: ["REVISOR"],
};

/** ¿Puede el rol abrir la vista? Lo usa la guarda de rutas: escribir la URL a mano no basta para entrar. */
export const puedeAbrirVista = (rol: Rol | undefined, vista: Vista) =>
  vista === "inicio" || (!!rol && ROLES_POR_VISTA[vista].includes(rol));

/**
 * Enlaces del menú principal según el rol. El propietario ve «Mis inmuebles» en lugar de la cartera completa; el gestor
 * agrega «Cartera». Sin sesión solo queda el inicio.
 */
export function navegacion(rol: Rol | undefined): EnlaceNav[] {
  const inicio: EnlaceNav = { clave: "inicio", etiqueta: "Inicio", ruta: "/" };
  if (!rol) return [inicio];
  if (rol === "PROPIETARIO") return [inicio, { clave: "mis-inmuebles", etiqueta: "Mis inmuebles", ruta: "/mis-inmuebles" }];
  const enlaces: EnlaceNav[] = [inicio, { clave: "casos", etiqueta: "Expedientes", ruta: "/casos" }];
  if (rol === "GESTOR") enlaces.push({ clave: "cartera", etiqueta: "Cartera", ruta: "/cartera" });
  if (rol === "REVISOR") enlaces.push({ clave: "registrar", etiqueta: "Registrar partida", ruta: "/casos/nueva" });
  return enlaces;
}

/** Qué enlace del menú resaltar según la ruta. El detalle de un expediente cuenta como «Expedientes». */
export function claveDeRuta(ruta: string): Vista | null {
  if (ruta === "/") return "inicio";
  if (ruta.startsWith("/cartera")) return "cartera";
  if (ruta.startsWith("/mis-inmuebles")) return "mis-inmuebles";
  if (ruta === "/casos/nueva") return "registrar";
  if (ruta.startsWith("/casos")) return "casos";
  return null;
}

// ------------------------------------------------------- captación y publicación (v0.7)

/** Solo el gestor publica, y solo con autorización vigente y si no está ya publicado (I14). No mira el color de A (I10). */
export const puedePublicar = (rol: Rol | undefined, p: Publicacion | null | undefined) =>
  rol === "GESTOR" && !!p && p.autorizada && p.estado !== "PUBLICADO";

/** Solo el gestor retira, y solo lo que está publicado. */
export const puedeRetirarPublicacion = (rol: Rol | undefined, p: Publicacion | null | undefined) =>
  rol === "GESTOR" && !!p && p.estado === "PUBLICADO";

/** ¿Es el propietario de este caso? El código viene del servidor; el comprador lo recibe en null. */
export const esPropietarioDe = (usuario: Usuario | null | undefined, p: Publicacion | null | undefined) =>
  usuario?.rol === "PROPIETARIO" && !!p?.propietarioCodigo && p.propietarioCodigo === usuario.codigoCuenta;

/** El propietario autoriza su propio caso cuando no hay autorización vigente (I13). El revisor nunca. */
export const puedeAutorizar = (usuario: Usuario | null | undefined, p: Publicacion | null | undefined) =>
  esPropietarioDe(usuario, p) && !p!.autorizada;

export const puedeRetirarAutorizacion = (usuario: Usuario | null | undefined, p: Publicacion | null | undefined) =>
  esPropietarioDe(usuario, p) && p!.autorizada;

// ------------------------------------------------------------------ cartera (v0.7)

/** Solo el comprador pide contacto, y solo sobre un caso publicado (no depende del color de A: I10). */
export const puedeSolicitarContacto = (rol: Rol | undefined, estado: EstadoPublicacion | null | undefined) =>
  rol === "COMPRADOR" && estado === "PUBLICADO";

/** El gestor asigna una inspección solicitada o en curso; emitida o sin solicitud, no. */
export const puedeAsignarEspecialista = (rol: Rol | undefined, estado: EstadoTecnico) =>
  rol === "GESTOR" && (estado === "SOLICITADA" || estado === "EN_INSPECCION");

/** El historial lo consultan el equipo y el propietario (de su caso: el servidor da 404 en otro). El comprador, no. */
export const puedeVerHistorial = (rol: Rol | undefined) =>
  rol === "REVISOR" || rol === "GESTOR" || rol === "ESPECIALISTA" || rol === "PROPIETARIO";
