package pe.trustinmuebles.identidad;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Crea las dos cuentas de prueba (comprador-01 y revisor-01) si la base está vacía.
 * La contraseña viene de APP_SEED_PASSWORD y nunca se guarda en texto plano.
 */
@Component
@Order(10)
class DemoUsuariosSeeder implements ApplicationRunner {
    private final AuthService auth;
    private final boolean habilitado;
    private final String password;

    DemoUsuariosSeeder(AuthService auth, @Value("${app.seed.enabled}") boolean habilitado,
            @Value("${app.seed.password}") String password) {
        this.auth = auth;
        this.habilitado = habilitado;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!habilitado || auth.hayUsuarios()) return;
        if (password == null || password.length() < 8) {
            throw new IllegalStateException(
                    "Define APP_SEED_PASSWORD (mínimo 8 caracteres) para crear las cuentas de prueba, "
                            + "o desactiva la carga con app.seed.enabled=false.");
        }
        auth.crearCuentaDePrueba("comprador-01", password, Rol.COMPRADOR);
        auth.crearCuentaDePrueba("revisor-01", password, Rol.REVISOR);
    }
}
