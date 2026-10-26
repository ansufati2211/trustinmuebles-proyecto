import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  icono: LucideIcon;
  id?: string;
  descripcion?: string;
  derecha?: ReactNode;
  children: ReactNode;
};

export function TituloSeccion({ icono: Icono, id, descripcion, derecha, children }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
          <Icono className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id={id} className="text-xl font-extrabold tracking-tight text-foreground">{children}</h2>
          {descripcion && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-tinta-2">{descripcion}</p>}
        </div>
      </div>
      {derecha}
    </div>
  );
}