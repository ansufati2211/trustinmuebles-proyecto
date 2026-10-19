package pe.trustinmuebles.expediente;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import pe.trustinmuebles.almacenamiento.AlmacenamientoService;
import pe.trustinmuebles.almacenamiento.ArchivoContenido;
import pe.trustinmuebles.checklist.ChecklistService;
import pe.trustinmuebles.checklist.ItemChecklistDto;
import pe.trustinmuebles.clasificacion.ClasificacionService;
import pe.trustinmuebles.clasificacion.EntradaClasificacion;
import pe.trustinmuebles.clasificacion.EvaluacionDto;
import pe.trustinmuebles.expediente.CasoDtos.*;
import pe.trustinmuebles.expediente.CopiaLiteralPdf.AsientoCopia;
import pe.trustinmuebles.expediente.CopiaLiteralPdf.DatosCopia;
import pe.trustinmuebles.checklist.EstadoItem;
import pe.trustinmuebles.clasificacion.Especialidad;
import pe.trustinmuebles.clasificacion.EstadoPlano;
import pe.trustinmuebles.clasificacion.TipoPredio;
import pe.trustinmuebles.inspeccion.EstadoTecnico;
import pe.trustinmuebles.inspeccion.EvaluacionTecnicaDto;
import pe.trustinmuebles.inspeccion.InformeDatos;
import pe.trustinmuebles.inspeccion.InspeccionService;
import pe.trustinmuebles.expediente.CopiaLiteralPdf.Procedencia;
import pe.trustinmuebles.identidad.Rol;
import pe.trustinmuebles.identidad.UsuarioActual;
import org.springframework.security.access.AccessDeniedException;
import pe.trustinmuebles.orientacion.GlosarioService;
import pe.trustinmuebles.shared.ConflictoException;
import pe.trustinmuebles.shared.NoEncontradoException;
import pe.trustinmuebles.shared.ReglaNegocioException;

@Service
@Transactional
class ExpedienteService {
    private final ExpedienteRepository expedientes;
    private final CasoLoteRepository casos;
    private final ClasificacionService clasificacion;
    private final ChecklistService checklist;
    private final GlosarioService glosario;
    private final AlmacenamientoService almacenamiento;
    private final InspeccionService inspeccion;

    ExpedienteService(ExpedienteRepository expedientes, CasoLoteRepository casos, ClasificacionService clasificacion,
            ChecklistService checklist, GlosarioService glosario, AlmacenamientoService almacenamiento,
            InspeccionService inspeccion) {
        this.expedientes = expedientes;
        this.casos = casos;
        this.clasificacion = clasificacion;
        this.checklist = checklist;
        this.glosario = glosario;
        this.almacenamiento = almacenamiento;
        this.inspeccion = inspeccion;
    }

    /**
     * M13: catálogo con filtros combinables (todos opcionales). Se filtra en el servidor porque el color documental y
     * el riesgo físico se derivan de otros módulos; así la regla vive en un solo lugar y tiene prueba.
     */
    @Transactional(readOnly = true)
    List<ResumenCaso> listar(FiltroCatalogo filtro) {
        return expedientes.findAllByOrderByCasoCodigoAsc().stream().map(e -> {
            EvaluacionDto ev = clasificacion.obtener(e.getId()).orElse(null);
            EvaluacionTecnicaDto t = inspeccion.obtener(e.getId());
            return new ResumenCaso(e.getCaso().getCodigo(), e.getCaso().getDenominacion(), e.getCaso().getContexto(),
                    ev == null ? null : ev.estado(), ev == null ? null : ev.etiqueta(),
                    checklist.contarPendientes(e.getId()), e.getCaso().getOrigen().name(), e.getCaso().getFuente(),
                    e.getCaso().getFechaConsulta(), t.estado(), t.resultado(), t.riesgoFisicoDetectado(), predio(e));
        }).filter(filtro::acepta).toList();
    }

    @Transactional(readOnly = true)
    DetalleCaso detalle(String codigo) {
        return aDetalle(buscar(codigo));
    }

