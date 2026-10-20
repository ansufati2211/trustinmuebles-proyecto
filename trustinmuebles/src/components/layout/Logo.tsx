interface LogoMarkProps {
  /** Clases de tamaño del contenedor, por ejemplo "w-10 h-10". */
  className?: string;
}

/**
 * Marca de Trustinmuebles: una casa con una marca de verificación.
 * Todo el dibujo vive dentro del contenedor (overflow-hidden), así ningún trazo se sale de la caja.
 */
export function LogoMark({ className = "w-10 h-10" }: LogoMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-[#022C22] shadow-md shadow-primary/30 ${className}`}
    >
      <svg viewBox="0 0 32 32" fill="none" className="h-full w-full p-[18%]" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M4 15.5 16 5l12 10.5"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 14v12.5h17V14"
          stroke="white"
          strokeOpacity="0.55"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m11.8 19.6 3.3 3.3 5.4-5.9"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}