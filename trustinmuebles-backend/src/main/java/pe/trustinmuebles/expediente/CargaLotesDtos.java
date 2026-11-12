package pe.trustinmuebles.expediente;

import java.time.Instant;
import java.util.List;

/** v1.0 (etapa 3b): respuestas de la carga masiva de lotes. */
final class CargaLotesDtos {
    private CargaLotesDtos() {}

    /**
     * Una fila del archivo. {@code accion}: NUEVO, ACTUALIZA, SIN_CAMBIOS o ERROR. {@code fila} es la línea del archivo (el
     * encabezado es la 1). {@code cambios} dice qué se crearía o cambiaría; {@code errores}, qué hay que corregir.
     */
    record FilaCarga(int fila, String manzana, Integer lote, String clave, String accion, List<String> cambios,
            List<String> errores) {}

    /** Vista previa del archivo entero. {@code valida}: se puede confirmar (sin ningún error). No guarda nada. */
    record VistaPreviaCarga(String proyectoCodigo, long bytes, int totalFilas, int nuevas, int actualizadas,
            int sinCambios, int conErrores, List<String> erroresGenerales, boolean valida, List<FilaCarga> filas) {}

    record ResultadoCarga(String cargaId, String proyectoCodigo, int creados, int actualizados, int sinCambios) {}

    record HistorialLoteDto(String accion, String origen, String cambios, String cargaId, String cuentaCodigo,
            Instant registradaEn) {}
}
