import { useEffect, useState } from "react";
import { FunnelX, SlidersHorizontal } from "lucide-react";
import { claseCampo } from "@/components/base/Campo";
import { OPCIONES_A } from "@/lib/catalogo";
import {
  contarFiltros, errorDeRangos, numeroValido, OPCIONES_ESTADO_COMERCIAL, OPCIONES_MONEDA, OPCIONES_ORDEN,
  OPCIONES_TIPO_PUBLICO, textoContador, valorDeOrden, type FiltrosPublico,
} from "@/lib/filtrosPublico";
import { nombreTipoAlerta } from "@/lib/cartera";
import type { OpcionesFiltro } from "@/lib/types";
import { CATEGORIAS_USO, etiquetaUso, USOS_LOTE, type CategoriaUso } from "@/lib/usosLote";

const etiqueta = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-tinta-2";
const campo = `${claseCampo} !h-11`;

/**
 * v1.0 (etapa 2): filtros y orden del catálogo público. Las listas desplegables aplican al elegir; los números, al salir
 * del campo o con Intro (así no se pide al servidor con cada tecla). El estado vive en la URL: este componente solo la edita.
 */
export function FiltrosInmuebles({ filtros, opciones, cambiar, limpiar, total }: {
  filtros: FiltrosPublico; opciones: OpcionesFiltro | null; cambiar: (parcial: Partial<FiltrosPublico>) => void;
  limpiar: () => void; total: number | null;
}) {
  const [abierto, setAbierto] = useState(false);
  const activos = contarFiltros(filtros);
  const rango = errorDeRangos(filtros);

  return (
    <section aria-label="Filtros y orden" className="rounded-[1.75rem] border border-border bg-card p-4 shadow-tarjeta sm:p-5">
      <div className="flex flex-wrap items-end gap-3">
        <button type="button" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto} aria-controls="panel-filtros"
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-bold text-foreground transition-colors hover:border-primary/40 lg:hidden">
          <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
          Filtros{activos > 0 && <span className="cifras rounded-full bg-primary px-2 py-0.5 text-xs text-white">{activos}</span>}
        </button>
        <div className="min-w-0 flex-1 basis-56 sm:max-w-xs sm:flex-none">
          <label htmlFor="orden-inmuebles" className={etiqueta}>Ordenar por</label>
          <select id="orden-inmuebles" className={campo} value={valorDeOrden(filtros)}
            onChange={(e) => {
              const o = OPCIONES_ORDEN.find((x) => x.valor === e.target.value);
              if (o) cambiar({ orden: o.orden, sentido: o.sentido });
            }}>
            {OPCIONES_ORDEN.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
          </select>
        </div>
        <button type="button" onClick={limpiar} disabled={activos === 0}
          className="ml-auto inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-bold text-foreground transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40">
          <FunnelX className="size-4" aria-hidden="true" /> Limpiar filtros
        </button>
      </div>

      <div id="panel-filtros" className={`${abierto ? "grid" : "hidden lg:grid"} mt-4 grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4`}>
        <Lista id="f-proyecto" nombre="Proyecto" valor={filtros.proyecto} todos="Todos los proyectos"
          opciones={(opciones?.proyectos ?? []).map((p) => ({ valor: p, etiqueta: p }))} alCambiar={(v) => cambiar({ proyecto: v })} />
        <Lista id="f-distrito" nombre="Distrito" valor={filtros.distrito} todos="Todos los distritos"
          opciones={(opciones?.distritos ?? []).map((p) => ({ valor: p, etiqueta: p }))} alCambiar={(v) => cambiar({ distrito: v })} />
        <Lista id="f-tipo" nombre="Tipo" valor={filtros.tipo} todos="Lotes y viviendas"
          opciones={OPCIONES_TIPO_PUBLICO} alCambiar={(v) => cambiar({ tipo: v as FiltrosPublico["tipo"] })} />
        <Lista id="f-comercial" nombre="Estado comercial" valor={filtros.estadoComercial} todos="Cualquiera"
          opciones={OPCIONES_ESTADO_COMERCIAL} alCambiar={(v) => cambiar({ estadoComercial: v as FiltrosPublico["estadoComercial"] })} />

        <Lista id="f-moneda" nombre="Moneda de los precios" valor={filtros.moneda} todos="Soles si pones un precio"
          opciones={OPCIONES_MONEDA} alCambiar={(v) => cambiar({ moneda: v as FiltrosPublico["moneda"] })} />
        <Rango nombre="Precio" id="f-precio" min={filtros.precioMin} max={filtros.precioMax}
          alCambiar={(min, max) => cambiar({ precioMin: min, precioMax: max })} />
        <Rango nombre="Precio por m²" id="f-precio-m2" min={filtros.precioM2Min} max={filtros.precioM2Max}
          alCambiar={(min, max) => cambiar({ precioM2Min: min, precioM2Max: max })} />
        <Rango nombre="Área del terreno (m²)" id="f-area" min={filtros.areaMin} max={filtros.areaMax}
          alCambiar={(min, max) => cambiar({ areaMin: min, areaMax: max })} />

        <Lista id="f-a" nombre="Indicador A (documentos)" valor={filtros.indicadorA} todos="Cualquiera"
          opciones={OPCIONES_A} alCambiar={(v) => cambiar({ indicadorA: v as FiltrosPublico["indicadorA"] })} />
        <Lista id="f-alerta" nombre="Tipo de alerta" valor={filtros.tipoAlerta} todos="Cualquiera"
          opciones={(opciones?.tiposAlerta ?? []).map((x) => ({ valor: x.codigo, etiqueta: nombreTipoAlerta(x.codigo, opciones?.tiposAlerta) }))}
          alCambiar={(v) => cambiar({ tipoAlerta: v })} />

        {/* v1.0 (etapa 6): zonificación y uso según la guía de usos del lote (usos-lote.json). */}
        <Lista id="f-zonificacion" nombre="Zonificación" valor={filtros.zonificacion ?? ""} todos="Cualquiera"
          opciones={USOS_LOTE.zonas.map((z) => ({ valor: z.codigo, etiqueta: `${z.codigo} · ${z.nombre}` }))}
          alCambiar={(v) => cambiar({ zonificacion: v || undefined })} />
        <Lista id="f-uso" nombre="Uso que buscas" valor={filtros.uso ?? ""} todos="Cualquiera"
          opciones={CATEGORIAS_USO.map((c) => ({ valor: c, etiqueta: etiquetaUso(c) }))}
          alCambiar={(v) => cambiar({ uso: (v || undefined) as CategoriaUso | undefined })} />
        <div className="flex items-end sm:col-span-2">
          <label htmlFor="f-sin-zonificacion" className={`flex min-h-11 items-center gap-2.5 text-sm font-semibold ${filtros.zonificacion || filtros.uso ? "text-foreground" : "text-tinta-2/60"}`}>
            <input id="f-sin-zonificacion" type="checkbox" className="size-4 accent-primary"
              disabled={!filtros.zonificacion && !filtros.uso} checked={!!filtros.incluirSinZonificacion}
              onChange={(e) => cambiar({ incluirSinZonificacion: e.target.checked || undefined })} />
            Incluir también los inmuebles sin zonificación registrada
          </label>
        </div>
      </div>

      {rango && <p role="alert" className="mt-3 text-sm font-semibold text-sem-rojo-tinta">{rango}</p>}
      <p className="cifras mt-3 text-sm font-semibold text-tinta-2" aria-live="polite">
        {total === null ? "Buscando…" : textoContador(total, activos > 0)}
      </p>
    </section>
  );
}

