package pe.trustinmuebles.clasificacion;

import java.util.List;

/** Datos del expediente que el motor necesita. Es una copia por valor: este módulo no depende del de expedientes. */
public record EntradaClasificacion(String condicionRepresentada, String titularidad, Completitud completitud,
        List<AnotacionEntrada> anotaciones) {

    public record AnotacionEntrada(String referencia, EstadoAnotacion estado, String descripcion) {}
}
