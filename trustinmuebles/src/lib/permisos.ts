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
 * Solo el especialista llena el informe, y solo si hay una solicitud y el gestor se la asignó. Sin asignación, nadie.
 */
export const puedeEmitirInforme = (rol: Rol | undefined, estado: EstadoTecnico, asignado?: string | null,
  cuenta?: string | null) =>
  rol === "ESPECIALISTA" && estado !== "NO_SOLICITADA" && !!asignado && asignado === cuenta;

/** v1.0: el asesor reúne los permisos del revisor y del gestor (igual que Rol.incluye en el servidor). */
export const actuaComoRevisor = (rol: Rol | undefined) => rol === "REVISOR" || rol === "ASESOR";
export const actuaComoGestor = (rol: Rol | undefined) => rol === "GESTOR" || rol === "ASESOR";

/** Solo el revisor (o el asesor) edita la partida, los planos y el checklist. */
export const puedeEditarExpediente = (rol: Rol | undefined) => actuaComoRevisor(rol);

// ------------------------------------------------------------------ navegación (v0.7)

export type Vista = "inicio" | "inmuebles" | "casos" | "cartera" | "mis-inmuebles" | "registrar" | "interesados";

export interface EnlaceNav { clave: Vista; etiqueta: string; ruta: string }

/** Vistas protegidas y los roles que pueden abrirlas. Las demás rutas solo exigen sesión. */
const ROLES_POR_VISTA: Record<Exclude<Vista, "inicio" | "inmuebles">, Rol[]> = {
  casos: ["COMPRADOR", "REVISOR", "ESPECIALISTA", "GESTOR", "PROPIETARIO", "ASESOR"],
  cartera: ["GESTOR", "ASESOR"],
  "mis-inmuebles": ["PROPIETARIO"],
  registrar: ["REVISOR", "ASESOR"],
  interesados: ["GESTOR", "ASESOR"],
};

/**
 * ¿Puede el rol abrir la vista? Lo usa la guarda de rutas: escribir la URL a mano no basta para entrar. El inicio y el
 * catálogo público (v1.0) se abren sin sesión.
 */
export const puedeAbrirVista = (rol: Rol | undefined, vista: Vista) =>
  vista === "inicio" || vista === "inmuebles" || (!!rol && ROLES_POR_VISTA[vista].includes(rol));

/**
 * Enlaces del menú principal según el rol. El propietario ve «Mis inmuebles» en lugar de la cartera completa; el gestor
 * agrega «Cartera». Sin sesión solo queda el inicio.
 */
export function navegacion(rol: Rol | undefined): EnlaceNav[] {
  const inicio: EnlaceNav = { clave: "inicio", etiqueta: "Inicio", ruta: "/" };
  // v1.0: sin sesión, el inicio y el catálogo público; el personal entra con «Ingresar».
  if (!rol) return [inicio, { clave: "inmuebles", etiqueta: "Inmuebles", ruta: "/inmuebles" }];
  // v1.0: el asesor trabaja con su menú propio. «Proyectos» abre la lista completa de expedientes de la cartera.
  if (rol === "ASESOR") {
    return [
      { clave: "registrar", etiqueta: "Registrar", ruta: "/casos/nueva" },
      { clave: "casos", etiqueta: "Proyectos", ruta: "/casos" },
      { clave: "cartera", etiqueta: "Cartera", ruta: "/cartera" },
      { clave: "interesados", etiqueta: "Interesados", ruta: "/interesados" },
    ];
  }
  if (rol === "PROPIETARIO") return [inicio, { clave: "mis-inmuebles", etiqueta: "Mis inmuebles", ruta: "/mis-inmuebles" }];
  const enlaces: EnlaceNav[] = [inicio, { clave: "casos", etiqueta: "Expedientes", ruta: "/casos" }];
  if (rol === "GESTOR") enlaces.push({ clave: "cartera", etiqueta: "Cartera", ruta: "/cartera" });
  if (rol === "REVISOR") enlaces.push({ clave: "registrar", etiqueta: "Registrar partida", ruta: "/casos/nueva" });
  return enlaces;
}

