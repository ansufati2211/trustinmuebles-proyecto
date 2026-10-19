package pe.trustinmuebles.expediente;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pe.trustinmuebles.almacenamiento.ArchivoContenido;
import pe.trustinmuebles.checklist.ItemChecklistDto;
import pe.trustinmuebles.clasificacion.Especialidad;
import pe.trustinmuebles.inspeccion.EvaluacionTecnicaDto;
import pe.trustinmuebles.expediente.CasoDtos.*;

/** API interna HTTP/JSON de casos. Las operaciones de escritura exigen el rol REVISOR (ver SecurityConfig). */
@RestController
@RequestMapping("/api/v1/casos")
class CasoController {
    private final ExpedienteService servicio;

    CasoController(ExpedienteService servicio) {
        this.servicio = servicio;
    }

    @GetMapping
    List<ResumenCaso> listar() {
        return servicio.listar();
    }

    @PostMapping
    ResponseEntity<DetalleCaso> registrar(@Valid @RequestBody RegistrarPartidaRequest req) {
        return ResponseEntity.status(201).body(servicio.registrar(req));
    }

    @DeleteMapping("/{codigo}")
    ResponseEntity<Void> eliminar(@PathVariable String codigo) {
        servicio.eliminar(codigo);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{codigo}")
    DetalleCaso detalle(@PathVariable String codigo) {
        return servicio.detalle(codigo);
    }

    @PutMapping("/{codigo}/expediente")
    DetalleCaso actualizar(@PathVariable String codigo, @Valid @RequestBody ActualizarExpedienteRequest req) {
        return servicio.actualizar(codigo, req);
    }

    @PatchMapping("/{codigo}/checklist/{itemId}")
    ItemChecklistDto cambiarItem(@PathVariable String codigo, @PathVariable Long itemId,
            @Valid @RequestBody CambiarItemRequest req) {
        return servicio.cambiarItem(codigo, itemId, req);
    }

    @PostMapping(value = "/{codigo}/documento", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ResponseEntity<DocumentoDto> subirDocumento(@PathVariable String codigo,
            @RequestParam("documento") MultipartFile documento) {
        return ResponseEntity.status(201).body(servicio.asociarDocumento(codigo, documento));
    }

    @GetMapping("/{codigo}/documento")
    ResponseEntity<byte[]> documento(@PathVariable String codigo) {
        ArchivoContenido c = servicio.documento(codigo);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'; sandbox")
                .header("Content-Disposition", "inline; filename=\"" + codigo + ".pdf\"")
                .cacheControl(CacheControl.noStore())
                .body(c.datos());
    }

    // ---------------------------------------------------- inspección técnica y planos

    @PostMapping("/{codigo}/inspeccion/solicitud")
    ResponseEntity<EvaluacionTecnicaDto> solicitarInspeccion(@PathVariable String codigo) {
        return ResponseEntity.status(201).body(servicio.solicitarInspeccion(codigo));
    }

    @PutMapping("/{codigo}/inspeccion")
    DetalleCaso registrarInforme(@PathVariable String codigo, @Valid @RequestBody InformeRequest req) {
        return servicio.registrarInforme(codigo, req.datos());
    }

    @GetMapping("/{codigo}/planos/{especialidad}/documento")
    ResponseEntity<byte[]> planoDocumento(@PathVariable String codigo, @PathVariable Especialidad especialidad) {
        ExpedienteService.DocumentoPlano d = servicio.planoDocumento(codigo, especialidad);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'; sandbox")
                .header("Content-Disposition", "inline; filename=\"" + d.nombre() + "\"")
                .cacheControl(CacheControl.noStore())
                .body(d.datos());
    }

    @PostMapping(value = "/{codigo}/planos/{especialidad}/documento", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ResponseEntity<DocumentoDto> subirPlano(@PathVariable String codigo, @PathVariable Especialidad especialidad,
            @RequestParam("documento") MultipartFile documento) {
        return ResponseEntity.status(201).body(servicio.asociarDocumentoPlano(codigo, especialidad, documento));
    }
}
