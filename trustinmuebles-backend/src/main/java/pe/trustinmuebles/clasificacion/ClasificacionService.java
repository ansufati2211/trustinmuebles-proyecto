package pe.trustinmuebles.clasificacion;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/** API pública del módulo de clasificación: calcula y guarda la evaluación vigente de un expediente. */
@Service
@Transactional
public class ClasificacionService {
    private final ReglaRepository reglas;
    private final CondicionContempladaRepository condiciones;
    private final EvaluacionRepository evaluaciones;
    private final HistorialEvaluacionRepository historial;
    private final ObjectMapper json;
    private final String versionActiva;

    ClasificacionService(ReglaRepository reglas, CondicionContempladaRepository condiciones,
            EvaluacionRepository evaluaciones, HistorialEvaluacionRepository historial, ObjectMapper json,
            @Value("${app.reglas.version}") String versionActiva) {
        this.reglas = reglas;
        this.condiciones = condiciones;
        this.evaluaciones = evaluaciones;
        this.historial = historial;
        this.json = json;
        this.versionActiva = versionActiva;
    }

    public String versionActiva() {
        return versionActiva;
    }

    /**
     * Recalcula con la versión de reglas activa, reemplaza la evaluación vigente (RN-06) y agrega una fila al historial
     * con el origen y la cuenta que actuó (I12). Es la única forma de cambiar el color: no hay forma de fijarlo (I8).
     */
    public EvaluacionDto recalcular(Long expedienteId, Long expedienteVersion, EntradaClasificacion entrada,
            OrigenEvaluacion origen, String cuentaCodigo) {
        if (origen == null || cuentaCodigo == null || cuentaCodigo.isBlank()) {
            throw new IllegalArgumentException("Un recálculo debe indicar su origen y la cuenta que lo provoca");
        }
        List<Regla> reglasVersion = reglas.findByVersionOrderById(versionActiva);
        if (reglasVersion.isEmpty()) {
            throw new IllegalStateException("No hay reglas cargadas para la versión " + versionActiva);
        }
        List<String> contempladas = condiciones.findByVersionReglas(versionActiva).stream()
                .map(CondicionContemplada::getTexto).toList();

        ResultadoClasificacion r = MotorClasificacion.evaluar(entrada,
                reglasVersion.stream().map(Regla::aplicable).toList(), contempladas, versionActiva);

        EvaluacionInformativa ev = evaluaciones.findByExpedienteId(expedienteId).orElseGet(() -> {
            EvaluacionInformativa nueva = new EvaluacionInformativa();
            nueva.setExpedienteId(expedienteId);
            return nueva;
        });
        Instant ahora = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        EstadoSemaforo anterior = ev.getEstado();
        ev.setEstado(r.estado());
        ev.setDetalle(json.writeValueAsString(r));
        ev.setVersionReglas(versionActiva);
        ev.setExpedienteVersion(expedienteVersion);
        ev.setCalculadaEn(ahora);
        ev.setReglas(new HashSet<>(reglasVersion.stream().filter(x -> r.reglasAplicadas().contains(x.getCodigo()))
                .toList()));
        evaluaciones.save(ev);
        agregarAlHistorial(expedienteId, ahora, anterior, r, origen, cuentaCodigo);
        return EvaluacionDto.de(r, ahora, expedienteVersion);
    }

    /**
     * Registra la evaluación vigente como primera fila del historial de un expediente que aún no tiene ninguna (por
     * ejemplo, una base anterior a la v0.7). Si ya tiene filas no hace nada, así que no duplica al volver a arrancar.
     */
    public void registrarInicialSiFalta(Long expedienteId) {
        if (historial.existsByExpedienteId(expedienteId)) return;
        evaluaciones.findByExpedienteId(expedienteId).ifPresent(ev -> agregarAlHistorial(expedienteId,
                ev.getCalculadaEn(), null, json.readValue(ev.getDetalle(), ResultadoClasificacion.class),
                OrigenEvaluacion.CARGA_INICIAL, CUENTA_SISTEMA));
    }

    /** Historial del expediente, del más antiguo al más reciente. Solo lectura (I12). */
    @Transactional(readOnly = true)
    public List<HistorialEvaluacionDto> historial(Long expedienteId) {
        return historial.findByExpedienteIdOrderByIdAsc(expedienteId).stream().map(h -> new HistorialEvaluacionDto(
                h.getRegistradaEn(), h.getEstadoAnterior(), h.getEstadoNuevo(),
                List.of(json.readValue(h.getMotivos(), ResultadoClasificacion.Motivo[].class)),
                List.of(json.readValue(h.getFaltantes(), String[].class)), h.getVersionReglas(), h.getOrigen(),
                h.getCuentaCodigo())).toList();
    }

    /** Cuenta que figura en los recálculos de la carga de contenido, que no hace ninguna persona. */
    public static final String CUENTA_SISTEMA = "sistema";

    private void agregarAlHistorial(Long expedienteId, Instant cuando, EstadoSemaforo anterior,
            ResultadoClasificacion r, OrigenEvaluacion origen, String cuentaCodigo) {
        HistorialEvaluacion h = new HistorialEvaluacion();
        h.setExpedienteId(expedienteId);
        h.setRegistradaEn(cuando);
        h.setEstadoAnterior(anterior);
        h.setEstadoNuevo(r.estado());
        h.setMotivos(json.writeValueAsString(r.motivos() == null ? List.of() : r.motivos()));
        h.setFaltantes(json.writeValueAsString(r.faltantes() == null ? List.of() : r.faltantes()));
        h.setVersionReglas(r.versionReglas());
        h.setOrigen(origen);
        h.setCuentaCodigo(cuentaCodigo);
        historial.save(h);
    }

    @Transactional(readOnly = true)
    public Optional<EvaluacionDto> obtener(Long expedienteId) {
        return evaluaciones.findByExpedienteId(expedienteId).map(ev -> EvaluacionDto.de(
                json.readValue(ev.getDetalle(), ResultadoClasificacion.class), ev.getCalculadaEn(),
                ev.getExpedienteVersion()));
    }

    /** True si falta la evaluación, usa otra versión de reglas o quedó atrás del expediente. */
    @Transactional(readOnly = true)
    public boolean necesitaRecalculo(Long expedienteId, Long expedienteVersion) {
        return evaluaciones.findByExpedienteId(expedienteId)
                .map(ev -> !versionActiva.equals(ev.getVersionReglas())
                        || !expedienteVersion.equals(ev.getExpedienteVersion()))
                .orElse(true);
    }
}
