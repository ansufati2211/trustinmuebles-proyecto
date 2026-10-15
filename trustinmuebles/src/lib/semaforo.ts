import type { Nivel } from "./types";

export type Tono = "success" | "warning" | "danger" | "pending";

/** Traduce el nivel del backend a los tonos de color que ya usa el sistema de diseño. */
export const tono = (n: Nivel | null | undefined): Tono =>
  n === "VERDE" ? "success" : n === "AMARILLO" ? "warning" : n === "ROJO" ? "danger" : "pending";

export const etiquetaLegal = (n: Nivel | null | undefined) =>
  n === "VERDE" ? "Legal OK" : n === "AMARILLO" ? "Legal Ámbar" : n === "ROJO" ? "Legal Rojo" : "Sin auditar";

export const etiquetaEstructura = (n: Nivel | null | undefined) =>
  n === "VERDE" ? "Aprobada" : n === "AMARILLO" ? "Observaciones" : n === "ROJO" ? "Riesgo alto" : "Sin inspección";

export const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
export const fecha = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "";
