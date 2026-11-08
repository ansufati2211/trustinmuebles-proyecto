package pe.trustinmuebles.almacenamiento;

import java.time.Instant;

/**
 * Evidencia de un archivo guardado (v0.8): tamaño final y original, si se optimizó, huella SHA-256 del archivo guardado,
 * cuenta que lo subió (null si lo generó el sistema) y fecha.
 */
public record MetadatosArchivo(String id, long tamano, long tamanoOriginal, boolean optimizado, String sha256,
        String subidoPor, Instant creadoEn) {}
