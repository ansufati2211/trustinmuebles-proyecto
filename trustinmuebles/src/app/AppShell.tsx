import { Outlet } from "react-router";
import { TopBar } from "@/components/base/TopBar";
import { Footer } from "@/components/base/Footer";

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-superficie font-sans selection:bg-primary/20 selection:text-primary-strong">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-card focus:px-4 focus:py-2 focus:font-bold focus:shadow-elevada">
        Saltar al contenido
      </a>
      <TopBar />
      <main id="contenido" tabIndex={-1} className="flex w-full flex-1 flex-col outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
