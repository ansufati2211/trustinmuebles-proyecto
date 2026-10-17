package pe.trustinmuebles.expediente;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import pe.trustinmuebles.clasificacion.EstadoAnotacion;
import pe.trustinmuebles.clasificacion.TipoActo;
import pe.trustinmuebles.expediente.CasoDtos.AsientoDatos;

/**
 * Valida los asientos de una partida y deriva lo que no debe editarse a mano, para que los datos nunca se contradigan:
 * - el estado de un asiento D es CANCELADA si y solo si un asiento E lo cancela;
 * - la titularidad sale del último asiento C.
 * Lanza IllegalArgumentException (400) con un mensaje claro ante cualquier inconsistencia.
 */
final class NormalizadorAsientos {
    static final String TITULARIDAD_DESCONOCIDA = "desconocido";

    record Resultado(List<AsientoDatos> asientos, String titularidad) {}

    private NormalizadorAsientos() {}

    static Resultado normalizar(List<AsientoDatos> entrada) {
        Set<String> numeros = new HashSet<>();
        for (AsientoDatos a : entrada) {
            if (!numeros.add(a.referencia())) {
                throw new IllegalArgumentException("Número de asiento repetido: " + a.referencia());
            }
        }

        Map<String, String> canceladoPor = new HashMap<>();
        for (AsientoDatos a : entrada) {
            char rubro = a.referencia().charAt(0);
            if (rubro == 'C' && esVacio(a.titulares())) {
                throw new IllegalArgumentException("El asiento " + a.referencia() + " debe indicar los titulares.");
            }
            if (rubro == 'D' && a.estado() == null) {
                throw new IllegalArgumentException("El asiento " + a.referencia() + " debe indicar su estado.");
            }
            if (rubro == 'E') {
                if (a.tipoActo() != TipoActo.CANCELACION) {
                    throw new IllegalArgumentException("El asiento " + a.referencia() + " del rubro E debe ser una cancelación.");
                }
                if (esVacio(a.canceloNumero())) {
                    throw new IllegalArgumentException("El asiento " + a.referencia() + " debe indicar qué asiento D cancela.");
                }
                if (!numeros.contains(a.canceloNumero())) {
                    throw new IllegalArgumentException("El asiento " + a.referencia() + " cancela " + a.canceloNumero()
                            + ", que no existe en la partida.");
                }
                if (canceladoPor.put(a.canceloNumero(), a.referencia()) != null) {
                    throw new IllegalArgumentException("El asiento " + a.canceloNumero() + " ya está cancelado por otro asiento.");
                }
            } else if (!esVacio(a.canceloNumero())) {
                throw new IllegalArgumentException("Solo un asiento del rubro E puede cancelar a otro: " + a.referencia());
            }
        }

        List<AsientoDatos> salida = new ArrayList<>();
        for (AsientoDatos a : entrada) {
            char rubro = a.referencia().charAt(0);
            EstadoAnotacion estado = null;
            if (rubro == 'D') {
                if (canceladoPor.containsKey(a.referencia())) {
                    estado = EstadoAnotacion.CANCELADA;
                } else if (a.estado() == EstadoAnotacion.CANCELADA) {
                    throw new IllegalArgumentException("El asiento " + a.referencia() + " figura como cancelado, pero ningún "
                            + "asiento E lo cancela. Registre la cancelación en el rubro E.");
                } else {
                    estado = a.estado();
                }
            }
            salida.add(new AsientoDatos(a.referencia(), a.tipoActo(), estado, a.fechaInscripcion(),
                    vacioANull(a.tituloNumero()), a.fechaPresentacion(), vacioANull(a.texto()),
                    vacioANull(a.canceloNumero()), rubro == 'C' ? a.titulares().trim() : null));
        }
        salida.sort(Comparator.comparing(AsientoDatos::referencia));

        String titularidad = salida.stream().filter(a -> a.referencia().charAt(0) == 'C')
                .reduce((primero, ultimo) -> ultimo).map(AsientoDatos::titulares).orElse(TITULARIDAD_DESCONOCIDA);
        return new Resultado(salida, titularidad);
    }

    private static boolean esVacio(String s) {
        return s == null || s.isBlank();
    }

    private static String vacioANull(String s) {
        return esVacio(s) ? null : s.trim();
    }
}
