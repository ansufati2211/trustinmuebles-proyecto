package pe.trustinmuebles.expediente;

import static pe.trustinmuebles.expediente.LaminaPdf.anchoDe;
import static pe.trustinmuebles.expediente.LaminaPdf.caja;
import static pe.trustinmuebles.expediente.LaminaPdf.cotaH;
import static pe.trustinmuebles.expediente.LaminaPdf.cotaV;
import static pe.trustinmuebles.expediente.LaminaPdf.fmt;
import static pe.trustinmuebles.expediente.LaminaPdf.marcaDeAgua;
import static pe.trustinmuebles.expediente.LaminaPdf.seguro;
import static pe.trustinmuebles.expediente.LaminaPdf.texto;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import pe.trustinmuebles.clasificacion.DocumentoLote;

/**
 * v0.9: documentos referenciales del expediente de un lote de demostración: plano perimétrico y de ubicación, memoria
 * descriptiva, certificado de zonificación y vías, y tasación. Se generan con los datos del caso, con la misma marca de
 * agua y el mismo rótulo que las láminas: no son documentos oficiales, no llevan sello, firma ni código de verificación
 * (RN-01). Un caso con documentos reales (por ejemplo, el plano de la SBN) guarda el PDF original y no usa esta clase.
 */
final class DocumentoLotePdf {
    /** Datos del caso que usan los documentos. Todo es opcional; lo que falta se indica como «no consta». */
    record Datos(String partida, String denominacion, String ubicacion, String zonaRegistral, String oficinaRegistral,
            BigDecimal areaM2, String linderos, String resumen, BigDecimal precio, String moneda, LocalDate fecha) {}

    private static final float IZQ = 56f;
    private static final float DER = 539f;
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private DocumentoLotePdf() {}

