import { ESTADOS } from "@/lib/semaforo";
import type { EstadoSemaforo } from "@/lib/types";

/** Píldora de estado: ícono + texto + color. Nunca se comunica solo con color (REQ-NF01). */
export function EstadoBadge({ estado, className = "" }: { estado: EstadoSemaforo | null | undefined; className?: string }) {
  if (!estado) {
    return (
      <span className={`inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground ${className}`}>
        Sin evaluar
      </span>
    );
  }
  const e = ESTADOS[estado];
  const Icono = e.Icono;
  return (
    <span className={`inline-flex items-center rounded-full border ${e.borde} ${e.fondo} px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider ${e.texto} ${className}`}>
      <Icono className="w-4 h-4 mr-1.5" aria-hidden="true" />
      Estado: {e.nombre}
    </span>
  );
}
