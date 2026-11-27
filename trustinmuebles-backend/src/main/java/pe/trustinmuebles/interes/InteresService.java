package pe.trustinmuebles.interes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.trustinmuebles.expediente.EstadoComercial;
import pe.trustinmuebles.expediente.InmueblesInteres;
import pe.trustinmuebles.expediente.InmueblesInteres.Referencia;
import pe.trustinmuebles.identidad.AuthService;
import pe.trustinmuebles.identidad.CuentasAsesores;
import pe.trustinmuebles.identidad.Rol;
import pe.trustinmuebles.identidad.UsuarioActual;
import pe.trustinmuebles.interes.InteresDtos.*;
import pe.trustinmuebles.interes.Opciones.CanalInteres;
import pe.trustinmuebles.interes.Opciones.EstadoCita;
import pe.trustinmuebles.interes.Opciones.Franja;
import pe.trustinmuebles.interes.Opciones.FormaConsentimiento;
import pe.trustinmuebles.interes.Opciones.ModalidadCita;
import pe.trustinmuebles.interes.Opciones.OrigenInteres;
import pe.trustinmuebles.shared.ConflictoException;
import pe.trustinmuebles.shared.DemasiadosIntentosException;
import pe.trustinmuebles.shared.NoEncontradoException;
import pe.trustinmuebles.shared.ReglaNegocioException;

/**
 * v1.0 (etapa 4): interesados, notas y citas (CRM del asesor). El visitante deja su interés y, si quiere, pide una cita
 * desde la ficha o el plano, sin sesión; el asesor y el gestor lo siguen por etapas. Nada de este módulo toca el motor de
 * reglas: marcar un lote como separado o vendido es informativo y no cambia el indicador A. No hay pagos.
 * <p>
 * v2.0 (tanda 2):
 * <ul>
 *   <li>RN28: cada asesor ve y gestiona solo a sus interesados (y a los sin asignar, para tomarlos). Las cuentas de
 *       coordinación (el rol GESTOR y las de app.asesores.coordinadores, por omisión asesor-01) ven a todos y asignan.
 *       Se valida aquí, en el servidor: pedir uno ajeno da 403.</li>
 *   <li>RF35: el asesor agenda citas con tipo, fecha principal y fecha opcional.</li>
 *   <li>RF36: cada cambio de etapa queda en el historial con responsable y fecha.</li>
 *   <li>RF41, RF42, RN29 a RN31: pasar a Separación o Venta cambia el estado del lote para todos; un lote separado no
 *       se separa de nuevo; una venta con depósito no se retrotrae; liberar exige motivo y tiene tope.</li>
 * </ul>
 */
@Service
@Transactional
class InteresService {
    static final ZoneId ZONA = ZoneId.of("America/Lima");
    static final String MENSAJE_RECIBIDO = "Recibimos tus datos. Un asesor de la inmobiliaria te escribirá para "
            + "coordinar.";
    static final String MENSAJE_RECIBIDO_CITA = "Recibimos tu pedido de cita. Un asesor te escribirá para confirmar "
            + "una de las fechas que propusiste.";

    private final InteresRepository intereses;
    private final NotaInteresRepository notas;
    private final CitaRepository citas;
    private final InmueblesInteres inmuebles;
    private final AuthService auth;
    private final LimiteEnvios limite;
    private final String whatsapp;
    private final HistorialEtapaRepository historial;
    private final SeparacionLoteRepository separaciones;
    private final Set<String> coordinadores;
    private final int maxDescartes;

    InteresService(InteresRepository intereses, NotaInteresRepository notas, CitaRepository citas,
            InmueblesInteres inmuebles, AuthService auth, LimiteEnvios limite,
            @Value("${app.contacto.whatsapp:}") String whatsapp, HistorialEtapaRepository historial,
            SeparacionLoteRepository separaciones,
            @Value("${app.asesores.coordinadores:asesor-01}") String coordinadores,
            @Value("${app.separacion.max-descartes:2}") int maxDescartes) {
        this.intereses = intereses;
        this.notas = notas;
        this.citas = citas;
        this.inmuebles = inmuebles;
        this.auth = auth;
        this.limite = limite;
        this.whatsapp = numeroWhatsapp(whatsapp, pe.trustinmuebles.shared.Empresa.datos().whatsapp());
        this.historial = historial;
        this.separaciones = separaciones;
        this.coordinadores = Set.copyOf(CuentasAsesores.de(coordinadores));
        if (maxDescartes < 0) throw new IllegalStateException("app.separacion.max-descartes no puede ser negativo");
        this.maxDescartes = maxDescartes;
    }

    /**
     * v1.0 (etapa 8): el número de app.contacto.whatsapp (variable APP_CONTACTO_WHATSAPP) o, si está vacía, el de la
     * inmobiliaria en contenido/empresa.json. Solo dígitos, con el código de país (wa.me no admite «+» ni espacios).
     */
    static String numeroWhatsapp(String configurado, String deLaEmpresa) {
        String d = configurado == null ? "" : configurado.replaceAll("[^0-9]", "");
        if (d.isEmpty() && deLaEmpresa != null) d = deLaEmpresa.replaceAll("[^0-9]", "");
        return d;
    }

    static LocalDate hoy() {
        return LocalDate.now(ZONA);
    }

    // ------------------------------------------------------------------ portal público

    /** WhatsApp de la inmobiliaria (vacío: no se muestra) y el texto de consentimiento vigente. */
    @Transactional(readOnly = true)
    ConfigPublica configuracion() {
        return new ConfigPublica(whatsapp.isEmpty() ? null : whatsapp, InteresDtos.CONSENTIMIENTO_VERSION,
                InteresDtos.CONSENTIMIENTO_TEXTO);
    }

    /**
     * Interés del visitante, con cita opcional. Sin sesión: valida, aplica el límite por IP y, si el campo trampa viene
     * lleno, responde igual sin guardar nada. El inmueble debe estar publicado (otro: 404, como en el catálogo).
     */
    Recibido recibir(tools.jackson.databind.JsonNode cuerpo, String ip) {
        SolicitudInteres s = SolicitudInteres.de(cuerpo, hoy());
        if (!limite.registrar(ip)) {
            throw new DemasiadosIntentosException("Hiciste muchos envíos seguidos. Intenta de nuevo dentro de una hora.");
        }
        Recibido ok = new Recibido(true, s.cita() != null, s.cita() != null ? MENSAJE_RECIBIDO_CITA : MENSAJE_RECIBIDO);
        if (s.trampa()) return ok;
        crear(s, CanalInteres.WEB, FormaConsentimiento.FORMULARIO, null);
        return ok;
    }

