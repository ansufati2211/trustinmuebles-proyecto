package pe.trustinmuebles.cartera;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumMap;
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
import pe.trustinmuebles.expediente.EstadoPublicacion;
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

    CarteraService(SolicitudContactoRepository contactos, CarteraCasos casos, ClasificacionService clasificacion,
            InspeccionService inspeccion) {
        this.contactos = contactos;
        this.casos = casos;
        this.clasificacion = clasificacion;
        this.inspeccion = inspeccion;
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

    /** Panel de solo lectura del gestor. Cuenta lo que hay; no ordena ni califica casos. */
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
        for (CasoCartera c : todos) {
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
        return new PanelCartera(todos.size(), porColor, porPublicacion, conFaltantes, enCurso, asignadas,
                enCurso.size() - asignadas, pendientes);
    }

    private static UsuarioActual exigir(Rol rol, String mensaje) {
        UsuarioActual u = UsuarioActual.actual();
        if (u.rol() != rol) throw new AccessDeniedException(mensaje);
        return u;
    }

    private static Instant ahora() {
        return Instant.now().truncatedTo(ChronoUnit.MILLIS);
    }
}
