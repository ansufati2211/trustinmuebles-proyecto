import { EMPRESA } from "@/lib/empresa";

interface LogoMarkProps {
  className?: string;
}

/**
 * v1.0 (etapa 8): el logo de la inmobiliaria (LEDCONS), tal cual, sobre fondo blanco. Es decorativo: el nombre de la
 * empresa va siempre en texto al lado (o en el aria-label del enlace).
 */
export function LogoMark({ className = "w-10 h-10" }: LogoMarkProps) {
  return (
    <span
      aria-hidden="true"
      data-logo-empresa
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-marca-dorado/40 shadow-md shadow-marca-verde/20 ${className}`}
    >
      <img src={EMPRESA.logo} alt="" className="h-full w-full scale-[1.18] object-contain" decoding="async" />
    </span>
  );
}
