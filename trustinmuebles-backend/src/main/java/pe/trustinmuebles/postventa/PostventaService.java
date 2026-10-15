package pe.trustinmuebles.postventa;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.context.event.EventListener;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import pe.trustinmuebles.almacenamiento.AlmacenamientoService;
import pe.trustinmuebles.identidad.AuthService;
import pe.trustinmuebles.identidad.UsuarioActual;
import pe.trustinmuebles.inmueble.InmuebleDtos;
import pe.trustinmuebles.inmueble.InmuebleService;
import pe.trustinmuebles.postventa.PostventaDtos.*;
import pe.trustinmuebles.shared.NoEncontradoException;
import pe.trustinmuebles.shared.ReglaNegocioException;
import pe.trustinmuebles.tramite.TramiteService;
import pe.trustinmuebles.tramite.TransaccionFinalizada;

/** API pública del módulo de postventa y protección patrimonial (REQ-F04). */
@Service
@Transactional
public class PostventaService {
    public record NuevoTicket(Long propiedadId, String titulo, String descripcion, Long planoId, Double pinX,
            Double pinY, PrioridadTicket prioridad) {}

    /** Crecimiento anual referencial del valor del inmueble (estimación simple, no es una tasación). */
    static final BigDecimal PLUSVALIA_ANUAL = new BigDecimal("0.04");
    /** Fracción de lo invertido en mantenimiento que se reconoce como valor agregado. */
    static final BigDecimal FACTOR_MANTENIMIENTO = new BigDecimal("0.5");

    private final PropiedadRepository propiedades;
    private final MantenimientoRepository mantenimientos;
    private final TicketRepository tickets;
    private final TramiteService tramites;
    private final InmuebleService inmuebles;
    private final AuthService auth;
    private final AlmacenamientoService almacenamiento;

    PostventaService(PropiedadRepository propiedades, MantenimientoRepository mantenimientos,
            TicketRepository tickets, TramiteService tramites, InmuebleService inmuebles, AuthService auth,
            AlmacenamientoService almacenamiento) {
        this.propiedades = propiedades;
        this.mantenimientos = mantenimientos;
        this.tickets = tickets;
        this.tramites = tramites;
        this.inmuebles = inmuebles;
        this.auth = auth;
        this.almacenamiento = almacenamiento;
    }

    /** Al finalizar el trámite, la propiedad pasa al patrimonio del comprador. */
    @EventListener
    void alFinalizarTransaccion(TransaccionFinalizada e) {
        if (propiedades.existsByTransaccionId(e.transaccionId())) return;
        PropiedadAdquirida p = new PropiedadAdquirida();
        p.setUsuarioId(e.compradorId());
        p.setInmuebleId(e.inmuebleId());
        p.setTransaccionId(e.transaccionId());
        p.setFechaCompra(Instant.now().truncatedTo(ChronoUnit.MILLIS));
        p.setValorCompra(e.precio());
        propiedades.save(p);
    }

    // ---------------------------------------------------------------- resumen patrimonial

    @Transactional(readOnly = true)
    public ResumenPostventa resumen(UsuarioActual actor) {
        List<PropiedadDto> lista = propiedades.findByUsuarioIdOrderByFechaCompraDesc(actor.id()).stream()
                .map(this::aDto).toList();
        return new ResumenPostventa(auth.obtener(actor.id()).nombre(), lista);
    }

    @Transactional(readOnly = true)
    public Dossier dossier(Long inmuebleId, UsuarioActual actor) {
        PropiedadAdquirida p = propiedades.findByUsuarioIdAndInmuebleId(actor.id(), inmuebleId)
                .orElseThrow(() -> new NoEncontradoException("Propiedad adquirida del inmueble", inmuebleId));
        List<MantenimientoDto> mant = mantenimientos.findByPropiedadIdOrderByFechaDescIdDesc(p.getId()).stream()
                .map(PostventaService::aDto).toList();
        BigDecimal total = mant.stream().map(MantenimientoDto::inversionUsd).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new Dossier(aDto(p), inmuebles.detalle(inmuebleId), mant,
                tickets.findByPropiedadIdOrderByCreadoEnDesc(p.getId()).stream().map(PostventaService::aDto).toList(),
                Instant.now(), total);
    }

