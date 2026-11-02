package pe.trustinmuebles.shared;

/** Un archivo que supera el tamaño de entrada o el máximo almacenado, incluso optimizado. Se responde como 413. */
public class ArchivoDemasiadoGrandeException extends RuntimeException {
    public ArchivoDemasiadoGrandeException(String mensaje) {
        super(mensaje);
    }
}
