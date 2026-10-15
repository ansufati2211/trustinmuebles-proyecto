package pe.trustinmuebles.postventa;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pe.trustinmuebles.identidad.UsuarioActual;
import pe.trustinmuebles.postventa.PostventaDtos.*;

@RestController
@RequestMapping("/api/v1")
class PostventaController {
    record MantenimientoRequest(@NotNull Long propiedadId, @NotNull LocalDate fecha,
            @NotBlank @jakarta.validation.constraints.Size(max = 200) String servicio,
            @NotNull @jakarta.validation.constraints.Digits(integer = 12, fraction = 2) BigDecimal inversionUsd) {}

    record TicketRequest(@NotNull Long propiedadId, @NotBlank @jakarta.validation.constraints.Size(max = 200) String titulo,
            @jakarta.validation.constraints.Size(max = 2000) String descripcion, Long planoId,
            Double pinX, Double pinY, PrioridadTicket prioridad) {}

    record EstadoRequest(@NotNull EstadoTicket estado, @jakarta.validation.constraints.Size(max = 200) String proveedor) {}

    private final PostventaService service;

    PostventaController(PostventaService service) {
        this.service = service;
    }

    @GetMapping("/postventa/resumen")
    ResumenPostventa resumen() {
        return service.resumen(UsuarioActual.actual());
    }

    @GetMapping("/postventa/{inmuebleId}/dossier")
    Dossier dossier(@PathVariable Long inmuebleId) {
        return service.dossier(inmuebleId, UsuarioActual.actual());
    }

    @GetMapping("/postventa/mantenimientos")
    List<MantenimientoDto> mantenimientos(@RequestParam Long propiedadId) {
        return service.mantenimientos(propiedadId, UsuarioActual.actual());
    }

    @PostMapping("/postventa/mantenimientos")
    @ResponseStatus(HttpStatus.CREATED)
    MantenimientoDto registrar(@Valid @RequestBody MantenimientoRequest r) {
        return service.registrarMantenimiento(r.propiedadId(), r.fecha(), r.servicio(), r.inversionUsd(),
                UsuarioActual.actual());
    }

    @PostMapping(path = "/postventa/mantenimientos/{id}/comprobante", consumes = "multipart/form-data")
    MantenimientoDto comprobante(@PathVariable Long id, @RequestParam MultipartFile archivo) {
        return service.adjuntarComprobante(id, archivo, UsuarioActual.actual());
    }

    @GetMapping("/postventa/mantenimientos/{id}/comprobante")
    org.springframework.http.ResponseEntity<byte[]> verComprobante(@PathVariable Long id) {
        var c = service.comprobante(id, UsuarioActual.actual());
        return org.springframework.http.ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.parseMediaType(c.contentType()))
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                        org.springframework.http.ContentDisposition.attachment().filename(c.nombre()).build().toString())
                .body(c.datos());
    }

    @GetMapping("/tickets")
    List<TicketDto> tickets() {
        return service.tickets(UsuarioActual.actual());
    }

    @PostMapping("/tickets")
    @ResponseStatus(HttpStatus.CREATED)
    TicketDto crear(@Valid @RequestBody TicketRequest r) {
        return service.crearTicket(new PostventaService.NuevoTicket(r.propiedadId(), r.titulo(), r.descripcion(),
                r.planoId(), r.pinX(), r.pinY(), r.prioridad()), UsuarioActual.actual());
    }

    @PatchMapping("/tickets/{id}/estado")
    TicketDto estado(@PathVariable Long id, @Valid @RequestBody EstadoRequest r) {
        return service.cambiarEstado(id, r.estado(), r.proveedor());
    }
}
