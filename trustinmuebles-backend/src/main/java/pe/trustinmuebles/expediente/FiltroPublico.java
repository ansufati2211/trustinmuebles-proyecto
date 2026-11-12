package pe.trustinmuebles.expediente;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Locale;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import pe.trustinmuebles.clasificacion.EstadoSemaforo;
import pe.trustinmuebles.expediente.CasoDtos.PredioDto;

/**
 * v1.0 (etapa 2): filtros y orden del catálogo público. Todos son opcionales y se combinan con «y». Un valor no válido
 * da 400 con los valores aceptados. Los precios se comparan en una sola moneda: la indicada, o soles si se filtra por
 * precio sin indicarla; un inmueble sin precio o sin área nunca cumple un filtro numérico y va al final del orden.
 */
record FiltroPublico(String proyecto, String distrito, TipoInmueble tipo, EstadoComercial estadoComercial,
        String moneda, BigDecimal precioMin, BigDecimal precioMax, BigDecimal precioM2Min, BigDecimal precioM2Max,
        BigDecimal areaMin, BigDecimal areaMax, EstadoSemaforo indicadorA, String tipoAlerta, Orden orden,
        boolean descendente, Clase clase) {

    enum Orden { NOVEDAD, PRECIO, PRECIO_M2, AREA }

    /** v1.0 (etapa 3a): el catálogo une casos y lotes de proyecto sin caso propio; {@code clase} limita a unos u otros. */
    enum Clase { CASO, LOTE_PROYECTO }

    static final Set<String> MONEDAS = Set.of("PEN", "USD");

    static FiltroPublico de(String proyecto, String distrito, String tipo, String estadoComercial, String moneda,
            String precioMin, String precioMax, String precioM2Min, String precioM2Max, String areaMin, String areaMax,
            String indicadorA, String tipoAlerta, String orden, String sentido, Set<String> tiposAlertaValidos) {
        return de(proyecto, distrito, tipo, estadoComercial, moneda, precioMin, precioMax, precioM2Min, precioM2Max,
                areaMin, areaMax, indicadorA, tipoAlerta, orden, sentido, null, tiposAlertaValidos);
    }

    /** v1.0 (etapa 3a): con {@code clase} (CASO o LOTE_PROYECTO); sin ella, el catálogo completo. */
    static FiltroPublico de(String proyecto, String distrito, String tipo, String estadoComercial, String moneda,
            String precioMin, String precioMax, String precioM2Min, String precioM2Max, String areaMin, String areaMax,
            String indicadorA, String tipoAlerta, String orden, String sentido, String clase,
            Set<String> tiposAlertaValidos) {
        String alerta = vacio(tipoAlerta) == null ? null : vacio(tipoAlerta).toUpperCase(Locale.ROOT);
        if (alerta != null && !tiposAlertaValidos.contains(alerta)) {
            throw new IllegalArgumentException("tipoAlerta: valor no válido «" + tipoAlerta + "». Usa uno de: "
                    + String.join(", ", new java.util.TreeSet<>(tiposAlertaValidos)));
        }
        String mon = vacio(moneda) == null ? null : vacio(moneda).toUpperCase(Locale.ROOT);
        if (mon != null && !MONEDAS.contains(mon)) {
            throw new IllegalArgumentException("moneda: valor no válido «" + moneda + "». Usa uno de: PEN, USD");
        }
        BigDecimal pMin = numero("precioMin", precioMin), pMax = numero("precioMax", precioMax);
        BigDecimal mMin = numero("precioM2Min", precioM2Min), mMax = numero("precioM2Max", precioM2Max);
        BigDecimal aMin = numero("areaMin", areaMin), aMax = numero("areaMax", areaMax);
        rango("precioMin", pMin, "precioMax", pMax);
        rango("precioM2Min", mMin, "precioM2Max", mMax);
        rango("areaMin", aMin, "areaMax", aMax);
        // Con un filtro de precio y sin moneda, se entiende soles.
        if (mon == null && (pMin != null || pMax != null || mMin != null || mMax != null)) mon = "PEN";

        Orden o = Orden.NOVEDAD;
        String ord = vacio(orden);
        if (ord != null) {
            String clave = ord.toUpperCase(Locale.ROOT).replace("PRECIOM2", "PRECIO_M2");
            try {
                o = Orden.valueOf(clave);
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException(
                        "orden: valor no válido «" + ord + "». Usa uno de: novedad, precio, precioM2, area");
            }
        }
        String sen = vacio(sentido);
        boolean desc = o == Orden.NOVEDAD; // la novedad empieza por lo más reciente; el resto, por lo menor
        if (sen != null) {
            if (sen.equalsIgnoreCase("desc")) desc = true;
            else if (sen.equalsIgnoreCase("asc")) desc = false;
            else throw new IllegalArgumentException("sentido: valor no válido «" + sen + "». Usa asc o desc");
        }
        return new FiltroPublico(vacio(proyecto), vacio(distrito), tipoInmueble(tipo),
                valor("estadoComercial", estadoComercial, EstadoComercial.class), mon, pMin, pMax, mMin, mMax, aMin,
                aMax, valor("indicadorA", indicadorA, EstadoSemaforo.class), alerta, o, desc,
                valor("clase", clase, Clase.class));
    }

    /** ¿Entran los inmuebles de esta clase? */
    boolean incluye(Clase c) {
        return clase == null || clase == c;
    }

    /** Filtros que salen de los datos del caso (todos menos el indicador A y la alerta). */
    boolean aceptaPredio(CasoLote c, PredioDto p) {
        return aceptaPredio(p);
    }

    /**
     * v1.0 (etapa 3a): los mismos filtros sobre los datos del predio, que valen igual para un caso que para un lote de
     * proyecto (el proyecto, el distrito y el estado comercial del caso ya vienen en su PredioDto).
     */
    boolean aceptaPredio(PredioDto p) {
        if (proyecto != null && !proyecto.equalsIgnoreCase(p.proyecto())) return false;
        if (distrito != null && !distrito.equalsIgnoreCase(p.distrito())) return false;
        if (tipo != null && p.tipoInmueble() != tipo) return false;
        if (estadoComercial != null && p.estadoComercial() != estadoComercial) return false;
        if (moneda != null && (p.precioReferencial() == null || !moneda.equals(p.moneda()))) return false;
        if (hay(precioMin, precioMax) && !dentro(p.precioReferencial(), precioMin, precioMax)) return false;
        if (hay(precioM2Min, precioM2Max) && !dentro(p.precioPorM2(), precioM2Min, precioM2Max)) return false;
        return !hay(areaMin, areaMax) || dentro(p.areaM2(), areaMin, areaMax);
    }

    /** Orden elegido; los que no tienen el dato van siempre al final. Empata por código. */
    Comparator<Candidato> comparador() {
        Comparator<Candidato> principal = switch (orden) {
            case NOVEDAD -> {
                // v1.0 (etapa 3a): por fecha de alta, común a casos y lotes; empata por clase y por id.
                Comparator<Candidato> porAlta = Comparator.comparing(Candidato::alta,
                        Comparator.nullsFirst(Comparator.<java.time.Instant>naturalOrder()))
                        .thenComparing(Candidato::clase).thenComparingLong(Candidato::id);
                yield descendente ? porAlta.reversed() : porAlta;
            }
            case PRECIO -> conNulosAlFinal(c -> c.predio().precioReferencial(), true);
            case PRECIO_M2 -> conNulosAlFinal(c -> c.predio().precioPorM2(), true);
            case AREA -> conNulosAlFinal(c -> c.predio().areaM2(), false);
        };
        return principal.thenComparing(Candidato::codigo);
    }

    // Sin dato → al final en los dos sentidos: el sentido solo invierte a los que sí tienen dato.
    private Comparator<Candidato> conNulosAlFinal(Function<Candidato, BigDecimal> dato, boolean porMoneda) {
        return (a, b) -> {
            BigDecimal x = dato.apply(a), y = dato.apply(b);
            if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
            int r = 0;
            // Sin moneda elegida, los precios en soles van antes que los de dólares: no se mezclan monedas.
            if (porMoneda && moneda == null) {
                r = String.valueOf(a.predio().moneda()).compareTo(String.valueOf(b.predio().moneda()));
            }
            if (r == 0) r = x.compareTo(y);
            return descendente ? -r : r;
        };
    }

    /**
     * Un inmueble del catálogo con sus datos ya calculados, antes de ordenar y paginar: un caso (con su expediente) o,
     * desde la etapa 3a, un lote de proyecto sin caso propio (con el expediente de la partida matriz, si la hay).
     */
    record Candidato(Expediente expediente, CasoLote caso, LoteProyecto lote, PredioDto predio, String codigo,
            java.time.Instant alta, Clase clase, long id) {

        /** Un caso. */
        Candidato(Expediente expediente, CasoLote caso, PredioDto predio) {
            this(expediente, caso, null, predio, caso.getCodigo(), caso.getCreadoEn(), Clase.CASO,
                    caso.getId() == null ? 0 : caso.getId());
        }

        /** Un lote de proyecto; {@code matriz} es el expediente de la partida matriz o null. */
        static Candidato deLote(LoteProyecto lote, Expediente matriz, PredioDto predio) {
            return new Candidato(matriz, null, lote, predio, lote.codigo(), lote.getCreadoEn(), Clase.LOTE_PROYECTO,
                    lote.getId() == null ? 0 : lote.getId());
        }
    }

    /** Precio por m²: el precio referencial entre el área del terreno, con dos decimales; null si falta alguno. */
    static BigDecimal precioPorM2(BigDecimal precio, BigDecimal area) {
        if (precio == null || area == null || area.signum() <= 0) return null;
        return precio.divide(area, 2, RoundingMode.HALF_UP);
    }

    private static boolean hay(BigDecimal min, BigDecimal max) {
        return min != null || max != null;
    }

    private static boolean dentro(BigDecimal v, BigDecimal min, BigDecimal max) {
        return v != null && (min == null || v.compareTo(min) >= 0) && (max == null || v.compareTo(max) <= 0);
    }

    private static void rango(String nMin, BigDecimal min, String nMax, BigDecimal max) {
        if (min != null && max != null && min.compareTo(max) > 0) {
            throw new IllegalArgumentException(nMin + " no puede ser mayor que " + nMax);
        }
    }

    private static BigDecimal numero(String parametro, String texto) {
        String v = vacio(texto);
        if (v == null) return null;
        try {
            BigDecimal n = new BigDecimal(v);
            if (n.signum() < 0) throw new NumberFormatException();
            return n;
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException(
                    parametro + ": debe ser un número igual o mayor que 0, sin separador de miles");
        }
    }

    /** Acepta LOTE y VIVIENDA como atajos de LOTE_URBANO y VIVIENDA_URBANA. */
    private static TipoInmueble tipoInmueble(String texto) {
        String v = vacio(texto);
        if (v == null) return null;
        String u = v.toUpperCase(Locale.ROOT);
        if (u.equals("LOTE")) return TipoInmueble.LOTE_URBANO;
        if (u.equals("VIVIENDA")) return TipoInmueble.VIVIENDA_URBANA;
        return valor("tipo", v, TipoInmueble.class);
    }

    private static <E extends Enum<E>> E valor(String parametro, String texto, Class<E> tipo) {
        String v = vacio(texto);
        if (v == null) return null;
        try {
            return Enum.valueOf(tipo, v.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            String validos = Arrays.stream(tipo.getEnumConstants()).map(Enum::name).collect(Collectors.joining(", "));
            throw new IllegalArgumentException(parametro + ": valor no válido «" + v + "». Usa uno de: " + validos);
        }
    }

    private static String vacio(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
