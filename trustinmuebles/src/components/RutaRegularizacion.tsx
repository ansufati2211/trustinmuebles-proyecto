import { CheckCircle2, Gauge, Info, Route } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TituloSeccion } from "@/components/base/TituloSeccion";
import { useApi } from "@/lib/useApi";
import { AVISO_RUTA, ETIQUETA_ESFUERZO, gestiona, ordenarPorEsfuerzo } from "@/lib/ruta";
import type { Esfuerzo, RutaRegularizacion as Ruta } from "@/lib/types";

/** Chip de esfuerzo: contorno con ícono y texto, sin relleno, para no confundirlo con el color del indicador A. */
export function ChipEsfuerzo({ esfuerzo }: { esfuerzo: Esfuerzo | null }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs font-bold text-foreground">
      <Gauge className="size-3.5" aria-hidden="true" />
      {esfuerzo ? ETIQUETA_ESFUERZO[esfuerzo] : "Sin pasos"}
    </span>
  );
}

/**
 * Ruta de regularización del caso (v0.8): un paso por motivo, quién lo gestiona, el documento y el esfuerzo. Es
 * orientativa, de solo lectura y no cambia el semáforo.
 */
export function RutaRegularizacion({ codigo }: { codigo: string }) {
  const { data, loading, error } = useApi<Ruta>(`/casos/${codigo}/ruta-regularizacion`);

  return (
    <Card id="ex-ruta" className="scroll-mt-28 rounded-[2rem] border-border shadow-tarjeta">
      <CardContent className="space-y-5 p-6 sm:p-8">
        <TituloSeccion
          icono={Route}
          descripcion="Qué haría falta para subsanar cada motivo del semáforo, quién lo gestiona y qué documento se necesita."
          derecha={data && data.items.length > 0 ? <ChipEsfuerzo esfuerzo={data.esfuerzo} /> : undefined}
        >
          Ruta de regularización
        </TituloSeccion>

        <p className="flex items-start gap-2 rounded-2xl border border-info-tinta/20 bg-info-suave p-3 text-sm font-semibold text-info-tinta">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {data?.aviso ?? AVISO_RUTA}
        </p>

        {loading && !data && <p role="status" className="text-sm text-tinta-2">Cargando la ruta…</p>}
        {error && <p role="alert" className="text-sm font-semibold text-sem-rojo-tinta">{error.message}</p>}

        {data && data.items.length === 0 && (
          <p className="flex items-start gap-2 text-sm font-semibold text-sem-verde-tinta">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {data.mensaje ?? "No hay pasos de regularización para este caso."}
          </p>
        )}

        {data && data.items.length > 0 && (
          <ol className="space-y-4">
            {ordenarPorEsfuerzo(data.items).map((it, i) => (
              <li key={`${it.clave}-${it.referencia ?? i}`} className="rounded-2xl border border-border bg-superficie p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-extrabold leading-snug text-foreground">
                    {it.titulo}
                    <span className="ml-2 text-xs font-semibold text-tinta-2">
                      {it.clave.startsWith("R") ? it.clave : "Dato faltante"}{it.referencia ? ` · ${it.referencia}` : ""}
                    </span>
                  </h3>
                  <ChipEsfuerzo esfuerzo={it.esfuerzo} />
                </div>
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-foreground">
                  {it.pasos.map((p) => <li key={p}>{p}</li>)}
                </ol>
                {it.gravamen && (
                  <p className="mt-3 rounded-xl border border-border bg-card p-3 text-sm font-semibold text-foreground">
                    Acreedor: {it.gravamen.acreedor}. {it.gravamen.plazo}.
                  </p>
                )}
                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <div><dt className="font-bold text-tinta-2">Gestiona</dt><dd className="font-semibold text-foreground">{gestiona(it.gestiona)}</dd></div>
                  <div><dt className="font-bold text-tinta-2">Documento requerido</dt><dd className="font-semibold text-foreground">{it.documentoRequerido}</dd></div>
                </dl>
                <p className="mt-2 text-xs text-tinta-2">{it.esfuerzoEtiqueta}.{it.nota ? ` ${it.nota}` : ""}</p>
              </li>
            ))}
          </ol>
        )}

        {data && (
          <p className="text-xs text-tinta-2">
            {data.plazoGeneral}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
