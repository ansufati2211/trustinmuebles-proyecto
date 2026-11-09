import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/base/Modal";
import { abrirPdf, pdfComoUrl } from "@/lib/api";

/**
 * Visor de un PDF del expediente dentro de un modal (láminas de planos y, v0.9, documentos del lote). El PDF se pide con
 * la sesión y se muestra desde una URL local que se libera al cerrar.
 */
export function VisorPdf({ ruta, titulo, descripcion, abierto, alCerrar }: {
  ruta: string; titulo: string; descripcion: string; abierto: boolean; alCerrar: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    let vigente = true;
    let creada: string | null = null;
    setUrl(null);
    setError(null);
    pdfComoUrl(ruta)
      .then((u) => {
        creada = u;
        if (vigente) setUrl(u);
        else URL.revokeObjectURL(u);
      })
      .catch((e) => {
        if (vigente) setError(e instanceof Error ? e.message : "No se pudo abrir el documento");
      });
    return () => {
      vigente = false;
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [abierto, ruta]);

  const abrirAparte = () => {
    abrirPdf(ruta).catch((e) => setError(e instanceof Error ? e.message : "No se pudo abrir el PDF"));
  };

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      ancho="xl"
      titulo={titulo}
      descripcion={descripcion}
      pie={
        <>
          <Button variant="outline" onClick={abrirAparte}>
            Abrir el PDF en otra pestaña <ExternalLink aria-hidden="true" />
          </Button>
          <Button onClick={alCerrar}>Cerrar</Button>
        </>
      }
    >
      <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-muted">
        {error ? (
          <p role="alert" className="p-6 text-sm font-semibold text-sem-rojo-tinta">{error}</p>
        ) : url ? (
          <iframe title={`PDF: ${titulo}`} src={url} className="h-full w-full" />
        ) : (
          <div role="status" className="grid h-full place-items-center">
            <span className="flex items-center gap-3 text-sm font-semibold text-tinta-2">
              <span className="size-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" aria-hidden="true" />
              Cargando el documento…
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}
