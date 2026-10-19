import type { LucideIcon } from "lucide-react";
import { AlertCircle, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** Esqueleto de carga: bloques grises que anuncian la forma del contenido. role=status para lectores de pantalla. */
export function Cargando({ texto, tarjetas = 0 }: { texto: string; tarjetas?: number }) {
  return (
    <div role="status" aria-live="polite" className="w-full">
      <span className="sr-only">{texto}</span>
      {tarjetas > 0 ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" aria-hidden="true">
          {Array.from({ length: tarjetas }, (_, i) => (
            <li key={i} className="overflow-hidden rounded-3xl border border-border bg-card shadow-tarjeta">
              <div className="aspect-[16/10] animate-pulse bg-muted" />
              <div className="space-y-3 p-5">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                <div className="flex gap-2 pt-2"><div className="h-6 w-28 animate-pulse rounded-full bg-muted" /><div className="h-6 w-28 animate-pulse rounded-full bg-muted" /></div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-24 text-center font-semibold text-tinta-2" aria-hidden="true">{texto}</p>
      )}
    </div>
  );
}

/** Estado vacío con un mensaje que dice qué falta y, si corresponde, qué hacer. */
export function Vacio({ icono: Icono, titulo, children, accion }: {
  icono: LucideIcon; titulo: string; children?: ReactNode; accion?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center">
      <Icono className="mx-auto mb-4 size-10 text-sem-gris" aria-hidden="true" />
      <h2 className="text-xl font-bold text-foreground">{titulo}</h2>
      {children && <div className="mx-auto mt-2 max-w-md text-tinta-2">{children}</div>}
      {accion && <div className="mt-6 flex justify-center">{accion}</div>}
    </div>
  );
}

/** Error de carga con el mensaje del servidor y un botón para reintentar. */
export function ErrorCarga({ mensaje, alReintentar }: { mensaje: string; alReintentar?: () => void }) {
  return (
    <div role="alert" className="rounded-3xl border border-sem-rojo/40 bg-sem-rojo-suave px-6 py-10 text-center">
      <AlertCircle className="mx-auto mb-3 size-8 text-sem-rojo-tinta" aria-hidden="true" />
      <p className="font-bold text-sem-rojo-tinta">No se pudo cargar la información</p>
      <p className="mt-1 text-sm text-sem-rojo-tinta">{mensaje}</p>
      {alReintentar && (
        <Button variant="outline" className="mt-5 rounded-xl bg-card" onClick={alReintentar}>
          <RotateCcw aria-hidden="true" /> Reintentar
        </Button>
      )}
    </div>
  );
}
