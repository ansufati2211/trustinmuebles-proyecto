package pe.trustinmuebles.expediente;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.test.context.TestPropertySource;
import pe.trustinmuebles.BaseApiTest;
import pe.trustinmuebles.expediente.ProyectosSeeder.PreciosZona;
import pe.trustinmuebles.expediente.ProyectosSeeder.Rango;
import tools.jackson.databind.JsonNode;

/**
 * v1.0 (etapa 8): precios de mercado por rango de distrito. Base H2 propia porque reescribe precios de lotes y vuelve a
 * correr el ajuste de una base existente.
 */
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:precios-${random.uuid};MODE=PostgreSQL;"
        + "DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1")
class PreciosZonaTest extends BaseApiTest {
    static final String VENTISCA = "altos-de-ventisca";

    @Autowired
    ProyectosSeeder seeder;

    @Autowired
    LoteProyectoRepository lotes;

    PreciosZona precios() throws Exception {
        return json.readValue(new ClassPathResource("contenido/precios-zona.json").getInputStream(), PreciosZona.class);
    }

    @Test
    @DisplayName("precios-zona.json: rangos de Ica, Subtanjalla, La Tinguiña, Los Aquijes y Salas, S/ 500 y 8 % en esquina")
    void rangos() throws Exception {
        JsonNode p = json.readTree(new ClassPathResource("contenido/precios-zona.json").getInputStream());
        Map<String, int[]> esperado = Map.of("Ica", new int[] {800, 900}, "Subtanjalla", new int[] {450, 650},
                "La Tinguiña", new int[] {350, 500}, "Los Aquijes", new int[] {300, 450}, "Salas", new int[] {250, 400});
        assertThat(p.get("rangoPorM2").size()).isEqualTo(esperado.size());
        esperado.forEach((distrito, r) -> {
            assertThat(p.get("rangoPorM2").get(distrito).get("min").asInt()).as(distrito).isEqualTo(r[0]);
            assertThat(p.get("rangoPorM2").get(distrito).get("max").asInt()).as(distrito).isEqualTo(r[1]);
        });
        assertThat(p.get("moneda").asString()).isEqualTo("PEN");
        assertThat(p.get("redondeo").asInt()).isEqualTo(500);
        assertThat(p.get("recargoEsquina").decimalValue()).isEqualByComparingTo("0.08");
        // La fuente y lo estimado se documentan en decisiones.md, no en el contenido que ve el público.
        assertThat(p.get("nota").asString()).doesNotContainIgnoringCase("urbania");
    }

    @Test
    @DisplayName("Base nueva: todos los lotes precargados están en su rango, en múltiplos de S/ 500, y el ajuste queda marcado")
    void baseNueva() throws Exception {
        PreciosZona pz = precios();
        for (String codigo : new String[] {VENTISCA, "rinconada-del-lucumo", "terrazas-de-sauzal"}) {
            for (LoteProyecto l : lotes.findDelProyecto(codigo)) {
                Rango r = pz.rangoPorM2().get(l.getProyecto().getDistrito());
                assertThat(l.getPrecio().remainder(BigDecimal.valueOf(500))).as(l.clave()).isEqualByComparingTo("0");
                assertThat(l.getPrecio()).as(l.clave()).isBetween(
                        l.getAreaM2().multiply(r.min()).subtract(BigDecimal.valueOf(250)),
                        l.getAreaM2().multiply(r.max()).multiply(new BigDecimal("1.08")).add(BigDecimal.valueOf(250)));
            }
        }
        assertThat(jdbc.queryForObject("select count(*) from ajuste_contenido where clave = ?", Integer.class,
                ProyectosSeeder.AJUSTE_PRECIOS)).isEqualTo(1);
    }

    @Test
    @DisplayName("Base existente: solo cambian los lotes que nadie editó (precio anterior y sin historial de CSV), una vez")
    void baseExistente() throws Exception {
        PreciosZona pz = precios();
        Rango subtanjalla = pz.rangoPorM2().get("Subtanjalla");
        BigDecimal anteriorM2 = ProyectosSeeder.PRECIO_M2_ANTERIOR.get("Subtanjalla");
        LoteProyecto sinEditar = lotes.findLote(VENTISCA, "A", 2).orElseThrow();
        LoteProyecto porCsv = lotes.findLote(VENTISCA, "A", 3).orElseThrow();
        LoteProyecto aMano = lotes.findLote(VENTISCA, "A", 4).orElseThrow();
        BigDecimal[] originales = {sinEditar.getPrecio(), porCsv.getPrecio(), aMano.getPrecio()};
        try {
            // Como en una base de la etapa 7: precios de la fórmula anterior, un lote tocado por CSV y otro con precio propio.
            sinEditar.setPrecio(ProyectosSeeder.precioDe(sinEditar.getAreaM2(), anteriorM2));
            porCsv.setPrecio(ProyectosSeeder.precioDe(porCsv.getAreaM2(), anteriorM2));
            aMano.setPrecio(new BigDecimal("31234.00"));
            lotes.saveAllAndFlush(java.util.List.of(sinEditar, porCsv, aMano));
            jdbc.update("insert into historial_lote_proyecto (proyecto_codigo, lote_clave, accion, origen, cambios, "
                    + "carga_id, cuenta_codigo, registrada_en) values (?, 'A-3', 'ACTUALIZADO', 'CSV', 'precio', 'x', "
                    + "'asesor-01', ?)", VENTISCA, Timestamp.from(Instant.now()));
            jdbc.update("delete from ajuste_contenido where clave = ?", ProyectosSeeder.AJUSTE_PRECIOS);

            seeder.run(null);

            BigDecimal nuevo = ProyectosSeeder.precioEnRango(sinEditar.getAreaM2(), subtanjalla, "A", 2,
                    ProyectosSeeder.esEsquina(12, 2), pz);
            assertThat(lotes.findLote(VENTISCA, "A", 2).orElseThrow().getPrecio()).isEqualByComparingTo(nuevo);
            assertThat(lotes.findLote(VENTISCA, "A", 3).orElseThrow().getPrecio()).as("editado por CSV")
                    .isEqualByComparingTo(ProyectosSeeder.precioDe(porCsv.getAreaM2(), anteriorM2));
            assertThat(lotes.findLote(VENTISCA, "A", 4).orElseThrow().getPrecio()).as("precio propio")
                    .isEqualByComparingTo("31234");

            // Una segunda vez no hace nada: el ajuste ya quedó marcado.
            LoteProyecto otra = lotes.findLote(VENTISCA, "A", 2).orElseThrow();
            otra.setPrecio(ProyectosSeeder.precioDe(otra.getAreaM2(), anteriorM2));
            lotes.saveAndFlush(otra);
            seeder.run(null);
            assertThat(lotes.findLote(VENTISCA, "A", 2).orElseThrow().getPrecio())
                    .isEqualByComparingTo(ProyectosSeeder.precioDe(otra.getAreaM2(), anteriorM2));
        } finally {
            jdbc.update("delete from historial_lote_proyecto where proyecto_codigo = ? and carga_id = 'x'", VENTISCA);
            int i = 0;
            for (int n : new int[] {2, 3, 4}) {
                LoteProyecto l = lotes.findLote(VENTISCA, "A", n).orElseThrow();
                l.setPrecio(originales[i++]);
                lotes.saveAndFlush(l);
            }
        }
    }
}
