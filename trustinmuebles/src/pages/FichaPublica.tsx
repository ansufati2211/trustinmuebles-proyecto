import { Link, useParams } from "react-router";
import { ArrowLeft, Building2, CalendarCheck, FileText, Info, MapPin, Ruler } from "lucide-react";
import { Cargando, ErrorCarga } from "@/components/base/Estados";
import { IndicadorA, IndicadorB } from "@/components/base/Indicadores";
import { LineaIndependizacion } from "@/components/LineaIndependizacion";
import { PredioImagen } from "@/components/base/PredioImagen";
import { EtiquetaResaltado } from "@/components/EtiquetaResaltado";
import { useAuth } from "@/lib/auth";
import { m2, precio } from "@/lib/formato";
import { rutaFichaPublica } from "@/lib/publico";
import { ETIQUETA_ESTADO_PLANO } from "@/lib/semaforo";
import { useApi } from "@/lib/useApi";
import type { DetalleCaso } from "@/lib/types";

const tarjeta = "rounded-[2rem] border border-border bg-card p-6 shadow-tarjeta sm:p-8";

/**
 * v1.0: ficha pública de un inmueble publicado. No exige sesión y muestra lo que ve el comprador: datos del predio,
 * indicador A con sus motivos, indicador B y el estado de los documentos. Para pedir una cita se ingresa con una cuenta.
 */