    /**
     * REQ-F03, REQ-NF04, RN-06: valida, actualiza el predio y los asientos, regenera el documento si lo genera el
     * sistema, recalcula la evaluación y guarda todo en una sola transacción. Si algo falla no queda un registro parcial.
     */
    DetalleCaso actualizar(String codigo, ActualizarExpedienteRequest req) {
        Expediente e = buscar(codigo);
        if (!e.getCaso().isSintetico()) verificarDatosPersonales(req.datos(), e.getCaso().getDenominacion(), null);
        if (!req.versionEsperada().equals(e.getVersion())) {
            throw new ConflictoException("El expediente cambió mientras lo editaba. Recargue e intente de nuevo.");
        }
        List<String> archivosViejos = aplicar(e, req.datos());
        expedientes.saveAndFlush(e);
        archivosViejos.forEach(almacenamiento::eliminar);
        clasificacion.recalcular(e.getId(), e.getVersion(), entrada(e));
        return aDetalle(e);
    }

    /** Crea el expediente de un caso nuevo (carga de contenido). La evaluación la calcula quien llama. */
    Expediente crear(CasoLote caso, DatosExpediente datos) {
        Expediente e = new Expediente();
        e.setCaso(caso);
        e.setDocumentoGenerado(true);
        aplicar(e, datos);
        return expedientes.saveAndFlush(e);
    }

    // ------------------------------------------------------------ inspección y planos

    /**
     * M5: solo el comprador pide la inspección técnica presencial (también lo exige SecurityConfig). El solicitante
     * sale de la sesión autenticada, nunca del cuerpo. No cobra ni agenda.
     */
    EvaluacionTecnicaDto solicitarInspeccion(String codigo) {
        UsuarioActual u = UsuarioActual.actual();
        if (u.rol() != Rol.COMPRADOR) throw new AccessDeniedException("Solo un comprador puede solicitar la inspección");
        return inspeccion.solicitar(buscar(codigo).getId(), u.codigoCuenta());
    }

    /**
     * Solo el especialista emite el informe, y solo si el expediente tiene una solicitud. Su nombre, especialidad y
     * colegiatura salen de su cuenta (M8). No cambia el semáforo documental (RN-10).
     */
    DetalleCaso registrarInforme(String codigo, InformeDatos informe) {
        UsuarioActual u = UsuarioActual.actual();
        if (u.rol() != Rol.ESPECIALISTA) throw new AccessDeniedException("Solo el especialista emite el informe técnico");
        Expediente e = buscar(codigo);
        inspeccion.registrar(e.getId(), informe, u.id());
        return aDetalle(e);
    }

    record DocumentoPlano(byte[] datos, String nombre) {}

    /** El informe técnico en PDF. Solo existe cuando el especialista lo emitió. */
    @Transactional(readOnly = true)
    DocumentoPlano informeDocumento(String codigo) {
        Expediente e = buscar(codigo);
        EvaluacionTecnicaDto t = inspeccion.obtener(e.getId());
        if (t.estado() != EstadoTecnico.EMITIDO) throw new NoEncontradoException("Informe técnico", codigo);
        List<InformeTecnicoPdf.PlanoResumen> planos = new java.util.ArrayList<>();
        for (Especialidad esp : Especialidad.values()) {
            PlanoTecnico p = planoDe(e, esp);
            String estado = p == null ? "no presentado" : switch (p.getEstado()) {
                case PRESENTADO -> "presentado";
                case OBSERVADO -> "observado";
                case NO_PRESENTADO -> "no presentado";
                case NO_APLICA -> "no aplica";
            };
            String detalle = p == null ? null : esp == Especialidad.ARQUITECTURA && p.getAreaConstruida() != null
                    ? p.getAreaConstruida().setScale(2, java.math.RoundingMode.HALF_UP) + " m²"
                    : p != null && p.getSistemaConstructivo() != null ? p.getSistemaConstructivo().etiqueta() : null;
            var verificacion = switch (esp) {
                case ARQUITECTURA -> t.verifArquitectura();
                case ESTRUCTURAS -> t.verifEstructuras();
                case ELECTRICAS -> t.verifElectricas();
                case SANITARIAS -> t.verifSanitarias();
            };
            planos.add(new InformeTecnicoPdf.PlanoResumen(esp.etiqueta(), estado, detalle, verificacion));
        }
        byte[] pdf = InformeTecnicoPdf.generar(new InformeTecnicoPdf.Datos(codigo, e.getCaso().getDenominacion(),
                e.getUbicacion(), e.getAreaM2(), e.getAreaConstruidaInscrita(), planos, t));
        return new DocumentoPlano(pdf, codigo + "-informe-tecnico.pdf");
    }

