package pe.trustinmuebles.cartera;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import tools.jackson.databind.JsonNode;
import pe.trustinmuebles.clasificacion.EstadoSemaforo;
import pe.trustinmuebles.expediente.Esfuerzo;
import pe.trustinmuebles.expediente.EstadoGestion;
import pe.trustinmuebles.expediente.EstadoPublicacion;
import pe.trustinmuebles.inspeccion.EstadoTecnico;

final class CarteraDtos {
    private CarteraDtos() {}

    /**
     * Solo el motivo, de una lista cerrada. Un campo desconocido (por ejemplo, un mensaje de texto libre) da 400 en lugar
     * de ignorarse en silencio (I11). Se valida a mano porque la configuración global de Jackson ignora los campos
     * desconocidos.
     */
    record SolicitarContactoRequest(MotivoContacto motivo) {
        static SolicitarContactoRequest de(JsonNode cuerpo) {
            if (cuerpo == null || !cuerpo.isObject()) {
                throw new IllegalArgumentException("motivo: el cuerpo debe ser {\"motivo\": …}");
            }
            for (String campo : cuerpo.propertyNames()) {
                if (!campo.equals("motivo")) {
                    throw new IllegalArgumentException("«" + campo + "» no está permitido: la solicitud solo lleva un "
                            + "motivo de la lista, sin texto libre");
                }
            }
            JsonNode m = cuerpo.get("motivo");
            String validos = Arrays.stream(MotivoContacto.values()).map(Enum::name).collect(Collectors.joining(", "));
            if (m == null || !m.isString()) throw new IllegalArgumentException("motivo: indica uno de " + validos);
            try {
                return new SolicitarContactoRequest(MotivoContacto.valueOf(m.asString()));
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("motivo: valor no válido. Usa uno de: " + validos);
            }
        }
    }

    /**
     * v0.8: decisión de captación. Solo {@code decision} y {@code motivo}, de listas cerradas; cualquier otro campo (por
     * ejemplo, un comentario libre) da 400 (I11).
     */
    record RegistrarDecisionRequest(DecisionCaptacionTipo decision, MotivoDecision motivo) {
        static RegistrarDecisionRequest de(JsonNode cuerpo) {
            if (cuerpo == null || !cuerpo.isObject()) {
                throw new IllegalArgumentException("El cuerpo debe ser {\"decision\": …, \"motivo\": …}");
            }
            for (String campo : cuerpo.propertyNames()) {
                if (!campo.equals("decision") && !campo.equals("motivo")) {
                    throw new IllegalArgumentException("«" + campo + "» no está permitido: la decisión solo lleva una "
                            + "decisión y un motivo de la lista, sin texto libre");
                }
            }
            return new RegistrarDecisionRequest(valor(cuerpo, "decision", DecisionCaptacionTipo.class),
                    valor(cuerpo, "motivo", MotivoDecision.class));
        }

        private static <E extends Enum<E>> E valor(JsonNode cuerpo, String campo, Class<E> tipo) {
            String validos = Arrays.stream(tipo.getEnumConstants()).map(Enum::name).collect(Collectors.joining(", "));
            JsonNode v = cuerpo.get(campo);
            if (v == null || !v.isString()) throw new IllegalArgumentException(campo + ": indica uno de " + validos);
            try {
                return Enum.valueOf(tipo, v.asString());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException(campo + ": valor no válido. Usa uno de: " + validos);
            }
        }
    }

    record DecisionDto(Long id, String casoCodigo, DecisionCaptacionTipo decision, String decisionEtiqueta,
            MotivoDecision motivo, String motivoEtiqueta, String cuentaCodigo, Instant registradaEn) {

        static DecisionDto de(DecisionCaptacion d) {
            return new DecisionDto(d.getId(), d.getCasoCodigo(), d.getDecision(), d.getDecision().etiqueta(),
                    d.getMotivo(), d.getMotivo().etiqueta(), d.getCuentaCodigo(), d.getRegistradaEn());
        }
    }

    record ContactoDto(Long id, String casoCodigo, String compradorCodigo, MotivoContacto motivo, EstadoContacto estado,
            Instant creadaEn, Instant atendidaEn, String atendidaPor) {

        static ContactoDto de(SolicitudContacto s) {
            return new ContactoDto(s.getId(), s.getCasoCodigo(), s.getCompradorCodigo(), s.getMotivo(), s.getEstado(),
                    s.getCreadaEn(), s.getAtendidaEn(), s.getAtendidaPor());
        }
    }

    record CasoConFaltantes(String codigo, EstadoSemaforo estado, List<String> faltantes) {}

    record InspeccionEnCurso(String codigo, EstadoTecnico estado, String especialistaAsignadoCodigo, boolean asignada) {}

    /** v0.8: cuántos casos tienen un tipo de alerta (código y nombre de la regla, o información insuficiente). */
    record ConteoTipoAlerta(String codigo, String nombre, long casos) {}

    /** v0.8: un caso con pasos de regularización, para organizar la subsanación (no es un ranking de compra). */
    record CasoPorRegularizar(String codigo, String denominacion, EstadoSemaforo color, List<String> tiposAlerta,
            Esfuerzo esfuerzo, EstadoGestion estadoGestion) {}

    /** v0.8 (D54): una fila de la matriz «tipo de alerta × estado de gestión». */
    record FilaMatrizGestion(String codigo, String nombre, Map<EstadoGestion, Long> porEstadoGestion) {}

    static final String AVISO_PRIORIZACION =
            "Priorización interna de la inmobiliaria; no es una recomendación de compra";

    /**
     * Panel de cartera del gestor (solo lectura). Totales por color del indicador A y por estado de publicación, casos con
     * faltantes, inspecciones solicitadas o en curso y contactos pendientes. v0.8 (D52): conteo por tipo de alerta y por
     * esfuerzo (BAJO, MEDIO, ALTO, SIN_PASOS) y la lista «por regularizar», ordenada por esfuerzo y código solo para
     * organizar la subsanación.
     */
    record PanelCartera(int totalCasos, Map<EstadoSemaforo, Long> porColor,
            Map<EstadoPublicacion, Long> porEstadoPublicacion, List<CasoConFaltantes> casosConFaltantes,
            List<InspeccionEnCurso> inspecciones, long inspeccionesAsignadas, long inspeccionesSinAsignar,
            List<ContactoDto> contactosPendientes, List<ConteoTipoAlerta> porTipoAlerta, Map<String, Long> porEsfuerzo,
            List<CasoPorRegularizar> porRegularizar, String avisoPriorizacion,
            Map<EstadoGestion, Long> porEstadoGestion, List<FilaMatrizGestion> matrizGestion, String avisoGestion) {}
}
