package pe.trustinmuebles.identidad;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * v1.0 (etapa 9): lectura de la propiedad app.asesores («asesor-01,asesor-02»): los códigos de las cuentas de asesor que
 * el arranque crea si faltan. Sin espacios, en minúsculas y sin repetidos. Un código mal escrito detiene el arranque con
 * un mensaje claro, mejor que crear una cuenta con un nombre raro.
 */
public final class CuentasAsesores {
    /** Minúsculas, dígitos y guiones, de 3 a 40 caracteres (como las demás cuentas). */
    static final Pattern CODIGO = Pattern.compile("[a-z0-9][a-z0-9-]{2,39}");

    private CuentasAsesores() {}

    public static List<String> de(String lista) {
        if (lista == null || lista.isBlank()) return List.of();
        LinkedHashSet<String> salida = new LinkedHashSet<>();
        for (String parte : lista.split(",")) {
            String c = parte.trim().toLowerCase(Locale.ROOT);
            if (c.isEmpty()) continue;
            if (!CODIGO.matcher(c).matches()) {
                throw new IllegalStateException("app.asesores: «" + parte.trim() + "» no es un código de cuenta válido. "
                        + "Usa minúsculas, dígitos y guiones, por ejemplo asesor-02.");
            }
            salida.add(c);
        }
        return List.copyOf(salida);
    }
}
