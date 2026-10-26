import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";

export type OpcionDesplegable = { valor: string; etiqueta: string };

type Props = {
  etiqueta: string;
  valor: string;
  opciones: OpcionDesplegable[];
  textoTodos?: string;
  alCambiar: (valor: string) => void;
  className?: string;
};

export function Desplegable({ etiqueta, valor, opciones, textoTodos, alCambiar, className = "" }: Props) {
  const id = useId();
  const [abierto, setAbierto] = useState(false);
  const [indice, setIndice] = useState(0);
  const contenedor = useRef<HTMLDivElement | null>(null);
  const lista = useRef<HTMLUListElement | null>(null);

  const todas = useMemo<OpcionDesplegable[]>(
    () => (textoTodos === undefined ? opciones : [{ valor: "", etiqueta: textoTodos }, ...opciones]),
    [opciones, textoTodos],
  );
  const actual = todas.find((o) => o.valor === valor);
  const idLista = `${id}-lista`;

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
    if (!abierto) return;
    const el = lista.current?.children[indice] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [abierto, indice]);

  const abrir = () => {
    setIndice(Math.max(0, todas.findIndex((o) => o.valor === valor)));
    setAbierto(true);
  };

  const elegir = (v: string) => {
    alCambiar(v);
    setAbierto(false);
  };

  const teclado = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (todas.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!abierto) return abrir();
      setIndice((i) => Math.min(i + 1, todas.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!abierto) return abrir();
      setIndice((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home" && abierto) {
      e.preventDefault();
      setIndice(0);
    } else if (e.key === "End" && abierto) {
      e.preventDefault();
      setIndice(todas.length - 1);
    } else if ((e.key === "Enter" || e.key === " ") && abierto) {
      e.preventDefault();
      elegir(todas[indice]?.valor ?? valor);
    } else if (e.key === "Escape" && abierto) {
      e.preventDefault();
      setAbierto(false);
    } else if (e.key === "Tab" && abierto) {
      setAbierto(false);
    }
  };

  return (
    <div ref={contenedor} className={`relative ${className}`}>
      <span id={`${id}-etiqueta`} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-tinta-2">
        {etiqueta}
      </span>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={idLista}
        aria-labelledby={`${id}-etiqueta ${id}-valor`}
        aria-activedescendant={abierto ? `${id}-op-${indice}` : undefined}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        onKeyDown={teclado}
        className={`flex h-12 w-full items-center justify-between gap-3 rounded-2xl border bg-background px-4 text-left text-sm font-semibold transition-all duration-300 ease-expo focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 ${
          abierto
            ? "border-primary bg-card shadow-[0_12px_30px_-12px_rgba(5,150,105,0.35)]"
            : "border-border hover:border-primary/40 hover:bg-card"
        }`}
      >
        <span id={`${id}-valor`} className="flex min-w-0 items-center gap-2.5">
          <span
            className={`size-2 shrink-0 rounded-full transition-colors duration-300 ${valor ? "bg-primary" : "bg-muted-foreground/40"}`}
            aria-hidden="true"
          />
          <span className={`truncate ${valor ? "text-foreground" : "text-tinta-2"}`}>{actual?.etiqueta ?? "Elegir"}</span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-tinta-2 transition-transform duration-500 ease-expo ${abierto ? "rotate-180 text-primary" : ""}`}
          aria-hidden="true"
        />
      </button>

      <div
        className={`absolute left-0 right-0 top-full z-40 mt-2 origin-top transition-all duration-300 ease-expo ${
          abierto ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-2 scale-95 opacity-0"
        }`}
      >
        <ul
          ref={lista}
          id={idLista}
          role="listbox"
          aria-labelledby={`${id}-etiqueta`}
          className="max-h-72 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-[0_24px_60px_-16px_rgba(2,44,34,0.28)]"
        >
          {todas.map((o, i) => {
            const elegida = o.valor === valor;
            const resaltada = i === indice;
            return (
              <li
                key={o.valor || "vacio"}
                id={`${id}-op-${i}`}
                role="option"
                aria-selected={elegida}
                onMouseEnter={() => setIndice(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(o.valor)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors duration-200 ${
                  elegida ? "bg-secondary font-bold text-secondary-foreground" : "font-medium text-foreground"
                } ${resaltada && !elegida ? "bg-muted" : ""}`}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={`size-2 rounded-full ${elegida ? "bg-primary" : o.valor ? "bg-border" : "bg-muted-foreground/40"}`}
                    aria-hidden="true"
                  />
                  {o.etiqueta}
                </span>
                {elegida && <Check className="size-4 text-primary" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}