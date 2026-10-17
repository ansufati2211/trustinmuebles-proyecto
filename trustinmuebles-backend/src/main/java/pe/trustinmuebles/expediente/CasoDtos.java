package pe.trustinmuebles.expediente;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import pe.trustinmuebles.checklist.EstadoItem;
import pe.trustinmuebles.checklist.ItemChecklistDto;
import pe.trustinmuebles.clasificacion.Completitud;
import pe.trustinmuebles.clasificacion.EstadoAnotacion;
import pe.trustinmuebles.clasificacion.EstadoSemaforo;
import pe.trustinmuebles.clasificacion.EvaluacionDto;
import pe.trustinmuebles.orientacion.TerminoDto;

final class CasoDtos {
    private CasoDtos() {}

    record ResumenCaso(String codigo, String contexto, EstadoSemaforo estado, String etiqueta, long pendientes) {}

    record AnotacionDto(String referencia, EstadoAnotacion estado, String descripcion) {}

    record ExpedienteDto(Long version, String condicionRepresentada, String titularidad, Completitud completitud,
            LocalDate fechaReferencial, String nota, boolean tieneDocumento, List<AnotacionDto> anotaciones) {}

    record DetalleCaso(String codigo, String contexto, boolean sintetico, ExpedienteDto expediente,
            EvaluacionDto evaluacion, List<ItemChecklistDto> checklist, List<TerminoDto> terminos) {}

    record DocumentoDto(String codigo, String sha256) {}

    record AnotacionRequest(
            @NotBlank @Pattern(regexp = "[A-Za-z0-9-]{1,20}", message = "1 a 20 caracteres alfanuméricos o guion") String referencia,
            @NotNull EstadoAnotacion estado,
            @Size(max = 255) String descripcion) {}

    record ActualizarExpedienteRequest(
            @NotBlank @Size(max = 255) String condicionRepresentada,
            @NotBlank @Size(max = 255) String titularidad,
            @NotNull Completitud completitud,
            @NotNull LocalDate fechaReferencial,
            @Size(max = 500) String nota,
            @NotNull @Size(max = 20) List<@Valid @NotNull AnotacionRequest> anotaciones,
            @NotNull Long versionEsperada) {}

    record CambiarItemRequest(@NotNull EstadoItem estado, @Size(max = 255) String observacion) {}
}
