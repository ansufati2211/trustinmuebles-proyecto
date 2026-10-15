package pe.trustinmuebles.identidad;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
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

/** API pública del módulo de identidad (autenticación y directorio de usuarios). */
@Service
@Transactional
public class AuthService {
    public record Sesion(String token, UsuarioDto usuario) {}

    private final UsuarioRepository repo;
    private final PasswordEncoder encoder;
    private final JwtEncoder jwtEncoder;
    private final long ttlHoras;
    /** Hash ficticio para gastar el mismo tiempo cuando el correo no existe. */
    private final String hashFicticio;

    AuthService(UsuarioRepository repo, PasswordEncoder encoder, JwtEncoder jwtEncoder,
            @Value("${app.jwt.ttl-hours}") long ttlHoras) {
        this.repo = repo;
        this.encoder = encoder;
        this.jwtEncoder = jwtEncoder;
        this.ttlHoras = ttlHoras;
        this.hashFicticio = encoder.encode("contraseña-ficticia");
    }

    public Sesion registrar(String nombre, String email, String password) {
        return registrar(nombre, email, password, Rol.COMPRADOR);
    }

    public Sesion registrar(String nombre, String email, String password, Rol rol) {
        if (repo.findByEmailIgnoreCase(email).isPresent()) {
            throw new ReglaNegocioException("Ya existe una cuenta con ese correo");
        }
        Usuario u = new Usuario();
        u.setNombre(nombre);
        u.setEmail(email.toLowerCase());
        u.setPasswordHash(encoder.encode(password));
        u.setRol(rol);
        return sesion(repo.save(u));
    }

    @Transactional(readOnly = true)
    public Sesion login(String email, String password) {
        Usuario u = repo.findByEmailIgnoreCase(email).orElse(null);
        boolean ok = encoder.matches(password, u == null ? hashFicticio : u.getPasswordHash());
        if (u == null || !ok) throw new BadCredentialsException("Correo o contraseña incorrectos");
        return sesion(u);
    }

    @Transactional(readOnly = true)
    public UsuarioDto obtener(Long id) {
        return repo.findById(id).map(UsuarioDto::de).orElseThrow(() -> new NoEncontradoException("Usuario", id));
    }

    @Transactional(readOnly = true)
    public Optional<UsuarioDto> buscarPorEmail(String email) {
        return repo.findByEmailIgnoreCase(email).map(UsuarioDto::de);
    }

    /** Gestor legal asignado por defecto a las nuevas transacciones. */
    @Transactional(readOnly = true)
    public Optional<UsuarioDto> primerGestor() {
        return repo.findFirstByRolOrderByIdAsc(Rol.GESTOR_LEGAL).map(UsuarioDto::de);
    }

    @Transactional(readOnly = true)
    public boolean hayUsuarios() {
        return repo.count() > 0;
    }

    private Sesion sesion(Usuario u) {
        Instant ahora = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("trustinmuebles")
                .subject(String.valueOf(u.getId()))
                .issuedAt(ahora)
                .expiresAt(ahora.plus(ttlHoras, ChronoUnit.HOURS))
                .claim("email", u.getEmail())
                .claim("nombre", u.getNombre())
                .claim("rol", u.getRol().name())
                .build();
        String token = jwtEncoder
                .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
        return new Sesion(token, UsuarioDto.de(u));
    }
}
