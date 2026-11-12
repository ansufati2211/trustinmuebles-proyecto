package pe.trustinmuebles.expediente;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.trustinmuebles.expediente.CasoDtos.PredioDto;
import pe.trustinmuebles.expediente.FiltroPublico.Candidato;

class FiltroPublicoTest {
    static final Set<String> ALERTAS = Set.of("RP-01", "INFORMACION_INSUFICIENTE");

    static FiltroPublico filtro(String orden, String sentido) {
        return FiltroPublico.de(null, null, null, null, null, null, null, null, null, null, null, null, null, orden,
                sentido, ALERTAS);
    }

    static Candidato candidato(long id, String codigo, String precio, String moneda, String area) {
        CasoLote c = new CasoLote();
        c.setId(id);
        c.setCodigo(codigo);
        BigDecimal p = precio == null ? null : new BigDecimal(precio), a = area == null ? null : new BigDecimal(area);
        c.setPrecioReferencial(p);
        PredioDto predio = new PredioDto(TipoInmueble.LOTE_URBANO, "Lote", "Ica", a, null, p, moneda, null,
                FiltroPublico.precioPorM2(p, a), null, EstadoComercial.DISPONIBLE, "Disponible",
                Independizacion.NO_CONSTA, "No consta", "");
        return new Candidato(null, c, predio);
    }

    static List<String> ordenar(FiltroPublico f, Candidato... cs) {
        List<Candidato> l = new ArrayList<>(List.of(cs));
        l.sort(f.comparador());
        return l.stream().map(c -> c.caso().getCodigo()).toList();
    }

    @Test
    @DisplayName("El precio por m² es precio entre área con dos decimales, y no existe si falta uno de los dos")
    void precioPorM2() {
        assertThat(FiltroPublico.precioPorM2(new BigDecimal("75000"), new BigDecimal("162"))).isEqualByComparingTo("462.96");
        assertThat(FiltroPublico.precioPorM2(null, new BigDecimal("162"))).isNull();
        assertThat(FiltroPublico.precioPorM2(new BigDecimal("75000"), null)).isNull();
        assertThat(FiltroPublico.precioPorM2(new BigDecimal("75000"), BigDecimal.ZERO)).isNull();
    }

    @Test
    @DisplayName("Sin precio o sin área, el inmueble va al final en los dos sentidos")
    void nulosAlFinal() {
        Candidato a = candidato(1, "A", "100000", "PEN", "100"), b = candidato(2, "B", "50000", "PEN", "200"),
                sinPrecio = candidato(3, "SP", null, null, "150"), sinArea = candidato(4, "SA", "70000", "PEN", null);
        assertThat(ordenar(filtro("precio", "asc"), sinPrecio, a, b, sinArea)).containsExactly("B", "SA", "A", "SP");
        assertThat(ordenar(filtro("precio", "desc"), sinPrecio, a, b, sinArea)).containsExactly("A", "SA", "B", "SP");
        assertThat(ordenar(filtro("area", "asc"), sinArea, a, b, sinPrecio)).containsExactly("A", "SP", "B", "SA");
        assertThat(ordenar(filtro("area", "desc"), sinArea, a, b, sinPrecio)).containsExactly("B", "SP", "A", "SA");
        // precio por m²: A = 1000, B = 250, SA y SP no tienen
        assertThat(ordenar(filtro("precioM2", "asc"), sinArea, a, b, sinPrecio)).containsExactly("B", "A", "SA", "SP");
        assertThat(ordenar(filtro("precioM2", "desc"), sinArea, a, b, sinPrecio)).containsExactly("A", "B", "SA", "SP");
    }

    @Test
    @DisplayName("Con precios en soles y dólares y sin moneda elegida, los soles van antes y no se compara 100 USD con 100 PEN")
    void monedasNoSeMezclan() {
        Candidato pen = candidato(1, "PEN", "90000", "PEN", "100"), usd = candidato(2, "USD", "20000", "USD", "100");
        assertThat(ordenar(filtro("precio", "asc"), usd, pen)).containsExactly("PEN", "USD");
        assertThat(ordenar(filtro("precio", "desc"), usd, pen)).containsExactly("USD", "PEN");
    }

    @Test
    @DisplayName("Empates: se desempata por código, y la novedad empieza por el caso más nuevo")
    void empates() {
        Candidato x = candidato(1, "X", "1", "PEN", "100"), y = candidato(2, "Y", "1", "PEN", "100");
        assertThat(ordenar(filtro("precio", "asc"), y, x)).containsExactly("X", "Y");
        assertThat(ordenar(filtro(null, null), x, y)).containsExactly("Y", "X");
        assertThat(ordenar(filtro("novedad", "asc"), y, x)).containsExactly("X", "Y");
    }

    @Test
    @DisplayName("Un filtro de precio sin moneda se entiende en soles; sin filtro de precio la moneda no se impone")
    void monedaPorOmision() {
        FiltroPublico f = FiltroPublico.de(null, null, null, null, null, "10", null, null, null, null, null, null, null,
                null, null, ALERTAS);
        assertThat(f.moneda()).isEqualTo("PEN");
        assertThat(filtro(null, null).moneda()).isNull();
        FiltroPublico usd = FiltroPublico.de(null, null, null, null, "usd", "10", null, null, null, null, null, null,
                null, null, null, ALERTAS);
        assertThat(usd.moneda()).isEqualTo("USD");
    }

    @Test
    @DisplayName("Los valores no válidos se rechazan con un mensaje que dice cuál parámetro y qué se acepta")
    void validacion() {
        assertThatThrownBy(() -> filtro("barato", null)).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("orden");
        assertThatThrownBy(() -> filtro("precio", "up")).hasMessageContaining("sentido");
        assertThatThrownBy(() -> FiltroPublico.de(null, null, "casa", null, null, null, null, null, null, null, null,
                null, null, null, null, ALERTAS)).hasMessageContaining("tipo").hasMessageContaining("LOTE_URBANO");
        assertThatThrownBy(() -> FiltroPublico.de(null, null, null, null, null, null, null, null, null, null, null,
                null, "RX-9", null, null, ALERTAS)).hasMessageContaining("RP-01");
        assertThatThrownBy(() -> FiltroPublico.de(null, null, null, null, null, "9", "1", null, null, null, null, null,
                null, null, null, ALERTAS)).hasMessageContaining("precioMin no puede ser mayor que precioMax");
    }
}
