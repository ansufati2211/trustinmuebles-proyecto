package pe.trustinmuebles.interes;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.trustinmuebles.interes.InteresDtos.*;
import tools.jackson.databind.JsonNode;

/**
 * v1.0 (etapa 4): interés y citas. El POST público no exige sesión (SecurityConfig) y lleva consentimiento obligatorio,
 * campo trampa y límite por IP. La bandeja, las notas y la agenda son del asesor y del gestor (SecurityConfig y otra vez
 * en el servicio).
 */
@RestController
@RequestMapping("/api/v1")
class InteresController {
    private final InteresService servicio;

    InteresController(InteresService servicio) {
        this.servicio = servicio;
    }

    // ------------------------------------------------------------------ portal público

    /** WhatsApp de la inmobiliaria (null si no está configurado) y el texto de consentimiento vigente. */
    @GetMapping("/publico/contacto")
    ConfigPublica configuracion() {
        return servicio.configuracion();
    }

    /** Interés del visitante con cita opcional. 201 si se recibió; 429 si la IP pasó el límite por hora. */
    @PostMapping("/publico/interes")
    ResponseEntity<Recibido> recibir(@RequestBody JsonNode cuerpo, HttpServletRequest request) {
        return ResponseEntity.status(201).body(servicio.recibir(cuerpo, request.getRemoteAddr()));
    }

    // ------------------------------------------------------------------ bandeja del equipo

    @GetMapping("/interesados")
    List<InteresDto> listar(@RequestParam(required = false) EtapaInteres etapa,
            @RequestParam(required = false) String proyecto, @RequestParam(required = false) String responsable,
            @RequestParam(defaultValue = "false") boolean vencidos) {
        return servicio.listar(etapa, proyecto, responsable, vencidos);
    }

    /**
     * v1.0 (etapa 8): el asesor o el gestor registra a un interesado que llegó por LLAMADA, OFICINA, WHATSAPP o REFERIDO,
     * con su consentimiento verbal. Mismos campos que el formulario público, sin límite por IP. 201 con el detalle.
     */
    @PostMapping("/interesados")
    ResponseEntity<InteresDetalle> registrar(@RequestBody JsonNode cuerpo) {
        return ResponseEntity.status(201).body(servicio.registrar(cuerpo));
    }

    @GetMapping("/interesados/resumen")
    ResumenDemanda resumen() {
        return servicio.resumen();
    }

    @GetMapping("/interesados/opciones")
    OpcionesBandeja opciones() {
        return servicio.opciones();
    }

    @GetMapping("/interesados/{id}")
    InteresDetalle detalle(@PathVariable Long id) {
        return servicio.detalle(id);
    }

    @PutMapping("/interesados/{id}/etapa")
    InteresDetalle etapa(@PathVariable Long id, @RequestBody JsonNode cuerpo) {
        return servicio.cambiarEtapa(id, CambioEtapa.de(cuerpo));
    }

    @PutMapping("/interesados/{id}/seguimiento")
    InteresDetalle seguimiento(@PathVariable Long id, @RequestBody JsonNode cuerpo) {
        return servicio.seguimiento(id, Seguimiento.de(cuerpo));
    }

    @PostMapping("/interesados/{id}/notas")
    ResponseEntity<NotaDto> nota(@PathVariable Long id, @RequestBody JsonNode cuerpo) {
        return ResponseEntity.status(201).body(servicio.agregarNota(id, NuevaNota.de(cuerpo)));
    }

    /** Marca el lote o inmueble del interesado como SEPARADO o VENDIDO (acción explícita). */
    @PutMapping("/interesados/{id}/estado-lote")
    InteresDetalle marcarLote(@PathVariable Long id, @RequestBody JsonNode cuerpo) {
        return servicio.marcarLote(id, MarcaLote.de(cuerpo));
    }

    /** Elimina el registro a pedido del interesado (con sus notas y citas). */
    @DeleteMapping("/interesados/{id}")
    ResponseEntity<Void> eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    // ------------------------------------------------------------------ citas

    @GetMapping("/citas/agenda")
    Agenda agenda(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde) {
        return servicio.agenda(desde);
    }

    @PutMapping("/citas/{id}/confirmacion")
    CitaDto confirmar(@PathVariable Long id, @RequestBody JsonNode cuerpo) {
        return servicio.confirmar(id, Confirmacion.de(cuerpo));
    }

    @PutMapping("/citas/{id}/reprogramacion")
    CitaDto reprogramar(@PathVariable Long id, @RequestBody JsonNode cuerpo) {
        return servicio.reprogramar(id, Reprogramacion.de(cuerpo, InteresService.hoy()));
    }

    @PutMapping("/citas/{id}/rechazo")
    CitaDto rechazar(@PathVariable Long id, @RequestBody JsonNode cuerpo) {
        return servicio.rechazar(id, Rechazo.de(cuerpo));
    }
}
