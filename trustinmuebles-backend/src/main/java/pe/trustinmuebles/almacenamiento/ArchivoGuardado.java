package pe.trustinmuebles.almacenamiento;

public record ArchivoGuardado(String id, String nombre, String contentType, long tamano, String sha256) {}