    // ---------------------------------------------------------------- mantenimientos

    @Transactional(readOnly = true)
    public List<MantenimientoDto> mantenimientos(Long propiedadId, UsuarioActual actor) {
        propiedadPropia(propiedadId, actor);
        return mantenimientos.findByPropiedadIdOrderByFechaDescIdDesc(propiedadId).stream()
                .map(PostventaService::aDto).toList();
    }

    public MantenimientoDto registrarMantenimiento(Long propiedadId, LocalDate fecha, String servicio,
            BigDecimal inversion, UsuarioActual actor) {
        propiedadPropia(propiedadId, actor);
        if (inversion.signum() < 0) throw new IllegalArgumentException("La inversión no puede ser negativa");
        Mantenimiento m = new Mantenimiento();
        m.setPropiedadId(propiedadId);
        m.setFecha(fecha);
        m.setServicio(servicio);
        m.setInversionUsd(inversion);
        return aDto(mantenimientos.save(m));
    }

    public MantenimientoDto adjuntarComprobante(Long mantenimientoId, MultipartFile archivo, UsuarioActual actor) {
        Mantenimiento m = mantenimientos.findById(mantenimientoId)
                .orElseThrow(() -> new NoEncontradoException("Mantenimiento", mantenimientoId));
        propiedadPropia(m.getPropiedadId(), actor);
        m.setComprobanteArchivoId(almacenamiento.guardar(archivo, false).id());
        return aDto(m);
    }

    @Transactional(readOnly = true)
    public pe.trustinmuebles.almacenamiento.ArchivoContenido comprobante(Long mantenimientoId, UsuarioActual actor) {
        Mantenimiento m = mantenimientos.findById(mantenimientoId)
                .orElseThrow(() -> new NoEncontradoException("Mantenimiento", mantenimientoId));
        propiedadPropia(m.getPropiedadId(), actor);
        if (m.getComprobanteArchivoId() == null) throw new NoEncontradoException("Comprobante", mantenimientoId);
        return almacenamiento.leer(m.getComprobanteArchivoId());
    }

    // ---------------------------------------------------------------- tickets de garantía

    /**
     * RN-02: todo ticket debe estar vinculado a una transacción finalizada y a un plano 2D de la vivienda.
     */
    public TicketDto crearTicket(NuevoTicket n, UsuarioActual actor) {
        PropiedadAdquirida p = propiedadPropia(n.propiedadId(), actor);
        if (!tramites.estado(p.getTransaccionId()).finalizada()) {
            throw new ReglaNegocioException("RN-02: solo se pueden crear tickets de una transacción finalizada");
        }
        var planos = inmuebles.planos(p.getInmuebleId());
        Long planoId = n.planoId() != null ? n.planoId() : planos.stream().findFirst().map(x -> x.id()).orElse(null);
        if (planoId == null || planos.stream().noneMatch(x -> x.id().equals(planoId))) {
            throw new ReglaNegocioException("RN-02: el ticket debe vincularse a un plano 2D de la vivienda");
        }
        if ((n.pinX() == null) != (n.pinY() == null)
                || (n.pinX() != null && (n.pinX() < 0 || n.pinX() > 1 || n.pinY() < 0 || n.pinY() > 1))) {
            throw new IllegalArgumentException("El pin debe tener x e y entre 0 y 1");
        }
        Instant ahora = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        TicketGarantia t = new TicketGarantia();
        t.setPropiedadId(p.getId());
        t.setTransaccionId(p.getTransaccionId());
        t.setPlanoId(planoId);
        t.setPinX(n.pinX());
        t.setPinY(n.pinY());
        t.setTitulo(n.titulo());
        t.setDescripcion(n.descripcion());
        t.setProveedor("Por asignar");
        t.setPrioridad(n.prioridad() == null ? PrioridadTicket.MEDIA : n.prioridad());
        t.setCreadoEn(ahora);
        t.setActualizadoEn(ahora);
        return aDto(tickets.save(t));
    }

