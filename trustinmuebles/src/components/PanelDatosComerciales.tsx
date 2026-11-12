import { useState } from "react";
import { Tags } from "lucide-react";
import { Campo, claseCampo } from "@/components/base/Campo";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { OPCIONES_ESTADO_COMERCIAL } from "@/lib/filtrosPublico";
import type { DetalleCaso, EstadoComercial, Independizacion } from "@/lib/types";

export const OPCIONES_INDEPENDIZACION: { valor: Independizacion; etiqueta: string }[] = [
  { valor: "PARTIDA_PROPIA", etiqueta: "Partida propia" },
  { valor: "EN_PARTIDA_MATRIZ", etiqueta: "En partida matriz" },
  { valor: "NO_CONSTA", etiqueta: "No consta" },
];

/**
 * v1.0 (etapa 2): el asesor (o el revisor) corrige el proyecto, el estado comercial y la independización del lote. Son
 * datos informativos del catálogo: guardarlos no recalcula el indicador A ni agrega una evaluación al historial.
 */
export function PanelDatosComerciales({ detalle, alGuardar }: { detalle: DetalleCaso; alGuardar: (d: DetalleCaso) => void }) {
  const p = detalle.predio;
  const [proyecto, setProyecto] = useState(p.proyecto ?? "");
  const [estado, setEstado] = useState<EstadoComercial>(p.estadoComercial ?? "DISPONIBLE");
  const [independizacion, setIndependizacion] = useState<Independizacion>(p.independizacion ?? "NO_CONSTA");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  const guardar = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      const nuevo = await api<DetalleCaso>(`/casos/${detalle.codigo}/datos-comerciales`, {
        method: "PUT", body: JSON.stringify({ proyecto: proyecto.trim(), estadoComercial: estado, independizacion }),
      });
      alGuardar(nuevo);
      setMensaje({ ok: true, texto: "Datos guardados." });
    } catch (e) {
      setMensaje({ ok: false, texto: e instanceof Error ? e.message : "No se pudieron guardar los datos" });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section aria-labelledby="datos-comerciales" className="space-y-4 rounded-[2rem] border border-border bg-card p-6 shadow-tarjeta">
      <h2 id="datos-comerciales" className="flex items-center gap-2 text-lg font-bold text-foreground">
        <Tags className="size-5 text-primary" aria-hidden="true" /> Datos comerciales
      </h2>
      <p className="text-xs leading-relaxed text-tinta-2">
        Lo que el comprador usa para buscar. No cambia el indicador A.
      </p>
      <Campo etiqueta="Proyecto">
        {(c) => <input {...c} className={claseCampo} maxLength={120} placeholder="Sin proyecto" value={proyecto}
          onChange={(e) => setProyecto(e.target.value)} />}
      </Campo>
      <Campo etiqueta="Estado comercial">
        {(c) => (
          <select {...c} className={claseCampo} value={estado} onChange={(e) => setEstado(e.target.value as EstadoComercial)}>
            {OPCIONES_ESTADO_COMERCIAL.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
          </select>
        )}
      </Campo>
      <Campo etiqueta="Independización del lote">
        {(c) => (
          <select {...c} className={claseCampo} value={independizacion}
            onChange={(e) => setIndependizacion(e.target.value as Independizacion)}>
            {OPCIONES_INDEPENDIZACION.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
          </select>
        )}
      </Campo>
      <Button type="button" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar datos comerciales"}</Button>
      {mensaje && (
        <p role={mensaje.ok ? "status" : "alert"} className={`text-sm font-semibold ${mensaje.ok ? "text-sem-verde-tinta" : "text-sem-rojo-tinta"}`}>
          {mensaje.texto}
        </p>
      )}
    </section>
  );
}
