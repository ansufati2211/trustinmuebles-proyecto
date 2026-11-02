import { Link } from "react-router";
import { Gauge, Grid3x3, Info, ListChecks, Lock, Tags } from "lucide-react";
import { ChipGestion } from "@/components/PanelGestion";
import { AVISO_GESTION, ESTADOS_GESTION, GESTION } from "@/lib/gestion";
import { TituloSeccion } from "@/components/base/TituloSeccion";
import { IndicadorA } from "@/components/base/Indicadores";
import { ChipEsfuerzo } from "@/components/RutaRegularizacion";
import { nombreTipoAlerta } from "@/lib/cartera";
import { ESFUERZOS, ETIQUETA_ESFUERZO } from "@/lib/ruta";
import type { PanelCartera } from "@/lib/types";

const tarjeta = "rounded-[2rem] border border-border bg-card p-6 shadow-tarjeta sm:p-7";
export const AVISO_PRIORIZACION = "Priorización interna de la inmobiliaria; no es una recomendación de compra";

/**
 * v0.8 (feedback a, D52): casos por tipo de alerta, por esfuerzo de regularización y la tabla «Por regularizar». Solo
 * para el gestor; organiza la subsanación y no se muestra al comprador.
 */
export function PanelRegularizacion({ panel, alElegirTipo }: { panel: PanelCartera; alElegirTipo: (codigo: string) => void }) {
  const tipos = panel.porTipoAlerta ?? [];
  const esfuerzo = panel.porEsfuerzo ?? {};
  const lista = panel.porRegularizar ?? [];
  const aviso = panel.avisoPriorizacion ?? AVISO_PRIORIZACION;

  return (
    <div className="space-y-6">
      <p className="flex items-start gap-2 rounded-2xl border border-info-tinta/20 bg-info-suave p-4 text-sm font-semibold text-info-tinta">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {aviso}
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="titulo-tipos" className={`${tarjeta} space-y-4`}>
          <TituloSeccion icono={Tags} id="titulo-tipos" descripcion="Un caso puede tener varios tipos de alerta. Elige uno para filtrar la lista de casos.">
            Casos por tipo de alerta
          </TituloSeccion>
          <ul className="space-y-2">
            {tipos.map((t) => (
              <li key={t.codigo}>
                <button
                  type="button"
                  disabled={t.casos === 0}
                  onClick={() => alElegirTipo(t.codigo)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-superficie px-4 py-2.5 text-left text-sm transition-colors hover:border-primary/40 disabled:cursor-default disabled:opacity-60 disabled:hover:border-border"
                >
                  <span className="min-w-0 font-semibold text-foreground">{nombreTipoAlerta(t.codigo, tipos)}</span>
                  <span className="cifras shrink-0 text-lg font-black text-foreground">{t.casos}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="titulo-esfuerzo" className={`${tarjeta} space-y-4`}>
          <TituloSeccion icono={Gauge} id="titulo-esfuerzo" descripcion="Criterio del equipo, borrador pendiente de revisión especializada. No es un plazo ni un costo.">
            Esfuerzo de regularización
          </TituloSeccion>
          <ul className="grid grid-cols-2 gap-3">
            {[...ESFUERZOS, "SIN_PASOS" as const].map((e) => (
              <li key={e} className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-superficie p-4">
                <span className="text-sm font-bold text-foreground">{e === "SIN_PASOS" ? "Sin pasos" : ETIQUETA_ESFUERZO[e]}</span>
                <span className="cifras text-3xl font-black text-foreground">{esfuerzo[e] ?? 0}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="titulo-gestion-panel" className={`${tarjeta} space-y-4 border-2 border-dashed`}>
        <TituloSeccion icono={Lock} id="titulo-gestion-panel" descripcion={panel.avisoGestion ?? AVISO_GESTION}>
          Gestión inmobiliaria (interno)
        </TituloSeccion>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {ESTADOS_GESTION.map((g) => (
            <li key={g} className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-superficie p-4">
              <ChipGestion estado={g} />
              <span className="cifras text-3xl font-black text-foreground">{panel.porEstadoGestion?.[g] ?? 0}</span>
            </li>
          ))}
        </ul>
        {(panel.matrizGestion ?? []).length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <caption className="mb-2 flex items-center gap-2 text-left text-sm font-bold text-foreground">
                <Grid3x3 className="size-4 text-primary" aria-hidden="true" /> Tipo de alerta × estado de gestión
              </caption>
              <thead className="text-xs text-tinta-2">
                <tr>
                  <th scope="col" className="py-2 pr-3">Tipo de alerta</th>
                  {ESTADOS_GESTION.map((g) => <th key={g} scope="col" className="py-2 pr-3">{GESTION[g].etiqueta}</th>)}
                </tr>
              </thead>
              <tbody>
                {(panel.matrizGestion ?? []).map((f) => (
                  <tr key={f.codigo} className="border-t border-border">
                    <th scope="row" className="py-2 pr-3 font-semibold text-foreground">{nombreTipoAlerta(f.codigo, tipos)}</th>
                    {ESTADOS_GESTION.map((g) => <td key={g} className="cifras py-2 pr-3">{f.porEstadoGestion?.[g] ?? 0}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="titulo-por-regularizar" className={`${tarjeta} space-y-4`}>
        <TituloSeccion icono={ListChecks} id="titulo-por-regularizar" descripcion="Ordenados por esfuerzo y luego por código, para organizar la subsanación.">
          Por regularizar
        </TituloSeccion>
        {lista.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-border bg-superficie p-5 text-sm font-semibold text-tinta-2">
            Ningún caso tiene pasos de regularización.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <caption className="sr-only">Casos por regularizar. {aviso}</caption>
              <thead className="text-xs uppercase tracking-wide text-tinta-2">
                <tr>
                  <th scope="col" className="py-2 pr-3">Caso</th>
                  <th scope="col" className="py-2 pr-3">Indicador A</th>
                  <th scope="col" className="py-2 pr-3">Tipos de alerta</th>
                  <th scope="col" className="py-2 pr-3">Esfuerzo</th>
                  <th scope="col" className="py-2">Gestión</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.codigo} className="border-t border-border align-top">
                    <td className="py-3 pr-3">
                      <Link to={`/casos/${c.codigo}#ex-ruta`} className="font-bold text-foreground hover:text-primary">{c.codigo}</Link>
                      <span className="block text-xs text-tinta-2">{c.denominacion}</span>
                    </td>
                    <td className="py-3 pr-3">{c.color && <IndicadorA estado={c.color} tamano="sm" conPrefijo={false} />}</td>
                    <td className="py-3 pr-3 text-xs text-foreground">{c.tiposAlerta.map((t) => nombreTipoAlerta(t, tipos)).join(" · ")}</td>
                    <td className="py-3 pr-3"><ChipEsfuerzo esfuerzo={c.esfuerzo} /></td>
                    <td className="py-3">{c.estadoGestion && <ChipGestion estado={c.estadoGestion} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
