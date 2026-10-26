import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { User, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { LogoMark } from "@/components/layout/Logo";
import { claveDeRuta, navegacion } from "@/lib/permisos";

const enlaceBase =
  "relative z-10 px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-200 select-none";
const enlaceInactivo = "text-muted-foreground hover:text-foreground";
const enlaceActivo = "text-primary";

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
      className="btn-glint inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 sm:px-6 text-sm font-bold text-white shadow-md shadow-primary/25 transition-[transform,box-shadow] duration-200 hover:shadow-lg hover:shadow-primary/35 active:scale-[0.97]"
    >
      Iniciar Sesion
    </Link>
  );
}

export function Navbar() {
  const location = useLocation();
  const { usuario, logout } = useAuth();
  const [conScroll, setConScroll] = useState(false);

  const destinoEstado = (location.state as { desplazarA?: string } | null)?.desplazarA;
  const [enComoFunciona, setEnComoFunciona] = useState(
    () => location.pathname === "/" && destinoEstado === "como-funciona"
  );

  const bloqueoScrollSpyRef = useRef<number>(0);

  const bloquearScrollSpyTemporalmente = useCallback((ms = 750) => {
    bloqueoScrollSpyRef.current = performance.now() + ms;
  }, []);

  useEffect(() => {
    if (location.pathname !== "/") {
      setEnComoFunciona(false);
      return;
    }
    if (destinoEstado === "como-funciona") {
      bloquearScrollSpyTemporalmente(800);
      setEnComoFunciona(true);
    }
  }, [location.pathname, location.key, destinoEstado, bloquearScrollSpyTemporalmente]);

  useEffect(() => {
    const alScroll = () => {
      setConScroll(window.scrollY > 12);

      if (location.pathname !== "/") return;
      if (performance.now() < bloqueoScrollSpyRef.current) return;

      const seccion = document.getElementById("como-funciona");
      if (seccion) {
        const rect = seccion.getBoundingClientRect();
        const visible = rect.top <= 260 && rect.bottom >= 180;
        setEnComoFunciona((prev) => (prev !== visible ? visible : prev));
      }
    };

    alScroll();
    window.addEventListener("scroll", alScroll, { passive: true });
    return () => window.removeEventListener("scroll", alScroll);
  }, [location.pathname]);

  const enlaces = navegacion(usuario?.rol);
  const principal = enlaces.find((e) => e.clave !== "inicio") ?? null;
  const claveBase = claveDeRuta(location.pathname);

  const claveActiva =
    location.pathname === "/" && enComoFunciona ? "como-funciona" : claveBase;

  const enlacesRef = useRef<Record<string, HTMLAnchorElement | null>>({});
  const pildoraRef = useRef<HTMLSpanElement | null>(null);

  const posicionarPildora = useCallback(() => {
    const span = pildoraRef.current;
    if (!span) return;
    const el = claveActiva ? enlacesRef.current[claveActiva] : null;
    if (!el) {
      span.style.opacity = "0";
      return;
    }
    span.style.opacity = "1";
    span.style.transform = `translate3d(${el.offsetLeft}px, 0, 0)`;
    span.style.width = `${el.offsetWidth}px`;
  }, [claveActiva]);

  useLayoutEffect(() => {
    posicionarPildora();
  }, [posicionarPildora, enlaces.length]);

  useEffect(() => {
    window.addEventListener("resize", posicionarPildora);
    document.fonts?.ready.then(posicionarPildora);
    return () => window.removeEventListener("resize", posicionarPildora);
  }, [posicionarPildora]);

  const irAlInicio = () => {
    bloquearScrollSpyTemporalmente(750);
    setEnComoFunciona(false);
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const irAComoFunciona = (e: MouseEvent<HTMLAnchorElement>) => {
    bloquearScrollSpyTemporalmente(800);
    setEnComoFunciona(true);

    if (location.pathname === "/") {
      e.preventDefault();
      document.getElementById("como-funciona")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <header className="w-full max-w-6xl pointer-events-auto">
        <div
          className={`rounded-full border px-3 sm:px-5 h-16 flex items-center justify-between backdrop-blur-xl transition-all duration-300 ${
            conScroll
              ? "bg-white/90 border-gray-200 shadow-lg shadow-gray-300/40"
              : "bg-white/75 border-white/60 shadow-md shadow-gray-200/40"
          }`}
        >
          <div className="flex items-center gap-4 md:gap-8 min-w-0">
            <Link
              to="/"
              onClick={irAlInicio}
              className="flex items-center gap-2.5 group shrink-0"
              aria-label="Trustinmuebles, ir al inicio"
            >
              <LogoMark className="w-10 h-10 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3" />
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground group-hover:text-primary transition-colors duration-200">
                Trustinmuebles
              </span>
            </Link>

            <nav
              aria-label="Principal"
              className="relative hidden md:flex items-center gap-1 bg-gray-50/70 p-1 rounded-full border border-gray-100"
            >
              <span
                ref={pildoraRef}
                aria-hidden="true"
                style={{ left: 0, width: 0, opacity: 0 }}
                className="pointer-events-none absolute top-1 bottom-1 left-0 rounded-full bg-primary/12 will-change-[transform,width] transition-[transform,width,opacity] duration-250 ease-out"
              />

              {enlaces.map((e) => (
                <Link
                  key={e.clave}
                  ref={(el) => {
                    enlacesRef.current[e.clave] = el;
                  }}
                  to={e.ruta}
                  onClick={
                    e.clave === "inicio"
                      ? irAlInicio
                      : () => {
                          bloquearScrollSpyTemporalmente(400);
                          setEnComoFunciona(false);
                        }
                  }
                  aria-current={claveActiva === e.clave ? "page" : undefined}
                  className={`${enlaceBase} ${
                    claveActiva === e.clave ? enlaceActivo : enlaceInactivo
                  }`}
                >
                  {e.etiqueta}
                </Link>
              ))}

              <Link
                ref={(el) => {
                  enlacesRef.current["como-funciona"] = el;
                }}
                to="/"
                state={{ desplazarA: "como-funciona" }}
                onClick={irAComoFunciona}
                aria-current={claveActiva === "como-funciona" ? "page" : undefined}
                className={`${enlaceBase} ${
                  claveActiva === "como-funciona" ? enlaceActivo : enlaceInactivo
                }`}
              >
                Cómo funciona
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {principal && (
              <NavLink
                to={principal.ruta}
                className={({ isActive }) =>
                  `md:hidden px-3 py-2 text-sm font-semibold rounded-full transition-colors duration-200 ${
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {principal.etiqueta}
              </NavLink>
            )}

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
                  className="p-2.5 rounded-full bg-gray-50 border border-gray-100 text-muted-foreground transition-all duration-200 hover:bg-danger/10 hover:text-danger hover:border-danger/20 active:scale-95 cursor-pointer"
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