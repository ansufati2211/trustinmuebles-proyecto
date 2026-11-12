package pe.trustinmuebles.cartera;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.trustinmuebles.cartera.CarteraDtos.*;
import pe.trustinmuebles.clasificacion.ClasificacionService;
import pe.trustinmuebles.clasificacion.EstadoSemaforo;
import pe.trustinmuebles.clasificacion.EvaluacionDto;
import pe.trustinmuebles.expediente.CarteraCasos;
import pe.trustinmuebles.expediente.CarteraCasos.CasoCartera;
import pe.trustinmuebles.clasificacion.TipoAlerta;
import pe.trustinmuebles.expediente.Esfuerzo;
import pe.trustinmuebles.expediente.EstadoGestion;
import pe.trustinmuebles.expediente.SemaforoGestion;
import pe.trustinmuebles.expediente.EstadoPublicacion;
import pe.trustinmuebles.expediente.RutaRegularizacion;
import pe.trustinmuebles.expediente.RutasRegularizacion;
import pe.trustinmuebles.identidad.Rol;
import pe.trustinmuebles.identidad.UsuarioActual;
import pe.trustinmuebles.inspeccion.EstadoTecnico;
import pe.trustinmuebles.inspeccion.EvaluacionTecnicaDto;
import pe.trustinmuebles.inspeccion.InspeccionService;
import pe.trustinmuebles.shared.ConflictoException;
import pe.trustinmuebles.shared.NoEncontradoException;

/**
 * Módulo de cartera (v0.7): contacto del comprador y panel del gestor. Nunca escribe en el módulo de clasificación:
 * contactar o atender no cambian el color del indicador A (I8, I10).
 */
@Service
@Transactional
class CarteraService {
    private final SolicitudContactoRepository contactos;
    private final CarteraCasos casos;
    private final ClasificacionService clasificacion;
    private final InspeccionService inspeccion;
    private final RutasRegularizacion rutas;
    private final DecisionCaptacionRepository decisiones;

    CarteraService(SolicitudContactoRepository contactos, CarteraCasos casos, ClasificacionService clasificacion,
            InspeccionService inspeccion, RutasRegularizacion rutas, DecisionCaptacionRepository decisiones) {
        this.contactos = contactos;
        this.casos = casos;
        this.clasificacion = clasificacion;
        this.inspeccion = inspeccion;
        this.rutas = rutas;
        this.decisiones = decisiones;
    }

    /**
     * v0.8 (D54): el gestor registra una decisión de captación. Se agrega una fila (historial de solo adición) con la
     * cuenta de la sesión y la fecha. No toca la clasificación ni la inspección (I15) ni bloquea publicar.
     */
    DecisionDto registrarDecision(String codigo, RegistrarDecisionRequest req) {
        UsuarioActual u = exigir(Rol.GESTOR, "Solo el gestor registra la decisión de captación");
        CasoCartera c = casos.buscar(codigo).orElseThrow(() -> new NoEncontradoException("Caso", codigo));
        DecisionCaptacion d = new DecisionCaptacion();
        d.setExpedienteId(c.expedienteId());
        d.setCasoCodigo(c.codigo());
        d.setDecision(req.decision());
        d.setMotivo(req.motivo());
        d.setCuentaCodigo(u.codigoCuenta());
        d.setRegistradaEn(ahora());
        return DecisionDto.de(decisiones.save(d));
    }

    /** v0.8: historial de decisiones de un caso, del más antiguo al más reciente. Solo GESTOR y REVISOR (I15). */
    @Transactional(readOnly = true)
    List<DecisionDto> decisiones(String codigo) {
        Rol rol = UsuarioActual.actual().rol();
        if (!SemaforoGestion.puedeVer(rol)) throw new AccessDeniedException("Solo el gestor y el revisor ven las decisiones");
        CasoCartera c = casos.buscar(codigo).orElseThrow(() -> new NoEncontradoException("Caso", codigo));
        return decisiones.findByCasoCodigoOrderByIdAsc(c.codigo()).stream().map(DecisionDto::de).toList();
    }

