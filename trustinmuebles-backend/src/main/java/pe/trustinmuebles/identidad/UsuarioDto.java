package pe.trustinmuebles.identidad;

public record UsuarioDto(Long id, String nombre, String email, Rol rol) {
    static UsuarioDto de(Usuario u) {
        return new UsuarioDto(u.getId(), u.getNombre(), u.getEmail(), u.getRol());
    }
}
