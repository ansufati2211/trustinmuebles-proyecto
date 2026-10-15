package pe.trustinmuebles.registro;

import java.util.Optional;

/**
 * Puerto hacia el registro público (SUNARP/SPRL). Hoy lo implementa {@link SunarpMockAdapter};
 * un futuro adaptador real solo reemplaza esa implementación.
 */
public interface RegistroPublicoPort {
    /** @throws RegistroNoDisponibleException si el servicio del Estado no responde. */
    Optional<CopiaLiteral> consultarCopiaLiteral(String numeroPartida);
}
