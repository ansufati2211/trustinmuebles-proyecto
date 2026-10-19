package pe.trustinmuebles.expediente;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
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

/**
 * Documento sintético con forma de copia literal de partida registral (REQ-F03, RN-01).
 *
 * Es realista en su estructura, pero nunca puede confundirse con un documento oficial: no lleva logo, escudo, sello,
 * firma, código de verificación ni código QR; la partida tiene el prefijo SIM-; cada página trae una marca de agua y un
 * pie que dicen que es simulado.
 */
final class CopiaLiteralPdf {
    static final String MARCA_DE_AGUA = "DOCUMENTO SIMULADO · SIN VALOR LEGAL · USO ACADÉMICO";
    static final String PIE =
            "Documento simulado con fines académicos. No es una copia literal emitida por SUNARP, no tiene valor legal y no está firmado.";
    static final String CIERRE = "- Fin del documento simulado. Sin firma ni sello. -";

    static final String MARCA_TRANSCRITA = "TRANSCRIPCIÓN REFERENCIAL · NO ES PUBLICIDAD REGISTRAL · SIN VALOR LEGAL";
    static final String CIERRE_TRANSCRITA = "- Fin de la transcripción referencial. Sin firma ni sello. -";

    /** De dónde sale el documento: una partida ficticia o la transcripción de una consulta pública. */
    record Procedencia(boolean transcrita, String fuente, LocalDate fechaConsulta) {
        static final Procedencia SINTETICA = new Procedencia(false, null, null);

        String marca() { return transcrita ? MARCA_TRANSCRITA : MARCA_DE_AGUA; }

        String cierre() { return transcrita ? CIERRE_TRANSCRITA : CIERRE; }

        String pie() {
            if (!transcrita) return PIE;
            String f = fechaConsulta == null ? "" : " del " + fechaConsulta.format(FECHA_CORTA);
            return "Transcrito a partir de una consulta en " + (fuente == null ? "una fuente pública" : fuente) + f
                    + ". No es una copia literal emitida por SUNARP, no tiene valor legal y omite los nombres de personas naturales.";
        }
    }

    record AsientoCopia(String referencia, String acto, String texto, LocalDate fechaInscripcion, String titulo,
            LocalDate fechaPresentacion) {}

    record DatosCopia(String partida, String zona, String oficina, String ubicacion, BigDecimal areaM2, String linderos,
            String antecedente, boolean extractoParcial, LocalDate fechaReferencial, List<AsientoCopia> asientos) {}

    /** Una línea ya dividida. {@code justificar} reparte el espacio sobrante entre las palabras; {@code barra} la resalta. */
    private record Linea(String texto, PDFont fuente, float tam, float sangria, float antes, boolean justificar,
            float anchoMax, boolean barra, float gris) {
        Linea(String texto, PDFont fuente, float tam, float sangria, float antes) {
            this(texto, fuente, tam, sangria, antes, false, 0f, false, 0.1f);
        }
    }

    private static final float MARGEN = 56f;
    private static final float ALTO_ENCABEZADO = 58f;
    private static final float ALTO_PIE = 32f;
    private static final DateTimeFormatter FECHA_LARGA = DateTimeFormatter.ofPattern("d 'de' MMMM 'de' yyyy",
            Locale.forLanguageTag("es-PE"));
    private static final DateTimeFormatter FECHA_CORTA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private CopiaLiteralPdf() {}

    static byte[] generar(DatosCopia d) {
        return generar(d, Procedencia.SINTETICA);
    }

