import { useId } from "react";
import { cn } from "@/lib/utils";
import { configPredio, textoAlternativo, type ConfigPredio, type PaletaPredio } from "@/lib/predios";
import type { TipoInmueble } from "@/lib/types";

/*
 * Ilustraciones propias de los predios (SVG en línea, sin imágenes externas ni fotos de stock). El fondo lleva las dunas
 * de Ica; el frente, la vereda y la pista. Todas comparten la línea de suelo en y = 236 de un lienzo de 480 × 300.
 */
const SUELO = 236;

function Huarango({ x }: { x: number }) {
  // Árbol típico de Ica: tronco retorcido y copa ancha y aplanada.
  return (
    <g>
      <path d={`M${x - 4} ${SUELO} C ${x - 2} ${SUELO - 26}, ${x - 12} ${SUELO - 40}, ${x - 6} ${SUELO - 60} L ${x + 4} ${SUELO - 60} C ${x + 2} ${SUELO - 42}, ${x + 10} ${SUELO - 28}, ${x + 6} ${SUELO} Z`} fill="#5E4632" />
      <ellipse cx={x - 18} cy={SUELO - 70} rx="34" ry="15" fill="#4F7A4A" />
      <ellipse cx={x + 16} cy={SUELO - 74} rx="38" ry="17" fill="#5C8A55" />
      <ellipse cx={x} cy={SUELO - 86} rx="30" ry="13" fill="#6C9A63" />
    </g>
  );
}

function Palmera({ x }: { x: number }) {
  return (
    <g>
      <path d={`M${x - 3} ${SUELO} Q ${x + 6} ${SUELO - 60} ${x + 2} ${SUELO - 108} L ${x + 7} ${SUELO - 108} Q ${x + 12} ${SUELO - 60} ${x + 4} ${SUELO} Z`} fill="#7A5C3E" />
      {[-60, -25, 15, 50, 85].map((a) => (
        <path key={a} d={`M${x + 4} ${SUELO - 108} q ${Math.cos((a * Math.PI) / 180) * 26} ${-14 + Math.abs(a) / 6} ${Math.cos((a * Math.PI) / 180) * 46} ${10 + Math.abs(a) / 4}`}
          stroke="#4F7A4A" strokeWidth="7" strokeLinecap="round" fill="none" />
      ))}
    </g>
  );
}

function Ventana({ x, y, w, h, p }: { x: number; y: number; w: number; h: number; p: PaletaPredio }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={p.vidrio} stroke={p.carpinteria} strokeWidth="3" />
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={p.carpinteria} strokeWidth="2" />
      <path d={`M${x + 4} ${y + h - 6} L ${x + w / 2 - 6} ${y + 6}`} stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="3" />
    </g>
  );
}

function Reja({ x1, x2, color }: { x1: number; x2: number; color: string }) {
  const barras = [];
  for (let x = x1; x <= x2; x += 9) barras.push(<rect key={x} x={x} y={SUELO - 30} width="2.5" height="30" fill={color} />);
  return (
    <g>
      <rect x={x1} y={SUELO - 32} width={x2 - x1 + 2} height="3" fill={color} />
      {barras}
    </g>
  );
}

function Casa1({ c }: { c: ConfigPredio }) {
  const p = c.paleta;
  return (
    <g>
      <rect x="118" y="140" width="244" height={SUELO - 140} fill={p.fachada} />
      <rect x="112" y="130" width="256" height="12" fill={p.fachada2} />
      <rect x="226" y="142" width="12" height={SUELO - 142} fill={p.fachada2} opacity="0.8" />
      {/* cochera */}
      <rect x="136" y="172" width="78" height={SUELO - 172} fill={p.carpinteria} />
      {[182, 194, 206, 218].map((y) => <line key={y} x1="136" y1={y} x2="214" y2={y} stroke="#FFFFFF" strokeOpacity="0.18" strokeWidth="2" />)}
      <Ventana x={250} y={160} w={60} h={40} p={p} />
      {/* puerta */}
      <rect x="320" y="166" width="28" height={SUELO - 166} fill={p.acento} />
      <circle cx="343" cy="203" r="2.2" fill="#F3EADB" />
      <rect x="314" y="160" width="40" height="5" fill={p.carpinteria} />
      {c.reja && <Reja x1={120} x2={222} color={p.carpinteria} />}
    </g>
  );
}

