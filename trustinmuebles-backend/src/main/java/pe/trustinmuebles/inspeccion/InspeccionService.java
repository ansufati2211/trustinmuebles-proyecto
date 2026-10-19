package pe.trustinmuebles.inspeccion;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.trustinmuebles.identidad.AuthService;
import pe.trustinmuebles.identidad.PerfilProfesional;
import pe.trustinmuebles.shared.ConflictoException;
import pe.trustinmuebles.shared.ReglaNegocioException;

/**
 * API pública del módulo de inspección: solicitud del servicio e informe técnico del especialista.
 * Nunca escribe en el módulo de clasificación: el informe no cambia el color del semáforo documental (RN-10).
 */
@Service
@Transactional
public class InspeccionService {
    static final String CONDICIONES = "Coordinado con la inmobiliaria; sin pasarela de pago en línea.";

    private final EvaluacionTecnicaRepository repo;
    private final AuthService identidad;
    private final ServicioInspeccion servicio;

    InspeccionService(EvaluacionTecnicaRepository repo, AuthService identidad,
            @Value("${app.inspeccion.costo-referencial:250.00}") BigDecimal costoReferencial) {
        this.repo = repo;
        this.identidad = identidad;
        this.servicio = new ServicioInspeccion(costoReferencial.setScale(2, RoundingMode.HALF_UP), "PEN", CONDICIONES);
    }

    /** Costo referencial y condiciones del servicio, para mostrarlos antes de solicitarlo. */
    public ServicioInspeccion servicio() {
        return servicio;
    }

    @Transactional(readOnly = true)
    public EvaluacionTecnicaDto obtener(Long expedienteId) {
        return repo.findByExpedienteId(expedienteId).map(e -> EvaluacionTecnicaDto.de(e, servicio))
                .orElseGet(() -> EvaluacionTecnicaDto.sinSolicitud(servicio));
    }

    /**
     * M5: deja constancia de la solicitud. No cobra ni agenda. Quien llama pasa el código de la cuenta autenticada
     * (o el del comprador de la demostración, en la carga de contenido); el cliente nunca lo envía.
     * Hay una sola solicitud por expediente: una segunda da 409.
     */
    public EvaluacionTecnicaDto solicitar(Long expedienteId, String solicitanteCodigo) {
        if (solicitanteCodigo == null || solicitanteCodigo.isBlank()) {
            throw new IllegalArgumentException("solicitante: falta la cuenta que pide la inspección");
        }
        if (repo.findByExpedienteId(expedienteId).isPresent()) {
            throw new ConflictoException("La inspección técnica de este expediente ya fue solicitada");
        }
        EvaluacionTecnica e = new EvaluacionTecnica();
        e.setExpedienteId(expedienteId);
        e.setEstado(EstadoTecnico.SOLICITADA);
        e.setSolicitanteCodigo(solicitanteCodigo);
        e.setFechaSolicitud(LocalDate.now());
        e.setActualizadoEn(ahora());
        return EvaluacionTecnicaDto.de(repo.save(e), servicio);
    }

    /**
     * M8: el especialista registra el avance o el informe. El nombre, la especialidad y la colegiatura salen de su
     * cuenta, nunca del cuerpo de la petición. Exige que el expediente tenga una solicitud.
     */
    public EvaluacionTecnicaDto registrar(Long expedienteId, InformeDatos d, Long especialistaId) {
        EvaluacionTecnica e = repo.findByExpedienteId(expedienteId).orElseThrow(
                () -> new ConflictoException("Este expediente no tiene una solicitud de inspección técnica"));
        PerfilProfesional perfil = identidad.perfilProfesional(especialistaId).orElseThrow(
                () -> new ReglaNegocioException("Tu cuenta no tiene datos profesionales (nombre y colegiatura) para firmar el informe"));
        return guardar(e, d, perfil);
    }

    /**
     * Carga de contenido: guarda un informe de demostración sin pasar por el endpoint. El profesional es la cuenta de
     * especialista indicada y la fecha de solicitud queda cuatro días antes de la inspección, para que el informe no
     * quede incompleto.
     */
    public EvaluacionTecnicaDto cargarDemostracion(Long expedienteId, InformeDatos d, String especialistaCodigo,
            String solicitanteCodigo) {
        PerfilProfesional perfil = identidad.perfilProfesional(especialistaCodigo).orElseThrow(
                () -> new IllegalStateException("La cuenta " + especialistaCodigo + " no tiene datos profesionales"));
        EvaluacionTecnica e = repo.findByExpedienteId(expedienteId).orElseGet(EvaluacionTecnica::new);
        e.setExpedienteId(expedienteId);
        e.setSolicitanteCodigo(solicitanteCodigo);
        if (d.fechaInspeccion() != null) e.setFechaSolicitud(d.fechaInspeccion().minusDays(4));
        return guardar(e, d, perfil);
    }

    private EvaluacionTecnicaDto guardar(EvaluacionTecnica e, InformeDatos d, PerfilProfesional perfil) {
        validar(d);
        e.setEstado(d.estado());
        e.setResultado(d.estado() == EstadoTecnico.EMITIDO ? d.resultado() : null);
        e.setProfesional(perfil.nombre());
        e.setProfesionalEspecialidad(perfil.especialidad());
        e.setColegiatura(perfil.colegiatura());
        e.setFechaInspeccion(d.fechaInspeccion());
        e.setVerifArquitectura(d.verifArquitectura());
        e.setVerifEstructuras(d.verifEstructuras());
        e.setVerifElectricas(d.verifElectricas());
        e.setVerifSanitarias(d.verifSanitarias());
        e.setObservaciones(vacioANull(d.observaciones()));
        e.setConclusiones(vacioANull(d.conclusiones()));
        e.setEstudiosAdicionales(vacioANull(d.estudiosAdicionales()));
        e.setActualizadoEn(ahora());
        return EvaluacionTecnicaDto.de(repo.save(e), servicio);
    }

    private static void validar(InformeDatos d) {
        if (d.estado() != EstadoTecnico.EN_INSPECCION && d.estado() != EstadoTecnico.EMITIDO) {
            throw new IllegalArgumentException("estado: el especialista solo puede dejar la inspección en curso o emitida");
        }
        if (d.estado() == EstadoTecnico.EMITIDO) {
            if (d.resultado() == null) throw new IllegalArgumentException("resultado: indica la conclusión del informe");
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
