package pe.trustinmuebles.expediente;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import pe.trustinmuebles.clasificacion.EvaluacionDto;
import pe.trustinmuebles.expediente.CasoDtos.DocumentoLoteDto;
import pe.trustinmuebles.expediente.CasoDtos.PredioDto;

/** v1.0 (etapa 3a): respuestas y peticiones de proyectos y lotes de proyecto. */
final class ProyectoDtos {
    private ProyectoDtos() {}

    /** De dónde sale el indicador A que se muestra con un inmueble del catálogo. */
    enum FuenteIndicadorA {
        /** El caso propio del inmueble. */
        PROPIO("Indicador A del inmueble"),
        /** La partida matriz del proyecto: el lote todavía no tiene caso propio. */
        PARTIDA_MATRIZ("Indicador A de la partida matriz del proyecto"),
        /** No hay caso propio ni partida matriz evaluada. */
        SIN_EVALUACION("Sin evaluación documental");

        private final String rotulo;

        FuenteIndicadorA(String rotulo) {
            this.rotulo = rotulo;
        }

        String rotulo() {
            return rotulo;
        }
    }

    record HitoDto(int orden, String nombre, EstadoHito estado, String estadoEtiqueta, LocalDate fecha) {}

    /**
     * Un lote del plano. {@code publicado} es la publicación vigente (marcado como publicado y con autorización); un lote
     * no publicado no muestra su precio. {@code casoCodigo} solo viene si el lote tiene un caso propio publicado: su ficha
     * es la de ese caso.
     */
    record LoteDto(String codigo, String clave, String manzana, int numero, BigDecimal areaM2, BigDecimal precio,
            String moneda, BigDecimal precioPorM2, EstadoComercial estadoComercial, String estadoComercialEtiqueta,
            Independizacion independizacion, String independizacionEtiqueta, String zonificacion, boolean publicado,
            String casoCodigo) {}

    /** Indicador A que acompaña a un lote sin caso propio: el de la partida matriz, rotulado así, o «sin evaluación». */
    record IndicadorADto(FuenteIndicadorA fuente, String rotulo, String casoCodigo, EvaluacionDto evaluacion) {}

    /** Un documento del proyecto (los de su partida matriz). {@code disponible}: hay un PDF que se puede abrir. */
    record DocumentoProyectoDto(pe.trustinmuebles.clasificacion.DocumentoLote tipo, String tipoEtiqueta,
            pe.trustinmuebles.clasificacion.EstadoPlano estado, String resumen, boolean disponible) {}

    record ConteoEstados(int disponibles, int separados, int vendidos) {}

    /** Página pública del proyecto: plano, recorrido, hitos y documentos. */
    record ProyectoPublico(String codigo, String nombre, String distrito, String descripcion, String recorridoUrl,
            List<HitoDto> hitos, List<LoteDto> lotes, ConteoEstados conteo, IndicadorADto indicadorA,
            List<DocumentoProyectoDto> documentos, int inmueblesPublicados, String direccion, String mapaUrl,
            String condicionesPago) {}

    /** Ficha pública de un lote de proyecto sin caso propio. */
    record LotePublico(String codigo, String denominacion, String proyectoCodigo, String proyectoNombre,
            LoteDto lote, PredioDto predio, IndicadorADto indicadorA, String proyectoDireccion, String proyectoMapaUrl) {}

    /** Resumen interno de un proyecto para el equipo. */
    record ResumenProyecto(String codigo, String nombre, String distrito, String casoMatrizCodigo,
            boolean autorizacionVigente, int lotes, int publicados, ConteoEstados conteo, String direccion,
            String mapaUrl, String condicionesPago) {}

    /**
     * v1.0 (etapa 9): datos del proyecto que edita el equipo. Un campo vacío o ausente borra el dato. {@code mapaUrl}
     * debe empezar con https://; {@code condicionesPago} es texto libre de hasta 500 caracteres (sin cálculos).
     */
    record DatosProyectoRequest(String direccion, String mapaUrl, String condicionesPago) {}

    record EstadoLoteRequest(@NotNull EstadoComercial estadoComercial) {}
}
