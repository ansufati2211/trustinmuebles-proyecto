package pe.trustinmuebles.expediente;

import org.springframework.web.bind.annotation.*;
import pe.trustinmuebles.expediente.CasoDtos.DetalleCaso;
import pe.trustinmuebles.expediente.CasoDtos.OpcionesFiltro;
import pe.trustinmuebles.expediente.CasoDtos.PaginaPublica;

/**
 * v1.0: portal público de solo lectura, sin sesión (ver SecurityConfig). Solo casos PUBLICADOS; un borrador, uno
 * retirado o uno inexistente dan 404. No hay escritura: sin sesión, cualquier otro método da 401.
 */
@RestController
@RequestMapping("/api/v1/publico")
class PublicoController {
    private final ExpedienteService servicio;
    private final ProyectoService proyectos;

    PublicoController(ExpedienteService servicio, ProyectoService proyectos) {
        this.servicio = servicio;
        this.proyectos = proyectos;
    }

    /**
     * Catálogo público en páginas de 24 (la primera es la 0), con filtros combinables y orden (etapa 2 de la v1.0):
     * proyecto, distrito, tipo (LOTE o VIVIENDA), estadoComercial, moneda con precioMin y precioMax, precioM2Min y
     * precioM2Max, areaMin y areaMax, indicadorA y tipoAlerta. Orden: novedad, precio, precioM2 o area, con sentido
     * asc o desc. Etapa 3a: la lista une los casos y los lotes de proyecto sin caso propio; {@code clase} (CASO o
     * LOTE_PROYECTO) limita a unos u otros.
     */
    @GetMapping("/inmuebles")
    PaginaPublica listar(@RequestParam(defaultValue = "0") int pagina, @RequestParam(required = false) String proyecto,
            @RequestParam(required = false) String distrito, @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String estadoComercial, @RequestParam(required = false) String moneda,
            @RequestParam(required = false) String precioMin, @RequestParam(required = false) String precioMax,
            @RequestParam(required = false) String precioM2Min, @RequestParam(required = false) String precioM2Max,
            @RequestParam(required = false) String areaMin, @RequestParam(required = false) String areaMax,
            @RequestParam(required = false) String indicadorA, @RequestParam(required = false) String tipoAlerta,
            @RequestParam(required = false) String orden, @RequestParam(required = false) String sentido,
            @RequestParam(required = false) String clase, @RequestParam(required = false) String zonificacion,
            @RequestParam(required = false) String uso, @RequestParam(required = false) String incluirSinZonificacion) {
        FiltroPublico filtro = FiltroPublico.de(proyecto, distrito, tipo, estadoComercial, moneda, precioMin, precioMax,
                precioM2Min, precioM2Max, areaMin, areaMax, indicadorA, tipoAlerta, orden, sentido, clase, zonificacion,
                uso, incluirSinZonificacion, servicio.codigosDeAlerta());
        return servicio.listarPublico(pagina, filtro);
    }

    /**
     * v1.0 (etapa 6): todos los inmuebles que cumplen los filtros (no solo los de una página), en forma compacta, para
     * que el asistente elija sus recomendaciones sobre el total. Los mismos filtros que el catálogo; sin vendidos; a lo
     * sumo {@value ExpedienteService#MAXIMO_RECOMENDABLES}, en el orden pedido.
     */
    @GetMapping("/inmuebles/recomendables")
    CasoDtos.Recomendables recomendables(@RequestParam(required = false) String proyecto,
            @RequestParam(required = false) String distrito, @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String estadoComercial, @RequestParam(required = false) String moneda,
            @RequestParam(required = false) String precioMin, @RequestParam(required = false) String precioMax,
            @RequestParam(required = false) String precioM2Min, @RequestParam(required = false) String precioM2Max,
            @RequestParam(required = false) String areaMin, @RequestParam(required = false) String areaMax,
            @RequestParam(required = false) String indicadorA, @RequestParam(required = false) String tipoAlerta,
            @RequestParam(required = false) String orden, @RequestParam(required = false) String sentido,
            @RequestParam(required = false) String clase, @RequestParam(required = false) String zonificacion,
            @RequestParam(required = false) String uso, @RequestParam(required = false) String incluirSinZonificacion) {
        FiltroPublico filtro = FiltroPublico.de(proyecto, distrito, tipo, estadoComercial, moneda, precioMin, precioMax,
                precioM2Min, precioM2Max, areaMin, areaMax, indicadorA, tipoAlerta, orden, sentido, clase, zonificacion,
                uso, incluirSinZonificacion, servicio.codigosDeAlerta());
        return servicio.recomendables(filtro);
    }

