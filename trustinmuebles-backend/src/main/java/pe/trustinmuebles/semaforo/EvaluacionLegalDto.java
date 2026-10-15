package pe.trustinmuebles.semaforo;

import java.time.Instant;
import java.util.List;
import pe.trustinmuebles.shared.NivelRiesgo;

public record EvaluacionLegalDto(Long id, Long inmuebleId, NivelRiesgo nivel, NivelRiesgo dominio,
        NivelRiesgo gravamenes, NivelRiesgo procesos, String hashCopia, Instant fecha, boolean desactualizada,
        List<HallazgoDto> hallazgos) {

    public record HallazgoDto(CategoriaLegal categoria, NivelRiesgo nivel, String codigo, String titulo,
            String explicacionSimple, String recomendacion, String textoRegistral) {}

    EvaluacionLegalDto marcarDesactualizada() {
        return new EvaluacionLegalDto(id, inmuebleId, nivel, dominio, gravamenes, procesos, hashCopia, fecha, true,
                hallazgos);
    }
}
