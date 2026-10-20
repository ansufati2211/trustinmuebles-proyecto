package pe.trustinmuebles.expediente;

import pe.trustinmuebles.clasificacion.TipoPredio;

/**
 * Tipo de inmueble que ve el comprador en el catálogo. Se deriva del tipo de predio del expediente, que es el que usan
 * las reglas de planos: no se guarda aparte para que nunca se contradigan.
 */
public enum TipoInmueble {
    VIVIENDA_URBANA("Vivienda urbana"),
    LOTE_URBANO("Lote urbano");

    private final String etiqueta;

    TipoInmueble(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String etiqueta() {
        return etiqueta;
    }

    static TipoInmueble de(TipoPredio tipo) {
        return tipo == TipoPredio.VIVIENDA ? VIVIENDA_URBANA : LOTE_URBANO;
    }
}
