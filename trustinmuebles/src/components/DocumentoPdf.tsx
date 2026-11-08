import { useState } from "react";
import { Download, FileCheck2, FileWarning, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { descargarPdf, subirArchivo } from "@/lib/api";
import { avisoTamano, origenDocumento, resumenOptimizacion } from "@/lib/archivos";
import { fecha } from "@/lib/semaforo";
import type { DocumentoInfo, DocumentoSubido } from "@/lib/types";

/** Origen de un PDF («Subido por…», «Generado por el sistema…» o «Falta el archivo») con su botón de descarga. */
export function OrigenDocumento({ info, ruta, nombre }: { info: DocumentoInfo | null | undefined; ruta: string; nombre: string }) {
  const [error, setError] = useState<string | null>(null);
  const falta = !info || info.origen === "FALTA";
  const Icono = falta ? FileWarning : FileCheck2;
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className={`flex min-w-0 flex-1 items-start gap-1.5 text-xs font-semibold leading-relaxed ${falta ? "text-sem-amarillo-tinta" : "text-tinta-2"}`}>
          <Icono className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>{origenDocumento(info, fecha)}</span>
        </p>
        {!falta && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => descargarPdf(ruta, nombre).catch((e) => setError(e instanceof Error ? e.message : "No se pudo descargar"))}
          >
            <Download aria-hidden="true" /> Descargar
          </Button>
        )}
      </div>
      {error && <p role="alert" className="text-xs font-semibold text-sem-rojo-tinta">{error}</p>}
    </div>
  );
}

/**
 * Selector y subida de un PDF con el control de tamaño de la v0.8: más de 25 MB se rechaza antes de enviarlo; más de
 * 5 MB avisa que se optimizará; después de subir muestra «Optimizado: X → Y» si el servidor lo optimizó.
 */
export function SubirPdf({ id, ruta, etiqueta, textoBoton, alSubir }: {
  id: string; ruta: string; etiqueta: string; textoBoton: string; alSubir: (r: DocumentoSubido) => void | Promise<void>;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const aviso = archivo ? avisoTamano(archivo.size) : null;

  const subir = async () => {
    if (!archivo || aviso?.tipo === "excede") return;
    setError(null);
    setResultado(null);
    setSubiendo(true);
    try {
      const r = await subirArchivo<DocumentoSubido>(ruta, "documento", archivo);
      setResultado(resumenOptimizacion(r) ?? "Archivo guardado.");
      setArchivo(null);
      await alSubir(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el PDF");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-border bg-superficie p-3">
        <label htmlFor={id} className="sr-only">{etiqueta}</label>
        <input
          id={id}
          type="file"
          accept="application/pdf"
          className="min-w-0 max-w-full flex-1 text-xs file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-secondary-foreground"
          onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); setResultado(null); setError(null); }}
        />
        <Button type="button" variant="outline" size="sm" disabled={!archivo || subiendo || aviso?.tipo === "excede"} onClick={subir}>
          <Upload aria-hidden="true" />
          {subiendo ? "Subiendo…" : textoBoton}
        </Button>
      </div>
      {aviso?.mensaje && (
        <p role={aviso.tipo === "excede" ? "alert" : "status"}
          className={`text-xs font-semibold ${aviso.tipo === "excede" ? "text-sem-rojo-tinta" : "text-info-tinta"}`}>
          {aviso.mensaje}
        </p>
      )}
      {resultado && <p role="status" className="text-xs font-bold text-sem-verde-tinta">{resultado}</p>}
      {error && <p role="alert" className="text-xs font-semibold text-sem-rojo-tinta">{error}</p>}
    </div>
  );
}
