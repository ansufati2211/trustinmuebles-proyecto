import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EstadoBadge } from "@/components/EstadoBadge";
import { Clock, FolderOpen } from "lucide-react";
import { ESTADOS } from "@/lib/semaforo";
import { useApi } from "@/lib/useApi";
import type { ResumenCaso } from "@/lib/types";

export default function Casos() {
  const { data: casos, loading, error } = useApi<ResumenCaso[]>("/casos");

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col">

      <div className="bg-white border-b border-gray-100 pt-8 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-2">Casos de práctica</h1>
          <p className="text-muted-foreground font-medium text-lg">
            Expedientes sintéticos para consultar. Abre uno para ver sus datos, su estado y lo que falta.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {loading ? (
          <div className="text-center py-24 text-muted-foreground font-semibold">Cargando casos…</div>
        ) : error ? (
          <div role="alert" className="text-center py-24 text-[#B91C1C] font-semibold">{error.message}</div>
        ) : !casos || casos.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <FolderOpen className="w-10 h-10 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No hay casos cargados</h2>
            <p className="text-muted-foreground">El equipo debe cargar el contenido antes de usar el MVP.</p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-muted-foreground font-semibold">{casos.length} casos disponibles</p>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
              {casos.map((c) => (
                <li key={c.codigo}>
                  <Card className="overflow-hidden border-border/40 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 flex flex-col h-full bg-white rounded-3xl">
                    <div className={`h-3 ${c.estado ? ESTADOS[c.estado].banda : "bg-gray-300"}`} aria-hidden="true"></div>
                    <CardContent className="p-6 flex-1 flex flex-col justify-between pt-6">
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h2 className="font-bold text-2xl text-foreground">{c.codigo}</h2>
                          <EstadoBadge estado={c.estado} />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium mb-4 leading-relaxed">{c.contexto}</p>
                        {c.etiqueta && <p className="text-sm font-semibold text-foreground mb-6">{c.etiqueta}</p>}
                      </div>

                      <div className="pt-5 border-t border-gray-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                          <Clock className="w-4 h-4" aria-hidden="true" />
                          {c.pendientes === 0 ? "Sin pendientes" : `${c.pendientes} pendiente${c.pendientes === 1 ? "" : "s"}`}
                        </div>
                        <Button variant="outline" className="rounded-xl border-2 hover:bg-primary hover:border-primary hover:text-white transition-all font-bold" asChild>
                          <Link to={`/casos/${c.codigo}`} aria-label={`Abrir expediente ${c.codigo}`}>Abrir expediente</Link>
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