    /**
     * v1.0 (etapa 8): el asesor o el gestor registra a un interesado que llegó por llamada, oficina, WhatsApp o referido,
     * con su consentimiento verbal (queda quién lo registró y cuándo). Mismas validaciones que el formulario público y sin
     * límite por IP. Si quien registra puede ser responsable, queda a su cargo; se deja una nota con el canal.
     */
    InteresDetalle registrar(tools.jackson.databind.JsonNode cuerpo) {
        UsuarioActual u = exigirEquipo();
        RegistroPanel r = RegistroPanel.de(cuerpo, hoy());
        Interes i = crear(r.solicitud(), r.canal(), FormaConsentimiento.VERBAL, u.codigoCuenta());
        // v1.0 (etapa 9): quien registra (asesor o gestor) queda como responsable; ya no hay una lista fija de cuentas.
        i.setResponsable(u.codigoCuenta());
        i = intereses.saveAndFlush(i);
        nota(i.getId(), "Registrado desde el panel (" + r.canal().etiqueta + "). El interesado dio su consentimiento "
                + "de forma verbal; lo registró " + u.codigoCuenta() + ".", u.codigoCuenta());
        return detalleDe(i);
    }

    /** Guarda el interés y su cita (si la pidió). Común al formulario público y al registro desde el panel. */
    private Interes crear(SolicitudInteres s, CanalInteres canal, FormaConsentimiento forma, String registradoPor) {
        Referencia ref = referencia(s);
        if (s.cita() != null && s.cita().modalidad() == ModalidadCita.VISITA_AL_LOTE && ref == null) {
            throw new IllegalArgumentException("cita.modalidad: para una visita elige primero un lote o un inmueble");
        }
        Instant ahora = ahora();
        Interes i = new Interes();
        i.setCreadoEn(ahora);
        i.setActualizadoEn(ahora);
        i.setOrigen(ref == null ? OrigenInteres.GENERAL : OrigenInteres.valueOf(ref.clase().name()));
        if (ref != null) {
            i.setCasoCodigo(ref.casoCodigo());
            i.setProyectoCodigo(ref.proyectoCodigo());
            i.setLoteClave(ref.loteClave());
            i.setReferencia(ref.referencia());
            i.setInmueble(recortar(ref.nombre(), 250));
        }
        i.setZona(s.zona() != null ? s.zona() : ref == null ? null : ref.distrito());
        i.setTipo(s.tipo() != null ? s.tipo() : ref == null ? null : ref.tipo());
        i.setPresupuestoMin(s.presupuestoMin());
        i.setPresupuestoMax(s.presupuestoMax());
        i.setMoneda(s.moneda());
        i.setAreaDeseada(s.areaDeseada());
        i.setFormaPago(s.formaPago());
        i.setMensaje(s.mensaje());
        i.setNombre(s.nombre());
        i.setMedio(s.medio());
        i.setContacto(s.contacto());
        i.setConsentimiento(true);
        i.setConsentimientoVersion(s.consentimientoVersion());
        i.setConsentimientoEn(ahora);
        i.setCanal(canal);
        i.setConsentimientoForma(forma);
        i.setConsentimientoRegistradoPor(registradoPor);
        i.setEtapa(EtapaInteres.NUEVO);
        i = intereses.saveAndFlush(i);
        if (s.cita() != null) {
            Cita c = new Cita();
            c.setInteresId(i.getId());
            c.setModalidad(s.cita().modalidad());
            c.setFecha1(s.cita().opciones().get(0).fecha());
            c.setFranja1(s.cita().opciones().get(0).franja());
            if (s.cita().opciones().size() > 1) {
                c.setFecha2(s.cita().opciones().get(1).fecha());
                c.setFranja2(s.cita().opciones().get(1).franja());
            }
            c.setEstado(EstadoCita.SOLICITADA);
            c.setCreadaEn(ahora);
            c.setActualizadaEn(ahora);
            citas.saveAndFlush(c);
        }
        return i;
    }

    private Referencia referencia(SolicitudInteres s) {
        if (s.casoCodigo() != null) {
            return inmuebles.casoPublicado(s.casoCodigo())
                    .orElseThrow(() -> new NoEncontradoException("Inmueble", s.casoCodigo()));
        }
        if (s.proyectoCodigo() != null && s.lote() != null) {
            return inmuebles.loteOfrecido(s.proyectoCodigo(), s.lote())
                    .orElseThrow(() -> new NoEncontradoException("Lote", s.lote()));
        }
        if (s.proyectoCodigo() != null) {
            return inmuebles.proyectoVisible(s.proyectoCodigo())
                    .orElseThrow(() -> new NoEncontradoException("Proyecto", s.proyectoCodigo()));
        }
        if (s.lote() != null) throw new IllegalArgumentException("lote: indica también el proyecto (proyectoCodigo)");
        return null;
    }

    // ------------------------------------------------------------------ bandeja del equipo

    /**
     * Bandeja de interesados, con filtros opcionales por etapa, proyecto y responsable ({@code "SIN_ASIGNAR"} para los
     * que no tienen). Primero los vencidos (próxima acción con fecha pasada) y luego los más recientes.
     */
    @Transactional(readOnly = true)
    List<InteresDto> listar(EtapaInteres etapa, String proyecto, String responsable, boolean soloVencidos) {
        Alcance a = alcance();
        Map<Long, Long> nNotas = conteoNotas();
        Map<Long, List<Cita>> porInteres = new HashMap<>();
        for (Cita c : citas.findAll()) porInteres.computeIfAbsent(c.getInteresId(), k -> new ArrayList<>()).add(c);
        LocalDate hoy = hoy();
        List<InteresDto> salida = new ArrayList<>();
        for (Interes i : intereses.findAllByOrderByCreadoEnDescIdDesc()) {
            if (!a.ve(i)) continue;
            if (etapa != null && i.getEtapa() != etapa) continue;
            if (proyecto != null && !proyecto.isBlank() && !proyecto.equals(i.getProyectoCodigo())) continue;
            if (responsable != null && !responsable.isBlank()) {
                if (responsable.equals("SIN_ASIGNAR") ? i.getResponsable() != null
                        : !responsable.equals(i.getResponsable())) continue;
            }
            InteresDto d = dto(i, nNotas.getOrDefault(i.getId(), 0L), porInteres.getOrDefault(i.getId(), List.of()), hoy);
            if (soloVencidos && !d.vencido()) continue;
            salida.add(d);
        }
        salida.sort(Comparator.comparing((InteresDto d) -> !d.vencido()));
        return salida;
    }

    @Transactional(readOnly = true)
    InteresDetalle detalle(Long id) {
        return detalleDe(buscarVisible(id, alcance()));
    }

