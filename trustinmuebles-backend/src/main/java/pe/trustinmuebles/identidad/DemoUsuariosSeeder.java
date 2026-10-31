package pe.trustinmuebles.identidad;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Crea las cuentas de prueba que falten, también en una base ya creada (v0.7). Es idempotente: no duplica cuentas ni
 * cambia la contraseña o el rol de las que ya existen. La contraseña viene de APP_SEED_PASSWORD y nunca se guarda en
 * texto plano.
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

    record Cuenta(String codigo, Rol rol) {}

    /** Cuentas de la demostración. Se identifican solo por su código; no guardan nombres, DNI ni teléfonos (I11). */
    static final List<Cuenta> CUENTAS = List.of(new Cuenta("comprador-01", Rol.COMPRADOR),
            new Cuenta("revisor-01", Rol.REVISOR), new Cuenta("especialista-01", Rol.ESPECIALISTA),
            new Cuenta("gestor-01", Rol.GESTOR), new Cuenta("propietario-01", Rol.PROPIETARIO),
            new Cuenta("propietario-02", Rol.PROPIETARIO), new Cuenta("especialista-02", Rol.ESPECIALISTA));

    /**
     * Segundo especialista (v0.7), para la asignación. Perfil ficticio: el nombre dice que es ficticio y la colegiatura
     * lleva el prefijo SIM-, que ningún colegio profesional usa (I11).
     */
    static final String ESPECIALISTA_02_NOMBRE = "Arq. Perfil Ficticio 02";
    static final String ESPECIALISTA_02_ESPECIALIDAD = "Arquitecto";
    static final String ESPECIALISTA_02_COLEGIATURA = "SIM-CAP-0002";

    /** Datos profesionales del especialista de la demostración. Son ficticios y la interfaz los rotula así. */
    static final String ESPECIALISTA_NOMBRE = "Ing. Perfil Ficticio 01";
    static final String ESPECIALISTA_ESPECIALIDAD = "Ingeniero Civil";
    static final String ESPECIALISTA_COLEGIATURA = "CIP N.° SIM-CIP-0001";

    static final String FUNCION_GESTOR = "Asesor comercial";

    @Override
    public void run(ApplicationArguments args) {
        if (!habilitado) return;
        crearCuentasQueFalten();
        auth.completarPerfilProfesional("especialista-01", ESPECIALISTA_NOMBRE, ESPECIALISTA_ESPECIALIDAD,
                ESPECIALISTA_COLEGIATURA);
        auth.completarPerfilProfesional("especialista-02", ESPECIALISTA_02_NOMBRE, ESPECIALISTA_02_ESPECIALIDAD,
                ESPECIALISTA_02_COLEGIATURA);
        auth.completarFuncion("gestor-01", FUNCION_GESTOR);
    }

    private void crearCuentasQueFalten() {
        List<Cuenta> faltan = CUENTAS.stream().filter(c -> !auth.existeCuenta(c.codigo())).toList();
        if (faltan.isEmpty()) return;
        if (password == null || password.length() < 8) {
            throw new IllegalStateException(
                    "Define APP_SEED_PASSWORD (mínimo 8 caracteres) para crear las cuentas de prueba, "
                            + "o desactiva la carga con app.seed.enabled=false.");
        }
        faltan.forEach(c -> auth.crearCuentaDePrueba(c.codigo(), password, c.rol()));
    }
}
