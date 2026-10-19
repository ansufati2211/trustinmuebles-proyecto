import { useEffect } from "react";
import { Link, useLocation } from "react-router";
import {
  ArrowRight, Ban, BookOpen, Building2, CheckCircle2, ClipboardList, FileText, HandCoins, HardHat, Landmark, MapPinned,
  ShieldOff, TrafficCone, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PredioImagen } from "@/components/base/PredioImagen";
import { IndicadorA, IndicadorB } from "@/components/base/Indicadores";
import { PROCEDIMIENTO_INSPECCION } from "@/lib/semaforo";
import type { EstadoSemaforo } from "@/lib/types";

const LIMITES = [
  "No certifica saneamiento",
  "No recomienda comprar",
  "No consulta fuentes oficiales",
  "No reemplaza asesoría especializada",
];

const PASOS: { Icono: LucideIcon; titulo: string; texto: string; detalle?: "semaforo" | "pasos" | "checklist" }[] = [
  {
    Icono: Building2, titulo: "Captación y verificación de cartera propia en Ica",
    texto: "El propietario nos encarga la venta y entrega su carpeta. Un revisor de la inmobiliaria verifica los documentos y registra el expediente a mano: sin copiar datos de otros portales y sin conexiones a fuentes que no existen.",
  },
  {
    Icono: TrafficCone, titulo: "Indicador A · Evaluación documental automatizada",
    texto: "Reglas explícitas revisan la partida registral (rubros C, D, E y F) y los 4 planos de la vivienda. El resultado es un semáforo de 4 estados con sus motivos, y un glosario explica cada término.",
    detalle: "semaforo",
  },
  {
    Icono: HardHat, titulo: "Indicador B · Evaluación técnica presencial",
    texto: "Si lo pides, un ingeniero civil o arquitecto colegiado visita el inmueble y sigue 6 pasos, de la revisión documental al informe. Es independiente: nunca cambia el color del indicador A (RN-10).",
    detalle: "pasos",
  },
  {
    Icono: ClipboardList, titulo: "Decisión informada",
    texto: "Revisas el checklist de pendientes, que incluye la declaración jurada municipal (HR y PU), y abres en PDF la copia literal, las láminas de planos y el informe técnico.",
    detalle: "checklist",
  },
];

const FUENTES_GRATUITAS: { Icono: LucideIcon; nombre: string; uso: string }[] = [
  { Icono: Landmark, nombre: "Conoce Aquí (SUNARP)", uso: "Texto de la partida registral, que el revisor transcribe sin datos de personas naturales." },
  { Icono: MapPinned, nombre: "Visor Catastral BGR (SUNARP)", uso: "Ubicación gráfica del predio. Se enlaza desde el expediente; no se copia ningún dato." },
];

const FUENTES_APORTADAS: { Icono: LucideIcon; nombre: string; uso: string }[] = [
  { Icono: FileText, nombre: "Copia literal certificada", uso: "La partida completa con valor oficial. Tiene costo en SUNARP y la aporta el propietario." },
  { Icono: ClipboardList, nombre: "Planos de 4 especialidades", uso: "Arquitectura, estructuras, instalaciones eléctricas y sanitarias. Los entrega el propietario." },
  { Icono: BookOpen, nombre: "Declaración jurada municipal (HR y PU)", uso: "Hoja resumen y predio urbano de la municipalidad. La entrega el propietario." },
  { Icono: HandCoins, nombre: "Inspección presencial del especialista", uso: "Servicio adicional con costo referencial, que se informa antes de confirmar la solicitud." },
];

const SEMAFORO: EstadoSemaforo[] = ["VERDE", "AMARILLO", "ROJO", "GRIS"];