function Lista({ id, nombre, valor, todos, opciones, alCambiar }: {
  id: string; nombre: string; valor: string; todos: string; opciones: { valor: string; etiqueta: string }[];
  alCambiar: (v: string) => void;
}) {
  // Si la URL trae un valor que ya no está en la lista (por ejemplo un proyecto retirado), se sigue mostrando.
  const lista = valor && !opciones.some((o) => o.valor === valor) ? [...opciones, { valor, etiqueta: valor }] : opciones;
  return (
    <div>
      <label htmlFor={id} className={etiqueta}>{nombre}</label>
      <select id={id} className={campo} value={valor} onChange={(e) => alCambiar(e.target.value)}>
        <option value="">{todos}</option>
        {lista.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
      </select>
    </div>
  );
}

function Rango({ nombre, id, min, max, alCambiar }: {
  nombre: string; id: string; min: string; max: string; alCambiar: (min: string, max: string) => void;
}) {
  const [a, setA] = useState(min);
  const [b, setB] = useState(max);
  // Al limpiar los filtros o cambiar la URL, los campos se ponen al día.
  useEffect(() => setA(min), [min]);
  useEffect(() => setB(max), [max]);
  const aplicar = () => {
    const nx = numeroValido(a), ny = numeroValido(b);
    setA(nx);
    setB(ny);
    if (nx !== min || ny !== max) alCambiar(nx, ny);
  };
  const alTeclear = (e: React.KeyboardEvent) => { if (e.key === "Enter") aplicar(); };
  return (
    <fieldset>
      <legend className={etiqueta}>{nombre}</legend>
      <div className="flex gap-2">
        <input id={`${id}-min`} aria-label={`${nombre}, mínimo`} placeholder="Mín." inputMode="decimal" className={campo}
          value={a} onChange={(e) => setA(e.target.value)} onBlur={aplicar} onKeyDown={alTeclear} />
        <input id={`${id}-max`} aria-label={`${nombre}, máximo`} placeholder="Máx." inputMode="decimal" className={campo}
          value={b} onChange={(e) => setB(e.target.value)} onBlur={aplicar} onKeyDown={alTeclear} />
      </div>
    </fieldset>
  );
}
