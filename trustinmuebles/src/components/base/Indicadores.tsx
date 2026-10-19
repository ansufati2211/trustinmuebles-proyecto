import { AlertTriangle, CircleDashed, CircleHelp, Clock, HardHat, ShieldAlert, ShieldCheck, type LucideIcon } from "lucide-react";
import { Badge, type TonoBadge } from "./Badge";
import { ESTADOS, ETIQUETA_ESTADO_TECNICO, ETIQUETA_RESULTADO } from "@/lib/semaforo";
import type { EstadoSemaforo, EstadoTecnico, ResultadoTecnico } from "@/lib/types";

const TONO_A: Record<EstadoSemaforo, TonoBadge> = { VERDE: "verde", AMARILLO: "amarillo", ROJO: "rojo", GRIS: "gris" };

/**
 * Indicador A: pre-evaluación documental automática (semáforo). Siempre con ícono y nombre del estado. Con
 * {@code conResumen} agrega lo que significa, por ejemplo «Verde · Sin alertas en los campos evaluados».
 */
export function IndicadorA({ estado, tamano = "md", conResumen = false, conPrefijo = true, className }: {
  estado: EstadoSemaforo | null | undefined; tamano?: "sm" | "md" | "lg"; conResumen?: boolean; conPrefijo?: boolean;
  className?: string;
}) {
  const prefijo = conPrefijo ? "Documental: " : "";
  if (!estado) {
    return <Badge tono="gris" icono={CircleHelp} tamano={tamano} className={className}>{prefijo}sin evaluar</Badge>;
  }
  const e = ESTADOS[estado];
  return (
    <Badge tono={TONO_A[estado]} icono={e.Icono} tamano={tamano} className={className} title={`Indicador A: ${e.resumen}`}>
      {prefijo}{e.nombre}{conResumen ? ` · ${e.resumen}` : ""}
    </Badge>
  );
}

/** Cómo se ve el indicador B según su estado y, si hay informe emitido, su conclusión. */
export function estiloIndicadorB(estado: EstadoTecnico, resultado: ResultadoTecnico | null | undefined): {
  tono: TonoBadge; Icono: LucideIcon; texto: string;
} {
  if (estado === "EMITIDO" && resultado) {
    const r: Record<ResultadoTecnico, { tono: TonoBadge; Icono: LucideIcon; texto: string }> = {
      FAVORABLE: { tono: "verde", Icono: ShieldCheck, texto: "Informe favorable" },
      CON_OBSERVACIONES: { tono: "amarillo", Icono: AlertTriangle, texto: "Informe con observaciones" },
      CON_RIESGO: { tono: "rojo", Icono: ShieldAlert, texto: "Riesgo físico detectado" },
    };
    return r[resultado];
  }
  if (estado === "SOLICITADA") return { tono: "info", Icono: Clock, texto: ETIQUETA_ESTADO_TECNICO.SOLICITADA };
  if (estado === "EN_INSPECCION") return { tono: "info", Icono: HardHat, texto: ETIQUETA_ESTADO_TECNICO.EN_INSPECCION };
  if (estado === "EMITIDO") return { tono: "info", Icono: HardHat, texto: ETIQUETA_ESTADO_TECNICO.EMITIDO };
  return { tono: "gris", Icono: CircleDashed, texto: ETIQUETA_ESTADO_TECNICO.NO_SOLICITADA };
}

/** Indicador B: evaluación técnica presencial. Es independiente del indicador A y nunca cambia su color (RN-10). */
export function IndicadorB({ estado, resultado, tamano = "md", conPrefijo = true, className }: {
  estado: EstadoTecnico; resultado?: ResultadoTecnico | null; tamano?: "sm" | "md" | "lg"; conPrefijo?: boolean;
  className?: string;
}) {
  const { tono, Icono, texto } = estiloIndicadorB(estado, resultado);
  const titulo = estado === "EMITIDO" && resultado ? `Indicador B: ${ETIQUETA_RESULTADO[resultado]}` : `Indicador B: ${texto}`;
  return (
    <Badge tono={tono} icono={Icono} tamano={tamano} className={className} title={titulo}>
      {conPrefijo ? "Técnico: " : ""}{texto}
    </Badge>
  );
}
