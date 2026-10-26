package pe.trustinmuebles.inspeccion;

import java.time.LocalDate;

/**
 * Indicador B: lo que se sabe de la verificación física del inmueble. Es independiente del semáforo documental y
 * nunca lo cambia (RN-10).
 */
public record EvaluacionTecnicaDto(EstadoTecnico estado, String estadoEtiqueta, ResultadoTecnico resultado,
        String resultadoEtiqueta, String profesional, String colegiatura, LocalDate fechaSolicitud,
        LocalDate fechaInspeccion, VerificacionCampo verifArquitectura, VerificacionCampo verifEstructuras,
        VerificacionCampo verifElectricas, VerificacionCampo verifSanitarias, String observaciones,
        String conclusiones, String estudiosAdicionales, String limite, String profesionalEspecialidad,
        String solicitanteCodigo, boolean riesgoFisicoDetectado, ServicioInspeccion servicio,
        String especialistaAsignadoCodigo) {

    static final String LIMITE_SIN_INSPECCION =
            "Solo revisión documental: no acredita el estado físico de las estructuras ni de las instalaciones.";
    static final String LIMITE_CON_INSPECCION =
            "Basada en la inspección visual e instrumental del profesional. Lo que exige ensayos o estudios "
                    + "especializados queda fuera. No acredita saneamiento legal.";

    /** Forma anterior a la v0.6, sin solicitante, especialidad ni condiciones del servicio. La usa el PDF en pruebas. */
    public EvaluacionTecnicaDto(EstadoTecnico estado, String estadoEtiqueta, ResultadoTecnico resultado,
            String resultadoEtiqueta, String profesional, String colegiatura, LocalDate fechaSolicitud,
            LocalDate fechaInspeccion, VerificacionCampo verifArquitectura, VerificacionCampo verifEstructuras,
            VerificacionCampo verifElectricas, VerificacionCampo verifSanitarias, String observaciones,
            String conclusiones, String estudiosAdicionales, String limite) {
        this(estado, estadoEtiqueta, resultado, resultadoEtiqueta, profesional, colegiatura, fechaSolicitud,
                fechaInspeccion, verifArquitectura, verifEstructuras, verifElectricas, verifSanitarias, observaciones,
                conclusiones, estudiosAdicionales, limite, null, null, riesgo(estado, resultado), null, null);
    }

    /** Hay riesgo físico detectado solo cuando el informe está emitido y su conclusión es «con riesgo». */
    static boolean riesgo(EstadoTecnico estado, ResultadoTecnico resultado) {
        return estado == EstadoTecnico.EMITIDO && resultado == ResultadoTecnico.CON_RIESGO;
    }

    static EvaluacionTecnicaDto sinSolicitud(ServicioInspeccion servicio) {
        return new EvaluacionTecnicaDto(EstadoTecnico.NO_SOLICITADA, EstadoTecnico.NO_SOLICITADA.etiqueta(), null, null,
                null, null, null, null, null, null, null, null, null, null, null, LIMITE_SIN_INSPECCION, null, null,
                false, servicio, null);
    }

    static EvaluacionTecnicaDto de(EvaluacionTecnica e, ServicioInspeccion servicio) {
        return new EvaluacionTecnicaDto(e.getEstado(), e.getEstado().etiqueta(), e.getResultado(),
                e.getResultado() == null ? null : e.getResultado().etiqueta(), e.getProfesional(), e.getColegiatura(),
                e.getFechaSolicitud(), e.getFechaInspeccion(), e.getVerifArquitectura(), e.getVerifEstructuras(),
                e.getVerifElectricas(), e.getVerifSanitarias(), e.getObservaciones(), e.getConclusiones(),
                e.getEstudiosAdicionales(), LIMITE_CON_INSPECCION, e.getProfesionalEspecialidad(),
                e.getSolicitanteCodigo(), riesgo(e.getEstado(), e.getResultado()), servicio,
                e.getEspecialistaAsignadoCodigo());
    }
}
