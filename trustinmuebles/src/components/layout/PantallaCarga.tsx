import { LogoMark } from "@/components/layout/Logo";

interface PantallaCargaProps {
  mensaje?: string;
  pantallaCompleta?: boolean;
}

export function PantallaCarga({ mensaje = "Verificando tu sesión", pantallaCompleta = true }: PantallaCargaProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`anim-fade flex w-full flex-col items-center justify-center gap-7 bg-background px-6 ${
        pantallaCompleta ? "min-h-screen" : "min-h-[60vh]"
      }`}
    >
      <LogoMark className="anim-pulse-soft h-16 w-16 rounded-2xl" />

      <div className="text-center">
        <p className="text-xl font-extrabold tracking-tight text-foreground">Trustinmuebles</p>
        <p className="mt-1 text-sm font-medium text-muted-foreground">{mensaje}</p>
      </div>

      {/* Barra de progreso indeterminada */}
      <div className="h-1.5 w-56 overflow-hidden rounded-full bg-primary/10" aria-hidden="true">
        <div className="anim-indeterminate h-full w-2/5 rounded-full bg-primary" />
      </div>

      {/* Esqueleto del contenido que viene */}
      <div className="w-full max-w-sm space-y-3" aria-hidden="true">
        <div className="h-3 w-full animate-pulse rounded-full bg-gray-200/80" />
        <div className="h-3 w-5/6 animate-pulse rounded-full bg-gray-200/80" />
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-gray-200/80" />
      </div>
    </div>
  );
}