package pe.trustinmuebles.expediente;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/**
 * v1.0 (etapa 3a): precarga de proyectos (contenido/proyectos.json) con sus hitos y sus lotes, y vínculo de los casos con
 * su proyecto. Corre después de CasosSeeder, que carga las partidas matrices. Es idempotente: un proyecto que ya existe
 * solo recibe lo que le falta (descripción, partida matriz, hitos o lotes), sin pisar lo editado.
 *
 * <p>Los lotes salen de las manzanas del contenido: área = frente × fondo (las esquinas tienen 1.50 m más de frente). Desde
 * la etapa 8, precio = área × un valor por m² fijo dentro del rango del distrito (contenido/precios-zona.json) que depende
 * de la manzana y el número, con un 8 % más en las esquinas, redondeado a S/ 500. Los estados se reparten de forma
 * determinista (semilla fija): 15 % vendidos, 25 % separados y el resto disponibles.
 *
 * <p>Una base existente recibe los precios nuevos una sola vez (ajuste {@value #AJUSTE_PRECIOS}) y solo en los lotes que
 * nadie editó: los que conservan el precio de la fórmula anterior y no tienen historial de carga por CSV.
 */
@Component
@Order(45)
class ProyectosSeeder implements ApplicationRunner {
    static final double VENDIDOS = 0.15;
    static final double SEPARADOS = 0.25;
    static final BigDecimal EXTRA_ESQUINA = new BigDecimal("1.50");
    /** Marca del ajuste de precios de la etapa 8 en una base existente (tabla ajuste_contenido). */
    static final String AJUSTE_PRECIOS = "v1.0-etapa-8-precios";
    /** v1.0 (etapa 9): marca de las direcciones referenciales de los proyectos precargados. */
    static final String AJUSTE_DIRECCIONES = "v1.0-etapa-9-direcciones";
    /** Precio por m² con el que se generaron los lotes hasta la etapa 7 (para reconocer los que nadie editó). */
    static final Map<String, BigDecimal> PRECIO_M2_ANTERIOR = Map.of("Ica", new BigDecimal("450"),
            "Subtanjalla", new BigDecimal("250"), "La Tinguiña", new BigDecimal("300"),
            "Los Aquijes", new BigDecimal("250"), "Salas", new BigDecimal("200"));

    private final ProyectoRepository proyectos;
    private final LoteProyectoRepository lotes;
    private final CasoLoteRepository casos;
    private final VinculoProyecto vinculo;
    private final ObjectMapper json;
    private final JdbcTemplate jdbc;
    private final boolean habilitado;

    ProyectosSeeder(ProyectoRepository proyectos, LoteProyectoRepository lotes, CasoLoteRepository casos,
            VinculoProyecto vinculo, ObjectMapper json, JdbcTemplate jdbc,
            @Value("${app.seed.enabled}") boolean habilitado) {
        this.proyectos = proyectos;
        this.lotes = lotes;
        this.casos = casos;
        this.vinculo = vinculo;
        this.json = json;
        this.jdbc = jdbc;
        this.habilitado = habilitado;
    }

    record ManzanaJson(String manzana, int lotes, BigDecimal frente, BigDecimal fondo, String zonificacion,
            Independizacion independizacion) {}

    record HitoJson(String nombre, EstadoHito estado, LocalDate fecha) {}

    record ProyectoJson(String codigo, String nombre, String distrito, String descripcion, String direccion,
            String recorridoUrl,
            String casoMatriz, long semilla, Independizacion independizacion, List<ManzanaJson> manzanas,
            List<HitoJson> hitos) {}

    record ProyectosJson(List<ProyectoJson> proyectos) {}

    /** Rango de precio por m² de un distrito, en la moneda del archivo. */
    record Rango(BigDecimal min, BigDecimal max) {}

