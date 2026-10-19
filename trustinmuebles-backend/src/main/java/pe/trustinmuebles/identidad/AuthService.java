package pe.trustinmuebles.identidad;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.trustinmuebles.shared.NoEncontradoException;
import pe.trustinmuebles.shared.ReglaNegocioException;

/** API pública del módulo de identidad (autenticación y directorio de cuentas de prueba). */
@Service
@Transactional
public class AuthService {
    public record Sesion(String token, UsuarioDto usuario) {}

    private final UsuarioRepository repo;
    private final PasswordEncoder encoder;
    private final JwtEncoder jwtEncoder;
    private final long ttlHoras;
    /** Hash ficticio para gastar el mismo tiempo cuando la cuenta no existe. */
    private final String hashFicticio;

    AuthService(UsuarioRepository repo, PasswordEncoder encoder, JwtEncoder jwtEncoder,
            @Value("${app.jwt.ttl-hours}") long ttlHoras) {
        this.repo = repo;
        this.encoder = encoder;
        this.jwtEncoder = jwtEncoder;
        this.ttlHoras = ttlHoras;
        this.hashFicticio = encoder.encode("contraseña-ficticia");
    }

    /** Crea una cuenta de prueba. No se expone por HTTP: el registro abierto está fuera del alcance (1.7). */
    public UsuarioDto crearCuentaDePrueba(String codigoCuenta, String password, Rol rol) {
        if (repo.findByCodigoCuenta(codigoCuenta).isPresent()) {
            throw new ReglaNegocioException("Ya existe la cuenta " + codigoCuenta);
        }
        Usuario u = new Usuario();
        u.setCodigoCuenta(codigoCuenta);
        u.setPasswordHash(encoder.encode(password));
        u.setRol(rol);
        return UsuarioDto.de(repo.save(u));
    }

    @Transactional(readOnly = true)
    public Sesion login(String codigoCuenta, String password) {
        Usuario u = repo.findByCodigoCuenta(codigoCuenta).orElse(null);
        boolean ok = encoder.matches(password, u == null ? hashFicticio : u.getPasswordHash());
        if (u == null || !ok) throw new BadCredentialsException("Código de cuenta o contraseña incorrectos");
        return sesion(u);
    }

    @Transactional(readOnly = true)
    public UsuarioDto obtener(Long id) {
        return repo.findById(id).map(UsuarioDto::de).orElseThrow(() -> new NoEncontradoException("Usuario", id));
    }

    /** Revisor responsable del registro de los casos cargados. */
    @Transactional(readOnly = true)
    public Optional<UsuarioDto> primerRevisor() {
        return repo.findFirstByRolOrderByIdAsc(Rol.REVISOR).map(UsuarioDto::de);
    }

    /** Datos profesionales de una cuenta, si los tiene. Los usa el módulo de inspección para firmar el informe. */
    @Transactional(readOnly = true)
    public Optional<PerfilProfesional> perfilProfesional(Long usuarioId) {
        return repo.findById(usuarioId).flatMap(AuthService::perfil);
    }

    @Transactional(readOnly = true)
    public Optional<PerfilProfesional> perfilProfesional(String codigoCuenta) {
        return repo.findByCodigoCuenta(codigoCuenta).flatMap(AuthService::perfil);
    }

    /** Completa los datos profesionales de una cuenta de prueba que aún no los tiene. No pisa datos existentes. */
    public void completarPerfilProfesional(String codigoCuenta, String nombre, String especialidad, String colegiatura) {
        repo.findByCodigoCuenta(codigoCuenta).filter(u -> u.getNombreCompleto() == null).ifPresent(u -> {
            u.setNombreCompleto(nombre);
            u.setEspecialidad(especialidad);
            u.setColegiatura(colegiatura);
        });
    }

    private static Optional<PerfilProfesional> perfil(Usuario u) {
        if (u.getNombreCompleto() == null || u.getColegiatura() == null) return Optional.empty();
        return Optional.of(new PerfilProfesional(u.getCodigoCuenta(), u.getNombreCompleto(), u.getEspecialidad(),
                u.getColegiatura()));
    }

    @Transactional(readOnly = true)
    public boolean hayUsuarios() {
        return repo.count() > 0;
    }

    @Transactional(readOnly = true)
    public boolean existeCuenta(String codigoCuenta) {
        return repo.findByCodigoCuenta(codigoCuenta).isPresent();
    }

    private Sesion sesion(Usuario u) {
        Instant ahora = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("trustinmuebles")
                .subject(String.valueOf(u.getId()))
                .issuedAt(ahora)
                .expiresAt(ahora.plus(ttlHoras, ChronoUnit.HOURS))
                .claim("codigo", u.getCodigoCuenta())
                .claim("rol", u.getRol().name())
                .build();
        String token = jwtEncoder
                .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
        return new Sesion(token, UsuarioDto.de(u));
    }
}