export default function FichaPublica() {
  const { codigo = "" } = useParams();
  const { usuario } = useAuth();
  const { data: d, loading, error, reload } = useApi<DetalleCaso>(codigo ? rutaFichaPublica(codigo) : null);

  if (loading && !d) return <div className="pt-28"><Cargando texto="Cargando inmueble…" /></div>;
  if (error || !d) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-6 px-4 pb-24 pt-32 text-center">
        {error?.status === 404 ? (
          <>
            <h1 className="text-2xl font-black text-foreground">Este inmueble no está disponible</h1>
            <p className="text-tinta-2">Puede que ya no esté publicado. Revisa los demás inmuebles del catálogo.</p>
          </>
        ) : (
          <ErrorCarga mensaje={error?.message ?? "Sin datos"} alReintentar={reload} />
        )}
        <Link to="/inmuebles" className="inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
          Ver inmuebles
        </Link>
      </div>
    );
  }

  const p = d.predio;
  const ev = d.evaluacion;
  const t = d.evaluacionTecnica;
  const x = d.expediente;
  const deLaInmobiliaria = d.publicacion?.titularidadComercial === "INMOBILIARIA";
  const documentos = [
    ...(x.documentosLote ?? []).map((doc) => ({ nombre: doc.tipoEtiqueta, estado: doc.estado })),
    ...x.planos.map((pl) => ({ nombre: `Plano de ${pl.especialidadEtiqueta.toLowerCase()}`, estado: pl.estado })),
  ];

  return (
    <div className="flex w-full flex-1 flex-col bg-superficie pb-24">
      <div className="mx-auto w-full max-w-6xl px-4 pt-28 sm:px-6 lg:px-8">
        <Link to="/inmuebles" className="inline-flex items-center gap-1.5 text-sm font-bold text-tinta-2 hover:text-primary">
          <ArrowLeft className="size-4" aria-hidden="true" /> Todos los inmuebles
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="overflow-hidden rounded-[2rem] border border-border bg-muted shadow-tarjeta">
            <div className="aspect-[16/10]"><PredioImagen codigo={d.codigo} tipo={p.tipoInmueble} /></div>
          </div>

          <div className="space-y-5">
            <EtiquetaResaltado estado={ev?.estado ?? null} />
            <h1 className="text-2xl font-black leading-tight tracking-tight text-foreground sm:text-3xl">{d.denominacion}</h1>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-tinta-2">
              <li className="flex items-center gap-1.5"><MapPin className="size-4 text-primary" aria-hidden="true" />{p.distrito ?? d.contexto}</li>
              {p.areaM2 != null && (
                <li className="cifras flex items-center gap-1.5"><Ruler className="size-4 text-primary" aria-hidden="true" />{m2(p.areaM2)} de terreno</li>
              )}
              <li>{p.tipoInmuebleEtiqueta}</li>
              {p.proyecto && <li>Proyecto {p.proyecto}</li>}
              {p.estadoComercial && p.estadoComercial !== "DISPONIBLE" && <li>{p.estadoComercialEtiqueta}</li>}
              {deLaInmobiliaria && (
                <li className="flex items-center gap-1.5"><Building2 className="size-4 text-primary" aria-hidden="true" />Venta directa de la inmobiliaria</li>
              )}
            </ul>
            <div>
              <p className="cifras text-3xl font-black text-foreground">
                {p.precioReferencial != null ? precio(p.precioReferencial, p.moneda, true) : "Precio a consultar"}
              </p>
              {p.precioNota && <p className="mt-1 text-xs text-tinta-2">{p.precioNota}</p>}
              {p.precioPorM2 != null && (
                <p className="cifras mt-1 text-sm font-semibold text-tinta-2">{precio(p.precioPorM2, p.moneda)} por m²</p>
              )}
              <p className="cifras mt-1 text-xs font-semibold text-tinta-2">Partida N.° {d.codigo}</p>
            </div>
            <LineaIndependizacion predio={p} />

            <div className={`${tarjeta} space-y-4 !p-5`}>
              <p className="flex items-center gap-2 font-bold text-foreground">
                <CalendarCheck className="size-5 text-primary" aria-hidden="true" /> ¿Te interesa este inmueble?
              </p>
              {!usuario ? (
                <>
                  <p className="text-sm text-tinta-2">Ingresa con tu cuenta para pedir que un asesor te contacte.</p>
                  <Link to="/login" state={{ from: `/casos/${d.codigo}` }}
                    className="inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">Ingresar</Link>
                </>
              ) : (
                <Link to={`/casos/${d.codigo}`} className="inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
                  {usuario.rol === "COMPRADOR" ? "Ver el expediente y solicitar contacto" : "Abrir el expediente"}
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section aria-labelledby="titulo-a" className={`${tarjeta} space-y-4`}>
            <h2 id="titulo-a" className="text-xl font-bold text-foreground">Revisión de documentos (indicador A)</h2>
            <IndicadorA estado={ev?.estado} conResumen tamano="lg" />
            {ev && ev.motivos.length > 0 && (
              <ul className="space-y-2 text-sm text-foreground">
                {ev.motivos.map((m, i) => (
                  <li key={i} className="rounded-xl border border-border bg-superficie px-4 py-2.5">{m.texto}</li>
                ))}
              </ul>
            )}
            {ev && <p className="flex gap-2 text-xs text-tinta-2"><Info className="size-4 shrink-0" aria-hidden="true" />{ev.limite}</p>}
          </section>

          <section aria-labelledby="titulo-b" className={`${tarjeta} space-y-4`}>
            <h2 id="titulo-b" className="text-xl font-bold text-foreground">Inspección técnica (indicador B)</h2>
            <IndicadorB estado={t.estado} resultado={t.resultado} tamano="lg" />
            {t.conclusiones && <p className="text-sm text-foreground">{t.conclusiones}</p>}
            <p className="flex gap-2 text-xs text-tinta-2"><Info className="size-4 shrink-0" aria-hidden="true" />{t.limite}</p>
          </section>
        </div>

        {documentos.length > 0 && (
          <section aria-labelledby="titulo-docs" className={`${tarjeta} mt-8 space-y-4`}>
            <h2 id="titulo-docs" className="flex items-center gap-2 text-xl font-bold text-foreground">
              <FileText className="size-5 text-primary" aria-hidden="true" /> Documentos del inmueble
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {documentos.map((doc) => (
                <li key={doc.nombre} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-superficie px-4 py-2.5 text-sm">
                  <span className="font-semibold text-foreground">{doc.nombre}</span>
                  <span className="text-tinta-2">{ETIQUETA_ESTADO_PLANO[doc.estado]}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-8 text-xs leading-relaxed text-tinta-2">
          La información es referencial y no reemplaza la verificación legal con un abogado o notario antes de comprar.
        </p>
      </div>
    </div>
  );
}
