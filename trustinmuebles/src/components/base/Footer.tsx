import { Link } from "react-router";
import { Scale, Shield } from "lucide-react";
import { version } from "../../../package.json";

/** Pie comercial. Los límites legales quedan siempre visibles (I1, PA3) y aclara que el sistema es de uso local (I6). */
export function Footer() {
  return (
    <footer className="mt-auto bg-foreground text-white">
      <div className="mx-auto max-w-7xl px-4 pt-14 pb-8 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-3">
            <Link to="/" className="flex items-center gap-2">
              <Shield className="size-7 text-arena" aria-hidden="true" />
              <span className="text-2xl font-extrabold tracking-tight">Trustinmuebles</span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-white/70">
              Lotes y viviendas de nuestra cartera en Ica, con su partida explicada, sus planos revisados y, si lo pides, una
              inspección presencial.
            </p>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/90">Cartera</h2>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link to="/casos" className="hover:text-white">Ver inmuebles</Link></li>
              <li><Link to="/casos?tipoInmueble=VIVIENDA_URBANA" className="hover:text-white">Viviendas urbanas</Link></li>
              <li><Link to="/casos?tipoInmueble=LOTE_URBANO" className="hover:text-white">Lotes urbanos</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/90">Servicios</h2>
            <ul className="space-y-2 text-sm text-white/70">
              <li>Indicador A · Evaluación documental</li>
              <li>Indicador B · Inspección técnica presencial</li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/90">Fuentes públicas</h2>
            <ul className="space-y-2 text-sm text-white/70">
              <li>Conoce Aquí (SUNARP)</li>
              <li>Visor Catastral BGR (SUNARP)</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm leading-relaxed text-white/85">
          <Scale className="mt-0.5 size-5 shrink-0 text-arena" aria-hidden="true" />
          <p>
            <strong className="text-white">Verde = Sin alertas en los campos evaluados</strong>; no certifica saneamiento ni
            reemplaza asesoría legal; los datos de esta demostración son simulados. No certifica saneamiento ni recomienda
            comprar; tampoco consulta fuentes oficiales en línea ni comprueba la autenticidad de un documento. Los criterios y el glosario
            están en revisión especializada.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/55">
          <p>© {new Date().getFullYear()} Trustinmuebles · Ica, Perú · v{version}</p>
          <p>Uso local: el sistema funciona solo en este equipo y no es un servicio publicado en internet.</p>
        </div>
      </div>
    </footer>
  );
}
