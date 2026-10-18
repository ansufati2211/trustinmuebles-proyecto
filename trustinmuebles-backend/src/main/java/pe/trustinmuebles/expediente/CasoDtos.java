package pe.trustinmuebles.expediente;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import pe.trustinmuebles.checklist.EstadoItem;
import pe.trustinmuebles.checklist.ItemChecklistDto;
import pe.trustinmuebles.clasificacion.Completitud;
import pe.trustinmuebles.clasificacion.EstadoAnotacion;
import pe.trustinmuebles.clasificacion.EstadoSemaforo;
import pe.trustinmuebles.clasificacion.EvaluacionDto;
import pe.trustinmuebles.clasificacion.TipoActo;
import pe.trustinmuebles.orientacion.TerminoDto;

final class CasoDtos {
    private CasoDtos() {}

    // ---------------------------------------------------------------- respuestas

    record ResumenCaso(String codigo, String denominacion, String contexto, EstadoSemaforo estado, String etiqueta,
            long pendientes, String origen, String fuente, LocalDate fechaConsulta) {}

    record AsientoDto(String referencia, String rubro, TipoActo tipoActo, String tipoActoEtiqueta,
            EstadoAnotacion estado, LocalDate fechaInscripcion, String tituloNumero, LocalDate fechaPresentacion,
            String texto, String canceloNumero, String titulares) {}

    record ExpedienteDto(Long version, String condicionRepresentada, String titularidad, Completitud completitud,
            LocalDate fechaReferencial, String nota, String zonaRegistral, String oficinaRegistral, String ubicacion,
            BigDecimal areaM2, String linderos, String antecedenteDominial, boolean tieneDocumento,
            boolean documentoGenerado, List<AsientoDto> asientos) {}

    record DetalleCaso(String codigo, String denominacion, String contexto, boolean sintetico, String origen,
            String fuente, LocalDate fechaConsulta, ExpedienteDto expediente, EvaluacionDto evaluacion, List<ItemChecklistDto> checklist,
            List<TerminoDto> terminos) {}

    record DocumentoDto(String codigo, String sha256) {}

    // ----------------------------------------------------------------- peticiones

    /** Solo los rubros C a F se editan como asientos. Los rubros de descripción y antecedente son campos del predio. */
    record AsientoRequest(
            @NotBlank @Pattern(regexp = "[C-F][0-9]{5}", message = "debe ser una letra de rubro C a F y cinco dígitos, por ejemplo D00001") String referencia,
            @NotNull TipoActo tipoActo,
            EstadoAnotacion estado,
            LocalDate fechaInscripcion,
            @Size(max = 40) String tituloNumero,
            LocalDate fechaPresentacion,
            @Size(max = 1500) String texto,
            @Pattern(regexp = "D[0-9]{5}", message = "debe ser el número de un asiento D, por ejemplo D00001") String canceloNumero,
            @Size(max = 500) String titulares) {}

    record ActualizarExpedienteRequest(
            @NotBlank @Size(max = 255) String condicionRepresentada,
            @NotNull Completitud completitud,
            @NotNull LocalDate fechaReferencial,
            @Size(max = 500) String nota,
            @Size(max = 120) String zonaRegistral,
            @Size(max = 120) String oficinaRegistral,
            @Size(max = 255) String ubicacion,
            @DecimalMin("0.01") @Digits(integer = 8, fraction = 2) BigDecimal areaM2,
            @Size(max = 1000) String linderos,
            @Size(max = 500) String antecedenteDominial,
            @NotNull @Size(max = 40) List<@Valid @NotNull AsientoRequest> asientos,
            @NotNull Long versionEsperada) {

        DatosExpediente datos() {
            return new DatosExpediente(condicionRepresentada, completitud, fechaReferencial, nota, zonaRegistral,
                    oficinaRegistral, ubicacion, areaM2, linderos, antecedenteDominial,
                    asientos.stream().map(a -> new AsientoDatos(a.referencia(), a.tipoActo(), a.estado(),
                            a.fechaInscripcion(), a.tituloNumero(), a.fechaPresentacion(), a.texto(),
                            a.canceloNumero(), a.titulares())).toList());
        }
    }

    /** Registro de una partida transcrita. El número no puede llevar el prefijo SIM-, reservado a las ficticias. */
    record RegistrarPartidaRequest(
            @NotBlank @Pattern(regexp = "[A-Z]?[0-9]{8}", message = "debe tener ocho dígitos, con una letra inicial opcional (por ejemplo 11012345 o P07044600)") String numero,
            @NotBlank @Size(max = 255) String denominacion,
            @NotBlank @Size(max = 255) String contexto,
            @NotNull LocalDate fechaConsulta,
            @NotBlank @Size(max = 255) String condicionRepresentada,
            @NotNull Completitud completitud,
            @Size(max = 500) String nota,
            @Size(max = 120) String zonaRegistral,
            @Size(max = 120) String oficinaRegistral,
            @Size(max = 255) String ubicacion,
            @DecimalMin("0.01") @Digits(integer = 8, fraction = 2) BigDecimal areaM2,
            @Size(max = 1000) String linderos,
            @Size(max = 500) String antecedenteDominial,
            @NotNull @Size(max = 40) List<@Valid @NotNull AsientoRequest> asientos,
            @NotNull Boolean confirmaSinDatosPersonales) {

        DatosExpediente datos() {
            return new DatosExpediente(condicionRepresentada, completitud, fechaConsulta, nota, zonaRegistral,
                    oficinaRegistral, ubicacion, areaM2, linderos, antecedenteDominial,
                    asientos.stream().map(a -> new AsientoDatos(a.referencia(), a.tipoActo(), a.estado(),
                            a.fechaInscripcion(), a.tituloNumero(), a.fechaPresentacion(), a.texto(),
                            a.canceloNumero(), a.titulares())).toList());
        }
    }

    record CambiarItemRequest(@NotNull EstadoItem estado, @Size(max = 255) String observacion) {}

    // ------------------------------------------------------------- uso interno

    /** Datos del expediente ya sin formato HTTP. Los usan la edición y la carga de contenido. */
    record DatosExpediente(String condicionRepresentada, Completitud completitud, LocalDate fechaReferencial,
            String nota, String zonaRegistral, String oficinaRegistral, String ubicacion, BigDecimal areaM2,
            String linderos, String antecedenteDominial, List<AsientoDatos> asientos) {}

    record AsientoDatos(String referencia, TipoActo tipoActo, EstadoAnotacion estado, LocalDate fechaInscripcion,
            String tituloNumero, LocalDate fechaPresentacion, String texto, String canceloNumero, String titulares) {}
}
