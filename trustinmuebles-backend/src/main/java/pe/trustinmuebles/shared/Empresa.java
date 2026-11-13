package pe.trustinmuebles.shared;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.List;
import org.springframework.core.io.ClassPathResource;
import tools.jackson.databind.json.JsonMapper;

/**
 * v1.0 (etapa 8): datos de la inmobiliaria que opera el portal (contenido/empresa.json), autorizados de forma verbal por
 * LedCons el 13/11/2026 (la autorización escrita está pendiente, ver docs/decisiones.md D72). Los usan los PDF (encabezado
 * y autor), el pie del sitio y, si la variable de entorno está vacía, el WhatsApp de contacto. La interfaz tiene una copia
 * idéntica en src/contenido/empresa.json (una prueba compara las dos).
 */
public record Empresa(String nombreComercial, String razonSocial, String ruc, String eslogan, String direccion,
        List<String> telefonos, String whatsapp, String facebook, String logo, String logoPdf, String producto) {

    public static final String RUTA = "contenido/empresa.json";

    private static volatile Empresa datos;

    /** Los datos de la inmobiliaria, leídos una sola vez del contenido. */
    public static Empresa datos() {
        Empresa e = datos;
        if (e == null) {
            synchronized (Empresa.class) {
                if (datos == null) datos = leer();
                e = datos;
            }
        }
        return e;
    }

    /** El logo tal cual (PNG) para los PDF; vacío si el archivo no está. */
    public static byte[] logoPng() {
        try (InputStream in = new ClassPathResource(datos().logoPdf()).getInputStream()) {
            return in.readAllBytes();
        } catch (IOException ex) {
            return new byte[0];
        }
    }

    /** Nombre comercial y eslogan, en mayúsculas, para los encabezados de los PDF. */
    public String encabezado() {
        return (nombreComercial + " · " + eslogan).toUpperCase(java.util.Locale.forLanguageTag("es-PE"));
    }

    private static Empresa leer() {
        try (InputStream in = new ClassPathResource(RUTA).getInputStream()) {
            return JsonMapper.builder().build().readValue(in, Empresa.class);
        } catch (IOException ex) {
            throw new UncheckedIOException("No se pudo leer " + RUTA, ex);
        }
    }
}
