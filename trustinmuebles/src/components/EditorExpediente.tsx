import { useState, type FormEvent } from "react";
import { FileUp, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Campo, claseAreaTexto, claseCampo } from "@/components/base/Campo";
import { Desplegable } from "@/components/base/Desplegable";
import { Mensaje } from "@/components/base/Mensaje";
import { SelectorFecha } from "@/components/base/SelectorFecha";
import { TituloSeccion } from "@/components/base/TituloSeccion";
import { api, put } from "@/lib/api";
import { LIMITES_PDF } from "@/lib/archivos";
import { OrigenDocumento, SubirPdf } from "@/components/DocumentoPdf";
import { ESTADOS, ETIQUETA_COMPLETITUD } from "@/lib/semaforo";
import { FilasAsientos, filasAPeticion, type Fila } from "@/components/FilasAsientos";
import { BloqueTecnico, tecnicoAPeticion, tecnicoDesde } from "@/components/BloqueTecnico";
import type { Completitud, DetalleCaso, PeticionExpediente } from "@/lib/types";

const OPCIONES_COMPLETITUD = (Object.keys(ETIQUETA_COMPLETITUD) as Completitud[]).map((c) => ({ valor: c, etiqueta: ETIQUETA_COMPLETITUD[c] }));

function AsociarDocumento({ detalle, alGuardar }: { detalle: DetalleCaso; alGuardar: (d: DetalleCaso) => void }) {
  const generado = detalle.expediente.documentoGenerado;
  const ruta = `/casos/${detalle.codigo}/documento`;
  return (
    <div className="mt-8 space-y-4 rounded-3xl border border-border bg-superficie p-5 sm:p-6">
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
          <FileUp className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-foreground">Documento PDF</h3>
          <p className="mt-1 text-sm leading-relaxed text-tinta-2">
            {generado
              ? "El sistema genera la copia literal a partir de la partida y la regenera al guardar. Si subes un PDF propio, deja de regenerarse."
              : "Este expediente usa un PDF subido por el revisor y no se regenera al guardar."}
            {" "}Solo PDF, hasta {LIMITES_PDF.entradaMb} MB; si pesa más de {LIMITES_PDF.umbralMb} MB se optimiza
            automáticamente y lo guardado no puede pasar de {LIMITES_PDF.almacenadoMb} MB. No subas documentos con datos
            reales de personas o predios.
          </p>
        </div>
      </div>
      <OrigenDocumento info={detalle.expediente.documento} ruta={ruta} nombre={`${detalle.codigo}.pdf`} />
      <SubirPdf
        id="ed-pdf"
        ruta={ruta}
        etiqueta="Archivo PDF"
        textoBoton="Asociar PDF"
        alSubir={async () => alGuardar(await api<DetalleCaso>(`/casos/${detalle.codigo}`))}
      />
    </div>
  );
}

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
      acreedor: a.acreedor ?? "",
      plazoOVencimiento: a.plazoOVencimiento ?? "",
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

  const guardar = async (e: FormEvent) => {
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
      setCondicion(d.condicion);
      setCompletitud(d.completitud);
      setFecha(d.fecha);
      setNota(d.nota);
      setZona(d.zona);
      setOficina(d.oficina);
      setUbicacion(d.ubicacion);
      setArea(d.area);
      setLinderos(d.linderos);
      setAntecedente(d.antecedente);
      setFilas(d.filas);
      setTecnico(tecnicoDesde(nuevo.expediente));
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
    <Card className="rounded-[2rem] border-2 border-primary/20 shadow-tarjeta">
      <CardContent className="space-y-7 p-6 sm:p-8">
        <TituloSeccion
          icono={Pencil}
          descripcion="Solo el revisor puede editar. El color no se elige: se recalcula con las reglas al guardar. La titularidad sale del último asiento C, y un gravamen figura cancelado cuando un asiento E lo cancela. Si un dato no consta en el extracto, déjalo vacío."
        >
          Editar partida
        </TituloSeccion>

        <form onSubmit={guardar} className="space-y-6" noValidate>
          <Campo etiqueta="Condición representada">
            {(p) => <input {...p} className={claseCampo} maxLength={255} value={condicion} onChange={(e) => setCondicion(e.target.value)} />}
          </Campo>

          <div className="grid gap-5 sm:grid-cols-2">
            <Campo etiqueta="Zona registral">
              {(p) => <input {...p} className={claseCampo} maxLength={120} value={zona} onChange={(e) => setZona(e.target.value)} />}
            </Campo>
            <Campo etiqueta="Oficina registral">
              {(p) => <input {...p} className={claseCampo} maxLength={120} value={oficina} onChange={(e) => setOficina(e.target.value)} />}
            </Campo>
          </div>

          <Campo etiqueta="Ubicación">
            {(p) => <input {...p} className={claseCampo} maxLength={255} value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} />}
          </Campo>

          <div className="grid gap-5 sm:grid-cols-3">
            <Campo etiqueta="Área (m²)">
              {(p) => <input {...p} type="number" step="0.01" min="0" className={claseCampo} value={area} onChange={(e) => setArea(e.target.value)} />}
            </Campo>
            <Desplegable
              etiqueta="Completitud del extracto"
              valor={completitud}
              opciones={OPCIONES_COMPLETITUD}
              alCambiar={(v) => setCompletitud(v as Completitud)}
            />
            <SelectorFecha
              etiqueta="Fecha referencial"
              valor={fecha}
              alCambiar={setFecha}
              permitirVacio={false}
            />
          </div>

          <Campo etiqueta="Linderos y medidas perimétricas">
            {(p) => <textarea {...p} rows={3} maxLength={1000} className={claseAreaTexto} value={linderos} onChange={(e) => setLinderos(e.target.value)} />}
          </Campo>
          <Campo etiqueta="Antecedente dominial">
            {(p) => <textarea {...p} rows={2} maxLength={500} className={claseAreaTexto} value={antecedente} onChange={(e) => setAntecedente(e.target.value)} />}
          </Campo>
          <Campo etiqueta="Nota del extracto (opcional)">
            {(p) => <textarea {...p} rows={2} maxLength={500} className={claseAreaTexto} value={nota} onChange={(e) => setNota(e.target.value)} />}
          </Campo>

          <BloqueTecnico tecnico={tecnico} setTecnico={setTecnico} planosGuardados={x.planos}
            documentosGuardados={x.documentosLote ?? []} />
          <FilasAsientos filas={filas} setFilas={setFilas} />

          {errores.length > 0 && (
            <Mensaje tono="error" titulo="No se guardó ningún cambio">
              <ul className="list-disc space-y-1 pl-5">{errores.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </Mensaje>
          )}
          {mensaje && <Mensaje tono="ok">{mensaje}</Mensaje>}

          <Button type="submit" size="lg" disabled={guardando}>
            <RefreshCw className={guardando ? "animate-spin" : ""} aria-hidden="true" />
            {guardando ? "Guardando…" : "Guardar y recalcular"}
          </Button>
        </form>

        <AsociarDocumento detalle={detalle} alGuardar={alGuardar} />
      </CardContent>
    </Card>
  );
}