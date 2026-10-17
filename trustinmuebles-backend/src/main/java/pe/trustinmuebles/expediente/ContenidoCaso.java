package pe.trustinmuebles.expediente;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import pe.trustinmuebles.checklist.EstadoItem;
import pe.trustinmuebles.clasificacion.Completitud;
import pe.trustinmuebles.clasificacion.EstadoAnotacion;
import pe.trustinmuebles.clasificacion.TipoActo;
import pe.trustinmuebles.expediente.CasoDtos.AsientoDatos;
import pe.trustinmuebles.expediente.CasoDtos.DatosExpediente;

/** Forma del JSON de un caso (contenido/<versión>/casos/*.json). La usan la carga de contenido y la herramienta de PDF. */
final class ContenidoCaso {
    private ContenidoCaso() {}

    record AsientoJson(String referencia, TipoActo tipoActo, EstadoAnotacion estado, LocalDate fechaInscripcion,
            String tituloNumero, LocalDate fechaPresentacion, String texto, String canceloNumero, String titulares) {}

    record ItemJson(String nombre, EstadoItem estado) {}

    record ExpedienteJson(String condicionRepresentada, Completitud completitud, LocalDate fechaReferencial,
            String nota, String zonaRegistral, String oficinaRegistral, String ubicacion, BigDecimal areaM2,
            String linderos, String antecedenteDominial, List<AsientoJson> asientos, List<ItemJson> checklist,
            List<String> terminos) {}

    record CasoJson(String codigo, String denominacion, String contexto, ExpedienteJson expediente) {

        DatosExpediente datos() {
            ExpedienteJson x = expediente;
            List<AsientoDatos> asientos = x.asientos() == null ? List.of() : x.asientos().stream()
                    .map(a -> new AsientoDatos(a.referencia(), a.tipoActo(), a.estado(), a.fechaInscripcion(),
                            a.tituloNumero(), a.fechaPresentacion(), a.texto(), a.canceloNumero(), a.titulares()))
                    .toList();
            return new DatosExpediente(x.condicionRepresentada(), x.completitud(), x.fechaReferencial(), x.nota(),
                    x.zonaRegistral(), x.oficinaRegistral(), x.ubicacion(), x.areaM2(), x.linderos(),
                    x.antecedenteDominial(), asientos);
        }

        List<ItemJson> items() {
            return expediente.checklist() == null ? List.of() : expediente.checklist();
        }

        List<String> terminos() {
            return expediente.terminos() == null ? List.of() : expediente.terminos();
        }
    }
}