    /**
     * Cambia la etapa y deja una nota con el cambio. La misma etapa: 409. v2.0: queda en el historial (RF36); pasar a
     * Separación o Venta cambia el estado del lote (RF41, RN29) y salir de ellas solo se hace liberando con motivo (RF42).
     */
    InteresDetalle cambiarEtapa(Long id, CambioEtapa req) {
        Alcance a = alcance();
        Interes i = buscarVisible(id, a);
        if (i.getEtapa() == req.etapa()) throw new ConflictoException("El interesado ya está en esa etapa");
        Optional<SeparacionLote> vigente = vigente(i);
        if (vigente.isPresent()) {
            SeparacionLote s = vigente.get();
            if (s.getEstado() == SeparacionLote.Estado.VENDIDA && s.isConDeposito()) {
                throw new ReglaNegocioException("Una venta con depósito no se retrotrae (RN29)");
            }
            if (req.etapa() != EtapaInteres.VENTA) {
                throw new ReglaNegocioException("El lote está " + (s.getEstado() == SeparacionLote.Estado.VENDIDA
                        ? "vendido" : "separado") + " para este interesado: para retroceder, libera la separación con "
                        + "un motivo");
            }
        }
        boolean conInmueble = vinculado(i);
        if (conInmueble && (req.etapa() == EtapaInteres.SEPARACION || req.etapa() == EtapaInteres.VENTA)) {
            tomarSiNoTiene(i, a.u());
            aplicarAlLote(i, req, a.u(), vigente);
        }
        moverEtapa(i, req.etapa(), a.u().codigoCuenta(), null);
        tocar(i);
        return detalleDe(intereses.saveAndFlush(i));
    }

    /**
     * v2.0 (RF42, RN31): libera o descarta la separación (o la venta sin depósito) del interesado: el lote vuelve a estar
     * disponible para otro cliente, queda la fecha, la cuenta y el motivo, y el interesado pasa a la etapa indicada. Tras
     * {@code app.separacion.max-descartes} liberaciones del mismo interesado, solo una cuenta de coordinación libera otra.
     */
    InteresDetalle liberar(Long id, Liberacion req) {
        Alcance a = alcance();
        Interes i = buscarVisible(id, a);
        SeparacionLote s = vigente(i).orElseThrow(
                () -> new ReglaNegocioException("El interesado no tiene un lote separado que liberar"));
        if (s.getEstado() == SeparacionLote.Estado.VENDIDA && s.isConDeposito()) {
            throw new ReglaNegocioException("Una venta con depósito no se retrotrae (RN29)");
        }
        if (i.getDescartes() >= maxDescartes && !a.veTodo()) {
            throw new AccessDeniedException("Este interesado ya tuvo " + i.getDescartes() + " separaciones liberadas: "
                    + "solo un coordinador puede liberar otra (RN31)");
        }
        String cuenta = a.u().codigoCuenta();
        s.setEstado(SeparacionLote.Estado.LIBERADA);
        s.setCerradaEn(ahora());
        s.setCerradaPor(cuenta);
        s.setMotivo(req.motivo());
        separaciones.saveAndFlush(s);
        inmuebles.marcarEstado(s.getCasoCodigo(), s.getProyectoCodigo(), s.getLoteClave(), EstadoComercial.DISPONIBLE);
        i.setDescartes(i.getDescartes() + 1);
        nota(i.getId(), "Separación liberada: " + req.motivo() + ". " + i.getReferencia() + " vuelve a estar disponible.",
                cuenta);
        moverEtapa(i, req.etapa(), cuenta, req.motivo());
        tocar(i);
        return detalleDe(intereses.saveAndFlush(i));
    }

    /**
     * v2.0 (RF35): el asesor agenda una cita (visita al lote, reunión en oficina o llamada) con fecha principal y, si el
     * cliente la pidió, una alternativa. Queda confirmada en la fecha principal y a cargo del responsable (si no tenía,
     * quien la agenda lo toma). El interesado pasa a Cita agendada si estaba antes en el embudo.
     */
    InteresDetalle agendarCita(Long id, CitaPanel req) {
        Alcance a = alcance();
        Interes i = buscarVisible(id, a);
        if (i.getEtapa().cerrada()) throw new ReglaNegocioException("El interesado está cerrado (venta o descarte)");
        if (req.tipo() == ModalidadCita.VISITA_AL_LOTE && !vinculado(i) && i.getOrigen() != OrigenInteres.PROYECTO) {
            throw new IllegalArgumentException("tipo: una visita necesita un lote, un inmueble o un proyecto");
        }
        String cuenta = a.u().codigoCuenta();
        tomarSiNoTiene(i, a.u());
        Instant ahora = ahora();
        Cita c = new Cita();
        c.setInteresId(i.getId());
        c.setModalidad(req.tipo());
        c.setFecha1(req.principal().fecha());
        c.setFranja1(req.principal().franja());
        if (req.alternativa() != null) {
            c.setFecha2(req.alternativa().fecha());
            c.setFranja2(req.alternativa().franja());
        }
        c.setEstado(EstadoCita.CONFIRMADA);
        c.setFechaAcordada(req.principal().fecha());
        c.setFranjaAcordada(req.principal().franja());
        c.setAsesor(i.getResponsable());
        c.setAtendidaPor(cuenta);
        c.setCreadaEn(ahora);
        c.setActualizadaEn(ahora);
        citas.saveAndFlush(c);
        nota(i.getId(), "Cita agendada: " + req.tipo().etiqueta + " el " + req.principal().fecha() + " ("
                + req.principal().franja().etiqueta.toLowerCase() + ")" + (req.alternativa() == null ? ""
                : "; fecha opcional " + req.alternativa().fecha() + " (" + req.alternativa().franja().etiqueta.toLowerCase()
                + ")") + ". A cargo de " + i.getResponsable() + ".", cuenta);
        if (i.getEtapa().ordinal() < EtapaInteres.CITA_AGENDADA.ordinal()) moverEtapa(i, EtapaInteres.CITA_AGENDADA, cuenta, null);
        tocar(i);
        return detalleDe(intereses.saveAndFlush(i));
    }