function Casa2({ c }: { c: ConfigPredio }) {
  const p = c.paleta;
  return (
    <g>
      <rect x="108" y="150" width="264" height={SUELO - 150} fill={p.fachada} />
      <rect x="102" y="142" width="276" height="10" fill={p.fachada2} />
      {c.obra ? (
        <g>
          {/* segundo piso en construcción: columnas con fierros y muro de ladrillo a medias */}
          {[150, 230, 310].map((x) => (
            <g key={x}>
              <rect x={x} y="80" width="14" height="62" fill="#A7ADA9" />
              {[2, 6, 10].map((d) => <line key={d} x1={x + d} y1="80" x2={x + d} y2="64" stroke="#5B5F5C" strokeWidth="1.6" />)}
            </g>
          ))}
          {Array.from({ length: 4 }, (_, fila) =>
            Array.from({ length: 9 }, (_, i) => (
              <rect key={`${fila}-${i}`} x={164 + i * 16 + (fila % 2) * 8} y={126 - fila * 10} width="14" height="8" fill="#C46A45" stroke="#9A4E31" strokeWidth="0.8" />
            )))}
          <rect x="104" y="138" width="272" height="4" fill="#8E9490" />
        </g>
      ) : (
        <g>
          <rect x="148" y="82" width="214" height="60" fill={p.fachada2} />
          <rect x="142" y="74" width="226" height="10" fill={p.carpinteria} opacity="0.85" />
          <Ventana x={166} y={96} w={74} h={34} p={p} />
          <Ventana x={262} y={96} w={74} h={34} p={p} />
          <rect x="150" y="132" width="210" height="3" fill={p.carpinteria} />
          {[160, 190, 220, 250, 280, 310, 340].map((x) => <rect key={x} x={x} y="120" width="2" height="12" fill={p.carpinteria} />)}
        </g>
      )}
      <Ventana x={126} y={170} w={66} h={38} p={p} />
      <rect x="208" y="168" width="30" height={SUELO - 168} fill={p.acento} />
      <circle cx="232" cy="204" r="2.2" fill="#F3EADB" />
      <rect x="252" y="178" width="104" height={SUELO - 178} fill={p.carpinteria} />
      {[190, 202, 214, 226].map((y) => <line key={y} x1="252" y1={y} x2="356" y2={y} stroke="#FFFFFF" strokeOpacity="0.18" strokeWidth="2" />)}
      {c.reja && <Reja x1={110} x2={198} color={p.carpinteria} />}
    </g>
  );
}

function Adobe({ c }: { c: ConfigPredio }) {
  const p = c.paleta;
  return (
    <g>
      <rect x="104" y="138" width="272" height={SUELO - 138} fill={p.fachada} />
      {[156, 176, 196, 216].map((y) => <line key={y} x1="104" y1={y} x2="376" y2={y} stroke={p.fachada2} strokeWidth="1.2" opacity="0.7" />)}
      <rect x="98" y="128" width="284" height="12" fill={p.fachada2} />
      {/* vigas de madera que asoman bajo el techo de caña y barro */}
      {Array.from({ length: 12 }, (_, i) => <rect key={i} x={110 + i * 23} y="138" width="8" height="7" fill={p.carpinteria} />)}
      <rect x="96" y="122" width="288" height="7" fill="#9C7A55" />
      {/* puerta de madera con arco */}
      <path d={`M210 ${SUELO} L210 182 Q 240 160 270 182 L270 ${SUELO} Z`} fill={p.carpinteria} />
      <line x1="240" y1="172" x2="240" y2={SUELO} stroke="#3B2616" strokeWidth="2" />
      {/* ventanas pequeñas con postigos */}
      {[130, 312].map((x) => (
        <g key={x}>
          <rect x={x} y="166" width="36" height="34" fill={p.vidrio} />
          <rect x={x - 8} y="164" width="10" height="38" fill={p.acento} />
          <rect x={x + 34} y="164" width="10" height="38" fill={p.acento} />
          <rect x={x - 4} y="200" width="44" height="5" fill={p.fachada2} />
        </g>
      ))}
    </g>
  );
}

