package pe.trustinmuebles.semaforo;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.trustinmuebles.registro.CopiaLiteral;
import pe.trustinmuebles.registro.RegistroNoDisponibleException;
import pe.trustinmuebles.registro.RegistroPublicoPort;
import pe.trustinmuebles.shared.NivelRiesgo;
import pe.trustinmuebles.shared.ServicioNoDisponibleException;

/** API pública del módulo Semáforo Legal. */
@Service
@Transactional
public class SemaforoService {
    private static final Logger log = LoggerFactory.getLogger(SemaforoService.class);

    private final MotorSemaforo motor;
    private final RegistroPublicoPort registro;
    private final EvaluacionRepository repo;
    private final CatalogoExplicaciones catalogo;

    SemaforoService(MotorSemaforo motor, RegistroPublicoPort registro, EvaluacionRepository repo,
            CatalogoExplicaciones catalogo) {
        this.motor = motor;
        this.registro = registro;
        this.repo = repo;
        this.catalogo = catalogo;
    }

    /**
     * Consulta el registro y guarda una nueva evaluación. Si el servicio del Estado no responde, devuelve la
     * última evaluación marcada como desactualizada (plan de contingencia); si no hay ninguna, responde 503.
     */
    public EvaluacionLegalDto evaluar(Long inmuebleId, String numeroPartida, String vendedor, double areaM2) {
        CopiaLiteral copia;
        try {
            copia = registro.consultarCopiaLiteral(numeroPartida).orElse(null);
        } catch (RegistroNoDisponibleException e) {
            log.warn("Registro no disponible para partida {}: {}", numeroPartida, e.getMessage());
            return ultima(inmuebleId).map(EvaluacionLegalDto::marcarDesactualizada)
                    .orElseThrow(() -> new ServicioNoDisponibleException(
                            "El registro público no responde y no hay una evaluación previa", e));
        }
        EvaluacionLegal ev = new EvaluacionLegal();
        ev.setInmuebleId(inmuebleId);
        List<MotorSemaforo.Resultado> resultados;
        if (copia == null) {
            ev.setHashCopia("SIN_COPIA");
            resultados = List.of(new MotorSemaforo.Resultado(CategoriaLegal.TITULO_DOMINIO, NivelRiesgo.AMARILLO,
                    "DOM_DATOS_INCOMPLETOS", catalogo.titulo("DOM_DATOS_INCOMPLETOS"),
                    catalogo.explicacion("DOM_DATOS_INCOMPLETOS"), catalogo.recomendacion("DOM_DATOS_INCOMPLETOS"),
                    "Partida " + numeroPartida + " no encontrada"));
        } else {
            ev.setHashCopia(copia.huella());
            resultados = motor.evaluar(copia, vendedor, areaM2);
        }
        Map<CategoriaLegal, NivelRiesgo> porCategoria = new EnumMap<>(CategoriaLegal.class);
        for (CategoriaLegal c : CategoriaLegal.values()) porCategoria.put(c, NivelRiesgo.VERDE);
        for (MotorSemaforo.Resultado r : resultados) {
            porCategoria.merge(r.categoria(), r.nivel(), NivelRiesgo::peor);
            HallazgoLegal h = new HallazgoLegal();
            h.setEvaluacion(ev);
            h.setCategoria(r.categoria());
            h.setNivel(r.nivel());
            h.setCodigo(r.codigo());
            h.setTitulo(r.titulo());
            h.setExplicacion(r.explicacion());
            h.setRecomendacion(r.recomendacion());
            h.setTextoRegistral(r.textoRegistral());
            ev.getHallazgos().add(h);
        }
        ev.setNivelDominio(porCategoria.get(CategoriaLegal.TITULO_DOMINIO));
        ev.setNivelGravamenes(porCategoria.get(CategoriaLegal.GRAVAMENES));
        ev.setNivelProcesos(porCategoria.get(CategoriaLegal.PROCESOS_JUDICIALES));
        ev.setNivel(porCategoria.values().stream().reduce(NivelRiesgo.VERDE, NivelRiesgo::peor));
        ev.setFecha(Instant.now().truncatedTo(ChronoUnit.MILLIS));
        return aDto(repo.save(ev));
    }

    @Transactional(readOnly = true)
    public Optional<EvaluacionLegalDto> ultima(Long inmuebleId) {
        return repo.findFirstByInmuebleIdOrderByFechaDescIdDesc(inmuebleId).map(this::aDto);
    }

    /** Traducción de la copia literal a lenguaje simple (botón "Traducción de SUNARP"). */
    @Transactional(readOnly = true)
    public Optional<PartidaTraducida> traducir(String numeroPartida) {
        Optional<CopiaLiteral> copia;
        try {
            copia = registro.consultarCopiaLiteral(numeroPartida);
        } catch (RegistroNoDisponibleException e) {
            throw new ServicioNoDisponibleException("El registro público no responde en este momento", e);
        }
        return copia.map(c -> new PartidaTraducida(c.numeroPartida(),
                c.zonaRegistral(), c.titularActual(), c.areaRegistralM2(),
                c.asientos().stream().map(a -> new PartidaTraducida.AsientoTraducido(a.tipo().name(),
                        a.descripcion(), a.vigente(), a.fecha() == null ? null : a.fecha().toString(),
                        catalogo.traducirAsiento(a.tipo()))).toList()));
    }

    @Transactional(readOnly = true)
    public Map<NivelRiesgo, Long> distribucion() {
        Map<NivelRiesgo, Long> m = new EnumMap<>(NivelRiesgo.class);
        for (NivelRiesgo n : NivelRiesgo.values()) m.put(n, 0L);
        for (Object[] fila : repo.distribucionUltimas()) m.put((NivelRiesgo) fila[0], (Long) fila[1]);
        return m;
    }

    private EvaluacionLegalDto aDto(EvaluacionLegal e) {
        return new EvaluacionLegalDto(e.getId(), e.getInmuebleId(), e.getNivel(), e.getNivelDominio(),
                e.getNivelGravamenes(), e.getNivelProcesos(), e.getHashCopia(), e.getFecha(), false,
                e.getHallazgos().stream().map(h -> new EvaluacionLegalDto.HallazgoDto(h.getCategoria(), h.getNivel(),
                        h.getCodigo(), h.getTitulo(), h.getExplicacion(), h.getRecomendacion(),
                        h.getTextoRegistral())).toList());
    }
}