    /**
     * v2.0 (RF37): el día del asesor que pide: sus citas y llamadas de hoy y de mañana, y sus seguimientos pendientes.
     * Son suyas las de sus interesados y las que tiene a cargo.
     */
    @Transactional(readOnly = true)
    MiDia miDia() {
        UsuarioActual u = exigirEquipo();
        String yo = u.codigoCuenta();
        LocalDate hoy = hoy();
        LocalDate manana = hoy.plusDays(1);
        List<Cita> lista = citas.enRango(hoy, manana);
        Map<Long, Interes> porId = new HashMap<>();
        intereses.findAllById(lista.stream().map(Cita::getInteresId).distinct().toList())
                .forEach(i -> porId.put(i.getId(), i));
        List<CitaDelDia> deHoy = new ArrayList<>();
        List<CitaDelDia> proximas = new ArrayList<>();
        for (Cita c : lista) {
            Interes i = porId.get(c.getInteresId());
            boolean mia = yo.equals(c.getAsesor()) || (c.getAsesor() == null && i != null && yo.equals(i.getResponsable()));
            if (!mia) continue;
            CitaDto dto = CitaDto.de(c, i);
            if (c.getEstado().agendada()) {
                agregarAlDia(c.getFechaAcordada(), c.getFranjaAcordada(), dto, false, hoy, deHoy, proximas);
            } else if (c.getEstado() == EstadoCita.SOLICITADA) {
                agregarAlDia(c.getFecha1(), c.getFranja1(), dto, true, hoy, deHoy, proximas);
                if (c.getFecha2() != null) agregarAlDia(c.getFecha2(), c.getFranja2(), dto, true, hoy, deHoy, proximas);
            }
        }
        Comparator<CitaDelDia> orden = Comparator.comparing(CitaDelDia::franja).thenComparing(x -> x.cita().id());
        deHoy.sort(orden);
        proximas.sort(orden);
        long pendientes = 0, vencidos = 0;
        for (Interes i : intereses.findAll()) {
            if (!yo.equals(i.getResponsable()) || i.getEtapa().cerrada() || i.getProximaAccionFecha() == null) continue;
            if (!i.getProximaAccionFecha().isAfter(hoy)) pendientes++;
            if (i.getProximaAccionFecha().isBefore(hoy)) vencidos++;
        }
        return new MiDia(yo, hoy, deHoy, proximas, pendientes, vencidos, !deHoy.isEmpty() || !proximas.isEmpty());
    }

    private static void agregarAlDia(LocalDate fecha, Franja franja, CitaDto dto, boolean porConfirmar, LocalDate hoy,
            List<CitaDelDia> deHoy, List<CitaDelDia> proximas) {
        if (fecha == null) return;
        CitaDelDia d = new CitaDelDia(dto, fecha, franja, franja.etiqueta, porConfirmar);
        if (fecha.equals(hoy)) deHoy.add(d);
        else if (fecha.equals(hoy.plusDays(1))) proximas.add(d);
    }

    /** Responsable y próxima acción con fecha. El responsable debe ser una cuenta de asesor o de gestor. */
    InteresDetalle seguimiento(Long id, Seguimiento req) {
        Alcance a = alcance();
        Interes i = buscarVisible(id, a);
        if (req.responsable() != null && !auth.tieneRol(req.responsable(), Rol.ASESOR)
                && !auth.tieneRol(req.responsable(), Rol.GESTOR)) {
            throw new IllegalArgumentException("responsable: debe ser una cuenta de asesor o de gestor");
        }
        // RN28: sin coordinación, un asesor solo se asigna a sí mismo (o deja al interesado sin asignar).
        if (!a.veTodo() && req.responsable() != null && !req.responsable().equals(a.u().codigoCuenta())) {
            throw new AccessDeniedException("Solo un coordinador asigna interesados a otro asesor");
        }
        i.setResponsable(req.responsable());
        i.setProximaAccion(req.proximaAccion());
        i.setProximaAccionFecha(req.proximaAccionFecha());
        tocar(i);
        return detalleDe(intereses.saveAndFlush(i));
    }

    /** Agrega una nota (solo se agregan). */
    NotaDto agregarNota(Long id, NuevaNota req) {
        Alcance a = alcance();
        UsuarioActual u = a.u();
        Interes i = buscarVisible(id, a);
        tocar(i);
        intereses.save(i);
        return NotaDto.de(nota(i.getId(), req.texto(), u.codigoCuenta()));
    }

    /** Elimina el registro a pedido del interesado: se van sus notas y sus citas. */
    void eliminar(Long id) {
        Interes i = buscarVisible(id, alcance());
        if (vigente(i).filter(s -> s.getEstado() == SeparacionLote.Estado.ACTIVA).isPresent()) {
            throw new ReglaNegocioException("El interesado tiene un lote separado: libéralo antes de eliminar el registro");
        }
        intereses.delete(i);
        intereses.flush();
    }

    /**
     * Acción explícita del asesor: con el interesado en SEPARACION o VENTA, marca su lote (o inmueble) como SEPARADO o
     * VENDIDO. No cambia el indicador A.
     */
    InteresDetalle marcarLote(Long id, MarcaLote req) {
        Alcance a = alcance();
        UsuarioActual u = a.u();
        Interes i = buscarVisible(id, a);
        if (i.getEtapa() != EtapaInteres.SEPARACION && i.getEtapa() != EtapaInteres.VENTA) {
            throw new ReglaNegocioException("Solo se marca el lote con el interesado en Separación o en Venta");
        }
        if (i.getOrigen() != OrigenInteres.LOTE && i.getOrigen() != OrigenInteres.CASO) {
            throw new ReglaNegocioException("El interesado no está vinculado a un lote ni a un inmueble");
        }
        // v2.0 (RN29): el mismo lote no se marca para otro interesado si ya está separado o vendido para alguien más.
        if (!otrasSeparaciones(i).isEmpty()) {
            throw new ConflictoException("El lote ya está separado o vendido para otro interesado (RN29)");
        }
        Optional<SeparacionLote> vigente = vigente(i);
        if (vigente.isPresent() && vigente.get().getEstado() == SeparacionLote.Estado.VENDIDA
                && req.estado() == EstadoComercial.SEPARADO) {
            throw new ReglaNegocioException("Una venta no vuelve a separación: libérala con un motivo");
        }
        if (vigente.isPresent() && req.estado() == EstadoComercial.VENDIDO) {
            vigente.get().setEstado(SeparacionLote.Estado.VENDIDA);
            separaciones.saveAndFlush(vigente.get());
        } else if (vigente.isEmpty()) {
            nuevaSeparacion(i, req.estado() == EstadoComercial.VENDIDO ? SeparacionLote.Estado.VENDIDA
                    : SeparacionLote.Estado.ACTIVA, false, u.codigoCuenta());
        }
        EstadoComercial e = inmuebles.marcarEstado(i.getCasoCodigo(), i.getProyectoCodigo(), i.getLoteClave(),
                req.estado());
        nota(i.getId(), "Se marcó " + i.getReferencia() + " como " + e.etiqueta().toLowerCase() + ".", u.codigoCuenta());
        tocar(i);
        return detalleDe(intereses.saveAndFlush(i));
    }

