package pe.trustinmuebles.shared;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/**
 * v1.0 (etapa 9): CSV que Excel en español abre con doble clic: UTF-8 con marca de orden de bytes (BOM), separador punto y
 * coma y fin de línea CRLF. Un campo con «;», comillas o saltos de línea va entre comillas con «""». Un texto que empieza
 * con =, +, - o @ (o tabulador o retorno) se antepone con un apóstrofo para que Excel no lo ejecute como fórmula; las
 * cifras exportadas nunca empiezan así (no hay negativos).
 */
public final class EscritorCsv {
    public static final char SEPARADOR = ';';
    private static final byte[] BOM = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};

    private EscritorCsv() {}

    /** El archivo completo: BOM, encabezado y filas. Un valor null se escribe como celda vacía. */
    public static byte[] excel(List<String> encabezado, List<List<String>> filas) {
        StringBuilder sb = new StringBuilder();
        linea(sb, encabezado);
        for (List<String> f : filas) linea(sb, f);
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        salida.writeBytes(BOM);
        salida.writeBytes(sb.toString().getBytes(StandardCharsets.UTF_8));
        return salida.toByteArray();
    }

    private static void linea(StringBuilder sb, List<String> campos) {
        for (int i = 0; i < campos.size(); i++) {
            if (i > 0) sb.append(SEPARADOR);
            sb.append(campo(campos.get(i)));
        }
        sb.append("\r\n");
    }

    /** Un campo ya protegido y entre comillas si hace falta. */
    static String campo(String valor) {
        if (valor == null || valor.isEmpty()) return "";
        String v = valor;
        char c = v.charAt(0);
        if (c == '=' || c == '+' || c == '-' || c == '@' || c == '\t' || c == '\r') v = "'" + v;
        boolean comillas = v.indexOf(SEPARADOR) >= 0 || v.indexOf('"') >= 0 || v.indexOf('\n') >= 0
                || v.indexOf('\r') >= 0 || v.indexOf(',') >= 0;
        return comillas ? '"' + v.replace("\"", "\"\"") + '"' : v;
    }

    /** Respuesta de descarga: tipo text/csv, nombre de archivo, sin caché (lleva datos internos) y nosniff. */
    public static ResponseEntity<byte[]> descarga(String nombreArchivo, byte[] cuerpo) {
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .header("Content-Disposition", "attachment; filename=\"" + nombreArchivo + "\"")
                .header("X-Content-Type-Options", "nosniff").cacheControl(CacheControl.noStore()).body(cuerpo);
    }
}
