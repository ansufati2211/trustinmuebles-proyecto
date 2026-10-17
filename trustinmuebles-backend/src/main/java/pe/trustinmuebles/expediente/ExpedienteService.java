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
import pe.trustinmuebles.orientacion.GlosarioService;
import pe.trustinmuebles.shared.ConflictoException;
import pe.trustinmuebles.shared.NoEncontradoException;
import pe.trustinmuebles.shared.ReglaNegocioException;

@Service
@Transactional
class ExpedienteService {
    private final ExpedienteRepository expedientes;
    private final ClasificacionService clasificacion;
    private final ChecklistService checklist;
    private final GlosarioService glosario;
    private final AlmacenamientoService almacenamiento;

    ExpedienteService(ExpedienteRepository expedientes, ClasificacionService clasificacion,
            ChecklistService checklist, GlosarioService glosario, AlmacenamientoService almacenamiento) {
        this.expedientes = expedientes;
        this.clasificacion = clasificacion;
        this.checklist = checklist;
        this.glosario = glosario;
        this.almacenamiento = almacenamiento;
    }

    @Transactional(readOnly = true)
    List<ResumenCaso> listar() {
        return expedientes.findAllByOrderByCasoCodigoAsc().stream().map(e -> {
            EvaluacionDto ev = clasificacion.obtener(e.getId()).orElse(null);
            return new ResumenCaso(e.getCaso().getCodigo(), e.getCaso().getDenominacion(), e.getCaso().getContexto(),
                    ev == null ? null : ev.estado(), ev == null ? null : ev.etiqueta(),
                    checklist.contarPendientes(e.getId()));
        }).toList();
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
        if (!req.versionEsperada().equals(e.getVersion())) {
            throw new ConflictoException("El expediente cambió mientras lo editaba. Recargue e intente de nuevo.");
        }
        String documentoViejo = aplicar(e, req.datos());
        expedientes.saveAndFlush(e);
        if (documentoViejo != null) almacenamiento.eliminar(documentoViejo);
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

    /** Aplica los datos al expediente. Devuelve el id del documento reemplazado, si se regeneró uno. */
    private String aplicar(Expediente e, DatosExpediente d) {
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

        if (!e.isDocumentoGenerado()) return null;
        String viejo = e.getDocumentoArchivoId();
        String partida = e.getCaso().getCodigo();
        byte[] pdf = CopiaLiteralPdf.generar(copiaDe(partida, d, n.asientos()));
        e.setDocumentoArchivoId(almacenamiento.guardar(partida + ".pdf", "application/pdf", pdf, false).id());
        return viejo;
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

    static DatosCopia copiaDe(String partida, DatosExpediente d, List<AsientoDatos> asientos) {
        List<AsientoCopia> lista = asientos.stream().map(a -> new AsientoCopia(a.referencia(), a.tipoActo().etiqueta(),
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
                                a.getTipoActo().etiqueta(), a.getTipoActo())).toList());
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
                        a.getTitulares())).toList());
        return new DetalleCaso(c.getCodigo(), c.getDenominacion(), c.getContexto(), c.isSintetico(), exp,
                clasificacion.obtener(e.getId()).orElse(null), checklist.listar(e.getId()),
                glosario.terminosDe(e.getId()));
    }

    private static String vacioANull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
