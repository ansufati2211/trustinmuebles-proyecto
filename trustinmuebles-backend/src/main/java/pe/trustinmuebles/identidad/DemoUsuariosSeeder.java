package pe.trustinmuebles.identidad;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/** Crea los usuarios de demostración (uno por rol) si la base está vacía. */
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
        auth.registrar("Juan Pérez", "juan.perez@demo.pe", password, Rol.COMPRADOR);
        auth.registrar("María Fernandez", "maria.fernandez@demo.pe", password, Rol.GESTOR_LEGAL);
        auth.registrar("Ing. Luis Paredes", "luis.paredes@demo.pe", password, Rol.INSPECTOR);
        auth.registrar("Rosa Huamán", "rosa.huaman@demo.pe", password, Rol.VENDEDOR);
        auth.registrar("Administrador", "admin@demo.pe", password, Rol.ADMIN);
    }
}
