package pe.trustinmuebles.expediente;

import java.text.Normalizer;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * v2.0 (tanda 1, RF49): posición de un lote dentro de la lotización. Un lote puede tener más de una (una esquina frente al
 * parque). Se guarda como códigos separados por «+» («ESQUINA+PARQUE»); sin dato es null. Es informativo: no interviene
 * en el indicador A ni en ninguna regla.
 */
enum PosicionLote {
    ESQUINA("Esquina"), PARQUE("Frente al parque"), AVENIDA("Frente a avenida");

    private final String etiqueta;

    PosicionLote(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    String etiqueta() {
        return etiqueta;
    }

    /** Un código o una forma de escribirlo («frente al parque», «Esquina», «avenida»); null si no se reconoce. */
    static PosicionLote de(String texto) {
        String t = Normalizer.normalize(texto == null ? "" : texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT).trim().replaceAll("\\s+", " ");
        return switch (t) {
            case "esquina" -> ESQUINA;
            case "parque", "frente al parque", "frente a parque" -> PARQUE;
            case "avenida", "frente a avenida", "frente a la avenida" -> AVENIDA;
            default -> null;
        };
    }

    /**
     * Las posiciones de un texto, separadas por alguno de los caracteres de {@code separadores}. Una no válida da
     * {@link IllegalArgumentException}; un texto vacío da un conjunto vacío.
     */
    static Set<PosicionLote> leer(String texto, String separadores) {
        Set<PosicionLote> s = EnumSet.noneOf(PosicionLote.class);
        if (texto == null || texto.isBlank()) return s;
        for (String parte : texto.split("[" + separadores + "]")) {
            if (parte.isBlank()) continue;
            PosicionLote p = de(parte);
            if (p == null) {
                throw new IllegalArgumentException("«" + parte.trim() + "» no es una posición. Usa: esquina, parque o avenida.");
            }
            s.add(p);
        }
        return s;
    }

    /** El valor que se guarda: códigos en orden fijo separados por «+»; null si no hay ninguno. */
    static String codificar(Set<PosicionLote> s) {
        if (s == null || s.isEmpty()) return null;
        return EnumSet.copyOf(s).stream().map(Enum::name).collect(Collectors.joining("+"));
    }

    static Set<PosicionLote> decodificar(String guardado) {
        Set<PosicionLote> s = new LinkedHashSet<>();
        if (guardado == null || guardado.isBlank()) return s;
        for (String c : guardado.split("\\+")) {
            try {
                s.add(valueOf(c.trim()));
            } catch (IllegalArgumentException ignorada) {
                // un código desconocido no rompe el catálogo: se ignora
            }
        }
        return s;
    }
}
