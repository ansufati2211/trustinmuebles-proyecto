import { useEffect, useRef } from "react";
import type { KeyboardEvent, RefObject } from "react";
import { Link } from "react-router";
import { Menu, X } from "lucide-react";
import type { OpcionMenu } from "@/lib/permisos";

/*
 * v1.0 (etapa 6): menú de pantallas de menos de 1024 px (tableta y celular). El botón ☰ despliega todas las opciones
 * del rol. Accesible: el botón dice si está abierto (aria-expanded) y qué controla (aria-controls); al abrir, el foco va
 * a la primera opción; Escape cierra y devuelve el foco al botón; las flechas recorren las opciones; elegir una cierra.
 */

export const ID_MENU_MOVIL = "menu-movil";

/** Qué hace una tecla dentro del menú abierto. Se exporta para probarla sin navegador. */
export function accionTeclaMenu(tecla: string): "cerrar" | "siguiente" | "anterior" | "primero" | "ultimo" | null {
  switch (tecla) {
    case "Escape": return "cerrar";
    case "ArrowDown": return "siguiente";
    case "ArrowUp": return "anterior";
    case "Home": return "primero";
    case "End": return "ultimo";
    default: return null;
  }
}

/** Índice al que se mueve el foco con una acción, dando la vuelta en los extremos. */
export function moverFoco(actual: number, total: number, accion: ReturnType<typeof accionTeclaMenu>): number {
  if (total <= 0) return -1;
  switch (accion) {
    case "siguiente": return actual < 0 ? 0 : (actual + 1) % total;
    case "anterior": return actual <= 0 ? total - 1 : actual - 1;
    case "primero": return 0;
    case "ultimo": return total - 1;
    default: return actual;
  }
}

export function BotonMenuMovil({ abierto, alCambiar, botonRef }: {
  abierto: boolean; alCambiar: () => void; botonRef?: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button ref={botonRef} type="button" onClick={alCambiar} data-boton-menu
      aria-expanded={abierto} aria-controls={ID_MENU_MOVIL} aria-label={abierto ? "Cerrar el menú" : "Abrir el menú"}
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 lg:hidden">
      {abierto ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
    </button>
  );
}

export function MenuMovil({ abierto, enlaces, claveActiva, alCerrar, alElegir }: {
  abierto: boolean; enlaces: OpcionMenu[]; claveActiva: string | null;
  /** Cierra el menú; `devolverFoco` lo pide Escape para volver al botón. */
  alCerrar: (devolverFoco: boolean) => void;
  alElegir?: (e: OpcionMenu) => void;
}) {
  const lista = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (abierto) lista.current?.querySelector<HTMLAnchorElement>("a")?.focus();
  }, [abierto]);

  if (!abierto) return null;

  const alTeclear = (e: KeyboardEvent<HTMLElement>) => {
    const accion = accionTeclaMenu(e.key);
    if (!accion) return;
    e.preventDefault();
    if (accion === "cerrar") return alCerrar(true);
    const opciones = Array.from(lista.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
    const actual = opciones.indexOf(document.activeElement as HTMLAnchorElement);
    opciones[moverFoco(actual, opciones.length, accion)]?.focus();
  };

  return (
    <nav id={ID_MENU_MOVIL} aria-label="Menú" onKeyDown={alTeclear} data-menu-movil
      className="mt-2 rounded-3xl border border-gray-200 bg-white/95 p-2 shadow-lg shadow-gray-300/40 backdrop-blur-xl lg:hidden">
      <ul ref={lista} className="flex flex-col gap-1">
        {enlaces.map((e) => (
          <li key={e.clave}>
            <Link to={e.ruta} state={e.clave === "como-funciona" ? { desplazarA: "como-funciona" } : undefined}
              onClick={() => { alElegir?.(e); alCerrar(false); }}
              aria-current={claveActiva === e.clave ? "page" : undefined}
              className={`flex min-h-12 items-center rounded-2xl px-4 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 ${
                claveActiva === e.clave ? "bg-primary/10 text-primary" : "text-foreground hover:bg-gray-50"}`}>
              {e.etiqueta}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
