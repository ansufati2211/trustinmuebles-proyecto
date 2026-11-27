import { useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Link } from "react-router";
import { ArrowRight, X } from "lucide-react";
import { ICONO_ESTADO_LOTE, InsigniaEstadoLote } from "@/components/base/EstadoLote";
import { posicionesDe, etiquetaPosicion, SIN_DATO } from "@/lib/posicionLote";
import { precio, m2 } from "@/lib/formato";
import {
  ESTILO_LOTE, ORDEN_LEYENDA, activaLote, conteoPlano, descripcionLote, dibujarPlano, enlaceLote, estadoEnPlano, etiquetaLote,
  siguienteIndice, type EstadoPlano,
} from "@/lib/proyectos";
import type { LoteProyecto } from "@/lib/types";
import { PlanoLotizacion } from "@/components/PlanoLotizacion";
import { SolicitarCita } from "@/components/SolicitarCita";

/**
 * v1.0 (etapa 3a): plano del proyecto por manzanas, en SVG propio. Cada lote muestra su número y el color de su estado
 * comercial (con un patrón y la leyenda en texto, nunca solo color). Se usa con teclado: Tab entra al plano, las flechas
 * recorren los lotes en orden y Enter o Espacio abren el panel con el área, el precio, el precio por m², el estado y el
 * enlace a la ficha.
 */
