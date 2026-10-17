package pe.trustinmuebles.identidad;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
class AuthController {
    record LoginRequest(@NotBlank @Size(max = 40) String codigoCuenta, @NotBlank @Size(max = 72) String password) {}

    private final AuthService auth;
    private final LimiteIntentosLogin limite;

    AuthController(AuthService auth, LimiteIntentosLogin limite) {
        this.auth = auth;
        this.limite = limite;
    }

    @PostMapping("/login")
    AuthService.Sesion login(@Valid @RequestBody LoginRequest r, jakarta.servlet.http.HttpServletRequest req) {
        String clave = r.codigoCuenta().toLowerCase() + "|" + req.getRemoteAddr();
        if (limite.bloqueado(clave)) {
            throw new pe.trustinmuebles.shared.DemasiadosIntentosException(
                    "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.");
        }
        try {
            AuthService.Sesion sesion = auth.login(r.codigoCuenta(), r.password());
            limite.exito(clave);
            return sesion;
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            limite.fallo(clave);
            throw e;
        }
    }

    @GetMapping("/me")
    UsuarioDto me() {
        return auth.obtener(UsuarioActual.actual().id());
    }
}
