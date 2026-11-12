package pe.trustinmuebles.expediente;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.trustinmuebles.expediente.CargaLotesDtos.*;
import pe.trustinmuebles.identidad.UsuarioActual;
import pe.trustinmuebles.shared.ArchivoDemasiadoGrandeException;
import pe.trustinmuebles.shared.NoEncontradoException;
import pe.trustinmuebles.shared.ReglaNegocioException;

/**
 * v1.0 (etapa 3b): carga masiva de lotes de un proyecto desde un CSV. Primero se revisa el archivo entero (vista previa, que
 * no escribe nada) y solo si no tiene ni un error se confirma: todo o nada, en una sola transacción. Un lote que ya existe
 * (misma manzana y número) se actualiza con lo que el archivo trae (una celda vacía deja el valor como estaba) y cada
 * cambio queda en el historial de solo adición. Nada de esto toca el indicador A: no se recalcula ninguna evaluación.
 */
@Service
@Transactional
class CargaLotesService {
    static final int MAX_FILAS = 2000;
    static final long MAX_BYTES = 1024 * 1024;
    static final List<String> COLUMNAS = List.of("manzana", "lote", "area_m2", "precio", "moneda", "estado",
            "independizacion", "zonificacion", "codigo_caso");
    static final List<String> OBLIGATORIAS = List.of("manzana", "lote", "area_m2");
    static final BigDecimal MAX_AREA = new BigDecimal("99999999.99");
    static final BigDecimal MAX_PRECIO = new BigDecimal("9999999999.99");

    /** Plantilla descargable: el encabezado y una fila de ejemplo. */
    static final String PLANTILLA = String.join(",", COLUMNAS) + "\r\n"
            + "A,1,140.00,35000,PEN,DISPONIBLE,EN_PARTIDA_MATRIZ,RDM,\r\n";

    private final ProyectoRepository proyectos;
    private final LoteProyectoRepository lotes;
    private final CasoLoteRepository casos;
    private final HistorialLoteProyectoRepository historial;
    private final ExpedienteService expediente;

    CargaLotesService(ProyectoRepository proyectos, LoteProyectoRepository lotes, CasoLoteRepository casos,
            HistorialLoteProyectoRepository historial, ExpedienteService expediente) {
        this.proyectos = proyectos;
        this.lotes = lotes;
        this.casos = casos;
        this.historial = historial;
        this.expediente = expediente;
    }

    // ------------------------------------------------------------------ operaciones

    /** Revisa el archivo sin guardar nada: qué se crearía, qué cambiaría y qué errores tiene cada fila. */
    @Transactional(readOnly = true)
    VistaPreviaCarga vistaPrevia(String codigo, byte[] datos) {
        return analizar(proyecto(codigo), datos).vista(codigo, datos.length);
    }

    /** Aplica el archivo si no tiene ningún error; si tiene alguno, no guarda nada (422). */
    ResultadoCarga confirmar(String codigo, byte[] datos) {
        Proyecto p = proyecto(codigo);
        Analisis a = analizar(p, datos);
        if (!a.valida()) {
            throw new ReglaNegocioException(a.erroresGenerales.isEmpty()
                    ? "El archivo tiene " + a.conErrores() + " fila(s) con errores: no se guardó nada. Corrígelas y vuelve a cargarlo."
                    : "El archivo no es válido: " + a.erroresGenerales.get(0) + " No se guardó nada.");
        }
        String cargaId = UUID.randomUUID().toString();
        Instant ahora = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        String cuenta = UsuarioActual.actual().codigoCuenta();
        boolean autoriza = ExpedienteService.autorizaLotes(expediente.matricesDe(List.of(p)).get(p.getCasoMatrizCodigo()));
        int creados = 0, actualizados = 0, sinCambios = 0;
        for (Fila f : a.filas) {
            if (f.accion == AccionFila.SIN_CAMBIOS) {
                sinCambios++;
                continue;
            }
            LoteProyecto l = f.existente != null ? f.existente : new LoteProyecto();
            if (f.existente == null) {
                l.setProyecto(p);
                l.setManzana(f.manzana);
                l.setNumero(f.lote);
                // Un lote nuevo se ofrece solo si la partida matriz tiene autorización vigente (I14).
                l.setPublicado(autoriza);
            }
            aplicar(l, f.valores);
            lotes.save(l);
            HistorialLoteProyecto h = new HistorialLoteProyecto();
            h.setProyectoCodigo(p.getCodigo());
            h.setLoteClave(f.clave);
            h.setAccion(f.existente == null ? HistorialLoteProyecto.Accion.CREADO : HistorialLoteProyecto.Accion.ACTUALIZADO);
            h.setCambios(recortar(String.join("; ", f.cambios), 1000));
            h.setCargaId(cargaId);
            h.setCuentaCodigo(cuenta);
            h.setRegistradaEn(ahora);
            historial.save(h);
            if (f.existente == null) creados++;
            else actualizados++;
        }
        return new ResultadoCarga(cargaId, p.getCodigo(), creados, actualizados, sinCambios);
    }

