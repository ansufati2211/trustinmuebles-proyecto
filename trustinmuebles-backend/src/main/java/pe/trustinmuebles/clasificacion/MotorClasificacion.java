package pe.trustinmuebles.clasificacion;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import pe.trustinmuebles.clasificacion.ResultadoClasificacion.Alerta;
import pe.trustinmuebles.clasificacion.ResultadoClasificacion.Motivo;

/**
 * Motor del semáforo informativo (REQ-F05; RN-02 a RN-06). Lógica pura: sin base de datos ni reloj.
 * Las reglas son un borrador del equipo, pendientes de revisión especializada.
 */
final class MotorClasificacion {
    static final String LIMITE =
            "Resultado informativo sobre los datos registrados en el expediente. No certifica saneamiento ni recomienda comprar.";

    private MotorClasificacion() {}

    static ResultadoClasificacion evaluar(EntradaClasificacion entrada, List<ReglaAplicable> reglas,
            Collection<String> condicionesContempladas, String versionReglas) {
        List<EntradaClasificacion.AnotacionEntrada> anotaciones = entrada.anotaciones() == null ? List.of()
                : entrada.anotaciones();

        // 1. Alertas conocidas: siempre se calculan y siempre se conservan (RN-04).
        List<Alerta> alertas = new ArrayList<>();
        Set<String> aplicadas = new LinkedHashSet<>();
        for (ReglaAplicable regla : reglas) {
            for (Coincidencia c : coincidencias(regla, entrada, anotaciones)) {
                aplicadas.add(regla.codigo());
                alertas.add(new Alerta(regla.codigo(), regla.prioridad(), regla.titulo(), regla.explicacion(),
                        c.referencia(), c.descripcion()));
            }
        }

        // 2. Datos mínimos (RN-02): desconocido no equivale a ausencia de carga.
        List<String> faltantes = new ArrayList<>();
        if (esDesconocido(entrada.condicionRepresentada())) faltantes.add("Condición representada");
        if (esDesconocido(entrada.titularidad())) faltantes.add("Titularidad");
        if (entrada.completitud() != Completitud.COMPLETA) faltantes.add("Completitud del extracto");
        for (EntradaClasificacion.AnotacionEntrada a : anotaciones) {
            if (a.estado() == EstadoAnotacion.DESCONOCIDO) faltantes.add("Estado de la anotación " + a.referencia());
        }
        // Una vivienda necesita al menos los planos de arquitectura y de estructuras para evaluarse.
        if (esVivienda(entrada)) {
            for (Especialidad e : List.of(Especialidad.ARQUITECTURA, Especialidad.ESTRUCTURAS)) {
                if (estadoDe(entrada, e) == EstadoPlano.NO_PRESENTADO) faltantes.add(e.etiqueta());
            }
        }

        Set<String> contempladas = new LinkedHashSet<>();
        for (String c : condicionesContempladas) contempladas.add(normalizar(c));
        boolean condicionNoContemplada = !esDesconocido(entrada.condicionRepresentada())
                && !contempladas.contains(normalizar(entrada.condicionRepresentada()));

        boolean hayPrioritaria = alertas.stream().anyMatch(a -> a.prioridad() == Prioridad.PRIORITARIA);
        boolean hayRevision = alertas.stream().anyMatch(a -> a.prioridad() == Prioridad.REVISION);

        // 3. Precedencia de RN-03 y RN-04.
        EstadoSemaforo estado;
        if (!faltantes.isEmpty()) estado = EstadoSemaforo.GRIS;
        else if (hayPrioritaria) estado = EstadoSemaforo.ROJO;
        else if (hayRevision) estado = EstadoSemaforo.AMARILLO;
        else if (condicionNoContemplada) estado = EstadoSemaforo.GRIS;
        else estado = EstadoSemaforo.VERDE;

        // 4. Explicación visible (PA3): cada estado lleva sus motivos y límites.
        List<Motivo> motivos = new ArrayList<>();
        if (!faltantes.isEmpty()) {
            motivos.add(new Motivo("FALTANTE",
                    "Faltan datos mínimos para evaluar el caso: " + String.join(", ", faltantes) + "."));
        }
        for (Alerta a : alertas) {
            motivos.add(new Motivo("ALERTA", a.titulo() + " (" + a.referencia() + "): " + a.explicacion()));
        }
        if (condicionNoContemplada) {
            motivos.add(new Motivo("CONDICION",
                    "La condición representada del caso no está contemplada por la versión de reglas aplicada."));
        }
        boolean noDescartaOtras = !faltantes.isEmpty();
        if (noDescartaOtras) {
            motivos.add(new Motivo("LIMITE",
                    "Las alertas conocidas se conservan. Con información incompleta no se descartan otras alertas."));
        }
        if (estado == EstadoSemaforo.VERDE) {
            motivos.add(new Motivo("LIMITE", "No se detectaron alertas en los campos evaluados (" + anotaciones.size()
                    + " anotación(es) revisada(s)). Esto no significa saneamiento."));
        }

        return new ResultadoClasificacion(estado, estado.etiqueta(), List.copyOf(motivos), List.copyOf(faltantes),
                List.copyOf(alertas), noDescartaOtras, versionReglas, List.copyOf(aplicadas), LIMITE);
    }

