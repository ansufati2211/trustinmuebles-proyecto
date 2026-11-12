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
import pe.trustinmuebles.almacenamiento.DocumentosPdf;
import pe.trustinmuebles.almacenamiento.PdfPreparado;
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
import pe.trustinmuebles.clasificacion.DocumentoLote;
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
    private final DocumentosPdf documentosPdf;
    private final RutasRegularizacion rutas;
    private final SemaforoGestion gestion;
    private final HistorialAutorizacionRepository autorizaciones;

    ExpedienteService(ExpedienteRepository expedientes, CasoLoteRepository casos, ClasificacionService clasificacion,
            ChecklistService checklist, GlosarioService glosario, AlmacenamientoService almacenamiento,
            InspeccionService inspeccion, AuthService identidad, DocumentosPdf documentosPdf,
            RutasRegularizacion rutas, SemaforoGestion gestion, HistorialAutorizacionRepository autorizaciones) {
        this.expedientes = expedientes;
        this.casos = casos;
        this.clasificacion = clasificacion;
        this.checklist = checklist;
        this.glosario = glosario;
        this.almacenamiento = almacenamiento;
        this.inspeccion = inspeccion;
        this.identidad = identidad;
        this.documentosPdf = documentosPdf;
        this.rutas = rutas;
        this.gestion = gestion;
        this.autorizaciones = autorizaciones;
    }

    /**
     * M13: catálogo con filtros combinables (todos opcionales). Se filtra en el servidor porque el color documental y
     * el riesgo físico se derivan de otros módulos; así la regla vive en un solo lugar y tiene prueba.
     */
    @Transactional(readOnly = true)
    List<ResumenCaso> listar(String tipoInmueble, String estado, String estadoTecnico, Boolean riesgoFisicoDetectado,
            String tipoAlerta) {
        java.util.Set<String> tipos = new java.util.HashSet<>();
        clasificacion.tiposDeAlerta().forEach(t -> tipos.add(t.codigo()));
        return listar(FiltroCatalogo.de(tipoInmueble, estado, estadoTecnico, riesgoFisicoDetectado, tipoAlerta, tipos));
    }

    @Transactional(readOnly = true)
    List<ResumenCaso> listar(FiltroCatalogo filtro) {
        UsuarioActual u = UsuarioActual.actual();
        return expedientes.findAllByOrderByCasoCodigoAsc().stream().filter(e -> visible(e.getCaso(), u)).map(e -> {
            EvaluacionDto ev = clasificacion.obtener(e.getId()).orElse(null);
            EvaluacionTecnicaDto t = inspeccion.obtener(e.getId());
            return new ResumenCaso(e.getCaso().getCodigo(), e.getCaso().getDenominacion(), e.getCaso().getContexto(),
                    ev == null ? null : ev.estado(), ev == null ? null : ev.etiqueta(),
                    checklist.contarPendientes(e.getId()), e.getCaso().getOrigen().name(), e.getCaso().getFuente(),
                    e.getCaso().getFechaConsulta(), e.getCaso().getFuenteUrl(), t.estado(), t.resultado(), t.riesgoFisicoDetectado(), predio(e),
                    e.getCaso().getEstadoPublicacion(), RutasRegularizacion.tiposAlerta(ev), gestionPara(e, u),
                    e.getCaso().getTitularidadComercial());
        }).filter(filtro::acepta).toList();
    }

    @Transactional(readOnly = true)
    List<pe.trustinmuebles.clasificacion.TipoAlerta> tiposDeAlerta() {
        return clasificacion.tiposDeAlerta();
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
        if (e.getCaso().esCaptado()) verificarDatosPersonales(req.datos(), e.getCaso().getDenominacion(), null);
        if (!req.versionEsperada().equals(e.getVersion())) {
            throw new ConflictoException("El expediente cambió mientras lo editaba. Recargue e intente de nuevo.");
        }
        String asientosAntes = firmaAsientos(e);
        String planosAntes = firmaPlanos(e);
        List<String> archivosViejos = aplicar(e, req.datos(), true);
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
        if (!asientosAntes.equals(firmaAsientos(e))) return origenDeLaPartida(e.getCaso());
        if (!planosAntes.equals(firmaPlanos(e))) return OrigenEvaluacion.PLANO_ADJUNTO;
        return OrigenEvaluacion.EDICION;
    }

    /** Una partida simulada captada no se rotula como transcrita en el historial. */
    private static OrigenEvaluacion origenDeLaPartida(CasoLote c) {
        return c.esCaptado() && c.isSintetico() ? OrigenEvaluacion.PARTIDA_SIMULADA : OrigenEvaluacion.PARTIDA_TRANSCRITA;
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
                .sorted().collect(java.util.stream.Collectors.joining("\n")) + "\n" + e.getDocumentosLote().stream()
                .map(x -> String.join("|", String.valueOf(x.getTipo()), String.valueOf(x.getEstado()),
                        String.valueOf(x.getObservacion())))
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
     * v0.8: ruta de regularización con la misma visibilidad que el detalle (el comprador solo ve casos publicados; en
     * otro caso, 404). Solo lectura: no recalcula ni agrega historial.
     */
    @Transactional(readOnly = true)
    RutaRegularizacion ruta(String codigo) {
        return rutas.calcular(buscarVisible(codigo));
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

    /**
     * Crea el expediente de un caso de la carga de contenido. Sus planos presentados se muestran con la lámina generada,
     * así que no se exige archivo. La evaluación la calcula quien llama.
     */
    Expediente crear(CasoLote caso, DatosExpediente datos) {
        return crear(caso, datos, false);
    }

    /** Limpia referencias SIM- heredadas de una base previa y regenera la copia literal generada. */
    void limpiarPrefijoSimulado(Expediente e) {
        if (e.getAntecedenteDominial() != null) {
            e.setAntecedenteDominial(e.getAntecedenteDominial().replace("SIM-", ""));
        }
        for (Asiento a : e.getAsientos()) {
            if (a.getTituloNumero() != null) a.setTituloNumero(a.getTituloNumero().replace("SIM-", ""));
            if (a.getTexto() != null) a.setTexto(a.getTexto().replace("SIM-", ""));
        }
        if (e.isDocumentoGenerado()) {
            String viejo = e.getDocumentoArchivoId();
            String partida = e.getCaso().getCodigo();
            List<AsientoCopia> lista = e.getAsientos().stream().map(a -> {
                boolean fabrica = a.getTipoActo() == pe.trustinmuebles.clasificacion.TipoActo.OTRO
                        && a.getTexto() != null && a.getTexto().toLowerCase().startsWith("declaratoria de fábrica");
                String acto = fabrica ? "Declaratoria de fábrica" : a.getTipoActo().etiqueta();
                return new AsientoCopia(a.getReferencia(), acto, a.getTexto(), a.getFechaInscripcion(),
                        a.getTituloNumero(), a.getFechaPresentacion());
            }).toList();
            DatosCopia copia = new DatosCopia(partida,
                    e.getZonaRegistral() == null ? "Zona registral no informada" : e.getZonaRegistral(),
                    e.getOficinaRegistral() == null ? "Oficina registral no informada" : e.getOficinaRegistral(),
                    e.getUbicacion(), e.getAreaM2(), e.getLinderos(), e.getAntecedenteDominial(),
                    e.getCompletitud() != pe.trustinmuebles.clasificacion.Completitud.COMPLETA,
                    e.getFechaReferencial(), lista);
            byte[] pdf = CopiaLiteralPdf.generar(copia, procedencia(e.getCaso()));
            e.setDocumentoArchivoId(almacenamiento.guardar(partida + ".pdf", "application/pdf", pdf, false).id());
            expedientes.saveAndFlush(e);
            if (viejo != null) almacenamiento.eliminar(viejo);
        } else {
            expedientes.saveAndFlush(e);
        }
    }

    private Expediente crear(CasoLote caso, DatosExpediente datos, boolean exigirArchivo) {
        Expediente e = new Expediente();
        e.setCaso(caso);
        e.setDocumentoGenerado(true);
        aplicar(e, datos, exigirArchivo);
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
        inspeccion.registrar(e.getId(), informe, u.id(), u.codigoCuenta());
        return aDetalle(e);
    }

    /**
     * v0.7: el gestor asigna la inspección solicitada o en curso a un especialista. No recalcula el indicador A (I8).
     */
    EvaluacionTecnicaDto asignarEspecialista(String codigo, String especialistaCodigo) {
        exigirRol(Rol.GESTOR, "Solo el gestor asigna inspecciones");
        return inspeccion.asignar(buscar(codigo).getId(), especialistaCodigo);
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
        // v0.8: solo los casos de la carga de contenido tienen lámina generada; a una partida captada le falta el archivo.
        if (e.getCaso().esCaptado()) throw new NoEncontradoException("Archivo del plano", especialidad.etiqueta());
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

    /**
     * El revisor sube el PDF real de un plano (v0.8: también si estaba no presentado; al subirlo queda presentado). El
     * archivo se valida y, si pesa más del umbral, se optimiza (decisión 4). No se mezcla con el del expediente.
     */
    DocumentoDto asociarDocumentoPlano(String codigo, Especialidad especialidad, MultipartFile archivo) {
        Expediente e = buscar(codigo);
        if (e.getTipoPredio() != TipoPredio.VIVIENDA) {
            throw new ReglaNegocioException("Los planos de edificación no aplican a este predio");
        }
        PlanoTecnico p = planoDe(e, especialidad);
        if (p != null && p.getEstado() == EstadoPlano.NO_APLICA) {
            throw new ReglaNegocioException("Este plano está marcado como «no aplica»");
        }
        PdfPreparado pdf = documentosPdf.preparar(archivo);
        if (p == null) {
            p = new PlanoTecnico();
            p.setExpediente(e);
            p.setEspecialidad(especialidad);
            e.getPlanos().add(p);
        }
        if (p.getEstado() != EstadoPlano.OBSERVADO) p.setEstado(EstadoPlano.PRESENTADO);
        String viejo = p.getArchivoId();
        var guardado = almacenamiento.guardarDocumento(codigo + "-" + especialidad.name().toLowerCase() + ".pdf", pdf,
                UsuarioActual.actual().codigoCuenta());
        p.setArchivoId(guardado.id());
        expedientes.saveAndFlush(e);
        if (viejo != null) almacenamiento.eliminar(viejo);
        // F2: adjuntar el PDF de un plano deja constancia en el historial. El motor no lee el archivo, solo el estado
        // del plano, así que el contenido del PDF no puede cambiar el color (I9).
        recalcular(e, OrigenEvaluacion.PLANO_ADJUNTO);
        return DocumentoDto.de(codigo, guardado.sha256(), pdf);
    }

    private static PlanoTecnico planoDe(Expediente e, Especialidad especialidad) {
        return e.getPlanos().stream().filter(x -> x.getEspecialidad() == especialidad).findFirst().orElse(null);
    }

    // ------------------------------------------------------------ documentos del lote (v0.9)

    /**
     * El PDF de un documento del lote: el guardado o, solo en un caso de la carga de contenido sin archivo, uno generado
     * con los datos del caso (con marca de agua). A una partida captada sin archivo le falta el documento.
     */
    @Transactional(readOnly = true)
    DocumentoPlano documentoLote(String codigo, DocumentoLote tipo) {
        Expediente e = buscarVisible(codigo);
        DocumentoDelLote d = documentoDe(e, tipo);
        if (e.getTipoPredio() != TipoPredio.LOTE || d == null
                || (d.getEstado() != EstadoPlano.PRESENTADO && d.getEstado() != EstadoPlano.OBSERVADO)) {
            throw new NoEncontradoException("Documento del lote", tipo.etiqueta());
        }
        String nombre = codigo + "-" + nombreDeArchivo(tipo) + ".pdf";
        if (d.getArchivoId() != null) return new DocumentoPlano(almacenamiento.leer(d.getArchivoId()).datos(), nombre);
        if (e.getCaso().esCaptado()) throw new NoEncontradoException("Archivo del documento", tipo.etiqueta());
        CasoLote c = e.getCaso();
        byte[] pdf = DocumentoLotePdf.generar(tipo, new DocumentoLotePdf.Datos(codigo, c.getDenominacion(),
                e.getUbicacion(), e.getZonaRegistral(), e.getOficinaRegistral(), e.getAreaM2(), e.getLinderos(),
                d.getResumen(), c.getPrecioReferencial(), c.getMoneda(), e.getFechaReferencial()));
        return new DocumentoPlano(pdf, nombre);
    }

    static String nombreDeArchivo(DocumentoLote tipo) {
        return tipo.name().toLowerCase(java.util.Locale.ROOT).replace('_', '-');
    }

    /**
     * El revisor sube el PDF de un documento del lote: queda presentado (si estaba observado, lo sigue estando) y se
     * recalcula. El motor no lee el archivo, solo el estado del documento (I9).
     */
    DocumentoDto asociarDocumentoLote(String codigo, DocumentoLote tipo, MultipartFile archivo) {
        Expediente e = buscar(codigo);
        if (e.getTipoPredio() != TipoPredio.LOTE) {
            throw new ReglaNegocioException("Los documentos del lote solo aplican a un lote");
        }
        DocumentoDelLote d = documentoDe(e, tipo);
        if (d != null && d.getEstado() == EstadoPlano.NO_APLICA) {
            throw new ReglaNegocioException("Este documento está marcado como «no aplica»");
        }
        PdfPreparado pdf = documentosPdf.preparar(archivo);
        var guardado = guardarDocumentoLote(e, tipo, pdf, UsuarioActual.actual().codigoCuenta());
        recalcular(e, OrigenEvaluacion.PLANO_ADJUNTO);
        return DocumentoDto.de(codigo, guardado.sha256(), pdf);
    }

    /**
     * Carga de contenido: guarda el PDF de un documento que trae el caso (por ejemplo, el plano oficial de la SBN). No
     * recalcula; lo hace el seeder al final, como con el resto del contenido.
     */
    void adjuntarDocumentoLoteDeContenido(String codigo, DocumentoLote tipo, byte[] datos) {
        Expediente e = buscar(codigo);
        guardarDocumentoLote(e, tipo, documentosPdf.preparar(datos, "application/pdf"), CARGA_INICIAL);
    }

    static final String CARGA_INICIAL = "carga-inicial";

    private pe.trustinmuebles.almacenamiento.ArchivoGuardado guardarDocumentoLote(Expediente e, DocumentoLote tipo,
            PdfPreparado pdf, String subidoPor) {
        DocumentoDelLote d = documentoDe(e, tipo);
        if (d == null) {
            d = new DocumentoDelLote();
            d.setExpediente(e);
            d.setTipo(tipo);
            e.getDocumentosLote().add(d);
        }
        if (d.getEstado() != EstadoPlano.OBSERVADO) d.setEstado(EstadoPlano.PRESENTADO);
        String viejo = d.getArchivoId();
        var guardado = almacenamiento.guardarDocumento(
                e.getCaso().getCodigo() + "-" + nombreDeArchivo(tipo) + ".pdf", pdf, subidoPor);
        d.setArchivoId(guardado.id());
        expedientes.saveAndFlush(e);
        if (viejo != null) almacenamiento.eliminar(viejo);
        return guardado;
    }

    /**
     * Carga de contenido sobre una base existente: agrega los documentos del lote que el caso aún no tiene, sin tocar
     * los que el revisor ya registró. Devuelve los tipos agregados.
     */
    List<DocumentoLote> completarDocumentosLote(String codigo, List<DocumentoLoteDatos> datos) {
        Expediente e = buscar(codigo);
        List<DocumentoLote> agregados = new java.util.ArrayList<>();
        for (DocumentoLoteDatos x : datos) {
            if (documentoDe(e, x.tipo()) != null) continue;
            DocumentoDelLote d = new DocumentoDelLote();
            d.setExpediente(e);
            d.setTipo(x.tipo());
            d.setEstado(x.estado());
            d.setObservacion(vacioANull(x.observacion()));
            d.setResumen(vacioANull(x.resumen()));
            e.getDocumentosLote().add(d);
            agregados.add(x.tipo());
        }
        if (!agregados.isEmpty()) expedientes.saveAndFlush(e);
        return agregados;
    }

    private static DocumentoDelLote documentoDe(Expediente e, DocumentoLote tipo) {
        return e.getDocumentosLote().stream().filter(x -> x.getTipo() == tipo).findFirst().orElse(null);
    }

    private static final List<String> CHECKLIST_TRANSCRITA = List.of("Copia literal certificada (SPRL)",
            "Título archivado del asiento de dominio", "Ubicación en el Visor BGR");
    private static final List<String> TERMINOS_TRANSCRITA = List.of("Partida registral", "Copia literal", "Rubro",
            "Asiento", "Título archivado", "Zona registral", "Titularidad", "Condición representada", "Checklist",
            "Pendiente", "Semáforo informativo");

    /**
     * Capta una partida: transcrita de una consulta pública (sin el prefijo SIM-) o simulada para la demostración (con
     * él). En ambos casos se rechazan los datos personales reconocibles. Todo ocurre en una sola transacción.
     */
    DetalleCaso registrar(RegistrarPartidaRequest req) {
        if (!Boolean.TRUE.equals(req.confirmaSinDatosPersonales())) {
            throw new IllegalArgumentException(
                    "confirmaSinDatosPersonales: debes confirmar que la transcripción no contiene datos de personas naturales");
        }
        boolean simulada = req.origen() == OrigenCaptacion.SIMULADA_DEMOSTRACION;
        if (simulada != req.numero().startsWith(PREFIJO_SIMULADO)) {
            throw new IllegalArgumentException(simulada
                    ? "numero: una partida simulada debe llevar el prefijo SIM-"
                    : "numero: el prefijo SIM- se reserva a las partidas simuladas");
        }
        if (casos.existsByCodigo(req.numero())) {
            throw new ConflictoException("La partida " + req.numero() + " ya está registrada");
        }
        verificarDatosPersonales(req.datos(), req.denominacion(), req.contexto());
        TitularidadComercial titularidad = req.titularidadComercial() == null ? TitularidadComercial.PARTICULAR
                : req.titularidadComercial();
        String propietario = req.propietarioCodigo() == null || req.propietarioCodigo().isBlank() ? null
                : req.propietarioCodigo().trim();
        // v1.0: un inmueble de un particular exige su cuenta de propietario; uno de la inmobiliaria puede no tenerla.
        if (propietario == null && titularidad == TitularidadComercial.PARTICULAR) {
            throw new IllegalArgumentException("propietarioCodigo: es obligatorio en un inmueble de un particular");
        }
        if (propietario != null && !identidad.tieneRol(propietario, Rol.PROPIETARIO)) {
            throw new IllegalArgumentException("propietarioCodigo: «" + propietario + "» no es una cuenta de propietario");
        }

        CasoLote caso = new CasoLote();
        caso.setCodigo(req.numero());
        caso.setDenominacion(req.denominacion().trim());
        caso.setContexto(req.contexto().trim());
        caso.setSintetico(simulada);
        caso.setOrigen(simulada ? CasoLote.Origen.SINTETICO : CasoLote.Origen.TRANSCRITA);
        caso.setFuente(simulada ? FUENTE_SIMULADA : FUENTE_CONOCE_AQUI);
        caso.setFechaConsulta(req.fechaConsulta());
        caso.setDistrito(distritoDe(req.contexto()));
        caso.setPrecioReferencial(req.precioReferencial());
        caso.setSinDatosPersonales(true);
        caso.setResponsableId(UsuarioActual.actual().id());
        // Etapa 1 (captación): el caso nace en borrador y sin autorización; solo el propietario puede otorgarla.
        caso.setPropietarioCodigo(propietario);
        caso.setTitularidadComercial(titularidad);
        caso.setAutorizacionFecha(null);
        caso.setEstadoPublicacion(EstadoPublicacion.BORRADOR);
        casos.save(caso);

        Expediente e = crear(caso, req.datos(), true);
        int orden = 0;
        for (String nombre : CHECKLIST_TRANSCRITA) checklist.agregar(e.getId(), nombre, EstadoItem.PENDIENTE, orden++);
        glosario.asociar(e.getId(), TERMINOS_TRANSCRITA);
        recalcular(e, origenDeLaPartida(caso));
        return aDetalle(e);
    }

    static final String FUENTE_CONOCE_AQUI = "Conoce Aquí – SUNARP";
    static final String FUENTE_SIMULADA = "Partida simulada para demostración";
    static final String PREFIJO_SIMULADO = "SIM-";

    /** El distrito de una partida captada es la primera parte del contexto («Parcona, Ica» → «Parcona»). */
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
        boolean hayPrecio = c.getPrecioReferencial() != null;
        return new PredioDto(tipo, tipo.etiqueta(), c.getDistrito(), e.getAreaM2(), e.getAreaConstruidaInscrita(),
                c.getPrecioReferencial(), hayPrecio ? c.getMoneda() : null,
                !hayPrecio ? null : c.getPrecioNota() != null ? c.getPrecioNota() : PRECIO_NOTA);
    }

    /** Elimina una partida captada (por ejemplo, ante el pedido de un titular). Los casos de demostración no se borran. */
    void eliminar(String codigo) {
        Expediente e = buscar(codigo);
        CasoLote caso = e.getCaso();
        if (!caso.esCaptado()) {
            throw new ConflictoException("Solo se pueden eliminar partidas captadas");
        }
        List<String> archivos = new java.util.ArrayList<>();
        if (e.getDocumentoArchivoId() != null) archivos.add(e.getDocumentoArchivoId());
        e.getPlanos().stream().map(PlanoTecnico::getArchivoId).filter(java.util.Objects::nonNull).forEach(archivos::add);
        e.getDocumentosLote().stream().map(DocumentoDelLote::getArchivoId).filter(java.util.Objects::nonNull)
                .forEach(archivos::add);
        expedientes.delete(e);
        expedientes.flush();
        casos.delete(caso);
        casos.flush();
        archivos.forEach(almacenamiento::eliminar);
    }

    private static void verificarDatosPersonales(DatosExpediente d, String denominacion, String contexto) {
        java.util.stream.Stream<String> asientos = d.asientos().stream()
                .flatMap(a -> java.util.stream.Stream.of(a.texto(), a.titulares(), a.tituloNumero(), a.acreedor(),
                        a.plazoOVencimiento()));
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
        PdfPreparado pdf = documentosPdf.preparar(archivo);
        String viejo = e.getDocumentoArchivoId();
        var guardado = almacenamiento.guardarDocumento(codigo + ".pdf", pdf, UsuarioActual.actual().codigoCuenta());
        e.setDocumentoArchivoId(guardado.id());
        e.setDocumentoGenerado(false);
        e.setActualizadoEn(Instant.now().truncatedTo(ChronoUnit.MILLIS));
        // Cambiar el documento sube la versión del expediente; se recalcula para que la evaluación siga
        // correspondiendo a la versión vigente (RN-06).
        expedientes.saveAndFlush(e);
        if (viejo != null) almacenamiento.eliminar(viejo);
        // Un PDF no es una partida transcrita: el motor no lo lee, así que no puede levantar un rojo (I9).
        recalcular(e, OrigenEvaluacion.EDICION);
        return DocumentoDto.de(codigo, guardado.sha256(), pdf);
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
    private List<String> aplicar(Expediente e, DatosExpediente d, boolean exigirArchivo) {
        NormalizadorAsientos.Resultado n = NormalizadorAsientos.normalizar(d.asientos());
        n.asientos().forEach(a -> ProteccionDatos.verificarAcreedor(a.acreedor()));

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
        if (d.tipoPredio() != null) aplicarBloqueTecnico(e, d, sobrantes, exigirArchivo);
        if (d.documentosLote() != null) aplicarDocumentosLote(e, d.documentosLote(), sobrantes, exigirArchivo);

        if (!e.isDocumentoGenerado()) return sobrantes;
        String viejo = e.getDocumentoArchivoId();
        String partida = e.getCaso().getCodigo();
        byte[] pdf = CopiaLiteralPdf.generar(copiaDe(partida, d, n.asientos()), procedencia(e.getCaso()));
        e.setDocumentoArchivoId(almacenamiento.guardar(partida + ".pdf", "application/pdf", pdf, false).id());
        if (viejo != null) sobrantes.add(viejo);
        return sobrantes;
    }

    static final String SIN_ARCHIVO = "Sube el PDF del plano antes de marcarlo como presentado";

    /**
     * Tipo de predio, área construida inscrita y planos. Solo se toca si la petición trae el tipo de predio. v0.8: con
     * {@code exigirArchivo}, un plano solo pasa a presentado u observado si ya tiene su PDF (feedback c); los planos que
     * ya lo estaban conservan su estado (las láminas generadas de los casos de demostración).
     */
    private static void aplicarBloqueTecnico(Expediente e, DatosExpediente d, List<String> sobrantes,
            boolean exigirArchivo) {
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
            boolean habia = t.getEstado() == EstadoPlano.PRESENTADO || t.getEstado() == EstadoPlano.OBSERVADO;
            if (exigirArchivo && hay && t.getArchivoId() == null && (t.getId() == null || !habia)) {
                throw new ReglaNegocioException(SIN_ARCHIVO + " (" + p.especialidad().etiqueta() + ")");
            }
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

    static final String SIN_ARCHIVO_DOCUMENTO = "Sube el PDF del documento antes de marcarlo como presentado";

    /**
     * v0.9: documentos del lote, con la misma regla que los planos: con {@code exigirArchivo}, uno solo pasa a presentado
     * u observado si ya tiene su PDF. Los que no vienen en la lista se quitan. El resumen solo lo cambia la carga de
     * contenido; una edición lo conserva.
     */
    private static void aplicarDocumentosLote(Expediente e, List<DocumentoLoteDatos> nuevos, List<String> sobrantes,
            boolean exigirArchivo) {
        Set<DocumentoLote> vistos = new HashSet<>();
        for (DocumentoLoteDatos x : nuevos) {
            if (!vistos.add(x.tipo())) throw new IllegalArgumentException("Documento repetido: " + x.tipo().etiqueta());
        }
        Map<DocumentoLote, DocumentoDelLote> actuales = new LinkedHashMap<>();
        for (DocumentoDelLote x : e.getDocumentosLote()) actuales.put(x.getTipo(), x);
        e.getDocumentosLote().removeIf(x -> {
            boolean sobra = !vistos.contains(x.getTipo());
            if (sobra && x.getArchivoId() != null) sobrantes.add(x.getArchivoId());
            return sobra;
        });
        for (DocumentoLoteDatos x : nuevos) {
            DocumentoDelLote d = actuales.get(x.tipo());
            // Un documento que no existe y sigue sin presentarse, sin observación, no se guarda: así reenviar la lista
            // completa que muestra el detalle no cuenta como un cambio de documentos.
            if (d == null && x.estado() == EstadoPlano.NO_PRESENTADO && vacioANull(x.observacion()) == null
                    && vacioANull(x.resumen()) == null) {
                continue;
            }
            if (d == null) {
                d = new DocumentoDelLote();
                d.setExpediente(e);
                d.setTipo(x.tipo());
                e.getDocumentosLote().add(d);
            }
            boolean hay = x.estado() == EstadoPlano.PRESENTADO || x.estado() == EstadoPlano.OBSERVADO;
            boolean habia = d.getEstado() == EstadoPlano.PRESENTADO || d.getEstado() == EstadoPlano.OBSERVADO;
            if (exigirArchivo && hay && d.getArchivoId() == null && (d.getId() == null || !habia)) {
                throw new ReglaNegocioException(SIN_ARCHIVO_DOCUMENTO + " (" + x.tipo().etiqueta() + ")");
            }
            d.setEstado(x.estado());
            d.setObservacion(vacioANull(x.observacion()));
            if (x.resumen() != null) d.setResumen(vacioANull(x.resumen()));
            if (!hay && d.getArchivoId() != null) {
                sobrantes.add(d.getArchivoId());
                d.setArchivoId(null);
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
            a.setAcreedor(d.acreedor());
            a.setPlazoOVencimiento(d.plazoOVencimiento());
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
            case REVISOR, GESTOR, ESPECIALISTA, ASESOR -> true;
        };
    }

    // ------------------------------------------------------ captación y publicación

    /**
     * Etapa 2: el propietario autoriza la publicación de su propio caso (I13). Es su única escritura. Si
     * ya estaba autorizado se conserva la fecha original. No recalcula ni cambia el color del indicador A (I8).
     */
    PublicacionDto autorizar(String codigo) {
        CasoLote c = casoQueAutoriza(codigo);
        if (c.getAutorizacionFecha() == null) {
            c.setAutorizacionFecha(Instant.now().truncatedTo(ChronoUnit.MILLIS));
            registrarAutorizacion(c, HistorialAutorizacion.Accion.OTORGADA, c.getAutorizacionFecha());
        }
        return publicacion(casos.saveAndFlush(c), UsuarioActual.actual());
    }

    /**
     * El propietario retira su autorización. Como un caso no puede estar publicado sin ella (I14), uno publicado pasa a
     * RETIRADO. El historial y el color del indicador A no cambian.
     */
    PublicacionDto retirarAutorizacion(String codigo) {
        CasoLote c = casoQueAutoriza(codigo);
        if (c.getAutorizacionFecha() != null) {
            registrarAutorizacion(c, HistorialAutorizacion.Accion.RETIRADA, Instant.now().truncatedTo(ChronoUnit.MILLIS));
        }
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

    /**
     * v1.0: quién otorga o retira la autorización depende de la titularidad comercial. En un caso PARTICULAR, solo su
     * propietario (otro rol, o el propietario de otro caso, recibe 403). En uno de la INMOBILIARIA, el asesor o el gestor
     * la registran en su nombre, y el propietario no puede hacerlo (403).
     */
    private CasoLote casoQueAutoriza(String codigo) {
        UsuarioActual u = UsuarioActual.actual();
        if (u.rol() != Rol.PROPIETARIO && !u.rol().incluye(Rol.GESTOR)) {
            throw new AccessDeniedException("Solo el propietario autoriza su caso");
        }
        CasoLote c = buscar(codigo).getCaso();
        if (c.getTitularidadComercial() == TitularidadComercial.INMOBILIARIA) {
            if (!u.rol().incluye(Rol.GESTOR)) {
                throw new AccessDeniedException(
                        "En un inmueble de la inmobiliaria, la autorización la registra el asesor o el gestor");
            }
            return c;
        }
        if (u.rol() != Rol.PROPIETARIO) throw new AccessDeniedException("Solo el propietario autoriza su caso");
        if (!u.codigoCuenta().equals(c.getPropietarioCodigo())) {
            throw new AccessDeniedException("Solo el propietario de este caso puede autorizarlo");
        }
        return c;
    }

    /** Agrega una fila al historial de autorizaciones (solo adición) con la cuenta que la registra y la fecha. */
    private void registrarAutorizacion(CasoLote c, HistorialAutorizacion.Accion accion, Instant fecha) {
        HistorialAutorizacion h = new HistorialAutorizacion();
        h.setCasoCodigo(c.getCodigo());
        h.setAccion(accion);
        h.setEnNombreDe(c.getTitularidadComercial());
        h.setCuentaCodigo(UsuarioActual.actual().codigoCuenta());
        h.setRegistradaEn(fecha);
        autorizaciones.save(h);
    }

    /** v1.0: historial de autorizaciones de un caso, del más antiguo al más reciente. Nunca para el comprador. */
    @Transactional(readOnly = true)
    List<AutorizacionDto> autorizaciones(String codigo) {
        if (UsuarioActual.actual().rol() == Rol.COMPRADOR) {
            throw new AccessDeniedException("El comprador no consulta el historial de autorizaciones");
        }
        CasoLote c = buscarVisible(codigo).getCaso();
        return autorizaciones.findByCasoCodigoOrderByIdAsc(c.getCodigo()).stream()
                .map(h -> new AutorizacionDto(h.getAccion().name(), h.getEnNombreDe(), h.getCuentaCodigo(),
                        h.getRegistradaEn())).toList();
    }

    // ------------------------------------------------------ portal público (v1.0)

    /** Tamaño de página del catálogo público. */
    static final int TAMANO_PAGINA_PUBLICA = 24;

    /**
     * v1.0: catálogo público, sin sesión. Solo casos PUBLICADOS, ordenados por código, en páginas de 24. Muestra lo que
     * ve el comprador: nunca el semáforo de gestión, las decisiones de captación ni el código del propietario.
     */
    @Transactional(readOnly = true)
    PaginaPublica listarPublico(int pagina) {
        if (pagina < 0) throw new IllegalArgumentException("pagina: debe ser 0 o mayor");
        List<Expediente> publicados = expedientes.findAllByOrderByCasoCodigoAsc().stream()
                .filter(e -> e.getCaso().getEstadoPublicacion() == EstadoPublicacion.PUBLICADO).toList();
        int total = publicados.size();
        int desde = Math.min(pagina * TAMANO_PAGINA_PUBLICA, total);
        int hasta = Math.min(desde + TAMANO_PAGINA_PUBLICA, total);
        List<InmueblePublico> items = publicados.subList(desde, hasta).stream().map(e -> {
            EvaluacionDto ev = clasificacion.obtener(e.getId()).orElse(null);
            EvaluacionTecnicaDto t = inspeccion.obtener(e.getId());
            CasoLote c = e.getCaso();
            return new InmueblePublico(c.getCodigo(), c.getDenominacion(), c.getContexto(),
                    ev == null ? null : ev.estado(), ev == null ? null : ev.etiqueta(), c.getOrigen().name(),
                    c.getFuente(), c.getFechaConsulta(), c.getFuenteUrl(), t.estado(), t.resultado(),
                    t.riesgoFisicoDetectado(), predio(e), RutasRegularizacion.tiposAlerta(ev),
                    c.getTitularidadComercial());
        }).toList();
        int paginas = (total + TAMANO_PAGINA_PUBLICA - 1) / TAMANO_PAGINA_PUBLICA;
        return new PaginaPublica(items, pagina, TAMANO_PAGINA_PUBLICA, total, paginas);
    }

    /** v1.0: ficha pública de un caso PUBLICADO. Un borrador, uno retirado o uno inexistente dan 404. */
    @Transactional(readOnly = true)
    DetalleCaso detallePublico(String codigo) {
        Expediente e = buscar(codigo);
        if (e.getCaso().getEstadoPublicacion() != EstadoPublicacion.PUBLICADO) throw new NoEncontradoException("Caso", codigo);
        DetalleCaso d = aDetalle(e, null);
        return new DetalleCaso(d.codigo(), d.denominacion(), d.contexto(), d.sintetico(), d.origen(), d.fuente(),
                d.fechaConsulta(), d.fuenteUrl(), d.expediente(), d.evaluacion(), sinCuentas(d.evaluacionTecnica()),
                d.checklist(), d.terminos(), d.predio(), d.publicacion(), null);
    }

    /** En el portal público no se muestran las cuentas del solicitante ni del especialista asignado. */
    private static EvaluacionTecnicaDto sinCuentas(EvaluacionTecnicaDto t) {
        if (t == null) return null;
        return new EvaluacionTecnicaDto(t.estado(), t.estadoEtiqueta(), t.resultado(), t.resultadoEtiqueta(),
                t.profesional(), t.colegiatura(), t.fechaSolicitud(), t.fechaInspeccion(), t.verifArquitectura(),
                t.verifEstructuras(), t.verifElectricas(), t.verifSanitarias(), t.observaciones(), t.conclusiones(),
                t.estudiosAdicionales(), t.limite(), t.profesionalEspecialidad(), null, t.riesgoFisicoDetectado(),
                t.servicio(), null);
    }

    private static UsuarioActual exigirRol(Rol rol, String mensaje) {
        UsuarioActual u = UsuarioActual.actual();
        if (!u.rol().incluye(rol)) throw new AccessDeniedException(mensaje);
        return u;
    }

    /** El comprador no ve el código del propietario (I11). */
    static PublicacionDto publicacion(CasoLote c, UsuarioActual u) {
        boolean ocultar = u == null || u.rol() == Rol.COMPRADOR;
        return new PublicacionDto(c.getEstadoPublicacion(), ocultar ? null : c.getPropietarioCodigo(),
                c.getAutorizacionFecha() != null, c.getAutorizacionFecha(), c.getTitularidadComercial());
    }

    /** El motor evalúa los asientos del rubro D (gravámenes y cargas), con su estado ya normalizado. */
    static EntradaClasificacion entrada(Expediente e) {
        return new EntradaClasificacion(e.getCondicionRepresentada(), e.getTitularidad(), e.getCompletitud(),
                e.getAsientos().stream().filter(a -> a.rubro() == 'D')
                        .map(a -> new EntradaClasificacion.AnotacionEntrada(a.getReferencia(), a.getEstado(),
                                a.getTipoActo().etiqueta(), a.getTipoActo())).toList(),
                e.getTipoPredio(), e.getAreaConstruidaInscrita(),
                e.getPlanos().stream().map(p -> new EntradaClasificacion.PlanoEntrada(p.getEspecialidad(),
                        p.getEstado(), p.getAreaConstruida())).toList(),
                e.getDocumentosLote().stream().map(d -> new EntradaClasificacion.DocumentoLoteEntrada(d.getTipo(),
                        d.getEstado())).toList());
    }

    private DetalleCaso aDetalle(Expediente e) {
        return aDetalle(e, UsuarioActual.actual());
    }

    /** Detalle visto por una sesión; {@code u} es null en el portal público (se ve como un comprador, v1.0). */
    private DetalleCaso aDetalle(Expediente e, UsuarioActual u) {
        CasoLote c = e.getCaso();
        ExpedienteDto exp = new ExpedienteDto(e.getVersion(), e.getCondicionRepresentada(), e.getTitularidad(),
                e.getCompletitud(), e.getFechaReferencial(), e.getNota(), e.getZonaRegistral(),
                e.getOficinaRegistral(), e.getUbicacion(), e.getAreaM2(), e.getLinderos(), e.getAntecedenteDominial(),
                e.getDocumentoArchivoId() != null, e.isDocumentoGenerado(), documentoDelCaso(e),
                e.getAsientos().stream().map(a -> new AsientoDto(a.getReferencia(), String.valueOf(a.rubro()),
                        a.getTipoActo(), a.getTipoActo().etiqueta(), a.getEstado(), a.getFechaInscripcion(),
                        a.getTituloNumero(), a.getFechaPresentacion(), a.getTexto(), a.getCanceloNumero(),
                        a.getTitulares(), a.getAcreedor(), a.getPlazoOVencimiento())).toList(),
                e.getTipoPredio(), e.getAreaConstruidaInscrita(),
                e.getPlanos().stream().map(p -> new PlanoDto(p.getEspecialidad(), p.getEspecialidad().etiqueta(),
                        p.getEstado(), p.getAreaConstruida(), p.getSistemaConstructivo(),
                        p.getSistemaConstructivo() == null ? null : p.getSistemaConstructivo().etiqueta(),
                        p.getObservacion(), p.getArchivoId() != null, documentoDelPlano(e, p),
                        p.getEspecialidad() == Especialidad.ARQUITECTURA
                                ? coincide(p.getAreaConstruida(), e.getAreaConstruidaInscrita()) : null)).toList(),
                documentosLoteDto(e));
        return new DetalleCaso(c.getCodigo(), c.getDenominacion(), c.getContexto(), c.isSintetico(),
                c.getOrigen().name(), c.getFuente(), c.getFechaConsulta(), c.getFuenteUrl(), exp,
                clasificacion.obtener(e.getId()).orElse(null), inspeccion.obtener(e.getId()), checklist.listar(e.getId()),
                glosario.terminosDe(e.getId()), predio(e), publicacion(c, u), gestionPara(e, u));
    }

    /** I15: el semáforo de gestión solo se calcula y se envía al gestor y al revisor; para los demás, null (se omite). */
    private GestionInmobiliaria gestionPara(Expediente e, UsuarioActual u) {
        return u != null && SemaforoGestion.puedeVer(u.rol()) ? gestion.de(rutas.calcular(e)) : null;
    }

    /** Origen del PDF del caso (v0.8): generado por el sistema a partir de la transcripción o subido por una cuenta. */
    private DocumentoInfoDto documentoDelCaso(Expediente e) {
        if (e.getDocumentoArchivoId() == null) return DocumentoInfoDto.falta();
        if (e.isDocumentoGenerado()) return DocumentoInfoDto.generado();
        return almacenamiento.metadatos(e.getDocumentoArchivoId()).map(DocumentoInfoDto::subido)
                .orElse(DocumentoInfoDto.falta());
    }

    /** Origen del PDF de un plano: subido, lámina generada (solo casos de demostración) o falta el archivo. */
    private DocumentoInfoDto documentoDelPlano(Expediente e, PlanoTecnico p) {
        if (p.getEstado() != EstadoPlano.PRESENTADO && p.getEstado() != EstadoPlano.OBSERVADO) return null;
        if (p.getArchivoId() != null) {
            return almacenamiento.metadatos(p.getArchivoId()).map(DocumentoInfoDto::subido)
                    .orElse(DocumentoInfoDto.falta());
        }
        return e.getCaso().esCaptado() ? DocumentoInfoDto.falta() : DocumentoInfoDto.generado();
    }

    /** v0.9: los cuatro documentos de un lote, en orden; el que no se registró sale como no presentado. */
    private List<DocumentoLoteDto> documentosLoteDto(Expediente e) {
        if (e.getTipoPredio() != TipoPredio.LOTE) return List.of();
        List<DocumentoLoteDto> lista = new java.util.ArrayList<>();
        for (DocumentoLote tipo : DocumentoLote.values()) {
            DocumentoDelLote d = documentoDe(e, tipo);
            if (d == null) {
                lista.add(new DocumentoLoteDto(tipo, tipo.etiqueta(), EstadoPlano.NO_PRESENTADO, null, null, false, null));
            } else {
                lista.add(new DocumentoLoteDto(tipo, tipo.etiqueta(), d.getEstado(), d.getObservacion(), d.getResumen(),
                        d.getArchivoId() != null, documentoDelLote(e, d)));
            }
        }
        return lista;
    }

    /** Origen del PDF de un documento del lote: guardado, generado (solo casos de demostración) o falta el archivo. */
    private DocumentoInfoDto documentoDelLote(Expediente e, DocumentoDelLote d) {
        if (d.getEstado() != EstadoPlano.PRESENTADO && d.getEstado() != EstadoPlano.OBSERVADO) return null;
        if (d.getArchivoId() != null) {
            return almacenamiento.metadatos(d.getArchivoId()).map(DocumentoInfoDto::subido)
                    .orElse(DocumentoInfoDto.falta());
        }
        return e.getCaso().esCaptado() ? DocumentoInfoDto.falta() : DocumentoInfoDto.generado();
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