    /** El PDF que subió el revisor o, si no hay, una lámina 2D referencial generada con los datos del plano. */
    @Transactional(readOnly = true)
    DocumentoPlano planoDocumento(String codigo, Especialidad especialidad) {
        Expediente e = buscar(codigo);
        PlanoTecnico p = planoDe(e, especialidad);
        if (p == null || (p.getEstado() != EstadoPlano.PRESENTADO && p.getEstado() != EstadoPlano.OBSERVADO)) {
            throw new NoEncontradoException("Plano", especialidad.etiqueta());
        }
        String nombre = codigo + "-" + especialidad.name().toLowerCase() + ".pdf";
        if (p.getArchivoId() != null) return new DocumentoPlano(almacenamiento.leer(p.getArchivoId()).datos(), nombre);
        // El área que se dibuja es la del plano arquitectónico; si no la trae, la inscrita en la partida.
        java.math.BigDecimal areaConstruida = e.getPlanos().stream()
                .filter(x -> x.getEspecialidad() == Especialidad.ARQUITECTURA).map(PlanoTecnico::getAreaConstruida)
                .filter(java.util.Objects::nonNull).findFirst().orElse(e.getAreaConstruidaInscrita());
        String sistema = e.getPlanos().stream().filter(x -> x.getEspecialidad() == Especialidad.ESTRUCTURAS)
                .map(PlanoTecnico::getSistemaConstructivo).filter(java.util.Objects::nonNull).findFirst()
                .map(SistemaConstructivo::etiqueta).orElse(null);
        byte[] lamina = LaminaPdf.generar(especialidad, new LaminaPdf.Datos(codigo, e.getCaso().getDenominacion(),
                e.getAreaM2(), e.getLinderos(), areaConstruida, sistema, e.getFechaReferencial()));
        return new DocumentoPlano(lamina, nombre);
    }

    /** El revisor sube el PDF real de un plano. No se mezcla con el del expediente ni cambia su versión. */
    DocumentoDto asociarDocumentoPlano(String codigo, Especialidad especialidad, MultipartFile archivo) {
        Expediente e = buscar(codigo);
        PlanoTecnico p = planoDe(e, especialidad);
        if (p == null || (p.getEstado() != EstadoPlano.PRESENTADO && p.getEstado() != EstadoPlano.OBSERVADO)) {
            throw new ReglaNegocioException("Primero marca el plano como presentado u observado y guarda");
        }
        byte[] datos;
        try {
            datos = archivo.getBytes();
        } catch (java.io.IOException ex) {
            throw new java.io.UncheckedIOException(ex);
        }
        if (!esPdf(datos)) throw new ReglaNegocioException("El archivo debe ser un PDF válido");
        String viejo = p.getArchivoId();
        var guardado = almacenamiento.guardar(codigo + "-" + especialidad.name().toLowerCase() + ".pdf",
                "application/pdf", datos, false);
        p.setArchivoId(guardado.id());
        expedientes.saveAndFlush(e);
        if (viejo != null) almacenamiento.eliminar(viejo);
        return new DocumentoDto(codigo, guardado.sha256());
    }

    private static PlanoTecnico planoDe(Expediente e, Especialidad especialidad) {
        return e.getPlanos().stream().filter(x -> x.getEspecialidad() == especialidad).findFirst().orElse(null);
    }

    private static final List<String> CHECKLIST_TRANSCRITA = List.of("Copia literal certificada (SPRL)",
            "Título archivado del asiento de dominio", "Ubicación en el Visor BGR");
    private static final List<String> TERMINOS_TRANSCRITA = List.of("Partida registral", "Copia literal", "Rubro",
            "Asiento", "Título archivado", "Zona registral", "Titularidad", "Condición representada", "Checklist",
            "Pendiente", "Semáforo informativo");

