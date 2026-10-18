import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ETIQUETA_ACTO, RUBROS } from "@/lib/semaforo";
import type { AsientoPeticion, EstadoAnotacion, TipoActo } from "@/lib/types";

/** Fila editable de un asiento. El estado de un gravamen solo admite vigente o desconocido: lo cancela un asiento E. */
export interface Fila {
  referencia: string; tipoActo: TipoActo; estado: "VIGENTE" | "DESCONOCIDO"; fechaInscripcion: string;
  tituloNumero: string; fechaPresentacion: string; texto: string; canceloNumero: string; titulares: string;
}

export const campo = "w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
export const MAX_ASIENTOS = 40;

export const FILA_VACIA: Fila = {
  referencia: "", tipoActo: "OTRO", estado: "VIGENTE", fechaInscripcion: "", tituloNumero: "",
  fechaPresentacion: "", texto: "", canceloNumero: "", titulares: "",
};

export const rubroDe = (f: Fila) => f.referencia.charAt(0).toUpperCase();

/** Un gravamen (rubro D) figura cancelado si un asiento E lo cancela. No se escribe a mano. */
function canceladores(filas: Fila[]) {
  const canceladoPor = new Map<string, string>();
  for (const f of filas) if (rubroDe(f) === "E" && f.canceloNumero) canceladoPor.set(f.canceloNumero, f.referencia);
  return canceladoPor;
}

/** Convierte las filas del formulario en los asientos que recibe el servidor. */
export function filasAPeticion(filas: Fila[]): AsientoPeticion[] {
  const canceladoPor = canceladores(filas);
  return filas.map((f) => {
    const rubro = rubroDe(f);
    const estado: EstadoAnotacion | null = rubro === "D" ? (canceladoPor.has(f.referencia) ? "CANCELADA" : f.estado) : null;
    return {
      referencia: f.referencia.trim().toUpperCase(),
      tipoActo: f.tipoActo,
      estado,
      fechaInscripcion: f.fechaInscripcion || null,
      tituloNumero: f.tituloNumero.trim() || null,
      fechaPresentacion: f.fechaPresentacion || null,
      texto: f.texto.trim() || null,
      canceloNumero: rubro === "E" ? f.canceloNumero.trim() || null : null,
      titulares: rubro === "C" ? f.titulares.trim() || null : null,
    };
  });
}