/** Qué enlace del menú resaltar según la ruta. El detalle de un expediente cuenta como «Expedientes». */
export function claveDeRuta(ruta: string): Vista | null {
  if (ruta === "/") return "inicio";
  // v1.0 (etapa 3a): la página de un proyecto y la ficha de un lote son parte del catálogo público.
  if (ruta.startsWith("/inmuebles") || ruta.startsWith("/proyectos")) return "inmuebles";
  if (ruta.startsWith("/interesados")) return "interesados";
  if (ruta.startsWith("/cartera")) return "cartera";
  if (ruta.startsWith("/mis-inmuebles")) return "mis-inmuebles";
  if (ruta === "/casos/nueva") return "registrar";
  if (ruta.startsWith("/casos")) return "casos";
  return null;
}

// ------------------------------------------------------- captación y publicación (v0.7)

/** Solo el gestor publica, y solo con autorización vigente y si no está ya publicado (I14). No mira el color de A (I10). */
export const puedePublicar = (rol: Rol | undefined, p: Publicacion | null | undefined) =>
  actuaComoGestor(rol) && !!p && p.autorizada && p.estado !== "PUBLICADO";

/** Solo el gestor retira, y solo lo que está publicado. */
export const puedeRetirarPublicacion = (rol: Rol | undefined, p: Publicacion | null | undefined) =>
  actuaComoGestor(rol) && !!p && p.estado === "PUBLICADO";

/** ¿Es el propietario de este caso? El código viene del servidor; el comprador lo recibe en null. */
export const esPropietarioDe = (usuario: Usuario | null | undefined, p: Publicacion | null | undefined) =>
  usuario?.rol === "PROPIETARIO" && !!p?.propietarioCodigo && p.propietarioCodigo === usuario.codigoCuenta;

/** v1.0: ¿el inmueble es de la inmobiliaria? Sin el dato, se trata como de un particular. */
export const esDeLaInmobiliaria = (p: Publicacion | null | undefined) => p?.titularidadComercial === "INMOBILIARIA";

/**
 * ¿Quién registra la autorización? En un caso de un particular, solo su propietario (I13); en uno de la inmobiliaria
 * (v1.0), el asesor o el gestor en su nombre. El revisor nunca.
 */
const registraAutorizacion = (usuario: Usuario | null | undefined, p: Publicacion | null | undefined) =>
  esDeLaInmobiliaria(p) ? actuaComoGestor(usuario?.rol) : esPropietarioDe(usuario, p);

/** Se autoriza cuando no hay autorización vigente. */
export const puedeAutorizar = (usuario: Usuario | null | undefined, p: Publicacion | null | undefined) =>
  registraAutorizacion(usuario, p) && !p!.autorizada;

export const puedeRetirarAutorizacion = (usuario: Usuario | null | undefined, p: Publicacion | null | undefined) =>
  registraAutorizacion(usuario, p) && p!.autorizada;

// ------------------------------------------------------------------ cartera (v0.7)

/** Solo el comprador pide contacto, y solo sobre un caso publicado (no depende del color de A: I10). */
export const puedeSolicitarContacto = (rol: Rol | undefined, estado: EstadoPublicacion | null | undefined) =>
  rol === "COMPRADOR" && estado === "PUBLICADO";

/** El gestor asigna una inspección solicitada o en curso; emitida o sin solicitud, no. */
export const puedeAsignarEspecialista = (rol: Rol | undefined, estado: EstadoTecnico) =>
  actuaComoGestor(rol) && (estado === "SOLICITADA" || estado === "EN_INSPECCION");

/** El historial lo consultan el equipo y el propietario (de su caso: el servidor da 404 en otro). El comprador, no. */
export const puedeVerHistorial = (rol: Rol | undefined) =>
  rol === "REVISOR" || rol === "GESTOR" || rol === "ESPECIALISTA" || rol === "PROPIETARIO" || rol === "ASESOR";
