import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent as EventoPuntero } from "react";
import { Maximize2, MapPin, Minus, Plus } from "lucide-react";
import { ICONO_ESTADO_LOTE } from "@/components/base/EstadoLote";
import { FichaRapidaLote } from "@/components/FichaRapidaLote";
import { cerrarFicha, fichaVisible, pasarSobre, SIN_FICHA, tocarLote, type SeleccionFicha } from "@/lib/fichaLote";
import type { PlanoLotizacion as Plano } from "@/lib/planoLotizacion";
import {
  acotarVista, centrarEn, distancia, esVisible, factorRueda, mover, puntoMedio, siguienteNivel, tamanoMarcador, textoZoom,
  VISTA_INICIAL, ZOOM_ETIQUETA, zoomEn, type Punto, type Vista,
} from "@/lib/planoZoom";
import { ESTILO_LOTE, estadoEnPlano, etiquetaLote } from "@/lib/proyectos";
import type { LoteProyecto } from "@/lib/types";

/**
 * v2.0 (RF43 y RF40): el plano de la lotización entero, con movimiento y zoom propios (sin librerías), un marcador por
 * lote y la ficha del lote al pasar el mouse o al tocarlo.
 *  - Mover: arrastrar con el mouse o un dedo (con 1× el dedo sigue desplazando la página). Zoom: rueda del mouse,
 *    pellizco con dos dedos, botones «+» y «−», o las teclas + − y las flechas con el plano enfocado.
 *  - Los marcadores no se agrandan con el plano: mantienen su tamaño en pantalla (13 a 30 px) y se leen mejor al acercar.
 *    Cada estado lleva color fuerte + ícono (✓ disponible, reloj separado, ✕ vendido); con zoom 2,5× o más, los separados
 *    y vendidos llevan además su etiqueta escrita.
 *  - Con filtros, los lotes que los cumplen llevan un aro dorado y los demás se atenúan (sin perder su ícono).
 */
