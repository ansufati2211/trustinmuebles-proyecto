package pe.trustinmuebles.expediente;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.trustinmuebles.almacenamiento.AlmacenamientoService;
import pe.trustinmuebles.checklist.ChecklistService;
import pe.trustinmuebles.checklist.EstadoItem;
import pe.trustinmuebles.clasificacion.ClasificacionService;
import pe.trustinmuebles.clasificacion.Completitud;
import pe.trustinmuebles.clasificacion.EstadoAnotacion;
import pe.trustinmuebles.identidad.AuthService;
import pe.trustinmuebles.orientacion.GlosarioService;
import pe.trustinmuebles.shared.PdfSimple;
import tools.jackson.databind.ObjectMapper;

/**
 * Carga los casos sintéticos de contenido/<versión>/casos/*.json (única "migración de datos", 6.8.2).
 * Es idempotente: no pisa lo que el revisor ya editó. Después recalcula las evaluaciones que falten
 * o que usen otra versión de reglas.
 */
@Component
@Order(40)
class CasosSeeder implements ApplicationRunner {
    record AnotacionJson(String referencia, EstadoAnotacion estado, String descripcion) {}

    record ItemJson(String nombre, EstadoItem estado) {}

    record ExpedienteJson(String condicionRepresentada, String titularidad, Completitud completitud,
            LocalDate fechaReferencial, String nota, List<AnotacionJson> anotaciones, List<ItemJson> checklist,
            List<String> terminos) {}

    record CasoJson(String codigo, String contexto, ExpedienteJson expediente) {}

    private static final String LIMITE_CASO = "No se verifica autenticidad, actualidad ni situación jurídica real.";

    private final CasoLoteRepository casos;
    private final ExpedienteRepository expedientes;
    private final ClasificacionService clasificacion;
    private final ChecklistService checklist;
    private final GlosarioService glosario;
    private final AlmacenamientoService almacenamiento;
    private final AuthService auth;
    private final ObjectMapper json;
    private final boolean habilitado;
    private final String version;

    CasosSeeder(CasoLoteRepository casos, ExpedienteRepository expedientes, ClasificacionService clasificacion,
            ChecklistService checklist, GlosarioService glosario, AlmacenamientoService almacenamiento,
            AuthService auth, ObjectMapper json, @Value("${app.seed.enabled}") boolean habilitado,
            @Value("${app.reglas.version}") String version) {
        this.casos = casos;
        this.expedientes = expedientes;
        this.clasificacion = clasificacion;
        this.checklist = checklist;
        this.glosario = glosario;
        this.almacenamiento = almacenamiento;
        this.auth = auth;
        this.json = json;
        this.habilitado = habilitado;
        this.version = version;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!habilitado) return;
        Long responsable = auth.primerRevisor().orElseThrow(
                () -> new IllegalStateException("No hay una cuenta con rol REVISOR para registrar los casos")).id();

        for (CasoJson c : leerCasos()) {
            if (casos.existsByCodigo(c.codigo())) continue;
            crear(c, responsable);
        }
        for (Expediente e : expedientes.findAll()) {
            if (clasificacion.necesitaRecalculo(e.getId(), e.getVersion())) {
                clasificacion.recalcular(e.getId(), e.getVersion(), ExpedienteService.entrada(e));
            }
        }
    }

    private void crear(CasoJson c, Long responsableId) {
        ExpedienteJson x = c.expediente();
        CasoLote caso = new CasoLote();
        caso.setCodigo(c.codigo());
        caso.setContexto(c.contexto());
        caso.setSintetico(true);
        caso.setResponsableId(responsableId);
        casos.save(caso);

        Expediente e = new Expediente();
        e.setCaso(caso);
        e.setCondicionRepresentada(x.condicionRepresentada());
        e.setTitularidad(x.titularidad());
        e.setCompletitud(x.completitud());
        e.setFechaReferencial(x.fechaReferencial());
        e.setNota(x.nota());
        int orden = 0;
        for (AnotacionJson aj : x.anotaciones()) {
            Anotacion a = new Anotacion();
            a.setExpediente(e);
            a.setReferencia(aj.referencia());
            a.setEstado(aj.estado());
            a.setDescripcion(aj.descripcion());
            a.setOrden(orden++);
            e.getAnotaciones().add(a);
        }
        byte[] pdf = PdfSimple.generar("Caso sintético " + c.codigo(), lineasPdf(c));
        e.setDocumentoArchivoId(almacenamiento.guardar(c.codigo() + ".pdf", "application/pdf", pdf, false).id());
        expedientes.saveAndFlush(e);

        int i = 0;
        for (ItemJson it : x.checklist()) checklist.agregar(e.getId(), it.nombre(), it.estado(), i++);
        glosario.asociar(e.getId(), x.terminos());
    }

    private List<CasoJson> leerCasos() {
        try {
            Resource[] recursos = new PathMatchingResourcePatternResolver()
                    .getResources("classpath:contenido/" + version + "/casos/*.json");
            List<Resource> ordenados = new ArrayList<>(Arrays.asList(recursos));
            ordenados.sort(Comparator.comparing(Resource::getFilename));
            List<CasoJson> lista = new ArrayList<>();
            for (Resource r : ordenados) {
                try (InputStream in = r.getInputStream()) {
                    lista.add(json.readValue(in, CasoJson.class));
                }
            }
            return lista;
        } catch (IOException ex) {
            throw new UncheckedIOException("No se pudieron leer los casos de contenido " + version, ex);
        }
    }

    /** Texto del documento sintético del caso: refleja el contenido cargado y declara sus límites. */
    private static List<String> lineasPdf(CasoJson c) {
        ExpedienteJson x = c.expediente();
        List<String> l = new ArrayList<>();
        l.add("CASO SINTÉTICO CON FINES ACADÉMICOS. SIN VALOR JURÍDICO.");
        l.add("");
        agregarLinea(l, "Condición representada: " + x.condicionRepresentada());
        agregarLinea(l, "Titularidad: " + x.titularidad());
        l.add("Anotaciones:");
        if (x.anotaciones().isEmpty()) l.add("  (no se representan anotaciones)");
        // El estado sale del dato estructurado, no de un texto aparte, para que nunca se contradigan.
        for (AnotacionJson a : x.anotaciones()) {
            String detalle = a.descripcion() == null ? "" : " " + a.descripcion();
            agregarLinea(l, "  Anotación " + a.referencia() + ": " + a.estado().name().toLowerCase() + "." + detalle);
        }
        l.add("Checklist:");
        for (ItemJson it : x.checklist()) {
            l.add("  " + it.nombre() + ": " + it.estado().name().toLowerCase() + ".");
        }
        if (x.nota() != null) agregarLinea(l, "Nota: " + x.nota());
        agregarLinea(l, "Fecha referencial: " + x.fechaReferencial());
        agregarLinea(l, "Límite: " + LIMITE_CASO);
        return l;
    }

    private static void agregarLinea(List<String> destino, String texto) {
        String resto = texto;
        while (resto.length() > 88) {
            int corte = resto.lastIndexOf(' ', 88);
            if (corte < 20) corte = 88;
            destino.add(resto.substring(0, corte));
            resto = "  " + resto.substring(corte).stripLeading();
        }
        destino.add(resto);
    }
}
