import { Link } from "react-router";
import { ArrowUpRight, ArrowUp, MapPin, ShieldCheck, FileCheck2, HardHat } from "lucide-react";
import { LogoMark } from "@/components/layout/Logo";
import { CONOCE_AQUI, VISOR_BGR, abrirExterno } from "@/lib/fuentes";

const enlaceInterno =
  "group inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-emerald-300 transition-colors duration-200";

export function Footer() {
  const irArriba = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="relative bg-[#022C22] text-white overflow-hidden border-t border-emerald-500/15">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-48 bg-emerald-500/15 rounded-full blur-[110px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent"
      />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pb-12 border-b border-white/10">
          <div className="lg:col-span-5 space-y-5">
            <Link
              to="/"
              className="inline-flex items-center gap-3 group"
              aria-label="Trustinmuebles, ir al inicio"
            >
              <LogoMark className="w-11 h-11 transition-transform duration-300 group-hover:scale-105" />
              <div>
                <span className="text-2xl font-extrabold tracking-tight text-white group-hover:text-emerald-300 transition-colors block leading-none">
                  Trustinmuebles
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400/80 mt-1 block">
                  Transparencia Precompra
                </span>
              </div>
            </Link>

            <p className="text-sm text-gray-300/90 leading-relaxed max-w-md">
              Plataforma de orientación documental y técnica para la evaluación de lotes y viviendas urbanas. Partidas registrales, planos 2D y verificación en campo estructurados en un solo expediente.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-gray-300">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Ica, Perú · Zona Registral N.° XI
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-400/20 px-3.5 py-1.5 text-xs font-semibold text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Catálogo v0.4 activo
              </span>
            </div>
          </div>

          <nav aria-label="Plataforma" className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-emerald-300/90">
              Plataforma
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className={enlaceInterno}>
                  Inicio
                </Link>
              </li>
              <li>
                <Link to="/casos" className={enlaceInterno}>
                  Expedientes
                </Link>
              </li>
              <li>
                <Link to="/" state={{ desplazarA: "como-funciona" }} className={enlaceInterno}>
                  Cómo funciona
                </Link>
              </li>
              <li>
                <Link to="/login" className={enlaceInterno}>
                  Iniciar sesión
                </Link>
              </li>
            </ul>
          </nav>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-emerald-300/90">
              Fuentes SUNARP
            </h3>
            <ul className="space-y-3">
              <li>
                <button
                  type="button"
                  onClick={() => abrirExterno(CONOCE_AQUI)}
                  className={`${enlaceInterno} cursor-pointer text-left`}
                >
                  Conoce Aquí
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => abrirExterno(VISOR_BGR)}
                  className={`${enlaceInterno} cursor-pointer text-left`}
                >
                  Visor BGR
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-emerald-300/90 mb-3">
              Sistema de Doble Filtro
            </h3>

            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 flex items-start gap-3 hover:border-emerald-400/30 transition-colors">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300 shrink-0">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Indicador A · Documental</p>
                <p className="text-[11px] text-gray-400 leading-snug mt-0.5">
                  Partida registral por rubros y 4 planos técnicos.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 flex items-start gap-3 hover:border-emerald-400/30 transition-colors">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300 shrink-0">
                <HardHat className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Indicador B · En Campo</p>
                <p className="text-[11px] text-gray-400 leading-snug mt-0.5">
                  Inspección física independiente por Ing. / Arq. colegiado.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}