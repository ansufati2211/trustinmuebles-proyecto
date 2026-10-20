import type { EstadoTecnico, Rol } from "./types";

/*
 * Qué muestra la interfaz según el rol. Es solo presentación: el servidor vuelve a comprobar cada permiso y responde 403
 * (I4). Ocultar un botón no es la protección.
 */

/** El botón «Solicitar inspección técnica» lo ve solo el comprador. */
export const veBotonSolicitar = (rol: Rol | undefined) => rol === "COMPRADOR";

/** El comprador puede solicitarla mientras no haya otra solicitud para ese inmueble. */
export const puedeSolicitarInspeccion = (rol: Rol | undefined, estado: EstadoTecnico) =>
  veBotonSolicitar(rol) && estado === "NO_SOLICITADA";

/** Solo el especialista llena el informe, y solo si hay una solicitud. */
export const puedeEmitirInforme = (rol: Rol | undefined, estado: EstadoTecnico) =>
  rol === "ESPECIALISTA" && estado !== "NO_SOLICITADA";

/** Solo el revisor edita la partida, los planos y el checklist. */
export const puedeEditarExpediente = (rol: Rol | undefined) => rol === "REVISOR";
