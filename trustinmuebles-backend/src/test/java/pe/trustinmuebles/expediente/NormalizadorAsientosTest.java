package pe.trustinmuebles.expediente;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.trustinmuebles.clasificacion.EstadoAnotacion;
import pe.trustinmuebles.clasificacion.TipoActo;
import pe.trustinmuebles.expediente.CasoDtos.AsientoDatos;

/** Los estados y la titularidad se derivan de la partida para que nunca se contradigan (decisión D7 y D14). */
class NormalizadorAsientosTest {

    static AsientoDatos c(String ref, String titulares) {
        return new AsientoDatos(ref, TipoActo.COMPRAVENTA, null, null, null, null, "Texto", null, titulares);
    }

    static AsientoDatos d(String ref, TipoActo tipo, EstadoAnotacion estado) {
        return new AsientoDatos(ref, tipo, estado, null, null, null, "Texto", null, null);
    }

    static AsientoDatos e(String ref, String cancela) {
        return new AsientoDatos(ref, TipoActo.CANCELACION, null, null, null, null, "Texto", cancela, null);
    }

    @Test
    @DisplayName("Sin asientos C la titularidad es «desconocido»")
    void sinTitulares() {
        assertThat(NormalizadorAsientos.normalizar(List.of()).titularidad()).isEqualTo("desconocido");
    }

    @Test
    @DisplayName("La titularidad sale del último asiento C")
    void ultimoTitular() {
        var r = NormalizadorAsientos.normalizar(List.of(c("C00002", "Segundo (100 %)"), c("C00001", "Primero (100 %)")));
        assertThat(r.titularidad()).isEqualTo("Segundo (100 %)");
        assertThat(r.asientos()).extracting(AsientoDatos::referencia).containsExactly("C00001", "C00002");
    }

    @Test
    @DisplayName("Un asiento E cancela al D: su estado pasa a CANCELADA aunque se haya enviado VIGENTE")
    void laCancelacionDerivaElEstado() {
        var r = NormalizadorAsientos.normalizar(List.of(d("D00001", TipoActo.HIPOTECA, EstadoAnotacion.VIGENTE),
                e("E00001", "D00001")));
        assertThat(r.asientos().get(0).estado()).isEqualTo(EstadoAnotacion.CANCELADA);
        assertThat(r.asientos().get(1).estado()).as("los asientos E no llevan estado").isNull();
    }

    @Test
    @DisplayName("Un asiento D sin cancelación conserva su estado")
    void sinCancelacionConservaElEstado() {
        var r = NormalizadorAsientos.normalizar(List.of(d("D00001", TipoActo.HIPOTECA, EstadoAnotacion.VIGENTE),
                d("D00002", TipoActo.EMBARGO, EstadoAnotacion.DESCONOCIDO)));
        assertThat(r.asientos()).extracting(AsientoDatos::estado)
                .containsExactly(EstadoAnotacion.VIGENTE, EstadoAnotacion.DESCONOCIDO);
    }

    @Test
    @DisplayName("Un D marcado como cancelado sin un E que lo cancele se rechaza")
    void canceladoSinE() {
        assertThatThrownBy(() -> NormalizadorAsientos.normalizar(
                List.of(d("D00001", TipoActo.HIPOTECA, EstadoAnotacion.CANCELADA))))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("ningún asiento E lo cancela");
    }

    @Test
    @DisplayName("Reglas de cada rubro: titulares en C, estado en D, cancelación válida en E")
    void reglasPorRubro() {
        assertThatThrownBy(() -> NormalizadorAsientos.normalizar(List.of(c("C00001", " "))))
                .hasMessageContaining("debe indicar los titulares");
        assertThatThrownBy(() -> NormalizadorAsientos.normalizar(List.of(d("D00001", TipoActo.HIPOTECA, null))))
                .hasMessageContaining("debe indicar su estado");
        assertThatThrownBy(() -> NormalizadorAsientos.normalizar(List.of(e("E00001", null))))
                .hasMessageContaining("debe indicar qué asiento D cancela");
        assertThatThrownBy(() -> NormalizadorAsientos.normalizar(List.of(e("E00001", "D00007"))))
                .hasMessageContaining("no existe en la partida");
        assertThatThrownBy(() -> NormalizadorAsientos.normalizar(List.of(
                new AsientoDatos("E00001", TipoActo.HIPOTECA, null, null, null, null, null, "D00001", null),
                d("D00001", TipoActo.HIPOTECA, EstadoAnotacion.VIGENTE))))
                .hasMessageContaining("debe ser una cancelación");
        assertThatThrownBy(() -> NormalizadorAsientos.normalizar(List.of(
                new AsientoDatos("D00002", TipoActo.EMBARGO, EstadoAnotacion.VIGENTE, null, null, null, null, "D00001", null),
                d("D00001", TipoActo.HIPOTECA, EstadoAnotacion.VIGENTE))))
                .hasMessageContaining("Solo un asiento del rubro E puede cancelar");
    }

    @Test
    @DisplayName("Un asiento no puede cancelarse dos veces ni repetirse")
    void duplicados() {
        assertThatThrownBy(() -> NormalizadorAsientos.normalizar(List.of(d("D00001", TipoActo.HIPOTECA, EstadoAnotacion.VIGENTE),
                e("E00001", "D00001"), e("E00002", "D00001")))).hasMessageContaining("ya está cancelado");
        assertThatThrownBy(() -> NormalizadorAsientos.normalizar(List.of(c("C00001", "A"), c("C00001", "B"))))
                .hasMessageContaining("repetido");
    }
}
