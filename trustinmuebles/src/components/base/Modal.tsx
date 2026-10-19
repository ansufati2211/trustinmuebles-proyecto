import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ENFOCABLES = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo modal accesible: aria-modal, título asociado, foco atrapado dentro, Escape y clic en el fondo cierran, y al
 * cerrar el foco vuelve al control que lo abrió. Bloquea el desplazamiento de la página mientras está abierto.
 */
export function Modal({ abierto, alCerrar, titulo, descripcion, children, pie, ancho = "md" }: {
  abierto: boolean; alCerrar: () => void; titulo: string; descripcion?: string; children: ReactNode; pie?: ReactNode;
  ancho?: "md" | "lg" | "xl";
}) {
  const idTitulo = useId();
  const idDescripcion = useId();
  const caja = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef(alCerrar);
  cerrarRef.current = alCerrar;

  useEffect(() => {
    if (!abierto) return;
    const previo = document.activeElement as HTMLElement | null;
    const desborde = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const primero = caja.current?.querySelector<HTMLElement>(ENFOCABLES);
    (primero ?? caja.current)?.focus();

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); cerrarRef.current(); return; }
      if (e.key !== "Tab" || !caja.current) return;
      const lista = Array.from(caja.current.querySelectorAll<HTMLElement>(ENFOCABLES)).filter((el) => el.offsetParent !== null);
      if (lista.length === 0) { e.preventDefault(); return; }
      const [ini, fin] = [lista[0], lista[lista.length - 1]];
      if (e.shiftKey && document.activeElement === ini) { e.preventDefault(); fin.focus(); }
      else if (!e.shiftKey && document.activeElement === fin) { e.preventDefault(); ini.focus(); }
    };
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = desborde;
      previo?.focus?.();
    };
  }, [abierto]);

  if (!abierto) return null;
  const anchos = { md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-foreground/55 backdrop-blur-[2px]" aria-hidden="true" onClick={() => cerrarRef.current()} />
      <div ref={caja} role="dialog" aria-modal="true" aria-labelledby={idTitulo}
        aria-describedby={descripcion ? idDescripcion : undefined} tabIndex={-1}
        className={cn("relative w-full max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-card shadow-elevada outline-none", anchos[ancho])}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-card px-6 py-5">
          <div className="min-w-0">
            <h2 id={idTitulo} className="text-lg font-bold text-foreground leading-snug">{titulo}</h2>
            {descripcion && <p id={idDescripcion} className="mt-1 text-sm text-tinta-2">{descripcion}</p>}
          </div>
          <button type="button" onClick={() => cerrarRef.current()} aria-label="Cerrar"
            className="shrink-0 rounded-full p-2 text-tinta-2 hover:bg-muted hover:text-foreground">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {pie && <div className="flex flex-wrap justify-end gap-3 border-t border-border px-6 py-4">{pie}</div>}
      </div>
    </div>,
    document.body,
  );
}
