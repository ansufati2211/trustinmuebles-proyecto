import { useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Link } from "react-router";
import { ArrowRight, X } from "lucide-react";
import { precio, m2 } from "@/lib/formato";
import {
  ESTILO_LOTE, ORDEN_LEYENDA, activaLote, conteoPlano, descripcionLote, dibujarPlano, enlaceLote, estadoEnPlano,
  siguienteIndice, type EstadoPlano,
} from "@/lib/proyectos";
import type { LoteProyecto } from "@/lib/types";
import { SolicitarCita } from "@/components/SolicitarCita";

/**
 * v1.0 (etapa 3a): plano del proyecto por manzanas, en SVG propio. Cada lote muestra su número y el color de su estado
 * comercial (con un patrón y la leyenda en texto, nunca solo color). Se usa con teclado: Tab entra al plano, las flechas
 * recorren los lotes en orden y Enter o Espacio abren el panel con el área, el precio, el precio por m², el estado y el
 * enlace a la ficha.
 */
export function PlanoLotes({ proyectoCodigo, lotes, inicial = null }: {
  proyectoCodigo: string; lotes: LoteProyecto[]; inicial?: string | null;
}) {
  const plano = dibujarPlano(lotes);
  const [elegido, setElegido] = useState<string | null>(inicial);
  const [foco, setFoco] = useState(0);
  const refs = useRef<(SVGGElement | null)[]>([]);
  const conteo = conteoPlano(lotes);
  const indice = new Map(plano.orden.map((l, i) => [l.clave, i]));
  const lote = elegido ? lotes.find((l) => l.clave === elegido) ?? null : null;

  const alTeclear = (e: KeyboardEvent<SVGGElement>, l: LoteProyecto) => {
    if (activaLote(e.key)) {
      e.preventDefault();
      setElegido(l.clave);
      return;
    }
    const sig = siguienteIndice(indice.get(l.clave) ?? 0, e.key, plano.orden.length);
    if (sig === null) return;
    e.preventDefault();
    setFoco(sig);
    refs.current[sig]?.focus();
  };

  if (lotes.length === 0) {
    return <p className="text-sm text-tinta-2">Este proyecto todavía no tiene un plano de lotes publicado.</p>;
  }

  return (
    <div className="space-y-4">
      <Leyenda conteo={conteo} />
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="overflow-x-auto rounded-2xl border border-border bg-superficie p-2">
          <svg viewBox={`0 0 ${plano.ancho} ${plano.alto}`} role="group"
            aria-label={`Plano de lotes: ${lotes.length} lotes en ${plano.manzanas.length} manzanas. Usa las flechas para recorrerlos y Enter para ver uno.`}
            className="mx-auto block h-auto w-full min-w-[30rem] max-w-3xl" data-plano>
            <defs>
              <pattern id="patron-rayas" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke={ESTILO_LOTE.VENDIDO.borde} strokeWidth="1.4" strokeOpacity="0.45" />
              </pattern>
              <pattern id="patron-puntos" width="6" height="6" patternUnits="userSpaceOnUse">
                <circle cx="3" cy="3" r="1" fill={ESTILO_LOTE.SEPARADO.borde} fillOpacity="0.5" />
              </pattern>
            </defs>
            {plano.manzanas.map((m) => (
              <g key={m.manzana}>
                <text x={m.x + m.w / 2} y={m.y - 6} textAnchor="middle" fontSize="11" fontWeight="800" fill="#4A5F57">
                  Mz. {m.manzana}
                </text>
                {m.lotes.map(({ lote: l, x, y, w, h }) => {
                  const i = indice.get(l.clave) ?? 0;
                  const estado = estadoEnPlano(l);
                  const est = ESTILO_LOTE[estado];
                  const activo = elegido === l.clave;
                  return (
                    <g key={l.clave} ref={(el) => { refs.current[i] = el; }} role="button" tabIndex={i === foco ? 0 : -1}
                      aria-label={descripcionLote(l, precio)} aria-pressed={activo} data-lote={l.clave} data-estado={estado}
                      onClick={() => { setElegido(l.clave); setFoco(i); }} onKeyDown={(e) => alTeclear(e, l)}
                      onFocus={() => setFoco(i)}
                      className="cursor-pointer outline-none [&:focus-visible>rect:last-of-type]:stroke-[3]">
                      <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx="2" fill={est.relleno} />
                      {est.patron && <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx="2" fill={`url(#patron-${est.patron})`} />}
                      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill={est.texto}>
                        {l.numero}
                      </text>
                      <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx="2" fill="none"
                        stroke={activo ? "#022C22" : est.borde} strokeWidth={activo ? 3 : 1.2} strokeDasharray={est.trazo} />
                    </g>
                  );
                })}
              </g>
            ))}
          </svg>
        </div>
        <PanelLote proyectoCodigo={proyectoCodigo} lote={lote} cerrar={() => setElegido(null)} />
      </div>
    </div>
  );
}

