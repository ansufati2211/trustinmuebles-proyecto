package pe.trustinmuebles.identidad;

public record UsuarioDto(Long id, String codigoCuenta, Rol rol) {
    static UsuarioDto de(Usuario u) {
        return new UsuarioDto(u.getId(), u.getCodigoCuenta(), u.getRol());
    }
}
