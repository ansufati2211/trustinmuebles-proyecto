import { Link, Navigate, useParams } from "react-router";
import { ArrowLeft, Building2, CalendarCheck, LayoutGrid, MapPin, Ruler } from "lucide-react";
import { Cargando, ErrorCarga } from "@/components/base/Estados";
import { PredioImagen } from "@/components/base/PredioImagen";
import { EtiquetaResaltado } from "@/components/EtiquetaResaltado";
import { IndicadorProyecto } from "@/components/IndicadorProyecto";
import { LineaIndependizacion } from "@/components/LineaIndependizacion";
import { SolicitarCita } from "@/components/SolicitarCita";
import { UsosDelLote } from "@/components/UsosDelLote";
import { UbicacionProyecto } from "@/components/UbicacionProyecto";
import { m2, precio } from "@/lib/formato";
import { enlaceProyecto, rutaLotePublico } from "@/lib/proyectos";
import { useApi } from "@/lib/useApi";
import type { LotePublico } from "@/lib/types";

const tarjeta = "rounded-[2rem] border border-border bg-card p-6 shadow-tarjeta sm:p-8";

/**
 * v1.0 (etapa 3a): ficha pública de un lote de proyecto sin caso propio. Muestra el área, el precio, el precio por m², la
 * zonificación y la independización, con el indicador A de la partida matriz del proyecto (rotulado así). Si el lote
 * tiene un caso propio, su ficha es la del caso.
 */
export default function FichaLote() {
  const { codigo = "", lote: clave = "" } = useParams();
  const { data: d, loading, error, reload } = useApi<LotePublico>(codigo && clave ? rutaLotePublico(codigo, clave) : null);

  if (loading && !d) return <div className="pt-28"><Cargando texto="Cargando lote…" /></div>;
  if (error || !d) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-6 px-4 pb-24 pt-32 text-center">
        {error?.status === 404 ? (
          <>
            <h1 className="text-2xl font-black text-foreground">Este lote no está disponible</h1>
            <p className="text-tinta-2">Puede que ya no se ofrezca en línea. Revisa el plano del proyecto.</p>
          </>
        ) : (
          <ErrorCarga mensaje={error?.message ?? "Sin datos"} alReintentar={reload} />
        )}
        <Link to={codigo ? enlaceProyecto(codigo) : "/inmuebles"} className="inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
          Ver el proyecto
        </Link>
      </div>
    );
  }
  if (d.lote.casoCodigo) return <Navigate to={`/inmuebles/${d.lote.casoCodigo}`} replace />;

  const p = d.predio;
  const ev = d.indicadorA.evaluacion;

  return (
    <div className="flex w-full flex-1 flex-col bg-superficie pb-24">
      <div className="mx-auto w-full max-w-6xl px-4 pt-28 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link to="/inmuebles" className="inline-flex items-center gap-1.5 text-sm font-bold text-tinta-2 hover:text-primary">
            <ArrowLeft className="size-4" aria-hidden="true" /> Todos los inmuebles
          </Link>
          <Link to={enlaceProyecto(d.proyectoCodigo)} className="inline-flex items-center gap-1.5 text-sm font-bold text-tinta-2 hover:text-primary">
            <LayoutGrid className="size-4" aria-hidden="true" /> Plano de {d.proyectoNombre}
          </Link>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="overflow-hidden rounded-[2rem] border border-border bg-muted shadow-tarjeta">
            <div className="aspect-[16/10]"><PredioImagen codigo={d.codigo} tipo="LOTE_URBANO" /></div>
          </div>

          <div className="space-y-5">
            <EtiquetaResaltado estado={ev?.estado ?? null} />
            <h1 className="text-2xl font-black leading-tight tracking-tight text-foreground sm:text-3xl">{d.denominacion}</h1>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-tinta-2">
              <li className="flex items-center gap-1.5"><MapPin className="size-4 text-primary" aria-hidden="true" />{p.distrito ?? "Ica"}</li>
              <li className="cifras flex items-center gap-1.5"><Ruler className="size-4 text-primary" aria-hidden="true" />{m2(p.areaM2)} de terreno</li>
              <li>Proyecto {d.proyectoNombre}</li>
              {p.zonificacion && <li>Zonificación {p.zonificacion}</li>}
              <li>{d.lote.estadoComercialEtiqueta}</li>
              <li className="flex items-center gap-1.5"><Building2 className="size-4 text-primary" aria-hidden="true" />Venta directa de la inmobiliaria</li>
            </ul>
            <div>
              <p className="cifras text-3xl font-black text-foreground">
                {p.precioReferencial != null ? precio(p.precioReferencial, p.moneda, true) : "Precio a consultar"}
              </p>
              {p.precioNota && <p className="mt-1 text-xs text-tinta-2">{p.precioNota}</p>}
              {p.precioPorM2 != null && (
                <p className="cifras mt-1 text-sm font-semibold text-tinta-2">{precio(p.precioPorM2, p.moneda)} por m²</p>
              )}
              <p className="cifras mt-1 text-xs font-semibold text-tinta-2">Mz. {d.lote.manzana} · Lote {d.lote.numero}</p>
            </div>
            <LineaIndependizacion predio={p} />
            {/* v1.0 (etapa 9): dirección del proyecto y «Cómo llegar». */}
            <UbicacionProyecto direccion={d.proyectoDireccion} mapaUrl={d.proyectoMapaUrl} nombre={d.proyectoNombre} />

            <div className={`${tarjeta} space-y-3 !p-5`}>
              <p className="flex items-center gap-2 font-bold text-foreground">
                <CalendarCheck className="size-5 text-primary" aria-hidden="true" /> ¿Te interesa este lote?
              </p>
              <p className="text-sm text-tinta-2">
                Un asesor de la inmobiliaria puede mostrarte el proyecto y el lote, y responder tus dudas sobre sus documentos.
              </p>
              {/* v1.0 (etapa 4): la cita queda vinculada a este lote y a su proyecto, aunque el lote no tenga caso propio. */}
              <SolicitarCita destino={{ proyectoCodigo: d.proyectoCodigo, lote: d.lote.clave, nombre: d.denominacion, referencia: d.codigo }} />
              <Link to={enlaceProyecto(d.proyectoCodigo)} className="inline-flex text-sm font-bold text-primary hover:underline">
                Ver el proyecto y su avance
              </Link>
            </div>
          </div>
        </div>

        {/* v1.0 (etapa 5): usos que suelen permitirse según la zonificación y el área, con el aviso de verificar. */}
        <div className={`${tarjeta} mt-10`}><UsosDelLote zonificacion={p.zonificacion ?? d.lote.zonificacion} areaM2={p.areaM2 ?? d.lote.areaM2} /></div>

        <div className={`${tarjeta} mt-8`}><IndicadorProyecto indicador={d.indicadorA} /></div>

        <p className="mt-8 text-xs leading-relaxed text-tinta-2">
          La información es referencial y no reemplaza la verificación legal con un abogado o notario antes de comprar.
        </p>
      </div>
    </div>
  );
}