    /** Demanda de los interesados activos (sin descartados) por zona, tipo, presupuesto y proyecto. */
    @Transactional(readOnly = true)
    ResumenDemanda resumen() {
        List<Interes> todos = visibles(alcance());
        Map<EtapaInteres, Long> porEtapa = new EnumMap<>(EtapaInteres.class);
        for (EtapaInteres e : EtapaInteres.values()) porEtapa.put(e, 0L);
        for (Interes i : todos) porEtapa.merge(i.getEtapa(), 1L, Long::sum);
        List<Interes> activos = todos.stream().filter(i -> i.getEtapa() != EtapaInteres.DESCARTADO).toList();
        Map<String, String> nombres = new HashMap<>();
        inmuebles.proyectos().forEach(p -> nombres.put(p.codigo(), p.nombre()));
        return new ResumenDemanda(activos.size(), porEtapa,
                contar(activos, i -> i.getZona() == null ? "Sin zona indicada" : i.getZona(), Function.identity()),
                contar(activos, i -> i.getTipo() == null ? "SIN_TIPO" : i.getTipo(),
                        t -> switch (t) { case "LOTE" -> "Lote o terreno"; case "VIVIENDA" -> "Vivienda"; default -> "Sin indicar"; }),
                contarOrdenado(activos, InteresService::rangoPresupuesto),
                contar(activos.stream().filter(i -> i.getProyectoCodigo() != null).toList(), Interes::getProyectoCodigo,
                        c -> nombres.getOrDefault(c, c)));
    }

    @Transactional(readOnly = true)
    OpcionesBandeja opciones() {
        Alcance a = alcance();
        // La lista de cuentas posibles es la misma para todos; quién puede asignar a otro lo valida seguimiento() (RN28).
        return new OpcionesBandeja(inmuebles.proyectos(), responsables(), a.u().codigoCuenta(), a.veTodo());
    }

    /**
     * v1.0 (etapa 9): cuentas que pueden ser responsables de un interesado: todas las de asesor (las de app.asesores) y
     * de gestor, en orden alfabético.
     */
    private List<String> responsables() {
        return auth.cuentasConRol(Rol.ASESOR, Rol.GESTOR);
    }

    /** v1.0 (etapa 9): cuántos interesados están en etapa NUEVO, para el aviso del menú «Interesados». */
    @Transactional(readOnly = true)
    ConteoNuevos nuevos() {
        Alcance a = alcance();
        if (a.veTodo()) return new ConteoNuevos(intereses.countByEtapa(EtapaInteres.NUEVO));
        return new ConteoNuevos(visibles(a).stream().filter(i -> i.getEtapa() == EtapaInteres.NUEVO).count());
    }

    /** Encabezado del CSV de la bandeja (etapa 9). */
    static final List<String> COLUMNAS_CSV = List.of("Registrado el", "Nombre", "Medio", "Contacto", "Canal", "Etapa",
            "Inmueble o búsqueda", "Proyecto", "Lote", "Zona", "Tipo", "Presupuesto mínimo", "Presupuesto máximo",
            "Moneda", "Área deseada (m²)", "Forma de pago", "Responsable", "Próxima acción", "Fecha de la próxima acción",
            "Acción vencida", "Cita por confirmar", "Notas");

    private static final java.time.format.DateTimeFormatter FECHA_HORA =
            java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    /**
     * v1.0 (etapa 9): la bandeja con los mismos filtros y el mismo orden que en pantalla, en un CSV para Excel (punto y
     * coma, UTF-8 con BOM). Lleva datos de contacto: solo asesor y gestor (SecurityConfig y exigirEquipo).
     */
    @Transactional(readOnly = true)
    byte[] exportar(EtapaInteres etapa, String proyecto, String responsable, boolean soloVencidos) {
        List<InteresDto> lista = listar(etapa, proyecto, responsable, soloVencidos);
        Map<String, String> nombres = new HashMap<>();
        inmuebles.proyectos().forEach(p -> nombres.put(p.codigo(), p.nombre()));
        List<List<String>> filas = new ArrayList<>();
        for (InteresDto d : lista) {
            String busqueda = d.inmueble() != null ? d.inmueble()
                    : "Búsqueda: " + (d.tipo() == null ? "sin tipo" : d.tipo().equals("VIVIENDA") ? "vivienda" : "lote")
                            + (d.zona() == null ? "" : " en " + d.zona());
            filas.add(java.util.Arrays.asList(FECHA_HORA.format(d.creadoEn().atZone(ZONA)), d.nombre(),
                    d.medio().etiqueta, d.contacto(), d.canal().etiqueta, d.etapaEtiqueta(), busqueda,
                    d.proyectoCodigo() == null ? null : nombres.getOrDefault(d.proyectoCodigo(), d.proyectoCodigo()),
                    d.loteClave(), d.zona(),
                    d.tipo() == null ? null : d.tipo().equals("VIVIENDA") ? "Vivienda" : "Lote o terreno",
                    plano(d.presupuestoMin()), plano(d.presupuestoMax()), d.moneda(), plano(d.areaDeseada()),
                    d.formaPagoEtiqueta(), d.responsable(), d.proximaAccion(),
                    d.proximaAccionFecha() == null ? null : d.proximaAccionFecha().toString(), d.vencido() ? "Sí" : "No",
                    d.citaPorConfirmar() ? "Sí" : "No", String.valueOf(d.notas())));
        }
        return pe.trustinmuebles.shared.EscritorCsv.excel(COLUMNAS_CSV, filas);
    }

    private static String plano(BigDecimal n) {
        return n == null ? null : n.stripTrailingZeros().toPlainString();
    }

    /**
     * v1.0 (etapa 9): embudo de la bandeja. Cantidad y porcentaje por etapa del total y de cada proyecto con interesados
     * (y, si hay, de los que no tienen proyecto). Cuenta también los descartados, para que las etapas sumen el total.
     */
    @Transactional(readOnly = true)
    Embudo embudo() {
        List<Interes> todos = visibles(alcance());
        Map<String, List<Interes>> porProyecto = new LinkedHashMap<>();
        for (pe.trustinmuebles.expediente.InmueblesInteres.ProyectoOpcion p : inmuebles.proyectos()) {
            porProyecto.put(p.codigo(), new ArrayList<>());
        }
        List<Interes> sinProyecto = new ArrayList<>();
        for (Interes i : todos) {
            if (i.getProyectoCodigo() == null) sinProyecto.add(i);
            else porProyecto.computeIfAbsent(i.getProyectoCodigo(), k -> new ArrayList<>()).add(i);
        }
        Map<String, String> nombres = new HashMap<>();
        inmuebles.proyectos().forEach(p -> nombres.put(p.codigo(), p.nombre()));
        List<FilaEmbudo> filas = new ArrayList<>();
        porProyecto.forEach((codigo, lista) -> {
            if (!lista.isEmpty()) filas.add(filaEmbudo(codigo, nombres.getOrDefault(codigo, codigo), lista));
        });
        if (!sinProyecto.isEmpty()) {
            filas.add(filaEmbudo("SIN_PROYECTO", "Sin proyecto (búsqueda general o inmueble suelto)", sinProyecto));
        }
        return new Embudo(filaEmbudo("TOTAL", "Todos los interesados", todos), filas);
    }

