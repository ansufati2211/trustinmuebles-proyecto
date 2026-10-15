package pe.trustinmuebles.identidad;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

/** Acceso al usuario autenticado a partir del JWT. */
public record UsuarioActual(Long id, String email, Rol rol) {

    public static UsuarioActual actual() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a == null || !(a.getPrincipal() instanceof Jwt jwt)) {
            throw new org.springframework.security.access.AccessDeniedException("No autenticado");
        }
        return new UsuarioActual(Long.valueOf(jwt.getSubject()), jwt.getClaimAsString("email"),
                Rol.valueOf(jwt.getClaimAsString("rol")));
    }

    public boolean esStaff() {
        return rol == Rol.ADMIN || rol == Rol.GESTOR_LEGAL;
    }
}
