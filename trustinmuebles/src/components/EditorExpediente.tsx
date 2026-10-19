import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, put, subirArchivo } from "@/lib/api";
import { ESTADOS, ETIQUETA_COMPLETITUD } from "@/lib/semaforo";
import { campo, FilasAsientos, filasAPeticion, type Fila } from "@/components/FilasAsientos";
import { BloqueTecnico, tecnicoAPeticion, tecnicoDesde } from "@/components/BloqueTecnico";
import type { Completitud, DetalleCaso, PeticionExpediente } from "@/lib/types";

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
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-sem-rojo-tinta">{error}</p>}
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
  const [tecnico, setTecnico] = useState(tecnicoDesde(x));
  const [errores, setErrores] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

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
      asientos: filasAPeticion(filas),
      ...tecnicoAPeticion(tecnico),
      versionEsperada: x.version,
    };
    try {
      const nuevo = await put<DetalleCaso>(`/casos/${detalle.codigo}/expediente`, cuerpo);
      alGuardar(nuevo);
      const d = desde(nuevo);
      setCondicion(d.condicion); setCompletitud(d.completitud); setFecha(d.fecha); setNota(d.nota);
      setZona(d.zona); setOficina(d.oficina); setUbicacion(d.ubicacion); setArea(d.area);
      setLinderos(d.linderos); setAntecedente(d.antecedente); setFilas(d.filas); setTecnico(tecnicoDesde(nuevo.expediente));
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

          <BloqueTecnico tecnico={tecnico} setTecnico={setTecnico} />
          <FilasAsientos filas={filas} setFilas={setFilas} />

          {errores.length > 0 && (
            <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 p-4">
              <p className="font-bold text-sem-rojo-tinta mb-1">No se guardó ningún cambio</p>
              <ul className="list-disc pl-5 text-sm text-sem-rojo-tinta space-y-1">
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
