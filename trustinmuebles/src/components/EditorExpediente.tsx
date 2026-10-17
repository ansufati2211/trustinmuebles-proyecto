import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, put, subirArchivo } from "@/lib/api";
import { ESTADOS, ETIQUETA_ACTO, ETIQUETA_COMPLETITUD, RUBROS } from "@/lib/semaforo";
import type { Completitud, DetalleCaso, EstadoAnotacion, PeticionExpediente, TipoActo } from "@/lib/types";

/** Fila editable de un asiento. El estado de un gravamen solo admite vigente o desconocido: lo cancela un asiento E. */
interface Fila {
  referencia: string; tipoActo: TipoActo; estado: "VIGENTE" | "DESCONOCIDO"; fechaInscripcion: string;
  tituloNumero: string; fechaPresentacion: string; texto: string; canceloNumero: string; titulares: string;
}

const campo = "w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
const MAX_ASIENTOS = 40;

const rubroDe = (f: Fila) => f.referencia.charAt(0).toUpperCase();

/** Asociar el PDF del expediente (REQ-F03). El servidor acepta solo PDF de hasta 5 MB. */
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

  const generado = detalle.expediente.documentoGenerado;
  return (
    <div className="mt-8 pt-6 border-t border-gray-100">
      <h3 className="text-sm font-bold mb-1.5">Documento PDF</h3>
      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
        {generado
          ? "El sistema genera la copia literal a partir de la partida y la regenera al guardar. Si subes un PDF propio, deja de regenerarse."
          : "Este expediente usa un PDF subido por el revisor y no se regenera al guardar."}
        {" "}Solo PDF, hasta 5 MB. No subas documentos con datos reales de personas o predios.
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
    completitud: d.expediente.completitud as Completitud,
    fecha: d.expediente.fechaReferencial,
    nota: d.expediente.nota ?? "",
    zona: d.expediente.zonaRegistral ?? "",
    oficina: d.expediente.oficinaRegistral ?? "",
    ubicacion: d.expediente.ubicacion ?? "",
    area: d.expediente.areaM2 == null ? "" : String(d.expediente.areaM2),
    linderos: d.expediente.linderos ?? "",
    antecedente: d.expediente.antecedenteDominial ?? "",
    filas: d.expediente.asientos.map<Fila>((a) => ({
      referencia: a.referencia,
      tipoActo: a.tipoActo,
      estado: a.estado === "DESCONOCIDO" ? "DESCONOCIDO" : "VIGENTE",
      fechaInscripcion: a.fechaInscripcion ?? "",
      tituloNumero: a.tituloNumero ?? "",
      fechaPresentacion: a.fechaPresentacion ?? "",
      texto: a.texto ?? "",
      canceloNumero: a.canceloNumero ?? "",
      titulares: a.titulares ?? "",
    })),
  });

  const inicial = desde(detalle);
  const [condicion, setCondicion] = useState(inicial.condicion);
  const [completitud, setCompletitud] = useState<Completitud>(inicial.completitud);
  const [fecha, setFecha] = useState(inicial.fecha);
  const [nota, setNota] = useState(inicial.nota);
  const [zona, setZona] = useState(inicial.zona);
  const [oficina, setOficina] = useState(inicial.oficina);
  const [ubicacion, setUbicacion] = useState(inicial.ubicacion);
  const [area, setArea] = useState(inicial.area);
  const [linderos, setLinderos] = useState(inicial.linderos);
  const [antecedente, setAntecedente] = useState(inicial.antecedente);
  const [filas, setFilas] = useState<Fila[]>(inicial.filas);
  const [errores, setErrores] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cambiarFila = (i: number, parcial: Partial<Fila>) =>
    setFilas(filas.map((f, j) => (j === i ? { ...f, ...parcial } : f)));

  // Un gravamen (rubro D) figura cancelado si un asiento E lo cancela. No se escribe a mano.
  const canceladoPor = new Map<string, string>();
  for (const f of filas) if (rubroDe(f) === "E" && f.canceloNumero) canceladoPor.set(f.canceloNumero, f.referencia);
  const referenciasD = filas.filter((f) => rubroDe(f) === "D").map((f) => f.referencia);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrores([]);
    setMensaje(null);
    setGuardando(true);
    const cuerpo: PeticionExpediente = {
      condicionRepresentada: condicion,
      completitud,
      fechaReferencial: fecha,
      nota: nota.trim() || null,
      zonaRegistral: zona.trim() || null,
      oficinaRegistral: oficina.trim() || null,
      ubicacion: ubicacion.trim() || null,
      areaM2: area.trim() === "" ? null : Number(area),
      linderos: linderos.trim() || null,
      antecedenteDominial: antecedente.trim() || null,
      asientos: filas.map((f) => {
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
      }),
      versionEsperada: x.version,
    };
    try {
      const nuevo = await put<DetalleCaso>(`/casos/${detalle.codigo}/expediente`, cuerpo);
      alGuardar(nuevo);
      const d = desde(nuevo);
      setCondicion(d.condicion); setCompletitud(d.completitud); setFecha(d.fecha); setNota(d.nota);
      setZona(d.zona); setOficina(d.oficina); setUbicacion(d.ubicacion); setArea(d.area);
      setLinderos(d.linderos); setAntecedente(d.antecedente); setFilas(d.filas);
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
          <Pencil className="w-5 h-5 text-primary" aria-hidden="true" /> Editar partida
        </h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Solo el revisor puede editar. El color no se elige: se recalcula con las reglas al guardar. La titularidad sale del
          último asiento C, y un gravamen figura cancelado cuando un asiento E lo cancela. Si un dato no consta en el
          extracto, déjalo vacío.
        </p>

        <form onSubmit={guardar} className="space-y-5" noValidate>
          <div>
            <label htmlFor="ed-condicion" className="block text-sm font-bold mb-1.5">Condición representada</label>
            <input id="ed-condicion" className={campo} maxLength={255} value={condicion} onChange={(e) => setCondicion(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="ed-zona" className="block text-sm font-bold mb-1.5">Zona registral</label>
              <input id="ed-zona" className={campo} maxLength={120} value={zona} onChange={(e) => setZona(e.target.value)} />
            </div>
            <div>
              <label htmlFor="ed-oficina" className="block text-sm font-bold mb-1.5">Oficina registral</label>
              <input id="ed-oficina" className={campo} maxLength={120} value={oficina} onChange={(e) => setOficina(e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="ed-ubicacion" className="block text-sm font-bold mb-1.5">Ubicación</label>
            <input id="ed-ubicacion" className={campo} maxLength={255} value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            <div>
              <label htmlFor="ed-area" className="block text-sm font-bold mb-1.5">Área (m²)</label>
              <input id="ed-area" type="number" step="0.01" min="0" className={campo} value={area} onChange={(e) => setArea(e.target.value)} />
            </div>
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
            <label htmlFor="ed-linderos" className="block text-sm font-bold mb-1.5">Linderos y medidas perimétricas</label>
            <textarea id="ed-linderos" rows={3} maxLength={1000} className={`${campo} h-auto py-2`} value={linderos} onChange={(e) => setLinderos(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ed-antecedente" className="block text-sm font-bold mb-1.5">Antecedente dominial</label>
            <textarea id="ed-antecedente" rows={2} maxLength={500} className={`${campo} h-auto py-2`} value={antecedente} onChange={(e) => setAntecedente(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ed-nota" className="block text-sm font-bold mb-1.5">Nota del extracto (opcional)</label>
            <textarea id="ed-nota" rows={2} maxLength={500} className={`${campo} h-auto py-2`} value={nota} onChange={(e) => setNota(e.target.value)} />
          </div>

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