    /**
     * Registra una partida transcrita de una consulta pública. El número no puede llevar el prefijo SIM- y no se
     * aceptan datos personales reconocibles. Todo ocurre en una sola transacción.
     */
    DetalleCaso registrar(RegistrarPartidaRequest req) {
        if (!Boolean.TRUE.equals(req.confirmaSinDatosPersonales())) {
            throw new IllegalArgumentException(
                    "confirmaSinDatosPersonales: debes confirmar que la transcripción no contiene datos de personas naturales");
        }
        if (casos.existsByCodigo(req.numero())) {
            throw new ConflictoException("La partida " + req.numero() + " ya está registrada");
        }
        verificarDatosPersonales(req.datos(), req.denominacion(), req.contexto());

        CasoLote caso = new CasoLote();
        caso.setCodigo(req.numero());
        caso.setDenominacion(req.denominacion().trim());
        caso.setContexto(req.contexto().trim());
        caso.setSintetico(false);
        caso.setOrigen(CasoLote.Origen.TRANSCRITA);
        caso.setFuente(FUENTE_CONOCE_AQUI);
        caso.setFechaConsulta(req.fechaConsulta());
        caso.setDistrito(distritoDe(req.contexto()));
        caso.setSinDatosPersonales(true);
        caso.setResponsableId(UsuarioActual.actual().id());
        casos.save(caso);

        Expediente e = crear(caso, req.datos());
        int orden = 0;
        for (String nombre : CHECKLIST_TRANSCRITA) checklist.agregar(e.getId(), nombre, EstadoItem.PENDIENTE, orden++);
        glosario.asociar(e.getId(), TERMINOS_TRANSCRITA);
        clasificacion.recalcular(e.getId(), e.getVersion(), entrada(e));
        return aDetalle(e);
    }

    static final String FUENTE_CONOCE_AQUI = "Conoce Aquí – SUNARP";

    /** El distrito de una partida transcrita es la primera parte del contexto («Parcona, Ica» → «Parcona»). */
    static String distritoDe(String contexto) {
        String d = contexto.split(",")[0].trim();
        return d.isEmpty() ? null : d;
    }

    static final String PRECIO_NOTA =
            "Precio referencial e informativo; no es una oferta. Se coordina con la inmobiliaria.";

    /** Datos del predio para el catálogo. El tipo se deriva del tipo de predio que usan las reglas de planos. */
    static PredioDto predio(Expediente e) {
        CasoLote c = e.getCaso();
        TipoInmueble tipo = TipoInmueble.de(e.getTipoPredio());
        return new PredioDto(tipo, tipo.etiqueta(), c.getDistrito(), e.getAreaM2(), e.getAreaConstruidaInscrita(),
                c.getPrecioReferencial(), c.getPrecioReferencial() == null ? null : "PEN",
                c.getPrecioReferencial() == null ? null : PRECIO_NOTA);
    }

    /** Elimina una partida transcrita (por ejemplo, ante el pedido de un titular). Las ficticias no se borran. */
    void eliminar(String codigo) {
        Expediente e = buscar(codigo);
        CasoLote caso = e.getCaso();
        if (caso.isSintetico()) {
            throw new ConflictoException("Solo se pueden eliminar partidas transcritas");
        }
        List<String> archivos = new java.util.ArrayList<>();
        if (e.getDocumentoArchivoId() != null) archivos.add(e.getDocumentoArchivoId());
        e.getPlanos().stream().map(PlanoTecnico::getArchivoId).filter(java.util.Objects::nonNull).forEach(archivos::add);
        expedientes.delete(e);
        expedientes.flush();
        casos.delete(caso);
        casos.flush();
        archivos.forEach(almacenamiento::eliminar);
    }

    private static void verificarDatosPersonales(DatosExpediente d, String denominacion, String contexto) {
        java.util.stream.Stream<String> asientos = d.asientos().stream()
                .flatMap(a -> java.util.stream.Stream.of(a.texto(), a.titulares(), a.tituloNumero()));
        ProteccionDatos.verificar(java.util.stream.Stream.concat(asientos,
                java.util.stream.Stream.of(d.nota(), d.ubicacion(), d.linderos(), d.antecedenteDominial(),
                        d.condicionRepresentada(), denominacion, contexto)));
    }