    @Transactional(readOnly = true)
    List<HistorialLoteDto> historial(String codigo, String clave) {
        proyecto(codigo);
        String k = clave == null ? "" : clave.trim().toUpperCase(Locale.ROOT);
        return historial.findByProyectoCodigoAndLoteClaveOrderByIdAsc(codigo, k).stream().map(h -> new HistorialLoteDto(
                h.getAccion().name(), h.getOrigen(), h.getCambios(), h.getCargaId(), h.getCuentaCodigo(),
                h.getRegistradaEn())).toList();
    }

    private Proyecto proyecto(String codigo) {
        return proyectos.findByCodigo(codigo).orElseThrow(() -> new NoEncontradoException("Proyecto", codigo));
    }

    // ------------------------------------------------------------------ análisis

    private enum AccionFila { NUEVO, ACTUALIZA, SIN_CAMBIOS, ERROR }

    /** Lo que el archivo pide para un lote: null en un campo significa «dejar como estaba» (o el valor por omisión). */
    private record Valores(BigDecimal area, BigDecimal precio, String moneda, EstadoComercial estado,
            Independizacion independizacion, String zonificacion, String casoCodigo) {}

    private static final class Fila {
        int linea;
        String manzana;
        Integer lote;
        String clave;
        AccionFila accion = AccionFila.ERROR;
        List<String> cambios = new ArrayList<>();
        List<String> errores = new ArrayList<>();
        Valores valores;
        LoteProyecto existente;
    }

    private static final class Analisis {
        final List<String> erroresGenerales = new ArrayList<>();
        final List<Fila> filas = new ArrayList<>();

        int conErrores() {
            return (int) filas.stream().filter(f -> !f.errores.isEmpty()).count();
        }

        boolean valida() {
            return erroresGenerales.isEmpty() && conErrores() == 0 && !filas.isEmpty();
        }

        VistaPreviaCarga vista(String proyecto, long bytes) {
            List<FilaCarga> salida = filas.stream().map(f -> new FilaCarga(f.linea, f.manzana, f.lote, f.clave,
                    f.errores.isEmpty() ? f.accion.name() : AccionFila.ERROR.name(), f.cambios, f.errores)).toList();
            return new VistaPreviaCarga(proyecto, bytes, filas.size(),
                    (int) filas.stream().filter(f -> f.errores.isEmpty() && f.accion == AccionFila.NUEVO).count(),
                    (int) filas.stream().filter(f -> f.errores.isEmpty() && f.accion == AccionFila.ACTUALIZA).count(),
                    (int) filas.stream().filter(f -> f.errores.isEmpty() && f.accion == AccionFila.SIN_CAMBIOS).count(),
                    conErrores(), erroresGenerales, valida(), salida);
        }
    }

