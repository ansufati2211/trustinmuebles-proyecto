import { Link } from "react-router";
import { Shield, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-foreground text-white border-t border-border/10 pt-16 pb-8">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* Brand & Trust */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              <span className="text-2xl font-bold tracking-tight text-white">
                Trustinmuebles
              </span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              La primera plataforma inmobiliaria que integra auditoría legal, inspección estructural y trazabilidad en cada transacción. Compra con certeza.
            </p>
            <div className="flex gap-4 pt-2">
              {/* Redes Sociales con SVG Nativos para evitar problemas de dependencias */}
              <a href="#" className="text-gray-400 hover:text-primary transition-colors" aria-label="Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-primary transition-colors" aria-label="Twitter">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-primary transition-colors" aria-label="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-primary transition-colors" aria-label="LinkedIn">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-white">Explorar</h3>
            <ul className="space-y-3">
              <li><Link to="/search" className="text-sm text-gray-400 hover:text-white transition-colors">Buscar Propiedades</Link></li>
              <li><Link to="#" className="text-sm text-gray-400 hover:text-white transition-colors">Propiedades Auditadas (Verde)</Link></li>
              <li><Link to="#" className="text-sm text-gray-400 hover:text-white transition-colors">Mapa de Proyectos</Link></li>
              <li><Link to="#" className="text-sm text-gray-400 hover:text-white transition-colors">Vender mi Propiedad</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-white">Nuestros Servicios</h3>
            <ul className="space-y-3">
              <li><Link to="#" className="text-sm text-gray-400 hover:text-white transition-colors">Auditoría Legal Capster</Link></li>
              <li><Link to="#" className="text-sm text-gray-400 hover:text-white transition-colors">Inspección Estructural 2D</Link></li>
              <li><Link to="#" className="text-sm text-gray-400 hover:text-white transition-colors">Gestión de Trámites</Link></li>
              <li><Link to="/post-sale" className="text-sm text-gray-400 hover:text-white transition-colors">Portal de Postventa</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-white">Contacto</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-gray-400">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <span>Av. Javier Prado Este 456, San Isidro, Lima, Perú</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <Phone className="h-5 w-5 text-primary shrink-0" />
                <span>+51 987 654 321</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <span>Tru@trustinmuebles.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Trustinmuebles. Todos los derechos reservados.
          </p>
          <div className="flex gap-6">
            <Link to="#" className="text-sm text-gray-500 hover:text-white transition-colors">Términos y Condiciones</Link>
            <Link to="#" className="text-sm text-gray-500 hover:text-white transition-colors">Políticas de Privacidad</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}