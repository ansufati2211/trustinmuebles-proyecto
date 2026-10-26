package pe.trustinmuebles.clasificacion;

import java.time.Instant;
import java.util.List;

/** Una fila del historial de evaluaciones, tal como se muestra. Solo lectura. */
public record HistorialEvaluacionDto(Instant registradaEn, EstadoSemaforo estadoAnterior, EstadoSemaforo estadoNuevo,
        List<ResultadoClasificacion.Motivo> motivos, List<String> faltantes, String versionReglas,
        OrigenEvaluacion origen, String cuentaCodigo) {}
