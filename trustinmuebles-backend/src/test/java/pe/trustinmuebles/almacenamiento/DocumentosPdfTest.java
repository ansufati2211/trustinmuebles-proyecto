package pe.trustinmuebles.almacenamiento;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.trustinmuebles.PdfDePrueba;
import pe.trustinmuebles.shared.ArchivoDemasiadoGrandeException;

/** Validación y optimización de PDF (v0.8, decisión 4), sin Spring. */
class DocumentosPdfTest {

    @Test
    @DisplayName("Bajo el umbral no se toca: se guarda el mismo archivo")
    void bajoElUmbral() {
        byte[] pdf = PdfDePrueba.simple("pequeño");
        PdfPreparado r = new DocumentosPdf(25, 5, 10).preparar(pdf, "application/pdf");
        assertThat(r.optimizado()).isFalse();
        assertThat(r.datos()).isEqualTo(pdf);
        assertThat(r.tamanoOriginal()).isEqualTo(pdf.length);
    }

    @Test
    @DisplayName("Sobre el umbral, re-codifica las imágenes grandes, reduce el lado mayor y conserva el número de páginas")
    void optimizaImagenes() throws Exception {
        byte[] pdf = PdfDePrueba.conImagenes(3, 2400, 600);
        PdfPreparado r = new DocumentosPdf(25, 0.1, 10).preparar(pdf, "application/pdf");
        assertThat(r.optimizado()).isTrue();
        assertThat(r.datos().length).isLessThan(pdf.length);
        try (PDDocument d = Loader.loadPDF(r.datos())) {
            assertThat(d.getNumberOfPages()).isEqualTo(3);
            var nombre = d.getPage(0).getResources().getXObjectNames().iterator().next();
            var img = (org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject) d.getPage(0).getResources()
                    .getXObject(nombre);
            assertThat(Math.max(img.getWidth(), img.getHeight())).isLessThanOrEqualTo(DocumentosPdf.LADO_MAXIMO);
        }
    }

    @Test
    @DisplayName("Si optimizar no reduce el tamaño, conserva el original; si aun así pasa del máximo, 413 con el peso")
    void noReducible() {
        byte[] pdf = PdfDePrueba.conRelleno(300_000);
        PdfPreparado r = new DocumentosPdf(25, 0.1, 10).preparar(pdf, "application/pdf");
        assertThat(r.optimizado()).isFalse();
        assertThat(r.datos()).isEqualTo(pdf);
        assertThatThrownBy(() -> new DocumentosPdf(25, 0.1, 0.2).preparar(pdf, "application/pdf"))
                .isInstanceOf(ArchivoDemasiadoGrandeException.class)
                .hasMessageStartingWith("El PDF pesa 0,3 MB incluso optimizado; el máximo es 0,2 MB");
    }

    @Test
    @DisplayName("Rechaza lo que no es PDF, lo cifrado, lo dañado y lo que supera la entrada")
    void rechazos() {
        DocumentosPdf d = new DocumentosPdf(1, 0.5, 1);
        assertThatThrownBy(() -> d.preparar("texto".getBytes(), "application/pdf"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> d.preparar(PdfDePrueba.simple("x"), "image/png"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> d.preparar(PdfDePrueba.cifrado(), "application/pdf"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("contraseña");
        assertThatThrownBy(() -> d.preparar("%PDF-1.4\n%nada\n".getBytes(), "application/pdf"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("dañado");
        assertThatThrownBy(() -> d.preparar(new byte[0], "application/pdf"))
                .isInstanceOf(IllegalArgumentException.class);
        byte[] enorme = new byte[1024 * 1024 + 1];
        assertThatThrownBy(() -> d.preparar(enorme, "application/pdf"))
                .isInstanceOf(ArchivoDemasiadoGrandeException.class).hasMessage("El archivo supera 1 MB");
    }

    @Test
    @DisplayName("Los tamaños se muestran con coma decimal y sin decimales si son enteros")
    void formato() {
        assertThat(DocumentosPdf.mb(25)).isEqualTo("25");
        assertThat(DocumentosPdf.mb(18.24)).isEqualTo("18,2");
    }
}
