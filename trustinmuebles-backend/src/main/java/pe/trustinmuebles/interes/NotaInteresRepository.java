package pe.trustinmuebles.interes;

import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

/** Solo guardar y leer: las notas no se editan ni se borran desde la aplicación (se van con su interesado). */
interface NotaInteresRepository extends Repository<NotaInteres, Long> {
    NotaInteres save(NotaInteres n);

    List<NotaInteres> findByInteresIdOrderByIdAsc(Long interesId);

    long countByInteresId(Long interesId);

    /** Cuántas notas tiene cada interesado: filas {interesId, cantidad}. */
    @Query("select n.interesId, count(n) from NotaInteres n group by n.interesId")
    List<Object[]> conteoPorInteres();
}
