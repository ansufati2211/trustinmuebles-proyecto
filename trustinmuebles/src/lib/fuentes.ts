// Sitios oficiales de SUNARP. Trustinmuebles solo enlaza: no consulta ni lee estos sitios (exigen identidad del usuario).
export const CONOCE_AQUI = "https://conoce-aqui.sunarp.gob.pe/conoce-aqui/inicio";
export const VISOR_BGR = "https://visor-bgr.sunarp.gob.pe/visor-bgr/inicio";

/** Deja solo letras y números, sin el prefijo SIM-: «SIM-11048217», «11 048 217» y «11048217» son la misma partida. */
export const normalizarNumero = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^SIM/, "");

/** ¿Parece un número de partida? Ocho dígitos, con una letra inicial opcional (por ejemplo P07044600). */
export const pareceNumeroDePartida = (s: string) => /^[A-Z]?\d{8}$/.test(normalizarNumero(s));

/** Abre un sitio externo en otra pestaña, sin darle acceso a esta. */
export const abrirExterno = (url: string) => { window.open(url, "_blank", "noopener,noreferrer"); };

/** Copia un texto al portapapeles. Si el navegador no lo permite, no pasa nada: el usuario lo copia a mano. */
export async function copiar(texto: string) {
  try { await navigator.clipboard.writeText(texto); return true; } catch { return false; }
}
