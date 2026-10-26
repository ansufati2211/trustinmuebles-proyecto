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
import pe.trustinmuebles.clasificacion.HistorialEvaluacionDto;
import pe.trustinmuebles.clasificacion.OrigenEvaluacion;
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
import pe.trustinmuebles.identidad.AuthService;
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
    private final AuthService identidad;

    ExpedienteService(ExpedienteRepository expedientes, CasoLoteRepository casos, ClasificacionService clasificacion,
            ChecklistService checklist, GlosarioService glosario, AlmacenamientoService almacenamiento,
            InspeccionService inspeccion, AuthService identidad) {
        this.expedientes = expedientes;
        this.casos = casos;
        this.clasificacion = clasificacion;
        this.checklist = checklist;
        this.glosario = glosario;
        this.almacenamiento = almacenamiento;
        this.inspeccion = inspeccion;
        this.identidad = identidad;
    }

    /**
     * M13: catálogo con filtros combinables (todos opcionales). Se filtra en el servidor porque el color documental y
     * el riesgo físico se derivan de otros módulos; así la regla vive en un solo lugar y tiene prueba.
     */
    @Transactional(readOnly = true)
    List<ResumenCaso> listar(FiltroCatalogo filtro) {
        UsuarioActual u = UsuarioActual.actual();
        return expedientes.findAllByOrderByCasoCodigoAsc().stream().filter(e -> visible(e.getCaso(), u)).map(e -> {
            EvaluacionDto ev = clasificacion.obtener(e.getId()).orElse(null);
            EvaluacionTecnicaDto t = inspeccion.obtener(e.getId());
            return new ResumenCaso(e.getCaso().getCodigo(), e.getCaso().getDenominacion(), e.getCaso().getContexto(),
                    ev == null ? null : ev.estado(), ev == null ? null : ev.etiqueta(),
                    checklist.contarPendientes(e.getId()), e.getCaso().getOrigen().name(), e.getCaso().getFuente(),
                    e.getCaso().getFechaConsulta(), t.estado(), t.resultado(), t.riesgoFisicoDetectado(), predio(e),
                    e.getCaso().getEstadoPublicacion());
        }).filter(filtro::acepta).toList();
    }

    @Transactional(readOnly = true)
    DetalleCaso detalle(String codigo) {
        return aDetalle(buscarVisible(codigo));
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
        String asientosAntes = firmaAsientos(e);
        String planosAntes = firmaPlanos(e);
        List<String> archivosViejos = aplicar(e, req.datos());
        expedientes.saveAndFlush(e);
        archivosViejos.forEach(almacenamiento::eliminar);
        recalcular(e, origenDeLaEdicion(asientosAntes, planosAntes, e));
        return aDetalle(e);
    }

    /**
     * Origen del recálculo de una edición (F2). Si cambian los asientos se incorporó partida transcrita nueva (I9: es lo
     * único que puede levantar un embargo, un bloqueo o una demanda); si solo cambian los planos, se adjuntó un plano.
     */
    static OrigenEvaluacion origenDeLaEdicion(String asientosAntes, String planosAntes, Expediente e) {
        if (!asientosAntes.equals(firmaAsientos(e))) return OrigenEvaluacion.PARTIDA_TRANSCRITA;
        if (!planosAntes.equals(firmaPlanos(e))) return OrigenEvaluacion.PLANO_ADJUNTO;
        return OrigenEvaluacion.EDICION;
    }

    private static String firmaAsientos(Expediente e) {
        return e.getAsientos().stream().map(a -> String.join("|", a.getReferencia(), String.valueOf(a.getTipoActo()),
                String.valueOf(a.getEstado()), String.valueOf(a.getTexto()), String.valueOf(a.getCanceloNumero()),
                String.valueOf(a.getTitulares()), String.valueOf(a.getFechaInscripcion()),
                String.valueOf(a.getTituloNumero()), String.valueOf(a.getFechaPresentacion())))
                .collect(java.util.stream.Collectors.joining("\n"));
    }

    private static String firmaPlanos(Expediente e) {
        return e.getTipoPredio() + "|" + numero(e.getAreaConstruidaInscrita()) + "\n" + e.getPlanos().stream()
                .map(p -> String.join("|", String.valueOf(p.getEspecialidad()), String.valueOf(p.getEstado()),
                        numero(p.getAreaConstruida()), String.valueOf(p.getSistemaConstructivo()),
                        String.valueOf(p.getObservacion())))
                .sorted().collect(java.util.stream.Collectors.joining("\n"));
    }

    /** 84.5 y 84.50 son la misma área: se compara el valor, no la escala. */
    private static String numero(java.math.BigDecimal n) {
        return n == null ? "null" : n.stripTrailingZeros().toPlainString();
    }

    /** Recalcula con la cuenta autenticada como autora; el historial guarda su código (I12). */
    private void recalcular(Expediente e, OrigenEvaluacion origen) {
        clasificacion.recalcular(e.getId(), e.getVersion(), entrada(e), origen, UsuarioActual.actual().codigoCuenta());
    }

    /**
     * Historial de evaluaciones (F2): revisor, gestor, especialista y el propietario del caso. El comprador recibe 403
     * (también lo exige SecurityConfig) y el propietario de otro caso, 404. Solo lectura.
     */
    @Transactional(readOnly = true)
    List<HistorialEvaluacionDto> historial(String codigo) {
        if (UsuarioActual.actual().rol() == Rol.COMPRADOR) {
            throw new AccessDeniedException("El comprador no consulta el historial de evaluaciones");
        }
        return clasificacion.historial(buscarVisible(codigo).getId());
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
        return inspeccion.solicitar(buscarVisible(codigo).getId(), u.codigoCuenta());
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
        Expediente e = buscarVisible(codigo);
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
        Expediente e = buscarVisible(codigo);
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
        // F2: adjuntar el PDF de un plano deja constancia en el historial. El motor no lee el archivo, solo el estado
        // del plano, así que el color no puede cambiar por esto (I9).
        recalcular(e, OrigenEvaluacion.PLANO_ADJUNTO);
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
        String propietario = req.propietarioCodigo().trim();
        if (!identidad.tieneRol(propietario, Rol.PROPIETARIO)) {
            throw new IllegalArgumentException("propietarioCodigo: «" + propietario + "» no es una cuenta de propietario");
        }

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
        // Etapa 1 (captación): el caso nace en borrador y sin autorización; solo el propietario puede otorgarla.
        caso.setPropietarioCodigo(propietario);
        caso.setAutorizacionFecha(null);
        caso.setEstadoPublicacion(EstadoPublicacion.BORRADOR);
        casos.save(caso);

        Expediente e = crear(caso, req.datos());
        int orden = 0;
        for (String nombre : CHECKLIST_TRANSCRITA) checklist.agregar(e.getId(), nombre, EstadoItem.PENDIENTE, orden++);
        glosario.asociar(e.getId(), TERMINOS_TRANSCRITA);
        recalcular(e, OrigenEvaluacion.PARTIDA_TRANSCRITA);
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
        // Un PDF no es una partida transcrita: el motor no lo lee, así que no puede levantar un rojo (I9).
        recalcular(e, OrigenEvaluacion.EDICION);
        return new DocumentoDto(codigo, guardado.sha256());
    }

    @Transactional(readOnly = true)
    ArchivoContenido documento(String codigo) {
        Expediente e = buscarVisible(codigo);
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

    /**
     * Un caso que la sesión puede consultar. El comprador solo ve los publicados y el propietario solo los suyos; para
     * los demás la respuesta es 404, igual que un caso inexistente, para no revelar que existe.
     */
    private Expediente buscarVisible(String codigo) {
        Expediente e = buscar(codigo);
        if (!visible(e.getCaso(), UsuarioActual.actual())) throw new NoEncontradoException("Caso", codigo);
        return e;
    }

    static boolean visible(CasoLote c, UsuarioActual u) {
        return switch (u.rol()) {
            case COMPRADOR -> c.getEstadoPublicacion() == EstadoPublicacion.PUBLICADO;
            case PROPIETARIO -> u.codigoCuenta().equals(c.getPropietarioCodigo());
            case REVISOR, GESTOR, ESPECIALISTA -> true;
        };
    }

    // ------------------------------------------------------ captación y publicación

    /**
     * Etapa 1: el propietario autoriza la evaluación y publicación de su propio caso (I13). Es su única escritura. Si
     * ya estaba autorizado se conserva la fecha original. No recalcula ni cambia el color del indicador A (I8).
     */
    PublicacionDto autorizar(String codigo) {
        CasoLote c = casoDelPropietario(codigo);
        if (c.getAutorizacionFecha() == null) c.setAutorizacionFecha(Instant.now().truncatedTo(ChronoUnit.MILLIS));
        return publicacion(casos.saveAndFlush(c), UsuarioActual.actual());
    }

    /**
     * El propietario retira su autorización. Como un caso no puede estar publicado sin ella (I14), uno publicado pasa a
     * RETIRADO. El historial y el color del indicador A no cambian.
     */
    PublicacionDto retirarAutorizacion(String codigo) {
        CasoLote c = casoDelPropietario(codigo);
        c.setAutorizacionFecha(null);
        if (c.getEstadoPublicacion() == EstadoPublicacion.PUBLICADO) c.setEstadoPublicacion(EstadoPublicacion.RETIRADO);
        return publicacion(casos.saveAndFlush(c), UsuarioActual.actual());
    }

    /** Etapa 5: solo el gestor publica, y solo con autorización vigente (I14). No depende del color de A (I10). */
    PublicacionDto publicar(String codigo) {
        UsuarioActual u = exigirRol(Rol.GESTOR, "Solo el gestor publica casos");
        CasoLote c = buscar(codigo).getCaso();
        if (c.getAutorizacionFecha() == null) {
            throw new ReglaNegocioException("No se puede publicar: el propietario no ha autorizado este caso");
        }
        if (c.getEstadoPublicacion() == EstadoPublicacion.PUBLICADO) {
            throw new ConflictoException("El caso ya está publicado");
        }
        c.setEstadoPublicacion(EstadoPublicacion.PUBLICADO);
        return publicacion(casos.saveAndFlush(c), u);
    }

    /** Solo el gestor retira la publicación. No borra el historial ni cambia el indicador A. */
    PublicacionDto retirarPublicacion(String codigo) {
        UsuarioActual u = exigirRol(Rol.GESTOR, "Solo el gestor retira la publicación");
        CasoLote c = buscar(codigo).getCaso();
        if (c.getEstadoPublicacion() != EstadoPublicacion.PUBLICADO) {
            throw new ConflictoException("El caso no está publicado");
        }
        c.setEstadoPublicacion(EstadoPublicacion.RETIRADO);
        return publicacion(casos.saveAndFlush(c), u);
    }

    /** El caso del propietario autenticado. Otro rol, o el propietario de otro caso, recibe 403. */
    private CasoLote casoDelPropietario(String codigo) {
        UsuarioActual u = exigirRol(Rol.PROPIETARIO, "Solo el propietario autoriza su caso");
        CasoLote c = buscar(codigo).getCaso();
        if (!u.codigoCuenta().equals(c.getPropietarioCodigo())) {
            throw new AccessDeniedException("Solo el propietario de este caso puede autorizarlo");
        }
        return c;
    }

    private static UsuarioActual exigirRol(Rol rol, String mensaje) {
        UsuarioActual u = UsuarioActual.actual();
        if (u.rol() != rol) throw new AccessDeniedException(mensaje);
        return u;
    }

    /** El comprador no ve el código del propietario (I11). */
    static PublicacionDto publicacion(CasoLote c, UsuarioActual u) {
        return new PublicacionDto(c.getEstadoPublicacion(), u.rol() == Rol.COMPRADOR ? null : c.getPropietarioCodigo(),
                c.getAutorizacionFecha() != null, c.getAutorizacionFecha());
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
                glosario.terminosDe(e.getId()), predio(e), publicacion(c, UsuarioActual.actual()));
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
