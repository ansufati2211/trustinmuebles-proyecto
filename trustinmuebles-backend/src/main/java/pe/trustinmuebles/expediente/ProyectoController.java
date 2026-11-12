package pe.trustinmuebles.expediente;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pe.trustinmuebles.expediente.CargaLotesDtos.HistorialLoteDto;
import pe.trustinmuebles.expediente.CargaLotesDtos.ResultadoCarga;
import pe.trustinmuebles.expediente.CargaLotesDtos.VistaPreviaCarga;
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
    private final CargaLotesService carga;

    ProyectoController(ProyectoService servicio, CargaLotesService carga) {
        this.servicio = servicio;
        this.carga = carga;
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

    // ------------------------------------------------------------------ carga masiva de lotes (etapa 3b)

    /** Plantilla del CSV: el encabezado y una fila de ejemplo. Solo gestor y asesor. */
    @GetMapping(value = "/{codigo}/lotes/plantilla.csv", produces = "text/csv")
    ResponseEntity<byte[]> plantilla(@PathVariable String codigo) {
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .header("Content-Disposition", "attachment; filename=\"plantilla-lotes.csv\"")
                .header("X-Content-Type-Options", "nosniff").cacheControl(CacheControl.noStore())
                .body(CargaLotesService.PLANTILLA.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    /** Revisa el archivo sin guardar nada: qué se crearía o cambiaría y los errores de cada fila. */
    @PostMapping(value = "/{codigo}/lotes/carga/vista-previa", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    VistaPreviaCarga vistaPrevia(@PathVariable String codigo, @RequestParam("archivo") MultipartFile archivo)
            throws java.io.IOException {
        return carga.vistaPrevia(codigo, archivo.getBytes());
    }

    /** Confirma la carga: todo o nada. Si el archivo tiene algún error, 422 y no se guarda nada. */
    @PostMapping(value = "/{codigo}/lotes/carga", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ResultadoCarga confirmar(@PathVariable String codigo, @RequestParam("archivo") MultipartFile archivo)
            throws java.io.IOException {
        return carga.confirmar(codigo, archivo.getBytes());
    }

    /** Historial de los cambios hechos a un lote por carga masiva. */
    @GetMapping("/{codigo}/lotes/{lote}/historial")
    List<HistorialLoteDto> historial(@PathVariable String codigo, @PathVariable String lote) {
        return carga.historial(codigo, lote);
    }
}
