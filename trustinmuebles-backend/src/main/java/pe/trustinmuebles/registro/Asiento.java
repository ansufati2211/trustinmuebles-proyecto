package pe.trustinmuebles.registro;

import java.time.LocalDate;

public record Asiento(TipoAsiento tipo, String descripcion, boolean vigente, LocalDate fecha) {}