    static byte[] generar(DocumentoLote tipo, Datos d) {
        PDFont normal = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        PDFont negrita = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            PDDocumentInformation info = new PDDocumentInformation();
            info.setTitle(seguro(tipo.etiqueta()) + " referencial " + seguro(d.partida()));
            info.setSubject("Documento técnico referencial. Sin sello ni firma.");
            info.setCreator(RotuloInmobiliaria.NOMBRE);
            info.setAuthor(RotuloInmobiliaria.NOMBRE);
            doc.setDocumentInformation(info);

            PDPage pagina = new PDPage(PDRectangle.A4);
            doc.addPage(pagina);
            try (PDPageContentStream cs = new PDPageContentStream(doc, pagina)) {
                marcaDeAgua(cs, negrita);
                cs.setNonStrokingColor(0f);
                texto(cs, seguro(tipo.etiqueta().toUpperCase(Locale.forLanguageTag("es-PE"))), negrita, 15f, IZQ, 790f);
                texto(cs, "Partida N.° " + seguro(d.partida()), normal, 10f, IZQ, 772f);
                texto(cs, seguro(d.denominacion()), normal, 9f, IZQ, 759f);
                cs.setStrokingColor(0.35f);
                cs.setLineWidth(1f);
                cs.addRect(IZQ, 70f, DER - IZQ, 672f);
                cs.stroke();
                switch (tipo) {
                    case PLANO_PERIMETRICO -> perimetrico(cs, d, normal, negrita);
                    case MEMORIA_DESCRIPTIVA -> memoria(cs, d, normal, negrita);
                    case CERTIFICADO_ZONIFICACION -> zonificacion(cs, d, normal, negrita);
                    case TASACION -> tasacion(cs, d, normal, negrita);
                }
                rotulo(cs, tipo, d, normal, negrita);
            }
            doc.save(salida);
            return salida.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    // ---------------------------------------------------------------- plano perimétrico

    private static void perimetrico(PDPageContentStream cs, Datos d, PDFont normal, PDFont negrita) throws IOException {
        LaminaPdf.Medidas m = LaminaPdf.medidas(d.linderos(), d.areaM2());
        // El terreno a escala, centrado en la mitad superior de la hoja.
        float anchoDisp = 250f;
        float altoDisp = 330f;
        double s = Math.min(anchoDisp / m.frente(), altoDisp / m.largo());
        float w = (float) (m.frente() * s);
        float h = (float) (m.largo() * s);
        float x0 = IZQ + 40f + (anchoDisp - w) / 2f;
        float y0 = 360f + (altoDisp - h) / 2f;

        cs.setStrokingColor(0.1f);
        cs.setLineWidth(1.6f);
        cs.setLineDashPattern(new float[] {7f, 3f}, 0f);
        cs.addRect(x0, y0, w, h);
        cs.stroke();
        cs.setLineDashPattern(new float[] {}, 0f);
        // Vértices: A y B al frente (abajo), C y D al fondo.
        float[][] v = {{x0, y0}, {x0 + w, y0}, {x0 + w, y0 + h}, {x0, y0 + h}};
        String[] nombres = {"A", "B", "C", "D"};
        cs.setNonStrokingColor(0.75f, 0.1f, 0.1f);
        for (int i = 0; i < 4; i++) {
            LaminaPdf.circulo(cs, v[i][0], v[i][1], 2.5f, true);
        }
        cs.setNonStrokingColor(0f);
        texto(cs, "A", negrita, 9f, x0 - 11f, y0 - 11f);
        texto(cs, "B", negrita, 9f, x0 + w + 4f, y0 - 11f);
        texto(cs, "C", negrita, 9f, x0 + w + 4f, y0 + h + 4f);
        texto(cs, "D", negrita, 9f, x0 - 11f, y0 + h + 4f);
        cotaH(cs, normal, x0, x0 + w, y0, y0 - 26f, fmt(m.frente()));
        cotaV(cs, normal, y0, y0 + h, x0 + w, x0 + w + 26f, fmt(m.largo()));
        // Vía al frente.
        cs.setStrokingColor(0.45f);
        cs.setLineWidth(0.8f);
        cs.moveTo(IZQ + 10f, y0 - 44f);
        cs.lineTo(IZQ + 330f, y0 - 44f);
        cs.stroke();
        cs.setNonStrokingColor(0.25f);
        String via = seguro(m.via().toUpperCase(Locale.forLanguageTag("es-PE")));
        texto(cs, via, negrita, 8f, x0 + w / 2f - anchoDe(via, negrita, 8f) / 2f, y0 - 56f);
        cs.setNonStrokingColor(0f);
        String area = d.areaM2() == null ? "no consta" : d.areaM2().setScale(2, RoundingMode.HALF_UP).toPlainString() + " m²";
        double perimetro = 2 * (m.frente() + m.largo());
        texto(cs, "ÁREA = " + area, negrita, 9f, x0 + w / 2f - 40f, y0 + h / 2f + 6f);
        texto(cs, "PERÍMETRO = " + fmt(perimetro) + " m", normal, 8.5f, x0 + w / 2f - 40f, y0 + h / 2f - 7f);
        if (!m.propias()) {
            cs.setNonStrokingColor(0.5f, 0.1f, 0.1f);
            texto(cs, "Los linderos no constan: se dibuja un terreno tipo.", normal, 7.5f, IZQ + 8f, 345f);
            cs.setNonStrokingColor(0f);
        }

        // Cuadro de datos técnicos.
        float cx = IZQ + 330f;
        float cy = 650f;
        caja(cs, cx, cy - 102f, 145f, 102f);
        texto(cs, "CUADRO DE DATOS TÉCNICOS", negrita, 7.5f, cx + 6f, cy - 12f);
        texto(cs, "Vértice   Lado   Distancia   Ángulo", negrita, 7f, cx + 6f, cy - 26f);
        double[] lados = {m.frente(), m.largo(), m.frente(), m.largo()};
        for (int i = 0; i < 4; i++) {
            String fila = String.format(Locale.ROOT, "%s          %s-%s     %8s m     90°00'",
                    nombres[i], nombres[i], nombres[(i + 1) % 4], fmt(lados[i]));
            texto(cs, seguro(fila), normal, 7f, cx + 6f, cy - 40f - i * 12f);
        }
        texto(cs, "Perímetro: " + fmt(perimetro) + " m", normal, 7f, cx + 6f, cy - 96f);

        // Croquis de ubicación: la manzana con el lote resaltado.
        float ux = IZQ + 330f;
        float uy = 380f;
        caja(cs, ux, uy, 145f, 150f);
        texto(cs, "UBICACIÓN (croquis)", negrita, 7.5f, ux + 6f, uy + 138f);
        cs.setStrokingColor(0.45f);
        cs.setLineWidth(0.6f);
        for (int col = 0; col < 4; col++) {
            for (int fila = 0; fila < 2; fila++) {
                cs.addRect(ux + 14f + col * 29f, uy + 38f + fila * 40f, 27f, 38f);
            }
        }
        cs.stroke();
        cs.setNonStrokingColor(0.2f, 0.55f, 0.35f);
        cs.addRect(ux + 14f + 29f, uy + 38f, 27f, 38f);
        cs.fill();
        cs.setNonStrokingColor(0f);
        texto(cs, "Lote", negrita, 6.5f, ux + 48f, uy + 54f);
        texto(cs, via.length() > 26 ? via.substring(0, 26) : via, normal, 6.5f, ux + 14f, uy + 24f);
        cs.setStrokingColor(0.45f);
        cs.moveTo(ux + 10f, uy + 34f);
        cs.lineTo(ux + 135f, uy + 34f);
        cs.stroke();
        norte(cs, negrita, ux + 124f, uy + 112f);

        // Linderos tal como constan en la partida.
        cs.setNonStrokingColor(0f);
        texto(cs, "LINDEROS Y MEDIDAS PERIMÉTRICAS", negrita, 8f, IZQ + 10f, 300f);
        parrafo(cs, d.linderos() == null ? "No constan en la partida." : d.linderos(), normal, 8f, IZQ + 10f, 286f,
                DER - IZQ - 20f, 11f);
        if (d.resumen() != null) {
            texto(cs, "DATOS DEL DOCUMENTO", negrita, 8f, IZQ + 10f, 220f);
            parrafo(cs, d.resumen(), normal, 8f, IZQ + 10f, 206f, DER - IZQ - 20f, 11f);
        }
    }

    private static void norte(PDPageContentStream cs, PDFont negrita, float nx, float ny) throws IOException {
        cs.setStrokingColor(0f);
        cs.setNonStrokingColor(0f);
        cs.setLineWidth(0.8f);
        cs.moveTo(nx, ny + 10f);
        cs.lineTo(nx - 4f, ny - 5f);
        cs.lineTo(nx, ny - 2f);
        cs.lineTo(nx + 4f, ny - 5f);
        cs.closePath();
        cs.fill();
        texto(cs, "N", negrita, 8f, nx - 2.5f, ny + 13f);
    }

    // ---------------------------------------------------------------- documentos de texto

    private static void memoria(PDPageContentStream cs, Datos d, PDFont normal, PDFont negrita) throws IOException {
        LaminaPdf.Medidas m = LaminaPdf.medidas(d.linderos(), d.areaM2());
        float y = 715f;
        y = seccion(cs, "1. OBJETO", "Describir el predio inscrito en la partida N.° " + d.partida()
                + ": su ubicación, sus linderos y medidas perimétricas, su área y su perímetro.", y, normal, negrita);
        y = seccion(cs, "2. UBICACIÓN", noConsta(d.ubicacion()), y, normal, negrita);
        y = seccion(cs, "3. LINDEROS Y MEDIDAS PERIMÉTRICAS", noConsta(d.linderos()), y, normal, negrita);
        String area = d.areaM2() == null ? "no consta" : d.areaM2().setScale(2, RoundingMode.HALF_UP).toPlainString() + " m²";
        y = seccion(cs, "4. ÁREA Y PERÍMETRO", "Área: " + area + ". Perímetro: " + fmt(2 * (m.frente() + m.largo()))
                + " m" + (m.propias() ? "." : " (terreno tipo: los linderos no constan)."), y, normal, negrita);
        y = seccion(cs, "5. DATOS REGISTRALES", noConsta(d.zonaRegistral()) + " · " + noConsta(d.oficinaRegistral())
                + " · Partida N.° " + d.partida() + ".", y, normal, negrita);
        if (d.resumen() != null) seccion(cs, "6. OBSERVACIONES", d.resumen(), y, normal, negrita);
    }

    private static void zonificacion(PDPageContentStream cs, Datos d, PDFont normal, PDFont negrita) throws IOException {
        float y = 715f;
        y = seccion(cs, "PREDIO", noConsta(d.ubicacion()), y, normal, negrita);
        y = seccion(cs, "ZONIFICACIÓN Y VÍAS", noConsta(d.resumen()), y, normal, negrita);
        seccion(cs, "ALCANCE", "Documento referencial del expediente. No lo emite una municipalidad y no"
                + " reemplaza el certificado de zonificación y vías que se tramita en ella.", y, normal, negrita);
    }

    private static void tasacion(PDPageContentStream cs, Datos d, PDFont normal, PDFont negrita) throws IOException {
        float y = 715f;
        y = seccion(cs, "PREDIO", noConsta(d.ubicacion()), y, normal, negrita);
        String area = d.areaM2() == null ? "no consta" : d.areaM2().setScale(2, RoundingMode.HALF_UP).toPlainString() + " m²";
        String valor = d.precio() == null ? "no consta" : dinero(d.precio(), d.moneda());
        String unitario = d.precio() == null || d.areaM2() == null || d.areaM2().signum() <= 0 ? "no consta"
                : dinero(d.precio().divide(d.areaM2(), 2, RoundingMode.HALF_UP), d.moneda()) + " por m²";
        y = seccion(cs, "VALOR REFERENCIAL", "Área del terreno: " + area + ". Valor del terreno: " + valor
                + ". Valor unitario: " + unitario + ".", y, normal, negrita);
        if (d.resumen() != null) y = seccion(cs, "MÉTODO Y CRITERIOS", d.resumen(), y, normal, negrita);
        seccion(cs, "ALCANCE", "Valor informativo del expediente; no es una oferta ni una tasación"
                + " oficial, y no interviene en el indicador A.", y, normal, negrita);
    }

    private static String dinero(BigDecimal monto, String moneda) {
        DecimalFormat f = new DecimalFormat("#,##0.00", DecimalFormatSymbols.getInstance(Locale.US));
        return ("USD".equals(moneda) ? "US$ " : "S/ ") + f.format(monto);
    }

    private static String noConsta(String s) {
        return s == null || s.isBlank() ? "No consta." : s;
    }

    /** Un título y su párrafo. Devuelve la altura donde puede empezar la sección siguiente. */
    private static float seccion(PDPageContentStream cs, String titulo, String cuerpo, float y, PDFont normal,
            PDFont negrita) throws IOException {
        cs.setNonStrokingColor(0f);
        texto(cs, seguro(titulo), negrita, 9.5f, IZQ + 12f, y);
        return parrafo(cs, cuerpo, normal, 9f, IZQ + 12f, y - 15f, DER - IZQ - 24f, 12.5f) - 14f;
    }

    /** Escribe un texto en varias líneas dentro de {@code ancho}. Devuelve la altura después de la última línea. */
    static float parrafo(PDPageContentStream cs, String texto, PDFont f, float tam, float x, float y, float ancho,
            float interlineado) throws IOException {
        float yy = y;
        for (String linea : lineas(seguro(texto), f, tam, ancho)) {
            texto(cs, linea, f, tam, x, yy);
            yy -= interlineado;
        }
        return yy;
    }

    static List<String> lineas(String texto, PDFont f, float tam, float ancho) throws IOException {
        List<String> lineas = new ArrayList<>();
        StringBuilder actual = new StringBuilder();
        for (String palabra : texto.split("\\s+")) {
            String prueba = actual.isEmpty() ? palabra : actual + " " + palabra;
            if (anchoDe(prueba, f, tam) > ancho && !actual.isEmpty()) {
                lineas.add(actual.toString());
                actual = new StringBuilder(palabra);
            } else {
                actual = new StringBuilder(prueba);
            }
        }
        if (!actual.isEmpty()) lineas.add(actual.toString());
        return lineas;
    }

    // ---------------------------------------------------------------- rótulo

    private static void rotulo(PDPageContentStream cs, DocumentoLote tipo, Datos d, PDFont normal, PDFont negrita)
            throws IOException {
        String codigo = switch (tipo) {
            case PLANO_PERIMETRICO -> "L-01";
            case MEMORIA_DESCRIPTIVA -> "MD-01";
            case CERTIFICADO_ZONIFICACION -> "CZ-01";
            case TASACION -> "TS-01";
        };
        cs.setStrokingColor(0.2f);
        cs.setLineWidth(0.8f);
        cs.addRect(IZQ, 70f, DER - IZQ, 52f);
        cs.moveTo(DER - 74f, 70f);
        cs.lineTo(DER - 74f, 122f);
        cs.stroke();
        cs.setNonStrokingColor(0f);
        texto(cs, seguro(LaminaPdf.ROTULO), negrita, 7.5f, IZQ + 6f, 111f);
        texto(cs, seguro("Documento: " + tipo.etiqueta() + " · Partida N.° " + d.partida()), normal, 8f, IZQ + 6f, 99f);
        texto(cs, "Profesional: no consigna (documento referencial) · Fecha: "
                + (d.fecha() == null ? "no consta" : d.fecha().format(FECHA)), normal, 8f, IZQ + 6f, 88f);
        texto(cs, "Documento referencial de la inmobiliaria. No reemplaza el documento que emite la entidad competente.",
                normal, 7.5f, IZQ + 6f, 77f);
        texto(cs, "HOJA", normal, 7f, DER - 52f, 108f);
        texto(cs, codigo, negrita, 14f, DER - 66f, 86f);
    }
}