    static FilaEmbudo filaEmbudo(String clave, String etiqueta, List<Interes> lista) {
        Map<EtapaInteres, Long> n = new EnumMap<>(EtapaInteres.class);
        for (Interes i : lista) n.merge(i.getEtapa(), 1L, Long::sum);
        List<EtapaEmbudo> etapas = new ArrayList<>();
        for (EtapaInteres e : EtapaInteres.values()) {
            long c = n.getOrDefault(e, 0L);
            etapas.add(new EtapaEmbudo(e, e.etiqueta(), c, porcentaje(c, lista.size())));
        }
        return new FilaEmbudo(clave, etiqueta, lista.size(), etapas);
    }

    /** Porcentaje con un decimal (redondeo al más cercano); 0.0 si no hay ninguno. */
    static BigDecimal porcentaje(long parte, long total) {
        if (total == 0) return BigDecimal.ZERO.setScale(1);
        return BigDecimal.valueOf(parte * 100L).divide(BigDecimal.valueOf(total), 1, java.math.RoundingMode.HALF_UP);
    }

    // ------------------------------------------------------------------ citas

    /** Agenda simple de 7 días desde {@code desde} (hoy si no se indica), una lista por día. */
    @Transactional(readOnly = true)
    Agenda agenda(LocalDate desde) {
        Alcance a = alcance();
        LocalDate inicio = desde == null ? hoy() : desde;
        LocalDate fin = inicio.plusDays(6);
        Map<Long, Interes> porId = new HashMap<>();
        List<Cita> enRango = citas.enRango(inicio, fin);
        intereses.findAllById(enRango.stream().map(Cita::getInteresId).distinct().toList())
                .forEach(i -> porId.put(i.getId(), i));
        // RN28: solo las citas de los interesados que la cuenta ve.
        List<Cita> lista = enRango.stream().filter(c -> porId.containsKey(c.getInteresId()) && a.ve(porId.get(c.getInteresId())))
                .toList();
        Map<LocalDate, List<CitaEnAgenda>> dias = new LinkedHashMap<>();
        for (LocalDate d = inicio; !d.isAfter(fin); d = d.plusDays(1)) dias.put(d, new ArrayList<>());
        for (Cita c : lista) {
            CitaDto dto = CitaDto.de(c, porId.get(c.getInteresId()));
            if (c.getEstado().agendada()) {
                dias.get(c.getFechaAcordada()).add(new CitaEnAgenda(dto, false, null, c.getFranjaAcordada(),
                        c.getFranjaAcordada().etiqueta));
            } else {
                if (dias.containsKey(c.getFecha1())) {
                    dias.get(c.getFecha1()).add(new CitaEnAgenda(dto, true, 1, c.getFranja1(), c.getFranja1().etiqueta));
                }
                if (c.getFecha2() != null && dias.containsKey(c.getFecha2())) {
                    dias.get(c.getFecha2()).add(new CitaEnAgenda(dto, true, 2, c.getFranja2(), c.getFranja2().etiqueta));
                }
            }
        }
        List<DiaAgenda> salida = new ArrayList<>();
        dias.forEach((d, l) -> {
            l.sort(Comparator.comparing(CitaEnAgenda::franja).thenComparing(x -> x.cita().id()));
            salida.add(new DiaAgenda(d, l));
        });
        return new Agenda(inicio, fin, salida);
    }

    /** Confirma una de las fechas propuestas. Solo una cita por confirmar. */
    CitaDto confirmar(Long citaId, Confirmacion req) {
        UsuarioActual u = exigirEquipo();
        Cita c = buscarCitaVisible(citaId);
        if (c.getEstado() != EstadoCita.SOLICITADA) throw new ConflictoException("La cita ya fue atendida");
        if (req.opcion() == 2 && c.getFecha2() == null) {
            throw new IllegalArgumentException("opcion: la cita solo tiene una fecha propuesta");
        }
        LocalDate fecha = req.opcion() == 1 ? c.getFecha1() : c.getFecha2();
        if (fecha.isBefore(hoy())) {
            throw new ReglaNegocioException("Esa fecha ya pasó: reprograma la cita con una fecha nueva");
        }
        c.setFechaAcordada(fecha);
        c.setFranjaAcordada(req.opcion() == 1 ? c.getFranja1() : c.getFranja2());
        return acordar(c, EstadoCita.CONFIRMADA, u, "Cita confirmada");
    }

    /** Acuerda otra fecha (una cita por confirmar o ya agendada). */
    CitaDto reprogramar(Long citaId, Reprogramacion req) {
        UsuarioActual u = exigirEquipo();
        Cita c = buscarCitaVisible(citaId);
        if (c.getEstado() == EstadoCita.RECHAZADA) throw new ConflictoException("La cita fue rechazada");
        c.setFechaAcordada(req.fecha());
        c.setFranjaAcordada(req.franja());
        return acordar(c, EstadoCita.REPROGRAMADA, u, "Cita reprogramada");
    }

    /** Rechaza la cita con un motivo. */
    CitaDto rechazar(Long citaId, Rechazo req) {
        UsuarioActual u = exigirEquipo();
        Cita c = buscarCitaVisible(citaId);
        if (c.getEstado() == EstadoCita.RECHAZADA) throw new ConflictoException("La cita ya fue rechazada");
        c.setEstado(EstadoCita.RECHAZADA);
        c.setMotivoRechazo(req.motivo());
        c.setFechaAcordada(null);
        c.setFranjaAcordada(null);
        c.setAtendidaPor(u.codigoCuenta());
        c.setActualizadaEn(ahora());
        c.setSemillaDesfase(null);
        Interes i = buscar(c.getInteresId());
        nota(i.getId(), "Cita rechazada: " + req.motivo(), u.codigoCuenta());
        return CitaDto.de(citas.saveAndFlush(c), i);
    }

    /**
     * Deja la cita agendada y, si el interesado estaba en Nuevo o Contactado, lo pasa a Cita agendada (con su nota).
     */
    private CitaDto acordar(Cita c, EstadoCita estado, UsuarioActual u, String accion) {
        c.setEstado(estado);
        c.setMotivoRechazo(null);
        c.setAtendidaPor(u.codigoCuenta());
        c.setActualizadaEn(ahora());
        c.setSemillaDesfase(null);
        Interes i = buscar(c.getInteresId());
        // v2.0 (RF35): la cita queda a cargo del responsable del interesado o, si no tiene, de quien la atiende.
        if (c.getAsesor() == null) c.setAsesor(i.getResponsable() != null ? i.getResponsable() : u.codigoCuenta());
        nota(i.getId(), accion + ": " + c.getModalidad().etiqueta + " el " + c.getFechaAcordada() + " ("
                + c.getFranjaAcordada().etiqueta.toLowerCase() + ").", u.codigoCuenta());
        if (i.getEtapa() == EtapaInteres.NUEVO || i.getEtapa() == EtapaInteres.CONTACTADO
                || i.getEtapa() == EtapaInteres.REVISADO) {
            moverEtapa(i, EtapaInteres.CITA_AGENDADA, u.codigoCuenta(), null);
        }
        tocar(i);
        intereses.save(i);
        return CitaDto.de(citas.saveAndFlush(c), i);
    }

