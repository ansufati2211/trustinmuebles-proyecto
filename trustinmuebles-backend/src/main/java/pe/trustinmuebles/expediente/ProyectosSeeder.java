package pe.trustinmuebles.expediente;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/**
 * v1.0 (etapa 3a): precarga de proyectos (contenido/proyectos.json) con sus hitos y sus lotes, y vínculo de los casos con
 * su proyecto. Corre después de CasosSeeder, que carga las partidas matrices. Es idempotente: un proyecto que ya existe
 * solo recibe lo que le falta (descripción, partida matriz, hitos o lotes), sin pisar lo editado.
 *
 * <p>Los lotes salen de las manzanas del contenido: área = frente × fondo (las esquinas tienen 1.50 m más de frente) y
 * precio = área × precio por m² del distrito (contenido/precios-zona.json), redondeado a la centena. Los estados se
 * reparten de forma determinista (semilla fija): 15 % vendidos, 25 % separados y el resto disponibles.
 */
@Component
@Order(45)
class ProyectosSeeder implements ApplicationRunner {
    static final double VENDIDOS = 0.15;
    static final double SEPARADOS = 0.25;
    static final BigDecimal EXTRA_ESQUINA = new BigDecimal("1.50");

    private final ProyectoRepository proyectos;
    private final LoteProyectoRepository lotes;
    private final CasoLoteRepository casos;
    private final VinculoProyecto vinculo;
    private final ObjectMapper json;
    private final boolean habilitado;

    ProyectosSeeder(ProyectoRepository proyectos, LoteProyectoRepository lotes, CasoLoteRepository casos,
            VinculoProyecto vinculo, ObjectMapper json, @Value("${app.seed.enabled}") boolean habilitado) {
        this.proyectos = proyectos;
        this.lotes = lotes;
        this.casos = casos;
        this.vinculo = vinculo;
        this.json = json;
        this.habilitado = habilitado;
    }

    record ManzanaJson(String manzana, int lotes, BigDecimal frente, BigDecimal fondo, String zonificacion,
            Independizacion independizacion) {}

    record HitoJson(String nombre, EstadoHito estado, LocalDate fecha) {}

    record ProyectoJson(String codigo, String nombre, String distrito, String descripcion, String recorridoUrl,
            String casoMatriz, long semilla, Independizacion independizacion, List<ManzanaJson> manzanas,
            List<HitoJson> hitos) {}

    record ProyectosJson(List<ProyectoJson> proyectos) {}

    record PreciosZona(String moneda, String nota, Map<String, BigDecimal> precioPorM2) {}

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (habilitado) {
            PreciosZona precios = leer("contenido/precios-zona.json", PreciosZona.class);
            for (ProyectoJson p : leer("contenido/proyectos.json", ProyectosJson.class).proyectos()) cargar(p, precios);
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
            BigDecimal porM2 = precios.precioPorM2().get(j.distrito());
            lotes.saveAll(generarLotes(p, j, porM2, precios.moneda()));
        }
    }

    /** Los lotes de un proyecto, en orden de manzana y número. Determinista: la misma semilla da los mismos lotes. */
    static List<LoteProyecto> generarLotes(Proyecto p, ProyectoJson j, BigDecimal porM2, String moneda) {
        List<LoteProyecto> salida = new ArrayList<>();
        for (ManzanaJson m : j.manzanas()) {
            int mitad = (m.lotes() + 1) / 2;
            for (int n = 1; n <= m.lotes(); n++) {
                boolean esquina = n == 1 || n == mitad || n == mitad + 1 || n == m.lotes();
                BigDecimal frente = esquina ? m.frente().add(EXTRA_ESQUINA) : m.frente();
                LoteProyecto l = new LoteProyecto();
                l.setProyecto(p);
                l.setManzana(m.manzana().toUpperCase(java.util.Locale.ROOT));
                l.setNumero(n);
                l.setAreaM2(frente.multiply(m.fondo()).setScale(2, RoundingMode.HALF_UP));
                if (porM2 != null) l.setPrecio(precioDe(l.getAreaM2(), porM2));
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

    /** Área por precio por m², redondeado a la centena. */
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
