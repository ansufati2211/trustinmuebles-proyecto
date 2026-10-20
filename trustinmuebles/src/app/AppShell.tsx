<<<<<<< HEAD
import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
=======
import { Outlet } from "react-router";
import { TopBar } from "@/components/base/TopBar";
import { Footer } from "@/components/base/Footer";
>>>>>>> b4afc49e534571aa04a001a856c51b87ea7932e5

export function AppShell() {
  const location = useLocation();
  const esLogin = location.pathname === "/login";
  const esLanding = location.pathname === "/";

  // Al cambiar de ruta se vuelve arriba, salvo que se pida desplazar a una sección de la landing.
  useEffect(() => {
    const destino = (location.state as { desplazarA?: string } | null)?.desplazarA;
    if (!destino) window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
<<<<<<< HEAD
    <div className="min-h-screen flex flex-col bg-background font-sans selection:bg-primary/20 selection:text-primary">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-5 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white"
      >
        Saltar al contenido
      </a>

      {!esLogin && <Navbar />}

      {/* El Navbar flota (fixed). Las rutas internas reservan su altura; la landing y el login gestionan la suya. */}
      <main
        id="contenido"
        className={`flex-1 flex flex-col w-full ${!esLogin && !esLanding ? "pt-28" : ""}`}
      >
        {/* La `key` hace que cada cambio de ruta remonte el contenedor y reproduzca la transición de entrada. */}
        <div key={location.pathname} className="page-enter flex-1 flex flex-col w-full">
          <Outlet />
        </div>
=======
    <div className="flex min-h-screen flex-col bg-superficie font-sans selection:bg-primary/20 selection:text-primary-strong">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-card focus:px-4 focus:py-2 focus:font-bold focus:shadow-elevada">
        Saltar al contenido
      </a>
      <TopBar />
      <main id="contenido" tabIndex={-1} className="flex w-full flex-1 flex-col outline-none">
        <Outlet />
>>>>>>> b4afc49e534571aa04a001a856c51b87ea7932e5
      </main>

      {!esLogin && <Footer />}
    </div>
  );
}