    record PreciosZona(String moneda, String nota, BigDecimal redondeo, BigDecimal recargoEsquina,
            Map<String, Rango> rangoPorM2) {}

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (habilitado) {
            PreciosZona precios = leer("contenido/precios-zona.json", PreciosZona.class);
            List<ProyectoJson> lista = leer("contenido/proyectos.json", ProyectosJson.class).proyectos();
            for (ProyectoJson p : lista) cargar(p, precios);
            ajustarPrecios(lista, precios);
            completarDirecciones(lista);
        }
        // Siempre: un caso con texto de proyecto y sin referencia (una base anterior o una carga nueva) se vincula.
        for (CasoLote c : casos.findAll()) {
            if (c.getProyecto() != null && c.getProyectoCodigo() == null) {
                vinculo.vincular(c);
                casos.save(c);
            }
        }
    }

    private void cargar(ProyectoJson j, PreciosZona precios) {
        Proyecto p = proyectos.findByCodigo(j.codigo()).orElseGet(() -> {
            Proyecto n = new Proyecto();
            n.setCodigo(j.codigo());
            n.setNombre(j.nombre());
            return n;
        });
        if (p.getDistrito() == null) p.setDistrito(j.distrito());
        if (p.getDescripcion() == null) p.setDescripcion(j.descripcion());
        if (p.getRecorridoUrl() == null) p.setRecorridoUrl(j.recorridoUrl());
        if (p.getCasoMatrizCodigo() == null && j.casoMatriz() != null && casos.existsByCodigo(j.casoMatriz())) {
            p.setCasoMatrizCodigo(j.casoMatriz());
        }
        if (p.getHitos().isEmpty() && j.hitos() != null) {
            int orden = 1;
            for (HitoJson h : j.hitos()) {
                HitoProyecto x = new HitoProyecto();
                x.setProyecto(p);
                x.setOrden(orden++);
                x.setNombre(h.nombre());
                x.setEstado(h.estado());
                x.setFecha(h.fecha());
                p.getHitos().add(x);
            }
        }
        p = proyectos.saveAndFlush(p);
        if (lotes.countByProyectoId(p.getId()) == 0) {
            lotes.saveAll(generarLotes(p, j, precios));
        }
    }

    /** Los lotes de un proyecto, en orden de manzana y número. Determinista: la misma semilla da los mismos lotes. */
    static List<LoteProyecto> generarLotes(Proyecto p, ProyectoJson j, PreciosZona precios) {
        Rango rango = precios.rangoPorM2().get(j.distrito());
        String moneda = precios.moneda();
        List<LoteProyecto> salida = new ArrayList<>();
        for (ManzanaJson m : j.manzanas()) {
            for (int n = 1; n <= m.lotes(); n++) {
                boolean esquina = esEsquina(m.lotes(), n);
                BigDecimal frente = esquina ? m.frente().add(EXTRA_ESQUINA) : m.frente();
                LoteProyecto l = new LoteProyecto();
                l.setProyecto(p);
                l.setManzana(m.manzana().toUpperCase(java.util.Locale.ROOT));
                l.setNumero(n);
                l.setAreaM2(frente.multiply(m.fondo()).setScale(2, RoundingMode.HALF_UP));
                if (rango != null) {
                    l.setPrecio(precioEnRango(l.getAreaM2(), rango, l.getManzana(), n, esquina, precios));
                }
                l.setMoneda(moneda == null ? "PEN" : moneda);
                l.setZonificacion(m.zonificacion());
                l.setIndependizacion(m.independizacion() != null ? m.independizacion()
                        : j.independizacion() != null ? j.independizacion() : Independizacion.EN_PARTIDA_MATRIZ);
                l.setPublicado(true);
                salida.add(l);
            }
        }
        List<EstadoComercial> estados = repartoDeEstados(salida.size(), new Random(j.semilla()));
        for (int i = 0; i < salida.size(); i++) salida.get(i).setEstadoComercial(estados.get(i));
        return salida;
    }

    /** Las esquinas de una manzana: el primer y el último lote y los dos del medio (dan a dos calles). */
    static boolean esEsquina(int lotesDeLaManzana, int n) {
        int mitad = (lotesDeLaManzana + 1) / 2;
        return n == 1 || n == mitad || n == mitad + 1 || n == lotesDeLaManzana;
    }

    /**
     * Valor por m² del lote dentro del rango del distrito: uno de 11 escalones (del mínimo al máximo) elegido por la letra
     * de la manzana y el número del lote. Determinista: el mismo lote siempre da el mismo valor.
     */
    static BigDecimal valorM2(Rango r, String manzana, int numero) {
        int letra = manzana == null || manzana.isEmpty() ? 0 : Character.toUpperCase(manzana.charAt(0)) - 'A';
        int escalon = Math.floorMod(letra * 7 + numero * 3, 11);
        return r.min().add(r.max().subtract(r.min()).multiply(BigDecimal.valueOf(escalon))
                .divide(BigDecimal.TEN, 2, RoundingMode.HALF_UP));
    }

    /** Área × valor por m² del lote (con el recargo si es esquina), redondeado al múltiplo de {@code redondeo}. */
    static BigDecimal precioEnRango(BigDecimal area, Rango r, String manzana, int numero, boolean esquina,
            PreciosZona precios) {
        BigDecimal bruto = area.multiply(valorM2(r, manzana, numero));
        if (esquina && precios.recargoEsquina() != null) bruto = bruto.multiply(BigDecimal.ONE.add(precios.recargoEsquina()));
        BigDecimal paso = precios.redondeo() == null ? BigDecimal.valueOf(500) : precios.redondeo();
        return bruto.divide(paso, 0, RoundingMode.HALF_UP).multiply(paso).setScale(2, RoundingMode.UNNECESSARY);
    }

    /**
     * v1.0 (etapa 8): una sola vez por base. Los lotes precargados que nadie editó (precio igual al de la fórmula anterior
     * y sin historial de carga por CSV) toman el precio nuevo. Una base nueva ya nace con ellos y solo queda marcada.
     */
    private void ajustarPrecios(List<ProyectoJson> lista, PreciosZona precios) {
        Integer hecho = jdbc.queryForObject("select count(*) from ajuste_contenido where clave = ?", Integer.class,
                AJUSTE_PRECIOS);
        if (hecho != null && hecho > 0) return;
        for (ProyectoJson j : lista) {
            Rango rango = precios.rangoPorM2().get(j.distrito());
            BigDecimal anterior = PRECIO_M2_ANTERIOR.get(j.distrito());
            if (rango == null || anterior == null || j.manzanas() == null || j.manzanas().isEmpty()) continue;
            Map<String, Integer> tamanos = new HashMap<>();
            for (ManzanaJson m : j.manzanas()) tamanos.put(m.manzana().toUpperCase(java.util.Locale.ROOT), m.lotes());
            Set<String> editados = new HashSet<>(jdbc.queryForList(
                    "select distinct lote_clave from historial_lote_proyecto where proyecto_codigo = ?", String.class,
                    j.codigo()));
            for (LoteProyecto l : lotes.findDelProyecto(j.codigo())) {
                Integer tamano = tamanos.get(l.getManzana());
                if (tamano == null || l.getNumero() > tamano || l.getPrecio() == null || l.getAreaM2() == null) continue;
                if (editados.contains(l.clave())) continue;
                if (l.getPrecio().compareTo(precioDe(l.getAreaM2(), anterior)) != 0) continue;
                l.setPrecio(precioEnRango(l.getAreaM2(), rango, l.getManzana(), l.getNumero(),
                        esEsquina(tamano, l.getNumero()), precios));
                lotes.save(l);
            }
        }
        jdbc.update("insert into ajuste_contenido (clave, aplicado_en) values (?, ?)", AJUSTE_PRECIOS,
                java.sql.Timestamp.from(java.time.Instant.now()));
    }

    /**
     * v1.0 (etapa 9): una sola vez por base, la dirección referencial de cada proyecto precargado que no tenga una. Sin
     * enlace de mapa: lo registra la inmobiliaria con la ubicación real (el botón «Cómo llegar» solo aparece con él). Si
     * el equipo después borra o cambia la dirección, no se vuelve a escribir.
     */
    private void completarDirecciones(List<ProyectoJson> lista) {
        Integer hecho = jdbc.queryForObject("select count(*) from ajuste_contenido where clave = ?", Integer.class,
                AJUSTE_DIRECCIONES);
        if (hecho != null && hecho > 0) return;
        for (ProyectoJson j : lista) {
            if (j.direccion() == null) continue;
            proyectos.findByCodigo(j.codigo()).filter(p -> p.getDireccion() == null).ifPresent(p -> {
                p.setDireccion(j.direccion());
                proyectos.save(p);
            });
        }
        jdbc.update("insert into ajuste_contenido (clave, aplicado_en) values (?, ?)", AJUSTE_DIRECCIONES,
                java.sql.Timestamp.from(java.time.Instant.now()));
    }

    /** Fórmula anterior a la etapa 8 (área × precio por m², redondeado a la centena); reconoce los lotes sin editar. */
    static BigDecimal precioDe(BigDecimal area, BigDecimal porM2) {
        return area.multiply(porM2).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.UNNECESSARY);
    }

    /** 15 % vendidos y 25 % separados (redondeados), el resto disponibles, mezclados con la semilla dada. */
    static List<EstadoComercial> repartoDeEstados(int n, Random azar) {
        int vendidos = (int) Math.round(n * VENDIDOS);
        int separados = (int) Math.round(n * SEPARADOS);
        List<EstadoComercial> estados = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            estados.add(i < vendidos ? EstadoComercial.VENDIDO
                    : i < vendidos + separados ? EstadoComercial.SEPARADO : EstadoComercial.DISPONIBLE);
        }
        Collections.shuffle(estados, azar);
        return estados;
    }

    private <T> T leer(String ruta, Class<T> tipo) {
        try (InputStream in = new ClassPathResource(ruta).getInputStream()) {
            return json.readValue(in, tipo);
        } catch (IOException ex) {
            throw new UncheckedIOException("No se pudo leer el contenido " + ruta, ex);
        }
    }
}
