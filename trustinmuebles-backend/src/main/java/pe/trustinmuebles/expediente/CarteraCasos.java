package pe.trustinmuebles.expediente;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * API pública del módulo de expedientes para la cartera (v0.7): datos comerciales mínimos de cada caso. Solo lectura;
 * no expone el expediente ni permite cambiar su publicación.
 */
@Service
@Transactional(readOnly = true)
public class CarteraCasos {
    /** Un caso visto desde la cartera. El propietario va por su código de cuenta (I11). */
    public record CasoCartera(Long expedienteId, String codigo, EstadoPublicacion estadoPublicacion,
            String propietarioCodigo) {}

    private final ExpedienteRepository expedientes;

    CarteraCasos(ExpedienteRepository expedientes) {
        this.expedientes = expedientes;
    }

    public Optional<CasoCartera> buscar(String codigo) {
        return expedientes.findByCasoCodigo(codigo).map(CarteraCasos::de);
    }

    public List<CasoCartera> todos() {
        return expedientes.findAllByOrderByCasoCodigoAsc().stream().map(CarteraCasos::de).toList();
    }

    private static CasoCartera de(Expediente e) {
        return new CasoCartera(e.getId(), e.getCaso().getCodigo(), e.getCaso().getEstadoPublicacion(),
                e.getCaso().getPropietarioCodigo());
    }
}
