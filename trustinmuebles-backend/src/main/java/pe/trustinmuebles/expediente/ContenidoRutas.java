package pe.trustinmuebles.expediente;

import java.util.List;
import java.util.Map;

/** Forma de contenido/<versión>/rutas.json: borrador del equipo, pendiente de revisión especializada. */
record ContenidoRutas(String version, String estadoRevision, String aviso, String plazoGeneral,
        Map<String, String> criterioEsfuerzo, Map<String, Paso> reglas, Map<String, Paso> faltantes) {

    /** {@code textoFaltante} es el texto del faltante que da gris; con {@code prefijo}, basta con que empiece así. */
    record Paso(String textoFaltante, Boolean prefijo, String titulo, List<String> pasos, String gestiona,
            String documentoRequerido, Esfuerzo esfuerzo, String nota) {
        boolean esPrefijo() {
            return Boolean.TRUE.equals(prefijo);
        }
    }
}