    ItemChecklistDto cambiarItem(String codigo, Long itemId, CambiarItemRequest req) {
        Expediente e = buscar(codigo);
        String obs = req.observacion() == null || req.observacion().isBlank() ? null : req.observacion().trim();
        return checklist.actualizar(e.getId(), itemId, req.estado(), obs);
    }

    /** El revisor sube su propio PDF: desde ahora el sistema deja de regenerarlo. */
    DocumentoDto asociarDocumento(String codigo, MultipartFile archivo) {
        Expediente e = buscar(codigo);
        byte[] datos;
        try {
            datos = archivo.getBytes();
        } catch (java.io.IOException ex) {
            throw new java.io.UncheckedIOException(ex);
        }
        if (!esPdf(datos)) throw new ReglaNegocioException("El archivo debe ser un PDF válido");
        String viejo = e.getDocumentoArchivoId();
        var guardado = almacenamiento.guardar(codigo + ".pdf", "application/pdf", datos, false);
        e.setDocumentoArchivoId(guardado.id());
        e.setDocumentoGenerado(false);
        e.setActualizadoEn(Instant.now().truncatedTo(ChronoUnit.MILLIS));
        // Cambiar el documento sube la versión del expediente; se recalcula para que la evaluación siga
        // correspondiendo a la versión vigente (RN-06).
        expedientes.saveAndFlush(e);
        if (viejo != null) almacenamiento.eliminar(viejo);
        clasificacion.recalcular(e.getId(), e.getVersion(), entrada(e));
        return new DocumentoDto(codigo, guardado.sha256());
    }

    @Transactional(readOnly = true)
    ArchivoContenido documento(String codigo) {
        Expediente e = buscar(codigo);
        if (e.getDocumentoArchivoId() == null) throw new NoEncontradoException("Documento del caso", codigo);
        return almacenamiento.leer(e.getDocumentoArchivoId());
    }

    static boolean esPdf(byte[] d) {
        return d.length >= 5 && d[0] == '%' && d[1] == 'P' && d[2] == 'D' && d[3] == 'F' && d[4] == '-';
    }

    // ------------------------------------------------------------------ interno

    /** Aplica los datos al expediente. Devuelve los archivos que quedaron sin uso y hay que borrar tras guardar. */
    private List<String> aplicar(Expediente e, DatosExpediente d) {
        NormalizadorAsientos.Resultado n = NormalizadorAsientos.normalizar(d.asientos());

        e.setCondicionRepresentada(d.condicionRepresentada().trim());
        e.setTitularidad(n.titularidad());
        e.setCompletitud(d.completitud());
        e.setFechaReferencial(d.fechaReferencial());
        e.setNota(vacioANull(d.nota()));
        e.setZonaRegistral(vacioANull(d.zonaRegistral()));
        e.setOficinaRegistral(vacioANull(d.oficinaRegistral()));
        e.setUbicacion(vacioANull(d.ubicacion()));
        e.setAreaM2(d.areaM2());
        e.setLinderos(vacioANull(d.linderos()));
        e.setAntecedenteDominial(vacioANull(d.antecedenteDominial()));
        e.setActualizadoEn(Instant.now().truncatedTo(ChronoUnit.MILLIS));
        reconciliar(e, n.asientos());
        List<String> sobrantes = new java.util.ArrayList<>();
        if (d.tipoPredio() != null) aplicarBloqueTecnico(e, d, sobrantes);

        if (!e.isDocumentoGenerado()) return sobrantes;
        String viejo = e.getDocumentoArchivoId();
        String partida = e.getCaso().getCodigo();
        byte[] pdf = CopiaLiteralPdf.generar(copiaDe(partida, d, n.asientos()), procedencia(e.getCaso()));
        e.setDocumentoArchivoId(almacenamiento.guardar(partida + ".pdf", "application/pdf", pdf, false).id());
        if (viejo != null) sobrantes.add(viejo);
        return sobrantes;
    }

