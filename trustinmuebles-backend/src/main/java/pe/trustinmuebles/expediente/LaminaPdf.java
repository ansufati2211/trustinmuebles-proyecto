package pe.trustinmuebles.expediente;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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
 * El terreno se dibuja a escala con las medidas de los linderos del expediente, y la vivienda ocupa el área construida
 * del plano. Es un esquema ficticio: no es un plano real, no lleva sello ni firma de un profesional, y cada lámina trae
 * un rótulo y una marca de agua que lo dicen. Si el revisor sube el PDF real del plano, ese reemplaza a esta lámina.
 */
final class LaminaPdf {
    static final String MARCA_DE_AGUA = "DOCUMENTO TÉCNICO REFERENCIAL · FICTICIO";
    static final String ROTULO = "DOCUMENTO TÉCNICO REFERENCIAL DEL EXPEDIENTE · FICTICIO · SIN SELLO NI FIRMA";

    /** Datos del predio que la lámina dibuja. Todo es opcional: sin medidas se usa un terreno tipo y se avisa. */
    record Datos(String partida, String denominacion, BigDecimal areaTerreno, String linderos,
            BigDecimal areaConstruida, String sistemaConstructivo, LocalDate fecha) {}

    /** Frente y largo del terreno en metros, y el nombre de la vía. {@code propias} es false si se usó un terreno tipo. */
    record Medidas(double frente, double largo, String via, boolean propias) {}

    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Pattern FRENTE = Pattern.compile("(?is)frente:\\s*con\\s+(?:la|el)\\s+(.*?),?\\s+en\\s+([\\d.,]+)\\s*ml");
    private static final Pattern DERECHA = Pattern.compile("(?is)derecha:.*?\\ben\\s+([\\d.,]+)\\s*ml");
    private static final Pattern IZQUIERDA = Pattern.compile("(?is)izquierda:.*?\\ben\\s+([\\d.,]+)\\s*ml");

    // Marco de la hoja y zonas
    private static final float IZQ = 56f;
    private static final float DER = 539f;
    private static final float TOPE_DIBUJO = 706f;
    private static final float BASE_TERRENO = 262f;

    private LaminaPdf() {}

    // ---------------------------------------------------------------- medidas

    /** Lee el frente y el largo de los linderos («… en 8.00 ml.»). Si faltan, deduce un terreno tipo del área. */
    static Medidas medidas(String linderos, BigDecimal areaTerreno) {
        if (linderos != null) {
            Matcher f = FRENTE.matcher(linderos);
            Matcher d = DERECHA.matcher(linderos);
            Matcher i = IZQUIERDA.matcher(linderos);
            if (f.find()) {
                Double frente = numero(f.group(2));
                Double largo = d.find() ? numero(d.group(1)) : i.find() ? numero(i.group(1)) : null;
                if (frente != null && largo != null && frente > 0 && largo > 0) {
                    return new Medidas(frente, largo, f.group(1).trim(), true);
                }
            }
        }
        double area = areaTerreno == null ? 120.0 : areaTerreno.doubleValue();
        return new Medidas(8.0, Math.max(10.0, area / 8.0), "VÍA", false);
    }