    // ------------------------------------------------------------------ apoyo

    private InteresDetalle detalleDe(Interes i) {
        List<Cita> lista = citas.findByInteresIdOrderByIdAsc(i.getId());
        List<NotaDto> ns = notas.findByInteresIdOrderByIdAsc(i.getId()).stream().map(NotaDto::de).toList();
        boolean marcable = (i.getEtapa() == EtapaInteres.SEPARACION || i.getEtapa() == EtapaInteres.VENTA)
                && (i.getOrigen() == OrigenInteres.LOTE || i.getOrigen() == OrigenInteres.CASO);
        SeparacionLote s = vigente(i).orElse(null);
        boolean liberable = s != null && !(s.getEstado() == SeparacionLote.Estado.VENDIDA && s.isConDeposito());
        return new InteresDetalle(dto(i, ns.size(), lista, hoy()), i.getMensaje(), i.getConsentimientoVersion(),
                i.getConsentimientoEn(), ns, lista.stream().map(c -> CitaDto.de(c, i)).toList(), marcable,
                i.getConsentimientoForma(), i.getConsentimientoForma().etiqueta, i.getConsentimientoRegistradoPor(),
                historial.findByInteresIdOrderByIdAsc(i.getId()).stream().map(HistorialEtapaDto::de).toList(),
                SeparacionDto.de(s), i.getDescartes(), liberable);
    }

    // ------------------------------------------------------------------ v2.0: alcance por cuenta (RN28)

    /** Quién pide y si ve a todos (coordinación) o solo a sus interesados y a los sin asignar. */
    record Alcance(UsuarioActual u, boolean veTodo) {
        boolean ve(Interes i) {
            return veTodo || i.getResponsable() == null || i.getResponsable().equals(u.codigoCuenta());
        }
    }

    /** Cuenta de coordinación: el rol GESTOR o una cuenta de app.asesores.coordinadores. */
    boolean esCoordinador(UsuarioActual u) {
        return u.rol() == Rol.GESTOR || coordinadores.contains(u.codigoCuenta());
    }

    private Alcance alcance() {
        UsuarioActual u = exigirEquipo();
        return new Alcance(u, esCoordinador(u));
    }

    private List<Interes> visibles(Alcance a) {
        return intereses.findAll().stream().filter(a::ve).toList();
    }

    /** El interesado, si la cuenta lo ve; si es de otro asesor, 403 (RN28). Si no existe, 404. */
    private Interes buscarVisible(Long id, Alcance a) {
        Interes i = buscar(id);
        if (!a.ve(i)) throw new AccessDeniedException("Este interesado está a cargo de otro asesor");
        return i;
    }

    private Cita buscarCitaVisible(Long id) {
        Cita c = buscarCita(id);
        buscarVisible(c.getInteresId(), alcance());
        return c;
    }

    // ------------------------------------------------------------------ v2.0: etapas y separación del lote

    /** Cambia la etapa con su nota («Etapa: A → B.») y la fila del historial con cuenta, fecha y motivo (RF36). */
    private void moverEtapa(Interes i, EtapaInteres hacia, String cuenta, String motivo) {
        nota(i.getId(), "Etapa: " + i.getEtapa().etiqueta() + " → " + hacia.etiqueta() + ".", cuenta);
        HistorialEtapa h = new HistorialEtapa();
        h.setInteresId(i.getId());
        h.setDesde(i.getEtapa());
        h.setHacia(hacia);
        h.setCuentaCodigo(cuenta);
        h.setRegistradoEn(ahora());
        h.setMotivo(motivo);
        historial.save(h);
        i.setEtapa(hacia);
    }

    /** ¿Está vinculado a un lote o a un inmueble cuyo estado se puede cambiar? */
    private static boolean vinculado(Interes i) {
        return (i.getOrigen() == OrigenInteres.LOTE || i.getOrigen() == OrigenInteres.CASO)
                && (i.getCasoCodigo() != null || (i.getProyectoCodigo() != null && i.getLoteClave() != null));
    }

    /** RN30: el cambio de estado lo hace el responsable; si el interesado no tenía, quien lo hace lo toma. */
    private void tomarSiNoTiene(Interes i, UsuarioActual u) {
        if (i.getResponsable() != null) return;
        i.setResponsable(u.codigoCuenta());
        nota(i.getId(), "Queda a cargo de " + u.codigoCuenta() + ".", u.codigoCuenta());
    }

    /** La separación activa o la venta del interesado, si tiene. */
    private Optional<SeparacionLote> vigente(Interes i) {
        if (i.getId() == null) return Optional.empty();
        return separaciones.findFirstByInteresIdAndEstadoInOrderByIdDesc(i.getId(),
                List.of(SeparacionLote.Estado.ACTIVA, SeparacionLote.Estado.VENDIDA));
    }

    /** Separaciones activas o ventas del mismo lote (o caso) de otros interesados. */
    private List<SeparacionLote> otrasSeparaciones(Interes i) {
        List<SeparacionLote.Estado> vivas = List.of(SeparacionLote.Estado.ACTIVA, SeparacionLote.Estado.VENDIDA);
        List<SeparacionLote> mismas = i.getCasoCodigo() != null ? separaciones.findByCasoCodigoAndEstadoIn(i.getCasoCodigo(), vivas)
                : i.getProyectoCodigo() != null && i.getLoteClave() != null
                        ? separaciones.findByProyectoCodigoAndLoteClaveAndEstadoIn(i.getProyectoCodigo(), i.getLoteClave(), vivas)
                        : List.of();
        return mismas.stream().filter(s -> !s.getInteresId().equals(i.getId())).toList();
    }

