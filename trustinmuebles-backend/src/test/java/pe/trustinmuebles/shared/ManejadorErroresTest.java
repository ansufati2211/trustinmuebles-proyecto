package pe.trustinmuebles.shared;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.SQLIntegrityConstraintViolationException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ProblemDetail;

/** v0.8 (B7): el 409 por base de datos registra la causa raíz en el log del servidor sin cambiar lo que recibe el cliente. */
@ExtendWith(OutputCaptureExtension.class)
class ManejadorErroresTest {

    @Test
    @DisplayName("CP25: la respuesta al cliente no cambia y no expone la causa; el log del servidor tiene la cadena completa")
    void integridadRegistraLaCausaRaiz(CapturedOutput salida) {
        var causa = new SQLIntegrityConstraintViolationException("Unique index violation: PUBLIC.UK_SECRETO_INTERNO");
        var e = new DataIntegrityViolationException("could not execute statement",
                new IllegalStateException("capa intermedia", causa));
        ProblemDetail r = new ManejadorErrores().integridad(e);

        assertThat(r.getStatus()).isEqualTo(409);
        assertThat(r.getDetail()).isEqualTo("Los datos enviados no son válidos o ya existen");
        assertThat(String.valueOf(r.getProperties())).doesNotContain("UK_SECRETO_INTERNO");
        assertThat(salida.getOut() + salida.getErr())
                .contains("409 por integridad de datos", DataIntegrityViolationException.class.getName(),
                        "Caused by: java.lang.IllegalStateException: capa intermedia",
                        "Caused by: java.sql.SQLIntegrityConstraintViolationException", "UK_SECRETO_INTERNO");
    }

    @Test
    @DisplayName("Un conflicto de versión también deja su causa en el log y conserva el mensaje al cliente")
    void concurrenciaRegistraLaCausa(CapturedOutput salida) {
        var e = new org.springframework.orm.ObjectOptimisticLockingFailureException("Expediente", 7L);
        ProblemDetail r = new ManejadorErrores().conflicto(e);
        assertThat(r.getStatus()).isEqualTo(409);
        assertThat(r.getDetail()).isEqualTo("El expediente cambió mientras lo editaba. Recargue e intente de nuevo.");
        assertThat(salida.getOut() + salida.getErr()).contains("409 por concurrencia",
                "ObjectOptimisticLockingFailureException");
    }

    @Test
    @DisplayName("Un conflicto de negocio (ConflictoException) responde igual que antes y no se registra como error de base")
    void conflictoDeNegocioSinCambios(CapturedOutput salida) {
        ProblemDetail r = new ManejadorErrores().conflicto(new ConflictoException("La partida 123 ya está registrada"));
        assertThat(r.getStatus()).isEqualTo(409);
        assertThat(r.getDetail()).isEqualTo("La partida 123 ya está registrada");
        assertThat(salida.getOut() + salida.getErr()).doesNotContain("409 por concurrencia");
    }
}
