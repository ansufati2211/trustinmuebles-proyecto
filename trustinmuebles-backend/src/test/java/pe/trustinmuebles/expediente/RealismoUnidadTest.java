package pe.trustinmuebles.expediente;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** v1.0 (etapa 6): guía de usos en el servidor, filtro por zonificación, partida oculta, robots y prefijo INT-. */
class RealismoUnidadTest {

    private static CasoDtos.PredioDto lote(String zonificacion, String area) {
        return new CasoDtos.PredioDto(TipoInmueble.LOTE_URBANO, "Lote", "Salas", area == null ? null : new BigDecimal(area),
                null, null, null, null, null, null, EstadoComercial.DISPONIBLE, "Disponible", Independizacion.NO_CONSTA,
                "No consta", null, zonificacion, null);
    }

    private static FiltroPublico filtro(String zonificacion, String uso, String incluir) {
        return FiltroPublico.de(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
                null, zonificacion, uso, incluir, Set.of());
    }

    @Test
    @DisplayName("La guía se lee del contenido y reconoce códigos, alias y variantes")
    void guia() {
        assertThat(UsosLote.codigos()).contains("RDB", "RDM", "RDA", "CV", "CZ", "I1", "I2");
        assertThat(UsosLote.buscar("rdm").codigo()).isEqualTo("RDM");
        assertThat(UsosLote.buscar("R4").codigo()).isEqualTo("RDM");
        assertThat(UsosLote.buscar("RDM-1").codigo()).isEqualTo("RDM");
        assertThat(UsosLote.buscar(" ")).isNull();
        assertThat(UsosLote.buscar("ZZ")).isNull();
        UsosLote.Zona cv = UsosLote.buscar("CV");
        assertThat(UsosLote.permite(cv, UsosLote.Categoria.ALMACEN, new BigDecimal("199.99"))).isFalse();
        assertThat(UsosLote.permite(cv, UsosLote.Categoria.ALMACEN, new BigDecimal("200"))).isTrue();
        assertThat(UsosLote.permite(UsosLote.buscar("RDB"), UsosLote.Categoria.ALMACEN, null)).isFalse();
    }

    @Test
    @DisplayName("Por uso: la zona debe solerlo permitir con el área; sin zonificación, solo si se pide")
    void filtroPorUso() {
        FiltroPublico casa = filtro(null, "CASA", null);
        assertThat(casa.aceptaPredio(lote("RDM", "120"))).isTrue();
        assertThat(casa.aceptaPredio(lote("RDM", "80"))).as("RDM pide 90 m² para casa").isFalse();
        assertThat(casa.aceptaPredio(lote("I1", "500"))).as("industria no es para casa").isFalse();
        assertThat(casa.aceptaPredio(lote(null, "120"))).isFalse();
        assertThat(casa.aceptaPredio(lote("ZZ", "120"))).as("una zona que la guía no conoce").isFalse();
        FiltroPublico conSin = filtro(null, "CASA", "true");
        assertThat(conSin.aceptaPredio(lote(null, "120"))).isTrue();
        assertThat(conSin.aceptaPredio(lote("RDM", "80"))).as("con zona, se sigue exigiendo el uso").isFalse();
        assertThat(filtro(null, null, "true").aceptaPredio(lote(null, null))).as("sin filtro no cambia nada").isTrue();
    }

    @Test
    @DisplayName("Por zonificación: varias separadas por coma, con alias; un código desconocido da error")
    void filtroPorZonificacion() {
        FiltroPublico f = filtro("rdm, CV", null, null);
        assertThat(f.zonificaciones()).containsExactlyInAnyOrder("RDM", "CV");
        assertThat(f.aceptaPredio(lote("R4", "100"))).isTrue();
        assertThat(f.aceptaPredio(lote("CZ", "300"))).isFalse();
        assertThatThrownBy(() -> filtro("XYZ", null, null)).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("zonificacion").hasMessageContaining("RDM");
        assertThatThrownBy(() -> filtro(null, "CASA", "si")).hasMessageContaining("incluirSinZonificacion");
        // La forma anterior (sin los parámetros nuevos) no filtra por zonificación.
        FiltroPublico antes = FiltroPublico.de(null, null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, Set.of());
        assertThat(antes.aceptaPredio(lote(null, null))).isTrue();
    }

    @Test
    @DisplayName("Partida oculta: los primeros 4 caracteres y ••••")
    void partidaOculta() {
        assertThat(ExpedienteService.partidaOculta("11052690")).isEqualTo("1105••••");
        assertThat(ExpedienteService.partidaOculta("INT-99000404")).isEqualTo("INT-••••");
        assertThat(ExpedienteService.partidaOculta("P07")).isEqualTo("P07••••");
        assertThat(ExpedienteService.partidaOculta(null)).isNull();
    }

    @Test
    @DisplayName("Registro interno de cartera: INT- y, para no romper lo anterior, SIM-")
    void codigoInterno() {
        assertThat(ExpedienteService.esCodigoInterno("INT-99000404")).isTrue();
        assertThat(ExpedienteService.esCodigoInterno("SIM-99000404")).isTrue();
        assertThat(ExpedienteService.esCodigoInterno("99000404")).isFalse();
        assertThat(ExpedienteService.FUENTE_SIMULADA).isEqualTo("Registro interno de cartera");
    }

    @Test
    @DisplayName("robots.txt: todo prohibido mientras no sea indexable; indexable, solo la API")
    void robots() {
        assertThat(SitioController.robotsTxt(false)).isEqualTo("User-agent: *\nDisallow: /\n");
        assertThat(SitioController.robotsTxt(true)).contains("Disallow: /api/").doesNotContain("Disallow: /\n");
    }
}
