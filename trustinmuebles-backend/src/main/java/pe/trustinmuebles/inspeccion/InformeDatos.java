package pe.trustinmuebles.inspeccion;

import java.time.LocalDate;

/** Datos del informe técnico, ya sin formato HTTP. Los usan el endpoint del especialista y la carga de contenido. */
public record InformeDatos(EstadoTecnico estado, ResultadoTecnico resultado, String profesional, String colegiatura,
        LocalDate fechaInspeccion, VerificacionCampo verifArquitectura, VerificacionCampo verifEstructuras,
        VerificacionCampo verifElectricas, VerificacionCampo verifSanitarias, String observaciones,
        String conclusiones, String estudiosAdicionales) {}
