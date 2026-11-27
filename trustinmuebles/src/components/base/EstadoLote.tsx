import { CircleCheck, CircleDashed, CircleX, Clock, type LucideIcon } from "lucide-react";
import { ESTILO_LOTE, type EstadoPlano, type IconoEstado } from "@/lib/proyectos";
import { cn } from "@/lib/utils";

/**
 * v2.0 (RF40): el estado de un lote siempre con color fuerte + ícono + texto (NF01). Los colores son los tokens de
 * index.css (--lote-*): verde disponible, dorado separado, gris apagado vendido.
 */
export const ICONO_ESTADO_LOTE: Record<IconoEstado, LucideIcon> = {
  check: CircleCheck, reloj: Clock, equis: CircleX, guion: CircleDashed,
};

const TAMANOS = {
  sm: "gap-1 px-2.5 py-1 text-[11px] [&_svg]:size-3.5",
  md: "gap-1.5 px-3 py-1.5 text-xs [&_svg]:size-4",
  lg: "gap-2 px-4 py-2 text-sm [&_svg]:size-5",
};

/** Insignia sólida del estado del lote: «✓ Disponible», «⏱ Separado», «✕ Vendido». */
export function InsigniaEstadoLote({ estado, etiqueta, tamano = "md", className }: {
  estado: EstadoPlano; /** Texto a mostrar; por omisión, la etiqueta del estado. */ etiqueta?: string;
  tamano?: keyof typeof TAMANOS; className?: string;
}) {
  const est = ESTILO_LOTE[estado];
  const Icono = ICONO_ESTADO_LOTE[est.icono];
  return (
    <span data-insignia-estado={estado} style={{ background: est.fuerte, color: est.sobreFuerte, borderColor: est.fuerte }}
      className={cn("inline-flex max-w-full items-center rounded-full border font-extrabold leading-tight", TAMANOS[tamano], className)}>
      <Icono aria-hidden="true" className="shrink-0" />
      <span className="min-w-0">{etiqueta ?? est.etiqueta}</span>
    </span>
  );
}
