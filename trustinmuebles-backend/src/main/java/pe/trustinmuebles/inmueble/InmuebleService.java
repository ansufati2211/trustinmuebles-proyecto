package pe.trustinmuebles.inmueble;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import pe.trustinmuebles.almacenamiento.AlmacenamientoService;
import pe.trustinmuebles.almacenamiento.ArchivoGuardado;
import pe.trustinmuebles.inmueble.InmuebleDtos.*;
import pe.trustinmuebles.inspeccion.InspeccionService;
import pe.trustinmuebles.semaforo.EvaluacionLegalDto;
import pe.trustinmuebles.semaforo.PartidaTraducida;
import pe.trustinmuebles.semaforo.SemaforoService;
import pe.trustinmuebles.shared.NivelRiesgo;
import pe.trustinmuebles.shared.NoEncontradoException;
import pe.trustinmuebles.shared.ReglaNegocioException;

/** API pública del módulo de inmuebles; además actúa como fachada de la ficha de auditoría. */
@Service
@Transactional
public class InmuebleService {
    private final InmuebleRepository inmuebles;
    private final PlanoRepository planos;
    private final SemaforoService semaforo;
    private final InspeccionService inspecciones;
    private final AlmacenamientoService almacenamiento;

    InmuebleService(InmuebleRepository inmuebles, PlanoRepository planos,
            SemaforoService semaforo, InspeccionService inspecciones, AlmacenamientoService almacenamiento) {
        this.inmuebles = inmuebles;
        this.planos = planos;
        this.semaforo = semaforo;
        this.inspecciones = inspecciones;
        this.almacenamiento = almacenamiento;
    }

    @Transactional(readOnly = true)
    public List<Tarjeta> listar(BigDecimal precioMin, BigDecimal precioMax, BigDecimal areaMin, Integer habitaciones,
            Integer banos, String q, boolean soloVerdes) {
        String texto = q == null ? "" : q.trim().toLowerCase();
        return inmuebles.findAllByOrderByPublicadoEnDescIdDesc().stream()
                .filter(i -> precioMin == null || i.getPrecioUsd().compareTo(precioMin) >= 0)
                .filter(i -> precioMax == null || i.getPrecioUsd().compareTo(precioMax) <= 0)
                .filter(i -> areaMin == null || i.getAreaM2().compareTo(areaMin) >= 0)
                .filter(i -> habitaciones == null || i.getHabitaciones() >= habitaciones)
                .filter(i -> banos == null || i.getBanos() >= banos)
                .filter(i -> texto.isEmpty() || (i.getTitulo() + " " + i.getUbicacion()).toLowerCase().contains(texto))
                .map(this::tarjeta)
                .filter(t -> !soloVerdes || (t.legal() == NivelRiesgo.VERDE && t.struct() == NivelRiesgo.VERDE))
                .toList();
    }

    @Transactional(readOnly = true)
    public Detalle detalle(Long id) {
        Inmueble i = obtener(id);
        EvaluacionLegalDto sem = semaforo.ultima(id).orElse(null);
        InspeccionVista insp = inspecciones.ultimaCerrada(id).map(x -> new InspeccionVista(x,
                planos.findById(x.planoId()).map(InmuebleService::aDto).orElse(null))).orElse(null);
        return new Detalle(i.getId(), i.getTitulo(), i.getUbicacion(), i.getDireccion(), i.getDescripcion(),
                i.getPrecioUsd(), i.getHabitaciones(), i.getBanos(), i.getAreaM2(), i.getNumeroPartida(),
                i.getVendedorNombre(), i.getImagenUrl(), sem, insp);
    }

    @Transactional(readOnly = true)
    public Resumen resumen(Long id) {
        Inmueble i = obtener(id);
        return new Resumen(i.getId(), i.getTitulo(), i.getUbicacion(), i.getDireccion(), i.getPrecioUsd(),
                i.getImagenUrl(), i.getVendedorNombre(), i.getNumeroPartida());
    }

    @Transactional(readOnly = true)
    public Optional<PlanoDto> primerPlano(Long inmuebleId) {
        return planos.findFirstByInmuebleIdOrderByIdAsc(inmuebleId).map(InmuebleService::aDto);
    }

    @Transactional(readOnly = true)
    public List<PlanoDto> planos(Long inmuebleId) {
        return planos.findByInmuebleIdOrderByIdAsc(inmuebleId).stream().map(InmuebleService::aDto).toList();
    }

    @Transactional(readOnly = true)
    public PartidaTraducida partida(Long id) {
        Inmueble i = obtener(id);
        return semaforo.traducir(i.getNumeroPartida())
                .orElseThrow(() -> new NoEncontradoException("Partida registral", i.getNumeroPartida()));
    }

    @Transactional(readOnly = true)
    public EvaluacionLegalDto semaforo(Long id) {
        obtener(id);
        return semaforo.ultima(id).orElseThrow(() -> new NoEncontradoException("Evaluación legal del inmueble", id));
    }

    public EvaluacionLegalDto evaluar(Long id) {
        Inmueble i = obtener(id);
        return semaforo.evaluar(i.getId(), i.getNumeroPartida(), i.getVendedorNombre(), i.getAreaM2().doubleValue());
    }

    /** Abre una inspección sobre un plano que debe pertenecer a este inmueble. */
    public pe.trustinmuebles.inspeccion.InspeccionDto crearInspeccion(Long inmuebleId, Long planoId, String inspector) {
        obtener(inmuebleId);
        if (planos.findByInmuebleIdOrderByIdAsc(inmuebleId).stream().noneMatch(p -> p.getId().equals(planoId))) {
            throw new ReglaNegocioException("El plano no pertenece a este inmueble");
        }
        return inspecciones.crear(inmuebleId, planoId, inspector);
    }

    public PlanoDto subirPlano(Long inmuebleId, String nombre, MultipartFile archivo) {
        obtener(inmuebleId);
        String tipo = archivo.getContentType();
        if (tipo == null || !tipo.startsWith("image/")) {
            throw new ReglaNegocioException("El plano debe ser una imagen (PNG, JPG, WEBP o SVG)");
        }
        ArchivoGuardado g = almacenamiento.guardar(archivo, true);
        Plano2D p = new Plano2D();
        p.setInmuebleId(inmuebleId);
        p.setNombre(nombre == null || nombre.isBlank() ? g.nombre() : nombre);
        p.setImagenUrl(g.url());
        return aDto(planos.save(p));
    }

    @Transactional(readOnly = true)
    public List<Long> idsSinEvaluacion() {
        return inmuebles.findAll().stream().map(Inmueble::getId).filter(id -> semaforo.ultima(id).isEmpty()).toList();
    }

    private Tarjeta tarjeta(Inmueble i) {
        NivelRiesgo legal = semaforo.ultima(i.getId()).map(EvaluacionLegalDto::nivel).orElse(null);
        NivelRiesgo struct = inspecciones.ultimaCerrada(i.getId()).map(x -> x.nivel()).orElse(null);
        return new Tarjeta(i.getId(), i.getTitulo(), i.getUbicacion(), i.getPrecioUsd(), i.getHabitaciones(),
                i.getBanos(), i.getAreaM2(), legal, struct, i.getImagenUrl());
    }

    private Inmueble obtener(Long id) {
        return inmuebles.findById(id).orElseThrow(() -> new NoEncontradoException("Inmueble", id));
    }

    private static PlanoDto aDto(Plano2D p) {
        return new PlanoDto(p.getId(), p.getNombre(), p.getImagenUrl());
    }
}
