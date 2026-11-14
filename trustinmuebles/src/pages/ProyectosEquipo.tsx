import { useState } from "react";
import { Link } from "react-router";
import { Download, ExternalLink, FileUp, FolderKanban, MapPin, Pencil } from "lucide-react";
import { Cargando, ErrorCarga, Vacio } from "@/components/base/Estados";
import { Badge } from "@/components/base/Badge";
import { Campo, claseAreaTexto, claseCampo } from "@/components/base/Campo";
import { Mensaje } from "@/components/base/Mensaje";
import { Modal } from "@/components/base/Modal";
import { Button } from "@/components/ui/button";
import { descargarArchivo, put } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { rutaCarga } from "@/lib/cargaLotes";
import {
  MAX_CONDICIONES_PAGO, MAX_DIRECCION, cuerpoDatosProyecto, datosDe, enlaceProyecto, rutaDatosProyecto,
  rutaExportarLotes, validarDatosProyecto, type DatosProyecto,
} from "@/lib/proyectos";
import type { ResumenProyecto } from "@/lib/types";

/**
 * v1.0 (etapa 3b): proyectos de la inmobiliaria para el asesor y el gestor. Desde aquí se abre la carga masiva de lotes por
 * CSV de cada proyecto o su página pública. v1.0 (etapa 9): exportar los lotes a CSV (abre en Excel y sirve de plantilla
 * para volver a cargarlos) y editar la dirección, el enlace de mapa y las condiciones de pago.
 */
