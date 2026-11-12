import type { AccionFilaCarga, ResultadoCarga, VistaPreviaCarga } from "./types";

/*
 * v1.0 (etapa 3b): carga masiva de lotes por CSV. Lógica sin React: rutas de la API, validaciones que se hacen antes de
 * enviar el archivo (el servidor vuelve a comprobarlas), textos del resumen y filas que se muestran en la vista previa.
 */

export const TAMANO_MAXIMO_BYTES = 1024 * 1024;
export const MAX_FILAS = 2000;
/** La vista previa dibuja a lo sumo estas filas a la vez; las demás se pueden ver filtrando por errores. */
export const FILAS_VISIBLES = 200;

export const COLUMNAS_CSV = ["manzana", "lote", "area_m2", "precio", "moneda", "estado", "independizacion", "zonificacion", "codigo_caso"] as const;

const base = (codigo: string) => `/proyectos/${encodeURIComponent(codigo)}/lotes`;
export const rutaPlantilla = (codigo: string) => `${base(codigo)}/plantilla.csv`;
export const rutaVistaPrevia = (codigo: string) => `${base(codigo)}/carga/vista-previa`;
export const rutaConfirmar = (codigo: string) => `${base(codigo)}/carga`;
export const rutaHistorialLote = (codigo: string, clave: string) => `${base(codigo)}/${encodeURIComponent(clave)}/historial`;
export const rutaCarga = (codigo: string) => `/proyectos/${encodeURIComponent(codigo)}/carga`;

export const ETIQUETA_ACCION: Record<AccionFilaCarga, string> = {
  NUEVO: "Nuevo", ACTUALIZA: "Actualiza", SIN_CAMBIOS: "Sin cambios", ERROR: "Con errores",
};

/** «1,5 MB», «820 KB» o «300 bytes». */
export function tamanoLegible(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} bytes`;
}

/** Qué se revisa del archivo antes de enviarlo; null si se puede enviar. El servidor lo vuelve a comprobar. */
export function errorDeArchivo(archivo: { name: string; size: number }): string | null {
  if (!/\.csv$/i.test(archivo.name)) return "Elige un archivo con extensión .csv (en Excel: Guardar como → CSV).";
  if (archivo.size === 0) return "El archivo está vacío.";
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return `El archivo pesa ${tamanoLegible(archivo.size)} y el máximo es 1 MB. Divídelo en partes de hasta ${MAX_FILAS} filas.`;
  }
  return null;
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** «80 lotes nuevos · 0 por actualizar · 0 sin cambios · 0 filas con errores». */
export function textoResumen(v: Pick<VistaPreviaCarga, "nuevas" | "actualizadas" | "sinCambios" | "conErrores">): string {
  return [plural(v.nuevas, "lote nuevo", "lotes nuevos"), `${v.actualizadas} por actualizar`, `${v.sinCambios} sin cambios`,
    plural(v.conErrores, "fila con errores", "filas con errores")].join(" · ");
}

/** Lo que dice el botón de confirmar, o por qué no se puede. */
export function textoConfirmar(v: VistaPreviaCarga): string {
  const n = v.nuevas + v.actualizadas;
  if (!v.valida) return "Corrige el archivo para poder confirmar";
  if (n === 0) return "No hay nada que guardar";
  return `Confirmar ${plural(n, "lote", "lotes")}`;
}

/** ¿Se puede confirmar? Debe ser válida y traer algo que guardar. */
export const sePuedeConfirmar = (v: VistaPreviaCarga) => v.valida && v.nuevas + v.actualizadas > 0;

/** Las filas que se dibujan: todas o solo las que tienen errores, hasta el límite; `ocultas` son las que no caben. */
export function filasAMostrar(v: VistaPreviaCarga, soloErrores: boolean, limite = FILAS_VISIBLES) {
  const filtradas = soloErrores ? v.filas.filter((f) => f.errores.length > 0) : v.filas;
  return { filas: filtradas.slice(0, limite), ocultas: Math.max(0, filtradas.length - limite), total: filtradas.length };
}

/** «Carga guardada: 80 lotes nuevos, 0 actualizados y 0 sin cambios.» */
export function textoResultado(r: ResultadoCarga): string {
  return `${plural(r.creados, "lote nuevo", "lotes nuevos")}, ${plural(r.actualizados, "actualizado", "actualizados")} y ${r.sinCambios} sin cambios.`;
}