/** Leyenda con texto y cantidad de cada estado; solo los estados que tienen lotes. */
export function Leyenda({ conteo }: { conteo: Record<EstadoPlano, number> }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-foreground" aria-label="Leyenda del plano">
      {ORDEN_LEYENDA.filter((e) => conteo[e] > 0).map((e) => {
        const est = ESTILO_LOTE[e];
        return (
          <li key={e} className="flex items-center gap-2">
            <svg width="18" height="18" aria-hidden="true">
              <rect x="1" y="1" width="16" height="16" rx="3" fill={est.relleno} stroke={est.borde} strokeWidth="1.5"
                strokeDasharray={est.trazo} />
              {est.patron === "rayas" && <path d="M4 14 L14 4 M1 9 L9 1 M9 17 L17 9" stroke={est.borde} strokeOpacity="0.5" />}
              {est.patron === "puntos" && <g fill={est.borde} fillOpacity="0.6"><circle cx="6" cy="6" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="12" cy="6" r="1.2" /><circle cx="6" cy="12" r="1.2" /></g>}
            </svg>
            <span>{est.etiqueta}</span>
            <span className="cifras text-tinta-2">({conteo[e]})</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Panel del lote elegido: área, precio, precio por m², estado y enlace a su ficha. */
export function PanelLote({ proyectoCodigo, lote, cerrar }: {
  proyectoCodigo: string; lote: LoteProyecto | null; cerrar: () => void;
}) {
  if (!lote) {
    return (
      <aside className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-tinta-2" aria-live="polite">
        Elige un lote en el plano para ver su área, su precio y su estado.
      </aside>
    );
  }
  const estado = estadoEnPlano(lote);
  return (
    <aside className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-tarjeta" aria-live="polite"
      aria-label={`Manzana ${lote.manzana}, lote ${lote.numero}`} data-panel-lote={lote.clave}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-extrabold text-foreground">Mz. {lote.manzana} · Lote {lote.numero}</h3>
        <button type="button" onClick={cerrar} aria-label="Cerrar el detalle del lote"
          className="rounded-full p-1.5 text-tinta-2 hover:bg-muted hover:text-foreground">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Dato termino="Área">{m2(lote.areaM2)}</Dato>
        <Dato termino="Estado">{ESTILO_LOTE[estado].etiqueta}</Dato>
        <Dato termino="Precio">{lote.precio != null ? precio(lote.precio, lote.moneda, true) : "A consultar"}</Dato>
        <Dato termino="Precio por m²">{lote.precioPorM2 != null ? precio(lote.precioPorM2, lote.moneda) : "—"}</Dato>
        {lote.zonificacion && <Dato termino="Zonificación">{lote.zonificacion}</Dato>}
        <Dato termino="Independización">{lote.independizacionEtiqueta}</Dato>
      </dl>
      {lote.publicado ? (
        <div className="space-y-3">
          <Link to={enlaceLote(proyectoCodigo, lote)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">
            Ver ficha del lote <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          {/* v1.0 (etapa 4): cita desde el plano. Un lote con caso propio la pide desde la ficha de su caso. */}
          {!lote.casoCodigo && (
            <SolicitarCita compacto key={lote.clave}
              destino={{ proyectoCodigo, lote: lote.clave, nombre: `Mz. ${lote.manzana} Lote ${lote.numero}`, referencia: lote.codigo }} />
          )}
        </div>
      ) : (
        <p className="text-xs text-tinta-2">Este lote no se ofrece en línea. Consulta por él con un asesor.</p>
      )}
    </aside>
  );
}

function Dato({ termino, children }: { termino: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-tinta-2">{termino}</dt>
      <dd className="cifras font-bold text-foreground">{children}</dd>
    </div>
  );
}
