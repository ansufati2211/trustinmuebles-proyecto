package pe.trustinmuebles.expediente;

import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * v1.0 (etapa 3b): lector de CSV propio, sin librerías. Acepta coma o punto y coma como separador (el que use la primera
 * línea; Excel en español guarda con punto y coma), campos entre comillas con «""» y saltos de línea dentro de ellas, líneas
 * con CRLF o LF, marca de orden de bytes (BOM) y archivos en UTF-8 o, si no lo son, en Windows-1252. Las líneas vacías se
 * ignoran. No interpreta nada: cada registro es la lista de sus campos tal como vienen, sin espacios sobrantes.
 */
final class LectorCsv {
    private LectorCsv() {}

    /** Un registro del archivo y el número de su primera línea (la del encabezado es la 1). */
    record Registro(int linea, List<String> campos) {}

    record Resultado(char separador, List<Registro> registros, String errorFormato) {}

    static String texto(byte[] datos) {
        int desde = datos.length >= 3 && (datos[0] & 0xFF) == 0xEF && (datos[1] & 0xFF) == 0xBB && (datos[2] & 0xFF) == 0xBF
                ? 3 : 0;
        ByteBuffer b = ByteBuffer.wrap(datos, desde, datos.length - desde);
        try {
            return StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT).decode(b).toString();
        } catch (CharacterCodingException ex) {
            return new String(datos, desde, datos.length - desde, Charset.forName("windows-1252"));
        }
    }

    static Resultado leer(byte[] datos) {
        String t = texto(datos);
        char sep = separadorDe(t);
        List<Registro> registros = new ArrayList<>();
        List<String> campos = new ArrayList<>();
        StringBuilder campo = new StringBuilder();
        boolean entreComillas = false, huboComillas = false;
        int linea = 1, lineaInicio = 1;
        for (int i = 0; i < t.length(); i++) {
            char c = t.charAt(i);
            if (entreComillas) {
                if (c == '"') {
                    if (i + 1 < t.length() && t.charAt(i + 1) == '"') {
                        campo.append('"');
                        i++;
                    } else entreComillas = false;
                } else {
                    if (c == '\n') linea++;
                    campo.append(c);
                }
                continue;
            }
            if (c == '"' && campo.toString().isBlank() && !huboComillas) {
                entreComillas = true;
                huboComillas = true;
                campo.setLength(0);
            } else if (c == sep) {
                campos.add(cerrar(campo, huboComillas));
                huboComillas = false;
            } else if (c == '\r' || c == '\n') {
                if (c == '\r' && i + 1 < t.length() && t.charAt(i + 1) == '\n') i++;
                campos.add(cerrar(campo, huboComillas));
                huboComillas = false;
                agregar(registros, lineaInicio, campos);
                campos = new ArrayList<>();
                linea++;
                lineaInicio = linea;
            } else {
                campo.append(c);
            }
        }
        if (entreComillas) {
            return new Resultado(sep, List.of(), "Hay unas comillas sin cerrar: revisa el archivo desde la línea " + lineaInicio + ".");
        }
        if (campo.length() > 0 || huboComillas || !campos.isEmpty()) {
            campos.add(cerrar(campo, huboComillas));
            agregar(registros, lineaInicio, campos);
        }
        return new Resultado(sep, registros, null);
    }

    /** Los registros con todos sus campos vacíos (una línea en blanco o solo con separadores) no cuentan. */
    private static void agregar(List<Registro> registros, int linea, List<String> campos) {
        if (campos.stream().anyMatch(c -> !c.isEmpty())) registros.add(new Registro(linea, campos));
    }

    private static String cerrar(StringBuilder campo, boolean conComillas) {
        String s = conComillas ? campo.toString() : campo.toString().trim();
        campo.setLength(0);
        return s;
    }

    /** El separador es el que más aparece en la primera línea (fuera de comillas): punto y coma o coma. */
    static char separadorDe(String t) {
        int comas = 0, puntos = 0;
        boolean comillas = false;
        for (int i = 0; i < t.length(); i++) {
            char c = t.charAt(i);
            if (c == '"') comillas = !comillas;
            else if (!comillas && (c == '\n' || c == '\r')) break;
            else if (!comillas && c == ',') comas++;
            else if (!comillas && c == ';') puntos++;
        }
        return puntos > comas ? ';' : ',';
    }
}
