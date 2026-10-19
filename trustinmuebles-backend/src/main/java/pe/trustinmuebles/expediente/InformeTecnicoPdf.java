package pe.trustinmuebles.expediente;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
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
import org.apache.pdfbox.pdmodel.graphics.state.PDExtendedGraphicsState;
import org.apache.pdfbox.util.Matrix;
import pe.trustinmuebles.inspeccion.EvaluacionTecnicaDto;
import pe.trustinmuebles.inspeccion.VerificacionCampo;

/**
 * Informe técnico de la inspección presencial (indicador B), en PDF.
 *
 * Es un documento referencial ficticio: el profesional y su colegiatura son de demostración, no lleva sello ni firma, y
 * cada página dice que no es un informe real ni tiene valor legal. Solo se genera cuando el informe fue emitido.
 */
final class InformeTecnicoPdf {
    static final String MARCA_DE_AGUA = "INFORME REFERENCIAL · FICTICIO · SIN FIRMA NI SELLO";
    static final String PIE = "Informe referencial ficticio. No está firmado ni sellado por un profesional, no es un informe de "
            + "inspección real y no tiene valor legal.";
    static final String CIERRE = "[Sin firma: documento referencial]";

    /** Un plano del expediente tal como lo muestra el informe. */
    record PlanoResumen(String especialidad, String estado, String detalle, VerificacionCampo verificacion) {}

    record Datos(String partida, String denominacion, String ubicacion, BigDecimal areaTerreno,
            BigDecimal areaConstruidaInscrita, List<PlanoResumen> planos, EvaluacionTecnicaDto informe) {}

    private record Linea(String texto, PDFont fuente, float tam, float sangria, float antes, boolean barra) {}

    private static final float MARGEN = 56f;
    private static final float ALTO_ENCABEZADO = 62f;
    private static final float ALTO_PIE = 34f;
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("d 'de' MMMM 'de' yyyy",
            Locale.forLanguageTag("es-PE"));

    private InformeTecnicoPdf() {}

