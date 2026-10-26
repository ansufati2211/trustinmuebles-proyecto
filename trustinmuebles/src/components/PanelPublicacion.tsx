import { useState } from "react";
import { CheckCircle2, CircleDashed, EyeOff, FileText, Globe, Info, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, type TonoBadge } from "@/components/base/Badge";
import { api, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ETIQUETA_PUBLICACION } from "@/lib/cartera";
import { esPropietarioDe, puedeAutorizar, puedePublicar, puedeRetirarAutorizacion, puedeRetirarPublicacion } from "@/lib/permisos";
import { fecha } from "@/lib/semaforo";
import type { DetalleCaso, EstadoPublicacion, Publicacion } from "@/lib/types";

const ESTILO: Record<EstadoPublicacion, { tono: TonoBadge; Icono: LucideIcon }> = {
  BORRADOR: { tono: "gris", Icono: FileText },
  PUBLICADO: { tono: "marca", Icono: Globe },
  RETIRADO: { tono: "arena", Icono: EyeOff },
};

/** Insignia del estado de publicación. No usa los colores del semáforo para no confundirse con el indicador A. */
export function InsigniaPublicacion({ estado, tamano = "md" }: { estado: EstadoPublicacion; tamano?: "sm" | "md" }) {
  const e = ESTILO[estado];
  return <Badge tono={e.tono} icono={e.Icono} tamano={tamano}>{ETIQUETA_PUBLICACION[estado]}</Badge>;
}

export function InsigniaAutorizacion({ p, tamano = "md" }: { p: Publicacion; tamano?: "sm" | "md" }) {
  return p.autorizada
    ? <Badge tono="verde" icono={CheckCircle2} tamano={tamano}>Autorizado por el propietario</Badge>
    : <Badge tono="gris" icono={CircleDashed} tamano={tamano}>Sin autorización del propietario</Badge>;
}

/**
 * Captación y publicación de un caso (v0.7). El propietario autoriza o retira su autorización; el gestor publica o
 * retira. Tras cada operación se vuelve a consultar el caso al servidor: la interfaz no cambia nada por su cuenta y
 * ninguna de estas acciones toca el color del indicador A (I8).
 */
export function PanelPublicacion({ codigo, publicacion, alCambiar }: {
  codigo: string; publicacion: Publicacion; alCambiar: (d: DetalleCaso) => void;
}) {
  const { usuario } = useAuth();
  const rol = usuario?.rol;
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const p = publicacion;

  const ejecutar = async (accion: () => Promise<unknown>, exito: string) => {
    setError(null); setAviso(null); setEnviando(true);
    try {
      await accion();
      alCambiar(await api<DetalleCaso>(`/casos/${codigo}`));
      setAviso(exito);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la operación");
    } finally {
      setEnviando(false);
    }
  };

  const ruta = (r: string) => `/casos/${codigo}/${r}`;
  const acciones = [
    puedeAutorizar(usuario, p) && (
      <Button key="aut" className="rounded-xl" disabled={enviando}
        onClick={() => ejecutar(() => api(ruta("autorizacion"), { method: "PUT" }), "Autorización registrada.")}>
        Autorizar evaluación
      </Button>
    ),
    puedeRetirarAutorizacion(usuario, p) && (
      <Button key="ret-aut" variant="outline" className="rounded-xl" disabled={enviando}
        onClick={() => ejecutar(() => api(ruta("autorizacion"), { method: "DELETE" }), "Autorización retirada.")}>
        Retirar autorización
      </Button>
    ),
    puedePublicar(rol, p) && (
      <Button key="pub" className="rounded-xl" disabled={enviando}
        onClick={() => ejecutar(() => post(ruta("publicacion")), "Caso publicado.")}>
        Publicar
      </Button>
    ),
    puedeRetirarPublicacion(rol, p) && (
      <Button key="ret-pub" variant="outline" className="rounded-xl" disabled={enviando}
        onClick={() => ejecutar(() => api(ruta("publicacion"), { method: "DELETE" }), "Publicación retirada.")}>
        Retirar
      </Button>
    ),
  ].filter(Boolean);

  // El comprador solo ve casos publicados: no necesita este panel.
  if (rol === "COMPRADOR") return null;

  return (
    <section aria-labelledby="titulo-publicacion" className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-tarjeta sm:p-8">
      <h2 id="titulo-publicacion" className="flex items-center gap-2 text-xl font-bold text-foreground">
        <Globe className="size-5 text-primary" aria-hidden="true" /> Publicación y autorización
      </h2>
      <div className="flex flex-wrap gap-2">
        <InsigniaPublicacion estado={p.estado} />
        <InsigniaAutorizacion p={p} />
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {p.propietarioCodigo && (
          <div><dt className="text-xs font-bold text-tinta-2">Propietario (código de cuenta)</dt><dd className="font-bold text-foreground">{p.propietarioCodigo}</dd></div>
        )}
        {p.autorizacionFecha && (
          <div><dt className="text-xs font-bold text-tinta-2">Autorizado el</dt><dd className="font-bold text-foreground">{fecha(p.autorizacionFecha)}</dd></div>
        )}
      </dl>
      {rol === "GESTOR" && !p.autorizada && p.estado !== "PUBLICADO" && (
        <p className="text-sm text-tinta-2">No se puede publicar hasta que el propietario autorice el caso.</p>
      )}
      {esPropietarioDe(usuario, p) && (
        <p className="text-sm text-tinta-2">
          Tu única acción sobre este expediente es otorgar o retirar tu autorización. Si la retiras, el caso deja de estar publicado.
        </p>
      )}
      {acciones.length > 0 && <div className="flex flex-wrap gap-3">{acciones}</div>}
      <p className="flex gap-2 text-xs font-semibold text-tinta-2">
        <Info className="size-4 shrink-0" aria-hidden="true" />
        Publicar, retirar o autorizar no cambian el color del indicador A.
      </p>
      {aviso && <p role="status" className="rounded-2xl border border-sem-verde/40 bg-sem-verde-suave p-4 text-sm font-semibold text-sem-verde-tinta">{aviso}</p>}
      {error && <p role="alert" className="text-sm font-semibold text-sem-rojo-tinta">{error}</p>}
    </section>
  );
}
