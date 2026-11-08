package pe.trustinmuebles.almacenamiento;

/** Un PDF ya validado y, si hizo falta, optimizado. {@code datos} es lo único que se guarda. */
public record PdfPreparado(byte[] datos, long tamanoOriginal, boolean optimizado) {}
