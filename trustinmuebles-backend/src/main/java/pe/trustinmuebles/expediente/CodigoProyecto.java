package pe.trustinmuebles.expediente;

import java.text.Normalizer;
import java.util.Locale;

/**
 * v1.0 (etapa 3a): código de un proyecto a partir de su nombre: minúsculas, sin tildes y con guiones («Campiña del
 * Olivar» → «campina-del-olivar»). Es el mismo cálculo que hace la migración V19 con los nombres ya cargados, así que un
 * nombre siempre lleva al mismo proyecto.
 */
public final class CodigoProyecto {
    private CodigoProyecto() {}

    public static String de(String nombre) {
        if (nombre == null) return "";
        String sinTildes = Normalizer.normalize(nombre.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        return sinTildes.replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
    }
}