    private static Double numero(String s) {
        try {
            return Double.valueOf(s.replace(",", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    // ---------------------------------------------------------------- distribución común

    /** Ambiente dentro de la huella, en fracciones (0 a 1) con el origen en la esquina frontal izquierda. */
    private record Ambiente(String nombre, double x0, double y0, double x1, double y1) {}

    private static final List<Ambiente> AMBIENTES = List.of(
            new Ambiente("SALA-COMEDOR", 0.0, 0.0, 0.6, 0.42), new Ambiente("COCINA", 0.6, 0.0, 1.0, 0.42),
            new Ambiente("DORM. 1", 0.0, 0.42, 0.3, 1.0), new Ambiente("DORM. 2", 0.3, 0.42, 0.6, 1.0),
            new Ambiente("S.H.", 0.6, 0.42, 0.8, 1.0), new Ambiente("LAV.", 0.8, 0.42, 1.0, 1.0));
    private static final double[] EJES_X = {0.0, 0.3, 0.6, 0.8, 1.0};
    private static final double[] EJES_Y = {0.0, 0.42, 1.0};

    /** Terreno y vivienda a escala: convierte metros (origen en la esquina frontal izquierda) en puntos del PDF. */
    private static final class Lienzo {
        final double s;
        final float ox;
        final float oy;
        final Medidas m;
        final double huellaX; // retiro lateral
        final double huellaY; // retiro frontal
        final double huellaAncho;
        final double huellaFondo;
        final int pisos;
        final double areaPiso;

        Lienzo(Medidas m, BigDecimal areaConstruida) {
            this.m = m;
            double disponibleAncho = DER - IZQ - 120f;
            double disponibleAlto = TOPE_DIBUJO - BASE_TERRENO - 28f;
            this.s = Math.min(disponibleAncho / m.frente(), disponibleAlto / m.largo());
            this.ox = (float) (IZQ + 60f + (disponibleAncho - m.frente() * s) / 2f);
            this.oy = BASE_TERRENO;
            this.huellaX = Math.min(0.5, m.frente() / 10);
            this.huellaY = Math.min(3.0, m.largo() / 5);
            this.huellaAncho = m.frente() - 2 * huellaX;
            double area = areaConstruida == null ? huellaAncho * Math.max(4.0, (m.largo() - huellaY - 1.0) * 0.8)
                    : areaConstruida.doubleValue();
            double fondoMaximo = m.largo() - huellaY - 1.0;
            int p = area / huellaAncho > fondoMaximo ? 2 : 1;
            this.pisos = p;
            this.areaPiso = area / p;
            this.huellaFondo = Math.min(fondoMaximo, areaPiso / huellaAncho);
        }

        float x(double metros) { return (float) (ox + metros * s); }

        float y(double metros) { return (float) (oy + metros * s); }

        /** Punto de la huella a partir de fracciones de su ancho y su fondo. */
        float hx(double f) { return x(huellaX + f * huellaAncho); }

        float hy(double f) { return y(huellaY + f * huellaFondo); }
    }

    // ---------------------------------------------------------------- generación

    /** Atajo para quien solo conoce el área y el sistema constructivo (sin linderos ni fecha). */
    static byte[] generar(Especialidad especialidad, String partida, String denominacion, BigDecimal areaConstruida,
            String sistemaConstructivo) {
        return generar(especialidad, new Datos(partida, denominacion, null, null, areaConstruida, sistemaConstructivo,
                null));
    }

    static byte[] generar(Especialidad especialidad, Datos d) {
        PDFont normal = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        PDFont negrita = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
        Medidas medidas = medidas(d.linderos(), d.areaTerreno());
        Lienzo l = new Lienzo(medidas, d.areaConstruida());
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            PDDocumentInformation info = new PDDocumentInformation();
            info.setTitle("Lámina referencial " + seguro(especialidad.etiqueta()) + " " + seguro(d.partida()));
            info.setSubject("Documento técnico referencial ficticio. Sin sello ni firma.");
            info.setCreator("Trustinmuebles");
            doc.setDocumentInformation(info);

            PDPage pagina = new PDPage(PDRectangle.A4);
            doc.addPage(pagina);
            try (PDPageContentStream cs = new PDPageContentStream(doc, pagina)) {
                marcaDeAgua(cs, negrita);
                cs.setNonStrokingColor(0f);
                texto(cs, seguro(especialidad.etiqueta().toUpperCase(Locale.forLanguageTag("es-PE"))), negrita, 15f, IZQ, 790f);
                texto(cs, "Partida N.° " + seguro(d.partida()), normal, 10f, IZQ, 772f);
                texto(cs, seguro(d.denominacion()), normal, 9f, IZQ, 759f);
                String piso = l.pisos == 2 ? " (2 pisos)" : "";
                texto(cs, d.areaConstruida() == null ? "Área construida: no informada"
                        : "Área construida: " + d.areaConstruida().setScale(2, RoundingMode.HALF_UP).toPlainString() + " m²" + piso,
                        normal, 9f, IZQ, 746f);

                cs.setLineWidth(1f);
                cs.setStrokingColor(0.35f);
                cs.addRect(IZQ, 70f, DER - IZQ, 650f);
                cs.stroke();

                terreno(cs, l, normal, negrita);
                switch (especialidad) {
                    case ARQUITECTURA -> arquitectura(cs, l, d, normal, negrita);
                    case ESTRUCTURAS -> estructuras(cs, l, d, normal, negrita);
                    case ELECTRICAS -> electricas(cs, l, normal, negrita);
                    case SANITARIAS -> sanitarias(cs, l, normal, negrita);
                }
                norteYEscala(cs, l, normal, negrita);
                if (!medidas.propias()) {
                    cs.setNonStrokingColor(0.5f, 0.1f, 0.1f);
                    texto(cs, "Los linderos no constan: se dibuja un terreno tipo.", normal, 7.5f, IZQ + 8f, 213f);
                }
                rotulo(cs, especialidad, d, normal, negrita);
            }
            doc.save(salida);
            return salida.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    // ---------------------------------------------------------------- terreno y cotas

    private static void terreno(PDPageContentStream cs, Lienzo l, PDFont normal, PDFont negrita) throws IOException {
        // Vía y vereda
        cs.setStrokingColor(0.45f);
        cs.setLineWidth(0.8f);
        cs.moveTo(IZQ + 4f, l.oy - 9f);
        cs.lineTo(DER - 4f, l.oy - 9f);
        cs.stroke();
        cs.setNonStrokingColor(0.25f);
        String via = seguro(l.m.via().toUpperCase(Locale.forLanguageTag("es-PE")));
        texto(cs, via, negrita, 8f, l.x(l.m.frente() / 2) - anchoDe(via, negrita, 8f) / 2f, l.oy - 21f);
        // Límite del terreno
        cs.setStrokingColor(0.1f);
        cs.setLineWidth(1.4f);
        cs.setLineDashPattern(new float[] {6f, 3f}, 0f);
        cs.addRect(l.x(0), l.y(0), (float) (l.m.frente() * l.s), (float) (l.m.largo() * l.s));
        cs.stroke();
        cs.setLineDashPattern(new float[] {}, 0f);
        // Cotas del terreno
        cs.setNonStrokingColor(0.1f);
        cotaH(cs, normal, l.x(0), l.x(l.m.frente()), l.y(0), l.oy - 34f, fmt(l.m.frente()));
        cotaV(cs, normal, l.y(0), l.y(l.m.largo()), l.x(l.m.frente()), l.x(l.m.frente()) + 24f, fmt(l.m.largo()));
        cs.setNonStrokingColor(0.3f);
        texto(cs, "LÍMITE DEL TERRENO", normal, 6.5f, l.x(0) + 2f, l.y(l.m.largo()) + 3f);
    }

    private static String fmt(double v) {
        return String.format(Locale.ROOT, "%.2f", v);
    }

    /** Cota horizontal: la línea va a {@code yLinea} y las líneas de extensión parten de {@code yObjeto}. */
    private static void cotaH(PDPageContentStream cs, PDFont f, float xa, float xb, float yObjeto, float yLinea,
            String valor) throws IOException {
        cs.setStrokingColor(0.2f);
        cs.setLineWidth(0.5f);
        float arriba = Math.max(yObjeto, yLinea);
        cs.moveTo(xa, yObjeto + (yLinea > yObjeto ? 2f : -2f));
        cs.lineTo(xa, yLinea + (yLinea > yObjeto ? 3f : -3f));
        cs.moveTo(xb, yObjeto + (yLinea > yObjeto ? 2f : -2f));
        cs.lineTo(xb, yLinea + (yLinea > yObjeto ? 3f : -3f));
        cs.moveTo(xa, yLinea);
        cs.lineTo(xb, yLinea);
        cs.moveTo(xa - 3f, yLinea - 3f);
        cs.lineTo(xa + 3f, yLinea + 3f);
        cs.moveTo(xb - 3f, yLinea - 3f);
        cs.lineTo(xb + 3f, yLinea + 3f);
        cs.stroke();
        texto(cs, valor, f, 7.5f, (xa + xb) / 2f - anchoDe(valor, f, 7.5f) / 2f, yLinea + (arriba == yLinea ? 3f : 3f));
    }

    private static void cotaV(PDPageContentStream cs, PDFont f, float ya, float yb, float xObjeto, float xLinea,
            String valor) throws IOException {
        cs.setStrokingColor(0.2f);
        cs.setLineWidth(0.5f);
        float signo = xLinea > xObjeto ? 1f : -1f;
        cs.moveTo(xObjeto + 2f * signo, ya);
        cs.lineTo(xLinea + 3f * signo, ya);
        cs.moveTo(xObjeto + 2f * signo, yb);
        cs.lineTo(xLinea + 3f * signo, yb);
        cs.moveTo(xLinea, ya);
        cs.lineTo(xLinea, yb);
        cs.moveTo(xLinea - 3f, ya - 3f);
        cs.lineTo(xLinea + 3f, ya + 3f);
        cs.moveTo(xLinea - 3f, yb - 3f);
        cs.lineTo(xLinea + 3f, yb + 3f);
        cs.stroke();
        cs.beginText();
        cs.setFont(f, 7.5f);
        cs.setTextMatrix(Matrix.getRotateInstance(Math.PI / 2, xLinea + 9f, (ya + yb) / 2f - anchoDe(valor, f, 7.5f) / 2f));
        cs.showText(valor);
        cs.endText();
    }

    // ---------------------------------------------------------------- especialidades

    private static void muros(PDPageContentStream cs, Lienzo l, float grosor) throws IOException {
        cs.setStrokingColor(0f);
        cs.setLineWidth(grosor);
        cs.addRect(l.hx(0), l.hy(0), (float) (l.huellaAncho * l.s), (float) (l.huellaFondo * l.s));
        cs.stroke();
    }

    private static void tabiques(PDPageContentStream cs, Lienzo l) throws IOException {
        cs.setStrokingColor(0.1f);
        cs.setLineWidth(1.2f);
        for (Ambiente a : AMBIENTES) {
            cs.addRect(l.hx(a.x0()), l.hy(a.y0()), (float) ((a.x1() - a.x0()) * l.huellaAncho * l.s),
                    (float) ((a.y1() - a.y0()) * l.huellaFondo * l.s));
        }
        cs.stroke();
    }

    private static void arquitectura(PDPageContentStream cs, Lienzo l, Datos d, PDFont normal, PDFont negrita) throws IOException {
        tabiques(cs, l);
        muros(cs, l, 2.6f);
        cs.setNonStrokingColor(0.1f);
        double sumaAreas = 0;
        for (Ambiente a : AMBIENTES) {
            double area = (a.x1() - a.x0()) * l.huellaAncho * (a.y1() - a.y0()) * l.huellaFondo;
            sumaAreas += area;
            float cx = l.hx((a.x0() + a.x1()) / 2);
            float cy = l.hy((a.y0() + a.y1()) / 2);
            texto(cs, a.nombre(), negrita, 7f, cx - anchoDe(a.nombre(), negrita, 7f) / 2f, cy + 3f);
            String m2 = fmt(area) + " m²";
            texto(cs, m2, normal, 6.5f, cx - anchoDe(m2, normal, 6.5f) / 2f, cy - 6f);
        }
        // Cotas de la vivienda y del retiro frontal
        cs.setNonStrokingColor(0.1f);
        cotaH(cs, normal, l.hx(0), l.hx(1), l.hy(1), l.hy(1) + 22f, fmt(l.huellaAncho));
        cotaV(cs, normal, l.y(0), l.hy(0), l.x(0), l.x(0) - 28f, fmt(l.huellaY));
        // Cuadro de áreas
        double terreno = l.m.frente() * l.m.largo();
        double libre = Math.max(0, terreno - l.areaPiso);
        caja(cs, IZQ + 6f, 132f, 232f, 68f);
        cs.setNonStrokingColor(0f);
        texto(cs, "CUADRO DE ÁREAS", negrita, 8f, IZQ + 12f, 188f);
        texto(cs, "Área del terreno: " + fmt(d.areaTerreno() != null ? d.areaTerreno().doubleValue() : terreno) + " m²", normal, 8f, IZQ + 12f, 174f);
        texto(cs, "Área construida: " + (d.areaConstruida() == null ? "no informada" : fmt(d.areaConstruida().doubleValue()) + " m²"), normal, 8f, IZQ + 12f, 162f);
        texto(cs, "Área ocupada (1.er piso): " + fmt(sumaAreas) + " m²", normal, 8f, IZQ + 12f, 150f);
        texto(cs, "Área libre: " + fmt(libre) + " m²" + (l.pisos == 2 ? " · 2.° piso de igual distribución" : ""), normal, 8f, IZQ + 12f, 138f);
    }

    private static void estructuras(PDPageContentStream cs, Lienzo l, Datos d, PDFont normal, PDFont negrita) throws IOException {
        boolean adobe = d.sistemaConstructivo() != null && d.sistemaConstructivo().toLowerCase(Locale.ROOT).contains("adobe");
        // Cimiento corrido alrededor de la huella
        cs.setStrokingColor(0.55f);
        cs.setLineWidth(0.8f);
        cs.setLineDashPattern(new float[] {4f, 3f}, 0f);
        cs.addRect(l.hx(0) - 5f, l.hy(0) - 5f, (float) (l.huellaAncho * l.s) + 10f, (float) (l.huellaFondo * l.s) + 10f);
        cs.stroke();
        cs.setLineDashPattern(new float[] {}, 0f);
        if (adobe) {
            muros(cs, l, (float) Math.max(3.5, 0.4 * l.s));
            tabiques(cs, l);
        } else {
            // Vigas sobre los ejes y columnas en sus cruces.
            cs.setStrokingColor(0.2f);
            cs.setLineWidth(2.2f);
            for (double fy : EJES_Y) {
                cs.moveTo(l.hx(0), l.hy(fy));
                cs.lineTo(l.hx(1), l.hy(fy));
            }
            for (double fx : EJES_X) {
                cs.moveTo(l.hx(fx), l.hy(0));
                cs.lineTo(l.hx(fx), l.hy(1));
            }
            cs.stroke();
            cs.setNonStrokingColor(0f);
            for (double fx : EJES_X) {
                for (double fy : EJES_Y) {
                    if (fy == 0.0 && (fx == 0.3 || fx == 0.8)) continue; // sin columnas dentro de la sala-comedor y cocina
                    cs.addRect(l.hx(fx) - 4.5f, l.hy(fy) - 4.5f, 9f, 9f);
                }
            }
            cs.fill();
        }
        // Ejes: letras abajo y números a la izquierda
        char letra = 'A';
        for (double fx : EJES_X) {
            burbuja(cs, normal, l.hx(fx), l.hy(0) - 20f, String.valueOf(letra++));
        }
        int n = 1;
        for (double fy : EJES_Y) {
            burbuja(cs, normal, l.hx(0) - 20f, l.hy(fy), String.valueOf(n++));
        }
        cs.setNonStrokingColor(0.1f);
        if (!adobe) texto(cs, "V-101", normal, 7f, l.hx(0.1), l.hy(1) + 3f);
        // Cuadro de elementos y notas
        caja(cs, IZQ + 6f, 132f, 232f, 68f);
        cs.setNonStrokingColor(0f);
        texto(cs, "CUADRO DE ELEMENTOS", negrita, 8f, IZQ + 12f, 188f);
        texto(cs, adobe ? "Muros portantes de adobe, e = 0.40 m" : "C-1: columna de 25 x 25 cm · V-101: viga de 25 x 40 cm", normal, 8f, IZQ + 12f, 174f);
        texto(cs, "Sistema constructivo: " + seguro(d.sistemaConstructivo() == null ? "no indicado" : d.sistemaConstructivo()), normal, 8f, IZQ + 12f, 162f);
        texto(cs, "Cimentación: cimiento corrido de concreto ciclópeo", normal, 8f, IZQ + 12f, 150f);
        texto(cs, "Esquema: no reemplaza la memoria de cálculo", normal, 8f, IZQ + 12f, 138f);
    }

    private static void burbuja(PDPageContentStream cs, PDFont f, float cx, float cy, String t) throws IOException {
        cs.setNonStrokingColor(1f);
        cs.setStrokingColor(0f);
        cs.setLineWidth(0.8f);
        circulo(cs, cx, cy, 7.5f, true);
        cs.setNonStrokingColor(0f);
        texto(cs, t, f, 8f, cx - anchoDe(t, f, 8f) / 2f, cy - 3f);
    }

    private static void electricas(PDPageContentStream cs, Lienzo l, PDFont normal, PDFont negrita) throws IOException {
        tabiques(cs, l);
        muros(cs, l, 2.6f);
        // Tablero general en el muro izquierdo, cerca de la sala
        float tx = l.hx(0);
        float ty = l.hy(0.2);
        // C-1 alumbrado: línea continua a cada ambiente
        cs.setStrokingColor(0.15f, 0.25f, 0.8f);
        cs.setLineWidth(1.2f);
        for (Ambiente a : AMBIENTES) {
            cs.moveTo(tx, ty);
            cs.lineTo(l.hx((a.x0() + a.x1()) / 2), l.hy((a.y0() + a.y1()) / 2));
        }
        cs.stroke();
        // C-2 tomacorrientes: línea punteada por el perímetro de los dormitorios
        cs.setLineDashPattern(new float[] {5f, 3f}, 0f);
        cs.moveTo(tx, ty + 6f);
        cs.lineTo(l.hx(0.02), l.hy(0.9));
        cs.lineTo(l.hx(0.58), l.hy(0.9));
        cs.stroke();
        // C-3 cocina: línea de trazo y punto
        cs.setStrokingColor(0.1f, 0.5f, 0.3f);
        cs.setLineDashPattern(new float[] {9f, 3f, 2f, 3f}, 0f);
        cs.moveTo(tx, ty - 6f);
        cs.lineTo(l.hx(0.8), l.hy(0.1));
        cs.stroke();
        cs.setLineDashPattern(new float[] {}, 0f);
        // Símbolos: luminaria y tomacorriente por ambiente
        cs.setStrokingColor(0.15f, 0.25f, 0.8f);
        cs.setLineWidth(1f);
        for (Ambiente a : AMBIENTES) {
            cs.setNonStrokingColor(1f);
            circulo(cs, l.hx((a.x0() + a.x1()) / 2), l.hy((a.y0() + a.y1()) / 2), 4.5f, true);
            cs.addRect(l.hx(a.x1()) - 9f, l.hy(a.y0()) + 4f, 5f, 5f);
            cs.stroke();
        }
        cs.setNonStrokingColor(0.15f, 0.25f, 0.8f);
        cs.addRect(tx - 5f, ty - 8f, 10f, 16f);
        cs.fill();
        cs.setNonStrokingColor(0.1f);
        texto(cs, "TG", negrita, 8f, tx + 9f, ty - 3f);
        // Pozo a tierra fuera de la vivienda, junto al retiro lateral
        pozoATierra(cs, l.x(0) + 8f, l.hy(0) - 6f - (float) (0.9 * l.s));
        texto(cs, "Pozo a tierra", normal, 6.5f, l.x(0) + 18f, l.hy(0) - 6f - (float) (0.9 * l.s));
        // Leyenda
        caja(cs, IZQ + 6f, 132f, 232f, 68f);
        cs.setNonStrokingColor(0f);
        texto(cs, "LEYENDA", negrita, 8f, IZQ + 12f, 188f);
        texto(cs, "TG tablero general · C-1 alumbrado (continua)", normal, 8f, IZQ + 12f, 174f);
        texto(cs, "C-2 tomacorrientes (punteada) · C-3 cocina (trazo y punto)", normal, 8f, IZQ + 12f, 162f);
        texto(cs, "Círculo: luminaria · Cuadrado: tomacorriente", normal, 8f, IZQ + 12f, 150f);
        texto(cs, "Diagrama unifilar: no representado en esta lámina", normal, 8f, IZQ + 12f, 138f);
    }

    private static void pozoATierra(PDPageContentStream cs, float x, float y) throws IOException {
        cs.setStrokingColor(0f);
        cs.setLineWidth(1.4f);
        cs.moveTo(x, y + 14f);
        cs.lineTo(x, y);
        cs.stroke();
        for (int i = 0; i < 3; i++) {
            cs.moveTo(x - 9f + i * 3f, y - i * 4f);
            cs.lineTo(x + 9f - i * 3f, y - i * 4f);
            cs.stroke();
        }
    }

    private static void sanitarias(PDPageContentStream cs, Lienzo l, PDFont normal, PDFont negrita) throws IOException {
        tabiques(cs, l);
        muros(cs, l, 2.6f);
        float calle = l.y(0) - 9f;
        float medX = l.x(l.m.frente() - 1.2);
        float medY = l.y(0.9);
        // Agua fría: desde la red pública y el medidor hasta cocina, lavandería y servicios higiénicos
        cs.setLineWidth(1.6f);
        cs.setStrokingColor(0.1f, 0.4f, 0.85f);
        cs.moveTo(medX, calle);
        cs.lineTo(medX, medY);
        cs.lineTo(l.hx(0.9), medY);
        cs.lineTo(l.hx(0.9), l.hy(0.75));
        cs.moveTo(l.hx(0.9), l.hy(0.55));
        cs.lineTo(l.hx(0.7), l.hy(0.55));
        cs.stroke();
        // Agua caliente: de la cocina al baño
        cs.setStrokingColor(0.85f, 0.15f, 0.15f);
        cs.moveTo(l.hx(0.85), l.hy(0.3));
        cs.lineTo(l.hx(0.72), l.hy(0.3));
        cs.lineTo(l.hx(0.72), l.hy(0.6));
        cs.stroke();
        // Desagüe: del baño y la cocina a la caja de registro y a la red pública
        float cajaX = l.x(l.m.frente() * 0.4);
        float cajaY = l.y(1.4);
        cs.setLineWidth(2.4f);
        cs.setStrokingColor(0.4f);
        cs.moveTo(l.hx(0.7), l.hy(0.5));
        cs.lineTo(l.hx(0.7), l.hy(0.05));
        cs.lineTo(cajaX, l.hy(0.05) - 4f);
        cs.lineTo(cajaX, cajaY);
        cs.moveTo(l.hx(0.9), l.hy(0.1));
        cs.lineTo(l.hx(0.7), l.hy(0.1));
        cs.moveTo(cajaX, cajaY);
        cs.lineTo(cajaX, calle);
        cs.stroke();
        // Medidor y caja de registro
        cs.setNonStrokingColor(1f);
        cs.setStrokingColor(0.1f, 0.4f, 0.85f);
        cs.setLineWidth(1.2f);
        circulo(cs, medX, medY, 4.5f, true);
        cs.setStrokingColor(0f);
        cs.addRect(cajaX - 5f, cajaY - 5f, 10f, 10f);
        cs.stroke();
        cs.setNonStrokingColor(0.1f);
        texto(cs, "Medidor", normal, 7f, medX + 7f, medY + 3f);
        texto(cs, "Caja de registro", normal, 7f, cajaX + 8f, cajaY - 2f);
        caja(cs, IZQ + 6f, 132f, 232f, 68f);
        cs.setNonStrokingColor(0f);
        texto(cs, "LEYENDA", negrita, 8f, IZQ + 12f, 188f);
        texto(cs, "Azul: agua fría · Rojo: agua caliente", normal, 8f, IZQ + 12f, 174f);
        texto(cs, "Gris grueso: desagüe y ventilación", normal, 8f, IZQ + 12f, 162f);
        texto(cs, "Círculo: medidor · Cuadrado: caja de registro", normal, 8f, IZQ + 12f, 150f);
        texto(cs, "Conexión a la red pública (esquema)", normal, 8f, IZQ + 12f, 138f);
    }

    // ---------------------------------------------------------------- norte, escala, rótulo

    private static void norteYEscala(PDPageContentStream cs, Lienzo l, PDFont normal, PDFont negrita) throws IOException {
        // Flecha del norte
        float nx = DER - 38f;
        float ny = 168f;
        cs.setStrokingColor(0f);
        cs.setNonStrokingColor(0f);
        cs.setLineWidth(1f);
        circulo(cs, nx, ny, 14f, false);
        cs.moveTo(nx, ny + 12f);
        cs.lineTo(nx - 5f, ny - 6f);
        cs.lineTo(nx, ny - 2f);
        cs.lineTo(nx + 5f, ny - 6f);
        cs.closePath();
        cs.fill();
        texto(cs, "N", negrita, 9f, nx - 3f, ny + 17f);
        // Escala gráfica: 0 a 4 m con la escala real del dibujo
        float x0 = DER - 190f;
        float y0 = 140f;
        float metro = (float) l.s;
        for (int i = 0; i < 4; i++) {
            cs.setNonStrokingColor(i % 2 == 0 ? 0f : 1f);
            cs.setStrokingColor(0f);
            cs.addRect(x0 + i * metro, y0, metro, 5f);
            cs.fillAndStroke();
        }
        cs.setNonStrokingColor(0.1f);
        texto(cs, "0", normal, 7f, x0 - 2f, y0 - 9f);
        texto(cs, "4 m", normal, 7f, x0 + 4 * metro - 6f, y0 - 9f);
        texto(cs, "Escala gráfica (esquema referencial)", normal, 7f, x0 - 2f, y0 + 12f);
    }

    private static void rotulo(PDPageContentStream cs, Especialidad e, Datos d, PDFont normal, PDFont negrita) throws IOException {
        String codigo = switch (e) {
            case ARQUITECTURA -> "A-01";
            case ESTRUCTURAS -> "E-01";
            case ELECTRICAS -> "IE-01";
            case SANITARIAS -> "IS-01";
        };
        cs.setStrokingColor(0.2f);
        cs.setLineWidth(0.8f);
        cs.addRect(IZQ, 70f, DER - IZQ, 52f);
        cs.moveTo(DER - 74f, 70f);
        cs.lineTo(DER - 74f, 122f);
        cs.stroke();
        cs.setNonStrokingColor(0f);
        texto(cs, seguro(ROTULO), negrita, 7.5f, IZQ + 6f, 111f);
        texto(cs, "Especialidad: " + seguro(e.etiqueta()) + " · Partida N.° " + seguro(d.partida()), normal, 8f, IZQ + 6f, 99f);
        texto(cs, "Proyectista: no consigna (documento referencial) · Fecha: "
                + (d.fecha() == null ? "no consta" : d.fecha().format(FECHA)), normal, 8f, IZQ + 6f, 88f);
        texto(cs, "Esquema ficticio de una vivienda tipo. No reemplaza el plano aprobado por la municipalidad.", normal, 7.5f, IZQ + 6f, 77f);
        texto(cs, "LÁMINA", normal, 7f, DER - 56f, 108f);
        texto(cs, codigo, negrita, 16f, DER - 63f, 86f);
    }

    // ---------------------------------------------------------------- primitivas

    private static void caja(PDPageContentStream cs, float x, float y, float w, float h) throws IOException {
        cs.setStrokingColor(0.3f);
        cs.setLineWidth(0.7f);
        cs.addRect(x, y, w, h);
        cs.stroke();
    }

    /** Círculo con curvas de Bézier. Con {@code relleno} lo pinta con el color de relleno actual; si no, solo el borde. */
    private static void circulo(PDPageContentStream cs, float cx, float cy, float r, boolean relleno) throws IOException {
        final float k = 0.5523f * r;
        cs.moveTo(cx + r, cy);
        cs.curveTo(cx + r, cy + k, cx + k, cy + r, cx, cy + r);
        cs.curveTo(cx - k, cy + r, cx - r, cy + k, cx - r, cy);
        cs.curveTo(cx - r, cy - k, cx - k, cy - r, cx, cy - r);
        cs.curveTo(cx + k, cy - r, cx + r, cy - k, cx + r, cy);
        cs.closePath();
        if (relleno) cs.fillAndStroke();
        else cs.stroke();
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
