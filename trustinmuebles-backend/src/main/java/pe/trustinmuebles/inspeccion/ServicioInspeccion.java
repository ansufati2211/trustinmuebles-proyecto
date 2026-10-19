package pe.trustinmuebles.inspeccion;

import java.math.BigDecimal;

/**
 * Condiciones del servicio de evaluación técnica presencial. El costo es referencial: se coordina con la inmobiliaria
 * y no hay pago en línea. Sale de la configuración ({@code app.inspeccion.costo-referencial}), no de la interfaz.
 */
public record ServicioInspeccion(BigDecimal costoReferencial, String moneda, String condiciones) {}