/** Lista de asientos de la partida, editable. La usan el editor del expediente y el registro de partidas. */
export function FilasAsientos({ filas, setFilas }: { filas: Fila[]; setFilas: (f: Fila[]) => void }) {
  const cambiarFila = (i: number, parcial: Partial<Fila>) =>
    setFilas(filas.map((f, j) => (j === i ? { ...f, ...parcial } : f)));
  const canceladoPor = canceladores(filas);
  const referenciasD = filas.filter((f) => rubroDe(f) === "D").map((f) => f.referencia);

  return (
    <fieldset className="space-y-3">
            <legend className="text-sm font-bold mb-1">Asientos de la partida</legend>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Rubros: {Object.entries(RUBROS).map(([l, n]) => `${l} ${n.toLowerCase()}`).join(", ")}. El número empieza con la
              letra del rubro, por ejemplo C00001, D00001 o E00001.
            </p>
            {filas.length === 0 && <p className="text-sm text-muted-foreground">Sin asientos.</p>}
            {filas.map((f, i) => {
              const rubro = rubroDe(f);
              const cancelador = canceladoPor.get(f.referencia);
              return (
                <div key={i} className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor={`as-ref-${i}`} className="block text-xs font-bold text-muted-foreground mb-1">Número</label>
                      <input id={`as-ref-${i}`} className={campo} maxLength={6} value={f.referencia}
                        onChange={(e) => cambiarFila(i, { referencia: e.target.value.toUpperCase() })} />
                    </div>
                    <div className="col-span-6 sm:col-span-8">
                      <label htmlFor={`as-acto-${i}`} className="block text-xs font-bold text-muted-foreground mb-1">Tipo de acto</label>
                      <select id={`as-acto-${i}`} className={campo} value={f.tipoActo} onChange={(e) => cambiarFila(i, { tipoActo: e.target.value as TipoActo })}>
                        {(Object.keys(ETIQUETA_ACTO) as TipoActo[]).map((t) => <option key={t} value={t}>{ETIQUETA_ACTO[t]}</option>)}
                      </select>
                    </div>
                    <div className="col-span-12 sm:col-span-1 flex justify-end">
                      <button type="button" onClick={() => setFilas(filas.filter((_, j) => j !== i))}
                        aria-label={`Quitar el asiento ${f.referencia || i + 1}`}
                        className="h-11 w-11 inline-flex items-center justify-center rounded-xl text-muted-foreground hover:bg-danger/10 hover:text-[#B91C1C] transition-colors">
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {rubro === "C" && (
                    <div>
                      <label htmlFor={`as-tit-${i}`} className="block text-xs font-bold text-muted-foreground mb-1">Titulares que resultan de este asiento</label>
                      <input id={`as-tit-${i}`} className={campo} maxLength={500} value={f.titulares} onChange={(e) => cambiarFila(i, { titulares: e.target.value })} />
                    </div>
                  )}
                  {rubro === "D" && (
                    cancelador ? (
                      <p className="text-sm font-semibold text-foreground">
                        Estado: cancelado por el asiento {cancelador}. Si quitas esa cancelación, vuelve a figurar vigente.
                      </p>
                    ) : (
                      <div>
                        <label htmlFor={`as-est-${i}`} className="block text-xs font-bold text-muted-foreground mb-1">Estado</label>
                        <select id={`as-est-${i}`} className={campo} value={f.estado} onChange={(e) => cambiarFila(i, { estado: e.target.value as "VIGENTE" | "DESCONOCIDO" })}>
                          <option value="VIGENTE">Vigente</option>
                          <option value="DESCONOCIDO">Desconocido</option>
                        </select>
                      </div>
                    )
                  )}
                  {rubro === "E" && (
                    <div>
                      <label htmlFor={`as-can-${i}`} className="block text-xs font-bold text-muted-foreground mb-1">Asiento que cancela</label>
                      <select id={`as-can-${i}`} className={campo} value={f.canceloNumero} onChange={(e) => cambiarFila(i, { canceloNumero: e.target.value })}>
                        <option value="">Elegir un asiento D</option>
                        {referenciasD.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label htmlFor={`as-txt-${i}`} className="block text-xs font-bold text-muted-foreground mb-1">Texto del asiento</label>
                    <textarea id={`as-txt-${i}`} rows={3} maxLength={1500} className={`${campo} h-auto py-2`} value={f.texto} onChange={(e) => cambiarFila(i, { texto: e.target.value })} />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor={`as-tt-${i}`} className="block text-xs font-bold text-muted-foreground mb-1">Título archivado N.°</label>
                      <input id={`as-tt-${i}`} className={campo} maxLength={40} value={f.tituloNumero} onChange={(e) => cambiarFila(i, { tituloNumero: e.target.value })} />
                    </div>
                    <div>
                      <label htmlFor={`as-pre-${i}`} className="block text-xs font-bold text-muted-foreground mb-1">Fecha de presentación</label>
                      <input id={`as-pre-${i}`} type="date" className={campo} value={f.fechaPresentacion} onChange={(e) => cambiarFila(i, { fechaPresentacion: e.target.value })} />
                    </div>
                    <div>
                      <label htmlFor={`as-ins-${i}`} className="block text-xs font-bold text-muted-foreground mb-1">Fecha de inscripción</label>
                      <input id={`as-ins-${i}`} type="date" className={campo} value={f.fechaInscripcion} onChange={(e) => cambiarFila(i, { fechaInscripcion: e.target.value })} />
                    </div>
                  </div>
                </div>
              );
            })}
            <Button type="button" variant="outline" size="sm" disabled={filas.length >= MAX_ASIENTOS}
              onClick={() => setFilas([...filas, {
                referencia: "", tipoActo: "OTRO", estado: "VIGENTE", fechaInscripcion: "", tituloNumero: "",
                fechaPresentacion: "", texto: "", canceloNumero: "", titulares: "",
              }])}>
              <Plus className="w-4 h-4" aria-hidden="true" /> Agregar asiento
            </Button>
    </fieldset>
  );
}
