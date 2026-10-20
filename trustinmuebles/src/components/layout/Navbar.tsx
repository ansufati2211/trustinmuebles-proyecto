import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { User, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { LogoMark } from "@/components/layout/Logo";

const enlaceBase =
  "relative z-10 px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-300";
const enlaceInactivo = "text-muted-foreground hover:text-foreground";
const enlaceActivo = "text-primary";

/** Botón "Acceder" con efecto magnético sutil y barrido de luz al pasar el mouse. */
function BotonAcceder() {
  const ref = useRef<HTMLAnchorElement>(null);

  const mover = (e: MouseEvent<HTMLAnchorElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${x * 0.2}px, ${y * 0.3}px)`;
  };

  const salir = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <Link
      ref={ref}
      to="/login"
      onMouseMove={mover}
      onMouseLeave={salir}
      className="btn-glint inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 sm:px-6 text-sm font-bold text-white shadow-md shadow-primary/25 transition-[transform,box-shadow] duration-300 ease-expo hover:shadow-lg hover:shadow-primary/35 active:scale-[0.97]"
    >
      Acceder
    </Link>
  );
}

export function Navbar() {
  const location = useLocation();
  const { usuario, logout } = useAuth();
  const [conScroll, setConScroll] = useState(false);

  // Sombra más marcada al hacer scroll
  useEffect(() => {
    const alScroll = () => setConScroll(window.scrollY > 12);
    alScroll();
    window.addEventListener("scroll", alScroll, { passive: true });
    return () => window.removeEventListener("scroll", alScroll);
  }, []);

  // Indicador activo deslizante
  const claveActiva =
    location.pathname === "/" ? "inicio" : location.pathname.startsWith("/casos") ? "casos" : null;

  const enlacesRef = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [pildora, setPildora] = useState<{ left: number; width: number } | null>(null);

  const medir = useCallback(() => {
    const el = claveActiva ? enlacesRef.current[claveActiva] : null;
    setPildora(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
  }, [claveActiva]);

  useLayoutEffect(() => {
    medir();
    window.addEventListener("resize", medir);
    // Si la fuente tarda en cargar, los anchos cambian: se vuelve a medir.
    document.fonts?.ready.then(medir);
    return () => window.removeEventListener("resize", medir);
  }, [medir]);

  return (
    /* Contenedor fijo flotante: ocupa de 16px a 80px desde arriba */
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <header className="w-full max-w-6xl pointer-events-auto">
        <div
          className={`rounded-full border px-3 sm:px-5 h-16 flex items-center justify-between backdrop-blur-xl transition-all duration-500 ease-expo ${
            conScroll
              ? "bg-white/90 border-gray-200 shadow-lg shadow-gray-300/40"
              : "bg-white/70 border-white/60 shadow-md shadow-gray-200/40"
          }`}
        >
          <div className="flex items-center gap-4 md:gap-8 min-w-0">
            <Link to="/" className="flex items-center gap-2.5 group shrink-0" aria-label="Trustinmuebles, ir al inicio">
              <LogoMark className="w-10 h-10 transition-transform duration-500 ease-expo group-hover:scale-105 group-hover:-rotate-3" />
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground group-hover:text-primary transition-colors duration-300">
                Trustinmuebles
              </span>
            </Link>

            <nav
              aria-label="Principal"
              className="relative hidden md:flex items-center gap-1 bg-gray-50/70 p-1 rounded-full border border-gray-100"
            >
              {/* Píldora que se desliza hacia el enlace activo */}
              <span
                aria-hidden="true"
                className={`absolute top-1 bottom-1 rounded-full bg-primary/10 transition-[left,width,opacity] duration-500 ease-expo ${
                  pildora ? "opacity-100" : "opacity-0"
                }`}
                style={{ left: pildora?.left ?? 0, width: pildora?.width ?? 0 }}
              />

              <Link
                ref={(el) => { enlacesRef.current.inicio = el; }}
                to="/"
                aria-current={claveActiva === "inicio" ? "page" : undefined}
                className={`${enlaceBase} ${claveActiva === "inicio" ? enlaceActivo : enlaceInactivo}`}
              >
                Inicio
              </Link>
              <Link
                ref={(el) => { enlacesRef.current.casos = el; }}
                to="/casos"
                aria-current={claveActiva === "casos" ? "page" : undefined}
                className={`${enlaceBase} ${claveActiva === "casos" ? enlaceActivo : enlaceInactivo}`}
              >
                Expedientes
              </Link>
              <Link
                to="/"
                state={{ desplazarA: "como-funciona", t: location.key }}
                className={`${enlaceBase} ${enlaceInactivo}`}
              >
                Cómo funciona
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* En móvil el menú central se oculta: dejamos el acceso directo a Expedientes */}
            <NavLink
              to="/casos"
              className={({ isActive }) =>
                `md:hidden px-3 py-2 text-sm font-semibold rounded-full transition-colors duration-300 ${
                  isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              Expedientes
            </NavLink>

            {!usuario ? (
              <BotonAcceder />
            ) : (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2.5 bg-gray-50 pl-1.5 pr-3 py-1.5 rounded-full border border-gray-100">
                  <span className="bg-primary text-white rounded-full p-1.5">
                    <User className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-sm font-bold text-foreground">{usuario.codigoCuenta}</span>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full capitalize">
                    {usuario.rol.toLowerCase()}
                  </span>
                </div>
                <button
                  onClick={logout}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="p-2.5 rounded-full bg-gray-50 border border-gray-100 text-muted-foreground transition-all duration-300 hover:bg-danger/10 hover:text-danger hover:border-danger/20 active:scale-95 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}