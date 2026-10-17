package pe.trustinmuebles.expediente;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
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
import pe.trustinmuebles.checklist.ChecklistService;
import pe.trustinmuebles.clasificacion.ClasificacionService;
import pe.trustinmuebles.expediente.ContenidoCaso.CasoJson;
import pe.trustinmuebles.identidad.AuthService;
import pe.trustinmuebles.orientacion.GlosarioService;
import tools.jackson.databind.ObjectMapper;

/**
 * Carga los casos de contenido/<versión>/casos/*.json (única "migración de datos", 6.8.2).
 * Es idempotente: no pisa lo que el revisor ya editó. Después recalcula las evaluaciones que falten
 * o que usen otra versión de reglas. El PDF de cada caso lo genera el sistema con CopiaLiteralPdf.
 */
@Component
@Order(40)
class CasosSeeder implements ApplicationRunner {
    private final CasoLoteRepository casos;
    private final ExpedienteRepository expedientes;
    private final ExpedienteService servicio;
    private final ClasificacionService clasificacion;
    private final ChecklistService checklist;
    private final GlosarioService glosario;
    private final AuthService auth;
    private final ObjectMapper json;
    private final boolean habilitado;
    private final String version;

    CasosSeeder(CasoLoteRepository casos, ExpedienteRepository expedientes, ExpedienteService servicio,
            ClasificacionService clasificacion, ChecklistService checklist, GlosarioService glosario,
            AuthService auth, ObjectMapper json, @Value("${app.seed.enabled}") boolean habilitado,
            @Value("${app.reglas.version}") String version) {
        this.casos = casos;
        this.expedientes = expedientes;
        this.servicio = servicio;
        this.clasificacion = clasificacion;
        this.checklist = checklist;
        this.glosario = glosario;
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
        CasoLote caso = new CasoLote();
        caso.setCodigo(c.codigo());
        caso.setDenominacion(c.denominacion());
        caso.setContexto(c.contexto());
        caso.setSintetico(true);
        caso.setResponsableId(responsableId);
        casos.save(caso);

        Expediente e = servicio.crear(caso, c.datos());
        int i = 0;
        for (ContenidoCaso.ItemJson it : c.items()) checklist.agregar(e.getId(), it.nombre(), it.estado(), i++);
        glosario.asociar(e.getId(), c.terminos());
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
}