    private Analisis analizar(Proyecto p, byte[] datos) {
        if (datos.length > MAX_BYTES) throw new ArchivoDemasiadoGrandeException("El archivo supera 1 MB");
        Analisis a = new Analisis();
        LectorCsv.Resultado csv = LectorCsv.leer(datos);
        if (csv.errorFormato() != null) {
            a.erroresGenerales.add(csv.errorFormato());
            return a;
        }
        if (csv.registros().isEmpty()) {
            a.erroresGenerales.add("El archivo está vacío: debe tener el encabezado y al menos una fila.");
            return a;
        }
        Map<String, Integer> columna = new LinkedHashMap<>();
        for (int i = 0; i < csv.registros().get(0).campos().size(); i++) {
            String nombre = csv.registros().get(0).campos().get(i).toLowerCase(Locale.ROOT);
            if (nombre.isEmpty()) continue;
            if (!COLUMNAS.contains(nombre)) {
                a.erroresGenerales.add("La columna «" + nombre + "» no existe. Las columnas son: " + String.join(", ", COLUMNAS) + ".");
            } else if (columna.putIfAbsent(nombre, i) != null) {
                a.erroresGenerales.add("La columna «" + nombre + "» está repetida.");
            }
        }
        for (String obligatoria : OBLIGATORIAS) {
            if (!columna.containsKey(obligatoria)) a.erroresGenerales.add("Falta la columna obligatoria «" + obligatoria + "».");
        }
        int ancho = csv.registros().get(0).campos().size();
        int filas = csv.registros().size() - 1;
        if (filas == 0) a.erroresGenerales.add("El archivo no tiene filas de datos, solo el encabezado.");
        if (filas > MAX_FILAS) {
            a.erroresGenerales.add("El archivo tiene " + filas + " filas y el máximo es " + MAX_FILAS + ".");
        }
        if (!a.erroresGenerales.isEmpty()) return a;

        Map<String, LoteProyecto> existentes = new HashMap<>();
        for (LoteProyecto l : lotes.findDelProyecto(p.getCodigo())) existentes.put(l.clave(), l);
        Map<String, Integer> vistos = new HashMap<>();
        Set<String> casosEnArchivo = new HashSet<>();
        for (LectorCsv.Registro r : csv.registros().subList(1, csv.registros().size())) {
            a.filas.add(fila(p, r, ancho, columna, existentes, vistos, casosEnArchivo));
        }
        return a;
    }

    private Fila fila(Proyecto p, LectorCsv.Registro r, int ancho, Map<String, Integer> columna, Map<String, LoteProyecto> existentes,
            Map<String, Integer> vistos, Set<String> casosEnArchivo) {
        Fila f = new Fila();
        f.linea = r.linea();
        if (r.campos().size() > ancho && r.campos().subList(ancho, r.campos().size()).stream().anyMatch(c -> !c.isEmpty())) {
            f.errores.add("La fila tiene más columnas (" + r.campos().size() + ") que el encabezado (" + ancho + ").");
        }
        java.util.function.Function<String, String> celda = nombre -> {
            Integer i = columna.get(nombre);
            return i == null || i >= r.campos().size() ? "" : r.campos().get(i);
        };

        String manzana = celda.apply("manzana").toUpperCase(Locale.ROOT);
        if (manzana.isEmpty()) f.errores.add("manzana: es obligatoria.");
        else if (!manzana.matches("[A-Z0-9]{1,4}")) f.errores.add("manzana: «" + celda.apply("manzana") + "» no es válida. Usa de 1 a 4 letras o números, por ejemplo A.");
        else f.manzana = manzana;

        String textoLote = celda.apply("lote");
        if (textoLote.isEmpty()) f.errores.add("lote: es obligatorio.");
        else if (!textoLote.matches("\\d{1,4}") || Integer.parseInt(textoLote) < 1) {
            f.errores.add("lote: «" + textoLote + "» no es válido. Usa un número entero de 1 a 9999.");
        } else f.lote = Integer.parseInt(textoLote);

        BigDecimal area = null;
        String textoArea = celda.apply("area_m2");
        if (textoArea.isEmpty()) f.errores.add("area_m2: es obligatoria.");
        else area = decimal(f, "area_m2", textoArea, MAX_AREA);

        BigDecimal precio = null;
        if (!celda.apply("precio").isEmpty()) precio = decimal(f, "precio", celda.apply("precio"), MAX_PRECIO);

        String moneda = celda.apply("moneda").toUpperCase(Locale.ROOT);
        if (!moneda.isEmpty() && !moneda.equals("PEN") && !moneda.equals("USD")) {
            f.errores.add("moneda: «" + celda.apply("moneda") + "» no es válida. Usa PEN o USD.");
            moneda = "";
        }
        EstadoComercial estado = enumerado(f, "estado", celda.apply("estado"), EstadoComercial.class);
        Independizacion independizacion = enumerado(f, "independizacion", celda.apply("independizacion"), Independizacion.class);
        String zonificacion = celda.apply("zonificacion");
        if (zonificacion.length() > 20) {
            f.errores.add("zonificacion: tiene " + zonificacion.length() + " caracteres y el máximo es 20.");
            zonificacion = "";
        }
        String casoCodigo = celda.apply("codigo_caso");

        if (f.manzana != null && f.lote != null) {
            f.clave = LoteProyecto.clave(f.manzana, f.lote);
            Integer antes = vistos.putIfAbsent(f.clave, r.linea());
            if (antes != null) f.errores.add("El lote " + f.clave + " ya aparece en la fila " + antes + ": cada lote va una sola vez.");
            f.existente = existentes.get(f.clave);
        }
        if (!casoCodigo.isEmpty()) casoCodigo = validarCaso(f, p, casoCodigo, casosEnArchivo);

        f.valores = new Valores(area, precio, moneda.isEmpty() ? null : moneda, estado, independizacion,
                zonificacion.isEmpty() ? null : zonificacion, casoCodigo.isEmpty() ? null : casoCodigo);
        if (f.errores.isEmpty()) comparar(f);
        return f;
    }

