package pe.trustinmuebles.inspeccion;

import java.time.Instant;
import java.util.List;
import pe.trustinmuebles.shared.NivelRiesgo;

public record InspeccionDto(Long id, Long inmuebleId, Long planoId, String inspector, String dictamen,
        EstadoInspeccion estado, NivelRiesgo nivel, Instant fecha, List<PinDto> pines) {

    public record PinDto(Long id, double x, double y, NivelRiesgo severidad, String titulo, String descripcion) {}
}
