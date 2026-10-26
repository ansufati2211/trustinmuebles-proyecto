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
import pe.trustinmuebles.clasificacion.Especialidad;
import pe.trustinmuebles.clasificacion.EstadoPlano;
import pe.trustinmuebles.clasificacion.TipoPredio;
import pe.trustinmuebles.inspeccion.EstadoTecnico;
import pe.trustinmuebles.inspeccion.EvaluacionTecnicaDto;
import pe.trustinmuebles.inspeccion.InformeDatos;
import pe.trustinmuebles.inspeccion.ResultadoTecnico;
import pe.trustinmuebles.inspeccion.VerificacionCampo;
import pe.trustinmuebles.clasificacion.TipoActo;
import pe.trustinmuebles.orientacion.TerminoDto;

final class CasoDtos {
    private CasoDtos() {}

    // ---------------------------------------------------------------- respuestas

    record ResumenCaso(String codigo, String denominacion, String contexto, EstadoSemaforo estado, String etiqueta,
            long pendientes, String origen, String fuente, LocalDate fechaConsulta,
            EstadoTecnico estadoTecnico, ResultadoTecnico resultadoTecnico, boolean riesgoFisicoDetectado,
            PredioDto predio, EstadoPublicacion estadoPublicacion) {}

    /**
     * Captación y publicación (v0.7). El propietario se identifica solo por su código de cuenta (I11), que no se
     * muestra al comprador. {@code autorizada} es verdadero si hay una autorización vigente.
     */
    record PublicacionDto(EstadoPublicacion estado, String propietarioCodigo, boolean autorizada,
            java.time.Instant autorizacionFecha) {}

    /**
     * Datos del predio para el catálogo. El área es la del terreno inscrita en la partida y el precio es referencial
     * e informativo (en soles); ninguno de los dos interviene en el semáforo.
     */
    record PredioDto(TipoInmueble tipoInmueble, String tipoInmuebleEtiqueta, String distrito, BigDecimal areaM2,
            BigDecimal areaConstruidaInscrita, BigDecimal precioReferencial, String moneda, String precioNota) {}

    record AsientoDto(String referencia, String rubro, TipoActo tipoActo, String tipoActoEtiqueta,
            EstadoAnotacion estado, LocalDate fechaInscripcion, String tituloNumero, LocalDate fechaPresentacion,
            String texto, String canceloNumero, String titulares) {}

    /** Un plano del expediente técnico. {@code coincideArea} solo se calcula en el plano arquitectónico. */
    record PlanoDto(Especialidad especialidad, String especialidadEtiqueta, EstadoPlano estado, BigDecimal areaConstruida,
            SistemaConstructivo sistemaConstructivo, String sistemaConstructivoEtiqueta, String observacion,
            boolean tieneDocumentoPropio, Boolean coincideArea) {}

    record ExpedienteDto(Long version, String condicionRepresentada, String titularidad, Completitud completitud,
            LocalDate fechaReferencial, String nota, String zonaRegistral, String oficinaRegistral, String ubicacion,
            BigDecimal areaM2, String linderos, String antecedenteDominial, boolean tieneDocumento,
            boolean documentoGenerado, List<AsientoDto> asientos, TipoPredio tipoPredio,
            BigDecimal areaConstruidaInscrita, List<PlanoDto> planos) {}

    record DetalleCaso(String codigo, String denominacion, String contexto, boolean sintetico, String origen,
            String fuente, LocalDate fechaConsulta, ExpedienteDto expediente, EvaluacionDto evaluacion,
            EvaluacionTecnicaDto evaluacionTecnica, List<ItemChecklistDto> checklist, List<TerminoDto> terminos,
            PredioDto predio, PublicacionDto publicacion) {}

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

