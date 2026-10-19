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

    private static List<String> dibujado(byte[] pdf) throws Exception {
        List<String> textos = new ArrayList<>();
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            for (Object token : new PDFStreamParser(doc.getPage(0)).parse()) {
                if (token instanceof COSString c) textos.add(c.getString());
            }
        }
        return textos;
    }

    @Test
    @DisplayName("Las medidas salen de los linderos del expediente: frente, largo y nombre de la vía")
    void medidasDeLosLinderos() {
        var m = LaminaPdf.medidas("Frente: con la Calle 3, en 8.00 ml. Derecha: con el Lote 8, en 20.00 ml. "
                + "Izquierda: con el Lote 6, en 20.00 ml. Fondo: con el Lote 21, en 8.00 ml.", null);
        assertThat(m.propias()).isTrue();
        assertThat(m.frente()).isEqualTo(8.0);
        assertThat(m.largo()).isEqualTo(20.0);
        assertThat(m.via()).isEqualTo("Calle 3");
        // Sin linderos se usa un terreno tipo, a partir del área, y se avisa.
        var tipo = LaminaPdf.medidas(null, new BigDecimal("200"));
        assertThat(tipo.propias()).isFalse();
        assertThat(tipo.frente() * tipo.largo()).isEqualTo(200.0);
        assertThat(LaminaPdf.medidas("No constan: falta la copia literal.", null).propias()).isFalse();
    }

    private static LaminaPdf.Datos datos(String area, String sistema) {
        return new LaminaPdf.Datos("SIM-11075836", "Mz. G Lote 14", new BigDecimal("180.00"),
                "Frente: con la Calle Los Pacaes, en 10.00 ml. Derecha: con el Lote 15, en 18.00 ml. "
                        + "Izquierda: con el Lote 13, en 18.00 ml. Fondo: con el Lote 2, en 10.00 ml.",
                new BigDecimal(area), sistema, java.time.LocalDate.of(2026, 10, 17));
    }

    @Test
    @DisplayName("La lámina dibuja las cotas del terreno, el cuadro de áreas y el código de lámina del caso")
    void cotasYCuadroDeAreas() throws Exception {
        var textos = dibujado(LaminaPdf.generar(Especialidad.ARQUITECTURA, datos("110.00", null)));
        assertThat(textos).contains("10.00", "18.00", "CUADRO DE ÁREAS", "Área del terreno: 180.00 m²", "A-01",
                "CALLE LOS PACAES");
        assertThat(textos).anyMatch(t -> t.startsWith("Área libre: 70.00 m²"));
        assertThat(dibujado(LaminaPdf.generar(Especialidad.ESTRUCTURAS, datos("110.00", "Concreto armado (aporticado)"))))
                .contains("E-01", "V-101");
        assertThat(dibujado(LaminaPdf.generar(Especialidad.ELECTRICAS, datos("110.00", null)))).contains("IE-01");
        assertThat(dibujado(LaminaPdf.generar(Especialidad.SANITARIAS, datos("110.00", null)))).contains("IS-01");
    }

    @Test
    @DisplayName("Una vivienda que no cabe en un piso se dibuja en dos, y en adobe se dibujan muros en lugar de columnas")
    void dosPisosYAdobe() throws Exception {
        var ampliada = new LaminaPdf.Datos("SIM-11098467", "Mz. N Lote 8", new BigDecimal("120.00"),
                "Frente: con la Calle El Pallar, en 8.00 ml. Derecha: con el Lote 9, en 15.00 ml. "
                        + "Izquierda: con el Lote 7, en 15.00 ml. Fondo: con el Lote 16, en 8.00 ml.",
                new BigDecimal("98.00"), null, null);
        assertThat(dibujado(LaminaPdf.generar(Especialidad.ARQUITECTURA, ampliada))).contains("Área construida: 98.00 m² (2 pisos)");
        var adobe = dibujado(LaminaPdf.generar(Especialidad.ESTRUCTURAS, datos("88.00", "Adobe o tapial")));
        assertThat(adobe).contains("Muros portantes de adobe, e = 0.40 m").doesNotContain("V-101");
    }

    @Test
    @DisplayName("Sin linderos la lámina lo avisa en lugar de inventar medidas")
    void sinLinderosLoAvisa() throws Exception {
        var sin = new LaminaPdf.Datos("SIM-1", "Predio", null, null, new BigDecimal("80"), null, null);
        assertThat(dibujado(LaminaPdf.generar(Especialidad.ARQUITECTURA, sin)))
                .contains("Los linderos no constan: se dibuja un terreno tipo.");
    }
}
