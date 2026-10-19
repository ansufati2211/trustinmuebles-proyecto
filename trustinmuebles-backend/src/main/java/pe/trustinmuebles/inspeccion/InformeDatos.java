package pe.trustinmuebles.inspeccion;

import java.time.LocalDate;

/**
 * Datos del informe técnico que llena el especialista, ya sin formato HTTP. No incluye el nombre, la especialidad ni
 * la colegiatura del profesional: el servidor los toma de la cuenta autenticada (M8).
 */
public record InformeDatos(EstadoTecnico estado, ResultadoTecnico resultado, LocalDate fechaInspeccion,
        VerificacionCampo verifArquitectura, VerificacionCampo verifEstructuras, VerificacionCampo verifElectricas,
        VerificacionCampo verifSanitarias, String observaciones, String conclusiones, String estudiosAdicionales) {}