    /**
     * RF41 y RN29: al pasar a Separación, el lote debe estar disponible y sin separación de otro; al pasar a Venta, debe
     * estar disponible o separado para este mismo interesado. El estado cambia en el lote y se ve en el plano para todos.
     */
    private void aplicarAlLote(Interes i, CambioEtapa req, UsuarioActual u, Optional<SeparacionLote> vigente) {
        boolean propia = vigente.isPresent() && vigente.get().getEstado() == SeparacionLote.Estado.ACTIVA;
        EstadoComercial actual = inmuebles.estadoActual(i.getCasoCodigo(), i.getProyectoCodigo(), i.getLoteClave());
        if (!otrasSeparaciones(i).isEmpty() || (!propia && actual != EstadoComercial.DISPONIBLE)) {
            throw new ConflictoException(i.getReferencia() + " ya está " + actual.etiqueta().toLowerCase()
                    + ": no se puede separar ni vender para otro interesado (RN29)");
        }
        EstadoComercial nuevo;
        if (req.etapa() == EtapaInteres.SEPARACION) {
            nuevaSeparacion(i, SeparacionLote.Estado.ACTIVA, false, u.codigoCuenta());
            nuevo = EstadoComercial.SEPARADO;
        } else {
            if (propia) {
                SeparacionLote s = vigente.get();
                s.setEstado(SeparacionLote.Estado.VENDIDA);
                s.setConDeposito(req.conDeposito());
                separaciones.saveAndFlush(s);
            } else {
                nuevaSeparacion(i, SeparacionLote.Estado.VENDIDA, req.conDeposito(), u.codigoCuenta());
            }
            nuevo = EstadoComercial.VENDIDO;
        }
        inmuebles.marcarEstado(i.getCasoCodigo(), i.getProyectoCodigo(), i.getLoteClave(), nuevo);
        nota(i.getId(), "Se marcó " + i.getReferencia() + " como " + nuevo.etiqueta().toLowerCase()
                + (req.conDeposito() ? " (con depósito)" : "") + ".", u.codigoCuenta());
    }

    private SeparacionLote nuevaSeparacion(Interes i, SeparacionLote.Estado estado, boolean conDeposito, String cuenta) {
        SeparacionLote s = new SeparacionLote();
        s.setInteresId(i.getId());
        s.setCasoCodigo(i.getCasoCodigo());
        s.setProyectoCodigo(i.getCasoCodigo() == null ? i.getProyectoCodigo() : null);
        s.setLoteClave(i.getCasoCodigo() == null ? i.getLoteClave() : null);
        s.setEstado(estado);
        s.setConDeposito(conDeposito);
        s.setCreadaEn(ahora());
        s.setCreadaPor(cuenta);
        return separaciones.saveAndFlush(s);
    }

    static InteresDto dto(Interes i, long nNotas, List<Cita> susCitas, LocalDate hoy) {
        boolean vencido = !i.getEtapa().cerrada() && i.getProximaAccionFecha() != null
                && i.getProximaAccionFecha().isBefore(hoy);
        boolean porConfirmar = susCitas.stream().anyMatch(c -> c.getEstado() == EstadoCita.SOLICITADA);
        return new InteresDto(i.getId(), i.getCreadoEn(), i.getOrigen().name(), i.getReferencia(), i.getInmueble(),
                i.getCasoCodigo(), i.getProyectoCodigo(), i.getLoteClave(), i.getZona(), i.getTipo(),
                i.getPresupuestoMin(), i.getPresupuestoMax(), i.getMoneda(), i.getAreaDeseada(), i.getFormaPago(),
                i.getFormaPago().etiqueta, i.getNombre(), i.getMedio(), i.getContacto(), i.getEtapa(),
                i.getEtapa().etiqueta(), i.getResponsable(), i.getProximaAccion(), i.getProximaAccionFecha(), vencido,
                porConfirmar, nNotas, i.getCanal(), i.getCanal().etiqueta);
    }

    /** Rangos de presupuesto, por moneda (nunca se suman soles y dólares). Se usa el máximo o, si falta, el mínimo. */
    record Rango(String clave, String etiqueta, int orden) {}

    static Rango rangoPresupuesto(Interes i) {
        BigDecimal v = i.getPresupuestoMax() != null ? i.getPresupuestoMax() : i.getPresupuestoMin();
        if (v == null) return new Rango("SIN_PRESUPUESTO", "Sin presupuesto indicado", 99);
        if ("USD".equals(i.getMoneda())) {
            if (v.compareTo(BigDecimal.valueOf(30_000)) <= 0) return new Rango("USD_30", "Hasta US$ 30 000", 10);
            if (v.compareTo(BigDecimal.valueOf(80_000)) <= 0) return new Rango("USD_80", "De US$ 30 000 a 80 000", 11);
            return new Rango("USD_MAS", "Más de US$ 80 000", 12);
        }
        if (v.compareTo(BigDecimal.valueOf(40_000)) <= 0) return new Rango("PEN_40", "Hasta S/ 40 000", 0);
        if (v.compareTo(BigDecimal.valueOf(80_000)) <= 0) return new Rango("PEN_80", "De S/ 40 000 a 80 000", 1);
        if (v.compareTo(BigDecimal.valueOf(150_000)) <= 0) return new Rango("PEN_150", "De S/ 80 000 a 150 000", 2);
        return new Rango("PEN_MAS", "Más de S/ 150 000", 3);
    }

    private static List<Conteo> contar(List<Interes> lista, Function<Interes, String> clave,
            Function<String, String> etiqueta) {
        Map<String, Long> n = new HashMap<>();
        for (Interes i : lista) n.merge(clave.apply(i), 1L, Long::sum);
        return n.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
                .map(e -> new Conteo(e.getKey(), etiqueta.apply(e.getKey()), e.getValue())).toList();
    }

    private static List<Conteo> contarOrdenado(List<Interes> lista, Function<Interes, Rango> rango) {
        Map<Rango, Long> n = new HashMap<>();
        for (Interes i : lista) n.merge(rango.apply(i), 1L, Long::sum);
        return n.entrySet().stream().sorted(Comparator.comparingInt(e -> e.getKey().orden()))
                .map(e -> new Conteo(e.getKey().clave(), e.getKey().etiqueta(), e.getValue())).toList();
    }

    private Map<Long, Long> conteoNotas() {
        Map<Long, Long> n = new HashMap<>();
        for (Object[] fila : notas.conteoPorInteres()) n.put((Long) fila[0], ((Number) fila[1]).longValue());
        return n;
    }

    private NotaInteres nota(Long interesId, String texto, String cuenta) {
        NotaInteres n = new NotaInteres();
        n.setInteresId(interesId);
        n.setTexto(recortar(texto, InteresDtos.MAX_NOTA));
        n.setCuentaCodigo(cuenta);
        n.setCreadaEn(ahora());
        return notas.save(n);
    }

    /** Una persona tocó el registro: deja de moverse con la fecha de arranque (precarga). */
    private static void tocar(Interes i) {
        i.setActualizadoEn(ahora());
        i.setSemillaDesfase(null);
    }

    private Interes buscar(Long id) {
        return intereses.findById(id).orElseThrow(() -> new NoEncontradoException("Interesado", id));
    }

    private Cita buscarCita(Long id) {
        return citas.findById(id).orElseThrow(() -> new NoEncontradoException("Cita", id));
    }

    private static UsuarioActual exigirEquipo() {
        UsuarioActual u = UsuarioActual.actual();
        if (!u.rol().incluye(Rol.GESTOR)) throw new AccessDeniedException("Solo el asesor y el gestor ven a los interesados");
        return u;
    }

    private static String recortar(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }

    static Instant ahora() {
        return Instant.now().truncatedTo(ChronoUnit.MILLIS);
    }
}
