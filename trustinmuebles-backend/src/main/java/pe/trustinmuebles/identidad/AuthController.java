package pe.trustinmuebles.identidad;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
class AuthController {
    record LoginRequest(@NotBlank @Email @Size(max = 200) String email, @NotBlank @Size(max = 72) String password) {}

    record RegisterRequest(@NotBlank @Size(max = 120) String nombre, @NotBlank @Email @Size(max = 200) String email,
            @NotBlank @Size(min = 8, max = 72, message = "entre 8 y 72 caracteres") String password) {}

    private final AuthService auth;
    private final LimiteIntentosLogin limite;

    AuthController(AuthService auth, LimiteIntentosLogin limite) {
        this.auth = auth;
        this.limite = limite;
    }

    @PostMapping("/login")
    AuthService.Sesion login(@Valid @RequestBody LoginRequest r, jakarta.servlet.http.HttpServletRequest req) {
        String clave = r.email().toLowerCase() + "|" + req.getRemoteAddr();
        if (limite.bloqueado(clave)) {
            throw new pe.trustinmuebles.shared.DemasiadosIntentosException(
                    "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.");
        }
        try {
            AuthService.Sesion sesion = auth.login(r.email(), r.password());
            limite.exito(clave);
            return sesion;
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            limite.fallo(clave);
            throw e;
        }
    }

    @PostMapping("/register")
    AuthService.Sesion register(@Valid @RequestBody RegisterRequest r) {
        return auth.registrar(r.nombre(), r.email(), r.password());
    }

    @GetMapping("/me")
    UsuarioDto me() {
        return auth.obtener(UsuarioActual.actual().id());
    }
}
