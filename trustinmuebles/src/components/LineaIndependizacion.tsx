import { SplitSquareHorizontal } from "lucide-react";
import type { Predio } from "@/lib/types";

/**
 * v1.0 (etapa 2): independización del lote con su línea de explicación (también en una vivienda: se construye sobre un lote
 * que tuvo o no su propia partida). Es un dato informativo; no cambia el indicador A.
 */
export function LineaIndependizacion({ predio, oscuro = false }: { predio: Predio; oscuro?: boolean }) {
  if (!predio.independizacion) return null;
  return (
    <div className={`flex items-start gap-2 text-sm ${oscuro ? "text-gray-200" : "text-tinta-2"}`} data-independizacion={predio.independizacion}>
      <SplitSquareHorizontal className={`mt-0.5 size-4 shrink-0 ${oscuro ? "text-emerald-300" : "text-primary"}`} aria-hidden="true" />
      <p>
        <span className={`font-bold ${oscuro ? "text-white" : "text-foreground"}`}>Independización: {predio.independizacionEtiqueta}.</span>{" "}
        {predio.independizacionExplicacion}
      </p>
    </div>
  );
}