export default function Landing() {
  const location = useLocation();

  // Con el enrutador por hash no sirven las anclas normales: el menú envía el destino por estado.
  useEffect(() => {
    const destino = (location.state as { desplazarA?: string } | null)?.desplazarA;
    if (destino) document.getElementById(destino)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location]);

  return (
    <div className="flex w-full flex-1 flex-col">

      {/* Héroe */}
      <section className="relative overflow-hidden bg-gradient-to-b from-secondary/70 to-superficie">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:px-8 lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-4 py-1.5 text-sm font-bold text-primary shadow-tarjeta">
              <Building2 className="size-4" aria-hidden="true" /> Inmobiliaria en Ica · transparencia precompra
            </p>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground md:text-5xl lg:text-[3.4rem]">
              Compra en Ica sabiendo qué dicen los papeles <span className="text-primary">y cómo está la obra.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-tinta-2">
              Cada lote y vivienda de nuestra cartera trae su partida explicada, sus 4 planos revisados y, si la pides, una
              inspección presencial de un profesional colegiado. Te orientamos; no reemplazamos a tu abogado.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild className="h-14 rounded-2xl px-8 text-base">
                <Link to="/casos">Explorar Cartera de Inmuebles <ArrowRight className="size-5" aria-hidden="true" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-14 rounded-2xl bg-card px-8 text-base">
                <Link to="/" state={{ desplazarA: "como-te-protegemos" }}>Cómo te protegemos</Link>
              </Button>
            </div>
          </div>

          <figure className="relative">
            <div className="aspect-[16/11] overflow-hidden rounded-[2rem] border border-border bg-muted shadow-elevada">
              <PredioImagen codigo="SIM-11052690" tipo="VIVIENDA_URBANA" />
            </div>
            <div className="absolute -bottom-6 left-4 right-4 flex flex-col gap-2 rounded-2xl border border-border bg-card/95 p-4 shadow-elevada backdrop-blur sm:left-auto sm:w-80">
              <p className="text-xs font-bold uppercase tracking-wider text-tinta-2">Mz. K Lote 12 · La Tinguiña</p>
              <IndicadorA estado="AMARILLO" tamano="sm" conResumen />
              <IndicadorB estado="EMITIDO" resultado="CON_OBSERVACIONES" tamano="sm" />
            </div>
            <figcaption className="mt-10 text-center text-xs text-tinta-2 sm:mt-3 sm:text-left">
              Ilustración propia y datos de un expediente de demostración.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Límites */}
      <section aria-label="Límites del servicio" className="border-y border-border bg-card py-7">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-4 text-center text-xs font-bold uppercase tracking-wider text-tinta-2">Lo que Trustinmuebles no hace</p>
          <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {LIMITES.map((l) => (
              <li key={l} className="flex items-center gap-2 font-bold text-foreground">
                <ShieldOff className="size-5 text-tinta-2" aria-hidden="true" /> {l}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Modelo en 4 pasos */}
      <section id="como-te-protegemos" aria-labelledby="titulo-pasos" className="scroll-mt-32 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 id="titulo-pasos" className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              ¿Cómo te protegemos antes de comprar?
            </h2>
            <p className="mt-2 text-lg font-semibold text-primary">Nuestro modelo en 4 pasos</p>
          </div>
          <ol className="grid gap-6 md:grid-cols-2">
            {PASOS.map(({ Icono, titulo, texto, detalle }, i) => (
              <li key={titulo} className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-7 shadow-tarjeta">
                <div className="flex items-center gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-white">
                    <Icono className="size-6" aria-hidden="true" />
                  </span>
                  <p className="text-xs font-bold uppercase tracking-wider text-tinta-2">Paso {i + 1}</p>
                </div>
                <h3 className="text-xl font-bold leading-snug text-foreground">{titulo}</h3>
                <p className="leading-relaxed text-tinta-2">{texto}</p>
                {detalle === "semaforo" && (
                  <ul className="flex flex-wrap gap-2" aria-label="Los 4 estados del semáforo">
                    {SEMAFORO.map((e) => <li key={e}><IndicadorA estado={e} tamano="sm" conPrefijo={false} /></li>)}
                  </ul>
                )}
                {detalle === "pasos" && (
                  <ol className="grid gap-1.5 text-sm text-foreground sm:grid-cols-2">
                    {PROCEDIMIENTO_INSPECCION.map((p, j) => (
                      <li key={p.titulo} className="flex gap-2"><span className="cifras font-bold text-primary">{j + 1}.</span>{p.titulo}</li>
                    ))}
                  </ol>
                )}
                {detalle === "checklist" && (
                  <ul className="space-y-1.5 text-sm text-foreground">
                    {["Copia literal de la partida", "Declaración Jurada Municipal (HR y PU)", "Planos e informe técnico en PDF"].map((t) => (
                      <li key={t} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-sem-verde-tinta" aria-hidden="true" />{t}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>

          {/* Las dos propuestas de valor, siempre separadas */}
          <div className="mt-10 grid gap-4 rounded-3xl border border-border bg-card p-6 md:grid-cols-2">
            <div className="rounded-2xl bg-superficie p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Indicador A · incluido</p>
              <p className="mt-1 font-bold text-foreground">Lo que dicen los papeles</p>
              <p className="mt-1 text-sm text-tinta-2">Automático, sobre la partida y los 4 planos. Verde = sin alertas en los campos evaluados; no dice si la obra está bien hecha.</p>
            </div>
            <div className="rounded-2xl bg-superficie p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Indicador B · a pedido</p>
              <p className="mt-1 font-bold text-foreground">Cómo está la obra</p>
              <p className="mt-1 text-sm text-tinta-2">Presencial, por un profesional colegiado. Su informe se muestra aparte y nunca cambia el color del indicador A.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Transparencia de fuentes */}
      <section id="fuentes" aria-labelledby="titulo-fuentes" className="scroll-mt-32 border-t border-border bg-card py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 id="titulo-fuentes" className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              Transparencia de fuentes de información
            </h2>
            <p className="mt-3 text-lg text-tinta-2">Qué consultamos gratis y qué aporta el propietario o tiene costo.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-sem-verde/40 bg-sem-verde-suave/60 p-7">
              <h3 className="flex items-center gap-2 text-lg font-bold text-sem-verde-tinta">
                <CheckCircle2 className="size-5" aria-hidden="true" /> Fuentes gratuitas
              </h3>
              <ul className="mt-5 space-y-4">
                {FUENTES_GRATUITAS.map(({ Icono, nombre, uso }) => (
                  <li key={nombre} className="flex gap-3 rounded-2xl bg-card p-4">
                    <Icono className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                    <div><p className="font-bold text-foreground">{nombre}</p><p className="text-sm text-tinta-2">{uso}</p></div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-arena/40 bg-arena-suave/70 p-7">
              <h3 className="flex items-center gap-2 text-lg font-bold text-arena-tinta">
                <HandCoins className="size-5" aria-hidden="true" /> Aportadas por el propietario o de pago
              </h3>
              <ul className="mt-5 space-y-4">
                {FUENTES_APORTADAS.map(({ Icono, nombre, uso }) => (
                  <li key={nombre} className="flex gap-3 rounded-2xl bg-card p-4">
                    <Icono className="mt-0.5 size-5 shrink-0 text-arena-tinta" aria-hidden="true" />
                    <div><p className="font-bold text-foreground">{nombre}</p><p className="text-sm text-tinta-2">{uso}</p></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-6 flex gap-4 rounded-3xl border border-border bg-superficie p-6">
            <Ban className="mt-0.5 size-6 shrink-0 text-sem-rojo-tinta" aria-hidden="true" />
            <div>
              <p className="font-bold text-foreground">Sin scraping ni APIs inexistentes</p>
              <p className="mt-1 text-sm leading-relaxed text-tinta-2">
                No copiamos anuncios de otros portales, porque incumple sus condiciones de uso, y no nos conectamos en línea
                a SUNARP, porque no ofrece una API pública de partidas. Cada expediente lo carga a mano un revisor de la
                inmobiliaria, a partir de documentos que verifica.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Llamada final */}
      <section className="bg-primary-strong py-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-white md:text-4xl">Empieza por la cartera</h2>
          <p className="max-w-2xl text-lg text-white/80">Filtra por tipo de inmueble, por el color documental o por el estado de la inspección.</p>
          <Button size="lg" asChild className="h-14 rounded-2xl bg-card px-8 text-base text-primary-strong hover:bg-secondary">
            <Link to="/casos">Explorar Cartera de Inmuebles <ArrowRight className="size-5" aria-hidden="true" /></Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