    /** El caso debe existir, no ser la partida matriz, ser de este proyecto (o de ninguno) y no estar en otro lote. */
    private String validarCaso(Fila f, Proyecto p, String codigo, Set<String> enArchivo) {
        Optional<CasoLote> caso = casos.findByCodigo(codigo);
        if (caso.isEmpty()) {
            f.errores.add("codigo_caso: no existe un caso con la partida «" + codigo + "».");
            return "";
        }
        if (codigo.equals(p.getCasoMatrizCodigo())) {
            f.errores.add("codigo_caso: «" + codigo + "» es la partida matriz del proyecto, no un lote.");
            return "";
        }
        String deProyecto = caso.get().getProyectoCodigo();
        if (deProyecto != null && !deProyecto.equals(p.getCodigo())) {
            f.errores.add("codigo_caso: «" + codigo + "» pertenece al proyecto «" + deProyecto + "».");
            return "";
        }
        Optional<LoteProyecto> otro = lotes.findByCasoCodigo(codigo);
        if (otro.isPresent() && (f.existente == null || !otro.get().getId().equals(f.existente.getId()))) {
            f.errores.add("codigo_caso: «" + codigo + "» ya es el caso del lote " + otro.get().clave() + " de «"
                    + otro.get().getProyecto().getCodigo() + "».");
            return "";
        }
        if (!enArchivo.add(codigo)) {
            f.errores.add("codigo_caso: «" + codigo + "» aparece en otra fila del archivo.");
            return "";
        }
        return codigo;
    }

    private static BigDecimal decimal(Fila f, String campo, String texto, BigDecimal maximo) {
        String t = texto.contains(",") && !texto.contains(".") ? texto.replace(',', '.') : texto;
        if (t.startsWith("-")) {
            f.errores.add(campo + ": «" + texto + "» es negativo. Debe ser mayor que 0.");
            return null;
        }
        if (!t.matches("\\d+(\\.\\d+)?")) {
            f.errores.add(campo + ": «" + texto + "» no es un número. Usa dígitos y punto decimal, sin separador de miles.");
            return null;
        }
        BigDecimal n = new BigDecimal(t);
        if (n.signum() == 0) {
            f.errores.add(campo + ": debe ser mayor que 0.");
            return null;
        }
        if (n.stripTrailingZeros().scale() > 2) {
            f.errores.add(campo + ": «" + texto + "» tiene más de 2 decimales.");
            return null;
        }
        if (n.compareTo(maximo) > 0) {
            f.errores.add(campo + ": «" + texto + "» es demasiado grande (máximo " + maximo.toPlainString() + ").");
            return null;
        }
        return n.setScale(2);
    }

    private static <E extends Enum<E>> E enumerado(Fila f, String campo, String texto, Class<E> tipo) {
        if (texto.isEmpty()) return null;
        try {
            return Enum.valueOf(tipo, texto.toUpperCase(Locale.ROOT).replace(' ', '_'));
        } catch (IllegalArgumentException ex) {
            StringBuilder validos = new StringBuilder();
            for (E e : tipo.getEnumConstants()) validos.append(validos.length() == 0 ? "" : ", ").append(e.name());
            f.errores.add(campo + ": «" + texto + "» no es válido. Usa " + validos + ".");
            return null;
        }
    }

