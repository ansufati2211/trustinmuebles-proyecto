package pe.trustinmuebles.tramite;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import pe.trustinmuebles.almacenamiento.AlmacenamientoService;
import pe.trustinmuebles.almacenamiento.ArchivoContenido;
import pe.trustinmuebles.almacenamiento.ArchivoGuardado;
import pe.trustinmuebles.identidad.AuthService;
import pe.trustinmuebles.identidad.UsuarioActual;
import pe.trustinmuebles.identidad.UsuarioDto;
import pe.trustinmuebles.inmueble.InmuebleDtos;
import pe.trustinmuebles.inmueble.InmuebleService;
import pe.trustinmuebles.semaforo.EvaluacionLegalDto;
import pe.trustinmuebles.semaforo.SemaforoService;
import pe.trustinmuebles.shared.Hashing;
import pe.trustinmuebles.shared.NivelRiesgo;
import pe.trustinmuebles.shared.NoEncontradoException;
import pe.trustinmuebles.shared.ReglaNegocioException;
import pe.trustinmuebles.tramite.TramiteDtos.*;

/** API pública del módulo de trazabilidad del trámite (REQ-F03, NF03). */
@Service
@Transactional
public class TramiteService {
    private final TransaccionRepository transacciones;
    private final EventoRepository eventos;
    private final DocumentoRepository documentos;
    private final MensajeRepository mensajes;
    private final InmuebleService inmuebles;
    private final SemaforoService semaforo;
    private final AuthService auth;
    private final AlmacenamientoService almacenamiento;
    private final ApplicationEventPublisher publicador;

    TramiteService(TransaccionRepository transacciones, EventoRepository eventos, DocumentoRepository documentos,
            MensajeRepository mensajes, InmuebleService inmuebles, SemaforoService semaforo, AuthService auth,
            AlmacenamientoService almacenamiento, ApplicationEventPublisher publicador) {
        this.transacciones = transacciones;
        this.eventos = eventos;
        this.documentos = documentos;
        this.mensajes = mensajes;
        this.inmuebles = inmuebles;
        this.semaforo = semaforo;
        this.auth = auth;
        this.almacenamiento = almacenamiento;
        this.publicador = publicador;
    }

    // ---------------------------------------------------------------- creación y consulta

    /** Botón "Separar Propiedad Ahora": abre el trámite, asigna gestor y genera la oferta firmada. */
    public Detalle crear(Long inmuebleId, UsuarioActual actor) {
        var inmueble = inmuebles.resumen(inmuebleId);
        if (transacciones.existsByCompradorIdAndInmuebleIdAndEtapaNot(actor.id(), inmuebleId,
                EtapaTramite.FINALIZADA)) {
            throw new ReglaNegocioException("Ya tienes un trámite en curso para esta propiedad");
        }
        EvaluacionLegalDto evaluacion = semaforo.ultima(inmuebleId).orElseGet(() -> inmuebles.evaluar(inmuebleId));

        Instant ahora = ahora();
        Transaccion t = new Transaccion();
        t.setInmuebleId(inmuebleId);
        t.setCompradorId(actor.id());
        t.setGestorId(auth.primerGestor().map(UsuarioDto::id).orElse(null));
        t.setPrecioAcordado(inmueble.precioUsd());
        t.setCreadaEn(ahora);
        t.setActualizadaEn(ahora);
        transacciones.save(t);

        registrar(t, "ETAPA_" + EtapaTramite.OFERTA_ACEPTADA, "Oferta aceptada por ambas partes");
        byte[] pdf = PdfSimple.generar("Oferta de Compra", List.of("Inmueble: " + inmueble.titulo(),
                "Direccion: " + inmueble.direccion(), "Precio acordado: USD " + inmueble.precioUsd(),
                "Vendedor: " + inmueble.vendedor(), "Fecha: " + ahora,
                "Documento generado por Trustinmuebles (prototipo academico)."));
        crearDocumento(t, "Oferta_de_Compra.pdf", "OFERTA", pdf, EstadoFirma.FIRMADO, actor.id());
        if (evaluacion.nivel() == NivelRiesgo.ROJO) {
            registrar(t, "ALERTA", "El Semáforo Legal de esta propiedad está en ROJO: la auditoría no podrá "
                    + "aprobarse hasta que se levanten los riesgos");
        }
        return detalle(t.getId(), actor);
    }

