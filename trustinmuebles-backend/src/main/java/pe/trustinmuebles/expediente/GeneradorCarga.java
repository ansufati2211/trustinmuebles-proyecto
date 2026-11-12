package pe.trustinmuebles.expediente;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.trustinmuebles.clasificacion.ClasificacionService;
import pe.trustinmuebles.clasificacion.Completitud;
import pe.trustinmuebles.clasificacion.EstadoAnotacion;
import pe.trustinmuebles.clasificacion.OrigenEvaluacion;
import pe.trustinmuebles.clasificacion.TipoActo;
import pe.trustinmuebles.clasificacion.TipoPredio;
import pe.trustinmuebles.expediente.CasoDtos.AsientoDatos;
import pe.trustinmuebles.expediente.CasoDtos.DatosExpediente;
import pe.trustinmuebles.identidad.AuthService;

/**
 * Generador de datos de carga (v1.0, etapa 2). NO forma parte de la semilla normal: solo corre si se arranca con
 * {@code app.carga.lotes=N} (por ejemplo, {@code --app.carga.lotes=1000}) y sirve para medir el catálogo con muchos
 * lotes. Crea N lotes ficticios (partida SIM-9xxxxxxx, empresas inventadas, sin datos personales), todos publicados,
 * repartidos entre proyectos, distritos de Ica, precios en soles y dólares, áreas y alertas. Es determinista: la misma
 * N da siempre los mismos datos. Es idempotente: no repite los que ya existen.
 */
@Component
@Order(60)
@ConditionalOnProperty(name = "app.carga.lotes")
class GeneradorCarga implements ApplicationRunner {
    static final String[] PROYECTOS = {"Campiña del Olivar", "Santa Elvira", "Rincón del Sauce", "Mirador del Sol",
            "Villa del Algarrobo", "Jardines del Pacae", "Los Tamarindos", "Puente Molino", "Mirador del Pallar",
            "Los Laureles del Sur", "Las Palmeras de Ica", "Valle Verde", "Brisas del Ocucaje", "Altos de Parcona",
            "Huerto del Sol", "Los Girasoles", "Portal de la Tinguiña", "Vista Hermosa", "Arenales del Sur",
            "Mirador del Huacachina"};
    static final String[] DISTRITOS = {"Ica", "Parcona", "La Tinguiña", "Subtanjalla", "Los Aquijes", "Pueblo Nuevo",
            "Salas", "Santiago", "Pachacútec", "San José de los Molinos"};

    private final CasoLoteRepository casos;
    private final VinculoProyecto vinculo;
    private final ExpedienteService servicio;
    private final ClasificacionService clasificacion;
    private final AuthService auth;
    private final int cantidad;

    GeneradorCarga(CasoLoteRepository casos, VinculoProyecto vinculo, ExpedienteService servicio,
            ClasificacionService clasificacion, AuthService auth, @Value("${app.carga.lotes}") int cantidad) {
        this.casos = casos;
        this.vinculo = vinculo;
        this.servicio = servicio;
        this.clasificacion = clasificacion;
        this.auth = auth;
        this.cantidad = cantidad;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Long responsable = auth.primerRevisor().orElseThrow().id();
        Random azar = new Random(20261116L);
        Instant ahora = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        for (int i = 1; i <= cantidad; i++) {
            // Se consumen los mismos números aleatorios aunque el lote ya exista, para que la serie no cambie.
            LoteGenerado g = LoteGenerado.de(i, azar);
            if (casos.existsByCodigo(g.codigo())) continue;
            CasoLote caso = new CasoLote();
            caso.setCodigo(g.codigo());
            caso.setDenominacion(g.denominacion());
            caso.setContexto(g.distrito() + ", Ica");
            caso.setSintetico(true);
            caso.setDistrito(g.distrito());
            caso.setProyecto(g.proyecto());
            vinculo.vincular(caso);
            caso.setPrecioReferencial(g.precio());
            caso.setMoneda(g.moneda());
            caso.setEstadoComercial(g.estadoComercial());
            caso.setIndependizacion(g.independizacion());
            caso.setResponsableId(responsable);
            caso.setPropietarioCodigo("propietario-01");
            caso.setAutorizacionFecha(ahora);
            caso.setEstadoPublicacion(EstadoPublicacion.PUBLICADO);
            casos.save(caso);
            Expediente e = servicio.crear(caso, g.datos());
            clasificacion.recalcular(e.getId(), e.getVersion(), ExpedienteService.entrada(e),
                    OrigenEvaluacion.CARGA_INICIAL, ClasificacionService.CUENTA_SISTEMA);
        }
    }

