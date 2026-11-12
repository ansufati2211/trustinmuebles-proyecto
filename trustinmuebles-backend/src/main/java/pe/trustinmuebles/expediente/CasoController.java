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
import pe.trustinmuebles.clasificacion.DocumentoLote;
import pe.trustinmuebles.clasificacion.Especialidad;
import pe.trustinmuebles.clasificacion.HistorialEvaluacionDto;
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

    /**
     * Catálogo. Filtros opcionales y combinables (M13): tipoInmueble (VIVIENDA_URBANA, LOTE_URBANO), estado
     * (indicador A: VERDE, AMARILLO, ROJO, GRIS), estadoTecnico (indicador B: NO_SOLICITADA, SOLICITADA,
     * EN_INSPECCION, EMITIDO o su alias INFORME_EMITIDO), riesgoFisicoDetectado (true o false) y, desde la v0.8,
     * tipoAlerta (código de una regla, por ejemplo RV-02, o INFORMACION_INSUFICIENTE).
     */
    @GetMapping
    List<ResumenCaso> listar(@RequestParam(required = false) String tipoInmueble,
            @RequestParam(required = false) String estado, @RequestParam(required = false) String estadoTecnico,
            @RequestParam(required = false) Boolean riesgoFisicoDetectado,
            @RequestParam(required = false) String tipoAlerta) {
        return servicio.listar(tipoInmueble, estado, estadoTecnico, riesgoFisicoDetectado, tipoAlerta);
    }

    /** v0.8: tipos de alerta para el filtro (código y nombre de cada regla, más «información insuficiente»). */
    @GetMapping("/tipos-alerta")
    List<pe.trustinmuebles.clasificacion.TipoAlerta> tiposAlerta() {
        return servicio.tiposDeAlerta();
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

    /** v0.8: ruta de regularización orientativa, de solo lectura. Misma visibilidad que el detalle. */
    @GetMapping("/{codigo}/ruta-regularizacion")
    RutaRegularizacion ruta(@PathVariable String codigo) {
        return servicio.ruta(codigo);
    }

    /** Historial de evaluaciones del indicador A, solo lectura (I12). No existe ruta para editarlo ni borrarlo. */
    @GetMapping("/{codigo}/historial")
    List<HistorialEvaluacionDto> historial(@PathVariable String codigo) {
        return servicio.historial(codigo);
    }

    // ---------------------------------------------------- captación y publicación (v0.7)

    /**
     * Solo el PROPIETARIO del caso otorga su autorización (I13). v1.0: en un caso de la INMOBILIARIA la registran el
     * asesor o el gestor en su nombre.
     */
    @PutMapping("/{codigo}/autorizacion")
    PublicacionDto autorizar(@PathVariable String codigo) {
        return servicio.autorizar(codigo);
    }

    /** Solo el PROPIETARIO del caso la retira; un caso publicado pasa a RETIRADO (I14). */
    @DeleteMapping("/{codigo}/autorizacion")
    PublicacionDto retirarAutorizacion(@PathVariable String codigo) {
        return servicio.retirarAutorizacion(codigo);
    }

    /** Solo el GESTOR publica, con autorización vigente y sin importar el color del indicador A (I10). */
    @PostMapping("/{codigo}/publicacion")
    PublicacionDto publicar(@PathVariable String codigo) {
        return servicio.publicar(codigo);
    }

    @DeleteMapping("/{codigo}/publicacion")
    PublicacionDto retirarPublicacion(@PathVariable String codigo) {
        return servicio.retirarPublicacion(codigo);
    }

    /** v1.0: historial de autorizaciones (autor, en nombre de quién y fecha). Solo lectura; nunca el comprador. */
    @GetMapping("/{codigo}/autorizaciones")
    List<AutorizacionDto> autorizaciones(@PathVariable String codigo) {
        return servicio.autorizaciones(codigo);
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

    /** v0.7: solo el GESTOR asigna un especialista a una inspección solicitada o en curso. */
    @PutMapping("/{codigo}/inspeccion/asignacion")
    EvaluacionTecnicaDto asignar(@PathVariable String codigo, @Valid @RequestBody AsignarEspecialistaRequest req) {
        return servicio.asignarEspecialista(codigo, req.especialistaCodigo());
    }

    @GetMapping("/{codigo}/inspeccion/documento")
    ResponseEntity<byte[]> informeDocumento(@PathVariable String codigo) {
        ExpedienteService.DocumentoPlano d = servicio.informeDocumento(codigo);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'; sandbox")
                .header("Content-Disposition", "inline; filename=\"" + d.nombre() + "\"")
                .cacheControl(CacheControl.noStore())
                .body(d.datos());
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

    /** v0.9: PDF de un documento del lote (plano perimétrico, memoria descriptiva, zonificación o tasación). */
    @GetMapping("/{codigo}/documentos-lote/{tipo}/documento")
    ResponseEntity<byte[]> documentoLote(@PathVariable String codigo, @PathVariable DocumentoLote tipo) {
        ExpedienteService.DocumentoPlano d = servicio.documentoLote(codigo, tipo);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'; sandbox")
                .header("Content-Disposition", "inline; filename=\"" + d.nombre() + "\"")
                .cacheControl(CacheControl.noStore())
                .body(d.datos());
    }

    @PostMapping(value = "/{codigo}/documentos-lote/{tipo}/documento", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ResponseEntity<DocumentoDto> subirDocumentoLote(@PathVariable String codigo, @PathVariable DocumentoLote tipo,
            @RequestParam("documento") MultipartFile documento) {
        return ResponseEntity.status(201).body(servicio.asociarDocumentoLote(codigo, tipo, documento));
    }
}
