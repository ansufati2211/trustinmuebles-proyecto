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
    private final ObjectMapper json;
    private final String versionActiva;

    ClasificacionService(ReglaRepository reglas, CondicionContempladaRepository condiciones,
            EvaluacionRepository evaluaciones, ObjectMapper json,
            @Value("${app.reglas.version}") String versionActiva) {
        this.reglas = reglas;
        this.condiciones = condiciones;
        this.evaluaciones = evaluaciones;
        this.json = json;
        this.versionActiva = versionActiva;
    }

    public String versionActiva() {
        return versionActiva;
    }

    /** Recalcula con la versión de reglas activa y reemplaza la evaluación vigente (RN-06). */
    public EvaluacionDto recalcular(Long expedienteId, Long expedienteVersion, EntradaClasificacion entrada) {
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
        ev.setEstado(r.estado());
        ev.setDetalle(json.writeValueAsString(r));
        ev.setVersionReglas(versionActiva);
        ev.setExpedienteVersion(expedienteVersion);
        ev.setCalculadaEn(ahora);
        ev.setReglas(new HashSet<>(reglasVersion.stream().filter(x -> r.reglasAplicadas().contains(x.getCodigo()))
                .toList()));
        evaluaciones.save(ev);
        return EvaluacionDto.de(r, ahora, expedienteVersion);
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