export default function ProyectosEquipo() {
  const { data, loading, error, reload } = useApi<ResumenProyecto[]>("/proyectos");
  const [editando, setEditando] = useState<ResumenProyecto | null>(null);
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);

  const exportar = (p: ResumenProyecto) => {
    setAviso(null);
    descargarArchivo(rutaExportarLotes(p.codigo), `lotes-${p.codigo}.csv`)
      .catch((e: Error) => setAviso({ tono: "error", texto: e.message }));
  };

  return (
    <div className="flex w-full flex-1 flex-col bg-superficie pb-24">
      <div className="mx-auto w-full max-w-6xl px-4 pt-28 sm:px-6 lg:px-8">
        <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-foreground">
          <FolderKanban className="size-8 text-primary" aria-hidden="true" /> Proyectos
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-tinta-2">
          Los proyectos de urbanización de la inmobiliaria y sus lotes. Carga o actualiza los lotes de un proyecto con un
          archivo CSV; antes de guardar verás qué cambia y qué filas tienen errores. «Exportar lotes» descarga el mismo
          formato para abrirlo en Excel, editarlo y volver a cargarlo.
        </p>
        {aviso && <Mensaje tono={aviso.tono} className="mt-6">{aviso.texto}</Mensaje>}

        <div className="mt-8" aria-busy={loading}>
          {loading && !data ? <Cargando texto="Cargando proyectos…" tarjetas={3} />
            : error ? <ErrorCarga mensaje={error.message} alReintentar={reload} />
            : !data || data.length === 0 ? <Vacio icono={FolderKanban} titulo="Todavía no hay proyectos">Cuando se registre un proyecto aparecerá aquí.</Vacio>
            : (
              <ul className="grid gap-5 md:grid-cols-2">
                {data.map((p) => (
                  <li key={p.codigo} className="flex flex-col gap-4 rounded-[1.75rem] border border-border bg-card p-6 shadow-tarjeta" data-proyecto={p.codigo}>
                    <div>
                      <h2 className="text-xl font-extrabold text-foreground">{p.nombre}</h2>
                      <p className="text-sm font-semibold text-tinta-2">{p.distrito ? `${p.distrito}, Ica` : "Ica"}</p>
                      <p className="mt-1 flex items-start gap-1.5 text-sm text-tinta-2">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                        {p.direccion ?? "Sin dirección registrada"}
                        {p.mapaUrl ? " · con enlace de mapa" : ""}
                      </p>
                    </div>
                    <dl className="cifras grid grid-cols-3 gap-3 text-sm">
                      <div><dt className="text-xs font-semibold text-tinta-2">Lotes</dt><dd className="text-lg font-black text-foreground">{p.lotes}</dd></div>
                      <div><dt className="text-xs font-semibold text-tinta-2">En línea</dt><dd className="text-lg font-black text-foreground">{p.publicados}</dd></div>
                      <div><dt className="text-xs font-semibold text-tinta-2">Disponibles</dt><dd className="text-lg font-black text-foreground">{p.conteo.disponibles}</dd></div>
                    </dl>
                    {!p.autorizacionVigente && (
                      <Badge tono="amarillo" icono={FolderKanban} tamano="sm">Sin autorización vigente de la partida matriz: los lotes no se ofrecen en línea</Badge>
                    )}
                    <div className="mt-auto flex flex-wrap gap-3">
                      <Link to={rutaCarga(p.codigo)} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">
                        <FileUp className="size-4" aria-hidden="true" /> Cargar lotes (CSV)
                      </Link>
                      <button type="button" onClick={() => exportar(p)} disabled={p.lotes === 0} data-exportar-lotes={p.codigo}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50">
                        <Download className="size-4" aria-hidden="true" /> Exportar lotes (CSV)
                      </button>
                      <button type="button" onClick={() => { setAviso(null); setEditando(p); }} data-editar-datos={p.codigo}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:border-primary/40">
                        <Pencil className="size-4" aria-hidden="true" /> Ubicación y pago
                      </button>
                      <Link to={enlaceProyecto(p.codigo)} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:border-primary/40">
                        Ver página pública <ExternalLink className="size-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </div>
        <p className="mt-8 text-sm text-tinta-2">
          <Link to="/casos" className="font-bold text-primary hover:underline">Ver los expedientes de la cartera</Link>
        </p>
      </div>
      {editando && (
        <Modal abierto ancho="lg" alCerrar={() => setEditando(null)} titulo={`Ubicación y pago · ${editando.nombre}`}
          descripcion="Se muestran en la página pública del proyecto y en la ficha de sus lotes. Un campo vacío no se muestra.">
          <FormularioDatosProyecto proyecto={editando} alCancelar={() => setEditando(null)}
            alGuardar={() => { setEditando(null); setAviso({ tono: "ok", texto: "Datos del proyecto guardados." }); reload(); }} />
        </Modal>
      )}
    </div>
  );
}

/** v1.0 (etapa 9): dirección, enlace de mapa y condiciones de pago. Se exporta para probarlo sin el modal. */
export function FormularioDatosProyecto({ proyecto, alCancelar, alGuardar }: {
  proyecto: ResumenProyecto; alCancelar: () => void; alGuardar: () => void;
}) {
  const [d, setD] = useState<DatosProyecto>(datosDe(proyecto));
  const [intento, setIntento] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const errores = validarDatosProyecto(d);
  const ver = (k: keyof DatosProyecto) => (intento ? errores[k] : undefined);

  const guardar = async () => {
    setIntento(true);
    setError(null);
    if (Object.keys(errores).length > 0) return;
    setOcupado(true);
    try {
      await put(rutaDatosProyecto(proyecto.codigo), cuerpoDatosProyecto(d));
      alGuardar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <form className="space-y-5" noValidate onSubmit={(e) => { e.preventDefault(); void guardar(); }}>
      <Campo etiqueta="Dirección" error={ver("direccion")} ayuda={`Como la diría un asesor por teléfono. Hasta ${MAX_DIRECCION} caracteres.`}>
        {(p) => <input {...p} className={claseCampo} maxLength={MAX_DIRECCION} value={d.direccion}
          onChange={(e) => setD({ ...d, direccion: e.target.value })} />}
      </Campo>
      <Campo etiqueta="Enlace de mapa (opcional)" error={ver("mapaUrl")}
        ayuda="Pega el enlace «Compartir» de Google Maps del lugar exacto. Con él aparece el botón «Cómo llegar»; sin él, solo la dirección.">
        {(p) => <input {...p} className={claseCampo} type="url" inputMode="url" placeholder="https://maps.app.goo.gl/…"
          value={d.mapaUrl} onChange={(e) => setD({ ...d, mapaUrl: e.target.value })} />}
      </Campo>
      <Campo etiqueta="Condiciones de pago (opcional)" error={ver("condicionesPago")}
        ayuda={`${d.condicionesPago.trim().length} de ${MAX_CONDICIONES_PAGO} caracteres. Texto libre: no se calculan cuotas ni tasas. Se muestra con la nota «Consulta con un asesor».`}>
        {(p) => <textarea {...p} className={claseAreaTexto} rows={4} maxLength={MAX_CONDICIONES_PAGO} value={d.condicionesPago}
          placeholder="Por ejemplo: inicial desde S/ 5,000 y saldo en cuotas directas con la inmobiliaria."
          onChange={(e) => setD({ ...d, condicionesPago: e.target.value })} />}
      </Campo>
      {error && <Mensaje tono="error">{error}</Mensaje>}
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" onClick={alCancelar}>Cancelar</Button>
        <Button type="submit" disabled={ocupado} data-guardar-datos>{ocupado ? "Guardando…" : "Guardar"}</Button>
      </div>
    </form>
  );
}