export function PlanoInteractivo({ plano, lotes = [], lote = null, alElegir, resaltados, destacar = false, fichaInicial = SIN_FICHA, vistaInicial = VISTA_INICIAL }: {
  plano: Plano; lotes?: LoteProyecto[];
  /** El lote elegido (se dibuja con un pin). */
  lote?: Pick<LoteProyecto, "clave" | "manzana" | "numero" | "sufijo"> | null;
  alElegir?: (clave: string) => void;
  /** Claves de los lotes que cumplen los filtros; con `destacar`, esos llevan aro dorado y los demás se atenúan. */
  resaltados?: Set<string>; destacar?: boolean;
  /** Solo para pruebas: ficha abierta y vista con la que se dibuja la primera vez. */
  fichaInicial?: SeleccionFicha; vistaInicial?: Vista;
}) {
  const caja = useRef<HTMLDivElement | null>(null);
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [arrastrando, setArrastrando] = useState(false);
  const [sel, setSel] = useState<SeleccionFicha>(fichaInicial);
  const [medidaCaja, setMedidaCaja] = useState("");
  const capaMarcadores = useRef<HTMLDivElement | null>(null);
  const punteros = useRef(new Map<number, Punto>());
  const gesto = useRef({ inicio: null as Punto | null, movido: false, ignorarClic: false, distancia: 0 });
  const claveElegida = lote?.clave;

  const medida = useCallback(() => {
    const r = caja.current?.getBoundingClientRect();
    return { w: r?.width || 1, h: r?.height || 1, izq: r?.left ?? 0, arr: r?.top ?? 0 };
  }, []);

  // Si cambia el tamaño del recuadro (girar la tableta), la vista se vuelve a acotar.
  useEffect(() => {
    const el = caja.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const o = new ResizeObserver(() => { const m = medida(); setMedidaCaja(`${m.w}x${m.h}`); setVista((v) => acotarVista(v, m.w, m.h)); });
    o.observe(el);
    return () => o.disconnect();
  }, [medida]);

  // La rueda del mouse acerca y aleja sobre el cursor; se registra a mano porque debe poder cancelar el desplazamiento de la página.
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const alRodar = (e: WheelEvent) => {
      e.preventDefault();
      const m = medida();
      setVista((v) => zoomEn(v, v.k * factorRueda(e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY), e.clientX - m.izq, e.clientY - m.arr, m.w, m.h));
    };
    el.addEventListener("wheel", alRodar, { passive: false });
    return () => el.removeEventListener("wheel", alRodar);
  }, [medida]);

  // Al elegir un lote desde fuera del plano (lista, panel), se centra si quedó fuera de la vista.
  const posElegido = claveElegida ? plano.lotes[claveElegida] : undefined;
  useEffect(() => {
    if (!posElegido) return;
    const m = medida();
    setVista((v) => (v.k > 1 && !esVisible(v, posElegido[0], posElegido[1], m.w, m.h) ? centrarEn(posElegido[0], posElegido[1], v.k, m.w, m.h) : v));
  }, [posElegido, medida]);

  const alBajar = (e: EventoPuntero<HTMLDivElement>) => {
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesto.current;
    if (punteros.current.size === 1) { g.inicio = { x: e.clientX, y: e.clientY }; g.movido = false; }
    if (punteros.current.size === 2) {
      const [a, b] = [...punteros.current.values()];
      g.distancia = distancia(a, b);
      g.movido = true;
    }
  };
  const alMover = (e: EventoPuntero<HTMLDivElement>) => {
    const antes = punteros.current.get(e.pointerId);
    if (!antes) return;
    const ahora = { x: e.clientX, y: e.clientY };
    const g = gesto.current;
    const m = medida();
    if (punteros.current.size === 2) {
      const otro = [...punteros.current.entries()].find(([id]) => id !== e.pointerId)![1];
      const medioAntes = puntoMedio(antes, otro), medioAhora = puntoMedio(ahora, otro);
      const d = distancia(ahora, otro);
      const factor = g.distancia > 0 ? d / g.distancia : 1;
      g.distancia = d;
      punteros.current.set(e.pointerId, ahora);
      setVista((v) => {
        const z = zoomEn(v, v.k * factor, medioAhora.x - m.izq, medioAhora.y - m.arr, m.w, m.h);
        return mover(z, medioAhora.x - medioAntes.x, medioAhora.y - medioAntes.y, m.w, m.h);
      });
      return;
    }
    if (!g.movido && g.inicio && distancia(ahora, g.inicio) > 5) {
      g.movido = true;
      // Con 1× no se captura el dedo: así la página sigue desplazándose con normalidad.
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setArrastrando(true);
    }
    if (g.movido) {
      punteros.current.set(e.pointerId, ahora);
      setVista((v) => mover(v, ahora.x - antes.x, ahora.y - antes.y, m.w, m.h));
    }
  };
  const alSoltar = (e: EventoPuntero<HTMLDivElement>) => {
    punteros.current.delete(e.pointerId);
    const g = gesto.current;
    if (g.movido) {
      // El clic que sigue a un arrastre no debe elegir el lote que quedó bajo el dedo.
      g.ignorarClic = true;
      setTimeout(() => { g.ignorarClic = false; }, 0);
    }
    if (punteros.current.size === 0) { g.movido = false; g.inicio = null; setArrastrando(false); }
    else g.distancia = 0;
  };

  const zoomCentro = (nueva: number) => {
    const m = medida();
    setVista((v) => zoomEn(v, nueva, m.w / 2, m.h / 2, m.w, m.h));
  };
  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const m = medida();
    const paso = 60;
    const flechas: Record<string, [number, number]> = { ArrowLeft: [paso, 0], ArrowRight: [-paso, 0], ArrowUp: [0, paso], ArrowDown: [0, -paso] };
    if (flechas[e.key]) { e.preventDefault(); setVista((v) => mover(v, flechas[e.key][0], flechas[e.key][1], m.w, m.h)); }
    else if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomCentro(siguienteNivel(vista.k, 1)); }
    else if (e.key === "-") { e.preventDefault(); zoomCentro(siguienteNivel(vista.k, -1)); }
    else if (e.key === "0") { e.preventDefault(); setVista(VISTA_INICIAL); }
    else if (e.key === "Escape") setSel(cerrarFicha());
  };

  const alTocarLote = useCallback((clave: string) => {
    if (gesto.current.ignorarClic) return;
    setSel((s) => tocarLote(s, clave));
    alElegir?.(clave);
  }, [alElegir]);
  const alSenalar = useCallback((clave: string | null) => setSel((s) => pasarSobre(s, clave)), []);

  // Los marcadores no dependen de la vista: al mover o hacer zoom solo cambia la capa que los contiene.
  const marcadores = useMemo(() => lotes.map((l) => {
    const p = plano.lotes[l.clave];
    if (!p || l.clave === claveElegida) return null;
    return <Marcador key={l.clave} lote={l} pos={p} cumple={!resaltados || resaltados.has(l.clave)} destacar={destacar}
      alTocar={alTocarLote} alSenalar={alSenalar} />;
  }), [lotes, plano, claveElegida, resaltados, destacar, alTocarLote, alSenalar]);

  // Los marcadores viven en una capa sin escala (así no se recalcula el estilo de los 214 en cada paso del zoom): su
  // posición en pantalla se escribe directamente aquí. El tamaño solo cambia cuando cambia el escalón de --tam.
  useLayoutEffect(() => {
    const capa = capaMarcadores.current;
    if (!capa) return;
    const m = medida();
    for (const el of Array.from(capa.children) as HTMLElement[]) {
      const px = vista.x + Number(el.dataset.fx) * m.w * vista.k, py = vista.y + Number(el.dataset.fy) * m.h * vista.k;
      el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, ${el.dataset.ancla === "pin" ? "-100%" : "-50%"})`;
    }
  }, [vista, marcadores, medida, medidaCaja, claveElegida]);

  const razon = plano.ancho / plano.alto;
  const abierta = fichaVisible(sel);
  const loteFicha = abierta ? lotes.find((l) => l.clave === abierta) ?? null : null;
  const soloSenalando = sel.fijo === null || sel.sobre !== null;
  const estiloCapa = { transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.k})`, transformOrigin: "0 0" } as CSSProperties;
  const estiloMarcadores = { "--tam": `${tamanoMarcador(vista.k)}px`, "--etiqueta": vista.k >= ZOOM_ETIQUETA ? "inline-flex" : "none" } as CSSProperties;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Zoom del plano">
        <button type="button" onClick={() => zoomCentro(siguienteNivel(vista.k, -1))} disabled={vista.k <= 1} aria-label="Alejar el plano" data-zoom="menos"
          className="grid size-10 place-items-center rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40"><Minus className="size-4" aria-hidden="true" /></button>
        <span className="cifras w-12 text-center text-sm font-bold text-foreground" aria-live="polite" data-nivel-zoom>{textoZoom(vista.k)}</span>
        <button type="button" onClick={() => zoomCentro(siguienteNivel(vista.k, 1))} disabled={vista.k >= 6} aria-label="Acercar el plano" data-zoom="mas"
          className="grid size-10 place-items-center rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40"><Plus className="size-4" aria-hidden="true" /></button>
        <button type="button" onClick={() => setVista(VISTA_INICIAL)} disabled={vista.k === 1 && vista.x === 0 && vista.y === 0} data-zoom="todo"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-40">
          <Maximize2 className="size-3.5" aria-hidden="true" /> Ver todo
        </button>
        <p className="text-xs text-tinta-2">Arrastra para mover · rueda o pellizco para acercar · toca un lote para ver su ficha.</p>
      </div>

      <div ref={caja} tabIndex={0} role="group" aria-label="Plano de la lotización. Con el plano enfocado, usa + y − para acercar y las flechas para moverlo."
        data-plano-viewport data-zoom-nivel={vista.k}
        onPointerDown={alBajar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar} onKeyDown={alTeclear}
        className="relative mx-auto w-full select-none overflow-hidden rounded-xl border border-border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{
          aspectRatio: String(razon), maxWidth: `min(100%, ${(80 * razon).toFixed(1)}vh)`,
          touchAction: vista.k > 1 ? "none" : "pan-y", cursor: arrastrando ? "grabbing" : vista.k > 1 ? "grab" : "default",
        }}>
        <div className="absolute inset-0" style={estiloCapa} data-capa-plano>
          <img src={plano.imagen} alt="" loading="lazy" decoding="async" draggable={false}
            className="pointer-events-none absolute inset-0 size-full max-w-none select-none" />
        </div>

        <div ref={capaMarcadores} className="pointer-events-none absolute inset-0" style={estiloMarcadores} data-capa-marcadores>
          {marcadores}
          {posElegido && claveElegida && (
            <span className="pointer-events-none absolute left-0 top-0 z-20" data-pin-lote={claveElegida} data-ancla="pin"
              data-fx={posElegido[0]} data-fy={posElegido[1]}>
              <MapPin className="size-9 fill-red-600 text-white drop-shadow-md" strokeWidth={1.75} aria-hidden="true" />
            </span>
          )}
        </div>

        {loteFicha && (
          <div className={`absolute inset-x-2 bottom-2 z-30 sm:right-auto sm:w-72 ${soloSenalando ? "pointer-events-none" : ""}`}
            onPointerDown={(e) => e.stopPropagation()}>
            <FichaRapidaLote lote={loteFicha} alCerrar={soloSenalando ? undefined : () => setSel(cerrarFicha())} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Un lote del plano: círculo de color fuerte con el ícono de su estado, y la etiqueta escrita al acercar. */
const Marcador = memo(function Marcador({ lote, pos, cumple, destacar, alTocar, alSenalar }: {
  lote: LoteProyecto; pos: [number, number]; cumple: boolean; destacar: boolean;
  alTocar: (clave: string) => void; alSenalar: (clave: string | null) => void;
}) {
  const estado = estadoEnPlano(lote);
  const est = ESTILO_LOTE[estado];
  const Icono = ICONO_ESTADO_LOTE[est.icono];
  const llamativo = estado === "SEPARADO" || estado === "VENDIDO";
  const aro = cumple && destacar ? ", 0 0 0 3px var(--paleta-dorado-claro), 0 0 0 5px var(--paleta-dorado)" : "";
  return (
    <button type="button" data-punto-lote={lote.clave} data-estado={estado} data-cumple={cumple}
      onClick={() => alTocar(lote.clave)}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") alSenalar(lote.clave); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") alSenalar(null); }}
      onFocus={() => alSenalar(lote.clave)} onBlur={() => alSenalar(null)}
      aria-label={`Mz. ${lote.manzana} · Lote ${etiquetaLote(lote)}: ${est.etiqueta.toLowerCase()}${cumple ? "" : ". No cumple tus filtros"}`}
      data-fx={pos[0]} data-fy={pos[1]}
      className="pointer-events-auto absolute left-0 top-0 grid place-items-center rounded-full border-2 border-white"
      style={{
        background: est.fuerte, color: est.sobreFuerte,
        width: llamativo ? "calc(var(--tam) * 1.3)" : "var(--tam)", height: llamativo ? "calc(var(--tam) * 1.3)" : "var(--tam)",
        transform: "translate(-50%, -50%)", opacity: cumple ? 1 : 0.4, zIndex: cumple ? (llamativo ? 3 : 2) : 1,
        boxShadow: `0 1px 3px rgb(0 0 0 / 0.45)${aro}`,
      }}>
      <Icono aria-hidden="true" strokeWidth={2.6} style={{ width: "62%", height: "62%" }} />
      {llamativo && cumple && (
        <span aria-hidden="true" data-etiqueta-estado
          className="pointer-events-none absolute left-full top-1/2 ml-1 -translate-y-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-extrabold leading-none shadow"
          style={{ background: est.fuerte, color: est.sobreFuerte, display: "var(--etiqueta)" }}>
          {est.corto}
        </span>
      )}
    </button>
  );
});
