import { Link, useParams } from "react-router";
import { ArrowLeft, CheckCircle2, CircleDashed, Clock, ExternalLink, FileText, LayoutGrid, MapPin, PlayCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Cargando, ErrorCarga } from "@/components/base/Estados";
import { PlanoLotes } from "@/components/PlanoLotes";
import { IndicadorProyecto } from "@/components/IndicadorProyecto";
import { useApi } from "@/lib/useApi";
import { ETIQUETA_ESTADO_PLANO, fecha } from "@/lib/semaforo";
import { enlaceCatalogoDelProyecto, recorridoDe, rutaDocumentoProyecto, rutaProyectoPublico, urlDocumentoProyecto } from "@/lib/proyectos";
import { useAuth } from "@/lib/auth";
import { abrirPdf } from "@/lib/api";
import type { EstadoHito, ProyectoPublico } from "@/lib/types";

const tarjeta = "rounded-[2rem] border border-border bg-card p-6 shadow-tarjeta sm:p-8";

const ICONO_HITO: Record<EstadoHito, { Icono: LucideIcon; clase: string }> = {
  COMPLETADO: { Icono: CheckCircle2, clase: "text-primary" },
  EN_PROCESO: { Icono: Clock, clase: "text-info-tinta" },
  PENDIENTE: { Icono: CircleDashed, clase: "text-tinta-2" },
};

/**
 * v1.0 (etapa 3a): página pública de un proyecto. Plano de lotes por manzanas, recorrido o video (solo si hay enlace),
 * hitos informativos y documentos del proyecto (los de su partida matriz). No exige sesión. v1.0 (etapa 7): sin sesión,
 * los documentos se abren con un enlace directo y la partida matriz sale parcialmente oculta; con sesión se piden con
 * ella y la partida sale completa.
 */