    /** Un plano del expediente técnico, tal como lo registra el revisor. */
    record PlanoRequest(
            @NotNull Especialidad especialidad,
            @NotNull EstadoPlano estado,
            @DecimalMin("0.01") @Digits(integer = 8, fraction = 2) BigDecimal areaConstruida,
            SistemaConstructivo sistemaConstructivo,
            @Size(max = 500) String observacion) {}

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
            /* Bloque técnico. Si tipoPredio no viene, el tipo, el área inscrita y los planos quedan como estaban. */
            TipoPredio tipoPredio,
            @DecimalMin("0.01") @Digits(integer = 8, fraction = 2) BigDecimal areaConstruidaInscrita,
            @Size(max = 4) List<@Valid @NotNull PlanoRequest> planos,
            @NotNull Long versionEsperada) {

        DatosExpediente datos() {
            return new DatosExpediente(condicionRepresentada, completitud, fechaReferencial, nota, zonaRegistral,
                    oficinaRegistral, ubicacion, areaM2, linderos, antecedenteDominial,
                    asientos.stream().map(a -> new AsientoDatos(a.referencia(), a.tipoActo(), a.estado(),
                            a.fechaInscripcion(), a.tituloNumero(), a.fechaPresentacion(), a.texto(),
                            a.canceloNumero(), a.titulares())).toList(),
                    tipoPredio, areaConstruidaInscrita, planosDatos(planos));
        }
    }

    static List<PlanoDatos> planosDatos(List<PlanoRequest> planos) {
        return planos == null ? null : planos.stream().map(p -> new PlanoDatos(p.especialidad(), p.estado(),
                p.areaConstruida(), p.sistemaConstructivo(), p.observacion())).toList();
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
            TipoPredio tipoPredio,
            @DecimalMin("0.01") @Digits(integer = 8, fraction = 2) BigDecimal areaConstruidaInscrita,
            @Size(max = 4) List<@Valid @NotNull PlanoRequest> planos,
            @NotNull Boolean confirmaSinDatosPersonales,
            /* v0.7: cuenta PROPIETARIO del caso. El caso nace en BORRADOR y sin autorización. */
            @NotBlank @Size(max = 40) String propietarioCodigo) {

        DatosExpediente datos() {
            return new DatosExpediente(condicionRepresentada, completitud, fechaConsulta, nota, zonaRegistral,
                    oficinaRegistral, ubicacion, areaM2, linderos, antecedenteDominial,
                    asientos.stream().map(a -> new AsientoDatos(a.referencia(), a.tipoActo(), a.estado(),
                            a.fechaInscripcion(), a.tituloNumero(), a.fechaPresentacion(), a.texto(),
                            a.canceloNumero(), a.titulares())).toList(),
                    tipoPredio, areaConstruidaInscrita, planosDatos(planos));
        }
    }

    /**
     * Informe técnico del especialista. Si el estado es EMITIDO, exige conclusión y verificación de las 4 especialidades.
     * No lleva nombre, especialidad ni colegiatura: el servidor los toma de la cuenta autenticada y, si el cliente los
     * envía, se ignoran (M8).
     */
    record InformeRequest(
            @NotNull EstadoTecnico estado,
            ResultadoTecnico resultado,
            LocalDate fechaInspeccion,
            VerificacionCampo verifArquitectura,
            VerificacionCampo verifEstructuras,
            VerificacionCampo verifElectricas,
            VerificacionCampo verifSanitarias,
            @Size(max = 1500) String observaciones,
            @Size(max = 1500) String conclusiones,
            @Size(max = 1000) String estudiosAdicionales) {

        InformeDatos datos() {
            return new InformeDatos(estado, resultado, fechaInspeccion, verifArquitectura, verifEstructuras,
                    verifElectricas, verifSanitarias, observaciones, conclusiones, estudiosAdicionales);
        }
    }

    /** v0.7: el especialista va por su código de cuenta; su firma sale de esa cuenta, no de la petición. */
    record AsignarEspecialistaRequest(@NotBlank @Size(max = 40) String especialistaCodigo) {}

    record CambiarItemRequest(@NotNull EstadoItem estado, @Size(max = 255) String observacion) {}

    // ------------------------------------------------------------- uso interno

    /** Datos del expediente ya sin formato HTTP. Los usan la edición y la carga de contenido. */
    record DatosExpediente(String condicionRepresentada, Completitud completitud, LocalDate fechaReferencial,
            String nota, String zonaRegistral, String oficinaRegistral, String ubicacion, BigDecimal areaM2,
            String linderos, String antecedenteDominial, List<AsientoDatos> asientos,
            /* Bloque técnico: null en tipoPredio significa «no tocar lo que ya hay». */
            TipoPredio tipoPredio, BigDecimal areaConstruidaInscrita, List<PlanoDatos> planos) {}

    record PlanoDatos(Especialidad especialidad, EstadoPlano estado, BigDecimal areaConstruida,
            SistemaConstructivo sistemaConstructivo, String observacion) {}

    record AsientoDatos(String referencia, TipoActo tipoActo, EstadoAnotacion estado, LocalDate fechaInscripcion,
            String tituloNumero, LocalDate fechaPresentacion, String texto, String canceloNumero, String titulares) {}
}
