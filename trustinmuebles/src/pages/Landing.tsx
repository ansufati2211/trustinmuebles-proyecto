import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ShieldCheck, 
  Search as SearchIcon, 
  CheckCircle2, 
  FileSignature,
  Building,
  ArrowRight,
  Shield,
  MapPin,
  TrendingUp
} from "lucide-react";

export default function Landing() {
  return (
    <div className="flex-1 flex flex-col w-full">
      
      {/* 1. Hero Section Asimétrico (Espaciado Corregido) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-secondary/40 to-background pt-8 pb-20 lg:pt-16 lg:pb-32">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            {/* Hero Text */}
            <div className="max-w-2xl">
              <Badge variant="outline" className="mb-6 bg-white border-primary/20 text-primary px-4 py-1.5 text-sm shadow-sm">
                <Shield className="w-4 h-4 mr-2" />
                La nueva forma de comprar inmuebles
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
                Compra tu casa con <span className="text-primary">100% de certeza</span> legal y estructural.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                Olvídate de las sorpresas ocultas. Integramos auditoría legal, inspección estructural con planos 2D y trazabilidad comercial en una sola plataforma.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild className="rounded-xl h-14 px-8 text-base shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5">
                  <Link to="/search">
                    Explorar Propiedades <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="rounded-xl h-14 px-8 text-base bg-white transition-transform hover:-translate-y-0.5">
                  Vender con Trustinmuebles
                </Button>
              </div>
              
              <div className="mt-10 flex items-center gap-4 text-sm text-muted-foreground font-medium">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white"></div>
                  <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white"></div>
                  <div className="w-8 h-8 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-xs text-white">+1k</div>
                </div>
                <p>Familias ya compraron seguro este año</p>
              </div>
            </div>

            {/* Hero Visual (Mockup flotante - Badges Corregidos) */}
            <div className="relative mx-auto w-full max-w-lg lg:max-w-none lg:ml-auto mt-4 lg:mt-0">
              <div className="absolute inset-0 bg-primary/5 rounded-[3rem] transform rotate-3 scale-105 -z-10"></div>
              <Card className="rounded-3xl border-border/50 shadow-2xl bg-white overflow-hidden transform transition-transform duration-500 hover:scale-[1.02]">
                <div className="aspect-[4/3] bg-muted relative">
                  <img 
                    src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800" 
                    alt="Casa moderna" 
                    className="w-full h-full object-cover"
                  />
                  {/* Nuevos Badges: Fondo blanco, texto oscuro, ícono de color para legibilidad perfecta */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2.5">
                    <div className="inline-flex items-center rounded-full bg-white/95 backdrop-blur shadow-lg px-4 py-2 text-sm font-bold text-foreground">
                      <CheckCircle2 className="w-4 h-4 mr-2 text-success" /> Legal Aprobado
                    </div>
                    <div className="inline-flex items-center rounded-full bg-white/95 backdrop-blur shadow-lg px-4 py-2 text-sm font-bold text-foreground">
                      <ShieldCheck className="w-4 h-4 mr-2 text-success" /> Estructura OK
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-xl mb-1 text-foreground">Casa en San Isidro</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> Calle Los Pinos 404
                      </p>
                    </div>
                    <span className="font-bold text-2xl text-primary">$420,000</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Building className="w-4 h-4" /> 280 m²
                    </div>
                    <div className="flex items-center gap-1.5 text-success font-bold">
                      <FileSignature className="w-4 h-4" /> Lista para firmar
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Floating elements */}
              <div className="absolute -right-6 top-20 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 animate-bounce" style={{ animationDuration: '3s' }}>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full text-primary">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Plusvalía estimada</p>
                    <p className="text-sm font-bold text-foreground">+8.5% anual</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Trust Band (Social Proof) */}
      <section className="border-y border-gray-100 bg-white py-8">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6">
            Auditorías y transacciones respaldadas por
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <span className="text-xl font-bold font-serif">CAPSTER</span>
            <span className="text-xl font-bold font-mono">SUNARP</span>
            <span className="text-xl font-bold flex items-center gap-1"><Building className="w-5 h-5"/> COLEGIO DE INGENIEROS</span>
            <span className="text-xl font-bold">Notarías Afiliadas</span>
          </div>
        </div>
      </section>

      {/* 3. Propuesta de Valor (Features Grid) */}
      <section className="py-24 bg-gray-50/50">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              ¿Por qué somos diferentes?
            </h2>
            <p className="text-lg text-muted-foreground">
              Hemos digitalizado y asegurado los tres pilares fundamentales de la compra inmobiliaria para que tú solo te preocupes por mudarte.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-gray-100 shadow-sm bg-white hover:shadow-xl hover:border-primary/30 transition-all duration-300 transform hover:-translate-y-1 group">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary transition-colors duration-300">
                  <ShieldCheck className="w-7 h-7 text-primary group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Semáforo Legal</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Conoce el estado exacto (Dominio, Gravámenes, Litigios) al instante. Traducimos el papeleo legal complejo a un sistema visual de colores directo.
                </p>
              </CardContent>
            </Card>

            <Card className="border-gray-100 shadow-sm bg-white hover:shadow-xl hover:border-primary/30 transition-all duration-300 transform hover:-translate-y-1 group">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary transition-colors duration-300">
                  <Building className="w-7 h-7 text-primary group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Inspección Estructural 2D</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Cada propiedad incluye un reporte técnico con planos marcados. Ubica exactamente el estado de tuberías, techos y paredes antes de ofertar.
                </p>
              </CardContent>
            </Card>

            <Card className="border-gray-100 shadow-sm bg-white hover:shadow-xl hover:border-primary/30 transition-all duration-300 transform hover:-translate-y-1 group">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary transition-colors duration-300">
                  <FileSignature className="w-7 h-7 text-primary group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Trazabilidad End-to-End</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Acompañamiento digital total. Desde la oferta y firma de contratos hasta el portal de postventa para gestionar garantías y revalorizar tu hogar.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. Search CTA Inmersivo */}
      <section className="py-24 bg-primary relative overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Encuentra una propiedad verificada hoy
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-10 max-w-2xl mx-auto">
            Todas nuestras propiedades pasan por un riguroso filtro legal y estructural. Busca en las mejores zonas con total tranquilidad.
          </p>
          
          <div className="bg-white p-2 rounded-2xl shadow-2xl flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
            <div className="relative flex-1 flex items-center">
              <SearchIcon className="absolute left-4 w-5 h-5 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Ej. Miraflores, San Isidro, Surco..." 
                className="w-full h-14 pl-12 pr-4 rounded-xl bg-transparent text-foreground placeholder:text-muted-foreground font-medium focus:outline-none"
              />
            </div>
            <Button size="lg" asChild className="rounded-xl h-14 px-8 text-base shrink-0">
              <Link to="/search">Buscar Ahora</Link>
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}