    @Transactional(readOnly = true)
    public List<Resumen> mias(UsuarioActual actor) {
        List<Transaccion> lista = actor.esStaff() && actor.rol() != pe.trustinmuebles.identidad.Rol.ADMIN
                ? transacciones.findByGestorIdOrderByCreadaEnDesc(actor.id())
                : actor.esStaff() ? transacciones.findAll()
                        : transacciones.findByCompradorIdOrderByCreadaEnDesc(actor.id());
        return lista.stream().map(t -> new Resumen(t.getId(), breve(t.getInmuebleId()), t.getEtapa(),
                t.getPrecioAcordado(), t.getCreadaEn())).toList();
    }

    @Transactional(readOnly = true)
    public Detalle detalle(Long id, UsuarioActual actor) {
        Transaccion t = obtener(id);
        verificarAcceso(t, actor);
        List<EventoTimeline> evs = eventos.findByTransaccionIdOrderByIdAsc(id);
        Map<String, Instant> fechaPorEtapa = evs.stream().filter(e -> e.getTipo().startsWith("ETAPA_"))
                .collect(Collectors.toMap(EventoTimeline::getTipo, EventoTimeline::getFecha, (a, b) -> a));

        List<EtapaDto> etapas = new ArrayList<>();
        for (EtapaTramite e : EtapaTramite.values()) {
            EstadoEtapa estado = t.getEtapa() == EtapaTramite.FINALIZADA || e.ordinal() < t.getEtapa().ordinal()
                    ? EstadoEtapa.COMPLETADA
                    : e == t.getEtapa() ? EstadoEtapa.ACTUAL : EstadoEtapa.PENDIENTE;
            etapas.add(new EtapaDto(e, e.titulo(), e.descripcion(), estado, fechaPorEtapa.get("ETAPA_" + e)));
        }
        Map<Long, UsuarioDto> nombres = new java.util.HashMap<>();
        Function<Long, UsuarioDto> usuario = uid -> nombres.computeIfAbsent(uid, auth::obtener);
        return new Detalle(t.getId(), breve(t.getInmuebleId()), t.getEtapa(), t.getPrecioAcordado(), t.getCreadaEn(),
                t.getGestorId() == null ? null : usuario.apply(t.getGestorId()), etapas,
                documentos.findByTransaccionIdOrderByIdAsc(id).stream().map(TramiteService::aDto).toList(),
                evs.stream().map(e -> new EventoDto(e.getId(), e.getTipo(), e.getDescripcion(), e.getFecha(),
                        e.getHash())).toList(),
                mensajes.findByTransaccionIdOrderByIdAsc(id).stream().map(m -> new MensajeDto(m.getId(),
                        m.getAutorId(), usuario.apply(m.getAutorId()).nombre(), m.getTexto(), m.getFecha())).toList());
    }

    // ---------------------------------------------------------------- etapas

    /** Avanza una etapa (solo gestor legal / admin). Aplica la regla: sin auditoría si el semáforo está en ROJO. */
    public Detalle cambiarEtapa(Long id, EtapaTramite destino, UsuarioActual actor) {
        if (!actor.esStaff()) throw new AccessDeniedException("Solo el gestor legal puede cambiar la etapa");
        Transaccion t = obtener(id);
        if (actor.rol() != pe.trustinmuebles.identidad.Rol.ADMIN && !actor.id().equals(t.getGestorId())) {
            throw new AccessDeniedException("El trámite está asignado a otro gestor");
        }
        if (destino != t.getEtapa().siguiente()) {
            throw new ReglaNegocioException("La etapa siguiente a " + t.getEtapa() + " es " + t.getEtapa().siguiente());
        }
        if (destino == EtapaTramite.AUDITORIA_APROBADA) {
            NivelRiesgo nivel = semaforo.ultima(t.getInmuebleId()).map(EvaluacionLegalDto::nivel)
                    .orElseThrow(() -> new ReglaNegocioException("La propiedad no tiene una auditoría legal"));
            if (nivel == NivelRiesgo.ROJO) {
                throw new ReglaNegocioException(
                        "No se puede aprobar la auditoría: el Semáforo Legal de la propiedad está en ROJO");
            }
        }
        avanzar(t, destino);
        return detalle(id, actor);
    }