    static byte[] generar(DatosCopia d, Procedencia p) {
        PDFont normal = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        PDFont negrita = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
        PDFont mono = new PDType1Font(Standard14Fonts.FontName.COURIER);
        float ancho = PDRectangle.A4.getWidth() - 2 * MARGEN;

        List<Linea> lineas = contenido(d, p, normal, negrita, mono, ancho);
        List<List<Linea>> paginas = paginar(lineas);

        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            PDDocumentInformation info = new PDDocumentInformation();
            info.setTitle((p.transcrita() ? "Transcripción referencial " : "Copia literal simulada ")
                    + limpiar(d.partida(), normal));
            info.setSubject(p.transcrita() ? "Transcripción referencial. No es publicidad registral ni tiene valor legal."
                    : "Documento simulado con fines académicos. Sin valor legal.");
            info.setCreator("Trustinmuebles");
            doc.setDocumentInformation(info);

            int total = paginas.size();
            for (int i = 0; i < total; i++) {
                PDPage pagina = new PDPage(PDRectangle.A4);
                doc.addPage(pagina);
                try (PDPageContentStream cs = new PDPageContentStream(doc, pagina)) {
                    marcaDeAgua(cs, p, negrita);
                    encabezado(cs, d, p, normal, negrita);
                    float y = PDRectangle.A4.getHeight() - MARGEN - ALTO_ENCABEZADO;
                    for (Linea l : paginas.get(i)) {
                        y -= l.antes() + l.tam() * 1.28f;
                        if (l.barra()) {
                            cs.setNonStrokingColor(0.90f);
                            cs.addRect(MARGEN - 3f, y - 3.5f, ancho + 6f, l.tam() + 5.5f);
                            cs.fill();
                        }
                        cs.setNonStrokingColor(l.gris());
                        if (l.justificar() && l.texto().contains(" ")) {
                            long huecos = l.texto().chars().filter(c -> c == ' ').count();
                            float extra = (l.anchoMax() - anchoDe(l.texto(), l.fuente(), l.tam())) / huecos;
                            cs.beginText();
                            cs.setFont(l.fuente(), l.tam());
                            cs.setWordSpacing(Math.max(0f, extra));
                            cs.newLineAtOffset(MARGEN + l.sangria(), y);
                            cs.showText(l.texto());
                            cs.setWordSpacing(0f);
                            cs.endText();
                        } else {
                            texto(cs, l.texto(), l.fuente(), l.tam(), MARGEN + l.sangria(), y);
                        }
                    }
                    pie(cs, p, i + 1, total, normal);
                }
            }
            doc.save(salida);
            return salida.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    // ---------------------------------------------------------------- contenido

    private static List<Linea> contenido(DatosCopia d, Procedencia p, PDFont normal, PDFont negrita, PDFont mono,
            float ancho) {
        List<Linea> l = new ArrayList<>();
        titulo(l, p.transcrita() ? "TRANSCRIPCIÓN REFERENCIAL DE PARTIDA REGISTRAL" : "COPIA LITERAL SIMULADA DE PARTIDA REGISTRAL", negrita, 13f, 0f, ancho);
        if (d.extractoParcial()) {
            titulo(l, "EXTRACTO PARCIAL", negrita, 11f, 4f, ancho);
            parrafo(l, "Este extracto no incluye todos los rubros de la partida.", normal, 9.5f, 0f, 2f, ancho);
        }
        if (d.fechaReferencial() != null) {
            parrafo(l, (p.transcrita() ? "Fecha de la consulta: " : "Fecha referencial del caso: ") + d.fechaReferencial().format(FECHA_LARGA), normal, 9.5f, 0f, 6f, ancho);
        }

        seccion(l, "DESCRIPCIÓN DEL INMUEBLE", negrita, ancho);
        parrafo(l, "Ubicación: " + valor(d.ubicacion()), normal, 10f, 0f, 3f, ancho);
        parrafo(l, "Área: " + (d.areaM2() == null ? "no informada" : d.areaM2().setScale(2, java.math.RoundingMode.HALF_UP).toPlainString() + " m²"), normal, 10f, 0f, 3f, ancho);
        parrafo(l, "Linderos y medidas perimétricas: " + valor(d.linderos()), normal, 10f, 0f, 3f, ancho);

        seccion(l, "ANTECEDENTE DOMINIAL", negrita, ancho);
        parrafoJustificado(l, valor(d.antecedente()), mono, 9f, 0f, 3f, ancho);

        asientos(l, "TÍTULOS DE DOMINIO", 'C', d, p, normal, negrita, mono, ancho);
        asientos(l, "GRAVÁMENES Y CARGAS", 'D', d, p, normal, negrita, mono, ancho);
        asientos(l, "CANCELACIONES", 'E', d, p, normal, negrita, mono, ancho);
        asientos(l, "OTROS", 'F', d, p, normal, negrita, mono, ancho);

        parrafo(l, p.cierre(), negrita, 9.5f, 0f, 12f, ancho);
        return l;
    }

    private static void asientos(List<Linea> l, String nombre, char rubro, DatosCopia d, Procedencia p, PDFont normal,
            PDFont negrita, PDFont mono, float ancho) {
        seccion(l, nombre, negrita, ancho);
        List<AsientoCopia> delRubro = d.asientos().stream()
                .filter(a -> a.referencia() != null && !a.referencia().isEmpty() && a.referencia().charAt(0) == rubro)
                .toList();
        if (delRubro.isEmpty()) {
            String sinAsientos = d.extractoParcial() && rubro == 'C' ? "No incluido en este extracto."
                    : "No se representan asientos.";
            parrafo(l, sinAsientos, normal, 10f, 0f, 3f, ancho);
            return;
        }
        for (AsientoCopia a : delRubro) {
            parrafo(l, a.referencia() + " · " + a.acto().toUpperCase(Locale.forLanguageTag("es-PE")), negrita, 10f, 0f, 8f, ancho);
            if (a.texto() != null && !a.texto().isBlank()) parrafoJustificado(l, a.texto(), mono, 9f, 12f, 2f, ancho);
            // Cierre del asiento: título, presentación e inscripción, como en una copia literal.
            Presentacion pres = p.transcrita() ? null : Presentacion.derivar(a);
            List<String> datos = new ArrayList<>();
            if (a.titulo() != null && !a.titulo().isBlank()) datos.add("Título archivado N.° " + a.titulo());
            if (a.fechaPresentacion() != null) {
                datos.add("presentado el " + a.fechaPresentacion().format(FECHA_CORTA)
                        + (pres == null ? "" : " a las " + pres.hora() + " horas"));
            }
            if (a.fechaInscripcion() != null) datos.add("inscrito el " + a.fechaInscripcion().format(FECHA_CORTA));
            if (!datos.isEmpty()) parrafoGris(l, String.join(" · ", datos), normal, 8.5f, 12f, 3f, ancho);
            if (pres != null) {
                String ica = a.fechaInscripcion() == null ? "" : " · Ica, " + a.fechaInscripcion().format(FECHA_LARGA);
                parrafoGris(l, "Tomo Diario " + pres.tomo() + " · Derechos cobrados: S/ " + pres.derechos()
                        + " · Recibo N.° " + pres.recibo() + ica, normal, 8.5f, 12f, 0f, ancho);
            }
        }
    }

    /**
     * Datos de presentación que una copia literal real trae y el caso no guarda: hora, tomo del diario, derechos y
     * recibo. Se derivan del título y del acto, así que son siempre los mismos para el mismo asiento. Solo existen en
     * partidas ficticias; en una transcrita se imprime únicamente lo transcrito.
     */
    record Presentacion(String hora, String tomo, String derechos, String recibo) {
        static Presentacion derivar(AsientoCopia a) {
            String semilla = String.valueOf(a.titulo()) + "|" + a.acto();
            int h = Math.abs(semilla.hashCode() % 1_000_000_000);
            String hora = String.format("%02d:%02d:%02d", 8 + h % 9, (h / 9) % 60, (h / 540) % 60);
            String tomo = String.format("SIM-%04d", 100 + (h / 32_400) % 900);
            int base = switch (a.acto() == null ? "" : a.acto().toLowerCase(Locale.ROOT)) {
                case "compraventa" -> 154;
                case "hipoteca" -> 188;
                case "embargo", "anotación de demanda", "medida cautelar" -> 98;
                case "bloqueo registral" -> 62;
                case "carga técnica" -> 76;
                case "servidumbre" -> 142;
                case "sucesión" -> 126;
                case "independización" -> 210;
                case "cancelación" -> 54;
                case "declaratoria de fábrica" -> 120;
                default -> 60;
            };
            String anio = a.fechaPresentacion() == null ? "0000" : String.valueOf(a.fechaPresentacion().getYear());
            return new Presentacion(hora, tomo, String.format("%d.00", base + h % 37),
                    String.format("SIM-%s-%07d", anio, h % 9_999_999));
        }
    }

    private static void titulo(List<Linea> l, String texto, PDFont f, float tam, float antes, float ancho) {
        parrafo(l, texto, f, tam, 0f, antes + 2f, ancho);
    }

    private static void seccion(List<Linea> l, String texto, PDFont negrita, float ancho) {
        List<String> partes = ajustar(limpiar(texto, negrita), negrita, 10.5f, ancho);
        for (int i = 0; i < partes.size(); i++) {
            l.add(new Linea(partes.get(i), negrita, 10.5f, 0f, i == 0 ? 14f : 0f, false, 0f, true, 0.05f));
        }
    }

    private static void parrafo(List<Linea> l, String texto, PDFont f, float tam, float sangria, float antes, float ancho) {
        List<String> partes = ajustar(limpiar(texto, f), f, tam, ancho - sangria);
        for (int i = 0; i < partes.size(); i++) {
            l.add(new Linea(partes.get(i), f, tam, sangria, i == 0 ? antes : 0f));
        }
    }

    /** Párrafo con las dos márgenes alineadas: la última línea queda a la izquierda. */
    private static void parrafoJustificado(List<Linea> l, String texto, PDFont f, float tam, float sangria, float antes,
            float ancho) {
        List<String> partes = ajustar(limpiar(texto, f), f, tam, ancho - sangria);
        for (int i = 0; i < partes.size(); i++) {
            l.add(new Linea(partes.get(i), f, tam, sangria, i == 0 ? antes : 0f, i < partes.size() - 1, ancho - sangria,
                    false, 0.1f));
        }
    }

    private static void parrafoGris(List<Linea> l, String texto, PDFont f, float tam, float sangria, float antes,
            float ancho) {
        List<String> partes = ajustar(limpiar(texto, f), f, tam, ancho - sangria);
        for (int i = 0; i < partes.size(); i++) {
            l.add(new Linea(partes.get(i), f, tam, sangria, i == 0 ? antes : 0f, false, 0f, false, 0.32f));
        }
    }

    private static String valor(String s) {
        return s == null || s.isBlank() ? "no informado" : s;
    }

    // ------------------------------------------------------------ paginación y dibujo

    private static List<List<Linea>> paginar(List<Linea> lineas) {
        float disponible = PDRectangle.A4.getHeight() - 2 * MARGEN - ALTO_ENCABEZADO - ALTO_PIE;
        List<List<Linea>> paginas = new ArrayList<>();
        List<Linea> actual = new ArrayList<>();
        float usado = 0f;
        for (Linea l : lineas) {
            float alto = l.antes() + l.tam() * 1.28f;
            if (usado + alto > disponible && !actual.isEmpty()) {
                paginas.add(actual);
                actual = new ArrayList<>();
                usado = 0f;
            }
            actual.add(l);
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

    private static void encabezado(PDPageContentStream cs, DatosCopia d, Procedencia p, PDFont normal, PDFont negrita) throws IOException {
        float arriba = PDRectangle.A4.getHeight() - MARGEN;
        cs.setNonStrokingColor(0f);
        texto(cs, limpiar(d.zona(), negrita).toUpperCase(Locale.forLanguageTag("es-PE")) + " · "
                + limpiar(d.oficina(), negrita).toUpperCase(Locale.forLanguageTag("es-PE")), negrita, 8.5f, MARGEN, arriba - 8f);
        texto(cs, p.transcrita() ? "REGISTRO DE PREDIOS · TRANSCRIPCIÓN REFERENCIAL" : "REGISTRO DE PREDIOS · COPIA LITERAL (SIMULADA)", normal, 8.5f, MARGEN, arriba - 21f);
        texto(cs, "Partida N.° " + limpiar(d.partida(), negrita), negrita, 11f, MARGEN, arriba - 38f);
        cs.setStrokingColor(0.35f);
        cs.setLineWidth(0.6f);
        cs.moveTo(MARGEN, arriba - 46f);
        cs.lineTo(PDRectangle.A4.getWidth() - MARGEN, arriba - 46f);
        cs.stroke();
    }

    private static void pie(PDPageContentStream cs, Procedencia p, int n, int total, PDFont normal) throws IOException {
        cs.setNonStrokingColor(0.15f);
        cs.setStrokingColor(0.35f);
        cs.setLineWidth(0.6f);
        cs.moveTo(MARGEN, MARGEN + 26f);
        cs.lineTo(PDRectangle.A4.getWidth() - MARGEN, MARGEN + 26f);
        cs.stroke();
        float ancho = PDRectangle.A4.getWidth() - 2 * MARGEN;
        List<String> partes = ajustar(limpiar(p.pie(), normal), normal, 7.5f, ancho);
        float y = MARGEN + 16f;
        for (String parte : partes) {
            texto(cs, parte, normal, 7.5f, MARGEN, y);
            y -= 9f;
        }
        String pagina = "Página " + n + " de " + total;
        texto(cs, pagina, normal, 7.5f, PDRectangle.A4.getWidth() - MARGEN - anchoDe(pagina, normal, 7.5f), MARGEN + 2f);
    }

    /** Texto diagonal translúcido en cada página, debajo del contenido. */
    private static void marcaDeAgua(PDPageContentStream cs, Procedencia p, PDFont negrita) throws IOException {
        String marca = limpiar(p.marca(), negrita);
        float tam = 25f;
        double ang = Math.toRadians(52);
        float w = anchoDe(marca, negrita, tam);
        if (w > 820f) { // una marca más larga se reduce para que no se salga de la página
            tam = tam * 820f / w;
            w = anchoDe(marca, negrita, tam);
        }
        float cx = PDRectangle.A4.getWidth() / 2f;
        float cy = PDRectangle.A4.getHeight() / 2f;
        float x0 = (float) (cx - (w / 2f) * Math.cos(ang));
        float y0 = (float) (cy - (w / 2f) * Math.sin(ang));
        PDExtendedGraphicsState gs = new PDExtendedGraphicsState();
        gs.setNonStrokingAlphaConstant(0.13f);
        cs.saveGraphicsState();
        cs.setGraphicsStateParameters(gs);
        cs.setNonStrokingColor(0.1f);
        cs.beginText();
        cs.setFont(negrita, tam);
        cs.setTextMatrix(Matrix.getRotateInstance(ang, x0, y0));
        cs.showText(marca);
        cs.endText();
        cs.restoreGraphicsState();
    }
}
