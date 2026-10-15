package pe.trustinmuebles.identidad;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmailIgnoreCase(String email);

    Optional<Usuario> findFirstByRolOrderByIdAsc(Rol rol);
}
