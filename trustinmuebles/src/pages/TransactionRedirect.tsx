import { Link, Navigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/useApi";
import type { TransaccionResumen } from "@/lib/types";

/** /transaction → lleva al trámite más reciente del usuario. */
export default function TransactionRedirect() {
  const { data, loading, error } = useApi<TransaccionResumen[]>("/transacciones/mias");
  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground font-semibold">Cargando tus trámites…</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-danger font-semibold">{error.message}</div>;
  if (data && data.length > 0) {
    const activo = data.find((t) => t.etapa !== "FINALIZADA") ?? data[0];
    return <Navigate to={`/transaction/${activo.id}`} replace />;
  }
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24 text-center px-4">
      <h2 className="text-2xl font-bold text-foreground">Aún no tienes trámites</h2>
      <p className="text-muted-foreground">Busca una propiedad auditada y pulsa “Separar Propiedad Ahora”.</p>
      <Button asChild><Link to="/search">Buscar propiedades</Link></Button>
    </div>
  );
}
