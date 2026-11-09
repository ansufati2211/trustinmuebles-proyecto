package pe.trustinmuebles.expediente;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import pe.trustinmuebles.checklist.EstadoItem;
import pe.trustinmuebles.clasificacion.Completitud;
import pe.trustinmuebles.clasificacion.DocumentoLote;
import pe.trustinmuebles.clasificacion.EstadoAnotacion;
import pe.trustinmuebles.clasificacion.TipoActo;
import pe.trustinmuebles.expediente.CasoDtos.AsientoDatos;
import pe.trustinmuebles.clasificacion.Especialidad;
import pe.trustinmuebles.clasificacion.EstadoPlano;
import pe.trustinmuebles.clasificacion.TipoPredio;
import pe.trustinmuebles.expediente.CasoDtos.DatosExpediente;
import pe.trustinmuebles.expediente.CasoDtos.DocumentoLoteDatos;
import pe.trustinmuebles.expediente.CasoDtos.PlanoDatos;
import pe.trustinmuebles.inspeccion.EstadoTecnico;
import pe.trustinmuebles.inspeccion.InformeDatos;
import pe.trustinmuebles.inspeccion.ResultadoTecnico;
import pe.trustinmuebles.inspeccion.VerificacionCampo;

/** Forma del JSON de un caso (contenido/<versión>/casos/*.json). La usan la carga de contenido y la herramienta de PDF. */
final class ContenidoCaso {
    private ContenidoCaso() {}

    record AsientoJson(String referencia, TipoActo tipoActo, EstadoAnotacion estado, LocalDate fechaInscripcion,
            String tituloNumero, LocalDate fechaPresentacion, String texto, String canceloNumero, String titulares) {}

    record ItemJson(String nombre, EstadoItem estado, String observacion) {}

    record PlanoJson(Especialidad especialidad, EstadoPlano estado, BigDecimal areaConstruida,
            SistemaConstructivo sistemaConstructivo, String observacion) {}

    /** Informe de demostración. Lo firma la cuenta especialista-01 (M8), no un nombre escrito en el JSON. */
    record InformeJson(EstadoTecnico estado, ResultadoTecnico resultado, LocalDate fechaInspeccion,
            VerificacionCampo verifArquitectura, VerificacionCampo verifEstructuras, VerificacionCampo verifElectricas,
            VerificacionCampo verifSanitarias, String observaciones, String conclusiones, String estudiosAdicionales) {

        InformeDatos datos() {
            return new InformeDatos(estado, resultado, fechaInspeccion, verifArquitectura, verifEstructuras,
                    verifElectricas, verifSanitarias, observaciones, conclusiones, estudiosAdicionales);
        }
    }

    /**
     * v0.9: un documento del lote. {@code archivo} es la ruta de un PDF dentro de contenido/<versión>/ (por
     * ejemplo, el plano oficial de la SBN); sin archivo, un caso de demostración lo genera con sus datos.
     */
    record DocumentoLoteJson(DocumentoLote tipo, EstadoPlano estado, String observacion, String resumen,
            String archivo) {}

    record ExpedienteJson(String condicionRepresentada, Completitud completitud, LocalDate fechaReferencial,
            String nota, String zonaRegistral, String oficinaRegistral, String ubicacion, BigDecimal areaM2,
            String linderos, String antecedenteDominial, List<AsientoJson> asientos, List<ItemJson> checklist,
            List<String> terminos, TipoPredio tipoPredio, BigDecimal areaConstruidaInscrita, List<PlanoJson> planos,
            InformeJson informeTecnico, List<DocumentoLoteJson> documentosLote) {}

    /**
     * Un caso de la carga de contenido. Los campos de la v0.9 son opcionales: {@code propietario} (si no viene, el
     * reparto de siempre), {@code moneda} (PEN por defecto), {@code precioNota}, y los de un caso con datos de una
     * fuente pública: {@code origen} TRANSCRITA, {@code fuente}, {@code fuenteUrl} y {@code fechaConsulta}.
     */
    record CasoJson(String codigo, String denominacion, String contexto, String distrito, BigDecimal precioReferencial,
            String moneda, String precioNota, String propietario, CasoLote.Origen origen, String fuente,
            String fuenteUrl, LocalDate fechaConsulta, ExpedienteJson expediente) {

        boolean esDeFuentePublica() {
            return origen == CasoLote.Origen.TRANSCRITA;
        }

        List<DocumentoLoteJson> documentosLote() {
            return expediente.documentosLote() == null ? List.of() : expediente.documentosLote();
        }

        List<DocumentoLoteDatos> documentosLoteDatos() {
            return documentosLote().stream()
                    .map(d -> new DocumentoLoteDatos(d.tipo(), d.estado(), d.observacion(), d.resumen())).toList();
        }

        DatosExpediente datos() {
            ExpedienteJson x = expediente;
            List<AsientoDatos> asientos = x.asientos() == null ? List.of() : x.asientos().stream()
                    .map(a -> new AsientoDatos(a.referencia(), a.tipoActo(), a.estado(), a.fechaInscripcion(),
                            a.tituloNumero(), a.fechaPresentacion(), a.texto(), a.canceloNumero(), a.titulares()))
                    .toList();
            return new DatosExpediente(x.condicionRepresentada(), x.completitud(), x.fechaReferencial(), x.nota(),
                    x.zonaRegistral(), x.oficinaRegistral(), x.ubicacion(), x.areaM2(), x.linderos(),
                    x.antecedenteDominial(), asientos, x.tipoPredio() == null ? TipoPredio.LOTE : x.tipoPredio(),
                    x.areaConstruidaInscrita(), x.planos() == null ? List.of() : x.planos().stream()
                            .map(p -> new PlanoDatos(p.especialidad(), p.estado(), p.areaConstruida(),
                                    p.sistemaConstructivo(), p.observacion())).toList(),
                    x.documentosLote() == null ? null : documentosLoteDatos());
        }

        List<ItemJson> items() {
            return expediente.checklist() == null ? List.of() : expediente.checklist();
        }

        List<String> terminos() {
            return expediente.terminos() == null ? List.of() : expediente.terminos();
        }
    }
}
