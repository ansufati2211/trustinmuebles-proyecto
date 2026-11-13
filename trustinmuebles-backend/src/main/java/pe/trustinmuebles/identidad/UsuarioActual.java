package pe.trustinmuebles.identidad;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

/** Acceso al usuario autenticado a partir del JWT. */
public record UsuarioActual(Long id, String codigoCuenta, Rol rol) {

    public static UsuarioActual actual() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a == null || !(a.getPrincipal() instanceof Jwt jwt)) {
            throw new org.springframework.security.access.AccessDeniedException("No autenticado");
        }
        return new UsuarioActual(Long.valueOf(jwt.getSubject()), jwt.getClaimAsString("codigo"),
                Rol.valueOf(jwt.getClaimAsString("rol")));
    }

    /** v1.0 (etapa 7): si la petición trae una sesión válida (un JWT), aunque la ruta sea pública. */
    public static boolean haySesion() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        return a != null && a.getPrincipal() instanceof Jwt;
    }

    public boolean esRevisor() {
        return rol == Rol.REVISOR;
    }
}
