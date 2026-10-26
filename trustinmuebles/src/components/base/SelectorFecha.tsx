import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

type Vista = "dias" | "meses" | "anios";

type Props = {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  min?: string;
  max?: string;
  className?: string;
  permitirVacio?: boolean;
};

const aISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const esISO = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

const deISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const sumarDias = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const sumarMeses = (d: Date, n: number) => {
  const destino = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const ultimo = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate();
  return new Date(destino.getFullYear(), destino.getMonth(), Math.min(d.getDate(), ultimo));
};

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const MESES = Array.from({ length: 12 }, (_, i) =>
  capitalizar(new Intl.DateTimeFormat("es-PE", { month: "long" }).format(new Date(2024, i, 1))),
);

const DIAS_SEMANA = Array.from({ length: 7 }, (_, i) =>
  capitalizar(new Intl.DateTimeFormat("es-PE", { weekday: "short" }).format(new Date(2024, 0, 1 + i)).replace(".", "")).slice(0, 2),
);

const largo = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long", year: "numeric" });
const completo = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export function SelectorFecha({ etiqueta, valor, alCambiar, min, max, className = "", permitirVacio = true }: Props) {
  const id = useId();
  const contenedor = useRef<HTMLDivElement | null>(null);
  const disparador = useRef<HTMLButtonElement | null>(null);
  const moverFoco = useRef(false);

  const seleccionada = esISO(valor) ? deISO(valor) : null;
  const minimo = min && esISO(min) ? deISO(min) : null;
  const maximo = max && esISO(max) ? deISO(max) : null;
  const hoy = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);

  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<Vista>("dias");
  const [foco, setFoco] = useState<Date>(seleccionada ?? hoy);
  const [inicioAnios, setInicioAnios] = useState(0);

  const fueraDeRango = (d: Date) => (minimo !== null && d < minimo) || (maximo !== null && d > maximo);

  const abrir = () => {
    const base = seleccionada ?? hoy;
    setFoco(fueraDeRango(base) ? (maximo && base > maximo ? maximo : (minimo ?? base)) : base);
    setVista("dias");
    moverFoco.current = true;
    setAbierto(true);
  };

  const cerrar = (devolverFoco = true) => {
    setAbierto(false);
    if (devolverFoco) disparador.current?.focus();
  };

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent | TouchEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("touchstart", fuera);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("touchstart", fuera);
    };
  }, [abierto]);

  useEffect(() => {
    if (!abierto || vista !== "dias" || !moverFoco.current) return;
    moverFoco.current = false;
    contenedor.current?.querySelector<HTMLButtonElement>(`[data-iso="${aISO(foco)}"]`)?.focus();
  }, [abierto, vista, foco]);

  const celdas = useMemo(() => {
    const primero = new Date(foco.getFullYear(), foco.getMonth(), 1);
    const desfase = (primero.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => new Date(primero.getFullYear(), primero.getMonth(), 1 - desfase + i));
  }, [foco]);

  const elegir = (d: Date) => {
    if (fueraDeRango(d)) return;
    alCambiar(aISO(d));
    cerrar();
  };

  const irA = (d: Date) => {
    moverFoco.current = true;
    setFoco(d);
  };

  const tecladoDias = (e: KeyboardEvent<HTMLDivElement>) => {
    const mapa: Record<string, () => Date> = {
      ArrowLeft: () => sumarDias(foco, -1),
      ArrowRight: () => sumarDias(foco, 1),
      ArrowUp: () => sumarDias(foco, -7),
      ArrowDown: () => sumarDias(foco, 7),
      Home: () => sumarDias(foco, -((foco.getDay() + 6) % 7)),
      End: () => sumarDias(foco, 6 - ((foco.getDay() + 6) % 7)),
      PageUp: () => sumarMeses(foco, e.shiftKey ? -12 : -1),
      PageDown: () => sumarMeses(foco, e.shiftKey ? 12 : 1),
    };
    const calcular = mapa[e.key];
    if (calcular) {
      e.preventDefault();
      irA(calcular());
    }
  };

  const tecladoGeneral = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (vista !== "dias") setVista("dias");
      else cerrar();
    }
  };

  const mesCompletoFuera = (anio: number, mes: number) =>
    fueraDeRango(new Date(anio, mes, 1)) && fueraDeRango(new Date(anio, mes + 1, 0));

  const anioFuera = (anio: number) =>
    (minimo !== null && anio < minimo.getFullYear()) || (maximo !== null && anio > maximo.getFullYear());

  const hoyDisponible = !fueraDeRango(hoy);
  const base = foco.getFullYear() - (foco.getFullYear() % 12);
  const anios = Array.from({ length: 12 }, (_, i) => (vista === "anios" ? inicioAnios : base) + i);

  const navegar = (sentido: -1 | 1) => {
    if (vista === "dias") setFoco(sumarMeses(foco, sentido));
    else if (vista === "meses") setFoco(sumarMeses(foco, sentido * 12));
    else setInicioAnios(inicioAnios + sentido * 12);
  };

  const tituloCabecera =
    vista === "dias" ? `${MESES[foco.getMonth()]} ${foco.getFullYear()}`
      : vista === "meses" ? String(foco.getFullYear())
        : `${anios[0]} – ${anios[11]}`;

  const alternarVista = () => {
    if (vista === "dias") setVista("meses");
    else if (vista === "meses") {
      setInicioAnios(foco.getFullYear() - (foco.getFullYear() % 12));
      setVista("anios");
    } else setVista("dias");
  };

  const clase = "flex size-9 items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25";

  return (
    <div ref={contenedor} className={`relative ${className}`} onKeyDown={tecladoGeneral}>
      <span id={`${id}-etiqueta`} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-tinta-2">
        {etiqueta}
      </span>
      <button
        ref={disparador}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-controls={`${id}-panel`}
        aria-labelledby={`${id}-etiqueta ${id}-valor`}
        onClick={() => (abierto ? cerrar(false) : abrir())}
        className={`flex h-12 w-full items-center justify-between gap-3 rounded-2xl border bg-background px-4 text-left text-sm font-semibold transition-all duration-300 ease-expo focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 ${
          abierto
            ? "border-primary bg-card shadow-[0_12px_30px_-12px_rgba(5,150,105,0.35)]"
            : "border-border hover:border-primary/40 hover:bg-card"
        }`}
      >
        <span id={`${id}-valor`} className="flex min-w-0 items-center gap-2.5">
          <CalendarDays className={`size-4 shrink-0 transition-colors duration-300 ${seleccionada ? "text-primary" : "text-tinta-2"}`} aria-hidden="true" />
          <span className={`truncate ${seleccionada ? "text-foreground" : "text-tinta-2"}`}>
            {seleccionada ? largo.format(seleccionada) : "Elegir fecha"}
          </span>
        </span>
        <ChevronRight
          className={`size-4 shrink-0 text-tinta-2 transition-transform duration-500 ease-expo ${abierto ? "rotate-90 text-primary" : ""}`}
          aria-hidden="true"
        />
      </button>

      <div
        id={`${id}-panel`}
        role="dialog"
        aria-label={`Calendario: ${etiqueta}`}
        className={`absolute left-0 top-full z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] origin-top-left transition-all duration-300 ease-expo ${
          abierto ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-2 scale-95 opacity-0"
        }`}
      >
        <div className="rounded-3xl border border-border bg-card p-4 shadow-[0_24px_60px_-16px_rgba(2,44,34,0.28)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navegar(-1)}
              aria-label={vista === "dias" ? "Mes anterior" : vista === "meses" ? "Año anterior" : "Años anteriores"}
              className={`${clase} text-tinta-2 hover:bg-secondary hover:text-primary`}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={alternarVista}
              aria-live="polite"
              className="rounded-xl px-3 py-1.5 text-sm font-extrabold text-foreground transition-colors hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
            >
              {tituloCabecera}
            </button>
            <button
              type="button"
              onClick={() => navegar(1)}
              aria-label={vista === "dias" ? "Mes siguiente" : vista === "meses" ? "Año siguiente" : "Años siguientes"}
              className={`${clase} text-tinta-2 hover:bg-secondary hover:text-primary`}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>

          {vista === "dias" && (
            <div role="grid" aria-label={`${MESES[foco.getMonth()]} ${foco.getFullYear()}`} onKeyDown={tecladoDias}>
              <div role="row" className="mb-1 grid grid-cols-7 text-center">
                {DIAS_SEMANA.map((d, i) => (
                  <span key={i} role="columnheader" className="py-1.5 text-[11px] font-bold uppercase tracking-wider text-tinta-2">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {celdas.map((d) => {
                  const iso = aISO(d);
                  const delMes = d.getMonth() === foco.getMonth();
                  const elegida = seleccionada !== null && iso === aISO(seleccionada);
                  const esHoy = iso === aISO(hoy);
                  const enFoco = iso === aISO(foco);
                  const bloqueada = fueraDeRango(d);
                  return (
                    <button
                      key={iso}
                      type="button"
                      role="gridcell"
                      data-iso={iso}
                      tabIndex={enFoco ? 0 : -1}
                      disabled={bloqueada}
                      aria-selected={elegida}
                      aria-current={esHoy ? "date" : undefined}
                      aria-label={completo.format(d)}
                      onClick={() => elegir(d)}
                      className={`${clase} mx-auto ${
                        elegida
                          ? "bg-primary font-black text-white shadow-md shadow-primary/30"
                          : esHoy
                            ? "border border-primary/40 bg-secondary font-bold text-primary hover:bg-primary hover:text-white"
                            : delMes
                              ? "text-foreground hover:bg-secondary hover:text-primary"
                              : "text-tinta-2/50 hover:bg-muted"
                      } ${bloqueada ? "cursor-not-allowed opacity-30 hover:bg-transparent hover:text-inherit" : "active:scale-90"}`}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {vista === "meses" && (
            <div className="grid grid-cols-3 gap-2">
              {MESES.map((m, i) => {
                const actual = i === foco.getMonth();
                const bloqueado = mesCompletoFuera(foco.getFullYear(), i);
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={bloqueado}
                    onClick={() => {
                      setFoco(new Date(foco.getFullYear(), i, Math.min(foco.getDate(), new Date(foco.getFullYear(), i + 1, 0).getDate())));
                      setVista("dias");
                      moverFoco.current = true;
                    }}
                    className={`h-11 rounded-xl text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 ${
                      actual ? "bg-primary text-white shadow-md shadow-primary/25" : "text-foreground hover:bg-secondary hover:text-primary"
                    } ${bloqueado ? "cursor-not-allowed opacity-30" : "active:scale-95"}`}
                  >
                    {m.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          )}

          {vista === "anios" && (
            <div className="grid grid-cols-3 gap-2">
              {anios.map((a) => {
                const actual = a === foco.getFullYear();
                const bloqueado = anioFuera(a);
                return (
                  <button
                    key={a}
                    type="button"
                    disabled={bloqueado}
                    onClick={() => {
                      setFoco(new Date(a, foco.getMonth(), Math.min(foco.getDate(), new Date(a, foco.getMonth() + 1, 0).getDate())));
                      setVista("meses");
                    }}
                    className={`cifras h-11 rounded-xl text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 ${
                      actual ? "bg-primary text-white shadow-md shadow-primary/25" : "text-foreground hover:bg-secondary hover:text-primary"
                    } ${bloqueado ? "cursor-not-allowed opacity-30" : "active:scale-95"}`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
            <button
              type="button"
              disabled={!hoyDisponible}
              onClick={() => elegir(hoy)}
              className="rounded-xl px-3 py-2 text-sm font-bold text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Hoy
            </button>
            {permitirVacio && seleccionada && (
              <button
                type="button"
                onClick={() => {
                  alCambiar("");
                  cerrar();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-tinta-2 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
              >
                <X className="size-4" aria-hidden="true" /> Borrar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}