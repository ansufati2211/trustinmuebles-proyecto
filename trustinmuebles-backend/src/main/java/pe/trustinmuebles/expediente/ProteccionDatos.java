package pe.trustinmuebles.expediente;

import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Última barrera contra datos personales en una partida transcrita (Ley 29733, art. 11.3 y 133.7 del reglamento).
 * El navegador ya sustituye los nombres; aquí solo se rechazan los datos que se reconocen sin ambigüedad.
 * No intenta detectar nombres: eso corresponde a la limpieza del formulario y a la confirmación del revisor.
 */
final class ProteccionDatos {
    private ProteccionDatos() {}

    private static final Pattern DNI = Pattern.compile(
            "(?i)(\\bd\\.?n\\.?i\\b|documento\\s+nacional\\s+de\\s+identidad|identificad[oa]\\s+con)[^0-9]{0,30}\\d{8}");
    private static final Pattern ESTADO_CIVIL = Pattern.compile("(?i)estado\\s+civil");
    private static final Pattern DOMICILIO = Pattern.compile("(?i)con\\s+domicilio\\s+(real\\s+)?en\\b(?!\\s*\\[)");

    /** Forma jurídica o tipo de entidad que identifica a una persona jurídica en el nombre de un acreedor. */
    private static final Pattern PERSONA_JURIDICA = Pattern.compile("(?iu)(\\bs\\.?\\s?a\\.?(\\s?[ac]\\.?)?(?=\\s|$|,|\\))"
            + "|\\bs\\.?\\s?r\\.?\\s?l\\.?|\\be\\.?\\s?i\\.?\\s?r\\.?\\s?l\\.?|\\bbanco\\b|\\bcaja\\b|\\bcooperativa\\b"
            + "|\\bfinanciera\\b|\\bedpyme\\b|\\bfondo\\b|\\bmunicipalidad\\b|\\bgobierno\\b|\\bministerio\\b"
            + "|\\bsociedad\\b|\\bcorporaci[oó]n\\b|\\bempresa\\b|\\basociaci[oó]n\\b|\\bfundaci[oó]n\\b|\\bmivivienda\\b)");

    /**
     * v0.8: el acreedor de un gravamen solo se registra si es una persona jurídica (por ejemplo, «Banco Demo S.A.») o
     * como «no consta». Una persona natural no se guarda (I11). Vacío es válido: el campo es opcional.
     */
    static void verificarAcreedor(String acreedor) {
        if (acreedor == null || acreedor.isBlank()) return;
        String a = acreedor.trim();
        if (a.equalsIgnoreCase("no consta") || PERSONA_JURIDICA.matcher(a).find()) return;
        throw new IllegalArgumentException("acreedor: indica una persona jurídica (por ejemplo, «Banco Demo S.A.» o "
                + "«Caja Municipal …») o «no consta». No se registran personas naturales");
    }

    /** Lanza IllegalArgumentException (400) si algún texto contiene un dato personal reconocible. */
    static void verificar(Stream<String> textos) {
        textos.filter(t -> t != null && !t.isBlank()).forEach(t -> {
            if (DNI.matcher(t).find()) {
                throw new IllegalArgumentException(
                        "El texto contiene un número de DNI. Omítelo: una partida transcrita no guarda datos personales");
            }
            if (ESTADO_CIVIL.matcher(t).find()) {
                throw new IllegalArgumentException(
                        "El texto menciona el estado civil de una persona. Omítelo: una partida transcrita no guarda datos personales");
            }
            if (DOMICILIO.matcher(t).find()) {
                throw new IllegalArgumentException(
                        "El texto contiene un domicilio. Omítelo o reemplázalo por «[domicilio omitido]»");
            }
        });
    }
}
