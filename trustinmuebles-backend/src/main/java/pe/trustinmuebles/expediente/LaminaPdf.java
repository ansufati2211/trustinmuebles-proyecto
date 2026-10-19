package pe.trustinmuebles.expediente;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.state.PDExtendedGraphicsState;
import org.apache.pdfbox.util.Matrix;
import pe.trustinmuebles.clasificacion.Especialidad;

/**
 * Lámina 2D referencial de una especialidad del expediente técnico (arquitectura, estructuras, II.EE., II.SS.).
 *
 * Es un esquema ficticio de una vivienda tipo, para que el expediente muestre qué plano corresponde a cada especialidad.
 * No es un plano real, no lleva sello ni firma de un profesional, y cada página trae un rótulo y una marca de agua que
 * lo dicen. Si el revisor sube el PDF real del plano, ese reemplaza a esta lámina.
 */
final class LaminaPdf {
    static final String MARCA_DE_AGUA = "DOCUMENTO TÉCNICO REFERENCIAL · FICTICIO";
    static final String ROTULO = "DOCUMENTO TÉCNICO REFERENCIAL DEL EXPEDIENTE · FICTICIO · SIN SELLO NI FIRMA";

    private static final float X0 = 100f;
    private static final float Y0 = 340f;
    private static final float ANCHO = 400f;
    private static final float ALTO = 330f;

    private LaminaPdf() {}

