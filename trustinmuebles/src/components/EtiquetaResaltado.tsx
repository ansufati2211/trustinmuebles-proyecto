import { resaltadoA } from "@/lib/resaltado";
import type { EstadoSemaforo } from "@/lib/types";

/** Etiqueta del resaltado de A: ícono y texto del estado, con el color del resaltado (B6). */
export function EtiquetaResaltado({ estado, className = "" }: { estado: EstadoSemaforo | null | undefined; className?: string }) {
  const r = resaltadoA(estado);
  return (
    <p className={`flex items-center gap-1.5 text-xs font-extrabold ${r.texto} ${className}`}>
      <r.Icono className="size-4 shrink-0" aria-hidden="true" />
      <span>Indicador A: {r.etiqueta}</span>
    </p>
  );
}