    // ------------------------------------------------- v1.0 (etapa 6): PDF de los casos publicados, sin sesión

    /** Ficha registral del inmueble, con el número de partida parcialmente oculto. Borrador o retirado: 404. */
    @GetMapping("/inmuebles/{codigo}/documento")
    org.springframework.http.ResponseEntity<byte[]> fichaRegistral(@PathVariable String codigo) {
        return pdf(servicio.fichaRegistralPublica(codigo));
    }

    /** Lámina de un plano presentado u observado de un caso publicado. */
    @GetMapping("/inmuebles/{codigo}/planos/{especialidad}/documento")
    org.springframework.http.ResponseEntity<byte[]> plano(@PathVariable String codigo,
            @PathVariable pe.trustinmuebles.clasificacion.Especialidad especialidad) {
        return pdf(servicio.planoDocumentoPublico(codigo, especialidad));
    }

    /** Documento del lote de un caso publicado. El informe técnico (B) no se ofrece aquí: sigue pidiendo sesión. */
    @GetMapping("/inmuebles/{codigo}/documentos-lote/{tipo}/documento")
    org.springframework.http.ResponseEntity<byte[]> documentoDelLote(@PathVariable String codigo,
            @PathVariable pe.trustinmuebles.clasificacion.DocumentoLote tipo) {
        return pdf(servicio.documentoLotePublico(codigo, tipo));
    }

    private static org.springframework.http.ResponseEntity<byte[]> pdf(ExpedienteService.DocumentoPlano d) {
        return org.springframework.http.ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'; sandbox")
                .header("X-Robots-Tag", "noindex")
                .header("Content-Disposition", "inline; filename=\"" + d.nombre() + "\"")
                .cacheControl(org.springframework.http.CacheControl.noStore())
                .body(d.datos());
    }

    /** Valores de los selectores de filtro: proyectos, distritos y tipos de alerta. */
    @GetMapping("/filtros")
    OpcionesFiltro filtros() {
        return servicio.opcionesFiltro();
    }

    /** Ficha pública: lo que ve el comprador, sin semáforo de gestión ni código del propietario. */
    @GetMapping("/inmuebles/{codigo}")
    DetalleCaso detalle(@PathVariable String codigo) {
        return servicio.detallePublico(codigo);
    }

    /** v1.0 (etapa 3a): página pública de un proyecto (plano de lotes, recorrido, hitos y documentos). */
    @GetMapping("/proyectos/{codigo}")
    ProyectoDtos.ProyectoPublico proyecto(@PathVariable String codigo) {
        return proyectos.publico(codigo);
    }

    /** v1.0 (etapa 3a): ficha pública de un lote de proyecto, por su clave («A-7»). */
    @GetMapping("/proyectos/{codigo}/lotes/{lote}")
    ProyectoDtos.LotePublico lote(@PathVariable String codigo, @PathVariable String lote) {
        return proyectos.lotePublico(codigo, lote);
    }

    /** v1.0 (etapa 3a): un documento del proyecto (de su partida matriz), en PDF. */
    @GetMapping("/proyectos/{codigo}/documentos/{tipo}")
    org.springframework.http.ResponseEntity<byte[]> documento(@PathVariable String codigo,
            @PathVariable pe.trustinmuebles.clasificacion.DocumentoLote tipo) {
        ExpedienteService.DocumentoPlano d = proyectos.documentoPublico(codigo, tipo);
        return org.springframework.http.ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'; sandbox")
                .header("Content-Disposition", "inline; filename=\"" + d.nombre() + "\"")
                .cacheControl(org.springframework.http.CacheControl.noStore())
                .body(d.datos());
    }
}
