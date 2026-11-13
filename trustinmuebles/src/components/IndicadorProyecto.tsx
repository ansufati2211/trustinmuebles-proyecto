import { Info } from "lucide-react";
import { IndicadorA } from "@/components/base/Indicadores";
import type { IndicadorAProyecto } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { partidaVisible } from "@/lib/publico";

/**
 * v1.0 (etapa 3a): indicador A que acompaña a un lote sin caso propio. Es el de la partida matriz del proyecto y se
 * rotula así; sin partida matriz evaluada dice «sin evaluación documental». No lo cambian los hitos ni la publicación.
 * v1.0 (etapa 7): sin sesión, el número de la partida matriz sale parcialmente oculto, como en la ficha pública.
 */
export function IndicadorProyecto({ indicador, titulo = "h2" }: { indicador: IndicadorAProyecto; titulo?: "h2" | "h3" }) {
  const { usuario } = useAuth();
  const ev = indicador.evaluacion;
  const Titulo = titulo;
  return (
    <section aria-labelledby="titulo-indicador-proyecto" className="space-y-4" data-fuente-indicador={indicador.fuente}>
      <Titulo id="titulo-indicador-proyecto" className="text-xl font-bold text-foreground">{indicador.rotulo}</Titulo>
      {ev ? (
        <>
          <IndicadorA estado={ev.estado} conResumen tamano="lg" />
          <p className="text-sm text-tinta-2">
            Los lotes que todavía no tienen partida propia forman parte de la partida matriz del proyecto
            {indicador.casoCodigo ? ` (N.° ${partidaVisible(indicador.casoCodigo, !!usuario)})` : ""}: este indicador resume lo que se encontró en ella.
          </p>
          {ev.motivos.length > 0 && (
            <ul className="space-y-2 text-sm text-foreground">
              {ev.motivos.map((m, i) => (
                <li key={i} className="rounded-xl border border-border bg-superficie px-4 py-2.5">{m.texto}</li>
              ))}
            </ul>
          )}
          <p className="flex gap-2 text-xs text-tinta-2"><Info className="size-4 shrink-0" aria-hidden="true" />{ev.limite}</p>
        </>
      ) : (
        <p className="text-sm text-tinta-2">
          Todavía no hay una evaluación documental de la partida de este proyecto. Consulta con un asesor qué documentos
          tiene el lote antes de decidir.
        </p>
      )}
    </section>
  );
}
