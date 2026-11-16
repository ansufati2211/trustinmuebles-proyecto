package pe.trustinmuebles.expediente;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * v1.0 (etapa 10): retira del portal los proyectos de demostración de {@code app.proyectos.retirados}, para que el
 * catálogo muestre los proyectos reales de LedCons. A cada uno se le retira la autorización de su partida matriz en nombre
 * de la inmobiliaria (con su fila RETIRADA en el historial, por la cuenta del asesor), así sus lotes dejan de ofrecerse sin
 * borrar nada: siguen en el panel, en el CRM y en la base. Una sola vez por proyecto y por base (tabla ajuste_contenido):
 * si después el equipo vuelve a autorizar uno, no se retira otra vez. Corre después de la precarga de interesados (orden
 * 50), para que estos conserven el proyecto y el lote que les corresponden.
 */
@Component
@Order(55)
class RetiroProyectosDemo implements ApplicationRunner {
    static final String AJUSTE = "v1.0-etapa-10-retiro-";

    private final ProyectoRepository proyectos;
    private final CasoLoteRepository casos;
    private final HistorialAutorizacionRepository autorizaciones;
    private final JdbcTemplate jdbc;
    private final List<String> retirados;

    RetiroProyectosDemo(ProyectoRepository proyectos, CasoLoteRepository casos,
            HistorialAutorizacionRepository autorizaciones, JdbcTemplate jdbc,
            @Value("${app.proyectos.retirados:}") String retirados) {
        this.proyectos = proyectos;
        this.casos = casos;
        this.autorizaciones = autorizaciones;
        this.jdbc = jdbc;
        this.retirados = Arrays.stream(retirados.split(",")).map(String::trim).filter(s -> !s.isEmpty()).distinct().toList();
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (String codigo : retirados) retirar(codigo);
    }

    /** Retira la autorización de la partida matriz del proyecto, si la tiene y no se hizo antes en esta base. */
    void retirar(String codigo) {
        String clave = AJUSTE + codigo;
        Integer hecho = jdbc.queryForObject("select count(*) from ajuste_contenido where clave = ?", Integer.class, clave);
        if (hecho != null && hecho > 0) return;
        Proyecto p = proyectos.findByCodigo(codigo).orElse(null);
        if (p == null || p.getCasoMatrizCodigo() == null) return;
        casos.findByCodigo(p.getCasoMatrizCodigo()).filter(c -> c.getAutorizacionFecha() != null).ifPresent(c -> {
            Instant ahora = Instant.now().truncatedTo(ChronoUnit.MILLIS);
            HistorialAutorizacion h = new HistorialAutorizacion();
            h.setCasoCodigo(c.getCodigo());
            h.setAccion(HistorialAutorizacion.Accion.RETIRADA);
            h.setEnNombreDe(c.getTitularidadComercial());
            h.setCuentaCodigo(CasosSeeder.ASESOR_DEMO);
            h.setRegistradaEn(ahora);
            autorizaciones.save(h);
            c.setAutorizacionFecha(null);
            if (c.getEstadoPublicacion() == EstadoPublicacion.PUBLICADO) c.setEstadoPublicacion(EstadoPublicacion.RETIRADO);
            casos.save(c);
        });
        jdbc.update("insert into ajuste_contenido (clave, aplicado_en) values (?, ?)", clave,
                java.sql.Timestamp.from(Instant.now()));
    }
}
