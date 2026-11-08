package pe.trustinmuebles.expediente;

/**
 * Estado de gestión de un caso con su etiqueta, explicación y sugerencia (contenido/<versión>/gestion.json, borrador del
 * equipo). {@code esfuerzo} es el de la ruta de regularización (null si no hay pasos). Uso interno (I15).
 */
public record GestionInmobiliaria(EstadoGestion estado, String etiqueta, String explicacion, String sugerencia,
        Esfuerzo esfuerzo, String aviso) {}