export function PlanoLotes({ proyectoCodigo, lotes, inicial = null, resaltados, destacar = false }: {
  proyectoCodigo: string; lotes: LoteProyecto[]; inicial?: string | null;
  /** v1.0 (etapa 14): claves de los lotes que cumplen los filtros del catálogo; los demás se dibujan atenuados. */
  resaltados?: Set<string>;
  /** v2.0 (RF49): con filtros activos, los lotes que los cumplen llevan un aro dorado. */
  destacar?: boolean;
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
                  const cumple = !resaltados || resaltados.has(l.clave);
                  const Icono = ICONO_ESTADO_LOTE[est.icono];
                  const conBanda = estado !== "DISPONIBLE";
                  return (
                    <g key={l.clave} opacity={cumple ? 1 : 0.4} data-cumple={cumple} ref={(el) => { refs.current[i] = el; }} role="button" tabIndex={i === foco ? 0 : -1}
                      aria-label={descripcionLote(l, precio)} aria-pressed={activo} data-lote={l.clave} data-estado={estado}
                      onClick={() => { setElegido(l.clave); setFoco(i); }} onKeyDown={(e) => alTeclear(e, l)}
                      onFocus={() => setFoco(i)}
                      className="cursor-pointer outline-none [&:focus-visible>rect:last-of-type]:stroke-[3]">
                      <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx="2" fill={est.relleno} />
                      {est.patron && <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx="2" fill={`url(#patron-${est.patron})`} />}
                      <text x={x + w / 2} y={y + h / 2 - (conBanda ? 3 : 0)} textAnchor="middle" fontSize="14" fontWeight="800" fill={est.texto}>
                        {etiquetaLote(l)}
                      </text>
                      {/* v2.0 (RF40): ícono del estado en la esquina y, en separado, vendido y no publicado, una franja de color fuerte con su etiqueta. */}
                      <circle cx={x + w - 10} cy={y + 10} r="8" fill={est.fuerte} data-icono-estado={estado} />
                      <Icono x={x + w - 15} y={y + 5} width={10} height={10} color={est.sobreFuerte} strokeWidth={3} aria-hidden="true" />
                      {conBanda && (
                        <>
                          <rect x={x + 1} y={y + h - 17} width={w - 2} height={16} rx="2" fill={est.fuerte} data-banda-estado={estado} />
                          <text x={x + w / 2} y={y + h - 5.5} textAnchor="middle" fontSize="8.5" fontWeight="800" fill={est.sobreFuerte}
                            textLength={estado === "NO_PUBLICADO" ? w - 8 : 38} lengthAdjust="spacingAndGlyphs">
                            {est.corto}
                          </text>
                        </>
                      )}
                      {cumple && destacar && <rect x={x - 1} y={y - 1} width={w + 2} height={h + 2} rx="4" fill="none" stroke="var(--paleta-dorado)" strokeWidth="3" data-destacado />}
                      <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx="2" fill="none"
                        stroke={activo ? "var(--paleta-verde-oscuro)" : est.borde} strokeWidth={activo ? 3.5 : est.patron ? 2 : 1.4} strokeDasharray={est.trazo} />
                    </g>
                  );
                })}
              </g>
            ))}
          </svg>
        </div>
        <PanelLote proyectoCodigo={proyectoCodigo} lote={lote} cerrar={() => setElegido(null)} />
      </div>
      {/* v1.0 (etapa 11): el plano de la lotización entero, con un punto por lote; tocar uno lo elige en el panel. */}
      <PlanoLotizacion proyectoCodigo={proyectoCodigo} lote={lote} lotes={lotes} soloCompleto titulo="Plano de la lotización"
        alElegir={(c) => { setElegido(c); setFoco(indice.get(c) ?? 0); }} />
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
            <svg width="22" height="22" aria-hidden="true">
              <rect x="1" y="1" width="20" height="20" rx="4" fill={est.fuerte} stroke={est.borde} strokeWidth="1.5" strokeDasharray={est.trazo} />
              {(() => { const I = ICONO_ESTADO_LOTE[est.icono]; return <I x={5} y={5} width={12} height={12} color={est.sobreFuerte} strokeWidth={3} />; })()}
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
      aria-label={`Manzana ${lote.manzana}, lote ${etiquetaLote(lote)}`} data-panel-lote={lote.clave}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-extrabold text-foreground">Mz. {lote.manzana} · Lote {etiquetaLote(lote)}</h3>
        <button type="button" onClick={cerrar} aria-label="Cerrar el detalle del lote"
          className="rounded-full p-1.5 text-tinta-2 hover:bg-muted hover:text-foreground">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Dato termino="Área">{m2(lote.areaM2)}</Dato>
        <Dato termino="Estado"><InsigniaEstadoLote estado={estado} tamano="sm" /></Dato>
        <Dato termino="Precio">{lote.precio != null ? precio(lote.precio, lote.moneda, true) : "A consultar"}</Dato>
        <Dato termino="Precio por m²">{lote.precioPorM2 != null ? precio(lote.precioPorM2, lote.moneda) : "—"}</Dato>
        {lote.zonificacion && <Dato termino="Zonificación">{lote.zonificacion}</Dato>}
        <Dato termino="Independización">{lote.independizacionEtiqueta}</Dato>
        {/* v2.0 (RF43 y RF49): posición, frontis, fondo y nota de reserva o descuento; «Sin dato» mientras no vengan. */}
        <Dato termino="Posición" dato="posicion" vacio={posicionesDe(lote.posicion).length === 0}>{etiquetaPosicion(lote.posicion)}</Dato>
        <Dato termino="Frontis" dato="frontis" vacio={lote.frontis == null}>{lote.frontis != null ? `${lote.frontis} m` : SIN_DATO}</Dato>
        <Dato termino="Fondo" dato="fondo" vacio={lote.fondo == null}>{lote.fondo != null ? `${lote.fondo} m` : SIN_DATO}</Dato>
        <Dato termino="Reserva o descuento" dato="nota" vacio={!lote.notaReserva}>{lote.notaReserva || SIN_DATO}</Dato>
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
              destino={{ proyectoCodigo, lote: lote.clave, nombre: `Mz. ${lote.manzana} Lote ${etiquetaLote(lote)}`, referencia: lote.codigo }} />
          )}
        </div>
      ) : (
        <p className="text-xs text-tinta-2">Este lote no se ofrece en línea. Consulta por él con un asesor.</p>
      )}
      {/* v1.0 (etapa 11): dónde está el lote en el plano de la lotización (si el proyecto lo tiene). */}
      <PlanoLotizacion proyectoCodigo={proyectoCodigo} lote={lote} />
    </aside>
  );
}

function Dato({ termino, children, dato, vacio = false }: { termino: string; children: ReactNode; dato?: string; vacio?: boolean }) {
  return (
    <div data-dato-panel={dato}>
      <dt className="text-xs font-semibold text-tinta-2">{termino}</dt>
      <dd className={`cifras ${vacio ? "font-medium italic text-tinta-2" : "font-bold text-foreground"}`}>{children}</dd>
    </div>
  );
}
