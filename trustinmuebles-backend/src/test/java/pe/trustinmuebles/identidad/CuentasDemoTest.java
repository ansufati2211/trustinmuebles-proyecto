package pe.trustinmuebles.identidad;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import pe.trustinmuebles.BaseApiTest;

/** v0.7: cuentas de gestor y propietarios, creadas aunque la base ya exista, sin duplicar ni pisar datos. */
class CuentasDemoTest extends BaseApiTest {
    @Autowired DemoUsuariosSeeder seeder;

    @Test
    @DisplayName("Existen gestor-01 (asesor comercial), propietario-01 y propietario-02 con sus roles")
    void cuentasNuevas() throws Exception {
        mvc.perform(get("/api/v1/auth/me").header("Authorization", gestor())).andExpect(status().isOk())
                .andExpect(jsonPath("$.rol").value("GESTOR"))
                .andExpect(jsonPath("$.funcion").value("Asesor comercial"));
        mvc.perform(get("/api/v1/auth/me").header("Authorization", propietario(1)))
                .andExpect(jsonPath("$.rol").value("PROPIETARIO"));
        mvc.perform(get("/api/v1/auth/me").header("Authorization", propietario(2)))
                .andExpect(jsonPath("$.rol").value("PROPIETARIO"));
    }

    @Test
    @DisplayName("Volver a cargar no duplica cuentas ni cambia sus contraseñas; una cuenta que falta se vuelve a crear")
    void cargaIdempotente() throws Exception {
        String hashRevisor = jdbc.queryForObject("select password_hash from usuario where codigo_cuenta = 'revisor-01'",
                String.class);
        seeder.run(new DefaultApplicationArguments());
        assertThat(jdbc.queryForObject("select count(*) from usuario", Integer.class)).isEqualTo(CUENTAS_DEMO);
        assertThat(jdbc.queryForObject("select password_hash from usuario where codigo_cuenta = 'revisor-01'",
                String.class)).as("no se pisa una cuenta existente").isEqualTo(hashRevisor);

        // Base ya creada a la que le falta una cuenta (por ejemplo, una base de la v0.6 sin propietarios).
        jdbc.update("delete from usuario where codigo_cuenta = 'propietario-02'");
        assertThat(jdbc.queryForObject("select count(*) from usuario", Integer.class)).isEqualTo(CUENTAS_DEMO - 1);
        seeder.run(new DefaultApplicationArguments());
        assertThat(jdbc.queryForObject("select count(*) from usuario where codigo_cuenta = 'propietario-02' "
                + "and rol = 'PROPIETARIO'", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from usuario", Integer.class)).isEqualTo(CUENTAS_DEMO);
        mvc.perform(get("/api/v1/auth/me").header("Authorization", propietario(2))).andExpect(status().isOk());
    }

    @Test
    @DisplayName("I11: las cuentas de gestor y propietarios no guardan nombres, DNI ni datos profesionales")
    void sinDatosPersonales() {
        assertThat(jdbc.queryForObject("select count(*) from usuario where rol in ('GESTOR', 'PROPIETARIO') "
                + "and (nombre_completo is not null or colegiatura is not null)", Integer.class)).isZero();
    }
}
