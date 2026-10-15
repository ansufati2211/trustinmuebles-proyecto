package pe.trustinmuebles.tramite;

/** Etapas del trámite, alineadas con la "Ruta de Transacción" del front. */
public enum EtapaTramite {
    OFERTA_ACEPTADA("Oferta Aceptada", "Acuerdo de precio y condiciones firmado por ambas partes."),
    AUDITORIA_APROBADA("Auditoría Aprobada", "Verificación legal y estructural completada sin observaciones de riesgo."),
    FIRMA_MINUTA("Firma de Minuta", "El documento legal validado está listo para tu firma digital."),
    ESCRITURA_PUBLICA("Escritura Pública", "Trámite notarial final. Se activa tras la firma de la minuta."),
    FINALIZADA("Inscripción en SUNARP", "La propiedad quedó inscrita a tu nombre. Trámite finalizado.");

    private final String titulo;
    private final String descripcion;

    EtapaTramite(String titulo, String descripcion) {
        this.titulo = titulo;
        this.descripcion = descripcion;
    }

    public String titulo() {
        return titulo;
    }

    public String descripcion() {
        return descripcion;
    }

    public EtapaTramite siguiente() {
        return this == FINALIZADA ? null : values()[ordinal() + 1];
    }
}
