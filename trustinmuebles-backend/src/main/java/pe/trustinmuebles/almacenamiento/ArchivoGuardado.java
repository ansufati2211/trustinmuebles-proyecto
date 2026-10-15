package pe.trustinmuebles.almacenamiento;

public record ArchivoGuardado(String id, String nombre, String contentType, long tamano, String sha256) {
    public String url() {
        return "/api/v1/archivos/" + id;
    }
}
