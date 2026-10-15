package pe.trustinmuebles.registro;

public class RegistroNoDisponibleException extends RuntimeException {
    public RegistroNoDisponibleException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
