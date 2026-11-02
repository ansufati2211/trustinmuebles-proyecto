package pe.trustinmuebles;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.util.Random;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.cos.COSStream;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.encryption.AccessPermission;
import org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;

/**
 * PDF reales generados dentro de la prueba (v0.8): el repositorio no guarda archivos grandes. Todos son ficticios.
 */
public final class PdfDePrueba {
    private PdfDePrueba() {}

    /** Una página con una línea de texto. Pesa pocos KB. */
    public static byte[] simple(String texto) {
        try (PDDocument d = new PDDocument()) {
            PDPage pagina = new PDPage(PDRectangle.A4);
            d.addPage(pagina);
            try (PDPageContentStream c = new PDPageContentStream(d, pagina)) {
                c.beginText();
                c.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                c.newLineAtOffset(72, 760);
                c.showText(texto);
                c.endText();
            }
            return guardar(d);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /**
     * Páginas con una imagen grande sin pérdida (degradado con ruido leve), como un plano escaneado: pesa varios cientos de
     * KB por página y la optimización la reduce mucho.
     */
    public static byte[] conImagenes(int paginas, int ancho, int alto) {
        Random azar = new Random(42);
        try (PDDocument d = new PDDocument()) {
            for (int n = 0; n < paginas; n++) {
                BufferedImage img = new BufferedImage(ancho, alto, BufferedImage.TYPE_INT_RGB);
                for (int y = 0; y < alto; y++) {
                    for (int x = 0; x < ancho; x++) {
                        int r = (x * 255 / ancho + azar.nextInt(24)) & 0xFF;
                        int g = (y * 255 / alto + azar.nextInt(24)) & 0xFF;
                        int b = ((x + y + n * 40) % 255 + azar.nextInt(24)) & 0xFF;
                        img.setRGB(x, y, (r << 16) | (g << 8) | b);
                    }
                }
                PDPage pagina = new PDPage(PDRectangle.A4);
                d.addPage(pagina);
                PDImageXObject x = LosslessFactory.createFromImage(d, img);
                try (PDPageContentStream c = new PDPageContentStream(d, pagina)) {
                    c.drawImage(x, 20, 20, PDRectangle.A4.getWidth() - 40, PDRectangle.A4.getHeight() - 40);
                }
            }
            return guardar(d);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Una página y un flujo de bytes aleatorios que ninguna optimización reduce: sirve para el rechazo 413. */
    public static byte[] conRelleno(int bytes) {
        byte[] ruido = new byte[bytes];
        new Random(7).nextBytes(ruido);
        try (PDDocument d = new PDDocument()) {
            d.addPage(new PDPage(PDRectangle.A4));
            COSStream relleno = d.getDocument().createCOSStream();
            try (OutputStream o = relleno.createRawOutputStream()) {
                o.write(ruido);
            }
            d.getDocumentCatalog().getCOSObject().setItem(COSName.getPDFName("RellenoDePrueba"), relleno);
            return guardar(d);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Un PDF protegido con contraseña de apertura. */
    public static byte[] cifrado() {
        try (PDDocument d = new PDDocument()) {
            d.addPage(new PDPage(PDRectangle.A4));
            StandardProtectionPolicy politica = new StandardProtectionPolicy("dueno-prueba", "usuario-prueba",
                    new AccessPermission());
            politica.setEncryptionKeyLength(128);
            d.protect(politica);
            return guardar(d);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static byte[] guardar(PDDocument d) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        d.save(out);
        return out.toByteArray();
    }
}
