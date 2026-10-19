import { Link } from "react-router";
import { Shield } from "lucide-react";
import { version } from "../../../package.json";

export function Footer() {
  return (
    <footer className="bg-foreground text-white border-t border-border/10 pt-16 pb-8">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">

          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" aria-hidden="true" />
              <span className="text-2xl font-bold tracking-tight text-white">Trustinmuebles</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              Orientación documental para la precompra de lotes urbanos en Ica: la partida, sus términos y lo que falta por revisar.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4 text-white">Navegación</h3>
            <ul className="space-y-3">
              <li><Link to="/" className="text-sm text-gray-400 hover:text-white transition-colors">Inicio</Link></li>
              <li><Link to="/casos" className="text-sm text-gray-400 hover:text-white transition-colors">Expedientes</Link></li>
              <li><Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Ingresar</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4 text-white">Alcance del servicio</h3>
            <ul className="space-y-2 text-sm text-gray-400 leading-relaxed list-disc pl-5">
              <li>No certifica saneamiento ni recomienda comprar.</li>
              <li>No consulta fuentes oficiales ni comprueba autenticidad.</li>
              <li>Los criterios y el glosario están en revisión especializada.</li>
              <li>No reemplaza asesoría legal.</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Trustinmuebles · Ica, Perú · v{version}
          </p>
        </div>
      </div>
    </footer>
  );
}
