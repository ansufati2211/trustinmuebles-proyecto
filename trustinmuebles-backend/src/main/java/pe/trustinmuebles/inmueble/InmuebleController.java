package pe.trustinmuebles.inmueble;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pe.trustinmuebles.inmueble.InmuebleDtos.*;
import pe.trustinmuebles.semaforo.EvaluacionLegalDto;
import pe.trustinmuebles.semaforo.PartidaTraducida;
import pe.trustinmuebles.shared.NoEncontradoException;

@RestController
@RequestMapping("/api/v1/inmuebles")
class InmuebleController {
    record InspeccionRequest(@jakarta.validation.constraints.NotNull Long planoId) {}

    private final InmuebleService service;
    private final pe.trustinmuebles.identidad.AuthService auth;

    InmuebleController(InmuebleService service, pe.trustinmuebles.identidad.AuthService auth) {
        this.service = service;
        this.auth = auth;
    }

    @GetMapping
    List<Tarjeta> listar(@RequestParam(required = false) BigDecimal precioMin,
            @RequestParam(required = false) BigDecimal precioMax, @RequestParam(required = false) BigDecimal areaMin,
            @RequestParam(required = false) Integer habitaciones, @RequestParam(required = false) Integer banos,
            @RequestParam(required = false) String q, @RequestParam(defaultValue = "false") boolean soloVerdes) {
        return service.listar(precioMin, precioMax, areaMin, habitaciones, banos, q, soloVerdes);
    }

    @GetMapping("/{id}")
    Detalle detalle(@PathVariable Long id) {
        return service.detalle(id);
    }

    @GetMapping("/{id}/partida")
    PartidaTraducida partida(@PathVariable Long id) {
        return service.partida(id);
    }

    @GetMapping("/{id}/semaforo")
    EvaluacionLegalDto semaforo(@PathVariable Long id) {
        return service.semaforo(id);
    }

    @PostMapping("/{id}/semaforo/evaluar")
    EvaluacionLegalDto evaluar(@PathVariable Long id) {
        return service.evaluar(id);
    }

    @GetMapping("/{id}/inspeccion")
    InspeccionVista inspeccion(@PathVariable Long id) {
        return service.detalle(id).inspeccion();
    }

    @PostMapping("/{id}/inspecciones")
    @ResponseStatus(HttpStatus.CREATED)
    pe.trustinmuebles.inspeccion.InspeccionDto crearInspeccion(@PathVariable Long id,
            @Valid @RequestBody InspeccionRequest r) {
        String nombre = auth.obtener(pe.trustinmuebles.identidad.UsuarioActual.actual().id()).nombre();
        return service.crearInspeccion(id, r.planoId(), nombre);
    }

    @GetMapping("/{id}/planos")
    List<PlanoDto> planos(@PathVariable Long id) {
        return service.planos(id);
    }

    @PostMapping(path = "/{id}/planos", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    PlanoDto subirPlano(@PathVariable Long id, @RequestParam MultipartFile archivo,
            @RequestParam(required = false) String nombre) {
        return service.subirPlano(id, nombre, archivo);
    }
}
