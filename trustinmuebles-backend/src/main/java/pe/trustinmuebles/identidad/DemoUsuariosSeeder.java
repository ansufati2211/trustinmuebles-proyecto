package pe.trustinmuebles.identidad;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Crea las cuentas de prueba (comprador-01, revisor-01 y especialista-01) que falten.
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

    /** Datos profesionales del especialista de la demostración. Son ficticios y la interfaz los rotula así. */
    static final String ESPECIALISTA_NOMBRE = "Ing. Carlos Alberto Mendoza Quispe";
    static final String ESPECIALISTA_ESPECIALIDAD = "Ingeniero Civil";
    static final String ESPECIALISTA_COLEGIATURA = "CIP N.° 248910";

    @Override
    public void run(ApplicationArguments args) {
        if (!habilitado) return;
        crearCuentasQueFalten();
        auth.completarPerfilProfesional("especialista-01", ESPECIALISTA_NOMBRE, ESPECIALISTA_ESPECIALIDAD,
                ESPECIALISTA_COLEGIATURA);
    }

    private void crearCuentasQueFalten() {
        boolean hayCuentas = auth.hayUsuarios();
        // Una base creada antes del rol de especialista solo necesita su cuenta; no se recrean las demás.
        if (hayCuentas && auth.existeCuenta("especialista-01")) return;
        if (password == null || password.length() < 8) {
            throw new IllegalStateException(
                    "Define APP_SEED_PASSWORD (mínimo 8 caracteres) para crear las cuentas de prueba, "
                            + "o desactiva la carga con app.seed.enabled=false.");
        }
        if (!hayCuentas) {
            auth.crearCuentaDePrueba("comprador-01", password, Rol.COMPRADOR);
            auth.crearCuentaDePrueba("revisor-01", password, Rol.REVISOR);
        }
        auth.crearCuentaDePrueba("especialista-01", password, Rol.ESPECIALISTA);
    }
}
