package pe.trustinmuebles.expediente;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import javax.imageio.ImageIO;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import pe.trustinmuebles.shared.Empresa;

/**
 * v1.0 (etapa 8): las pruebas de los PDF exigían que no hubiera ninguna imagen (ni logo, ni escudo, ni sello, ni QR). La
 * etapa 8 pide el logo de la inmobiliaria en el encabezado; lo que se sigue verificando es que no haya ningún elemento
 * oficial como imagen: la única imagen permitida es el logo de la empresa (mismas dimensiones que su PNG), una sola vez.
 */
final class ImagenesPdf {
    private ImagenesPdf() {}

    static void soloElLogoDeLaEmpresa(PDPage pagina, String como) throws IOException {
        PDResources r = pagina.getResources();
        List<PDXObject> imagenes = new ArrayList<>();
        for (COSName n : r.getXObjectNames()) imagenes.add(r.getXObject(n));
        assertThat(imagenes).as(como + ": una sola imagen, el logo de la empresa (sin escudo, sello ni QR)").hasSize(1);
        assertThat(imagenes.get(0)).isInstanceOf(PDImageXObject.class);
        BufferedImage logo = ImageIO.read(new ByteArrayInputStream(Empresa.logoPng()));
        PDImageXObject img = (PDImageXObject) imagenes.get(0);
        assertThat(img.getWidth()).as(como + ": ancho del logo").isEqualTo(logo.getWidth());
        assertThat(img.getHeight()).as(como + ": alto del logo").isEqualTo(logo.getHeight());
    }
}
