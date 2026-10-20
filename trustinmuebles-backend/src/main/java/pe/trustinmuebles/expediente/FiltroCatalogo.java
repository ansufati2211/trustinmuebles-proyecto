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
        Boolean riesgoFisicoDetectado) {

    static FiltroCatalogo de(String tipoInmueble, String estado, String estadoTecnico, Boolean riesgoFisicoDetectado) {
        // «INFORME_EMITIDO» es el nombre que usa el catálogo para el estado EMITIDO del indicador B.
        String tecnico = "INFORME_EMITIDO".equalsIgnoreCase(vacio(estadoTecnico)) ? "EMITIDO" : estadoTecnico;
        return new FiltroCatalogo(valor("tipoInmueble", tipoInmueble, TipoInmueble.class),
                valor("estado", estado, EstadoSemaforo.class), valor("estadoTecnico", tecnico, EstadoTecnico.class),
                riesgoFisicoDetectado);
    }

    boolean acepta(ResumenCaso c) {
        return (tipoInmueble == null || c.predio().tipoInmueble() == tipoInmueble)
                && (estado == null || c.estado() == estado)
                && (estadoTecnico == null || c.estadoTecnico() == estadoTecnico)
                && (riesgoFisicoDetectado == null || c.riesgoFisicoDetectado() == riesgoFisicoDetectado);
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
