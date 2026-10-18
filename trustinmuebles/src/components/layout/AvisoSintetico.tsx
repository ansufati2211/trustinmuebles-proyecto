import { Info } from "lucide-react";

/** Aviso fijo en todas las pantallas (PA3, RN-05): los casos son sintéticos y la salida es solo informativa. */
export function AvisoSintetico() {
  return (
    <div role="note" className="bg-foreground text-white">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2 flex items-start sm:items-center gap-2 text-xs sm:text-sm font-medium">
        <Info className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0 text-primary" aria-hidden="true" />
        <p>
          <strong className="font-bold">Entorno de demostración.</strong> Hay partidas ficticias y partidas transcritas de SUNARP sin nombres de personas. La información es referencial: no certifica saneamiento ni recomienda comprar.
        </p>
      </div>
    </div>
  );
}
