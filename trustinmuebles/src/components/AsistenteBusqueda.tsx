import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, CalendarCheck, HelpCircle, MapPin, Ruler, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SolicitarCita } from "@/components/SolicitarCita";
import {
  busquedaDe, etiquetasDe, filtrosDe, interpretar, nombreBusqueda, recomendar, sugerencias, type ClaveEtiqueta,
} from "@/lib/asistente";
import { m2, precio } from "@/lib/formato";
import { enlaceInmueble } from "@/lib/proyectos";
import type { FiltrosPublico } from "@/lib/filtrosPublico";
import type { CategoriaUso } from "@/lib/usosLote";
import type { InmueblePublico, OpcionesFiltro } from "@/lib/types";

const EJEMPLO = "Ej.: lote en Subtanjalla de al menos 120 m², hasta 60 mil soles, para casa";

/**
 * v1.0 (etapa 5): asistente de búsqueda del catálogo público. El comprador escribe lo que busca; el asistente (reglas,
 * sin IA) lo convierte en filtros, muestra lo entendido como etiquetas que se pueden quitar, recomienda los 3 mejores
 * resultados con su motivo y al final ofrece solicitar una cita. Si no entiende, lo dice y ofrece búsquedas de ejemplo.
 */
export function AsistenteBusqueda({ opciones, filtros, uso, activo, resultados, cargando, alBuscar, alQuitar, alCerrar }: {
  opciones: OpcionesFiltro | null; filtros: FiltrosPublico; uso: CategoriaUso | null; activo: boolean;
  resultados: InmueblePublico[] | null; cargando: boolean;
  alBuscar: (filtros: FiltrosPublico, uso: CategoriaUso | null) => void;
  alQuitar: (clave: ClaveEtiqueta) => void; alCerrar: () => void;
}) {
  const [frase, setFrase] = useState("");
  const [noEntendido, setNoEntendido] = useState(false);
  const contexto = { proyectos: opciones?.proyectos ?? [], distritos: opciones?.distritos ?? [] };

  const buscar = (texto: string) => {
    const i = interpretar(texto, contexto);
    setNoEntendido(!i.entendido);
    if (i.entendido) alBuscar(filtrosDe(i), i.uso);
  };

  const etiquetas = etiquetasDe(filtros, uso);
  const recomendados = resultados ? recomendar(resultados, filtros, uso) : [];
  const proyecto = filtros.proyecto && resultados?.find((c) => c.predio.proyecto === filtros.proyecto);
  const proyectoCodigo = proyecto ? proyecto.proyectoCodigo ?? proyecto.predio.proyectoCodigo ?? undefined : undefined;

  return (
    <section aria-labelledby="titulo-asistente" data-asistente
      className="rounded-[1.75rem] border border-primary/25 bg-card p-4 shadow-tarjeta sm:p-6">
      <h2 id="titulo-asistente" className="flex items-center gap-2 text-lg font-bold text-foreground">
        <Sparkles className="size-5 text-primary" aria-hidden="true" /> Asistente de búsqueda
      </h2>
      <p className="mt-1 text-sm text-tinta-2">
        Cuéntanos qué buscas con tus palabras: zona o proyecto, presupuesto, área y para qué lo quieres.
      </p>
      <form className="mt-4 flex flex-col gap-3 sm:flex-row" role="search"
        onSubmit={(e) => { e.preventDefault(); buscar(frase); }}>
        <label htmlFor="frase-asistente" className="sr-only">Describe lo que buscas</label>
        <input id="frase-asistente" value={frase} onChange={(e) => setFrase(e.target.value)} maxLength={300}
          placeholder={EJEMPLO} autoComplete="off"
          className="h-12 min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 text-base text-foreground outline-none transition-shadow placeholder:text-tinta-2/70 focus:border-primary focus:ring-4 focus:ring-primary/15" />
        <Button type="submit" size="lg" className="h-12">Buscar</Button>
      </form>

      {noEntendido && (
        <div role="status" className="mt-4 space-y-3 rounded-2xl border border-border bg-superficie p-4">
          <p className="flex items-start gap-2 text-sm font-semibold text-foreground">
            <HelpCircle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            No entendí qué buscas. Prueba con el tipo (lote o casa), una zona, un precio o un área, o elige una de estas búsquedas:
          </p>
          <div className="flex flex-wrap gap-2">
            {sugerencias(contexto).map((s) => (
              <button key={s.frase} type="button" onClick={() => { setFrase(s.frase); buscar(s.frase); }}
                className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary">
                {s.texto}
              </button>
            ))}
          </div>
        </div>
      )}

      {activo && !noEntendido && (
        <div className="mt-5 space-y-5 border-t border-border pt-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-tinta-2">Entendí</p>
            {etiquetas.length === 0 ? (
              <p className="mt-2 text-sm text-tinta-2">Sin criterios: se muestran todos los inmuebles.</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2" aria-label="Lo que entendió el asistente">
                {etiquetas.map((e) => (
                  <li key={e.clave}>
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary py-1 pl-3.5 pr-1 text-sm font-semibold text-foreground">
                      {e.texto}
                      <button type="button" onClick={() => alQuitar(e.clave)} aria-label={`Quitar «${e.texto}»`}
                        className="inline-flex size-6 items-center justify-center rounded-full text-tinta-2 hover:bg-card hover:text-foreground">
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div aria-live="polite" aria-busy={cargando}>
            <p className="text-xs font-bold uppercase tracking-wider text-tinta-2">Te recomendamos</p>
            {cargando && !resultados ? (
              <p className="mt-2 text-sm text-tinta-2">Buscando…</p>
            ) : recomendados.length === 0 ? (
              <p className="mt-2 text-sm text-tinta-2">
                No encontré inmuebles disponibles con todo eso. Quita alguna etiqueta para ver más opciones.
              </p>
            ) : (
              <ol className="mt-3 grid gap-3 lg:grid-cols-3" data-recomendados>
                {recomendados.map((r, i) => {
                  const c = r.inmueble, p = c.predio;
                  return (
                    <li key={c.codigo} className="flex flex-col rounded-2xl border border-border bg-superficie p-4">
                      <p className="text-xs font-bold text-primary">Opción {i + 1}</p>
                      <Link to={enlaceInmueble(c)} className="mt-1 font-bold leading-snug text-foreground hover:text-primary">
                        {c.denominacion}
                      </Link>
                      <p className="cifras mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-tinta-2">
                        <span className="font-bold text-foreground">
                          {p.precioReferencial != null ? precio(p.precioReferencial, p.moneda, true) : "Precio a consultar"}
                        </span>
                        {p.areaM2 != null && <span className="inline-flex items-center gap-1"><Ruler className="size-3.5" aria-hidden="true" />{m2(p.areaM2)}</span>}
                        {p.distrito && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden="true" />{p.distrito}</span>}
                      </p>
                      <p className="mt-3 text-xs font-bold text-tinta-2">Por qué</p>
                      <ul className="mt-1 flex-1 list-disc space-y-1 pl-4 text-sm text-foreground">
                        {r.motivos.map((m) => <li key={m}>{m}</li>)}
                      </ul>
                      <Link to={enlaceInmueble(c)} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                        Ver la ficha <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-secondary p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-sm font-semibold text-foreground">
              <CalendarCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              ¿Quieres que un asesor te ayude con esta búsqueda? Te mostramos las opciones en una reunión o por teléfono.
            </p>
            <SolicitarCita compacto destino={{
              nombre: nombreBusqueda(etiquetas), referencia: "", busqueda: busquedaDe(filtros), proyectoCodigo,
            }} />
          </div>

          <button type="button" onClick={() => { setFrase(""); alCerrar(); }}
            className="text-sm font-bold text-tinta-2 hover:text-primary">
            Cerrar el asistente y limpiar la búsqueda
          </button>
        </div>
      )}
    </section>
  );
}
