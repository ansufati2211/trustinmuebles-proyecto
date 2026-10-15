package pe.trustinmuebles.semaforo;

import java.util.List;

public record PartidaTraducida(String numeroPartida, String zonaRegistral, String titularActual,
        double areaRegistralM2, List<AsientoTraducido> asientos) {

    public record AsientoTraducido(String tipo, String textoRegistral, boolean vigente, String fecha,
            String explicacionSimple) {}
}