    /**
     * Solo un comprador, sobre un caso PUBLICADO (otro caso da 404, como en el catálogo). No depende del color de A
     * (I10). El comprador sale de la sesión. Una segunda solicitud pendiente del mismo comprador y caso da 409.
     */
    ContactoDto solicitar(String codigo, MotivoContacto motivo) {
        UsuarioActual u = exigir(Rol.COMPRADOR, "Solo un comprador solicita contacto");
        CasoCartera c = casos.buscar(codigo).filter(x -> x.estadoPublicacion() == EstadoPublicacion.PUBLICADO)
                .orElseThrow(() -> new NoEncontradoException("Caso", codigo));
        String clave = u.codigoCuenta() + "|" + c.codigo();
        if (contactos.existsByPendienteClave(clave)) {
            throw new ConflictoException("Ya tienes una solicitud de contacto pendiente para este caso");
        }
        SolicitudContacto s = new SolicitudContacto();
        s.setExpedienteId(c.expedienteId());
        s.setCasoCodigo(c.codigo());
        s.setCompradorCodigo(u.codigoCuenta());
        s.setMotivo(motivo);
        s.setEstado(EstadoContacto.PENDIENTE);
        s.setCreadaEn(ahora());
        s.setPendienteClave(clave);
        return ContactoDto.de(contactos.saveAndFlush(s));
    }

    /** El gestor marca atendida una solicitud pendiente. Una ya atendida da 409. */
    ContactoDto atender(Long id) {
        UsuarioActual u = exigir(Rol.GESTOR, "Solo el gestor atiende contactos");
        SolicitudContacto s = contactos.findById(id).orElseThrow(() -> new NoEncontradoException("Contacto", id));
        if (s.getEstado() != EstadoContacto.PENDIENTE) throw new ConflictoException("La solicitud ya fue atendida");
        s.setEstado(EstadoContacto.ATENDIDA);
        s.setAtendidaEn(ahora());
        s.setAtendidaPor(u.codigoCuenta());
        s.setPendienteClave(null);
        return ContactoDto.de(contactos.saveAndFlush(s));
    }

    @Transactional(readOnly = true)
    List<ContactoDto> listar(EstadoContacto estado) {
        exigir(Rol.GESTOR, "Solo el gestor consulta los contactos");
        return (estado == null ? contactos.findAllByOrderByIdAsc() : contactos.findByEstadoOrderByIdAsc(estado))
                .stream().map(ContactoDto::de).toList();
    }

    static final String AVISO_GESTION =
            "Uso interno de la inmobiliaria; no se muestra al comprador ni es una recomendación de compra";

    /** Clave del conteo por esfuerzo para los casos sin pasos de regularización. */
    static final String SIN_PASOS = "SIN_PASOS";

