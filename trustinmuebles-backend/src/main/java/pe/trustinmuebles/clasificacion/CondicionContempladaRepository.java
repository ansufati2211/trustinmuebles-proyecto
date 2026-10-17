package pe.trustinmuebles.clasificacion;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface CondicionContempladaRepository extends JpaRepository<CondicionContemplada, Long> {
    List<CondicionContemplada> findByVersionReglas(String versionReglas);

    boolean existsByVersionReglasAndTexto(String versionReglas, String texto);
}
