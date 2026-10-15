package pe.trustinmuebles.shared;

public class NoEncontradoException extends RuntimeException {
    public NoEncontradoException(String recurso, Object id) {
        super(recurso + " no encontrado: " + id);
    }
}
