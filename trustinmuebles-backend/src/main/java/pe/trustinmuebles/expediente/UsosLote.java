package pe.trustinmuebles.expediente;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.core.io.ClassPathResource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * v1.0 (etapa 6): la guía de usos del lote (contenido/usos-lote.json, la misma que usa la interfaz; una prueba exige que
 * las dos copias sean iguales) para filtrar el catálogo por zonificación y por uso. Es orientativa: no interviene en el
 * indicador A ni en ninguna regla.
 */
final class UsosLote {
    enum Categoria { CASA, NEGOCIO, ALQUILAR, ALMACEN }

    record Uso(Categoria categoria, String texto, BigDecimal areaMinimaM2) {}

    record Zona(String codigo, String nombre, List<String> alias, List<Uso> usos) {}

    static final List<Zona> ZONAS = leer();

    private UsosLote() {}

    /** «RDM», «rdm», «RDM-1» o «R4» llevan a la misma zona; null si no hay zonificación o no está en la guía. */
    static Zona buscar(String zonificacion) {
        if (zonificacion == null) return null;
        String z = zonificacion.trim().toUpperCase(Locale.ROOT).replaceAll("\s+", "");
        if (z.isEmpty()) return null;
        String base = z.split("[-/(]")[0];
        for (Zona zona : ZONAS) {
            if (zona.codigo().equals(z) || zona.codigo().equals(base) || zona.alias().contains(z)
                    || zona.alias().contains(base)) return zona;
        }
        return null;
    }

    /** ¿La zona suele permitir ese uso con esa área? Sin área conocida, basta con que la zona lo contemple. */
    static boolean permite(Zona zona, Categoria categoria, BigDecimal areaM2) {
        for (Uso u : zona.usos()) {
            if (u.categoria() == categoria) return areaM2 == null || areaM2.compareTo(u.areaMinimaM2()) >= 0;
        }
        return false;
    }

    static List<String> codigos() {
        return ZONAS.stream().map(Zona::codigo).toList();
    }

    private static List<Zona> leer() {
        try (InputStream in = new ClassPathResource("contenido/usos-lote.json").getInputStream()) {
            JsonNode raiz = new ObjectMapper().readTree(in);
            List<Zona> zonas = new ArrayList<>();
            for (JsonNode z : raiz.get("zonas")) {
                List<String> alias = new ArrayList<>();
                for (JsonNode a : z.get("alias")) alias.add(a.asString());
                List<Uso> usos = new ArrayList<>();
                for (JsonNode u : z.get("usos")) {
                    usos.add(new Uso(Categoria.valueOf(u.get("categoria").asString()), u.get("texto").asString(),
                            u.get("areaMinimaM2").decimalValue()));
                }
                zonas.add(new Zona(z.get("codigo").asString(), z.get("nombre").asString(), List.copyOf(alias),
                        List.copyOf(usos)));
            }
            return List.copyOf(zonas);
        } catch (IOException ex) {
            throw new UncheckedIOException("No se pudo leer contenido/usos-lote.json", ex);
        }
    }
}
