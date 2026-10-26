package pe.trustinmuebles.cartera;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.trustinmuebles.cartera.CarteraDtos.*;
import tools.jackson.databind.JsonNode;

/** API interna de la cartera (v0.7). Los roles se exigen en SecurityConfig y otra vez en el servicio. */
@RestController
@RequestMapping("/api/v1")
class CarteraController {
    private final CarteraService servicio;

    CarteraController(CarteraService servicio) {
        this.servicio = servicio;
    }

    /** Solo COMPRADOR, sobre un caso publicado. Cuerpo: {@code {"motivo": "INFORMACION_GENERAL"}}. */
    @PostMapping("/casos/{codigo}/contactos")
    ResponseEntity<ContactoDto> solicitar(@PathVariable String codigo, @RequestBody JsonNode cuerpo) {
        return ResponseEntity.status(201).body(servicio.solicitar(codigo, SolicitarContactoRequest.de(cuerpo).motivo()));
    }

    /** Solo GESTOR. Filtro opcional por estado (PENDIENTE o ATENDIDA). */
    @GetMapping("/contactos")
    List<ContactoDto> listar(@RequestParam(required = false) EstadoContacto estado) {
        return servicio.listar(estado);
    }

    /** Solo GESTOR: marca atendida una solicitud pendiente. */
    @PutMapping("/contactos/{id}/atencion")
    ContactoDto atender(@PathVariable Long id) {
        return servicio.atender(id);
    }

    /** Solo GESTOR: panel de cartera de solo lectura. */
    @GetMapping("/cartera/panel")
    PanelCartera panel() {
        return servicio.panel();
    }
}