    /**
     * Panel de solo lectura del gestor. Cuenta lo que hay. v0.8 (D52, matiza D41): la lista «por regularizar» se ordena
     * por esfuerzo y código solo para organizar la subsanación; no califica casos para el comprador.
     */
    @Transactional(readOnly = true)
    PanelCartera panel() {
        exigir(Rol.GESTOR, "Solo el gestor consulta el panel de cartera");
        List<CasoCartera> todos = casos.todos();
        Map<EstadoSemaforo, Long> porColor = new EnumMap<>(EstadoSemaforo.class);
        for (EstadoSemaforo e : EstadoSemaforo.values()) porColor.put(e, 0L);
        Map<EstadoPublicacion, Long> porPublicacion = new EnumMap<>(EstadoPublicacion.class);
        for (EstadoPublicacion e : EstadoPublicacion.values()) porPublicacion.put(e, 0L);
        List<CasoConFaltantes> conFaltantes = new ArrayList<>();
        List<InspeccionEnCurso> enCurso = new ArrayList<>();
        Map<String, Long> porTipo = new LinkedHashMap<>();
        List<TipoAlerta> tipos = clasificacion.tiposDeAlerta();
        for (TipoAlerta t : tipos) porTipo.put(t.codigo(), 0L);
        Map<String, Long> porEsfuerzo = new LinkedHashMap<>();
        for (Esfuerzo e : Esfuerzo.values()) porEsfuerzo.put(e.name(), 0L);
        porEsfuerzo.put(SIN_PASOS, 0L);
        List<CasoPorRegularizar> porRegularizar = new ArrayList<>();
        Map<EstadoGestion, Long> porGestion = new EnumMap<>(EstadoGestion.class);
        for (EstadoGestion g : EstadoGestion.values()) porGestion.put(g, 0L);
        Map<String, Map<EstadoGestion, Long>> matriz = new LinkedHashMap<>();
        for (TipoAlerta t : tipos) {
            Map<EstadoGestion, Long> fila = new EnumMap<>(EstadoGestion.class);
            for (EstadoGestion g : EstadoGestion.values()) fila.put(g, 0L);
            matriz.put(t.codigo(), fila);
        }
        for (CasoCartera c : todos) {
            RutaRegularizacion ruta = rutas.calcular(c.expedienteId());
            EstadoGestion estadoGestion = SemaforoGestion.estadoDe(ruta);
            porGestion.merge(estadoGestion, 1L, Long::sum);
            for (String t : ruta.tiposAlerta()) {
                matriz.computeIfAbsent(t, k -> new EnumMap<>(EstadoGestion.class)).merge(estadoGestion, 1L, Long::sum);
            }
            for (String t : ruta.tiposAlerta()) porTipo.merge(t, 1L, Long::sum);
            porEsfuerzo.merge(ruta.esfuerzo() == null ? SIN_PASOS : ruta.esfuerzo().name(), 1L, Long::sum);
            if (ruta.esfuerzo() != null) {
                porRegularizar.add(new CasoPorRegularizar(c.codigo(), c.denominacion(), ruta.estado(),
                        ruta.tiposAlerta(), ruta.esfuerzo(), estadoGestion));
            }
            porPublicacion.merge(c.estadoPublicacion(), 1L, Long::sum);
            EvaluacionDto ev = clasificacion.obtener(c.expedienteId()).orElse(null);
            if (ev != null) {
                porColor.merge(ev.estado(), 1L, Long::sum);
                if (ev.faltantes() != null && !ev.faltantes().isEmpty()) {
                    conFaltantes.add(new CasoConFaltantes(c.codigo(), ev.estado(), ev.faltantes()));
                }
            }
            EvaluacionTecnicaDto t = inspeccion.obtener(c.expedienteId());
            if (t.estado() == EstadoTecnico.SOLICITADA || t.estado() == EstadoTecnico.EN_INSPECCION) {
                enCurso.add(new InspeccionEnCurso(c.codigo(), t.estado(), t.especialistaAsignadoCodigo(),
                        t.especialistaAsignadoCodigo() != null));
            }
        }
        long asignadas = enCurso.stream().filter(InspeccionEnCurso::asignada).count();
        List<ContactoDto> pendientes = contactos.findByEstadoOrderByIdAsc(EstadoContacto.PENDIENTE).stream()
                .map(ContactoDto::de).toList();
        porRegularizar.sort(Comparator.comparing(CasoPorRegularizar::esfuerzo).thenComparing(CasoPorRegularizar::codigo));
        List<ConteoTipoAlerta> conteoTipos = tipos.stream()
                .map(t -> new ConteoTipoAlerta(t.codigo(), t.nombre(), porTipo.getOrDefault(t.codigo(), 0L))).toList();
        List<FilaMatrizGestion> filas = tipos.stream()
                .map(t -> new FilaMatrizGestion(t.codigo(), t.nombre(), matriz.get(t.codigo()))).toList();
        return new PanelCartera(todos.size(), porColor, porPublicacion, conFaltantes, enCurso, asignadas,
                enCurso.size() - asignadas, pendientes, conteoTipos, porEsfuerzo, porRegularizar,
                CarteraDtos.AVISO_PRIORIZACION, porGestion, filas, AVISO_GESTION);
    }

    private static UsuarioActual exigir(Rol rol, String mensaje) {
        UsuarioActual u = UsuarioActual.actual();
        if (!u.rol().incluye(rol)) throw new AccessDeniedException(mensaje);
        return u;
    }

    private static Instant ahora() {
        return Instant.now().truncatedTo(ChronoUnit.MILLIS);
    }
}