    /** Algo que una regla encontró: a qué se refiere y, si hay, un detalle. */
    private record Coincidencia(String referencia, String descripcion) {}

    private static List<Coincidencia> coincidencias(ReglaAplicable regla, EntradaClasificacion entrada,
            List<EntradaClasificacion.AnotacionEntrada> anotaciones) {
        return switch (regla.tipo()) {
            case ANOTACION_VIGENTE -> anotaciones.stream()
                    .filter(a -> a.estado() == EstadoAnotacion.VIGENTE)
                    .filter(a -> regla.prefijoReferencia() == null
                            || (a.referencia() != null && a.referencia().startsWith(regla.prefijoReferencia())))
                    .filter(a -> regla.tiposActo().isEmpty() || regla.tiposActo().contains(a.tipoActo()))
                    .map(a -> new Coincidencia(a.referencia(), a.descripcion()))
                    .toList();
            case PLANO_NO_PRESENTADO -> !esVivienda(entrada) ? List.of() : List.of(Especialidad.ELECTRICAS,
                            Especialidad.SANITARIAS).stream()
                    .filter(e -> estadoDe(entrada, e) == EstadoPlano.NO_PRESENTADO)
                    .map(e -> new Coincidencia(e.etiqueta(), "No presentado"))
                    .toList();
            case PLANO_OBSERVADO -> !esVivienda(entrada) ? List.of() : entrada.planos().stream()
                    .filter(p -> p.estado() == EstadoPlano.OBSERVADO)
                    .map(p -> new Coincidencia(p.especialidad().etiqueta(), "Observado por el revisor"))
                    .toList();
            case DISCREPANCIA_AREA -> discrepanciaDeArea(entrada);
        };
    }

    /** Contrasta el área del plano arquitectónico con la inscrita. Más de 1 % de diferencia es discrepancia. */
    private static List<Coincidencia> discrepanciaDeArea(EntradaClasificacion entrada) {
        if (!esVivienda(entrada)) return List.of();
        String ref = Especialidad.ARQUITECTURA.etiqueta();
        return entrada.planos().stream()
                .filter(p -> p.especialidad() == Especialidad.ARQUITECTURA && p.areaConstruida() != null
                        && (p.estado() == EstadoPlano.PRESENTADO || p.estado() == EstadoPlano.OBSERVADO))
                .findFirst().map(p -> {
                    BigDecimal inscrita = entrada.areaInscrita();
                    if (inscrita == null || inscrita.signum() <= 0) {
                        return List.of(new Coincidencia(ref, "No consta un área construida inscrita para contrastar"));
                    }
                    BigDecimal diferencia = p.areaConstruida().subtract(inscrita).abs()
                            .divide(inscrita, 6, RoundingMode.HALF_UP);
                    if (diferencia.compareTo(new BigDecimal("0.01")) <= 0) return List.<Coincidencia>of();
                    return List.of(new Coincidencia(ref, "Plano: " + p.areaConstruida().setScale(2, RoundingMode.HALF_UP)
                            + " m²; inscrita: " + inscrita.setScale(2, RoundingMode.HALF_UP) + " m²"));
                }).orElse(List.of());
    }

    private static boolean esVivienda(EntradaClasificacion e) {
        return e.tipoPredio() == TipoPredio.VIVIENDA;
    }

    /** Un plano que no figura se considera no presentado. */
    private static EstadoPlano estadoDe(EntradaClasificacion e, Especialidad esp) {
        if (e.planos() == null) return EstadoPlano.NO_PRESENTADO;
        return e.planos().stream().filter(p -> p.especialidad() == esp).map(EntradaClasificacion.PlanoEntrada::estado)
                .findFirst().orElse(EstadoPlano.NO_PRESENTADO);
    }

    static boolean esDesconocido(String s) {
        String n = normalizar(s);
        return n.isEmpty() || n.equals("desconocido");
    }

    static String normalizar(String s) {
        if (s == null) return "";
        return Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }
}
