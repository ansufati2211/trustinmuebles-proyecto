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
            return new ResumenCaso(e.getCaso().getCodigo(), e.getCaso().getContexto(),
                    ev == null ? null : ev.estado(), ev == null ? null : ev.etiqueta(),
                    checklist.contarPendientes(e.getId()));
        }).toList();
    }

    @Transactional(readOnly = true)
    DetalleCaso detalle(String codigo) {
        return aDetalle(buscar(codigo));
    }

    /**
     * REQ-F03, REQ-NF04, RN-06: valida, actualiza campos y anotaciones, recalcula la evaluación y guarda todo en una
     * sola transacción. Si algo falla no queda un registro parcial.
     */
    DetalleCaso actualizar(String codigo, ActualizarExpedienteRequest req) {
        Set<String> referencias = new HashSet<>();
        for (AnotacionRequest a : req.anotaciones()) {
            if (!referencias.add(a.referencia())) {
                throw new IllegalArgumentException("Referencia de anotación repetida: " + a.referencia());
            }
        }
        Expediente e = buscar(codigo);
        if (!req.versionEsperada().equals(e.getVersion())) {
            throw new ConflictoException("El expediente cambió mientras lo editaba. Recargue e intente de nuevo.");
        }

        e.setCondicionRepresentada(req.condicionRepresentada().trim());
        e.setTitularidad(req.titularidad().trim());
        e.setCompletitud(req.completitud());
        e.setFechaReferencial(req.fechaReferencial());
        e.setNota(req.nota() == null || req.nota().isBlank() ? null : req.nota().trim());
        e.setActualizadoEn(Instant.now().truncatedTo(ChronoUnit.MILLIS));

        // Se actualizan en el sitio las anotaciones que se conservan, para no chocar con la restricción de unicidad.
        Map<String, Anotacion> actuales = new LinkedHashMap<>();
        for (Anotacion a : e.getAnotaciones()) actuales.put(a.getReferencia(), a);
        e.getAnotaciones().removeIf(a -> !referencias.contains(a.getReferencia()));
        int orden = 0;
        for (AnotacionRequest ar : req.anotaciones()) {
            Anotacion a = actuales.get(ar.referencia());
            if (a == null) {
                a = new Anotacion();
                a.setExpediente(e);
                a.setReferencia(ar.referencia());
                e.getAnotaciones().add(a);
            }
            a.setEstado(ar.estado());
            a.setDescripcion(ar.descripcion() == null || ar.descripcion().isBlank() ? null : ar.descripcion().trim());
            a.setOrden(orden++);
        }

        expedientes.saveAndFlush(e);
        clasificacion.recalcular(e.getId(), e.getVersion(), entrada(e));
        return aDetalle(e);
    }

    ItemChecklistDto cambiarItem(String codigo, Long itemId, CambiarItemRequest req) {
        Expediente e = buscar(codigo);
        String obs = req.observacion() == null || req.observacion().isBlank() ? null : req.observacion().trim();
        return checklist.actualizar(e.getId(), itemId, req.estado(), obs);
    }

    DocumentoDto asociarDocumento(String codigo, MultipartFile archivo) {
        Expediente e = buscar(codigo);
        byte[] datos;
        try {
            datos = archivo.getBytes();
        } catch (java.io.IOException ex) {
            throw new java.io.UncheckedIOException(ex);
        }
        if (!esPdf(datos)) throw new ReglaNegocioException("El archivo debe ser un PDF válido");
        var guardado = almacenamiento.guardar(codigo + ".pdf", "application/pdf", datos, false);
        e.setDocumentoArchivoId(guardado.id());
        e.setActualizadoEn(Instant.now().truncatedTo(ChronoUnit.MILLIS));
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

    private Expediente buscar(String codigo) {
        return expedientes.findByCasoCodigo(codigo).orElseThrow(() -> new NoEncontradoException("Caso", codigo));
    }

    static EntradaClasificacion entrada(Expediente e) {
        return new EntradaClasificacion(e.getCondicionRepresentada(), e.getTitularidad(), e.getCompletitud(),
                e.getAnotaciones().stream().map(a -> new EntradaClasificacion.AnotacionEntrada(a.getReferencia(),
                        a.getEstado(), a.getDescripcion())).toList());
    }

    private DetalleCaso aDetalle(Expediente e) {
        CasoLote c = e.getCaso();
        ExpedienteDto exp = new ExpedienteDto(e.getVersion(), e.getCondicionRepresentada(), e.getTitularidad(),
                e.getCompletitud(), e.getFechaReferencial(), e.getNota(), e.getDocumentoArchivoId() != null,
                e.getAnotaciones().stream().map(a -> new AnotacionDto(a.getReferencia(), a.getEstado(),
                        a.getDescripcion())).toList());
        return new DetalleCaso(c.getCodigo(), c.getContexto(), c.isSintetico(), exp,
                clasificacion.obtener(e.getId()).orElse(null), checklist.listar(e.getId()),
                glosario.terminosDe(e.getId()));
    }
}
