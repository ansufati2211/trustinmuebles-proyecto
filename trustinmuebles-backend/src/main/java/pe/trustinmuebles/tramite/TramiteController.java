package pe.trustinmuebles.tramite;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pe.trustinmuebles.almacenamiento.ArchivoContenido;
import pe.trustinmuebles.identidad.UsuarioActual;
import pe.trustinmuebles.tramite.TramiteDtos.*;

@RestController
@RequestMapping("/api/v1")
class TramiteController {
    record NuevaTransaccion(@NotNull Long inmuebleId) {}

    record EtapaRequest(@NotNull EtapaTramite etapa) {}

    record MensajeRequest(@NotBlank @jakarta.validation.constraints.Size(max = 2000) String texto) {}

    private final TramiteService service;

    TramiteController(TramiteService service) {
        this.service = service;
    }

    @PostMapping("/transacciones")
    @ResponseStatus(HttpStatus.CREATED)
    Detalle crear(@Valid @RequestBody NuevaTransaccion r) {
        return service.crear(r.inmuebleId(), UsuarioActual.actual());
    }

    @GetMapping("/transacciones/mias")
    List<Resumen> mias() {
        return service.mias(UsuarioActual.actual());
    }

    @GetMapping("/transacciones/{id}")
    Detalle detalle(@PathVariable Long id) {
        return service.detalle(id, UsuarioActual.actual());
    }

    @PatchMapping("/transacciones/{id}/etapa")
    Detalle etapa(@PathVariable Long id, @Valid @RequestBody EtapaRequest r) {
        return service.cambiarEtapa(id, r.etapa(), UsuarioActual.actual());
    }

    @PostMapping(path = "/transacciones/{id}/documentos", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    DocumentoDto subir(@PathVariable Long id, @RequestParam MultipartFile archivo,
            @RequestParam(required = false) String tipo) {
        return service.subirDocumento(id, tipo, archivo, UsuarioActual.actual());
    }

    @GetMapping("/documentos/{id}/descarga")
    ResponseEntity<byte[]> descargar(@PathVariable Long id) {
        ArchivoContenido c = service.descargar(id, UsuarioActual.actual());
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(c.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(c.nombre()).build().toString())
                .body(c.datos());
    }

    @PostMapping("/documentos/{id}/firmar")
    Detalle firmar(@PathVariable Long id) {
        return service.firmar(id, UsuarioActual.actual());
    }

    @PostMapping("/transacciones/{id}/mensajes")
    @ResponseStatus(HttpStatus.CREATED)
    MensajeDto mensaje(@PathVariable Long id, @Valid @RequestBody MensajeRequest r) {
        return service.enviarMensaje(id, r.texto(), UsuarioActual.actual());
    }

    @GetMapping("/transacciones/{id}/integridad")
    Integridad integridad(@PathVariable Long id) {
        return service.verificarIntegridad(id, UsuarioActual.actual());
    }
}
