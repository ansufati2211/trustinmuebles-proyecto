package pe.trustinmuebles.almacenamiento;

public record ArchivoContenido(String nombre, String contentType, byte[] datos, boolean publico) {}
