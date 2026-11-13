package pe.trustinmuebles.expediente;

/**
 * v1.0 (etapa 6): rotulado común de los PDF que genera el sistema. Todos llevan el nombre de la inmobiliaria y dicen que
 * los elabora ella; ninguno imita el formato de SUNARP, de una municipalidad ni de un colegio profesional (sin escudos,
 * sellos, firmas, códigos de verificación ni datos de pago de derechos).
 */
final class RotuloInmobiliaria {
    static final String NOMBRE = "Trustinmuebles";
    static final String ENCABEZADO = "TRUSTINMUEBLES · INMOBILIARIA EN ICA";
    static final String ELABORADO = "Documento informativo elaborado por la inmobiliaria Trustinmuebles.";

    private RotuloInmobiliaria() {}
}
