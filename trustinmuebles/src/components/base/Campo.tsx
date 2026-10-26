import { useId } from "react";
import type { ReactElement, ReactNode } from "react";

export const claseCampo =
  "h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-all duration-300 placeholder:font-medium placeholder:text-tinta-2/70 hover:border-primary/40 focus:border-primary focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/15 aria-[invalid=true]:border-sem-rojo aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-sem-rojo/15";

export const claseAreaTexto = `${claseCampo} h-auto min-h-24 resize-y py-3 leading-relaxed`;

type Props = {
  etiqueta: string;
  ayuda?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactElement;
};

export function Campo({ etiqueta, ayuda, error, className = "", children }: Props) {
  const id = useId();
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const describe = [ayuda ? idAyuda : null, error ? idError : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-tinta-2">{etiqueta}</label>
      {children({ id, "aria-describedby": describe, "aria-invalid": error ? true : undefined })}
      {ayuda && <p id={idAyuda} className="mt-1.5 text-xs leading-relaxed text-tinta-2">{ayuda}</p>}
      {error && <p id={idError} className="mt-1.5 text-xs font-semibold text-sem-rojo-tinta">{error}</p>}
    </div>
  );
}