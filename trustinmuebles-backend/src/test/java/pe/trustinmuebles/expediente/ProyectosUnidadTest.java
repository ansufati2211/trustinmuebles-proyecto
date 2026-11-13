package pe.trustinmuebles.expediente;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.trustinmuebles.expediente.FiltroPublico.Candidato;

/** v1.0 (etapa 3a): piezas sin base de datos de los proyectos y del catálogo unido. */
class ProyectosUnidadTest {

    @Test
    @DisplayName("El código del proyecto es el nombre en minúsculas, sin tildes y con guiones")
    void codigoDelProyecto() {
        assertThat(CodigoProyecto.de("Campiña del Olivar")).isEqualTo("campina-del-olivar");
        assertThat(CodigoProyecto.de("  Rinconada del Lúcumo ")).isEqualTo("rinconada-del-lucumo");
        assertThat(CodigoProyecto.de("Mz. «Ñ» / Etapa 2")).isEqualTo("mz-n-etapa-2");
        assertThat(CodigoProyecto.de("¡¡!!")).isEmpty();
        assertThat(CodigoProyecto.de(null)).isEmpty();
    }

    @Test
    @DisplayName("Reparto de estados: 15 % vendidos y 25 % separados, el resto disponibles, siempre igual con la misma semilla")
    void repartoDeEstados() {
        for (int n : new int[] {40, 44, 56, 68, 70}) {
            List<EstadoComercial> e = ProyectosSeeder.repartoDeEstados(n, new Random(7));
            assertThat(e).hasSize(n);
            assertThat(e.stream().filter(x -> x == EstadoComercial.VENDIDO).count()).isEqualTo(Math.round(n * 0.15));
            assertThat(e.stream().filter(x -> x == EstadoComercial.SEPARADO).count()).isEqualTo(Math.round(n * 0.25));
            assertThat(e).isEqualTo(ProyectosSeeder.repartoDeEstados(n, new Random(7)));
        }
    }

    @Test
    @DisplayName("Precio del lote: área por precio por m² del distrito, redondeado a la centena")
    void precioDelLote() {
        assertThat(ProyectosSeeder.precioDe(new BigDecimal("140.00"), new BigDecimal("250"))).isEqualByComparingTo("35000");
        assertThat(ProyectosSeeder.precioDe(new BigDecimal("166.25"), new BigDecimal("250"))).isEqualByComparingTo("41600");
        assertThat(ProyectosSeeder.precioDe(new BigDecimal("161.50"), new BigDecimal("300"))).isEqualByComparingTo("48500");
    }

    @Test
    @DisplayName("Etapa 8: valor por m² determinista dentro del rango, +8 % en esquina y redondeo a S/ 500")
    void precioEnRango() {
        ProyectosSeeder.Rango r = new ProyectosSeeder.Rango(new BigDecimal("450"), new BigDecimal("650"));
        ProyectosSeeder.PreciosZona pz = new ProyectosSeeder.PreciosZona("PEN", null, new BigDecimal("500"),
                new BigDecimal("0.08"), java.util.Map.of("Subtanjalla", r));
        java.util.Set<BigDecimal> valores = new java.util.HashSet<>();
        for (String mz : new String[] {"A", "B", "C", "D", "E"}) {
            for (int n = 1; n <= 14; n++) {
                BigDecimal v = ProyectosSeeder.valorM2(r, mz, n);
                assertThat(v).isBetween(r.min(), r.max());
                assertThat(v).isEqualByComparingTo(ProyectosSeeder.valorM2(r, mz, n));
                valores.add(v.stripTrailingZeros());
                BigDecimal p = ProyectosSeeder.precioEnRango(new BigDecimal("140.00"), r, mz, n, false, pz);
                assertThat(p.remainder(BigDecimal.valueOf(500))).isEqualByComparingTo("0");
            }
        }
        assertThat(valores.size()).as("los lotes no tienen todos el mismo valor").isGreaterThan(5);
        // A-1: escalón (0 × 7 + 1 × 3) mod 11 = 3 → 450 + 200 × 0.3 = 510 por m².
        assertThat(ProyectosSeeder.valorM2(r, "A", 1)).isEqualByComparingTo("510");
        // 140 m² × 510 = 71 400 → 71 500; en esquina × 1.08 = 77 112 → 77 000.
        assertThat(ProyectosSeeder.precioEnRango(new BigDecimal("140"), r, "A", 1, false, pz)).isEqualByComparingTo("71500");
        assertThat(ProyectosSeeder.precioEnRango(new BigDecimal("140"), r, "A", 1, true, pz)).isEqualByComparingTo("77000");
        assertThat(ProyectosSeeder.esEsquina(12, 1)).isTrue();
        assertThat(ProyectosSeeder.esEsquina(12, 6)).isTrue();
        assertThat(ProyectosSeeder.esEsquina(12, 7)).isTrue();
        assertThat(ProyectosSeeder.esEsquina(12, 12)).isTrue();
        assertThat(ProyectosSeeder.esEsquina(12, 2)).isFalse();
    }

