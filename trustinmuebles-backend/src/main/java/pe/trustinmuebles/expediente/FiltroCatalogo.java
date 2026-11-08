package pe.trustinmuebles.expediente;

import java.util.Arrays;
import java.util.stream.Collectors;
import pe.trustinmuebles.clasificacion.EstadoSemaforo;
import pe.trustinmuebles.expediente.CasoDtos.ResumenCaso;
import pe.trustinmuebles.inspeccion.EstadoTecnico;

/**
 * Filtros del catálogo (M13). Cada uno es opcional y se combinan con «y». Un valor desconocido da 400 con la lista de
 * valores válidos, para que un enlace mal copiado no devuelva un catálogo vacío sin explicación.
 */
record FiltroCatalogo(TipoInmueble tipoInmueble, EstadoSemaforo estado, EstadoTecnico estadoTecnico,
        Boolean riesgoFisicoDetectado, String tipoAlerta) {

    /** Sin filtro por tipo de alerta (v0.7). */
    static FiltroCatalogo de(String tipoInmueble, String estado, String estadoTecnico, Boolean riesgoFisicoDetectado) {
        return de(tipoInmueble, estado, estadoTecnico, riesgoFisicoDetectado, null, java.util.Set.of());
    }

    /**
     * v0.8: {@code tipoAlerta} es el código de una regla (RP-01…) o INFORMACION_INSUFICIENTE; debe estar entre los
     * {@code tiposValidos} (400 si no).
     */
    static FiltroCatalogo de(String tipoInmueble, String estado, String estadoTecnico, Boolean riesgoFisicoDetectado,
            String tipoAlerta, java.util.Set<String> tiposValidos) {
        String tipo = vacio(tipoAlerta) == null ? null : vacio(tipoAlerta).toUpperCase();
        if (tipo != null && !tiposValidos.contains(tipo)) {
            throw new IllegalArgumentException("tipoAlerta: valor no válido «" + tipoAlerta + "». Usa uno de: "
                    + String.join(", ", new java.util.TreeSet<>(tiposValidos)));
        }
        // «INFORME_EMITIDO» es el nombre que usa el catálogo para el estado EMITIDO del indicador B.
        String tecnico = "INFORME_EMITIDO".equalsIgnoreCase(vacio(estadoTecnico)) ? "EMITIDO" : estadoTecnico;
        return new FiltroCatalogo(valor("tipoInmueble", tipoInmueble, TipoInmueble.class),
                valor("estado", estado, EstadoSemaforo.class), valor("estadoTecnico", tecnico, EstadoTecnico.class),
                riesgoFisicoDetectado, tipo);
    }

    boolean acepta(ResumenCaso c) {
        return (tipoInmueble == null || c.predio().tipoInmueble() == tipoInmueble)
                && (estado == null || c.estado() == estado)
                && (estadoTecnico == null || c.estadoTecnico() == estadoTecnico)
                && (riesgoFisicoDetectado == null || c.riesgoFisicoDetectado() == riesgoFisicoDetectado)
                && (tipoAlerta == null || c.tiposAlerta().contains(tipoAlerta));
    }

    private static <E extends Enum<E>> E valor(String parametro, String texto, Class<E> tipo) {
        String v = vacio(texto);
        if (v == null) return null;
        try {
            return Enum.valueOf(tipo, v.toUpperCase());
        } catch (IllegalArgumentException ex) {
            String validos = Arrays.stream(tipo.getEnumConstants()).map(Enum::name).collect(Collectors.joining(", "));
            throw new IllegalArgumentException(parametro + ": valor no válido «" + v + "». Usa uno de: " + validos);
        }
    }

    private static String vacio(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
