package pe.trustinmuebles.identidad;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByCodigoCuenta(String codigoCuenta);

    Optional<Usuario> findFirstByRolOrderByIdAsc(Rol rol);

    java.util.List<Usuario> findByRolInOrderByCodigoCuentaAsc(java.util.Collection<Rol> roles);
}