export default function Proyecto() {
  const { codigo = "" } = useParams();
  const { usuario } = useAuth();
  const { data: p, loading, error, reload } = useApi<ProyectoPublico>(codigo ? rutaProyectoPublico(codigo) : null);

  if (loading && !p) return <div className="pt-28"><Cargando texto="Cargando proyecto…" /></div>;
  if (error || !p) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-6 px-4 pb-24 pt-32 text-center">
        {error?.status === 404 ? (
          <>
            <h1 className="text-2xl font-black text-foreground">Este proyecto no está disponible</h1>
            <p className="text-tinta-2">Puede que todavía no tenga lotes publicados. Revisa los demás inmuebles del catálogo.</p>
          </>
        ) : (
          <ErrorCarga mensaje={error?.message ?? "Sin datos"} alReintentar={reload} />
        )}
        <Link to="/inmuebles" className="inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">Ver inmuebles</Link>
      </div>
    );
  }

  const recorrido = recorridoDe(p.recorridoUrl);
  const ofrecidos = p.lotes.filter((l) => l.publicado).length;

  return (
    <div className="flex w-full flex-1 flex-col bg-superficie pb-24">
      <section className="relative isolate overflow-hidden bg-foreground">
        <div className="animate-glow pointer-events-none absolute -left-20 -top-24 -z-10 h-[340px] w-[480px] rounded-full bg-primary/30 blur-[100px]" aria-hidden="true" />
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-28 sm:px-6 lg:px-8">
          <Link to="/inmuebles" className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-300 hover:text-white">
            <ArrowLeft className="size-4" aria-hidden="true" /> Todos los inmuebles
          </Link>
          <p className="mt-6 text-sm font-bold uppercase tracking-wider text-emerald-300">Proyecto</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-5xl">{p.nombre}</h1>
          {p.distrito && (
            <p className="mt-3 flex items-center gap-1.5 text-base font-semibold text-gray-200">
              <MapPin className="size-4 text-emerald-300" aria-hidden="true" /> {p.distrito}, Ica
            </p>
          )}
          {p.descripcion && <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-300 sm:text-lg">{p.descripcion}</p>}
          {p.lotes.length > 0 && (
            <ul className="cifras mt-6 flex flex-wrap gap-3 text-sm font-bold text-white" aria-label="Lotes por estado">
              <li className="rounded-full bg-white/10 px-4 py-1.5">{p.lotes.length} lotes</li>
              <li className="rounded-full bg-white/10 px-4 py-1.5">{p.conteo.disponibles} disponibles</li>
              <li className="rounded-full bg-white/10 px-4 py-1.5">{p.conteo.separados} separados</li>
              <li className="rounded-full bg-white/10 px-4 py-1.5">{p.conteo.vendidos} vendidos</li>
            </ul>
          )}
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 pt-8 sm:px-6 lg:px-8">
        <section aria-labelledby="titulo-plano" className={`${tarjeta} space-y-5`}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="titulo-plano" className="flex items-center gap-2 text-xl font-bold text-foreground">
              <LayoutGrid className="size-5 text-primary" aria-hidden="true" /> Plano de lotes
            </h2>
            {ofrecidos > 0 && (
              <Link to={enlaceCatalogoDelProyecto(p.nombre)} className="text-sm font-bold text-primary hover:underline">
                Ver los lotes en el catálogo
              </Link>
            )}
          </div>
          <PlanoLotes proyectoCodigo={p.codigo} lotes={p.lotes} />
          {p.lotes.length === 0 && p.inmueblesPublicados > 0 && (
            <Link to={enlaceCatalogoDelProyecto(p.nombre)} className="inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
              Ver los inmuebles de este proyecto
            </Link>
          )}
          <p className="text-xs text-tinta-2">
            Plano referencial de la lotización: las medidas exactas de cada lote están en su partida y en el plano aprobado.
          </p>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className={tarjeta}><IndicadorProyecto indicador={p.indicadorA} /></div>

          <section aria-labelledby="titulo-hitos" className={`${tarjeta} space-y-4`}>
            <h2 id="titulo-hitos" className="text-xl font-bold text-foreground">Avance del proyecto</h2>
            {p.hitos.length === 0 ? (
              <p className="text-sm text-tinta-2">La inmobiliaria todavía no registró el avance de este proyecto.</p>
            ) : (
              <ol className="space-y-3">
                {p.hitos.map((h) => {
                  const { Icono, clase } = ICONO_HITO[h.estado];
                  return (
                    <li key={h.orden} className="flex items-start gap-3" data-hito={h.estado}>
                      <Icono className={`mt-0.5 size-5 shrink-0 ${clase}`} aria-hidden="true" />
                      <div>
                        <p className="font-semibold text-foreground">{h.nombre}</p>
                        <p className="text-sm text-tinta-2">{h.estadoEtiqueta}{h.fecha ? ` · ${fecha(h.fecha)}` : ""}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
            <p className="text-xs text-tinta-2">El avance es informativo y no cambia el indicador A.</p>
          </section>
        </div>

        {recorrido && (
          <section aria-labelledby="titulo-recorrido" className={`${tarjeta} space-y-4`}>
            <h2 id="titulo-recorrido" className="flex items-center gap-2 text-xl font-bold text-foreground">
              <PlayCircle className="size-5 text-primary" aria-hidden="true" /> Recorrido del proyecto
            </h2>
            {recorrido.tipo === "youtube" ? (
              <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-muted">
                <iframe src={recorrido.src} title={`Video del proyecto ${p.nombre}`} loading="lazy" className="h-full w-full"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
              </div>
            ) : (
              <a href={recorrido.href} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
                Abrir el recorrido <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            )}
          </section>
        )}

        {p.documentos.length > 0 && (
          <section aria-labelledby="titulo-documentos" className={`${tarjeta} space-y-4`}>
            <h2 id="titulo-documentos" className="flex items-center gap-2 text-xl font-bold text-foreground">
              <FileText className="size-5 text-primary" aria-hidden="true" /> Documentos del proyecto
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {p.documentos.map((d) => (
                <li key={d.tipo} className="space-y-1.5 rounded-2xl border border-border bg-superficie px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-foreground">{d.tipoEtiqueta}</span>
                    <span className="text-tinta-2">{ETIQUETA_ESTADO_PLANO[d.estado]}</span>
                  </div>
                  {d.resumen && <p className="text-tinta-2">{d.resumen}</p>}
                  {d.disponible && (usuario ? (
                    <button type="button" data-con-sesion="true" onClick={() => { abrirPdf(rutaDocumentoProyecto(p.codigo, d.tipo)).catch(() => {}); }}
                      className="inline-flex items-center gap-1 font-bold text-primary hover:underline">
                      Ver documento (PDF) <ExternalLink className="size-3.5" aria-hidden="true" />
                    </button>
                  ) : (
                    <a href={urlDocumentoProyecto(p.codigo, d.tipo)} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-primary hover:underline">
                      Ver documento (PDF) <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  ))}
                </li>
              ))}
            </ul>
            <p className="text-xs text-tinta-2">
              Documentos de la partida matriz del proyecto que la inmobiliaria adjuntó a su expediente; son referenciales.
            </p>
          </section>
        )}

        <p className="text-xs leading-relaxed text-tinta-2">
          La información es referencial y no reemplaza la verificación legal con un abogado o notario antes de comprar.
        </p>
      </div>
    </div>
  );
}
