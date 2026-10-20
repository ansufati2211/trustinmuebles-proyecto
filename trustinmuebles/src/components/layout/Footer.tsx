import { Link } from "react-router";
import { LogoMark } from "@/components/layout/Logo";

const enlaceFooter = "text-base font-medium text-gray-400 hover:text-white transition-colors";

export function Footer() {
  return (
    <footer className="bg-foreground text-white pt-20 pb-10">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2 space-y-6">
            <Link to="/" className="flex items-center gap-3 group w-max" aria-label="Trustinmuebles, ir al inicio">
              <LogoMark className="w-11 h-11 transition-transform duration-300 group-hover:scale-105" />
              <span className="text-2xl font-extrabold tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                Trustinmuebles
              </span>
            </Link>
            <p className="text-base text-gray-400 leading-relaxed max-w-sm font-medium">
              Orientación documental para la precompra de lotes y viviendas urbanas en Ica. La partida, sus términos y lo que falta por revisar, en un solo lugar.
            </p>
          </div>

          <nav aria-label="Pie de página">
            <h3 className="font-bold text-base mb-6 text-white">Navegación</h3>
            <ul className="space-y-4">
              <li><Link to="/" className={enlaceFooter}>Inicio</Link></li>
              <li><Link to="/casos" className={enlaceFooter}>Expedientes</Link></li>
              <li>
                <Link to="/" state={{ desplazarA: "como-funciona" }} className={enlaceFooter}>
                  Cómo funciona
                </Link>
              </li>
              <li><Link to="/login" className={enlaceFooter}>Ingresar</Link></li>
            </ul>
          </nav>

          <div>
            <h3 className="font-bold text-base mb-6 text-white">Alcance del servicio</h3>
            <ul className="space-y-3 text-sm font-medium text-gray-400 leading-relaxed list-none">
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">•</span> No certifica saneamiento ni recomienda comprar.</li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">•</span> No consulta fuentes oficiales en vivo.</li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">•</span> Criterios en revisión especializada.</li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">•</span> No reemplaza asesoría legal.</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm font-medium text-gray-500">
            &copy; {new Date().getFullYear()} Trustinmuebles. Todos los derechos reservados.
          </p>
          <p className="text-sm font-medium text-gray-500">Ica, Perú</p>
        </div>
      </div>
    </footer>
  );
}