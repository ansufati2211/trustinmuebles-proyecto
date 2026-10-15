package pe.trustinmuebles.tramite;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import pe.trustinmuebles.identidad.UsuarioDto;

public final class TramiteDtos {
    private TramiteDtos() {}

    public enum EstadoEtapa { COMPLETADA, ACTUAL, PENDIENTE }

    public record EtapaDto(EtapaTramite codigo, String titulo, String descripcion, EstadoEtapa estado, Instant fecha) {}

    public record DocumentoDto(Long id, String nombre, String tipo, EstadoFirma estadoFirma, String sha256,
            Instant subidoEn, Instant firmadoEn) {}

    public record EventoDto(Long id, String tipo, String descripcion, Instant fecha, String hash) {}

    public record MensajeDto(Long id, Long autorId, String autor, String texto, Instant fecha) {}

    public record InmuebleBreve(Long id, String titulo, String ubicacion, String direccion, String imagenUrl) {}

    public record Resumen(Long id, InmuebleBreve inmueble, EtapaTramite etapa, BigDecimal precioAcordado,
            Instant creadaEn) {}

    public record Detalle(Long id, InmuebleBreve inmueble, EtapaTramite etapa, BigDecimal precioAcordado,
            Instant creadaEn, UsuarioDto gestor, List<EtapaDto> etapas, List<DocumentoDto> documentos,
            List<EventoDto> timeline, List<MensajeDto> mensajes) {}

    public record Integridad(boolean valida, int eventos, Long primerEventoInvalido, String ultimoHash) {}

    /** Datos mínimos de una transacción para otros módulos. */
    public record Estado(Long id, Long inmuebleId, Long compradorId, EtapaTramite etapa) {
        public boolean finalizada() {
            return etapa == EtapaTramite.FINALIZADA;
        }
    }
}
