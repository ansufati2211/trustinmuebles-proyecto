package pe.trustinmuebles.expediente;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.apache.pdfbox.cos.COSString;
import org.apache.pdfbox.pdfparser.PDFStreamParser;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.trustinmuebles.clasificacion.Especialidad;

/** Las láminas 2D son esquemas ficticios: nunca pueden pasar por un plano aprobado ni llevar sello o firma. */
class LaminaPdfTest {

    @Test
    @DisplayName("Cada especialidad genera un PDF válido con su título, su rótulo ficticio y sin imágenes")
    void unaLaminaPorEspecialidad() throws Exception {
        for (Especialidad e : Especialidad.values()) {
            byte[] pdf = LaminaPdf.generar(e, "SIM-11048217", "Mz. F Lote 7 · Hab. Urb. Santa Elvira · Parcona, Ica",
                    new BigDecimal("84.50"), "Albañilería confinada");
            assertThat(ExpedienteService.esPdf(pdf)).isTrue();
            try (PDDocument doc = Loader.loadPDF(pdf)) {
                assertThat(doc.getNumberOfPages()).isEqualTo(1);
                // La marca de agua es un texto girado que se mezcla al extraer el texto: se miran las cadenas dibujadas.
                List<String> dibujado = new ArrayList<>();
                for (Object token : new PDFStreamParser(doc.getPage(0)).parse()) {
                    if (token instanceof COSString c) dibujado.add(c.getString());
                }
                assertThat(dibujado).contains(LaminaPdf.MARCA_DE_AGUA, LaminaPdf.ROTULO,
                        e.etiqueta().toUpperCase(java.util.Locale.forLanguageTag("es-PE")), "Partida N.° SIM-11048217");
                // Los avisos hablan de «sin sello ni firma»; lo que no debe haber es una firma presentada.
                assertThat(String.join(" ", dibujado)).doesNotContainIgnoringCase("firmado por");
                assertThat(doc.getPage(0).getResources().getXObjectNames()).as("sin logos ni sellos como imagen").isEmpty();
            }
        }
    }

    @Test
    @DisplayName("Los datos del plano aparecen en la lámina y los caracteres raros no rompen la generación")
    void datosYCaracteresRaros() throws Exception {
        byte[] arq = LaminaPdf.generar(Especialidad.ARQUITECTURA, "SIM-1", "Predio → ★", new BigDecimal("96"), null);
        byte[] est = LaminaPdf.generar(Especialidad.ESTRUCTURAS, "SIM-1", "Predio", null, "Albañilería confinada");
        try (PDDocument a = Loader.loadPDF(arq); PDDocument b = Loader.loadPDF(est)) {
            assertThat(new PDFTextStripper().getText(a)).contains("Área construida: 96.00 m²", "Predio ? ?");
            assertThat(new PDFTextStripper().getText(b)).contains("Sistema constructivo: Albañilería confinada");
        }
    }
}
