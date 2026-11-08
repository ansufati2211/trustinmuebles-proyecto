package pe.trustinmuebles.almacenamiento;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSBase;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdfwriter.compress.CompressParameters;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.form.PDFormXObject;
import org.apache.pdfbox.pdmodel.graphics.image.JPEGFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import pe.trustinmuebles.shared.ArchivoDemasiadoGrandeException;

/**
 * Valida y, si pesa demasiado, optimiza el PDF que sube una persona (v0.8, decisión 4). Entrada de hasta
 * {@code app.archivos.max-entrada-mb}; por encima de {@code app.archivos.umbral-optimizacion-mb} se re-codifican como JPEG
 * las imágenes grandes; lo que se guarda no puede pasar de {@code app.archivos.max-almacenado-mb}. Las láminas y copias
 * que genera el sistema no pasan por aquí.
 */
@Service
public class DocumentosPdf {
    /** Lado mayor de una imagen después de optimizar. */
    static final int LADO_MAXIMO = 2000;
    static final float CALIDAD_JPEG = 0.75f;
    /** Una imagen que ya ocupa menos que esto y no pasa del lado máximo se deja como está. */
    private static final int IMAGEN_GRANDE_BYTES = 100 * 1024;
    private static final double MB = 1024 * 1024;

    private final double maxEntradaMb;
    private final long maxEntrada;
    private final long umbral;
    private final double maxAlmacenadoMb;
    private final long maxAlmacenado;

    public DocumentosPdf(@Value("${app.archivos.max-entrada-mb:25}") double maxEntradaMb,
            @Value("${app.archivos.umbral-optimizacion-mb:5}") double umbralMb,
            @Value("${app.archivos.max-almacenado-mb:10}") double maxAlmacenadoMb) {
        this.maxEntradaMb = maxEntradaMb;
        this.maxEntrada = (long) (maxEntradaMb * MB);
        this.umbral = (long) (umbralMb * MB);
        this.maxAlmacenadoMb = maxAlmacenadoMb;
        this.maxAlmacenado = (long) (maxAlmacenadoMb * MB);
    }

