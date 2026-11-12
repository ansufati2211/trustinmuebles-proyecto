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

    PublicoController(ExpedienteService servicio) {
        this.servicio = servicio;
    }

    /**
     * Catálogo público en páginas de 24 (la primera es la 0), con filtros combinables y orden (etapa 2 de la v1.0):
     * proyecto, distrito, tipo (LOTE o VIVIENDA), estadoComercial, moneda con precioMin y precioMax, precioM2Min y
     * precioM2Max, areaMin y areaMax, indicadorA y tipoAlerta. Orden: novedad, precio, precioM2 o area, con sentido
     * asc o desc.
     */
    @GetMapping("/inmuebles")
    PaginaPublica listar(@RequestParam(defaultValue = "0") int pagina, @RequestParam(required = false) String proyecto,
            @RequestParam(required = false) String distrito, @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String estadoComercial, @RequestParam(required = false) String moneda,
            @RequestParam(required = false) String precioMin, @RequestParam(required = false) String precioMax,
            @RequestParam(required = false) String precioM2Min, @RequestParam(required = false) String precioM2Max,
            @RequestParam(required = false) String areaMin, @RequestParam(required = false) String areaMax,
            @RequestParam(required = false) String indicadorA, @RequestParam(required = false) String tipoAlerta,
            @RequestParam(required = false) String orden, @RequestParam(required = false) String sentido) {
        FiltroPublico filtro = FiltroPublico.de(proyecto, distrito, tipo, estadoComercial, moneda, precioMin, precioMax,
                precioM2Min, precioM2Max, areaMin, areaMax, indicadorA, tipoAlerta, orden, sentido,
                servicio.codigosDeAlerta());
        return servicio.listarPublico(pagina, filtro);
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
}
