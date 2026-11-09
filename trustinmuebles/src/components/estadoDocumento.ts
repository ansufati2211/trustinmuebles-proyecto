import { AlertTriangle, CheckCircle2, CircleHelp, type LucideIcon } from "lucide-react";
import type { TonoBadge } from "@/components/base/Badge";
import type { EstadoPlano } from "@/lib/types";

/** Insignia de un plano o de un documento del lote: el estado documental se dice con texto, color e ícono. */
export const ESTADO_DOCUMENTO: Record<EstadoPlano, { tono: TonoBadge; Icono: LucideIcon }> = {
  PRESENTADO: { tono: "verde", Icono: CheckCircle2 },
  OBSERVADO: { tono: "amarillo", Icono: AlertTriangle },
  NO_PRESENTADO: { tono: "gris", Icono: CircleHelp },
  NO_APLICA: { tono: "gris", Icono: CircleHelp },
};

/** ¿Hay un documento que mostrar? Solo si está presentado u observado. */
export const hayDocumento = (estado: EstadoPlano) => estado === "PRESENTADO" || estado === "OBSERVADO";
