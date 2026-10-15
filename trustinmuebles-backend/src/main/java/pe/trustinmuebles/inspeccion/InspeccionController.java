package pe.trustinmuebles.inspeccion;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import pe.trustinmuebles.shared.NivelRiesgo;

@RestController
@RequestMapping("/api/v1/inspecciones")
class InspeccionController {
    record PinRequest(@NotNull Double x, @NotNull Double y, @NotNull NivelRiesgo severidad,
            @NotBlank @jakarta.validation.constraints.Size(max = 200) String titulo,
            @jakarta.validation.constraints.Size(max = 1000) String descripcion) {}

    record CierreRequest(@NotBlank @jakarta.validation.constraints.Size(max = 2000) String dictamen) {}

    private final InspeccionService service;

    InspeccionController(InspeccionService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    InspeccionDto detalle(@PathVariable Long id) {
        return service.detalle(id);
    }

    @PostMapping("/{id}/pines")
    @ResponseStatus(HttpStatus.CREATED)
    InspeccionDto pin(@PathVariable Long id, @Valid @RequestBody PinRequest r) {
        return service.agregarPin(id,
                new InspeccionService.NuevoPin(r.x(), r.y(), r.severidad(), r.titulo(), r.descripcion()));
    }

    @PatchMapping("/{id}/cerrar")
    InspeccionDto cerrar(@PathVariable Long id, @Valid @RequestBody CierreRequest r) {
        return service.cerrar(id, r.dictamen());
    }
}
