import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";

type Tono = "ok" | "error" | "info";

const ESTILO: Record<Tono, { caja: string; Icono: typeof Info }> = {
  ok: { caja: "border-sem-verde/40 bg-sem-verde-suave text-sem-verde-tinta", Icono: CheckCircle2 },
  error: { caja: "border-sem-rojo/40 bg-sem-rojo-suave text-sem-rojo-tinta", Icono: AlertCircle },
  info: { caja: "border-info-tinta/20 bg-info-suave text-info-tinta", Icono: Info },
};

export function Mensaje({ tono, titulo, children, className = "" }: {
  tono: Tono; titulo?: string; children?: ReactNode; className?: string;
}) {
  const { caja, Icono } = ESTILO[tono];
  return (
    <div role={tono === "error" ? "alert" : "status"} className={`anim-enter flex gap-3 rounded-2xl border p-4 text-sm ${caja} ${className}`}>
      <Icono className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 font-semibold leading-relaxed">
        {titulo && <p className="mb-1 font-extrabold">{titulo}</p>}
        {children}
      </div>
    </div>
  );
}