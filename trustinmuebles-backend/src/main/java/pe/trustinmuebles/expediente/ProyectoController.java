package pe.trustinmuebles.expediente;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import pe.trustinmuebles.expediente.ProyectoDtos.EstadoLoteRequest;
import pe.trustinmuebles.expediente.ProyectoDtos.LoteDto;
import pe.trustinmuebles.expediente.ProyectoDtos.ResumenProyecto;

/**
 * v1.0 (etapa 3a): proyectos para el equipo de la inmobiliaria. Leer: revisor, gestor y asesor; publicar, retirar o
 * cambiar el estado comercial de un lote: gestor y asesor (SecurityConfig). Nada de esto cambia el indicador A.
 */
@RestController
@RequestMapping("/api/v1/proyectos")
class ProyectoController {
    private final ProyectoService servicio;

    ProyectoController(ProyectoService servicio) {
        this.servicio = servicio;
    }

    @GetMapping
    List<ResumenProyecto> listar() {
        return servicio.listar();
    }

    @PostMapping("/{codigo}/lotes/{lote}/publicacion")
    LoteDto publicar(@PathVariable String codigo, @PathVariable String lote) {
        return servicio.publicar(codigo, lote);
    }

    @DeleteMapping("/{codigo}/lotes/{lote}/publicacion")
    LoteDto retirar(@PathVariable String codigo, @PathVariable String lote) {
        return servicio.retirar(codigo, lote);
    }

    @PutMapping("/{codigo}/lotes/{lote}/estado-comercial")
    LoteDto estado(@PathVariable String codigo, @PathVariable String lote, @Valid @RequestBody EstadoLoteRequest req) {
        return servicio.cambiarEstado(codigo, lote, req.estadoComercial());
    }
}