    @Test
    @DisplayName("Clase del catálogo: CASO o LOTE_PROYECTO; sin ella entran los dos; otro valor da error")
    void clase() {
        FiltroPublico todos = FiltroPublico.de(null, null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, Set.of());
        assertThat(todos.incluye(FiltroPublico.Clase.CASO)).isTrue();
        assertThat(todos.incluye(FiltroPublico.Clase.LOTE_PROYECTO)).isTrue();
        FiltroPublico lotes = FiltroPublico.de(null, null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, "lote_proyecto", Set.of());
        assertThat(lotes.incluye(FiltroPublico.Clase.CASO)).isFalse();
        assertThat(lotes.incluye(FiltroPublico.Clase.LOTE_PROYECTO)).isTrue();
        assertThatThrownBy(() -> FiltroPublico.de(null, null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, "casas", Set.of())).hasMessageContaining("clase").hasMessageContaining("LOTE_PROYECTO");
    }

    @Test
    @DisplayName("Novedad: casos y lotes se ordenan juntos por fecha de alta, y los dos sentidos son espejo")
    void novedadMezclada() {
        Proyecto p = new Proyecto();
        p.setCodigo("p");
        Instant t = Instant.parse("2026-11-01T00:00:00Z");
        List<Candidato> l = new ArrayList<>();
        l.add(caso(1, "C1", t));
        l.add(lote(p, 1, "A", 1, t.plusSeconds(10)));
        l.add(caso(2, "C2", t.plusSeconds(20)));
        l.add(lote(p, 2, "A", 2, t.plusSeconds(10))); // misma fecha que el lote 1: desempata por id
        l.add(caso(3, "C3", t.plusSeconds(10))); // misma fecha: los casos antes que los lotes
        FiltroPublico desc = FiltroPublico.de(null, null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, Set.of());
        FiltroPublico asc = FiltroPublico.de(null, null, null, null, null, null, null, null, null, null, null, null,
                null, "novedad", "asc", Set.of());
        List<String> a = ordenar(l, asc);
        assertThat(a).containsExactly("C1", "C3", "p-A-1", "p-A-2", "C2");
        assertThat(ordenar(l, desc)).isEqualTo(a.reversed());
    }

    static List<String> ordenar(List<Candidato> l, FiltroPublico f) {
        List<Candidato> copia = new ArrayList<>(l);
        copia.sort(f.comparador());
        return copia.stream().map(Candidato::codigo).toList();
    }

    static Candidato caso(long id, String codigo, Instant alta) {
        CasoLote c = new CasoLote();
        c.setId(id);
        c.setCodigo(codigo);
        c.setCreadoEn(alta);
        return new Candidato(null, c, null);
    }

    static Candidato lote(Proyecto p, long id, String manzana, int numero, Instant alta) {
        LoteProyecto l = new LoteProyecto();
        l.setId(id);
        l.setProyecto(p);
        l.setManzana(manzana);
        l.setNumero(numero);
        l.setCreadoEn(alta);
        return Candidato.deLote(l, null, null);
    }
}