    /** Qué se crearía o cambiaría: se compara lo que trae el archivo con el lote existente (y con el estado de su caso). */
    private void comparar(Fila f) {
        Valores v = f.valores;
        if (f.existente == null) {
            f.accion = AccionFila.NUEVO;
            f.cambios.add("area_m2: " + v.area().toPlainString());
            if (v.precio() != null) f.cambios.add("precio: " + v.precio().toPlainString());
            if (v.moneda() != null) f.cambios.add("moneda: " + v.moneda());
            f.cambios.add("estado: " + (v.estado() == null ? EstadoComercial.DISPONIBLE : v.estado()));
            f.cambios.add("independizacion: " + (v.independizacion() == null ? Independizacion.EN_PARTIDA_MATRIZ : v.independizacion()));
            if (v.zonificacion() != null) f.cambios.add("zonificacion: " + v.zonificacion());
            if (v.casoCodigo() != null) f.cambios.add("codigo_caso: " + v.casoCodigo());
            return;
        }
        LoteProyecto l = f.existente;
        if (v.area().compareTo(l.getAreaM2()) != 0) f.cambios.add("area_m2: " + l.getAreaM2().toPlainString() + " → " + v.area().toPlainString());
        if (v.precio() != null && (l.getPrecio() == null || v.precio().compareTo(l.getPrecio()) != 0)) {
            f.cambios.add("precio: " + (l.getPrecio() == null ? "sin precio" : l.getPrecio().toPlainString()) + " → " + v.precio().toPlainString());
        }
        if (v.moneda() != null && !v.moneda().equals(l.getMoneda())) f.cambios.add("moneda: " + l.getMoneda() + " → " + v.moneda());
        EstadoComercial actual = estadoVigente(l);
        if (v.estado() != null && v.estado() != actual) f.cambios.add("estado: " + actual + " → " + v.estado());
        if (v.independizacion() != null && v.independizacion() != l.getIndependizacion()) {
            f.cambios.add("independizacion: " + l.getIndependizacion() + " → " + v.independizacion());
        }
        if (v.zonificacion() != null && !v.zonificacion().equals(l.getZonificacion())) {
            f.cambios.add("zonificacion: " + (l.getZonificacion() == null ? "sin zonificación" : l.getZonificacion()) + " → " + v.zonificacion());
        }
        if (v.casoCodigo() != null && !v.casoCodigo().equals(l.getCasoCodigo())) {
            f.cambios.add("codigo_caso: " + (l.getCasoCodigo() == null ? "sin caso" : l.getCasoCodigo()) + " → " + v.casoCodigo());
        }
        f.accion = f.cambios.isEmpty() ? AccionFila.SIN_CAMBIOS : AccionFila.ACTUALIZA;
    }

    /** Con caso propio, el estado comercial vigente es el del caso (no se duplica). */
    private EstadoComercial estadoVigente(LoteProyecto l) {
        if (l.getCasoCodigo() != null) {
            Optional<CasoLote> c = casos.findByCodigo(l.getCasoCodigo());
            if (c.isPresent()) return c.get().getEstadoComercial();
        }
        return l.getEstadoComercial();
    }

    private void aplicar(LoteProyecto l, Valores v) {
        l.setAreaM2(v.area());
        if (v.precio() != null) l.setPrecio(v.precio());
        if (v.moneda() != null) l.setMoneda(v.moneda());
        if (v.independizacion() != null) l.setIndependizacion(v.independizacion());
        if (v.zonificacion() != null) l.setZonificacion(v.zonificacion());
        if (v.casoCodigo() != null) l.setCasoCodigo(v.casoCodigo());
        if (v.estado() != null) {
            l.setEstadoComercial(v.estado());
            // Con caso propio, el estado vive en el caso.
            if (l.getCasoCodigo() != null) {
                casos.findByCodigo(l.getCasoCodigo()).ifPresent(c -> {
                    c.setEstadoComercial(v.estado());
                    casos.save(c);
                });
            }
        }
    }

    private static String recortar(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }
}