    public PdfPreparado preparar(MultipartFile archivo) {
        try {
            return preparar(archivo.getBytes(), archivo.getContentType());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /**
     * Comprueba tamaño, cabecera, tipo declarado y que PDFBox lo abra. Un archivo que no es PDF, cifrado o dañado da
     * {@link IllegalArgumentException} (400); uno demasiado grande, {@link ArchivoDemasiadoGrandeException} (413).
     */
    public PdfPreparado preparar(byte[] datos, String contentType) {
        if (datos == null || datos.length == 0) throw new IllegalArgumentException("El archivo está vacío");
        if (datos.length > maxEntrada) {
            throw new ArchivoDemasiadoGrandeException("El archivo supera " + mb(maxEntradaMb) + " MB");
        }
        if (!tieneCabeceraPdf(datos) || !"application/pdf".equalsIgnoreCase(tipoBase(contentType))) {
            throw new IllegalArgumentException("El archivo debe ser un PDF (application/pdf)");
        }
        int paginas = contarPaginas(datos);
        byte[] finales = datos;
        boolean optimizado = false;
        if (datos.length > umbral) {
            byte[] reducido = optimizar(datos, paginas);
            if (reducido != null && reducido.length < datos.length) {
                finales = reducido;
                optimizado = true;
            }
        }
        if (finales.length > maxAlmacenado) {
            throw new ArchivoDemasiadoGrandeException("El PDF pesa " + mb(Math.ceil(finales.length / MB * 10) / 10)
                    + " MB incluso optimizado; el máximo es " + mb(maxAlmacenadoMb)
                    + " MB. Reduce su resolución o divídelo");
        }
        return new PdfPreparado(finales, datos.length, optimizado);
    }

    static boolean tieneCabeceraPdf(byte[] d) {
        return d.length >= 5 && d[0] == '%' && d[1] == 'P' && d[2] == 'D' && d[3] == 'F' && d[4] == '-';
    }

    private static String tipoBase(String contentType) {
        return contentType == null ? "" : contentType.split(";")[0].trim();
    }

    private static int contarPaginas(byte[] datos) {
        try (PDDocument d = Loader.loadPDF(datos)) {
            if (d.isEncrypted()) throw cifrado();
            if (d.getNumberOfPages() == 0) throw new IllegalArgumentException("El PDF no tiene páginas");
            return d.getNumberOfPages();
        } catch (InvalidPasswordException e) {
            throw cifrado();
        } catch (IOException e) {
            throw new IllegalArgumentException(
                    "El PDF está dañado o no se puede abrir. Vuelve a exportarlo o escanearlo y súbelo de nuevo");
        }
    }

    private static IllegalArgumentException cifrado() {
        return new IllegalArgumentException(
                "El PDF está protegido con contraseña o cifrado. Quita la protección y súbelo de nuevo");
    }

    /**
     * Re-codifica como JPEG las imágenes grandes (lado mayor de hasta {@value #LADO_MAXIMO} px) y guarda con compresión
     * de objetos. Devuelve null si algo falla o si el resultado no abre con el mismo número de páginas: en ese caso se
     * conserva el original.
     */
    static byte[] optimizar(byte[] datos, int paginas) {
        try (PDDocument d = Loader.loadPDF(datos)) {
            Map<COSBase, PDImageXObject> hechas = new IdentityHashMap<>();
            Set<COSBase> formas = new HashSet<>();
            for (PDPage p : d.getPages()) reducir(d, p.getResources(), hechas, formas);
            ByteArrayOutputStream salida = new ByteArrayOutputStream();
            d.save(salida, CompressParameters.DEFAULT_COMPRESSION);
            byte[] resultado = salida.toByteArray();
            try (PDDocument verificado = Loader.loadPDF(resultado)) {
                return verificado.getNumberOfPages() == paginas ? resultado : null;
            }
        } catch (IOException | RuntimeException e) {
            return null;
        }
    }

    private static void reducir(PDDocument d, PDResources recursos, Map<COSBase, PDImageXObject> hechas,
            Set<COSBase> formas) throws IOException {
        if (recursos == null) return;
        for (COSName nombre : recursos.getXObjectNames()) {
            PDXObject x = recursos.getXObject(nombre);
            if (x instanceof PDImageXObject imagen) {
                COSBase clave = imagen.getCOSObject();
                if (!hechas.containsKey(clave)) hechas.put(clave, recodificar(d, imagen));
                PDImageXObject nueva = hechas.get(clave);
                if (nueva != null) recursos.put(nombre, nueva);
            } else if (x instanceof PDFormXObject forma && formas.add(forma.getCOSObject())) {
                reducir(d, forma.getResources(), hechas, formas);
            }
        }
    }

    private static PDImageXObject recodificar(PDDocument d, PDImageXObject imagen) throws IOException {
        boolean grande = Math.max(imagen.getWidth(), imagen.getHeight()) > LADO_MAXIMO
                || imagen.getCOSObject().getLength() > IMAGEN_GRANDE_BYTES;
        if (!grande || imagen.isStencil()) return null;
        BufferedImage original = imagen.getImage();
        double escala = Math.min(1.0, (double) LADO_MAXIMO / Math.max(original.getWidth(), original.getHeight()));
        int ancho = Math.max(1, (int) Math.round(original.getWidth() * escala));
        int alto = Math.max(1, (int) Math.round(original.getHeight() * escala));
        BufferedImage rgb = new BufferedImage(ancho, alto, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = rgb.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, ancho, alto);
        g.drawImage(original, 0, 0, ancho, alto, null);
        g.dispose();
        return JPEGFactory.createFromImage(d, rgb, CALIDAD_JPEG);
    }

    /** «25» si es entero, «18,2» si no: el formato que ve la persona en los mensajes. */
    static String mb(double valor) {
        if (valor == Math.rint(valor)) return String.valueOf((long) valor);
        return String.format(Locale.forLanguageTag("es-ES"), "%.1f", valor);
    }
}
