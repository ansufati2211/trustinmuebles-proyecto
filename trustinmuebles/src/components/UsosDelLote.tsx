import { Check, Info, Ruler } from "lucide-react";
import { USOS_LOTE, etiquetaUso, usosDelLote } from "@/lib/usosLote";

/**
 * v1.0 (etapa 5): «Usos que suelen permitirse» en la ficha de un lote o de un inmueble, según su zonificación y su área.
 * Es orientativo: siempre muestra el aviso de verificar el certificado de parámetros urbanísticos de la municipalidad.
 */
export function UsosDelLote({ zonificacion, areaM2, className = "" }: {
  zonificacion: string | null | undefined; areaM2: number | null | undefined; className?: string;
}) {
  const u = usosDelLote(zonificacion, areaM2);
  return (
    <section aria-labelledby="titulo-usos" data-usos-lote className={`space-y-4 ${className}`}>
      <div>
        <h2 id="titulo-usos" className="text-xl font-bold text-foreground">{USOS_LOTE.titulo}</h2>
        {u.estado === "CON_ZONIFICACION" && (
          <p className="mt-1 text-sm text-tinta-2">
            Zonificación <strong className="text-foreground">{u.zonificacion}</strong> ({u.zona.nombre})
            {areaM2 != null && <> · lote de <span className="cifras">{areaM2.toLocaleString("es-PE", { maximumFractionDigits: 2 })} m²</span></>}
          </p>
        )}
      </div>

      {u.estado === "CON_ZONIFICACION" ? (
        <>
          {u.permitidos.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {u.permitidos.map((x) => (
                <li key={x.texto} className="flex items-start gap-2.5 rounded-xl border border-border bg-superficie px-4 py-3 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    <span className="block font-semibold text-foreground">{x.texto}</span>
                    <span className="text-xs text-tinta-2">{etiquetaUso(x.categoria)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {u.conMasArea.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-tinta-2">Suelen pedir un lote más grande:</p>
              <ul className="space-y-1.5 text-sm text-tinta-2">
                {u.conMasArea.map((x) => (
                  <li key={x.texto} className="flex items-center gap-2">
                    <Ruler className="size-4 shrink-0" aria-hidden="true" />
                    {x.texto} <span className="cifras">(desde {x.areaMinimaM2} m²)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs leading-relaxed text-tinta-2">{USOS_LOTE.nota}</p>
        </>
      ) : (
        <p className="rounded-xl border border-border bg-superficie px-4 py-3 text-sm text-foreground">
          {u.estado === "ZONA_DESCONOCIDA" && <>Zonificación <strong>{u.zonificacion}</strong>. </>}
          {u.mensaje}
        </p>
      )}

      <p role="note" className="flex gap-2 rounded-xl border border-primary/30 bg-secondary px-4 py-3 text-sm font-semibold text-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> {u.aviso}
      </p>
    </section>
  );
}
