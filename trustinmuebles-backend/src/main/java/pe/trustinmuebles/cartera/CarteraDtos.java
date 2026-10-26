package pe.trustinmuebles.cartera;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import tools.jackson.databind.JsonNode;
import pe.trustinmuebles.clasificacion.EstadoSemaforo;
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

    record ContactoDto(Long id, String casoCodigo, String compradorCodigo, MotivoContacto motivo, EstadoContacto estado,
            Instant creadaEn, Instant atendidaEn, String atendidaPor) {

        static ContactoDto de(SolicitudContacto s) {
            return new ContactoDto(s.getId(), s.getCasoCodigo(), s.getCompradorCodigo(), s.getMotivo(), s.getEstado(),
                    s.getCreadaEn(), s.getAtendidaEn(), s.getAtendidaPor());
        }
    }

    record CasoConFaltantes(String codigo, EstadoSemaforo estado, List<String> faltantes) {}

    record InspeccionEnCurso(String codigo, EstadoTecnico estado, String especialistaAsignadoCodigo, boolean asignada) {}

    /**
     * Panel de cartera del gestor (solo lectura). Totales por color del indicador A y por estado de publicación, casos con
     * faltantes, inspecciones solicitadas o en curso y contactos pendientes. Sin rankings.
     */
    record PanelCartera(int totalCasos, Map<EstadoSemaforo, Long> porColor,
            Map<EstadoPublicacion, Long> porEstadoPublicacion, List<CasoConFaltantes> casosConFaltantes,
            List<InspeccionEnCurso> inspecciones, long inspeccionesAsignadas, long inspeccionesSinAsignar,
            List<ContactoDto> contactosPendientes) {}
}
