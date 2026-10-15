package pe.trustinmuebles.postventa;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import pe.trustinmuebles.inmueble.InmuebleDtos;

public final class PostventaDtos {
    private PostventaDtos() {}

    public record PropiedadDto(Long id, InmuebleDtos.Resumen inmueble, Long transaccionId, Instant fechaCompra,
            BigDecimal valorCompra, BigDecimal valorEstimado, BigDecimal plusvaliaPct) {}

    public record ResumenPostventa(String propietario, List<PropiedadDto> propiedades) {}

    public record MantenimientoDto(Long id, Long propiedadId, LocalDate fecha, String servicio,
            BigDecimal inversionUsd, String comprobanteUrl) {}

    public record TicketDto(Long id, Long propiedadId, String titulo, String descripcion, String proveedor,
            EstadoTicket estado, PrioridadTicket prioridad, Long planoId, Double pinX, Double pinY, Instant creadoEn,
            Instant actualizadoEn) {}

    public record Dossier(PropiedadDto propiedad, InmuebleDtos.Detalle ficha, List<MantenimientoDto> mantenimientos,
            List<TicketDto> tickets, Instant generadoEn, BigDecimal totalInvertidoMantenimiento) {}
}
