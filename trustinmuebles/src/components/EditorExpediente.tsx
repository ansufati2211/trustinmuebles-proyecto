import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, put, subirArchivo } from "@/lib/api";
import { ESTADOS, ETIQUETA_ANOTACION, ETIQUETA_COMPLETITUD } from "@/lib/semaforo";
import type { Completitud, DetalleCaso, EstadoAnotacion, PeticionExpediente } from "@/lib/types";

interface Fila { referencia: string; estado: EstadoAnotacion; descripcion: string }

const campo = "w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

/** Asociar el PDF sintético del caso (REQ-F03). El servidor acepta solo PDF de hasta 5 MB. */
function AsociarDocumento({ detalle, alGuardar }: { detalle: DetalleCaso; alGuardar: (d: DetalleCaso) => void }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const subir = async () => {
    if (!archivo) return;
    setError(null);
    setMensaje(null);
    setSubiendo(true);
    try {
      await subirArchivo(`/casos/${detalle.codigo}/documento`, "documento", archivo);
      alGuardar(await api<DetalleCaso>(`/casos/${detalle.codigo}`));
      setMensaje("Documento asociado.");
      setArchivo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo asociar el documento");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-gray-100">
      <h3 className="text-sm font-bold mb-1.5">Documento sintético (PDF)</h3>
      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
        {detalle.expediente.tieneDocumento ? "El caso ya tiene un documento; subir otro lo reemplaza." : "El caso no tiene documento."}
        {" "}Solo PDF, hasta 5 MB. Debe ser un documento sintético, nunca uno real.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="ed-pdf" className="sr-only">Archivo PDF</label>
        <input id="ed-pdf" type="file" accept="application/pdf" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-bold file:text-primary" />
        <Button type="button" variant="outline" size="sm" disabled={!archivo || subiendo} onClick={subir}>
          {subiendo ? "Subiendo…" : "Asociar PDF"}
        </Button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-[#B91C1C]">{error}</p>}
      {mensaje && <p role="status" className="mt-3 text-sm font-semibold text-foreground">{mensaje}</p>}
    </div>
  );
}

/** Edición del expediente, solo para el revisor. El servidor vuelve a verificar el rol y valida todo (PA4, NF04). */
export function EditorExpediente({ detalle, alGuardar }: { detalle: DetalleCaso; alGuardar: (d: DetalleCaso) => void }) {
  const x = detalle.expediente;
  const desde = (d: DetalleCaso) => ({
    condicion: d.expediente.condicionRepresentada,
    titularidad: d.expediente.titularidad,
    completitud: d.expediente.completitud as Completitud,
    fecha: d.expediente.fechaReferencial,
    nota: d.expediente.nota ?? "",
    filas: d.expediente.anotaciones.map<Fila>((a) => ({ referencia: a.referencia, estado: a.estado, descripcion: a.descripcion ?? "" })),
  });

  const inicial = desde(detalle);
  const [condicion, setCondicion] = useState(inicial.condicion);
  const [titularidad, setTitularidad] = useState(inicial.titularidad);
  const [completitud, setCompletitud] = useState<Completitud>(inicial.completitud);
  const [fecha, setFecha] = useState(inicial.fecha);
  const [nota, setNota] = useState(inicial.nota);
  const [filas, setFilas] = useState<Fila[]>(inicial.filas);
  const [errores, setErrores] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cambiarFila = (i: number, parcial: Partial<Fila>) =>
    setFilas(filas.map((f, j) => (j === i ? { ...f, ...parcial } : f)));

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrores([]);
    setMensaje(null);
    setGuardando(true);
    const cuerpo: PeticionExpediente = {
      condicionRepresentada: condicion,
      titularidad,
      completitud,
      fechaReferencial: fecha,
      nota: nota.trim() || null,
      anotaciones: filas.map((f) => ({ referencia: f.referencia.trim(), estado: f.estado, descripcion: f.descripcion.trim() || null })),
      versionEsperada: x.version,
    };
    try {
      const nuevo = await put<DetalleCaso>(`/casos/${detalle.codigo}/expediente`, cuerpo);
      alGuardar(nuevo);
      const d = desde(nuevo);
      setCondicion(d.condicion); setTitularidad(d.titularidad); setCompletitud(d.completitud);
      setFecha(d.fecha); setNota(d.nota); setFilas(d.filas);
      const estado = nuevo.evaluacion ? ESTADOS[nuevo.evaluacion.estado].nombre : "sin evaluar";
      setMensaje(`Guardado. El estado se recalculó con las reglas ${nuevo.evaluacion?.versionReglas ?? ""}: ${estado}.`);
    } catch (err) {
      const texto = err instanceof Error ? err.message : "No se pudo guardar";
      setErrores(texto.split("; "));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card className="rounded-3xl border-2 border-primary/20 shadow-sm">
      <CardContent className="p-8">
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground mb-2">
          <Pencil className="w-5 h-5 text-primary" aria-hidden="true" /> Editar expediente
        </h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Solo el revisor puede editar. El color no se elige: se recalcula con las reglas al guardar.
          Si un dato no se informa en el extracto, escribe «desconocido».
        </p>

        <form onSubmit={guardar} className="space-y-5" noValidate>
          <div>
            <label htmlFor="ed-condicion" className="block text-sm font-bold mb-1.5">Condición representada</label>
            <input id="ed-condicion" className={campo} maxLength={255} value={condicion} onChange={(e) => setCondicion(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ed-titularidad" className="block text-sm font-bold mb-1.5">Titularidad</label>
            <input id="ed-titularidad" className={campo} maxLength={255} value={titularidad} onChange={(e) => setTitularidad(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="ed-completitud" className="block text-sm font-bold mb-1.5">Completitud del extracto</label>
              <select id="ed-completitud" className={campo} value={completitud} onChange={(e) => setCompletitud(e.target.value as Completitud)}>
                {(Object.keys(ETIQUETA_COMPLETITUD) as Completitud[]).map((c) => <option key={c} value={c}>{ETIQUETA_COMPLETITUD[c]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="ed-fecha" className="block text-sm font-bold mb-1.5">Fecha referencial</label>
              <input id="ed-fecha" type="date" className={campo} value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="ed-nota" className="block text-sm font-bold mb-1.5">Nota del extracto (opcional)</label>
            <textarea id="ed-nota" rows={3} maxLength={500} className={`${campo} h-auto py-2`} value={nota} onChange={(e) => setNota(e.target.value)} />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-bold mb-1">Anotaciones</legend>
            {filas.length === 0 && <p className="text-sm text-muted-foreground">Sin anotaciones.</p>}
            {filas.map((f, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end rounded-2xl border border-gray-100 bg-gray-50/60 p-3">
                <div className="col-span-4 sm:col-span-2">
                  <label htmlFor={`an-ref-${i}`} className="block text-xs font-bold text-muted-foreground mb-1">Referencia</label>
                  <input id={`an-ref-${i}`} className={campo} maxLength={20} value={f.referencia} onChange={(e) => cambiarFila(i, { referencia: e.target.value })} />
                </div>
                <div className="col-span-8 sm:col-span-3">
                  <label htmlFor={`an-est-${i}`} className="block text-xs font-bold text-muted-foreground mb-1">Estado</label>
                  <select id={`an-est-${i}`} className={campo} value={f.estado} onChange={(e) => cambiarFila(i, { estado: e.target.value as EstadoAnotacion })}>
                    {(Object.keys(ETIQUETA_ANOTACION) as EstadoAnotacion[]).map((s) => <option key={s} value={s}>{ETIQUETA_ANOTACION[s]}</option>)}
                  </select>
                </div>
                <div className="col-span-10 sm:col-span-6">
                  <label htmlFor={`an-des-${i}`} className="block text-xs font-bold text-muted-foreground mb-1">Descripción</label>
                  <input id={`an-des-${i}`} className={campo} maxLength={255} value={f.descripcion} onChange={(e) => cambiarFila(i, { descripcion: e.target.value })} />
                </div>
                <div className="col-span-2 sm:col-span-1 flex justify-end">
                  <button type="button" onClick={() => setFilas(filas.filter((_, j) => j !== i))}
                    aria-label={`Quitar la anotación ${f.referencia || i + 1}`}
                    className="h-11 w-11 inline-flex items-center justify-center rounded-xl text-muted-foreground hover:bg-danger/10 hover:text-[#B91C1C] transition-colors">
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" disabled={filas.length >= 20}
              onClick={() => setFilas([...filas, { referencia: "", estado: "VIGENTE", descripcion: "" }])}>
              <Plus className="w-4 h-4" aria-hidden="true" /> Agregar anotación
            </Button>
          </fieldset>

          {errores.length > 0 && (
            <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 p-4">
              <p className="font-bold text-[#B91C1C] mb-1">No se guardó ningún cambio</p>
              <ul className="list-disc pl-5 text-sm text-[#B91C1C] space-y-1">
                {errores.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}
          {mensaje && <p role="status" className="rounded-2xl border border-success/30 bg-success/10 p-4 text-sm font-semibold text-foreground">{mensaje}</p>}

          <Button type="submit" disabled={guardando} className="rounded-xl">
            {guardando ? "Guardando…" : "Guardar y recalcular"}
          </Button>
        </form>

        <AsociarDocumento detalle={detalle} alGuardar={alGuardar} />
      </CardContent>
    </Card>
  );
}