    private void avanzar(Transaccion t, EtapaTramite destino) {
        t.setEtapa(destino);
        t.setActualizadaEn(ahora());
        registrar(t, "ETAPA_" + destino, destino.titulo() + ": " + destino.descripcion());
        if (destino == EtapaTramite.FIRMA_MINUTA) {
            var inm = inmuebles.resumen(t.getInmuebleId());
            byte[] pdf = PdfSimple.generar("Minuta de Compraventa", List.of("Inmueble: " + inm.titulo(),
                    "Direccion: " + inm.direccion(), "Partida registral: " + inm.numeroPartida(),
                    "Precio: USD " + t.getPrecioAcordado(), "Estado: pendiente de firma del comprador.",
                    "Documento generado por Trustinmuebles (prototipo academico)."));
            crearDocumento(t, "Minuta_Compraventa.pdf", "MINUTA", pdf, EstadoFirma.PENDIENTE, null);
        }
        if (destino == EtapaTramite.FINALIZADA) {
            publicador.publishEvent(new TransaccionFinalizada(t.getId(), t.getInmuebleId(), t.getCompradorId(),
                    t.getPrecioAcordado()));
        }
    }

    // ---------------------------------------------------------------- documentos y firmas

    public DocumentoDto subirDocumento(Long transaccionId, String tipo, MultipartFile archivo, UsuarioActual actor) {
        Transaccion t = obtener(transaccionId);
        verificarAcceso(t, actor);
        ArchivoGuardado g = almacenamiento.guardar(archivo, false);
        Documento d = nuevoDocumento(t, g.nombre(), tipo == null ? "OTRO" : tipo, g, EstadoFirma.NO_REQUIERE);
        registrar(t, "DOCUMENTO_SUBIDO", "Documento subido: " + g.nombre() + " (sha256 " + g.sha256().substring(0, 12) + "…)");
        return aDto(d);
    }

    /** Firma electrónica de la minuta por el comprador; adelanta el trámite a Escritura Pública. */
    public Detalle firmar(Long documentoId, UsuarioActual actor) {
        Documento d = documentos.findById(documentoId)
                .orElseThrow(() -> new NoEncontradoException("Documento", documentoId));
        Transaccion t = obtener(d.getTransaccionId());
        if (!t.getCompradorId().equals(actor.id())) {
            throw new AccessDeniedException("Solo el comprador puede firmar este documento");
        }
        if (d.getEstadoFirma() != EstadoFirma.PENDIENTE) {
            throw new ReglaNegocioException("El documento no está pendiente de firma");
        }
        if (t.getEtapa() != EtapaTramite.FIRMA_MINUTA) {
            throw new ReglaNegocioException("La firma solo está habilitada en la etapa de Firma de Minuta");
        }
        d.setEstadoFirma(EstadoFirma.FIRMADO);
        d.setFirmadoEn(ahora());
        d.setFirmadoPorId(actor.id());
        registrar(t, "DOCUMENTO_FIRMADO", "Documento firmado digitalmente: " + d.getNombre() + " (sha256 "
                + d.getSha256().substring(0, 12) + "…)");
        avanzar(t, EtapaTramite.ESCRITURA_PUBLICA);
        return detalle(t.getId(), actor);
    }

    @Transactional(readOnly = true)
    public ArchivoContenido descargar(Long documentoId, UsuarioActual actor) {
        Documento d = documentos.findById(documentoId)
                .orElseThrow(() -> new NoEncontradoException("Documento", documentoId));
        verificarAcceso(obtener(d.getTransaccionId()), actor);
        ArchivoContenido c = almacenamiento.leer(d.getArchivoId());
        return new ArchivoContenido(d.getNombre(), c.contentType(), c.datos(), false);
    }

    // ---------------------------------------------------------------- mensajes

    public MensajeDto enviarMensaje(Long transaccionId, String texto, UsuarioActual actor) {
        Transaccion t = obtener(transaccionId);
        verificarAcceso(t, actor);
        MensajeAsesor m = new MensajeAsesor();
        m.setTransaccionId(transaccionId);
        m.setAutorId(actor.id());
        m.setTexto(texto);
        m.setFecha(ahora());
        mensajes.save(m);
        return new MensajeDto(m.getId(), actor.id(), auth.obtener(actor.id()).nombre(), texto, m.getFecha());
    }

    // ---------------------------------------------------------------- integridad (hash encadenado)

    @Transactional(readOnly = true)
    public Integridad verificarIntegridad(Long id, UsuarioActual actor) {
        Transaccion t = obtener(id);
        verificarAcceso(t, actor);
        String previo = EventoTimeline.GENESIS;
        List<EventoTimeline> evs = eventos.findByTransaccionIdOrderByIdAsc(id);
        for (EventoTimeline e : evs) {
            if (!previo.equals(e.getHashPrevio()) || !calcularHash(e, previo).equals(e.getHash())) {
                return new Integridad(false, evs.size(), e.getId(), previo);
            }
            previo = e.getHash();
        }
        return new Integridad(true, evs.size(), null, previo);
    }

