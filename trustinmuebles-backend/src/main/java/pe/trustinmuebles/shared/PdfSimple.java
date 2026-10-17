package pe.trustinmuebles.shared;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/** Generador mínimo de PDF de una página (texto Helvetica) para los documentos del prototipo. */
public final class PdfSimple {
    private PdfSimple() {}

    public static byte[] generar(String titulo, List<String> lineas) {
        StringBuilder c = new StringBuilder("BT /F1 18 Tf 50 780 Td (").append(esc(titulo)).append(") Tj ET\n");
        float y = 745;
        for (String l : lineas) {
            c.append("BT /F1 11 Tf 50 ").append(y).append(" Td (").append(esc(l)).append(") Tj ET\n");
            y -= 18;
        }
        byte[] contenido = c.toString().getBytes(StandardCharsets.ISO_8859_1);
        List<String> objs = new ArrayList<>();
        objs.add("<< /Type /Catalog /Pages 2 0 R >>");
        objs.add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
        objs.add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R "
                + "/Resources << /Font << /F1 5 0 R >> >> >>");
        objs.add("<< /Length " + contenido.length + " >>\nstream\n" + new String(contenido, StandardCharsets.ISO_8859_1)
                + "endstream");
        objs.add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        List<Integer> offsets = new ArrayList<>();
        write(out, "%PDF-1.4\n");
        for (int i = 0; i < objs.size(); i++) {
            offsets.add(out.size());
            write(out, (i + 1) + " 0 obj\n" + objs.get(i) + "\nendobj\n");
        }
        int xref = out.size();
        StringBuilder x = new StringBuilder("xref\n0 ").append(objs.size() + 1).append("\n0000000000 65535 f \n");
        for (int off : offsets) x.append(String.format("%010d 00000 n \n", off));
        x.append("trailer\n<< /Size ").append(objs.size() + 1).append(" /Root 1 0 R >>\nstartxref\n").append(xref)
                .append("\n%%EOF");
        write(out, x.toString());
        return out.toByteArray();
    }

    private static void write(ByteArrayOutputStream out, String s) {
        out.writeBytes(s.getBytes(StandardCharsets.ISO_8859_1));
    }

    private static String esc(String s) {
        return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
    }
}
