import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Download, FileUp, FolderKanban } from "lucide-react";
import { Cargando, ErrorCarga } from "@/components/base/Estados";
import { Mensaje } from "@/components/base/Mensaje";
import { ApiError, descargarArchivo, descargarPdf, subirArchivo } from "@/lib/api";
import {
  COLUMNAS_CSV, MAX_FILAS, errorDeArchivo, rutaConfirmar, rutaPlantilla, rutaVistaPrevia, sePuedeConfirmar, tamanoLegible,
  textoResultado,
} from "@/lib/cargaLotes";
import { VistaPreviaCarga } from "@/components/VistaPreviaCarga";
import { enlaceProyecto, rutaExportarLotes } from "@/lib/proyectos";
import { useApi } from "@/lib/useApi";
import type { ResultadoCarga, ResumenProyecto, VistaPreviaCarga as Vista } from "@/lib/types";

const tarjeta = "rounded-[2rem] border border-border bg-card p-6 shadow-tarjeta sm:p-8";

/**
 * v1.0 (etapa 3b): carga masiva de lotes de un proyecto por CSV, para el asesor y el gestor. Se elige el archivo, se revisa
 * una vista previa con los errores de cada fila (no se guarda nada) y solo si no hay ningún error se confirma: todo o nada.
 */
export default function CargaLotes() {
  const { codigo = "" } = useParams();
  const proyectos = useApi<ResumenProyecto[]>("/proyectos");
  const proyecto = proyectos.data?.find((p) => p.codigo === codigo) ?? null;
  const entrada = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vista, setVista] = useState<Vista | null>(null);
  const [resultado, setResultado] = useState<ResultadoCarga | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [problema, setProblema] = useState<string | null>(null);
  const [soloErrores, setSoloErrores] = useState(false);

  if (proyectos.loading && !proyectos.data) return <div className="pt-28"><Cargando texto="Cargando proyecto…" /></div>;
  if (proyectos.error) return <div className="px-4 pt-32"><ErrorCarga mensaje={proyectos.error.message} alReintentar={proyectos.reload} /></div>;
  if (!proyecto) {
    return (
      <div className="mx-auto max-w-xl space-y-6 px-4 pb-24 pt-32 text-center">
        <h1 className="text-2xl font-black text-foreground">No encontramos este proyecto</h1>
        <Link to="/proyectos" className="inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">Ver los proyectos</Link>
      </div>
    );
  }

  const reiniciar = () => {
    setArchivo(null);
    setVista(null);
    setResultado(null);
    setProblema(null);
    setSoloErrores(false);
    if (entrada.current) entrada.current.value = "";
  };

  const elegir = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setResultado(null);
    setVista(null);
    setSoloErrores(false);
    setArchivo(f);
    if (!f) return;
    const malo = errorDeArchivo(f);
    setProblema(malo);
    if (malo) return;
    setOcupado(true);
    try {
      setVista(await subirArchivo<Vista>(rutaVistaPrevia(proyecto.codigo), "archivo", f));
    } catch (err) {
      setProblema(err instanceof ApiError ? err.message : "No se pudo revisar el archivo.");
    } finally {
      setOcupado(false);
    }
  };

  const confirmar = async () => {
    if (!archivo || !vista || !sePuedeConfirmar(vista)) return;
    setOcupado(true);
    setProblema(null);
    try {
      setResultado(await subirArchivo<ResultadoCarga>(rutaConfirmar(proyecto.codigo), "archivo", archivo));
      setVista(null);
      setArchivo(null);
      if (entrada.current) entrada.current.value = "";
      proyectos.reload();
    } catch (err) {
      setProblema(err instanceof ApiError ? err.message : "No se pudo guardar la carga. No se guardó nada.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="flex w-full flex-1 flex-col bg-superficie pb-24">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 pt-28 sm:px-6 lg:px-8">
        <div>
          <Link to="/proyectos" className="inline-flex items-center gap-1.5 text-sm font-bold text-tinta-2 hover:text-primary">
            <ArrowLeft className="size-4" aria-hidden="true" /> Proyectos
          </Link>
          <h1 className="mt-4 flex items-center gap-3 text-3xl font-black tracking-tight text-foreground">
            <FolderKanban className="size-8 shrink-0 text-primary" aria-hidden="true" /> Cargar lotes · {proyecto.nombre}
          </h1>
          <p className="mt-2 text-base text-tinta-2">
            Hoy tiene {proyecto.lotes} {proyecto.lotes === 1 ? "lote" : "lotes"}. Un lote que ya existe (misma manzana y número) se
            actualiza y el cambio queda en su historial.
          </p>
        </div>

        {!proyecto.autorizacionVigente && (
          <Mensaje tono="info" titulo="Los lotes cargados no se ofrecerán en línea todavía">
            La partida matriz de este proyecto no tiene una autorización vigente registrada. Los lotes se guardan, pero solo se publican
            cuando esa autorización esté registrada.
          </Mensaje>
        )}

        <section aria-labelledby="titulo-archivo" className={`${tarjeta} space-y-5`}>
          <h2 id="titulo-archivo" className="text-xl font-bold text-foreground">1. Elige el archivo CSV</h2>
          <p className="text-sm text-tinta-2">
            Columnas: <span className="cifras font-semibold text-foreground">{COLUMNAS_CSV.join(", ")}</span>. Obligatorias: manzana,
            lote y area_m2. Hasta {MAX_FILAS} filas y 1 MB. Una celda vacía deja el valor como estaba.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => descargarPdf(rutaPlantilla(proyecto.codigo), "plantilla-lotes.csv").catch((e: Error) => setProblema(e.message))}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:border-primary/40">
              <Download className="size-4" aria-hidden="true" /> Descargar plantilla
            </button>
            {/* v1.0 (etapa 9): los lotes actuales con las mismas columnas: se editan en Excel y se vuelven a cargar. */}
            {proyecto.lotes > 0 && (
              <button type="button" data-exportar-lotes={proyecto.codigo}
                onClick={() => descargarArchivo(rutaExportarLotes(proyecto.codigo), `lotes-${proyecto.codigo}.csv`).catch((e: Error) => setProblema(e.message))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:border-primary/40">
                <Download className="size-4" aria-hidden="true" /> Descargar los lotes actuales
              </button>
            )}
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
              <FileUp className="size-4" aria-hidden="true" /> {archivo ? "Elegir otro archivo" : "Elegir archivo"}
              <input ref={entrada} type="file" accept=".csv,text/csv" onChange={elegir} disabled={ocupado} className="sr-only" aria-label="Archivo CSV de lotes" />
            </label>
            {archivo && <span className="cifras text-sm font-semibold text-tinta-2">{archivo.name} · {tamanoLegible(archivo.size)}</span>}
          </div>
          {ocupado && <Cargando texto="Revisando el archivo…" />}
          {problema && <Mensaje tono="error">{problema}</Mensaje>}
        </section>

        {resultado && (
          <Mensaje tono="ok" titulo="Carga guardada">
            <p>{textoResultado(resultado)}</p>
            <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
              <Link to={enlaceProyecto(proyecto.codigo)} className="underline">Ver la página pública del proyecto</Link>
              <button type="button" onClick={reiniciar} className="underline">Cargar otro archivo</button>
            </p>
          </Mensaje>
        )}

        {vista && (
          <VistaPreviaCarga vista={vista} soloErrores={soloErrores} cambiarSoloErrores={setSoloErrores} ocupado={ocupado}
            alConfirmar={confirmar} alCancelar={reiniciar} />
        )}
      </div>
    </div>
  );
}