    static byte[] generar(Datos d) {
        PDFont normal = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        PDFont negrita = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
        float ancho = PDRectangle.A4.getWidth() - 2 * MARGEN;
        List<List<Linea>> paginas = paginar(contenido(d, normal, negrita, ancho));

        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            PDDocumentInformation info = new PDDocumentInformation();
            info.setTitle("Informe técnico referencial " + limpiar(d.partida(), normal));
            info.setSubject("Informe referencial ficticio. Sin firma ni sello. Sin valor legal.");
            info.setCreator("Trustinmuebles");
            doc.setDocumentInformation(info);

            int total = paginas.size();
            for (int i = 0; i < total; i++) {
                PDPage pagina = new PDPage(PDRectangle.A4);
                doc.addPage(pagina);
                try (PDPageContentStream cs = new PDPageContentStream(doc, pagina)) {
                    marcaDeAgua(cs, negrita);
                    encabezado(cs, d, normal, negrita);
                    float y = PDRectangle.A4.getHeight() - MARGEN - ALTO_ENCABEZADO;
                    for (Linea l : paginas.get(i)) {
                        y -= l.antes() + l.tam() * 1.3f;
                        if (l.barra()) {
                            cs.setNonStrokingColor(0.90f);
                            cs.addRect(MARGEN - 3f, y - 3.5f, ancho + 6f, l.tam() + 5.5f);
                            cs.fill();
                        }
                        cs.setNonStrokingColor(0.08f);
                        texto(cs, l.texto(), l.fuente(), l.tam(), MARGEN + l.sangria(), y);
                    }
                    pie(cs, i + 1, total, normal);
                }
            }
            doc.save(salida);
            return salida.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    // ---------------------------------------------------------------- contenido

    private static List<Linea> contenido(Datos d, PDFont normal, PDFont negrita, float ancho) {
        EvaluacionTecnicaDto t = d.informe();
        List<Linea> l = new ArrayList<>();
        parrafo(l, "INFORME TÉCNICO DE INSPECCIÓN (REFERENCIAL)", negrita, 14f, 0f, 2f, ancho, false);
        parrafo(l, "Inspección técnica presencial del inmueble. Indicador B: verificación física, independiente de la "
                + "pre-evaluación documental.", normal, 9f, 0f, 2f, ancho, false);

        seccion(l, "1. DATOS DEL INMUEBLE", negrita, ancho);
        parrafo(l, "Partida N.°: " + d.partida(), normal, 10f, 0f, 3f, ancho, false);
        parrafo(l, "Predio: " + valor(d.denominacion()), normal, 10f, 0f, 2f, ancho, false);
        parrafo(l, "Ubicación: " + valor(d.ubicacion()), normal, 10f, 0f, 2f, ancho, false);
        parrafo(l, "Área del terreno: " + m2(d.areaTerreno()) + " · Área construida inscrita: " + m2(d.areaConstruidaInscrita()),
                normal, 10f, 0f, 2f, ancho, false);

        seccion(l, "2. PROFESIONAL Y FECHAS", negrita, ancho);
        parrafo(l, "Profesional: " + valor(t.profesional()), normal, 10f, 0f, 3f, ancho, false);
        parrafo(l, "Colegiatura: " + valor(t.colegiatura()), normal, 10f, 0f, 2f, ancho, false);
        parrafo(l, "Inspección solicitada el: " + fecha(t.fechaSolicitud()), normal, 10f, 0f, 2f, ancho, false);
        parrafo(l, "Inspección presencial realizada el: " + fecha(t.fechaInspeccion()), normal, 10f, 0f, 2f, ancho, false);

        seccion(l, "3. ALCANCE Y PROCEDIMIENTO", negrita, ancho);
        String[] pasos = {
            "Revisión documental previa: partida registral, declaratoria de fábrica y antecedentes del predio.",
            "Verificación de los planos de las 4 especialidades frente a lo construido.",
            "Inspección física presencial, visual e instrumental, in situ.",
            "Identificación de observaciones, deficiencias o riesgos que no figuraban en los planos.",
            "Emisión del informe técnico, con el profesional colegiado responsable.",
            "Delimitación de las conclusiones y de los estudios adicionales que se requieren."};
        for (int i = 0; i < pasos.length; i++) {
            parrafo(l, "Paso " + (i + 1) + ". " + pasos[i], normal, 9.5f, 8f, 2f, ancho, false);
        }

        seccion(l, "4. DOCUMENTOS REVISADOS Y VERIFICACIÓN EN CAMPO", negrita, ancho);
        for (PlanoResumen p : d.planos()) {
            parrafo(l, p.especialidad(), negrita, 9.5f, 0f, 5f, ancho, false);
            parrafo(l, "Plano: " + p.estado() + (p.detalle() == null || p.detalle().isBlank() ? "" : " (" + p.detalle() + ")")
                    + " · En campo: " + etiqueta(p.verificacion()), normal, 9.5f, 8f, 1f, ancho, false);
        }

        seccion(l, "5. OBSERVACIONES Y DEFICIENCIAS FÍSICAS", negrita, ancho);
        parrafo(l, valor(t.observaciones()), normal, 10f, 0f, 3f, ancho, false);

        seccion(l, "6. CONCLUSIÓN", negrita, ancho);
        parrafo(l, "Resultado: " + valor(t.resultadoEtiqueta()), negrita, 10.5f, 0f, 3f, ancho, false);
        parrafo(l, valor(t.conclusiones()), normal, 10f, 0f, 3f, ancho, false);

        seccion(l, "7. ESTUDIOS ADICIONALES REQUERIDOS", negrita, ancho);
        parrafo(l, valor(t.estudiosAdicionales()), normal, 10f, 0f, 3f, ancho, false);

        seccion(l, "8. LIMITACIONES", negrita, ancho);
        parrafo(l, t.limite(), normal, 9.5f, 0f, 3f, ancho, false);

        parrafo(l, CIERRE, negrita, 9.5f, 0f, 16f, ancho, false);
        return l;
    }

    private static String etiqueta(VerificacionCampo v) {
        return switch (v == null ? VerificacionCampo.NO_VERIFICADO : v) {
            case CONFORME -> "conforme";
            case OBSERVADO -> "observado";
            case NO_VERIFICADO -> "no verificado";
        };
    }

    private static String m2(BigDecimal v) {
        return v == null ? "no consta" : v.setScale(2, RoundingMode.HALF_UP).toPlainString() + " m²";
    }

    private static String fecha(LocalDate f) {
        return f == null ? "no consta" : f.format(FECHA);
    }

    private static String valor(String s) {
        return s == null || s.isBlank() ? "no consta" : s;
    }

    private static void seccion(List<Linea> l, String texto, PDFont negrita, float ancho) {
        l.add(new Linea(limpiar(texto, negrita), negrita, 10.5f, 0f, 14f, true));
    }

    private static void parrafo(List<Linea> l, String texto, PDFont f, float tam, float sangria, float antes, float ancho,
            boolean barra) {
        List<String> partes = ajustar(limpiar(texto, f), f, tam, ancho - sangria);
        for (int i = 0; i < partes.size(); i++) l.add(new Linea(partes.get(i), f, tam, sangria, i == 0 ? antes : 0f, barra));
    }

    // ---------------------------------------------------------------- paginación y dibujo

    private static List<List<Linea>> paginar(List<Linea> lineas) {
        float disponible = PDRectangle.A4.getHeight() - 2 * MARGEN - ALTO_ENCABEZADO - ALTO_PIE;
        List<List<Linea>> paginas = new ArrayList<>();
        List<Linea> actual = new ArrayList<>();
        float usado = 0f;
        for (Linea x : lineas) {
            float alto = x.antes() + x.tam() * 1.3f;
            if (usado + alto > disponible && !actual.isEmpty()) {
                paginas.add(actual);
                actual = new ArrayList<>();
                usado = 0f;
            }
            actual.add(x);
            usado += alto;
        }
        paginas.add(actual);
        return paginas;
    }

    private static List<String> ajustar(String texto, PDFont f, float tam, float anchoMax) {
        List<String> resultado = new ArrayList<>();
        StringBuilder linea = new StringBuilder();
        for (String palabra : texto.split(" ")) {
            String candidata = linea.isEmpty() ? palabra : linea + " " + palabra;
            if (anchoDe(candidata, f, tam) <= anchoMax || linea.isEmpty()) {
                linea = new StringBuilder(candidata);
            } else {
                resultado.add(linea.toString());
                linea = new StringBuilder(palabra);
            }
        }
        if (!linea.isEmpty() || resultado.isEmpty()) resultado.add(linea.toString());
        return resultado;
    }

    private static float anchoDe(String s, PDFont f, float tam) {
        try {
            return f.getStringWidth(s) / 1000f * tam;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Sustituye por «?» lo que la fuente estándar no puede codificar, para que nunca falle la generación. */
    private static String limpiar(String s, PDFont f) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder();
        s.codePoints().forEach(cp -> {
            String c = new String(Character.toChars(cp));
            try {
                f.encode(c);
                sb.append(c);
            } catch (IOException | IllegalArgumentException e) {
                sb.append('?');
            }
        });
        return sb.toString().replace('\n', ' ');
    }

    private static void texto(PDPageContentStream cs, String s, PDFont f, float tam, float x, float y) throws IOException {
        cs.beginText();
        cs.setFont(f, tam);
        cs.newLineAtOffset(x, y);
        cs.showText(s);
        cs.endText();
    }

    private static void encabezado(PDPageContentStream cs, Datos d, PDFont normal, PDFont negrita) throws IOException {
        float arriba = PDRectangle.A4.getHeight() - MARGEN;
        cs.setNonStrokingColor(0f);
        texto(cs, "INFORME TÉCNICO DE INSPECCIÓN · REFERENCIAL", negrita, 8.5f, MARGEN, arriba - 8f);
        texto(cs, "Evaluación técnica presencial · Indicador B", normal, 8.5f, MARGEN, arriba - 21f);
        texto(cs, "Partida N.° " + limpiar(d.partida(), negrita), negrita, 11f, MARGEN, arriba - 40f);
        cs.setStrokingColor(0.35f);
        cs.setLineWidth(0.6f);
        cs.moveTo(MARGEN, arriba - 48f);
        cs.lineTo(PDRectangle.A4.getWidth() - MARGEN, arriba - 48f);
        cs.stroke();
    }

    private static void pie(PDPageContentStream cs, int n, int total, PDFont normal) throws IOException {
        cs.setNonStrokingColor(0.15f);
        cs.setStrokingColor(0.35f);
        cs.setLineWidth(0.6f);
        cs.moveTo(MARGEN, MARGEN + 26f);
        cs.lineTo(PDRectangle.A4.getWidth() - MARGEN, MARGEN + 26f);
        cs.stroke();
        float y = MARGEN + 16f;
        for (String parte : ajustar(limpiar(PIE, normal), normal, 7.5f, PDRectangle.A4.getWidth() - 2 * MARGEN)) {
            texto(cs, parte, normal, 7.5f, MARGEN, y);
            y -= 9f;
        }
        String pagina = "Página " + n + " de " + total;
        texto(cs, pagina, normal, 7.5f, PDRectangle.A4.getWidth() - MARGEN - anchoDe(pagina, normal, 7.5f), MARGEN + 2f);
    }

    /** Texto diagonal translúcido en cada página, debajo del contenido. */
    private static void marcaDeAgua(PDPageContentStream cs, PDFont negrita) throws IOException {
        String marca = limpiar(MARCA_DE_AGUA, negrita);
        float tam = 25f;
        double ang = Math.toRadians(52);
        float w = anchoDe(marca, negrita, tam);
        if (w > 820f) {
            tam = tam * 820f / w;
            w = anchoDe(marca, negrita, tam);
        }
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
}
