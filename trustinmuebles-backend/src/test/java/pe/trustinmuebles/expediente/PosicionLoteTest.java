package pe.trustinmuebles.expediente;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.trustinmuebles.expediente.CasoDtos.PredioDto;

class PosicionLoteTest {
    static final Set<String> ALERTAS = Set.of("RP-01", "INFORMACION_INSUFICIENTE");

    static PredioDto predio(String posicion) {
        BigDecimal p = new BigDecimal("1000");
        return new PredioDto(TipoInmueble.LOTE_URBANO, "Lote", "Ica", p, null, p, "PEN", null, p, null,
                EstadoComercial.DISPONIBLE, "Disponible", Independizacion.NO_CONSTA, "No consta", "", null, null, posicion);
    }

    static FiltroPublico filtro(String posicion) {
        return FiltroPublico.de(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, posicion, ALERTAS);
    }

    @Test
    @DisplayName("Las posiciones se leen con varias formas de escribirlas y se guardan en orden fijo")
    void lectura() {
        assertThat(PosicionLote.codificar(PosicionLote.leer("Frente al Parque + esquina", "+|/"))).isEqualTo("ESQUINA+PARQUE");
        assertThat(PosicionLote.codificar(PosicionLote.leer("avenida", "+|/"))).isEqualTo("AVENIDA");
        assertThat(PosicionLote.codificar(PosicionLote.leer("", "+|/"))).isNull();
        assertThatThrownBy(() -> PosicionLote.leer("rincon", "+|/")).isInstanceOf(IllegalArgumentException.class);
        assertThat(PosicionLote.decodificar("ESQUINA+PARQUE")).containsExactly(PosicionLote.ESQUINA, PosicionLote.PARQUE);
        assertThat(PosicionLote.decodificar(null)).isEmpty();
    }

    @Test
    @DisplayName("Filtrar por posición deja los lotes que la tienen; un lote sin dato no entra, y sin filtro entran todos")
    void filtro() {
        FiltroPublico esquina = filtro("esquina");
        assertThat(esquina.aceptaPredio(predio("ESQUINA+PARQUE"))).isTrue();
        assertThat(esquina.aceptaPredio(predio("PARQUE"))).isFalse();
        assertThat(esquina.aceptaPredio(predio(null))).as("sin dato").isFalse();
        assertThat(filtro("parque,avenida").aceptaPredio(predio("AVENIDA"))).isTrue();
        FiltroPublico ninguno = filtro(null);
        assertThat(ninguno.aceptaPredio(predio(null))).isTrue();
        assertThat(ninguno.aceptaPredio(predio("ESQUINA"))).isTrue();
        assertThatThrownBy(() -> filtro("rincon")).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("posicion");
    }
}
