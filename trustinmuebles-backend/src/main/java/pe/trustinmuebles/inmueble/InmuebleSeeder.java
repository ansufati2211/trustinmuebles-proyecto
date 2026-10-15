package pe.trustinmuebles.inmueble;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/** Genera la evaluación del Semáforo Legal de las propiedades sembradas que aún no tienen una. */
@Component
@Order(20)
class InmuebleSeeder implements ApplicationRunner {
    private final InmuebleService service;

    InmuebleSeeder(InmuebleService service) {
        this.service = service;
    }

    @Override
    public void run(ApplicationArguments args) {
        service.idsSinEvaluacion().forEach(service::evaluar);
    }
}