    // ---------------------------------------------------------------- consultas para otros módulos

    @Transactional(readOnly = true)
    public Estado estado(Long transaccionId) {
        Transaccion t = obtener(transaccionId);
        return new Estado(t.getId(), t.getInmuebleId(), t.getCompradorId(), t.getEtapa());
    }

    @Transactional(readOnly = true)
    public long contar() {
        return transacciones.count();
    }

    /** Horas promedio entre el inicio del trámite y la aprobación de la auditoría. */
    @Transactional(readOnly = true)
    public double horasPromedioAuditoria() {
        Map<Long, Instant> inicio = transacciones.findAll().stream()
                .collect(Collectors.toMap(Transaccion::getId, Transaccion::getCreadaEn));
        return eventos.findByTipo("ETAPA_" + EtapaTramite.AUDITORIA_APROBADA).stream()
                .mapToDouble(e -> Duration.between(inicio.get(e.getTransaccionId()), e.getFecha()).toMinutes() / 60.0)
                .average().orElse(0);
    }

    // ---------------------------------------------------------------- internos

    private void registrar(Transaccion t, String tipo, String descripcion) {
        String previo = eventos.findFirstByTransaccionIdOrderByIdDesc(t.getId()).map(EventoTimeline::getHash)
                .orElse(EventoTimeline.GENESIS);
        EventoTimeline e = new EventoTimeline();
        e.setTransaccionId(t.getId());
        e.setTipo(tipo);
        e.setDescripcion(descripcion);
        e.setFecha(ahora());
        e.setHashPrevio(previo);
        e.setHash(calcularHash(e, previo));
        eventos.save(e);
    }

    static String calcularHash(EventoTimeline e, String previo) {
        return Hashing.sha256(e.getTransaccionId() + "|" + e.getTipo() + "|" + e.getDescripcion() + "|"
                + e.getFecha() + "|" + previo);
    }

    private void crearDocumento(Transaccion t, String nombre, String tipo, byte[] pdf, EstadoFirma estado,
            Long firmadoPor) {
        ArchivoGuardado g = almacenamiento.guardar(nombre, "application/pdf", pdf, false);
        Documento d = nuevoDocumento(t, nombre, tipo, g, estado);
        if (estado == EstadoFirma.FIRMADO) {
            d.setFirmadoEn(ahora());
            d.setFirmadoPorId(firmadoPor);
        }
        registrar(t, "DOCUMENTO_SUBIDO", "Documento generado: " + nombre + " (sha256 " + g.sha256().substring(0, 12) + "…)");
    }

    private Documento nuevoDocumento(Transaccion t, String nombre, String tipo, ArchivoGuardado g, EstadoFirma estado) {
        Documento d = new Documento();
        d.setTransaccionId(t.getId());
        d.setNombre(nombre);
        d.setTipo(tipo);
        d.setArchivoId(g.id());
        d.setSha256(g.sha256());
        d.setEstadoFirma(estado);
        d.setSubidoEn(ahora());
        return documentos.save(d);
    }

    private void verificarAcceso(Transaccion t, UsuarioActual actor) {
        boolean permitido = actor.rol() == pe.trustinmuebles.identidad.Rol.ADMIN
                || t.getCompradorId().equals(actor.id()) || actor.id().equals(t.getGestorId());
        if (!permitido) throw new AccessDeniedException("No participas en este trámite");
    }

    private Transaccion obtener(Long id) {
        return transacciones.findById(id).orElseThrow(() -> new NoEncontradoException("Transacción", id));
    }

    private InmuebleBreve breve(Long inmuebleId) {
        InmuebleDtos.Resumen r = inmuebles.resumen(inmuebleId);
        return new InmuebleBreve(r.id(), r.titulo(), r.ubicacion(), r.direccion(), r.imagenUrl());
    }

    private static DocumentoDto aDto(Documento d) {
        return new DocumentoDto(d.getId(), d.getNombre(), d.getTipo(), d.getEstadoFirma(), d.getSha256(),
                d.getSubidoEn(), d.getFirmadoEn());
    }

    private static Instant ahora() {
        return Instant.now().truncatedTo(ChronoUnit.MILLIS);
    }
}
