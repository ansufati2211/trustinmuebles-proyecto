package pe.trustinmuebles.orientacion;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** API pública del módulo de orientación: glosario cerrado, solo lectura desde HTTP (REQ-F04). */
@Service
@Transactional
public class GlosarioService {
    private final TerminoRepository terminos;
    private final ExpedienteTerminoRepository vinculos;

    GlosarioService(TerminoRepository terminos, ExpedienteTerminoRepository vinculos) {
        this.terminos = terminos;
        this.vinculos = vinculos;
    }

    @Transactional(readOnly = true)
    public List<TerminoDto> listar() {
        return terminos.findAllByOrderByConceptoAsc().stream().map(TerminoGlosario::dto).toList();
    }

    @Transactional(readOnly = true)
    public List<TerminoDto> terminosDe(Long expedienteId) {
        return vinculos.findByExpedienteIdOrderByTerminoConceptoAsc(expedienteId).stream()
                .map(v -> v.getTermino().dto()).toList();
    }

    /** Asocia términos ya existentes al expediente. Un concepto desconocido es un error de contenido. */
    public void asociar(Long expedienteId, List<String> conceptos) {
        for (String concepto : conceptos) {
            TerminoGlosario t = terminos.findByConcepto(concepto).orElseThrow(
                    () -> new IllegalArgumentException("Término de glosario inexistente: " + concepto));
            if (vinculos.existsByExpedienteIdAndTerminoId(expedienteId, t.getId())) continue;
            ExpedienteTermino v = new ExpedienteTermino();
            v.setExpedienteId(expedienteId);
            v.setTermino(t);
            vinculos.save(v);
        }
    }
}
