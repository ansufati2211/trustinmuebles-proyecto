import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EstadoBadge } from "@/components/EstadoBadge";
import { Clock, ExternalLink, FolderOpen, Search } from "lucide-react";
import { ESTADOS } from "@/lib/semaforo";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { abrirExterno, CONOCE_AQUI, copiar, normalizarNumero, pareceNumeroDePartida, VISOR_BGR } from "@/lib/fuentes";
import type { ResumenCaso } from "@/lib/types";

export default function Casos() {
  const { data: casos, loading, error } = useApi<ResumenCaso[]>("/casos");
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [copiado, setCopiado] = useState(false);

  const q = busqueda.trim();
  const qNumero = normalizarNumero(q);
  const visibles = (casos ?? []).filter((c) =>
    !q || normalizarNumero(c.codigo).includes(qNumero) || c.denominacion.toLowerCase().includes(q.toLowerCase()));
  const esNumero = pareceNumeroDePartida(q);

  // Una partida que no está registrada se consulta en Conoce Aquí (gratis, con DNI). El número se copia para pegarlo allá.
  const buscarEnSunarp = async () => {
    setCopiado(await copiar(qNumero));
    abrirExterno(CONOCE_AQUI);
    if (usuario?.rol === "REVISOR") navigate(`/casos/nueva?numero=${encodeURIComponent(qNumero)}`);
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col">

      <div className="bg-white border-b border-gray-100 pt-8 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-2">Expedientes</h1>
          <p className="text-muted-foreground font-medium text-lg">
            Lotes urbanos en evaluación de precompra. Abre uno para ver su partida, su estado y lo que falta.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {loading ? (
          <div className="text-center py-24 text-muted-foreground font-semibold">Cargando expedientes…</div>
        ) : error ? (
          <div role="alert" className="text-center py-24 text-[#B91C1C] font-semibold">{error.message}</div>
        ) : !casos || casos.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <FolderOpen className="w-10 h-10 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Todavía no hay expedientes registrados</h2>
            <p className="text-muted-foreground">Cuando se registre uno, aparecerá en esta lista.</p>
          </div>
        ) : (
          <>
            <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-6 max-w-xl">
              <label htmlFor="buscar-partida" className="block text-sm font-bold text-foreground mb-1.5">Buscar por número de partida</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <input id="buscar-partida" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Por ejemplo 11048217 o P07044600" autoComplete="off" maxLength={40}
                  className="w-full h-12 pl-10 pr-3 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
            </form>
            <p className="mb-6 text-muted-foreground font-semibold" role="status">
              {q ? `${visibles.length} de ${casos.length} expedientes` : `${casos.length} expedientes disponibles`}
            </p>
            {q && visibles.length === 0 && (
              <Card className="rounded-3xl border-gray-100 shadow-sm mb-8 bg-white">
                <CardContent className="p-8">
                  {esNumero ? (
                    <>
                      <h2 className="text-xl font-bold text-foreground mb-2">La partida {qNumero} no está registrada en Trustinmuebles</h2>
                      <p className="text-muted-foreground mb-5 leading-relaxed">
                        Puedes consultarla gratis en Conoce Aquí, de SUNARP (con tu DNI). Trustinmuebles no la trae sola: el
                        sitio oficial pide la identidad de quien consulta.
                        {usuario?.rol === "REVISOR"
                          ? " Después pega el texto aquí para registrarla sin los datos de personas naturales."
                          : " Si la necesitas aquí, pide al revisor que la registre."}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button className="rounded-xl" onClick={buscarEnSunarp}>
                          Buscar en Conoce Aquí <ExternalLink className="w-4 h-4" aria-hidden="true" />
                        </Button>
                        <Button variant="outline" className="rounded-xl" onClick={() => abrirExterno(VISOR_BGR)}>
                          Ver ubicación en el Visor BGR <ExternalLink className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </div>
                      {copiado && <p role="status" className="mt-3 text-sm font-semibold text-foreground">Número copiado: pégalo en Conoce Aquí.</p>}
                    </>
                  ) : (
                    <p className="text-muted-foreground font-semibold">
                      No hay expedientes con ese texto. Escribe el número completo de la partida (ocho dígitos) para buscarla en SUNARP.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
              {visibles.map((c) => (
                <li key={c.codigo}>
                  <Card className="overflow-hidden border-border/40 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 flex flex-col h-full bg-white rounded-3xl">
                    <div className={`h-3 ${c.estado ? ESTADOS[c.estado].banda : "bg-gray-300"}`} aria-hidden="true"></div>
                    <CardContent className="p-6 flex-1 flex flex-col justify-between pt-6">
                      <div>
                        <EstadoBadge estado={c.estado} className="mb-4" />
                        <h2 className="font-bold text-xl text-foreground leading-snug mb-3">{c.denominacion}</h2>
                        <p className="text-sm text-muted-foreground font-medium mb-1">Partida N.° {c.codigo}</p>
                        <p className="text-sm text-muted-foreground font-medium mb-4">{c.contexto}</p>
                        {c.origen === "TRANSCRITA" && (
                          <p className="inline-block mb-4 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
                            Transcrita de SUNARP{c.fechaConsulta ? ` · ${new Date(`${c.fechaConsulta}T00:00:00`).toLocaleDateString("es-PE")}` : ""}
                          </p>
                        )}
                        {c.etiqueta && <p className="text-sm font-semibold text-foreground mb-6">{c.etiqueta}</p>}
                      </div>

                      <div className="pt-5 border-t border-gray-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                          <Clock className="w-4 h-4" aria-hidden="true" />
                          {c.pendientes === 0 ? "Sin pendientes" : `${c.pendientes} pendiente${c.pendientes === 1 ? "" : "s"}`}
                        </div>
                        <Button variant="outline" className="rounded-xl border-2 hover:bg-primary hover:border-primary hover:text-white transition-all font-bold" asChild>
                          <Link to={`/casos/${c.codigo}`} aria-label={`Abrir expediente de la partida ${c.codigo}`}>Abrir expediente</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
