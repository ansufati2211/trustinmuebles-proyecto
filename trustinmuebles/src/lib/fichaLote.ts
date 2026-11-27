import { etiquetaPosicion, posicionesDe, SIN_DATO } from "./posicionLote";
import { ESTILO_LOTE, estadoEnPlano, etiquetaLote } from "./proyectos";
import type { LoteProyecto } from "./types";

/*
 * v2.0 (tanda 1, RF43): la ficha rápida de un lote del plano (al pasar el mouse o al tocarlo). Muestra manzana, lote,
 * área, precio y estado, y deja preparados frontis, fondo y la nota de reserva o descuento: si no vienen, dicen «Sin dato».
 */

export interface DatoFicha { clave: string; termino: string; valor: string; sinDato: boolean }

/** Número con coma decimal y hasta dos decimales («17,5»). No depende de la configuración regional del navegador. */
const numero = (n: number) => (Math.round(n * 100) / 100).toString().replace(".", ",");
const metros = (n: number) => `${numero(n)} m`;

/** Las filas de la ficha, en orden. {@code formatoPrecio} es el de la interfaz (lib/formato.precio). */
export function datosFicha(l: LoteProyecto, formatoPrecio: (monto: number, moneda: string | null, entero?: boolean) => string): DatoFicha[] {
  const f = (clave: string, termino: string, valor: string | null | undefined): DatoFicha =>
    ({ clave, termino, valor: valor && valor.trim() ? valor : SIN_DATO, sinDato: !valor || !valor.trim() });
  return [
    f("manzana", "Manzana", l.manzana),
    f("lote", "Lote", etiquetaLote(l)),
    f("area", "Área", `${numero(l.areaM2)} m²`),
    f("precio", "Precio", l.precio != null ? formatoPrecio(l.precio, l.moneda, true) : "A consultar"),
    f("estado", "Estado", ESTILO_LOTE[estadoEnPlano(l)].etiqueta),
    f("posicion", "Posición", posicionesDe(l.posicion).length ? etiquetaPosicion(l.posicion) : null),
    f("frontis", "Frontis", l.frontis != null ? metros(l.frontis) : null),
    f("fondo", "Fondo", l.fondo != null ? metros(l.fondo) : null),
    f("nota", "Reserva o descuento", l.notaReserva),
  ];
}

/** Qué lote muestra la ficha: el que se toca (queda fijo) o, con el mouse, el que se señala mientras se pasa por encima. */
export interface SeleccionFicha { fijo: string | null; sobre: string | null }
export const SIN_FICHA: SeleccionFicha = { fijo: null, sobre: null };

export const fichaVisible = (s: SeleccionFicha): string | null => s.sobre ?? s.fijo;
/** Tocar o hacer clic en un lote abre su ficha; volver a tocar el mismo la cierra. */
export const tocarLote = (s: SeleccionFicha, clave: string): SeleccionFicha => ({ fijo: s.fijo === clave ? null : clave, sobre: null });
export const pasarSobre = (s: SeleccionFicha, clave: string | null): SeleccionFicha => ({ ...s, sobre: clave });
export const cerrarFicha = (): SeleccionFicha => SIN_FICHA;
