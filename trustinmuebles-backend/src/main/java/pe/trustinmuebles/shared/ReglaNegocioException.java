package pe.trustinmuebles.shared;

/** Violación de una regla de negocio (RN-xx). Se responde como 422. */
public class ReglaNegocioException extends RuntimeException {
    public ReglaNegocioException(String mensaje) {
        super(mensaje);
    }
}