function Lote({ c }: { c: ConfigPredio }) {
  const p = c.paleta;
  const postes = [];
  for (let x = 84; x <= 396; x += 39) postes.push(<rect key={x} x={x} y={SUELO - 34} width="5" height="36" fill={p.carpinteria} />);
  return (
    <g>
      {/* terreno */}
      <path d={`M70 ${SUELO} L110 196 L370 196 L410 ${SUELO} Z`} fill={p.fachada} />
      {Array.from({ length: 26 }, (_, i) => <circle key={i} cx={100 + ((i * 53) % 290)} cy={204 + ((i * 17) % 28)} r="1.6" fill={p.fachada2} />)}
      {/* cerco de alambre */}
      {postes}
      {[SUELO - 30, SUELO - 20, SUELO - 10].map((y) => <line key={y} x1="84" y1={y} x2="401" y2={y} stroke={p.carpinteria} strokeWidth="1.4" opacity="0.8" />)}
      {/* hitos de concreto en las esquinas, pintados de rojo y blanco */}
      {[100, 372].map((x) => (
        <g key={x}>
          <rect x={x} y="186" width="12" height="16" fill="#E6E2DA" />
          <rect x={x} y="186" width="12" height="5" fill={p.acento} />
        </g>
      ))}
      {/* cartel sin texto, sobre dos parantes */}
      <rect x="216" y="150" width="4" height="46" fill={p.carpinteria} />
      <rect x="260" y="150" width="4" height="46" fill={p.carpinteria} />
      <rect x="206" y="140" width="68" height="28" rx="3" fill="#FFFFFF" stroke={p.carpinteria} strokeWidth="2" />
      <rect x="216" y="148" width="48" height="4" rx="2" fill={p.acento} />
      <rect x="216" y="156" width="34" height="4" rx="2" fill="#A7ADA9" />
    </g>
  );
}

/**
 * Ilustración del predio, con role="img" y texto alternativo. Recibe el código del expediente y su tipo; si el
 * expediente no tiene un dibujo asignado, se elige uno según el tipo.
 */
export function PredioImagen({ codigo, tipo, className, decorativa = false }: {
  codigo: string; tipo: TipoInmueble; className?: string; decorativa?: boolean;
}) {
  const c = configPredio(codigo, tipo);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const cielo = c.cielo === "tarde" ? ["#F4CFA2", "#FBEEDB"] : ["#CFE5F1", "#F6EFE2"];
  const xArbol = c.arbolLado === "izq" ? 60 : 424;
  const Edificio = { casa1: Casa1, casa2: Casa2, adobe: Adobe, lote: Lote }[c.variante];

  return (
    <svg viewBox="0 0 480 300" preserveAspectRatio="xMidYMid slice" className={cn("block h-full w-full", className)}
      role={decorativa ? undefined : "img"} aria-label={decorativa ? undefined : textoAlternativo(c)}
      aria-hidden={decorativa ? true : undefined} focusable="false">
      {!decorativa && <title>{textoAlternativo(c)}</title>}
      <defs>
        <linearGradient id={`cielo${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cielo[0]} />
          <stop offset="1" stopColor={cielo[1]} />
        </linearGradient>
      </defs>
      <rect width="480" height="300" fill={`url(#cielo${id})`} />
      <circle cx={c.cielo === "tarde" ? 380 : 96} cy={c.cielo === "tarde" ? 118 : 70} r="26" fill="#F2C46B" opacity={c.cielo === "tarde" ? 0.9 : 0.75} />
      {/* dunas de Ica al fondo */}
      <path d="M0 196 C 70 150, 140 150, 210 186 C 260 160, 330 138, 400 170 C 430 160, 460 160, 480 168 L480 236 L0 236 Z" fill="#EBCB98" />
      <path d="M0 214 C 90 186, 170 196, 250 214 C 320 196, 410 194, 480 210 L480 236 L0 236 Z" fill="#E2BA82" />
      {c.arbol && c.variante !== "lote" && c.arbolLado === "izq" && (c.arbol === "huarango" ? <Huarango x={xArbol} /> : <Palmera x={xArbol} />)}
      <Edificio c={c} />
      {c.arbol && (c.variante === "lote" || c.arbolLado === "der") && (c.arbol === "huarango" ? <Huarango x={xArbol} /> : <Palmera x={xArbol} />)}
      {/* vereda, sardinel y pista */}
      <rect y={SUELO} width="480" height="14" fill="#D9D6CF" />
      <rect y={SUELO + 14} width="480" height="4" fill="#B9B5AC" />
      <rect y={SUELO + 18} width="480" height={300 - SUELO - 18} fill="#7C817E" />
      {[20, 120, 220, 320, 420].map((x) => <rect key={x} x={x} y="276" width="48" height="4" rx="2" fill="#E9E6DF" />)}
    </svg>
  );
}
