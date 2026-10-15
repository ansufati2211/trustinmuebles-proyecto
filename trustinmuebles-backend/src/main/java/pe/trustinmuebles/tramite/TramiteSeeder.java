package pe.trustinmuebles.tramite;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import pe.trustinmuebles.identidad.AuthService;
import pe.trustinmuebles.identidad.UsuarioActual;
import pe.trustinmuebles.identidad.UsuarioDto;

/** Datos demo: Juan Pérez tiene una compra finalizada (San Isidro) y otra pendiente de firma (Surco). */
@Component
@Order(30)
class TramiteSeeder implements ApplicationRunner {
    private final TramiteService tramites;
    private final AuthService auth;
    private final boolean habilitado;

    TramiteSeeder(TramiteService tramites, AuthService auth, @Value("${app.seed.enabled}") boolean habilitado) {
        this.tramites = tramites;
        this.auth = auth;
        this.habilitado = habilitado;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!habilitado || tramites.contar() > 0) return;
        UsuarioDto juan = auth.buscarPorEmail("juan.perez@demo.pe").orElse(null);
        UsuarioDto maria = auth.buscarPorEmail("maria.fernandez@demo.pe").orElse(null);
        if (juan == null || maria == null) return;
        UsuarioActual comprador = new UsuarioActual(juan.id(), juan.email(), juan.rol());
        UsuarioActual gestora = new UsuarioActual(maria.id(), maria.email(), maria.rol());

        Long finalizada = tramites.crear(1L, comprador).id();
        for (EtapaTramite e : new EtapaTramite[] { EtapaTramite.AUDITORIA_APROBADA, EtapaTramite.FIRMA_MINUTA }) {
            tramites.cambiarEtapa(finalizada, e, gestora);
        }
        Long minuta = tramites.detalle(finalizada, comprador).documentos().stream()
                .filter(d -> d.tipo().equals("MINUTA")).findFirst().orElseThrow().id();
        tramites.firmar(minuta, comprador);
        tramites.cambiarEtapa(finalizada, EtapaTramite.FINALIZADA, gestora);

        Long enCurso = tramites.crear(3L, comprador).id();
        tramites.cambiarEtapa(enCurso, EtapaTramite.AUDITORIA_APROBADA, gestora);
        tramites.cambiarEtapa(enCurso, EtapaTramite.FIRMA_MINUTA, gestora);
    }
}
