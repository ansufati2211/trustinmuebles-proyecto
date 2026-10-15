import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Bed, Bath, Square, ShieldCheck, AlertTriangle, ShieldAlert, ChevronDown, Search as SearchIcon, X, Home } from "lucide-react";
import { api, assetUrl } from "@/lib/api";
import { tono, etiquetaEstructura } from "@/lib/semaforo";
import type { Tarjeta } from "@/lib/types";

interface Property { id: number; title: string; location: string; price: number; beds: number; baths: number; area: number; legal: string; struct: string; img: string }

const aPropiedad = (t: Tarjeta): Property => ({ ...t, legal: tono(t.legal), struct: tono(t.struct), img: assetUrl(t.img) });

export default function Search() {
  // Estados de filtros
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [rooms, setRooms] = useState<string>("Cualquiera");
  const [onlyGreen, setOnlyGreen] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState("Recomendados");
  
  // Estado UI
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Propiedades auditadas desde el backend
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    api<Tarjeta[]>("/inmuebles")
      .then((d) => setProperties(d.map(aPropiedad)))
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // UX: Calcular precios mínimos y máximos dinámicamente para los placeholders
  const minAvailablePrice = properties.length ? Math.min(...properties.map(p => p.price)) : 0;
  const maxAvailablePrice = properties.length ? Math.max(...properties.map(p => p.price)) : 0;

  const handleClearFilters = () => {
    setPriceMin("");
    setPriceMax("");
    setRooms("Cualquiera");
    setOnlyGreen(false);
    setSortBy("Recomendados");
  };

  // Filtrado instantáneo
  const filteredProperties = useMemo(() => {
    let result = [...properties];

    if (priceMin) result = result.filter(p => p.price >= parseInt(priceMin));
    if (priceMax) result = result.filter(p => p.price <= parseInt(priceMax));
    
    if (rooms !== "Cualquiera") {
      if (rooms === "4+") result = result.filter(p => p.beds >= 4);
      else result = result.filter(p => p.beds === parseInt(rooms));
    }
    
    if (onlyGreen) {
      result = result.filter(p => p.legal === "success" && p.struct === "success");
    }

    if (sortBy === "Menor Precio") result.sort((a, b) => a.price - b.price);
    else if (sortBy === "Mayor Precio") result.sort((a, b) => b.price - a.price);

    return result;
  }, [properties, priceMin, priceMax, rooms, onlyGreen, sortBy]);

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col">
      
      {/* Header Info */}
      <div className="bg-white border-b border-gray-100 pt-8 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-2">Propiedades Auditadas</h1>
          <p className="text-muted-foreground font-medium text-lg">Encuentra tu próximo hogar con 100% de certeza legal y estructural.</p>
        </div>
      </div>

      {/* Modern Horizontal Filter Bar (Sticky) */}
      <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            
            {/* Price Pill Inteligente */}
            <div className="flex items-center bg-white border border-gray-200 rounded-full px-4 h-12 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <span className="text-muted-foreground font-bold mr-2">USD</span>
              <input 
                type="number" 
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder={`${minAvailablePrice.toLocaleString()}`} 
                className="w-24 bg-transparent outline-none text-sm font-bold text-foreground placeholder:font-medium placeholder:text-gray-400" 
              />
              <div className="w-px h-5 bg-gray-200 mx-2"></div>
              <input 
                type="number" 
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder={`${maxAvailablePrice.toLocaleString()}`} 
                className="w-24 bg-transparent outline-none text-sm font-bold text-foreground placeholder:font-medium placeholder:text-gray-400" 
              />
            </div>

            {/* Rooms Pill */}
            <div className="hidden md:flex items-center bg-white border border-gray-200 rounded-full p-1 h-12 shadow-sm">
              {["Cualquiera", "1", "2", "3", "4+"].map(num => (
                <button 
                  key={num} 
                  onClick={() => setRooms(num)}
                  className={`px-4 h-full rounded-full text-sm font-bold transition-colors ${
                    rooms === num 
                      ? 'bg-primary text-white shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-gray-50'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Security Toggle Pill */}
            <button 
              onClick={() => setOnlyGreen(!onlyGreen)}
              className={`flex items-center gap-2 px-5 h-12 rounded-full border transition-all shadow-sm ${
                onlyGreen 
                  ? 'bg-success/10 border-success/30 text-success' 
                  : 'bg-white border-gray-200 text-muted-foreground hover:bg-gray-50'
              }`}
            >
              <ShieldCheck className={`w-5 h-5 ${onlyGreen ? 'text-success' : 'text-muted-foreground'}`} />
              <span className="text-sm font-bold">{onlyGreen ? '100% Verdes Activo' : 'Solo 100% Verdes'}</span>
            </button>

            {/* Clear Filters */}
            {(priceMin || priceMax || rooms !== "Cualquiera" || onlyGreen) && (
              <button 
                onClick={handleClearFilters}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-muted-foreground hover:bg-gray-200 hover:text-foreground transition-colors"
                title="Limpiar filtros"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Custom Sort Dropdown */}
          <div className="relative w-full lg:w-auto flex justify-end">
            <button 
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center justify-between w-full lg:w-56 h-12 px-5 rounded-full border border-gray-200 bg-white text-sm font-bold text-foreground shadow-sm hover:border-primary/50 transition-colors focus:outline-none"
            >
              <span><span className="text-muted-foreground font-medium mr-1">Orden:</span> {sortBy}</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isSortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsSortOpen(false)}></div>
                <div className="absolute right-0 top-14 w-full lg:w-56 bg-white rounded-2xl border border-gray-100 shadow-xl z-20 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  {["Recomendados", "Menor Precio", "Mayor Precio"].map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setSortBy(option);
                        setIsSortOpen(false);
                      }}
                      className={`w-full text-left px-5 py-3 text-sm font-bold transition-colors ${
                        sortBy === option ? 'bg-primary/5 text-primary' : 'text-foreground hover:bg-gray-50'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      {/* Main Grid Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        <div className="mb-6 flex items-center justify-between">
          <p className="text-muted-foreground font-semibold">Mostrando {filteredProperties.length} resultados</p>
        </div>

        {loading ? (
          <div className="text-center py-24 text-muted-foreground font-semibold">Cargando propiedades auditadas…</div>
        ) : loadError ? (
          <div role="alert" className="text-center py-24 text-danger font-semibold">{loadError}</div>
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm mt-8">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <SearchIcon className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">No se encontraron propiedades</h3>
            <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">Intenta eliminar algunos filtros o ampliar tu rango de búsqueda para ver más resultados.</p>
            <Button size="lg" onClick={handleClearFilters} className="rounded-xl shadow-md">Limpiar todos los filtros</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
            {filteredProperties.map(prop => (
              <Card 
                key={prop.id} 
                className="overflow-hidden border-border/40 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 flex flex-col bg-white rounded-3xl group"
              >
                <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
                  {/* UX FIX: Prevención de imagen rota */}
                  <img 
                    src={prop.img} 
                    alt={prop.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "https://placehold.co/800x600/f1f5f9/94a3b8?text=Propiedad+sin+foto";
                    }}
                  />
                  
                  {/* Badges Ultra Legibles */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2.5 z-10">
                    <div className="inline-flex items-center rounded-full bg-white/95 backdrop-blur-md px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground shadow-lg">
                      {prop.legal === 'success' && <><ShieldCheck className="w-4 h-4 mr-1.5 text-success" /> Legal OK</>}
                      {prop.legal === 'warning' && <><AlertTriangle className="w-4 h-4 mr-1.5 text-warning" /> Legal Ámbar</>}
                      {prop.legal === 'danger' && <><ShieldAlert className="w-4 h-4 mr-1.5 text-danger" /> Legal Rojo</>}
                      {prop.legal === 'pending' && <>Sin auditar</>}
                    </div>
                  </div>

                  <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl font-black text-xl text-foreground shadow-lg z-10">
                    ${prop.price.toLocaleString()}
                  </div>
                </div>
                
                <CardContent className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-xl mb-2 text-foreground line-clamp-1">{prop.title}</h3>
                    <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5 mb-6">
                      <MapPin className="w-4 h-4 text-primary" /> {prop.location}
                    </p>
                    
                    <div className="flex items-center gap-5 text-sm text-foreground font-semibold mb-6">
                      <div className="flex items-center gap-2"><Bed className="w-4 h-4 text-muted-foreground" /> {prop.beds} habs</div>
                      <div className="flex items-center gap-2"><Bath className="w-4 h-4 text-muted-foreground" /> {prop.baths} baños</div>
                      <div className="flex items-center gap-2"><Square className="w-4 h-4 text-muted-foreground" /> {prop.area} m²</div>
                    </div>
                  </div>
                  
                  <div className="pt-5 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <span className="text-muted-foreground">Estructura:</span>
                      <span className={prop.struct === 'success' ? 'text-success' : prop.struct === 'danger' ? 'text-danger' : prop.struct === 'warning' ? 'text-warning' : 'text-muted-foreground'}>
                        {etiquetaEstructura(prop.struct === 'success' ? 'VERDE' : prop.struct === 'warning' ? 'AMARILLO' : prop.struct === 'danger' ? 'ROJO' : null)}
                      </span>
                    </div>
                    <Button variant="outline" className="rounded-xl border-2 hover:bg-primary hover:border-primary hover:text-white transition-all font-bold" asChild>
                      <Link to={`/property/${prop.id}`}>Ver Detalle</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}