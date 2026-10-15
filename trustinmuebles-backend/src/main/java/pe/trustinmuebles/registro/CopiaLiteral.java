package pe.trustinmuebles.registro;

import java.util.List;
import pe.trustinmuebles.shared.Hashing;

/** Copia literal de una partida registral (datos crudos tal como los entrega el Estado). */
public record CopiaLiteral(String numeroPartida, String zonaRegistral, String titularActual, double areaRegistralM2,
        List<Asiento> asientos) {

    /** Huella de la copia evaluada, para que el dictamen sea trazable. */
    public String huella() {
        StringBuilder sb = new StringBuilder(numeroPartida).append('|').append(titularActual).append('|')
                .append(areaRegistralM2);
        asientos.forEach(a -> sb.append('|').append(a.tipo()).append(':').append(a.vigente()).append(':')
                .append(a.fecha()).append(':').append(a.descripcion()));
        return Hashing.sha256(sb.toString());
    }
}
