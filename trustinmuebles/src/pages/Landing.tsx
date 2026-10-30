import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Ban, BookOpen, Building, CheckCircle2, ChevronRight,
  ClipboardCheck, Eye, FolderOpen, HardHat, Layers, Lock, Plus, Ruler,
} from "lucide-react";
import { ESTADOS, PROCEDIMIENTO_INSPECCION } from "@/lib/semaforo";
import type { EstadoSemaforo } from "@/lib/types";

const retraso = (ms: number): CSSProperties => ({ "--d": `${ms}ms` } as CSSProperties);

function useInView<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [visto, setVisto] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visto) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisto(true);
      return;
    }
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisto(true);
          observador.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, [visto]);

  return [ref, visto] as const;
}

function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const [ref, visto] = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal ${visto ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: visto ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

const spot = (e: MouseEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
};

const SOMBRA_HOVER = "hover:shadow-[0_20px_50px_-12px_rgba(5,150,105,0.18)]";

const LIMITES = [
  "No certifica saneamiento",
  "No recomienda comprar",
  "No consulta fuentes oficiales en tiempo real",
  "No reemplaza asesoría legal especializada",
];

const MODELO = [
  { Icono: Building, titulo: "Cartera propia", texto: "Una sola inmobiliaria en Ica documenta sus propios lotes y viviendas. No es un portal masivo." },
  { Icono: ClipboardCheck, titulo: "Carga manual controlada", texto: "Cada expediente lo ingresa y revisa una persona del equipo antes de publicarse." },
  { Icono: Lock, titulo: "Sin datos personales", texto: "Se dejan fuera DNI, estado civil y domicilio de las personas naturales." },
  { Icono: Ban, titulo: "Sin scraping", texto: "No se extraen datos de portales ni de consultas oficiales de forma automática." },
];

const FUENTES = [
  { fuente: "Conoce Aquí (SUNARP)", aporta: "Texto de la partida registral: asientos de dominio, cargas y cancelaciones.", acceso: "Gratuita", gratuita: true },
  { fuente: "Visor BGR (SUNARP)", aporta: "Ubicación gráfica del predio en la Base Gráfica Registral.", acceso: "Gratuita", gratuita: true },
  { fuente: "Copia literal certificada", aporta: "La partida completa con valor de publicidad registral.", acceso: "De pago", gratuita: false },
  { fuente: "4 planos técnicos", aporta: "Arquitectura, estructuras, instalaciones eléctricas y sanitarias.", acceso: "Propietario", gratuita: false },
  { fuente: "Inspección presencial", aporta: "Verificación física del inmueble e informe técnico (Indicador B).", acceso: "Con costo", gratuita: false },
];

const CASOS_MUESTRA: {
  codigo: string; titulo: string; distrito: string; tipo: string; estado: EstadoSemaforo; resumen: string;
}[] = [
  {
    codigo: "SIM-11048217",
    titulo: "Mz. F Lote 7 · Hab. Urb. Santa Elvira",
    distrito: "Parcona, Ica",
    tipo: "Vivienda · 160 m²",
    estado: "VERDE",
    resumen: "Hipoteca cancelada en el asiento E00001. Cuatro planos presentados e informe técnico favorable.",
  },
  {
    codigo: "SIM-11052690",
    titulo: "Mz. K Lote 12 · Rincón del Sauce",
    distrito: "La Tinguiña, Ica",
    tipo: "Vivienda · 200 m²",
    estado: "AMARILLO",
    resumen: "Hipoteca vigente en el rubro D y faltan los planos de instalaciones eléctricas y sanitarias.",
  },
  {
    codigo: "SIM-11061555",
    titulo: "Mz. C Lote 3 · Mirador del Sol",
    distrito: "Subtanjalla, Ica",
    tipo: "Lote · 250 m²",
    estado: "GRIS",
    resumen: "Extracto parcial sin rubro C de titularidad. No se puede evaluar la titularidad con lo disponible.",
  },
];

const PASOS = [
  { n: 1, titulo: "Ingresa y elige un caso", texto: "Accede con tu cuenta asignada y filtra por número de partida o distrito en Ica." },
  { n: 2, titulo: "Consulta partida y planos", texto: "Revisa los asientos por rubro, abre las láminas 2D en PDF y toca cualquier término del glosario." },
  { n: 3, titulo: "Contrasta ambos indicadores", texto: "Lee los motivos del semáforo documental, el checklist y solicita o descarga el informe técnico." },
];

const FAQS = [
  { p: "¿Trustinmuebles es una entidad del gobierno?", r: "No. Es una plataforma tecnológica privada (PropTech) desarrollada como un MVP académico para transparentar los documentos de una cartera inmobiliaria en Ica." },
  { p: "¿El semáforo verde garantiza que la compra es segura?", r: "No. El semáforo verde indica únicamente que no se detectaron alertas en los campos evaluados del expediente. Nunca certifica saneamiento ni reemplaza a un abogado." },
  { p: "¿Qué pasa cuando hago clic en «Expedientes»?", r: "El sistema te pedirá iniciar sesión con una cuenta autorizada (por ejemplo comprador-01, revisor-01 o especialista-01) para acceder a los 10 expedientes del catálogo." },
  { p: "¿Qué evalúa la inspección presencial (Indicador B)?", r: "Un ingeniero civil o arquitecto colegiado verifica en campo las 4 especialidades y emite un informe técnico independiente que no altera el color del semáforo documental." },
];

function Acordeon({ id, pregunta, respuesta }: { id: string; pregunta: string; respuesta: string }) {
  const [abierto, setAbierto] = useState(false);
  const idPanel = `faq-panel-${id}`;
  const idBoton = `faq-boton-${id}`;

  return (
    <div
      className={`rounded-2xl bg-white border transition-all duration-500 ease-expo ${
        abierto
          ? "border-primary/40 shadow-[0_16px_40px_-14px_rgba(5,150,105,0.22)]"
          : "border-gray-200 hover:border-primary/30"
      }`}
    >
      <h3>
        <button
          id={idBoton}
          type="button"
          aria-expanded={abierto}
          aria-controls={idPanel}
          onClick={() => setAbierto((v) => !v)}
          className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-2xl px-6 py-5 text-left text-base font-bold text-foreground sm:text-lg"
        >
          {pregunta}
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
              abierto ? "bg-primary text-white" : "bg-secondary text-primary"
            }`}
          >
            <Plus
              className={`h-4 w-4 transition-transform duration-500 ease-expo ${abierto ? "rotate-45" : "rotate-0"}`}
            />
          </span>
        </button>
      </h3>

      <div
        id={idPanel}
        role="region"
        aria-labelledby={idBoton}
        aria-hidden={!abierto}
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-expo ${
          abierto ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-6 leading-relaxed text-muted-foreground">{respuesta}</p>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const location = useLocation();

  useEffect(() => {
    const destino = (location.state as { desplazarA?: string } | null)?.desplazarA;
    if (!destino) return;
    const id = window.setTimeout(() => {
      document.getElementById(destino)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => window.clearTimeout(id);
  }, [location]);

  return (
    <div className="flex-1 flex flex-col w-full bg-background overflow-x-clip">
      {/* 1. HERO · entrada escalonada, imagen en el primer pantallazo */}
      <section className="relative pt-28 pb-16 lg:pt-32 lg:pb-24">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-24 right-[-10%] w-[60vw] h-[40vw] max-w-[820px] max-h-[540px] rounded-full bg-gradient-to-tr from-primary/20 via-emerald-300/15 to-transparent blur-[110px] animate-glow" />
        </div>

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-[1fr_1.05fr] gap-14 lg:gap-12 items-center">
            {/* Columna de texto */}
            <div>
              <span
                style={retraso(100)}
                className="anim-enter inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-4 py-1.5 text-sm font-semibold text-primary shadow-sm mb-6"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Transparencia precompra en Ica, Perú
              </span>

              <h1
                style={retraso(200)}
                className="anim-enter text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight text-foreground leading-[1.06] mb-6"
              >
                Entiende cada partida y cada plano antes de decidir.
              </h1>

              <p
                style={retraso(320)}
                className="anim-enter text-lg text-muted-foreground leading-relaxed max-w-xl mb-9"
              >
                Reunimos la partida registral de SUNARP, los 4 planos de especialidad y el informe técnico presencial en un solo expediente, con glosario cerrado y semáforo de alertas.
              </p>

              <div style={retraso(440)} className="anim-enter flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-10">
                <Button
                  size="lg"
                  asChild
                  className="group btn-glint rounded-full h-14 px-8 text-base shadow-xl shadow-primary/25 transition-all duration-300 ease-expo hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-primary/35 active:scale-[0.98]"
                >
                  <Link to="/casos">
                    Explorar los 10 expedientes
                    <ArrowRight className="ml-2 w-5 h-5 transition-transform duration-300 ease-expo group-hover:translate-x-1.5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="rounded-full h-14 px-8 text-base bg-white border-gray-200 transition-all duration-300 ease-expo hover:bg-gray-50 hover:border-primary/40 active:scale-[0.98]"
                >
                  <Link to="/" state={{ desplazarA: "como-funciona" }}>Ver cómo funciona</Link>
                </Button>
              </div>

              <dl style={retraso(560)} className="anim-enter grid grid-cols-3 gap-4 max-w-md border-t border-gray-200 pt-6">
                {[
                  { n: "10", t: "expedientes en el catálogo" },
                  { n: "4", t: "planos por vivienda" },
                  { n: "6", t: "pasos de inspección" },
                ].map((d) => (
                  <div key={d.t}>
                    <dt className="text-3xl font-black text-foreground">{d.n}</dt>
                    <dd className="text-sm text-muted-foreground leading-snug mt-0.5">{d.t}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Columna visual: imagen + widget (único elemento 3D del hero) */}
            <div style={retraso(300)} className="anim-enter relative perspective-1000">
              <div className="hidden md:flex items-center gap-3 absolute -left-8 top-8 z-20 bg-white p-3.5 pr-5 rounded-2xl shadow-xl shadow-gray-900/10 border border-gray-100 animate-float">
                <span className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center text-[#15803D] shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Indicador A · automático</p>
                  <p className="text-sm font-bold text-foreground">Partida y 4 planos revisados</p>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-3 absolute -right-4 -bottom-6 z-20 bg-foreground text-white p-3.5 pr-5 rounded-2xl shadow-xl shadow-gray-900/25 border border-white/10 animate-float-reverse">
                <span className="w-10 h-10 rounded-xl bg-primary/30 flex items-center justify-center text-emerald-300 shrink-0">
                  <HardHat className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-emerald-300">Indicador B · presencial</p>
                  <p className="text-sm font-bold">Ingeniero o arquitecto colegiado</p>
                </div>
              </div>

              <div className="tilt-3d relative rounded-[2rem] overflow-hidden border-4 border-white shadow-[0_35px_80px_-20px_rgba(2,44,34,0.35)] bg-foreground">
                <img
                  src="/img/vivienda-moderna-piscina.jpg"
                  alt="Vivienda urbana moderna en evaluación documental y técnica"
                  className="w-full h-[400px] sm:h-[460px] lg:h-[560px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/50 to-transparent" />

                <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6">
                  <div className="bg-black/50 backdrop-blur-xl border border-white/15 rounded-2xl p-4 sm:p-5 text-white">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="text-sm font-semibold text-emerald-300">Expediente SIM-11052690</span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/25 border border-warning/50 px-3 py-0.5 text-xs font-bold text-amber-200">
                        <ESTADOS.AMARILLO.Icono className="w-3.5 h-3.5" /> Semáforo amarillo
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-extrabold leading-snug">
                      Mz. K Lote 12 · Rincón del Sauce, La Tinguiña
                    </h2>
                    <p className="text-sm text-gray-200 mt-1">
                      200 m² · Hipoteca vigente en el rubro D · Faltan 2 planos de instalaciones.
                    </p>
                    <Link
                      to="/casos/SIM-11052690"
                      className="group btn-glint mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition-all duration-300 ease-expo hover:bg-emerald-600 active:scale-[0.97]"
                    >
                      Ver este expediente
                      <Eye className="w-4 h-4 transition-transform duration-300 ease-expo group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LÍMITES DEL SERVICIO */}
      <section className="bg-foreground text-white" aria-labelledby="limites-titulo">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
          <div className="grid lg:grid-cols-[auto_1fr] gap-6 lg:gap-14 items-center">
            <Reveal>
              <h2 id="limites-titulo" className="text-xl font-bold tracking-tight">
                Lo que Trustinmuebles no hace
              </h2>
            </Reveal>
            <ul className="grid sm:grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-3">
              {LIMITES.map((l, i) => (
                <li key={l}>
                  <Reveal delay={i * 90}>
                    <div className="flex items-start gap-3 text-sm font-medium text-gray-300">
                      <Ban className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      {l}
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 3. MODELO DE UNA SOLA INMOBILIARIA (bento) */}
      <section className="py-24 bg-white">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-16 items-start">
            <Reveal className="lg:sticky lg:top-32">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4">
                Una sola inmobiliaria en Ica, con su cartera a la vista
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Trustinmuebles es el sistema de una inmobiliaria que documenta sus propios lotes y viviendas. Lo que ves es lo que el equipo cargó y revisó, no una búsqueda masiva en internet.
              </p>
            </Reveal>

            <div className="grid sm:grid-cols-2 gap-5">
              {MODELO.map((m, i) => (
                <Reveal key={m.titulo} delay={i * 100} className="h-full">
                  <div
                    onMouseMove={spot}
                    className={`spotlight group relative h-full overflow-hidden rounded-3xl border border-gray-200 bg-gray-50/60 p-7 transition-all duration-500 ease-expo hover:-translate-y-1 hover:border-primary/40 hover:bg-white ${SOMBRA_HOVER}`}
                  >
                    <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary transition-transform duration-500 ease-expo group-hover:scale-110 group-hover:-rotate-3">
                      <m.Icono className="w-6 h-6" />
                    </span>
                    <h3 className="text-lg font-bold text-foreground mb-2">{m.titulo}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{m.texto}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. DOBLE INDICADOR */}
      <section id="servicios" className="py-24 bg-gray-50 border-y border-gray-100 scroll-mt-28">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
              Dos servicios, dos indicadores independientes
            </h2>
            <p className="text-lg text-muted-foreground">
              El informe físico del especialista nunca altera el color del semáforo documental (RN-10). Cada evaluación responde a su propia naturaleza.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {/* Indicador A */}
            <Reveal className="h-full">
              <div className="h-full rounded-[2rem] bg-white border border-gray-200 p-8 lg:p-10 shadow-sm transition-all duration-500 ease-expo hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_20px_50px_-12px_rgba(5,150,105,0.18)]">
                <Badge className="bg-primary text-white mb-5 px-3 py-1 text-xs">Indicador A · automático · incluido</Badge>
                <h3 className="text-2xl lg:text-3xl font-extrabold tracking-tight mb-3">Pre-evaluación documental</h3>
                <p className="text-muted-foreground mb-7 leading-relaxed">
                  El motor clasificador aplica reglas explícitas (v0.4) a la partida registral y a la presencia de los 4 planos de la vivienda.
                </p>
                <ul className="space-y-3">
                  {(
                    [
                      ["ROJO", "Embargo, demanda, medida cautelar o bloqueo vigente."],
                      ["AMARILLO", "Hipoteca, servidumbre, discrepancia de área o falta de plano II.EE. / II.SS."],
                      ["VERDE", "Datos completos sin alertas detectadas en los campos evaluados."],
                      ["GRIS", "Información insuficiente o sin planos base."],
                    ] as [EstadoSemaforo, string][]
                  ).map(([clave, texto]) => {
                    const e = ESTADOS[clave];
                    return (
                      <li key={clave} className={`flex items-start gap-3 rounded-2xl border p-3.5 text-sm transition-transform duration-300 ease-expo hover:translate-x-1 ${e.fondo} ${e.borde}`}>
                        <e.Icono className={`w-5 h-5 shrink-0 mt-0.5 ${e.texto}`} />
                        <span className="text-foreground">
                          <strong className={e.texto}>{e.nombre}:</strong> {texto}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Reveal>

            {/* Indicador B */}
            <Reveal delay={120} className="h-full">
              <div className="h-full rounded-[2rem] bg-foreground p-8 lg:p-10 text-white shadow-xl shadow-foreground/20 transition-all duration-500 ease-expo hover:-translate-y-1 hover:shadow-2xl hover:shadow-foreground/30">
                <Badge className="bg-white/15 text-emerald-300 mb-5 px-3 py-1 text-xs border-0">Indicador B · presencial · a pedido</Badge>
                <h3 className="text-2xl lg:text-3xl font-extrabold tracking-tight mb-3">Evaluación técnica en campo</h3>
                <p className="text-gray-300 mb-7 leading-relaxed">
                  Un ingeniero civil (CIP) o arquitecto (CAP) visita el predio y sigue un protocolo estandarizado de 6 pasos.
                </p>
                <ol className="space-y-3.5 text-sm text-gray-200">
                  {PROCEDIMIENTO_INSPECCION.map((p, idx) => (
                    <li key={p.titulo} className="flex gap-3 items-start">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/30 text-xs font-bold text-emerald-300">
                        {idx + 1}
                      </span>
                      <span>
                        <strong className="text-white">{p.titulo}.</strong> {p.texto}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 5. MUESTRA DE EXPEDIENTES */}
      <section className="py-24 bg-white">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
                ¿Qué hay dentro de Expedientes?
              </h2>
              <p className="text-muted-foreground text-lg mt-3">
                El catálogo reúne 10 lotes y viviendas de distintos distritos de Ica. Estos 3 ejemplos muestran cómo se ve cada estado. Al abrirlos pasarás por el inicio de sesión seguro.
              </p>
            </div>
            <Button
              variant="outline"
              asChild
              className="group rounded-full h-12 px-6 font-bold shrink-0 transition-all duration-300 ease-expo hover:bg-gray-50 hover:border-primary/40 active:scale-[0.98]"
            >
              <Link to="/casos">
                Abrir los 10 expedientes
                <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-300 ease-expo group-hover:translate-x-1.5" />
              </Link>
            </Button>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {CASOS_MUESTRA.map((c, i) => {
              const e = ESTADOS[c.estado];
              return (
                <Reveal key={c.codigo} delay={i * 120} className="h-full">
                  <Link
                    to={`/casos/${c.codigo}`}
                    onMouseMove={spot}
                    className={`spotlight group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-gray-200 bg-white transition-all duration-500 ease-expo hover:-translate-y-1.5 hover:border-primary/40 ${SOMBRA_HOVER}`}
                  >
                    <div>
                      <div className={`h-2 ${e.banda}`} />
                      <div className="p-7">
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <span className="text-xs font-mono font-bold text-muted-foreground bg-gray-100 px-3 py-1 rounded-full">
                            {c.codigo}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${e.fondo} ${e.borde} ${e.texto}`}>
                            <e.Icono className="w-3.5 h-3.5" /> {e.nombre}
                          </span>
                        </div>
                        <h3 className="text-xl font-extrabold text-foreground mb-1">{c.titulo}</h3>
                        <p className="text-sm font-semibold text-primary mb-4">{c.distrito} · {c.tipo}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{c.resumen}</p>
                      </div>
                    </div>
                    <div className="px-7 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Incluye PDF y glosario</span>
                      <span className="text-sm font-bold text-primary inline-flex items-center gap-1">
                        Abrir expediente
                        <ChevronRight className="w-4 h-4 transition-transform duration-300 ease-expo group-hover:translate-x-1.5" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. CÓMO FUNCIONA */}
      <section id="como-funciona" className="py-24 bg-gray-50 border-y border-gray-100 scroll-mt-28">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
              ¿Cómo funciona el recorrido?
            </h2>
            <p className="text-lg text-muted-foreground">
              Tres pasos para revisar cualquier expediente de la plataforma.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-10 relative">
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gray-300" aria-hidden="true" />
            {PASOS.map((p, i) => (
              <Reveal key={p.n} delay={i * 140}>
                <div className="relative flex flex-col items-center text-center group">
                  <div className="w-24 h-24 bg-white border border-gray-200 rounded-3xl shadow-sm flex items-center justify-center mb-6 transition-all duration-500 ease-expo group-hover:-translate-y-1.5 group-hover:border-primary/40 group-hover:bg-primary group-hover:shadow-[0_20px_50px_-12px_rgba(5,150,105,0.3)]">
                    <span className="text-3xl font-black text-primary transition-colors duration-300 group-hover:text-white">{p.n}</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{p.titulo}</h3>
                  <p className="text-muted-foreground leading-relaxed max-w-xs">{p.texto}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FUENTES DOCUMENTALES */}
      <section className="py-24 bg-white">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-14 items-start">
            <Reveal>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
                Origen transparente de cada documento
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                Distinguimos qué proviene de una consulta pública gratuita y qué aporta el propietario o el especialista.
              </p>
              <ul className="space-y-3 text-sm text-foreground">
                <li className="flex items-center gap-3"><FolderOpen className="w-5 h-5 text-primary" /> Partida por rubros C, D, E y F</li>
                <li className="flex items-center gap-3"><Ruler className="w-5 h-5 text-primary" /> 4 planos 2D contrastados con el área inscrita</li>
                <li className="flex items-center gap-3"><BookOpen className="w-5 h-5 text-primary" /> 48 términos del glosario en lenguaje claro</li>
              </ul>
            </Reveal>

            <Reveal delay={120}>
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden transition-shadow duration-500 ease-expo hover:shadow-[0_20px_50px_-12px_rgba(5,150,105,0.18)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th scope="col" className="px-6 py-4 font-bold text-foreground">Fuente</th>
                        <th scope="col" className="px-6 py-4 font-bold text-foreground">Qué aporta</th>
                        <th scope="col" className="px-6 py-4 font-bold text-foreground">Acceso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {FUENTES.map((f) => (
                        <tr key={f.fuente} className="group transition-colors duration-300 hover:bg-secondary/50">
                          <td className="px-6 py-5 font-bold text-foreground">
                            <div className="flex items-center gap-2.5 whitespace-nowrap">
                              <Layers className="w-4 h-4 text-primary shrink-0 transition-transform duration-300 ease-expo group-hover:scale-125" /> {f.fuente}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-muted-foreground min-w-[240px]">{f.aporta}</td>
                          <td className="px-6 py-5">
                            <Badge
                              variant="outline"
                              className={f.gratuita ? "bg-success/10 text-[#15803D] border-success/30 font-bold" : "bg-gray-100 text-gray-700 border-gray-200 font-bold"}
                            >
                              {f.acceso}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 8. PREGUNTAS FRECUENTES */}
      <section className="py-24 bg-gray-50 border-t border-gray-100">
        <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">Preguntas frecuentes</h2>
            <p className="text-muted-foreground text-lg">Respuestas directas sobre el alcance de Trustinmuebles.</p>
          </Reveal>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <Reveal key={faq.p} delay={i * 80}>
                <Acordeon id={String(i)} pregunta={faq.p} respuesta={faq.r} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 9. CTA FINAL */}
      <section className="py-24 bg-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(ellipse_at_center,var(--color-primary),transparent_65%)]" aria-hidden="true" />
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative text-center">
          <Reveal>
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
              Empieza por revisar la partida.
            </h2>
            <p className="text-gray-300 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
              Ingresa con cualquiera de las 3 cuentas de prueba y explora las partidas, los planos 2D y los informes técnicos.
            </p>
            <Button
              size="lg"
              asChild
              className="group btn-glint rounded-full h-14 px-10 text-lg bg-primary text-white shadow-2xl shadow-primary/40 transition-all duration-300 ease-expo hover:-translate-y-0.5 hover:bg-emerald-600 active:scale-[0.98]"
            >
              <Link to="/casos">
                Ir a los expedientes
                <ChevronRight className="ml-2 w-5 h-5 transition-transform duration-300 ease-expo group-hover:translate-x-1.5" />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>
    </div>
  );
}