    /** Tipo de predio, área construida inscrita y planos. Solo se toca si la petición trae el tipo de predio. */
    private static void aplicarBloqueTecnico(Expediente e, DatosExpediente d, List<String> sobrantes) {
        e.setTipoPredio(d.tipoPredio());
        e.setAreaConstruidaInscrita(d.tipoPredio() == TipoPredio.VIVIENDA ? d.areaConstruidaInscrita() : null);
        List<PlanoDatos> nuevos = d.planos() == null ? List.of() : d.planos();

        Set<Especialidad> vistas = new HashSet<>();
        for (PlanoDatos p : nuevos) {
            if (!vistas.add(p.especialidad())) {
                throw new IllegalArgumentException("Plano repetido: " + p.especialidad().etiqueta());
            }
            if (p.areaConstruida() != null && p.especialidad() != Especialidad.ARQUITECTURA) {
                throw new IllegalArgumentException("El área construida solo se indica en el plano arquitectónico");
            }
            if (p.sistemaConstructivo() != null && p.especialidad() != Especialidad.ESTRUCTURAS) {
                throw new IllegalArgumentException("El sistema constructivo solo se indica en el plano de estructuras");
            }
        }
        Map<Especialidad, PlanoTecnico> actuales = new LinkedHashMap<>();
        for (PlanoTecnico p : e.getPlanos()) actuales.put(p.getEspecialidad(), p);
        e.getPlanos().removeIf(p -> {
            boolean sobra = !vistas.contains(p.getEspecialidad());
            if (sobra && p.getArchivoId() != null) sobrantes.add(p.getArchivoId());
            return sobra;
        });
        for (PlanoDatos p : nuevos) {
            PlanoTecnico t = actuales.get(p.especialidad());
            if (t == null) {
                t = new PlanoTecnico();
                t.setExpediente(e);
                t.setEspecialidad(p.especialidad());
                e.getPlanos().add(t);
            }
            boolean hay = p.estado() == EstadoPlano.PRESENTADO || p.estado() == EstadoPlano.OBSERVADO;
            t.setEstado(p.estado());
            t.setAreaConstruida(hay ? p.areaConstruida() : null);
            t.setSistemaConstructivo(hay ? p.sistemaConstructivo() : null);
            t.setObservacion(vacioANull(p.observacion()));
            if (!hay && t.getArchivoId() != null) {
                sobrantes.add(t.getArchivoId());
                t.setArchivoId(null);
            }
        }
    }

    /** Actualiza en el sitio los asientos que se conservan, para no chocar con la restricción de unicidad. */
    private static void reconciliar(Expediente e, List<AsientoDatos> nuevos) {
        Map<String, Asiento> actuales = new LinkedHashMap<>();
        for (Asiento a : e.getAsientos()) actuales.put(a.getReferencia(), a);
        Set<String> referencias = new HashSet<>();
        for (AsientoDatos a : nuevos) referencias.add(a.referencia());
        e.getAsientos().removeIf(a -> !referencias.contains(a.getReferencia()));

        int orden = 0;
        for (AsientoDatos d : nuevos) {
            Asiento a = actuales.get(d.referencia());
            if (a == null) {
                a = new Asiento();
                a.setExpediente(e);
                a.setReferencia(d.referencia());
                e.getAsientos().add(a);
            }
            a.setTipoActo(d.tipoActo());
            a.setEstado(d.estado());
            a.setFechaInscripcion(d.fechaInscripcion());
            a.setTituloNumero(d.tituloNumero());
            a.setFechaPresentacion(d.fechaPresentacion());
            a.setTexto(d.texto());
            a.setCanceloNumero(d.canceloNumero());
            a.setTitulares(d.titulares());
            a.setOrden(orden++);
        }
    }

    static Procedencia procedencia(CasoLote c) {
        return c.isSintetico() ? Procedencia.SINTETICA : new Procedencia(true, c.getFuente(), c.getFechaConsulta());
    }

    /** En el rubro F, un «otro acto» que declara la fábrica se titula así, como en una partida real. */
    private static String nombreDelActo(AsientoDatos a) {
        boolean fabrica = a.tipoActo() == pe.trustinmuebles.clasificacion.TipoActo.OTRO && a.texto() != null
                && a.texto().toLowerCase().startsWith("declaratoria de fábrica");
        return fabrica ? "Declaratoria de fábrica" : a.tipoActo().etiqueta();
    }

