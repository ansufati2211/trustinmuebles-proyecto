import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TonoBadge = "verde" | "amarillo" | "rojo" | "gris" | "info" | "arena" | "marca";

const TONOS: Record<TonoBadge, string> = {
  verde: "border-sem-verde/40 bg-sem-verde-suave text-sem-verde-tinta",
  amarillo: "border-sem-amarillo/50 bg-sem-amarillo-suave text-sem-amarillo-tinta",
  rojo: "border-sem-rojo/40 bg-sem-rojo-suave text-sem-rojo-tinta",
  gris: "border-sem-gris/50 bg-sem-gris-suave text-sem-gris-tinta",
  info: "border-info-tinta/25 bg-info-suave text-info-tinta",
  arena: "border-arena/40 bg-arena-suave text-arena-tinta",
  marca: "border-primary/25 bg-secondary text-secondary-foreground",
};

const TAMANOS = {
  sm: "gap-1 px-2.5 py-1 text-[11px] [&_svg]:size-3.5",
  md: "gap-1.5 px-3 py-1.5 text-xs [&_svg]:size-4",
  lg: "gap-2 px-4 py-2 text-sm [&_svg]:size-5",
};

/**
 * Insignia con ícono y texto obligatorios: un estado nunca se comunica solo con color (REQ-NF01).
 * El ícono es decorativo; el texto visible dice el estado.
 */
export function Badge({ tono, icono: Icono, children, tamano = "md", className, title }: {
  tono: TonoBadge; icono: LucideIcon; children: ReactNode; tamano?: keyof typeof TAMANOS; className?: string;
  title?: string;
}) {
  return (
    <span title={title}
      className={cn("inline-flex max-w-full items-center rounded-full border font-bold leading-tight", TONOS[tono], TAMANOS[tamano], className)}>
      <Icono aria-hidden="true" className="shrink-0" />
      <span className="min-w-0">{children}</span>
    </span>
  );
}
