import { Link, NavLink, useLocation } from "react-router";
import { Info, LogOut, Shield, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import type { Rol } from "@/lib/types";

const ROL: Record<Rol, string> = {
  COMPRADOR: "Comprador", REVISOR: "Revisor", ESPECIALISTA: "Especialista", GESTOR: "Gestor", PROPIETARIO: "Propietario",
};

const enlace = (activo: boolean) =>
  `shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${activo ? "bg-secondary text-secondary-foreground" : "text-tinta-2 hover:bg-muted hover:text-foreground"}`;

/**
 * Barra superior. La franja fina reemplaza al aviso académico anterior sin perder su contenido (PA3, RN-05): es una
 * demostración, las partidas son ficticias o transcritas sin personas, y la información no certifica nada.
 */
export function TopBar() {
  const location = useLocation();
  const { usuario, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full">
      <div role="note" className="bg-primary-strong text-white">
        <div className="mx-auto flex max-w-7xl items-start gap-2 px-4 py-1.5 text-xs sm:items-center sm:px-6 lg:px-8">
          <Info className="mt-0.5 size-3.5 shrink-0 text-arena sm:mt-0" aria-hidden="true" />
          <p>
            <strong className="font-bold">Entorno de demostración.</strong> Partidas ficticias y transcritas de SUNARP sin
            nombres de personas; precios y profesionales simulados. Información referencial: no certifica saneamiento ni
            recomienda comprar.
          </p>
        </div>
      </div>
      <div className="border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Trustinmuebles, ir al inicio">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-white shadow-tarjeta">
              <Shield className="size-5" aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-extrabold tracking-tight text-foreground">Trustinmuebles</span>
              <span className="block text-[11px] font-semibold text-tinta-2">Inmobiliaria en Ica · transparencia precompra</span>
            </span>
          </Link>

          <nav aria-label="Principal" className="order-3 flex w-full items-center gap-1 overflow-x-auto md:order-none md:w-auto">
            <NavLink to="/" end className={({ isActive }) => enlace(isActive)}>Inicio</NavLink>
            <NavLink to="/casos" className={({ isActive }) => enlace(isActive)}>Cartera de inmuebles</NavLink>
            <Link to="/" state={{ desplazarA: "como-te-protegemos", t: location.key }} className={enlace(false)}>Cómo te protegemos</Link>
            <Link to="/" state={{ desplazarA: "fuentes", t: location.key }} className={enlace(false)}>Fuentes</Link>
          </nav>

          <div className="flex items-center gap-2">
            {!usuario ? (
              <Button className="h-9 rounded-full px-5" asChild>
                <Link to="/login">Ingresar</Link>
              </Button>
            ) : (
              <>
                <span className="flex items-center gap-2 rounded-full border border-border bg-superficie py-1 pl-1 pr-3">
                  <span className="grid size-7 place-items-center rounded-full bg-primary text-white">
                    <UserRound className="size-4" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-bold text-foreground">{usuario.codigoCuenta}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-secondary-foreground">
                    {ROL[usuario.rol]}
                  </span>
                </span>
                <button type="button" onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión"
                  className="rounded-full p-2 text-tinta-2 transition-colors hover:bg-muted hover:text-foreground">
                  <LogOut className="size-4" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