    static DatosCopia copiaDe(String partida, DatosExpediente d, List<AsientoDatos> asientos) {
        List<AsientoCopia> lista = asientos.stream().map(a -> new AsientoCopia(a.referencia(), nombreDelActo(a),
                a.texto(), a.fechaInscripcion(), a.tituloNumero(), a.fechaPresentacion())).toList();
        return new DatosCopia(partida,
                d.zonaRegistral() == null ? "Zona registral no informada" : d.zonaRegistral(),
                d.oficinaRegistral() == null ? "Oficina registral no informada" : d.oficinaRegistral(),
                d.ubicacion(), d.areaM2(), d.linderos(), d.antecedenteDominial(),
                d.completitud() != pe.trustinmuebles.clasificacion.Completitud.COMPLETA, d.fechaReferencial(), lista);
    }

    private Expediente buscar(String codigo) {
        return expedientes.findByCasoCodigo(codigo).orElseThrow(() -> new NoEncontradoException("Caso", codigo));
    }

    /** El motor evalúa los asientos del rubro D (gravámenes y cargas), con su estado ya normalizado. */
    static EntradaClasificacion entrada(Expediente e) {
        return new EntradaClasificacion(e.getCondicionRepresentada(), e.getTitularidad(), e.getCompletitud(),
                e.getAsientos().stream().filter(a -> a.rubro() == 'D')
                        .map(a -> new EntradaClasificacion.AnotacionEntrada(a.getReferencia(), a.getEstado(),
                                a.getTipoActo().etiqueta(), a.getTipoActo())).toList(),
                e.getTipoPredio(), e.getAreaConstruidaInscrita(),
                e.getPlanos().stream().map(p -> new EntradaClasificacion.PlanoEntrada(p.getEspecialidad(),
                        p.getEstado(), p.getAreaConstruida())).toList());
    }

    private DetalleCaso aDetalle(Expediente e) {
        CasoLote c = e.getCaso();
        ExpedienteDto exp = new ExpedienteDto(e.getVersion(), e.getCondicionRepresentada(), e.getTitularidad(),
                e.getCompletitud(), e.getFechaReferencial(), e.getNota(), e.getZonaRegistral(),
                e.getOficinaRegistral(), e.getUbicacion(), e.getAreaM2(), e.getLinderos(), e.getAntecedenteDominial(),
                e.getDocumentoArchivoId() != null, e.isDocumentoGenerado(),
                e.getAsientos().stream().map(a -> new AsientoDto(a.getReferencia(), String.valueOf(a.rubro()),
                        a.getTipoActo(), a.getTipoActo().etiqueta(), a.getEstado(), a.getFechaInscripcion(),
                        a.getTituloNumero(), a.getFechaPresentacion(), a.getTexto(), a.getCanceloNumero(),
                        a.getTitulares())).toList(),
                e.getTipoPredio(), e.getAreaConstruidaInscrita(),
                e.getPlanos().stream().map(p -> new PlanoDto(p.getEspecialidad(), p.getEspecialidad().etiqueta(),
                        p.getEstado(), p.getAreaConstruida(), p.getSistemaConstructivo(),
                        p.getSistemaConstructivo() == null ? null : p.getSistemaConstructivo().etiqueta(),
                        p.getObservacion(), p.getArchivoId() != null,
                        p.getEspecialidad() == Especialidad.ARQUITECTURA
                                ? coincide(p.getAreaConstruida(), e.getAreaConstruidaInscrita()) : null)).toList());
        return new DetalleCaso(c.getCodigo(), c.getDenominacion(), c.getContexto(), c.isSintetico(),
                c.getOrigen().name(), c.getFuente(), c.getFechaConsulta(), exp,
                clasificacion.obtener(e.getId()).orElse(null), inspeccion.obtener(e.getId()), checklist.listar(e.getId()),
                glosario.terminosDe(e.getId()), predio(e));
    }

    /** ¿El área del plano coincide con la inscrita (diferencia de hasta 1 %)? Null si falta alguno de los dos datos. */
    static Boolean coincide(java.math.BigDecimal plano, java.math.BigDecimal inscrita) {
        if (plano == null || inscrita == null || inscrita.signum() <= 0) return null;
        return plano.subtract(inscrita).abs().divide(inscrita, 6, java.math.RoundingMode.HALF_UP)
                .compareTo(new java.math.BigDecimal("0.01")) <= 0;
    }

    private static String vacioANull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
