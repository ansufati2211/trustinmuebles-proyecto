package pe.trustinmuebles.clasificacion;

import java.time.Instant;
import java.util.List;

/** Evaluación vigente de un expediente, tal como se muestra al usuario. */
public record EvaluacionDto(EstadoSemaforo estado, String etiqueta, List<ResultadoClasificacion.Motivo> motivos,
        List<String> faltantes, List<ResultadoClasificacion.Alerta> alertas, boolean noDescartaOtras,
        String versionReglas, List<String> reglasAplicadas, String limite, Instant calculadaEn,
        Long expedienteVersion) {

    static EvaluacionDto de(ResultadoClasificacion r, Instant calculadaEn, Long expedienteVersion) {
        return new EvaluacionDto(r.estado(), r.etiqueta(), r.motivos(), r.faltantes(), r.alertas(),
                r.noDescartaOtras(), r.versionReglas(), r.reglasAplicadas(), r.limite(), calculadaEn,
                expedienteVersion);
    }
}
