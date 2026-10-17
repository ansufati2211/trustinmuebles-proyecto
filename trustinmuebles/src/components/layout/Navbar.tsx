import { Link, NavLink, useLocation } from "react-router";
import { Shield, User, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { AvisoSintetico } from "./AvisoSintetico";

const enlace = (activo: boolean) =>
  `px-4 py-2 rounded-full text-sm font-semibold transition-all ${activo ? "bg-gray-100 text-foreground" : "text-muted-foreground hover:bg-gray-50 hover:text-foreground"}`;

export function Navbar() {
  const location = useLocation();
  const { usuario, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full">
      <AvisoSintetico />
      <div className="border-b border-gray-100 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-y-2 py-2">

            <div className="flex flex-wrap items-center gap-3 md:gap-10">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="bg-primary/10 p-1.5 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">Trustinmuebles</span>
              </Link>

              <nav aria-label="Principal" className="flex items-center gap-1">
                <NavLink to="/" end className={({ isActive }) => enlace(isActive)}>Inicio</NavLink>
                <NavLink to="/casos" className={({ isActive }) => enlace(isActive)}>Expedientes</NavLink>
                <Link
                  to="/"
                  state={{ desplazarA: "como-funciona", t: location.key }}
                  className={enlace(false)}
                >
                  Cómo funciona
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {!usuario ? (
                <Button variant="outline" className="rounded-full h-9 px-5 font-bold" asChild>
                  <Link to="/login">Ingresar</Link>
                </Button>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                    <div className="bg-primary text-white rounded-full p-1">
                      <User className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-bold text-foreground">{usuario.codigoCuenta}</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      {usuario.rol === "REVISOR" ? "Revisor" : "Comprador"}
                    </span>
                  </div>
                  <button onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión"
                    className="p-2 rounded-full text-muted-foreground hover:bg-gray-100 hover:text-foreground transition-colors">
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
