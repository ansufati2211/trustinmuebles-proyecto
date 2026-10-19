package pe.trustinmuebles.inspeccion;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.trustinmuebles.shared.ConflictoException;

/** API pública del módulo de inspección: solicitud del servicio e informe técnico del especialista. */
@Service
@Transactional
public class InspeccionService {
    private final EvaluacionTecnicaRepository repo;

    InspeccionService(EvaluacionTecnicaRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public EvaluacionTecnicaDto obtener(Long expedienteId) {
        return repo.findByExpedienteId(expedienteId).map(EvaluacionTecnicaDto::de)
                .orElseGet(EvaluacionTecnicaDto::sinSolicitud);
    }

    /** Pide la inspección presencial. No cobra ni agenda: solo deja constancia de la solicitud. */
    public EvaluacionTecnicaDto solicitar(Long expedienteId) {
        if (repo.findByExpedienteId(expedienteId).isPresent()) {
            throw new ConflictoException("La inspección técnica de este expediente ya fue solicitada");
        }
        EvaluacionTecnica e = new EvaluacionTecnica();
        e.setExpedienteId(expedienteId);
        e.setEstado(EstadoTecnico.SOLICITADA);
        e.setFechaSolicitud(LocalDate.now());
        e.setActualizadoEn(ahora());
        return EvaluacionTecnicaDto.de(repo.save(e));
    }

    /**
     * Guarda el informe del especialista. Con {@code exigirSolicitud}, solo si el comprador ya la pidió; la carga de
     * contenido de demostración la guarda directamente.
     */
    public EvaluacionTecnicaDto registrar(Long expedienteId, InformeDatos d, boolean exigirSolicitud) {
        EvaluacionTecnica e = repo.findByExpedienteId(expedienteId).orElse(null);
        if (e == null && exigirSolicitud) {
            throw new ConflictoException("Este expediente no tiene una solicitud de inspección técnica");
        }
        validar(d);
        if (e == null) {
            e = new EvaluacionTecnica();
            e.setExpedienteId(expedienteId);
        }
        e.setEstado(d.estado());
        e.setResultado(d.estado() == EstadoTecnico.EMITIDO ? d.resultado() : null);
        e.setProfesional(vacioANull(d.profesional()));
        e.setColegiatura(vacioANull(d.colegiatura()));
        e.setFechaInspeccion(d.fechaInspeccion());
        e.setVerifArquitectura(d.verifArquitectura());
        e.setVerifEstructuras(d.verifEstructuras());
        e.setVerifElectricas(d.verifElectricas());
        e.setVerifSanitarias(d.verifSanitarias());
        e.setObservaciones(vacioANull(d.observaciones()));
        e.setConclusiones(vacioANull(d.conclusiones()));
        e.setEstudiosAdicionales(vacioANull(d.estudiosAdicionales()));
        e.setActualizadoEn(ahora());
        return EvaluacionTecnicaDto.de(repo.save(e));
    }

    private static void validar(InformeDatos d) {
        if (d.estado() != EstadoTecnico.EN_INSPECCION && d.estado() != EstadoTecnico.EMITIDO) {
            throw new IllegalArgumentException("estado: el especialista solo puede dejar la inspección en curso o emitida");
        }
        if (d.estado() == EstadoTecnico.EMITIDO) {
            if (d.resultado() == null) throw new IllegalArgumentException("resultado: indica la conclusión del informe");
            if (vacioANull(d.profesional()) == null) throw new IllegalArgumentException("profesional: falta el nombre del profesional");
            if (vacioANull(d.colegiatura()) == null) throw new IllegalArgumentException("colegiatura: falta el número de colegiatura (CIP o CAP)");
            if (d.fechaInspeccion() == null) throw new IllegalArgumentException("fechaInspeccion: falta la fecha de la inspección");
            if (d.verifArquitectura() == null || d.verifEstructuras() == null || d.verifElectricas() == null
                    || d.verifSanitarias() == null) {
                throw new IllegalArgumentException("verificación: indica el resultado en campo de las 4 especialidades");
            }
            if (vacioANull(d.conclusiones()) == null) {
                throw new IllegalArgumentException("conclusiones: indica qué conclusiones quedan sustentadas");
            }
        }
        if (d.fechaInspeccion() != null && d.fechaInspeccion().isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("fechaInspeccion: no puede ser una fecha futura");
        }
    }

    private static Instant ahora() {
        return Instant.now().truncatedTo(ChronoUnit.MILLIS);
    }

    private static String vacioANull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
