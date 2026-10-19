package pe.trustinmuebles.inspeccion;

import java.time.LocalDate;

/**
 * Indicador B: lo que se sabe de la verificación física del inmueble. Es independiente del semáforo documental y
 * nunca lo cambia.
 */
public record EvaluacionTecnicaDto(EstadoTecnico estado, String estadoEtiqueta, ResultadoTecnico resultado,
        String resultadoEtiqueta, String profesional, String colegiatura, LocalDate fechaSolicitud,
        LocalDate fechaInspeccion, VerificacionCampo verifArquitectura, VerificacionCampo verifEstructuras,
        VerificacionCampo verifElectricas, VerificacionCampo verifSanitarias, String observaciones,
        String conclusiones, String estudiosAdicionales, String limite) {

    static final String LIMITE_SIN_INSPECCION =
            "Solo revisión documental: no acredita el estado físico de las estructuras ni de las instalaciones.";
    static final String LIMITE_CON_INSPECCION =
            "Basada en la inspección visual e instrumental del profesional. Lo que exige ensayos o estudios "
                    + "especializados queda fuera. No acredita saneamiento legal.";

    static EvaluacionTecnicaDto sinSolicitud() {
        return new EvaluacionTecnicaDto(EstadoTecnico.NO_SOLICITADA, EstadoTecnico.NO_SOLICITADA.etiqueta(), null, null,
                null, null, null, null, null, null, null, null, null, null, null, LIMITE_SIN_INSPECCION);
    }

    static EvaluacionTecnicaDto de(EvaluacionTecnica e) {
        return new EvaluacionTecnicaDto(e.getEstado(), e.getEstado().etiqueta(), e.getResultado(),
                e.getResultado() == null ? null : e.getResultado().etiqueta(), e.getProfesional(), e.getColegiatura(),
                e.getFechaSolicitud(), e.getFechaInspeccion(), e.getVerifArquitectura(), e.getVerifEstructuras(),
                e.getVerifElectricas(), e.getVerifSanitarias(), e.getObservaciones(), e.getConclusiones(),
                e.getEstudiosAdicionales(), LIMITE_CON_INSPECCION);
    }
}
