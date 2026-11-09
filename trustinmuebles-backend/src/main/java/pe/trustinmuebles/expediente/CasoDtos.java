package pe.trustinmuebles.expediente;

import com.fasterxml.jackson.annotation.JsonInclude;
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
import pe.trustinmuebles.clasificacion.DocumentoLote;
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
            /* v0.9: enlace a la publicación oficial (por ejemplo, la subasta de la SBN); null en los demás casos. */
            String fuenteUrl,
            EstadoTecnico estadoTecnico, ResultadoTecnico resultadoTecnico, boolean riesgoFisicoDetectado,
            PredioDto predio, EstadoPublicacion estadoPublicacion,
            /* v0.8: códigos de las reglas aplicadas y, si el caso es gris, INFORMACION_INSUFICIENTE. */
            List<String> tiposAlerta,
            /* v0.8 (I15): semáforo de gestión; solo para GESTOR y REVISOR. Para los demás no viene en la respuesta. */
            @JsonInclude(JsonInclude.Include.NON_NULL) GestionInmobiliaria gestion) {}

    /**
     * Captación y publicación (v0.7). El propietario se identifica solo por su código de cuenta (I11), que no se
     * muestra al comprador. {@code autorizada} es verdadero si hay una autorización vigente.
     */
    record PublicacionDto(EstadoPublicacion estado, String propietarioCodigo, boolean autorizada,
            java.time.Instant autorizacionFecha) {}

    /**
     * Datos del predio para el catálogo. El área es la del terreno inscrita en la partida y el precio es referencial
     * e informativo (en soles o, v0.9, en dólares); ninguno de los dos interviene en el semáforo.
     */
    record PredioDto(TipoInmueble tipoInmueble, String tipoInmuebleEtiqueta, String distrito, BigDecimal areaM2,
            BigDecimal areaConstruidaInscrita, BigDecimal precioReferencial, String moneda, String precioNota) {}

    record AsientoDto(String referencia, String rubro, TipoActo tipoActo, String tipoActoEtiqueta,
            EstadoAnotacion estado, LocalDate fechaInscripcion, String tituloNumero, LocalDate fechaPresentacion,
            String texto, String canceloNumero, String titulares, String acreedor, String plazoOVencimiento) {}

    /** Un plano del expediente técnico. {@code coincideArea} solo se calcula en el plano arquitectónico. */
    record PlanoDto(Especialidad especialidad, String especialidadEtiqueta, EstadoPlano estado, BigDecimal areaConstruida,
            SistemaConstructivo sistemaConstructivo, String sistemaConstructivoEtiqueta, String observacion,
            boolean tieneDocumentoPropio, DocumentoInfoDto documento, Boolean coincideArea) {}

    /**
     * v0.9: un documento del expediente de un lote. Siempre vienen los cuatro; el que no se registró sale como no
     * presentado. {@code documento} es null si no hay archivo que mostrar.
     */
    record DocumentoLoteDto(DocumentoLote tipo, String tipoEtiqueta, EstadoPlano estado, String observacion,
            String resumen, boolean tieneDocumentoPropio, DocumentoInfoDto documento) {}

    /**
     * v0.8: de dónde sale el PDF de un plano o del caso. origen: SUBIDO (con su evidencia), GENERADO (lámina o copia
     * que arma el sistema a partir de la transcripción; no es un documento oficial) o FALTA (no hay archivo).
     */
    record DocumentoInfoDto(String origen, String subidoPor, java.time.Instant subidoEn, Long tamanoBytes,
            Long tamanoOriginalBytes, boolean optimizado, String sha256) {
        static DocumentoInfoDto generado() {
            return new DocumentoInfoDto("GENERADO", null, null, null, null, false, null);
        }

        static DocumentoInfoDto falta() {
            return new DocumentoInfoDto("FALTA", null, null, null, null, false, null);
        }

        static DocumentoInfoDto subido(pe.trustinmuebles.almacenamiento.MetadatosArchivo m) {
            return new DocumentoInfoDto("SUBIDO", m.subidoPor(), m.creadoEn(), m.tamano(), m.tamanoOriginal(),
                    m.optimizado(), m.sha256());
        }
    }

    record ExpedienteDto(Long version, String condicionRepresentada, String titularidad, Completitud completitud,
            LocalDate fechaReferencial, String nota, String zonaRegistral, String oficinaRegistral, String ubicacion,
            BigDecimal areaM2, String linderos, String antecedenteDominial, boolean tieneDocumento,
            boolean documentoGenerado, DocumentoInfoDto documento, List<AsientoDto> asientos, TipoPredio tipoPredio,
            BigDecimal areaConstruidaInscrita, List<PlanoDto> planos,
            /* v0.9: vacío si el predio no es un lote. */
            List<DocumentoLoteDto> documentosLote) {}

    record DetalleCaso(String codigo, String denominacion, String contexto, boolean sintetico, String origen,
            String fuente, LocalDate fechaConsulta, String fuenteUrl, ExpedienteDto expediente, EvaluacionDto evaluacion,
            EvaluacionTecnicaDto evaluacionTecnica, List<ItemChecklistDto> checklist, List<TerminoDto> terminos,
            PredioDto predio, PublicacionDto publicacion,
            /* v0.8 (I15): solo para GESTOR y REVISOR; para los demás roles el campo no viene en la respuesta. */
            @JsonInclude(JsonInclude.Include.NON_NULL) GestionInmobiliaria gestion) {}

    /** Respuesta de una subida (v0.8): huella del archivo guardado, tamaño recibido y guardado, y si se optimizó. */
    record DocumentoDto(String codigo, String sha256, long tamanoOriginalBytes, long tamanoBytes, boolean optimizado) {
        static DocumentoDto de(String codigo, String sha256, pe.trustinmuebles.almacenamiento.PdfPreparado pdf) {
            return new DocumentoDto(codigo, sha256, pdf.tamanoOriginal(), pdf.datos().length, pdf.optimizado());
        }
    }

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
            @Size(max = 500) String titulares,
            /* v0.8: solo en el rubro D; opcionales y fuera del cálculo del color. */
            @Size(max = 120) String acreedor,
            @Size(max = 120) String plazoOVencimiento) {}

    /** Un plano del expediente técnico, tal como lo registra el revisor. */
    record PlanoRequest(
            @NotNull Especialidad especialidad,
            @NotNull EstadoPlano estado,
            @DecimalMin("0.01") @Digits(integer = 8, fraction = 2) BigDecimal areaConstruida,
            SistemaConstructivo sistemaConstructivo,
            @Size(max = 500) String observacion) {}

    /** v0.9: un documento del lote, tal como lo registra el revisor. «Presentado» u «observado» exige su PDF. */
    record DocumentoLoteRequest(
            @NotNull DocumentoLote tipo,
            @NotNull EstadoPlano estado,
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
            /* v0.9: documentos del lote. Si no vienen, quedan como estaban. */
            @Size(max = 4) List<@Valid @NotNull DocumentoLoteRequest> documentosLote,
            @NotNull Long versionEsperada) {

        DatosExpediente datos() {
            return new DatosExpediente(condicionRepresentada, completitud, fechaReferencial, nota, zonaRegistral,
                    oficinaRegistral, ubicacion, areaM2, linderos, antecedenteDominial,
                    asientos.stream().map(a -> new AsientoDatos(a.referencia(), a.tipoActo(), a.estado(),
                            a.fechaInscripcion(), a.tituloNumero(), a.fechaPresentacion(), a.texto(),
                            a.canceloNumero(), a.titulares(), a.acreedor(), a.plazoOVencimiento())).toList(),
                    tipoPredio, areaConstruidaInscrita, planosDatos(planos), documentosLote == null ? null
                            : documentosLote.stream().map(x -> new DocumentoLoteDatos(x.tipo(), x.estado(),
                                    x.observacion(), null)).toList());
        }
    }

    static List<PlanoDatos> planosDatos(List<PlanoRequest> planos) {
        return planos == null ? null : planos.stream().map(p -> new PlanoDatos(p.especialidad(), p.estado(),
                p.areaConstruida(), p.sistemaConstructivo(), p.observacion())).toList();
    }

    /** Captación de una partida. El servicio comprueba que el prefijo SIM- del número corresponda a su origen. */
    record RegistrarPartidaRequest(
            @NotNull OrigenCaptacion origen,
            @NotBlank @Pattern(regexp = "SIM-[0-9]{8}|[A-Z]?[0-9]{8}", message = "debe tener ocho dígitos, con una letra inicial opcional (por ejemplo 11012345 o P07044600), o el prefijo SIM- si es simulada") String numero,
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
            @NotBlank @Size(max = 40) String propietarioCodigo,
            /* Opcional, en soles. Es informativo y no interviene en el semáforo. */
            @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal precioReferencial) {

        DatosExpediente datos() {
            return new DatosExpediente(condicionRepresentada, completitud, fechaConsulta, nota, zonaRegistral,
                    oficinaRegistral, ubicacion, areaM2, linderos, antecedenteDominial,
                    asientos.stream().map(a -> new AsientoDatos(a.referencia(), a.tipoActo(), a.estado(),
                            a.fechaInscripcion(), a.tituloNumero(), a.fechaPresentacion(), a.texto(),
                            a.canceloNumero(), a.titulares(), a.acreedor(), a.plazoOVencimiento())).toList(),
                    tipoPredio, areaConstruidaInscrita, planosDatos(planos), null);
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
            TipoPredio tipoPredio, BigDecimal areaConstruidaInscrita, List<PlanoDatos> planos,
            /* v0.9: null significa «no tocar los documentos del lote». */
            List<DocumentoLoteDatos> documentosLote) {}

    /** v0.9: un documento del lote. El resumen solo lo trae la carga de contenido. */
    record DocumentoLoteDatos(DocumentoLote tipo, EstadoPlano estado, String observacion, String resumen) {}

    record PlanoDatos(Especialidad especialidad, EstadoPlano estado, BigDecimal areaConstruida,
            SistemaConstructivo sistemaConstructivo, String observacion) {}

    record AsientoDatos(String referencia, TipoActo tipoActo, EstadoAnotacion estado, LocalDate fechaInscripcion,
            String tituloNumero, LocalDate fechaPresentacion, String texto, String canceloNumero, String titulares,
            String acreedor, String plazoOVencimiento) {

        /** Sin acreedor ni plazo (contenido anterior a la v0.8). */
        AsientoDatos(String referencia, TipoActo tipoActo, EstadoAnotacion estado, LocalDate fechaInscripcion,
                String tituloNumero, LocalDate fechaPresentacion, String texto, String canceloNumero, String titulares) {
            this(referencia, tipoActo, estado, fechaInscripcion, tituloNumero, fechaPresentacion, texto, canceloNumero,
                    titulares, null, null);
        }
    }
}
