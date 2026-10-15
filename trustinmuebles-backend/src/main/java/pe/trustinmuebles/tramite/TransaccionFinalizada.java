package pe.trustinmuebles.tramite;

import java.math.BigDecimal;

/** Evento de dominio: el trámite terminó y la propiedad pasa al comprador (activa postventa). */
public record TransaccionFinalizada(Long transaccionId, Long inmuebleId, Long compradorId, BigDecimal precio) {}
