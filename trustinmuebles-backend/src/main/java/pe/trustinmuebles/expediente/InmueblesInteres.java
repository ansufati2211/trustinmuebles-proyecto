package pe.trustinmuebles.expediente;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.trustinmuebles.expediente.ProyectoDtos.LoteDto;
import pe.trustinmuebles.shared.NoEncontradoException;
import pe.trustinmuebles.shared.ReglaNegocioException;

/**
 * v1.0 (etapa 4): API pública del módulo de expedientes para el módulo de interés (interesados y citas). Resuelve a qué
 * se refiere un interés (un caso publicado, un lote de proyecto que se ofrece o un proyecto visible) y permite al asesor
 * marcar el inmueble como separado o vendido con una acción explícita. Nada de esto toca el motor de reglas: el estado
 * comercial es informativo y no cambia el indicador A.
 */
@Service
@Transactional(readOnly = true)
public class InmueblesInteres {
    /** Un inmueble o proyecto visto desde el módulo de interés. {@code referencia} es el código que ve el comprador. */
    public record Referencia(Clase clase, String referencia, String nombre, String casoCodigo, String proyectoCodigo,
            String proyectoNombre, String loteClave, String distrito, String tipo, EstadoComercial estadoComercial) {}

    public enum Clase { CASO, LOTE, PROYECTO }

    /** Proyecto para los selectores de la bandeja. */
    public record ProyectoOpcion(String codigo, String nombre, String distrito) {}

    private final ExpedienteRepository expedientes;
    private final CasoLoteRepository casos;
    private final ProyectoRepository proyectos;
    private final ProyectoService proyectoService;

    InmueblesInteres(ExpedienteRepository expedientes, CasoLoteRepository casos, ProyectoRepository proyectos,
            ProyectoService proyectoService) {
        this.expedientes = expedientes;
        this.casos = casos;
        this.proyectos = proyectos;
        this.proyectoService = proyectoService;
    }

    /** Un caso PUBLICADO (otro estado o un código inexistente: vacío, como en el catálogo). */
    public Optional<Referencia> casoPublicado(String codigo) {
        if (codigo == null) return Optional.empty();
        return expedientes.findByCasoCodigo(codigo.trim())
                .filter(e -> e.getCaso().getEstadoPublicacion() == EstadoPublicacion.PUBLICADO)
                .map(InmueblesInteres::deCaso);
    }

    /** Un lote de proyecto que se ofrece en línea. Si tiene caso propio publicado, la referencia es ese caso. */
    public Optional<Referencia> loteOfrecido(String proyectoCodigo, String clave) {
        if (proyectoCodigo == null || clave == null) return Optional.empty();
        try {
            ProyectoDtos.LotePublico l = proyectoService.lotePublico(proyectoCodigo.trim(), clave.trim());
            if (l.lote().casoCodigo() != null) return casoPublicado(l.lote().casoCodigo());
            return Optional.of(deLote(l.proyectoCodigo(), l.proyectoNombre(), l.predio().distrito(), l.lote(),
                    l.denominacion()));
        } catch (NoEncontradoException e) {
            return Optional.empty();
        }
    }

    /** Un proyecto que se ve en el portal (ofrece lotes o tiene inmuebles publicados). */
    public Optional<Referencia> proyectoVisible(String codigo) {
        if (codigo == null) return Optional.empty();
        try {
            ProyectoDtos.ProyectoPublico p = proyectoService.publico(codigo.trim());
            return Optional.of(new Referencia(Clase.PROYECTO, p.codigo(), "Proyecto " + p.nombre(), null, p.codigo(),
                    p.nombre(), null, p.distrito(), "LOTE", null));
        } catch (NoEncontradoException e) {
            return Optional.empty();
        }
    }

    /** Lotes que se ofrecen en un proyecto, disponibles, en orden de manzana y número (para la precarga). */
    public List<Referencia> lotesDisponibles(String proyectoCodigo) {
        List<Referencia> salida = new ArrayList<>();
        try {
            ProyectoDtos.ProyectoPublico p = proyectoService.publico(proyectoCodigo);
            for (LoteDto l : p.lotes()) {
                if (l.publicado() && l.casoCodigo() == null && l.estadoComercial() == EstadoComercial.DISPONIBLE) {
                    salida.add(deLote(p.codigo(), p.nombre(), p.distrito(), l,
                            "Mz. " + l.manzana() + " Lote " + l.numero() + " · " + p.nombre()));
                }
            }
        } catch (NoEncontradoException e) {
            return List.of();
        }
        return salida;
    }

    /** Casos publicados, por código (para la precarga). */
    public List<Referencia> casosPublicados() {
        return expedientes.findPublicados().stream().map(InmueblesInteres::deCaso)
                .sorted(java.util.Comparator.comparing(Referencia::referencia)).toList();
    }

    public List<ProyectoOpcion> proyectos() {
        return proyectos.findAllByOrderByNombreAsc().stream()
                .map(p -> new ProyectoOpcion(p.getCodigo(), p.getNombre(), p.getDistrito())).toList();
    }

    /**
     * Acción explícita del asesor: marca el lote o el caso como SEPARADO o VENDIDO. En un lote con caso propio el estado
     * vive en el caso (como en la etapa 3a). Es informativo y no cambia el indicador A.
     */
    @Transactional
    public EstadoComercial marcarEstado(String casoCodigo, String proyectoCodigo, String loteClave,
            EstadoComercial estado) {
        if (casoCodigo != null) {
            CasoLote c = casos.findByCodigo(casoCodigo).orElseThrow(() -> new NoEncontradoException("Caso", casoCodigo));
            c.setEstadoComercial(estado);
            casos.saveAndFlush(c);
            return estado;
        }
        if (proyectoCodigo != null && loteClave != null) {
            return proyectoService.cambiarEstado(proyectoCodigo, loteClave, estado).estadoComercial();
        }
        throw new ReglaNegocioException("El interesado no está vinculado a un lote ni a un inmueble");
    }

    private static Referencia deCaso(Expediente e) {
        CasoLote c = e.getCaso();
        TipoInmueble t = TipoInmueble.de(e.getTipoPredio());
        return new Referencia(Clase.CASO, c.getCodigo(), c.getDenominacion(), c.getCodigo(), c.getProyectoCodigo(),
                c.getProyecto(), null, c.getDistrito(), t == TipoInmueble.VIVIENDA_URBANA ? "VIVIENDA" : "LOTE",
                c.getEstadoComercial());
    }

    private static Referencia deLote(String proyecto, String nombreProyecto, String distrito, LoteDto l, String nombre) {
        return new Referencia(Clase.LOTE, l.codigo(), nombre, null, proyecto, nombreProyecto, l.clave(), distrito, "LOTE",
                l.estadoComercial());
    }
}
