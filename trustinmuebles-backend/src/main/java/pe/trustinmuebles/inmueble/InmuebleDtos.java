package pe.trustinmuebles.inmueble;

import java.math.BigDecimal;
import pe.trustinmuebles.inspeccion.InspeccionDto;
import pe.trustinmuebles.semaforo.EvaluacionLegalDto;
import pe.trustinmuebles.shared.NivelRiesgo;

/** DTOs del módulo; los nombres de campo de {@link Tarjeta} coinciden con los que usa el front. */
public final class InmuebleDtos {
    private InmuebleDtos() {}

    public record Tarjeta(Long id, String title, String location, BigDecimal price, int beds, int baths,
            BigDecimal area, NivelRiesgo legal, NivelRiesgo struct, String img) {}

    public record PlanoDto(Long id, String nombre, String imagenUrl) {}

    public record InspeccionVista(InspeccionDto inspeccion, PlanoDto plano) {}

    public record Detalle(Long id, String titulo, String ubicacion, String direccion, String descripcion,
            BigDecimal precioUsd, int habitaciones, int banos, BigDecimal areaM2, String numeroPartida,
            String vendedor, String imagenUrl, EvaluacionLegalDto semaforo, InspeccionVista inspeccion) {}

    /** Datos mínimos que necesitan otros módulos. */
    public record Resumen(Long id, String titulo, String ubicacion, String direccion, BigDecimal precioUsd,
            String imagenUrl, String vendedor, String numeroPartida) {}
}
