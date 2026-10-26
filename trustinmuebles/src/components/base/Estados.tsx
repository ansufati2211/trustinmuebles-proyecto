import type { LucideIcon } from "lucide-react";
import { AlertCircle, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

const brillo =
  "relative overflow-hidden bg-muted before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent";

export function Cargando({ texto, tarjetas = 0 }: { texto: string; tarjetas?: number }) {
  return (
    <div role="status" aria-live="polite" className="w-full">
      <span className="sr-only">{texto}</span>
      {tarjetas > 0 ? (
        <ul className="grid grid-cols-1 gap-6 pb-12 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
          {Array.from({ length: tarjetas }, (_, i) => (
            <li key={i} className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-tarjeta">
              <div className={`aspect-[16/10] ${brillo} animate-pulse`} />
              <div className="space-y-4 p-5">
                <div className="space-y-2.5">
                  <div className={`h-5 w-4/5 rounded-lg ${brillo} animate-pulse`} />
                  <div className={`h-4 w-1/2 rounded-lg ${brillo} animate-pulse`} />
                </div>
                <div className="space-y-2 rounded-2xl border border-border p-3.5">
                  <div className={`h-6 w-36 rounded-full ${brillo} animate-pulse`} />
                  <div className={`h-6 w-44 rounded-full ${brillo} animate-pulse`} />
                </div>
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div className={`h-6 w-28 rounded-full ${brillo} animate-pulse`} />
                  <div className={`h-9 w-32 rounded-xl ${brillo} animate-pulse`} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-4 py-24" aria-hidden="true">
          <span className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-center font-semibold text-tinta-2">{texto}</p>
        </div>
      )}
    </div>
  );
}

export function Vacio({ icono: Icono, titulo, children, accion }: {
  icono: LucideIcon; titulo: string; children?: ReactNode; accion?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border-2 border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="pointer-events-none absolute left-1/2 top-0 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[80px]" aria-hidden="true" />
      <div className="relative">
        <span className="mx-auto mb-5 flex size-16 items-center justify-center rounded-3xl bg-secondary text-primary shadow-sm">
          <Icono className="size-8" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-extrabold tracking-tight text-foreground">{titulo}</h2>
        {children && <div className="mx-auto mt-2 max-w-md leading-relaxed text-tinta-2">{children}</div>}
        {accion && <div className="mt-7 flex justify-center">{accion}</div>}
      </div>
    </div>
  );
}

export function ErrorCarga({ mensaje, alReintentar }: { mensaje: string; alReintentar?: () => void }) {
  return (
    <div role="alert" className="rounded-[2rem] border border-sem-rojo/40 bg-sem-rojo-suave px-6 py-12 text-center">
      <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-white/70 text-sem-rojo-tinta shadow-sm">
        <AlertCircle className="size-7" aria-hidden="true" />
      </span>
      <p className="text-lg font-extrabold text-sem-rojo-tinta">No se pudo cargar la información</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-sem-rojo-tinta">{mensaje}</p>
      {alReintentar && (
        <Button variant="outline" className="mt-6 bg-card" onClick={alReintentar}>
          <RotateCcw aria-hidden="true" /> Reintentar
        </Button>
      )}
    </div>
  );
}