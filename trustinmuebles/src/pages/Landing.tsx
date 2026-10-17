import { useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, ArrowRight, BookOpen, ClipboardList, FileText, Shield, ShieldOff, TrafficCone, Clock,
} from "lucide-react";

const LIMITES = [
  "No certifica saneamiento",
  "No recomienda comprar",
  "No consulta fuentes oficiales",
  "No reemplaza asesoría especializada",
];

export default function Landing() {
  const location = useLocation();

  // Con el enrutador por hash no sirven las anclas normales: el menú envía el destino por estado.
  useEffect(() => {
    const destino = (location.state as { desplazarA?: string } | null)?.desplazarA;
    if (destino) document.getElementById(destino)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location]);

  return (
    <div className="flex-1 flex flex-col w-full">

      {/* 1. Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-secondary/40 to-background pt-8 pb-20 lg:pt-16 lg:pb-32">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

            <div className="max-w-2xl">
              <Badge variant="outline" className="mb-6 bg-white border-primary/20 text-primary px-4 py-1.5 text-sm shadow-sm">
                <Shield className="w-4 h-4 mr-2" aria-hidden="true" />
                Orientación documental para precompra
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
                Entiende un expediente de lote urbano, <span className="text-primary">paso a paso</span>.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                Trustinmuebles reúne la partida del lote, explica sus términos con un glosario cerrado y señala qué
                información está pendiente. Orienta tu lectura; no es un dictamen.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild className="rounded-xl h-14 px-8 text-base shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5">
                  <Link to="/casos">
                    Ver expedientes <ArrowRight className="ml-2 w-5 h-5" aria-hidden="true" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="rounded-xl h-14 px-8 text-base bg-white transition-transform hover:-translate-y-0.5">
                  <Link to="/" state={{ desplazarA: "como-funciona" }}>Cómo funciona</Link>
                </Button>
              </div>
            </div>

            {/* Vista previa (estática) */}
            <div className="relative mx-auto w-full max-w-lg lg:max-w-none lg:ml-auto mt-4 lg:mt-0">
              <div className="absolute inset-0 bg-primary/5 rounded-[3rem] transform rotate-3 scale-105 -z-10"></div>
              <Card className="rounded-3xl border-border/50 shadow-2xl bg-white overflow-hidden">
                <div className="h-3 bg-warning" aria-hidden="true"></div>
                <CardContent className="p-6 pt-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    Vista previa
                  </p>
                  <div className="flex justify-between items-start mb-4 gap-3">
                    <div>
                      <h3 className="font-bold text-xl mb-1 text-foreground">Mz. K Lote 12 · La Tinguiña</h3>
                      <p className="text-sm text-muted-foreground">Lote urbano inscrito en el Registro de Predios.</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center rounded-full border border-warning/40 bg-warning/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#B45309]">
                      <AlertTriangle className="w-4 h-4 mr-1.5" aria-hidden="true" /> Estado: Amarillo
                    </span>
                  </div>
                  <ul className="text-sm text-foreground space-y-2 pt-4 border-t border-gray-100">
                    <li className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" aria-hidden="true" /> Hipoteca vigente en gravámenes y cargas</li>
                    <li className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" aria-hidden="true" /> 1 elemento del checklist pendiente</li>
                  </ul>
                  <p className="mt-5 text-xs text-muted-foreground leading-relaxed">
                    El color resume criterios aplicados a los datos del expediente y siempre viene con sus motivos.
                  </p>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Límites */}
      <section aria-label="Límites del servicio" className="border-y border-gray-100 bg-white py-8">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6">
            Lo que Trustinmuebles no hace
          </p>
          <ul className="flex flex-wrap justify-center items-center gap-x-10 gap-y-3">
            {LIMITES.map((l) => (
              <li key={l} className="flex items-center gap-2 text-base font-bold text-foreground">
                <ShieldOff className="w-5 h-5 text-muted-foreground" aria-hidden="true" /> {l}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. Qué ofrece */}
      <section className="py-24 bg-gray-50/50">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Qué encuentras en cada expediente</h2>
            <p className="text-lg text-muted-foreground">
              Tres apoyos para leer un expediente sin suponer lo que el documento no dice.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { Icono: FileText, titulo: "Expediente estructurado", texto: "Condición representada, titularidad, anotaciones con su estado y la completitud del extracto, en campos ordenados." },
              { Icono: BookOpen, titulo: "Glosario cerrado", texto: "Cada término de la partida se explica con un texto breve que se abre al seleccionarlo. Si un dato no aparece, el expediente lo dice." },
              { Icono: TrafficCone, titulo: "Semáforo informativo y checklist", texto: "Un estado con motivos, alertas conocidas y datos faltantes, más una lista de elementos pendientes, revisados u observados." },
            ].map(({ Icono, titulo, texto }) => (
              <Card key={titulo} className="border-gray-100 shadow-sm bg-white hover:shadow-xl hover:border-primary/30 transition-all duration-300 transform hover:-translate-y-1 group">
                <CardContent className="p-8">
                  <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary transition-colors duration-300">
                    <Icono className="w-7 h-7 text-primary group-hover:text-white transition-colors" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-foreground">{titulo}</h3>
                  <p className="text-muted-foreground leading-relaxed">{texto}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Cómo funciona */}
      <section id="como-funciona" className="py-24 bg-white scroll-mt-32">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Cómo funciona</h2>
            <p className="text-lg text-muted-foreground">El recorrido empieza al elegir un expediente y termina al revisar sus alertas y pendientes.</p>
          </div>
          <ol className="grid md:grid-cols-3 gap-8">
            {[
              { n: 1, titulo: "Elige un expediente", texto: "Ingresa con tu cuenta y abre un expediente de la lista." },
              { n: 2, titulo: "Lee y consulta", texto: "Revisa los datos del expediente y selecciona cualquier término para ver su explicación." },
              { n: 3, titulo: "Revisa el estado", texto: "Mira el estado con sus motivos, las alertas conocidas, lo que falta y el checklist." },
            ].map((p) => (
              <li key={p.n} className="rounded-3xl border border-gray-100 bg-gray-50/60 p-8">
                <span className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-primary text-white font-bold mb-5" aria-hidden="true">{p.n}</span>
                <h3 className="text-lg font-bold text-foreground mb-2">{p.titulo}</h3>
                <p className="text-muted-foreground leading-relaxed">{p.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5. CTA */}
      <section className="py-24 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }}></div>
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <ClipboardList className="w-10 h-10 text-white/80 mx-auto mb-5" aria-hidden="true" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Empieza por la partida</h2>
          <p className="text-primary-foreground/80 text-lg mb-10 max-w-2xl mx-auto">
            Revisa el estado, las alertas y lo que falta antes de decidir.
          </p>
          <Button size="lg" asChild className="rounded-xl h-14 px-8 text-base bg-white text-primary hover:bg-white/90">
            <Link to="/casos">Ver expedientes</Link>
          </Button>
        </div>
      </section>

    </div>
  );
}
