package pe.trustinmuebles.expediente;

import java.io.IOException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import pe.trustinmuebles.shared.Empresa;

/**
 * v1.0 (etapa 6): rotulado común de los PDF que genera el sistema. Todos llevan el nombre de la inmobiliaria y dicen que
 * los elabora ella; ninguno imita el formato de SUNARP, de una municipalidad ni de un colegio profesional (sin escudos,
 * sellos, firmas, códigos de verificación ni datos de pago de derechos).
 *
 * <p>v1.0 (etapa 8): el nombre y el logo son los de la inmobiliaria que opera el portal (contenido/empresa.json): LEDCONS.
 * El logo es el de la empresa, tal cual; no es un escudo ni un sello.
 */
final class RotuloInmobiliaria {
    static final String NOMBRE = Empresa.datos().nombreComercial();
    static final String ENCABEZADO = Empresa.datos().encabezado();
    static final String ELABORADO = "Documento informativo elaborado por la inmobiliaria " + NOMBRE + " ("
            + Empresa.datos().razonSocial() + ", RUC " + Empresa.datos().ruc() + ").";

    private RotuloInmobiliaria() {}

    /** El logo de la empresa para un documento; null si no está el archivo (el PDF sale igual, sin logo). */
    static PDImageXObject logo(PDDocument doc) {
        byte[] png = Empresa.logoPng();
        if (png.length == 0) return null;
        try {
            return PDImageXObject.createFromByteArray(doc, png, "logo");
        } catch (IOException | IllegalArgumentException e) {
            return null;
        }
    }

    /** Dibuja el logo cuadrado de lado {@code lado} con su esquina inferior izquierda en (x, y). */
    static void dibujarLogo(PDPageContentStream cs, PDImageXObject logo, float x, float y, float lado) throws IOException {
        if (logo != null) cs.drawImage(logo, x, y, lado, lado);
    }
}
