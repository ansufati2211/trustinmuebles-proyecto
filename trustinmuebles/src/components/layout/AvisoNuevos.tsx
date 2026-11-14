import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { useApi } from "@/lib/useApi";
import { actuaComoGestor } from "@/lib/permisos";
import { EVENTO_INTERESADOS, RUTA_NUEVOS, burbujaNuevos, textoAvisoNuevos } from "@/lib/interes";
import type { Rol } from "@/lib/types";

/*
 * v1.0 (etapa 9): aviso de interesados nuevos en el menú «Interesados» del asesor y del gestor. Cuenta los de etapa
 * NUEVO (GET /interesados/nuevos) y se actualiza al cambiar de página, cuando la bandeja avisa un cambio y cada minuto.
 */

const CADA_MS = 60_000;

/** Cuántos interesados nuevos hay; 0 para los demás roles (ni siquiera se pregunta al servidor). */
export function useNuevosInteresados(rol: Rol | undefined): number {
  const habilitado = actuaComoGestor(rol);
  const { data, reload } = useApi<{ nuevos: number }>(habilitado ? RUTA_NUEVOS : null);
  const { pathname } = useLocation();
  const primera = useRef(true);

  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    if (habilitado) reload();
  }, [pathname, habilitado, reload]);

  useEffect(() => {
    if (!habilitado) return;
    window.addEventListener(EVENTO_INTERESADOS, reload);
    const t = window.setInterval(reload, CADA_MS);
    return () => { window.removeEventListener(EVENTO_INTERESADOS, reload); window.clearInterval(t); };
  }, [habilitado, reload]);

  return habilitado ? data?.nuevos ?? 0 : 0;
}

/**
 * La burbuja con la cantidad (oculta para lectores de pantalla) y el texto completo para ellos («, 3 interesados
 * nuevos»), que se lee junto con el nombre del enlace. Sin nuevos, nada.
 */
export function AvisoNuevos({ n }: { n: number }) {
  const texto = textoAvisoNuevos(n);
  if (!texto) return null;
  return (
    <>
      <span aria-hidden="true" data-aviso-nuevos={n}
        className="cifras ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 align-middle text-[11px] font-bold leading-none text-white">
        {burbujaNuevos(n)}
      </span>
      <span className="sr-only">{`, ${texto}`}</span>
    </>
  );
}
