import { IndicadorA } from "@/components/base/Indicadores";
import type { EstadoSemaforo } from "@/lib/types";

/** Píldora del indicador A. Se conserva por compatibilidad: delega en IndicadorA (ícono + texto + color, REQ-NF01). */
export function EstadoBadge({ estado, className = "" }: { estado: EstadoSemaforo | null | undefined; className?: string }) {
  return <IndicadorA estado={estado} className={className} />;
}
