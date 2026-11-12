package pe.trustinmuebles.expediente;

import org.springframework.web.bind.annotation.*;
import pe.trustinmuebles.expediente.CasoDtos.DetalleCaso;
import pe.trustinmuebles.expediente.CasoDtos.PaginaPublica;

/**
 * v1.0: portal público de solo lectura, sin sesión (ver SecurityConfig). Solo casos PUBLICADOS; un borrador, uno
 * retirado o uno inexistente dan 404. No hay escritura: sin sesión, cualquier otro método da 401.
 */
@RestController
@RequestMapping("/api/v1/publico")
class PublicoController {
    private final ExpedienteService servicio;

    PublicoController(ExpedienteService servicio) {
        this.servicio = servicio;
    }

    /** Catálogo público en páginas de 24 (la primera es la 0). */
    @GetMapping("/inmuebles")
    PaginaPublica listar(@RequestParam(defaultValue = "0") int pagina) {
        return servicio.listarPublico(pagina);
    }

    /** Ficha pública: lo que ve el comprador, sin semáforo de gestión ni código del propietario. */
    @GetMapping("/inmuebles/{codigo}")
    DetalleCaso detalle(@PathVariable String codigo) {
        return servicio.detallePublico(codigo);
    }
}
