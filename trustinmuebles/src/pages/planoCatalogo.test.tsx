import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import Inmuebles from "@/pages/Inmuebles";

/* v1.0 (etapa 14): el selector «Lista | Plano» del catálogo, dibujado en el servidor con datos fijos. */

const llamadas: (string | null)[] = [];
vi.mock("@/lib/useApi", () => ({
  useApi: (ruta: string | null) => {
    llamadas.push(ruta);
    return { data: null, loading: false, error: null, reload: () => {} };
  },
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ usuario: null, logout: () => {} }) }));

const dibujar = (url: string) => renderToStaticMarkup(<MemoryRouter initialEntries={[url]}><Inmuebles /></MemoryRouter>);

describe("catálogo: Lista | Plano", () => {
  it("por omisión es la lista: pide la página de inmuebles y «Lista» sale presionado", () => {
    llamadas.length = 0;
    const html = dibujar("/inmuebles");
    expect(html).toMatch(/aria-pressed="true"[^>]*data-vista="lista"/);
    expect(html).toMatch(/aria-pressed="false"[^>]*data-vista="plano"/);
    expect(llamadas.some((r) => r?.startsWith("/publico/inmuebles?"))).toBe(true);
  });

  it("con ?vista=plano, «Plano» sale presionado, no pide la página de la lista y pide los lotes que cumplen los filtros", () => {
    llamadas.length = 0;
    const html = dibujar("/inmuebles?vista=plano&proyecto=Altos");
    expect(html).toMatch(/aria-pressed="true"[^>]*data-vista="plano"/);
    expect(html).toMatch(/aria-pressed="false"[^>]*data-vista="lista"/);
    expect(llamadas.some((r) => r?.startsWith("/publico/inmuebles?"))).toBe(false);
    expect(llamadas.some((r) => r?.startsWith("/publico/inmuebles/recomendables?") && r.includes("proyecto=Altos"))).toBe(true);
  });
});
