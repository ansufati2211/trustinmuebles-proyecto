package pe.trustinmuebles.metricas;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.trustinmuebles.postventa.EstadoTicket;
import pe.trustinmuebles.postventa.PostventaService;
import pe.trustinmuebles.semaforo.SemaforoService;
import pe.trustinmuebles.shared.NivelRiesgo;
import pe.trustinmuebles.tramite.TramiteService;

/** KPIs del Capítulo III (tickets procesados, tiempo de auditoría, distribución del semáforo). */
@RestController
@RequestMapping("/api/v1/admin/metricas")
class MetricasController {
    record Metricas(Map<NivelRiesgo, Long> distribucionSemaforo, long transacciones, double horasPromedioAuditoria,
            long ticketsTotales, Map<EstadoTicket, Long> ticketsPorEstado) {}

    private final SemaforoService semaforo;
    private final TramiteService tramites;
    private final PostventaService postventa;

    MetricasController(SemaforoService semaforo, TramiteService tramites, PostventaService postventa) {
        this.semaforo = semaforo;
        this.tramites = tramites;
        this.postventa = postventa;
    }

    @GetMapping
    Metricas metricas() {
        Map<EstadoTicket, Long> porEstado = postventa.ticketsPorEstado();
        return new Metricas(semaforo.distribucion(), tramites.contar(), tramites.horasPromedioAuditoria(),
                porEstado.values().stream().mapToLong(Long::longValue).sum(), porEstado);
    }
}
