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
import java.util.function.Function;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.trustinmuebles.expediente.EstadoComercial;
import pe.trustinmuebles.expediente.InmueblesInteres;
import pe.trustinmuebles.expediente.InmueblesInteres.Referencia;
import pe.trustinmuebles.identidad.AuthService;
import pe.trustinmuebles.identidad.Rol;
import pe.trustinmuebles.identidad.UsuarioActual;
import pe.trustinmuebles.interes.InteresDtos.*;
import pe.trustinmuebles.interes.Opciones.CanalInteres;
import pe.trustinmuebles.interes.Opciones.EstadoCita;
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

    InteresService(InteresRepository intereses, NotaInteresRepository notas, CitaRepository citas,
            InmueblesInteres inmuebles, AuthService auth, LimiteEnvios limite,
            @Value("${app.contacto.whatsapp:}") String whatsapp) {
        this.intereses = intereses;
        this.notas = notas;
        this.citas = citas;
        this.inmuebles = inmuebles;
        this.auth = auth;
        this.limite = limite;
        this.whatsapp = numeroWhatsapp(whatsapp, pe.trustinmuebles.shared.Empresa.datos().whatsapp());
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
        exigirEquipo();
        Map<Long, Long> nNotas = conteoNotas();
        Map<Long, List<Cita>> porInteres = new HashMap<>();
        for (Cita c : citas.findAll()) porInteres.computeIfAbsent(c.getInteresId(), k -> new ArrayList<>()).add(c);
        LocalDate hoy = hoy();
        List<InteresDto> salida = new ArrayList<>();
        for (Interes i : intereses.findAllByOrderByCreadoEnDescIdDesc()) {
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
        exigirEquipo();
        return detalleDe(buscar(id));
    }

    /** Cambia la etapa y deja una nota con el cambio. La misma etapa: 409. */
    InteresDetalle cambiarEtapa(Long id, CambioEtapa req) {
        UsuarioActual u = exigirEquipo();
        Interes i = buscar(id);
        if (i.getEtapa() == req.etapa()) throw new ConflictoException("El interesado ya está en esa etapa");
        nota(i.getId(), "Etapa: " + i.getEtapa().etiqueta() + " → " + req.etapa().etiqueta() + ".", u.codigoCuenta());
        i.setEtapa(req.etapa());
        tocar(i);
        return detalleDe(intereses.saveAndFlush(i));
    }

    /** Responsable y próxima acción con fecha. El responsable debe ser una cuenta de asesor o de gestor. */
    InteresDetalle seguimiento(Long id, Seguimiento req) {
        exigirEquipo();
        Interes i = buscar(id);
        if (req.responsable() != null && !auth.tieneRol(req.responsable(), Rol.ASESOR)
                && !auth.tieneRol(req.responsable(), Rol.GESTOR)) {
            throw new IllegalArgumentException("responsable: debe ser una cuenta de asesor o de gestor");
        }
        i.setResponsable(req.responsable());
        i.setProximaAccion(req.proximaAccion());
        i.setProximaAccionFecha(req.proximaAccionFecha());
        tocar(i);
        return detalleDe(intereses.saveAndFlush(i));
    }

    /** Agrega una nota (solo se agregan). */
    NotaDto agregarNota(Long id, NuevaNota req) {
        UsuarioActual u = exigirEquipo();
        Interes i = buscar(id);
        tocar(i);
        intereses.save(i);
        return NotaDto.de(nota(i.getId(), req.texto(), u.codigoCuenta()));
    }

    /** Elimina el registro a pedido del interesado: se van sus notas y sus citas. */
    void eliminar(Long id) {
        exigirEquipo();
        Interes i = buscar(id);
        intereses.delete(i);
        intereses.flush();
    }

    /**
     * Acción explícita del asesor: con el interesado en SEPARACION o VENTA, marca su lote (o inmueble) como SEPARADO o
     * VENDIDO. No cambia el indicador A.
     */
    InteresDetalle marcarLote(Long id, MarcaLote req) {
        UsuarioActual u = exigirEquipo();
        Interes i = buscar(id);
        if (i.getEtapa() != EtapaInteres.SEPARACION && i.getEtapa() != EtapaInteres.VENTA) {
            throw new ReglaNegocioException("Solo se marca el lote con el interesado en Separación o en Venta");
        }
        if (i.getOrigen() != OrigenInteres.LOTE && i.getOrigen() != OrigenInteres.CASO) {
            throw new ReglaNegocioException("El interesado no está vinculado a un lote ni a un inmueble");
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
        exigirEquipo();
        List<Interes> todos = intereses.findAll();
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
        exigirEquipo();
        return new OpcionesBandeja(inmuebles.proyectos(), responsables());
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
        exigirEquipo();
        return new ConteoNuevos(intereses.countByEtapa(EtapaInteres.NUEVO));
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
        exigirEquipo();
        List<Interes> todos = intereses.findAll();
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
        exigirEquipo();
        LocalDate inicio = desde == null ? hoy() : desde;
        LocalDate fin = inicio.plusDays(6);
        List<Cita> lista = citas.enRango(inicio, fin);
        Map<Long, Interes> porId = new HashMap<>();
        intereses.findAllById(lista.stream().map(Cita::getInteresId).distinct().toList())
                .forEach(i -> porId.put(i.getId(), i));
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
        Cita c = buscarCita(citaId);
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
        Cita c = buscarCita(citaId);
        if (c.getEstado() == EstadoCita.RECHAZADA) throw new ConflictoException("La cita fue rechazada");
        c.setFechaAcordada(req.fecha());
        c.setFranjaAcordada(req.franja());
        return acordar(c, EstadoCita.REPROGRAMADA, u, "Cita reprogramada");
    }

    /** Rechaza la cita con un motivo. */
    CitaDto rechazar(Long citaId, Rechazo req) {
        UsuarioActual u = exigirEquipo();
        Cita c = buscarCita(citaId);
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
        nota(i.getId(), accion + ": " + c.getModalidad().etiqueta + " el " + c.getFechaAcordada() + " ("
                + c.getFranjaAcordada().etiqueta.toLowerCase() + ").", u.codigoCuenta());
        if (i.getEtapa() == EtapaInteres.NUEVO || i.getEtapa() == EtapaInteres.CONTACTADO) {
            nota(i.getId(), "Etapa: " + i.getEtapa().etiqueta() + " → " + EtapaInteres.CITA_AGENDADA.etiqueta() + ".",
                    u.codigoCuenta());
            i.setEtapa(EtapaInteres.CITA_AGENDADA);
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
        return new InteresDetalle(dto(i, ns.size(), lista, hoy()), i.getMensaje(), i.getConsentimientoVersion(),
                i.getConsentimientoEn(), ns, lista.stream().map(c -> CitaDto.de(c, i)).toList(), marcable,
                i.getConsentimientoForma(), i.getConsentimientoForma().etiqueta, i.getConsentimientoRegistradoPor());
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
