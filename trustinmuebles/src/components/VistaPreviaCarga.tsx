import { CheckCircle2, TriangleAlert } from "lucide-react";
import { Mensaje } from "@/components/base/Mensaje";
import { ETIQUETA_ACCION, filasAMostrar, sePuedeConfirmar, textoConfirmar, textoResumen } from "@/lib/cargaLotes";
import type { VistaPreviaCarga as Vista } from "@/lib/types";

const tarjeta = "rounded-[2rem] border border-border bg-card p-6 shadow-tarjeta sm:p-8";

/**
 * v1.0 (etapa 3b): la vista previa de un CSV de lotes. Dice qué se crearía, qué cambiaría y qué errores tiene cada fila, y
 * solo deja confirmar si no hay ni un error (todo o nada). No guarda nada por sí sola.
 */
export function VistaPreviaCarga({ vista, soloErrores, cambiarSoloErrores, ocupado = false, alConfirmar, alCancelar }: {
  vista: Vista; soloErrores: boolean; cambiarSoloErrores: (v: boolean) => void; ocupado?: boolean;
  alConfirmar: () => void; alCancelar: () => void;
}) {
  const mostrar = filasAMostrar(vista, soloErrores);
  return (
      <section aria-labelledby="titulo-previa" className={`${tarjeta} space-y-5`} data-vista-previa>
        <h2 id="titulo-previa" className="text-xl font-bold text-foreground">2. Revisa antes de guardar</h2>
        <p className="cifras text-base font-bold text-foreground" aria-live="polite">{textoResumen(vista)}</p>

        {vista.erroresGenerales.length > 0 && (
          <Mensaje tono="error" titulo="El archivo no se puede leer">
            <ul className="list-disc space-y-1 pl-5">{vista.erroresGenerales.map((e) => <li key={e}>{e}</li>)}</ul>
          </Mensaje>
        )}
        {vista.valida ? (
          <Mensaje tono="ok">Sin errores. Al confirmar se guarda todo el archivo; si prefieres corregir algo, elige otro archivo.</Mensaje>
        ) : vista.erroresGenerales.length === 0 && (
          <Mensaje tono="error" titulo={`${vista.conErrores} ${vista.conErrores === 1 ? "fila tiene" : "filas tienen"} errores`}>
            No se guarda nada mientras haya errores. Corrige el archivo y vuelve a elegirlo.
          </Mensaje>
        )}

        {vista.filas.length > 0 && (
          <>
            {vista.conErrores > 0 && (
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                <input type="checkbox" checked={soloErrores} onChange={(e) => cambiarSoloErrores(e.target.checked)} className="size-4 accent-primary" />
                Ver solo las filas con errores
              </label>
            )}
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <caption className="sr-only">Filas del archivo con lo que se haría con cada una</caption>
                <thead className="bg-superficie text-xs font-bold uppercase tracking-wide text-tinta-2">
                  <tr>
                    <th scope="col" className="px-3 py-2">Fila</th><th scope="col" className="px-3 py-2">Lote</th>
                    <th scope="col" className="px-3 py-2">Qué pasa</th><th scope="col" className="px-3 py-2">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {mostrar.filas.map((f) => (
                    <tr key={f.fila} data-fila={f.fila} data-accion={f.accion} className="border-t border-border align-top">
                      <td className="cifras px-3 py-2 font-semibold">{f.fila}</td>
                      <td className="cifras px-3 py-2">{f.clave ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 font-bold ${f.accion === "ERROR" ? "text-sem-rojo-tinta" : "text-foreground"}`}>
                          {f.accion === "ERROR" ? <TriangleAlert className="size-4" aria-hidden="true" /> : <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />}
                          {ETIQUETA_ACCION[f.accion]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-tinta-2">
                        {f.errores.length > 0 ? (
                          <ul className="list-disc space-y-0.5 pl-4 font-semibold text-sem-rojo-tinta">{f.errores.map((e) => <li key={e}>{e}</li>)}</ul>
                        ) : f.cambios.length > 0 ? f.cambios.join(" · ") : "Igual que lo guardado"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {mostrar.ocultas > 0 && (
              <p className="text-sm text-tinta-2">
                Se muestran las primeras {mostrar.filas.length} de {mostrar.total} filas.{" "}
                {!soloErrores && vista.conErrores > 0 && "Marca «Ver solo las filas con errores» para verlas todas."}
              </p>
            )}
          </>
        )}

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={alConfirmar} disabled={!sePuedeConfirmar(vista) || ocupado}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {textoConfirmar(vista)}
          </button>
          <button type="button" onClick={alCancelar} disabled={ocupado}
            className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground hover:border-primary/40">
            Cancelar
          </button>
        </div>
      </section>
  );
}
