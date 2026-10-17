package pe.trustinmuebles.shared;

/** El recurso cambió mientras se editaba (bloqueo optimista). Se responde como 409. */
public class ConflictoException extends RuntimeException {
    public ConflictoException(String mensaje) {
        super(mensaje);
    }
}