    static byte[] generar(Especialidad especialidad, String partida, String denominacion, BigDecimal areaConstruida,
            String sistemaConstructivo) {
        PDFont normal = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        PDFont negrita = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            PDDocumentInformation info = new PDDocumentInformation();
            info.setTitle("Lámina referencial " + seguro(especialidad.etiqueta()) + " " + seguro(partida));
            info.setSubject("Documento técnico referencial ficticio. Sin sello ni firma.");
            info.setCreator("Trustinmuebles");
            doc.setDocumentInformation(info);

            PDPage pagina = new PDPage(PDRectangle.A4);
            doc.addPage(pagina);
            try (PDPageContentStream cs = new PDPageContentStream(doc, pagina)) {
                marcaDeAgua(cs, negrita);
                cs.setNonStrokingColor(0f);
                texto(cs, seguro(especialidad.etiqueta().toUpperCase(java.util.Locale.forLanguageTag("es-PE"))), negrita,
                        15f, 56f, 790f);
                texto(cs, "Partida N.° " + seguro(partida), normal, 10f, 56f, 772f);
                texto(cs, seguro(denominacion), normal, 9f, 56f, 759f);
                if (areaConstruida != null) {
                    texto(cs, "Área construida: " + areaConstruida.setScale(2, RoundingMode.HALF_UP).toPlainString()
                            + " m²", normal, 9f, 56f, 746f);
                }

                cs.setLineWidth(1f);
                cs.setStrokingColor(0.35f);
                cs.addRect(56f, 70f, 483f, 690f - 40f);
                cs.stroke();

                dibujar(cs, especialidad, normal, negrita, sistemaConstructivo);
                rotulo(cs, especialidad, partida, normal, negrita);
            }
            doc.save(salida);
            return salida.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    // ---------------------------------------------------------------- dibujo

    private static void dibujar(PDPageContentStream cs, Especialidad e, PDFont normal, PDFont negrita,
            String sistema) throws IOException {
        // Distribución común: fila de abajo (dormitorios, baño y lavandería) y fila de arriba (sala-comedor y cocina).
        float[] xs = {0f, 0.30f, 0.60f, 0.80f, 1f};
        float[] ys = {0f, 0.5f, 1f};
        switch (e) {
            case ARQUITECTURA -> {
                muros(cs);
                tabique(cs, 0.3f, 0f, 0.3f, 0.5f);
                tabique(cs, 0.6f, 0f, 0.6f, 1f);
                tabique(cs, 0.8f, 0f, 0.8f, 0.5f);
                tabique(cs, 0f, 0.5f, 1f, 0.5f);
                etiqueta(cs, normal, 0.30f, 0.75f, "SALA-COMEDOR");
                etiqueta(cs, normal, 0.80f, 0.75f, "COCINA");
                etiqueta(cs, normal, 0.15f, 0.25f, "DORM. 1");
                etiqueta(cs, normal, 0.45f, 0.25f, "DORM. 2");
                etiqueta(cs, normal, 0.70f, 0.25f, "S.H.");
                etiqueta(cs, normal, 0.90f, 0.25f, "LAV.");
                texto(cs, "Distribución y áreas · Esquema sin escala", normal, 8.5f, X0, Y0 - 30f);
            }
            case ESTRUCTURAS -> {
                cs.setStrokingColor(0.55f);
                cs.setLineWidth(0.8f);
                cs.setLineDashPattern(new float[] {4f, 3f}, 0f);
                cs.addRect(X0 - 8f, Y0 - 8f, ANCHO + 16f, ALTO + 16f); // cimiento corrido
                cs.stroke();
                cs.setLineDashPattern(new float[] {}, 0f);
                cs.setStrokingColor(0.2f);
                cs.setLineWidth(2.2f);
                for (float y : ys) linea(cs, 0f, y, 1f, y); // vigas
                for (float x : xs) linea(cs, x, 0f, x, 1f);
                cs.setNonStrokingColor(0f);
                for (float x : xs) for (float y : ys) columna(cs, x, y);
                texto(cs, "Sistema constructivo: " + seguro(sistema == null ? "no indicado" : sistema), negrita, 9f, X0,
                        Y0 - 30f);
                texto(cs, "Cimentación: cimiento corrido y zapatas en cruces de ejes · Columnas y vigas: esquema",
                        normal, 8.5f, X0, Y0 - 44f);
            }
            case ELECTRICAS -> {
                muros(cs);
                tabique(cs, 0f, 0.5f, 1f, 0.5f);
                cs.setStrokingColor(0.15f, 0.25f, 0.8f);
                cs.setLineWidth(1.2f);
                // Tablero general en el muro izquierdo y un circuito por ambiente.
                float[][] centros = {{0.30f, 0.75f}, {0.80f, 0.75f}, {0.15f, 0.25f}, {0.45f, 0.25f}, {0.70f, 0.25f},
                        {0.90f, 0.25f}};
                for (float[] c : centros) linea(cs, 0.02f, 0.5f, c[0], c[1]);
                cs.setNonStrokingColor(1f);
                for (float[] c : centros) {
                    circulo(cs, X0 + c[0] * ANCHO, Y0 + c[1] * ALTO, 5f); // luminaria
                    cs.setStrokingColor(0.15f, 0.25f, 0.8f);
                    cs.stroke();
                    cs.addRect(X0 + c[0] * ANCHO + 10f, Y0 + c[1] * ALTO - 12f, 6f, 6f); // tomacorriente
                    cs.stroke();
                }
                cs.setNonStrokingColor(0.15f, 0.25f, 0.8f);
                cs.addRect(X0 - 4f, Y0 + 0.5f * ALTO - 9f, 18f, 18f); // tablero
                cs.fill();
                texto(cs, "TG", negrita, 8f, X0 + 18f, Y0 + 0.5f * ALTO - 3f);
                // Pozo a tierra fuera de la vivienda.
                cs.setStrokingColor(0f);
                cs.setLineWidth(1.4f);
                float px = X0 - 40f;
                float py = Y0 + 0.5f * ALTO;
                cs.moveTo(px + 26f, py);
                cs.lineTo(px + 8f, py);
                cs.lineTo(px + 8f, py - 14f);
                cs.stroke();
                for (int i = 0; i < 3; i++) {
                    cs.moveTo(px + 8f - 9f + i * 3f, py - 14f - i * 4f);
                    cs.lineTo(px + 8f + 9f - i * 3f, py - 14f - i * 4f);
                    cs.stroke();
                }
                texto(cs, "Pozo a tierra", normal, 7f, px - 14f, py - 38f);
                texto(cs, "TG: tablero general · Circuitos de alumbrado y tomacorrientes (esquema)", normal, 8.5f, X0,
                        Y0 - 30f);
                texto(cs, "Diagrama unifilar: no representado en esta lámina referencial", normal, 8.5f, X0, Y0 - 44f);
            }
            case SANITARIAS -> {
                muros(cs);
                tabique(cs, 0f, 0.5f, 1f, 0.5f);
                tabique(cs, 0.6f, 0f, 0.6f, 0.5f);
                cs.setLineWidth(1.6f);
                cs.setStrokingColor(0.1f, 0.4f, 0.85f); // agua fría
                linea(cs, 1.05f, 0.62f, 0.80f, 0.62f);
                linea(cs, 0.80f, 0.62f, 0.80f, 0.75f);
                linea(cs, 0.80f, 0.62f, 0.72f, 0.40f);
                cs.setStrokingColor(0.85f, 0.15f, 0.15f); // agua caliente
                linea(cs, 0.80f, 0.70f, 0.74f, 0.70f);
                linea(cs, 0.74f, 0.70f, 0.70f, 0.30f);
                cs.setStrokingColor(0.4f);
                cs.setLineWidth(2.4f); // desagüe
                linea(cs, 0.70f, 0.20f, 0.70f, -0.12f);
                linea(cs, 0.80f, 0.78f, 0.80f, 0.50f);
                linea(cs, 0.80f, 0.50f, 0.70f, 0.50f);
                linea(cs, 0.70f, -0.12f, 1.05f, -0.12f);
                cs.setNonStrokingColor(1f);
                circulo(cs, X0 + 1.05f * ANCHO, Y0 - 0.12f * ALTO, 7f); // buzón
                cs.setStrokingColor(0f);
                cs.setLineWidth(1.2f);
                cs.stroke();
                texto(cs, "Buzón", normal, 7f, X0 + 1.05f * ANCHO - 10f, Y0 - 0.12f * ALTO - 16f);
                etiqueta(cs, normal, 0.80f, 0.85f, "COCINA");
                etiqueta(cs, normal, 0.70f, 0.10f, "S.H.");
                texto(cs, "Azul: agua fría · Rojo: agua caliente · Gris: desagüe y ventilación (esquema)", normal, 8.5f,
                        X0, Y0 - 70f);
            }
        }
    }

    private static void muros(PDPageContentStream cs) throws IOException {
        cs.setStrokingColor(0f);
        cs.setLineWidth(2.4f);
        cs.addRect(X0, Y0, ANCHO, ALTO);
        cs.stroke();
    }

    private static void tabique(PDPageContentStream cs, float x1, float y1, float x2, float y2) throws IOException {
        cs.setStrokingColor(0.1f);
        cs.setLineWidth(1.2f);
        linea(cs, x1, y1, x2, y2);
    }

    private static void linea(PDPageContentStream cs, float x1, float y1, float x2, float y2) throws IOException {
        cs.moveTo(X0 + x1 * ANCHO, Y0 + y1 * ALTO);
        cs.lineTo(X0 + x2 * ANCHO, Y0 + y2 * ALTO);
        cs.stroke();
    }

    private static void columna(PDPageContentStream cs, float x, float y) throws IOException {
        cs.addRect(X0 + x * ANCHO - 5f, Y0 + y * ALTO - 5f, 10f, 10f);
        cs.fill();
    }

    private static void etiqueta(PDPageContentStream cs, PDFont f, float x, float y, String s) throws IOException {
        cs.setNonStrokingColor(0.1f);
        float w = anchoDe(s, f, 8f);
        texto(cs, s, f, 8f, X0 + x * ANCHO - w / 2f, Y0 + y * ALTO);
    }

    /** Círculo con curvas de Bézier; deja la ruta sin rellenar para que quien llama decida. */
    private static void circulo(PDPageContentStream cs, float cx, float cy, float r) throws IOException {
        final float k = 0.5523f * r;
        cs.moveTo(cx + r, cy);
        cs.curveTo(cx + r, cy + k, cx + k, cy + r, cx, cy + r);
        cs.curveTo(cx - k, cy + r, cx - r, cy + k, cx - r, cy);
        cs.curveTo(cx - r, cy - k, cx - k, cy - r, cx, cy - r);
        cs.curveTo(cx + k, cy - r, cx + r, cy - k, cx + r, cy);
        cs.closePath();
        cs.fillAndStroke();
    }

    private static void rotulo(PDPageContentStream cs, Especialidad e, String partida, PDFont normal, PDFont negrita)
            throws IOException {
        cs.setStrokingColor(0.2f);
        cs.setLineWidth(0.8f);
        cs.addRect(56f, 70f, 483f, 52f);
        cs.stroke();
        cs.setNonStrokingColor(0f);
        texto(cs, seguro(ROTULO), negrita, 8f, 62f, 108f);
        texto(cs, "Especialidad: " + seguro(e.etiqueta()) + " · Partida N.° " + seguro(partida), normal, 8.5f, 62f, 94f);
        texto(cs, "Esquema ficticio de una vivienda tipo, sin escala. No reemplaza el plano aprobado por la municipalidad.",
                normal, 7.5f, 62f, 80f);
    }

    /** Texto diagonal translúcido, debajo del dibujo. */
    private static void marcaDeAgua(PDPageContentStream cs, PDFont negrita) throws IOException {
        String marca = seguro(MARCA_DE_AGUA);
        float tam = 26f;
        double ang = Math.toRadians(52);
        float w = anchoDe(marca, negrita, tam);
        float cx = PDRectangle.A4.getWidth() / 2f;
        float cy = PDRectangle.A4.getHeight() / 2f;
        PDExtendedGraphicsState gs = new PDExtendedGraphicsState();
        gs.setNonStrokingAlphaConstant(0.12f);
        cs.saveGraphicsState();
        cs.setGraphicsStateParameters(gs);
        cs.setNonStrokingColor(0.1f);
        cs.beginText();
        cs.setFont(negrita, tam);
        cs.setTextMatrix(Matrix.getRotateInstance(ang, (float) (cx - (w / 2f) * Math.cos(ang)),
                (float) (cy - (w / 2f) * Math.sin(ang))));
        cs.showText(marca);
        cs.endText();
        cs.restoreGraphicsState();
    }

    private static void texto(PDPageContentStream cs, String s, PDFont f, float tam, float x, float y) throws IOException {
        cs.beginText();
        cs.setFont(f, tam);
        cs.newLineAtOffset(x, y);
        cs.showText(s);
        cs.endText();
    }

    private static float anchoDe(String s, PDFont f, float tam) throws IOException {
        return f.getStringWidth(s) / 1000f * tam;
    }

    /** Solo caracteres de la codificación del PDF; el resto se cambia por «?» para no romper la generación. */
    private static String seguro(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder();
        s.codePoints().forEach(cp -> sb.append(cp >= 32 && cp < 256 && !(cp >= 127 && cp < 160) ? (char) cp : '?'));
        return sb.toString();
    }
}