    @Transactional(readOnly = true)
    public List<TicketDto> tickets(UsuarioActual actor) {
        List<TicketGarantia> lista;
        if (actor.esStaff()) {
            lista = tickets.findAllByOrderByCreadoEnDesc();
        } else {
            List<Long> ids = propiedades.findByUsuarioIdOrderByFechaCompraDesc(actor.id()).stream()
                    .map(PropiedadAdquirida::getId).toList();
            lista = ids.isEmpty() ? List.of() : tickets.findByPropiedadIdInOrderByCreadoEnDesc(ids);
        }
        return lista.stream().map(PostventaService::aDto).toList();
    }

    public TicketDto cambiarEstado(Long ticketId, EstadoTicket estado, String proveedor) {
        TicketGarantia t = tickets.findById(ticketId).orElseThrow(() -> new NoEncontradoException("Ticket", ticketId));
        t.setEstado(estado);
        if (proveedor != null && !proveedor.isBlank()) t.setProveedor(proveedor);
        t.setActualizadoEn(Instant.now().truncatedTo(ChronoUnit.MILLIS));
        return aDto(t);
    }

    // ---------------------------------------------------------------- métricas

    @Transactional(readOnly = true)
    public Map<EstadoTicket, Long> ticketsPorEstado() {
        Map<EstadoTicket, Long> m = new EnumMap<>(EstadoTicket.class);
        for (EstadoTicket e : EstadoTicket.values()) m.put(e, 0L);
        tickets.findAll().forEach(t -> m.merge(t.getEstado(), 1L, Long::sum));
        return m;
    }

    // ---------------------------------------------------------------- internos

    private PropiedadAdquirida propiedadPropia(Long propiedadId, UsuarioActual actor) {
        PropiedadAdquirida p = propiedades.findById(propiedadId)
                .orElseThrow(() -> new NoEncontradoException("Propiedad adquirida", propiedadId));
        if (!p.getUsuarioId().equals(actor.id())) throw new AccessDeniedException("La propiedad no te pertenece");
        return p;
    }

    private PropiedadDto aDto(PropiedadAdquirida p) {
        BigDecimal invertido = mantenimientos.findByPropiedadIdOrderByFechaDescIdDesc(p.getId()).stream()
                .map(Mantenimiento::getInversionUsd).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal estimado = valorEstimado(p.getValorCompra(), p.getFechaCompra(), invertido);
        BigDecimal pct = estimado.subtract(p.getValorCompra()).multiply(BigDecimal.valueOf(100))
                .divide(p.getValorCompra(), 1, RoundingMode.HALF_UP);
        return new PropiedadDto(p.getId(), inmuebles.resumen(p.getInmuebleId()), p.getTransaccionId(),
                p.getFechaCompra(), p.getValorCompra(), estimado, pct);
    }

    /** Estimación referencial: crecimiento anual simple + parte de lo invertido en mantenimiento. */
    static BigDecimal valorEstimado(BigDecimal compra, Instant fechaCompra, BigDecimal invertido) {
        BigDecimal anios = BigDecimal.valueOf(Duration.between(fechaCompra, Instant.now()).toDays())
                .divide(BigDecimal.valueOf(365), 4, RoundingMode.HALF_UP).max(BigDecimal.ZERO);
        BigDecimal crecimiento = compra.multiply(PLUSVALIA_ANUAL).multiply(anios);
        return compra.add(crecimiento).add(invertido.multiply(FACTOR_MANTENIMIENTO)).setScale(2, RoundingMode.HALF_UP);
    }

    private static MantenimientoDto aDto(Mantenimiento m) {
        return new MantenimientoDto(m.getId(), m.getPropiedadId(), m.getFecha(), m.getServicio(), m.getInversionUsd(),
                m.getComprobanteArchivoId() == null ? null : "/api/v1/postventa/mantenimientos/" + m.getId() + "/comprobante");
    }

    private static TicketDto aDto(TicketGarantia t) {
        return new TicketDto(t.getId(), t.getPropiedadId(), t.getTitulo(), t.getDescripcion(), t.getProveedor(),
                t.getEstado(), t.getPrioridad(), t.getPlanoId(), t.getPinX(), t.getPinY(), t.getCreadoEn(),
                t.getActualizadoEn());
    }
}