    /** Un lote generado: todo sale del número de orden y de un generador de números aleatorios con semilla fija. */
    record LoteGenerado(String codigo, String denominacion, String distrito, String proyecto, BigDecimal area,
            BigDecimal precio, String moneda, EstadoComercial estadoComercial, Independizacion independizacion,
            int alerta) {

        static LoteGenerado de(int i, Random r) {
            String proyecto = PROYECTOS[r.nextInt(PROYECTOS.length)];
            String distrito = DISTRITOS[r.nextInt(DISTRITOS.length)];
            BigDecimal area = BigDecimal.valueOf(120 + r.nextInt(281)); // 120 a 400 m²
            boolean dolares = r.nextInt(10) == 0;
            int porM2 = dolares ? 40 + r.nextInt(200) : 150 + r.nextInt(750);
            int v = r.nextInt(10);
            EstadoComercial estado = v < 7 ? EstadoComercial.DISPONIBLE : v < 9 ? EstadoComercial.SEPARADO
                    : EstadoComercial.VENDIDO;
            Independizacion ind = Independizacion.values()[r.nextInt(3)];
            int alerta = r.nextInt(20); // 0-2 hipoteca vigente, 3 embargo vigente, resto sin alerta
            String codigo = "SIM-" + (90000000 + i);
            String denominacion = "Mz. " + (char) ('A' + r.nextInt(12)) + " Lote " + (1 + r.nextInt(30)) + " · Hab. Urb. "
                    + proyecto + " · " + distrito + ", Ica";
            return new LoteGenerado(codigo, denominacion, distrito, proyecto, area,
                    area.multiply(BigDecimal.valueOf(porM2)), dolares ? "USD" : "PEN", estado, ind, alerta);
        }

        DatosExpediente datos() {
            List<AsientoDatos> asientos = new ArrayList<>();
            asientos.add(new AsientoDatos("C00001", TipoActo.COMPRAVENTA, null, LocalDate.of(2024, 3, 12), "2024-00" + codigo.substring(8),
                    LocalDate.of(2024, 3, 1), "Inmobiliaria Ejemplo del Sur S.A.C. adquirió el lote por compraventa.",
                    null, "Inmobiliaria Ejemplo del Sur S.A.C. (100 %)"));
            if (alerta < 3) {
                asientos.add(new AsientoDatos("D00001", TipoActo.HIPOTECA, EstadoAnotacion.VIGENTE,
                        LocalDate.of(2025, 5, 20), null, LocalDate.of(2025, 5, 10),
                        "Hipoteca a favor de una entidad financiera.", null, null));
            } else if (alerta == 3) {
                asientos.add(new AsientoDatos("D00001", TipoActo.EMBARGO, EstadoAnotacion.VIGENTE,
                        LocalDate.of(2025, 8, 4), null, LocalDate.of(2025, 7, 28),
                        "Embargo en forma de inscripción por una deuda comercial.", null, null));
            }
            return new DatosExpediente("Lote urbano inscrito en el Registro de Predios.", Completitud.COMPLETA,
                    LocalDate.of(2026, 11, 1), null, "Zona Registral N.° XI – Sede Ica", "Oficina Registral de Ica",
                    "Ica", area, null, null, asientos, TipoPredio.LOTE, null, List.of(), null);
        }
    }
}
