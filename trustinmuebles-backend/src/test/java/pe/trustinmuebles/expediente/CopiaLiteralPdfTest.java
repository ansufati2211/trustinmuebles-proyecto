package pe.trustinmuebles.expediente;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSString;
import org.apache.pdfbox.pdfparser.PDFStreamParser;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.trustinmuebles.expediente.CopiaLiteralPdf.AsientoCopia;
import pe.trustinmuebles.expediente.CopiaLiteralPdf.DatosCopia;

/** El documento es realista en estructura pero nunca puede confundirse con uno oficial (RN-01, 1.8). */
class CopiaLiteralPdfTest {

    static DatosCopia partida(int cantidadAsientos, boolean parcial) {
        List<AsientoCopia> asientos = new ArrayList<>();
        String largo = "Por escritura pública de fecha 14 de marzo de 2018, otorgada ante notario público de Ica, "
                + "Inmobiliaria Santa Elvira S.A.C. transfirió en compraventa el predio a favor de Rosa Elena "
                + "Cárdenas Vilca, de estado civil soltera, con intervención de su apoderado, y declaró haber "
                + "recibido la totalidad del precio pactado a su entera satisfacción en el acto de la firma.";
        for (int i = 1; i <= cantidadAsientos; i++) {
            asientos.add(new AsientoCopia(String.format("D%05d", i), "Hipoteca", largo, LocalDate.of(2018, 4, 2),
                    "SIM-2018-0001" + i, LocalDate.of(2018, 3, 26)));
        }
        return new DatosCopia("SIM-11048217", "Zona Registral N.° XI - Sede Ica", "Oficina Registral de Ica",
                "Mz. F, Lote 7 de la Habilitación Urbana Santa Elvira, distrito de Parcona, Ica.", new BigDecimal("160.00"),
                "Frente: con la Calle 3, en 8.00 ml. Derecha: con el Lote 8, en 20.00 ml.",
                "El predio proviene de la partida SIM-11031904.", parcial, LocalDate.of(2026, 10, 17), asientos);
    }

    private static List<String> textosDibujados(PDDocument doc, int pagina) throws Exception {
        List<String> textos = new ArrayList<>();
        for (Object token : new PDFStreamParser(doc.getPage(pagina)).parse()) {
            if (token instanceof COSString s) textos.add(s.getString());
        }
        return textos;
    }

    @Test
    @DisplayName("Un caso con muchos asientos ocupa varias páginas, y cada una lleva marca de agua, pie y numeración")
    void variasPaginasConMarcaEnCadaUna() throws Exception {
        byte[] pdf = CopiaLiteralPdf.generar(partida(14, false));
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            int n = doc.getNumberOfPages();
            assertThat(n).isGreaterThan(1);
            for (int i = 0; i < n; i++) {
                List<String> textos = textosDibujados(doc, i);
                assertThat(textos).as("marca de agua en la página " + (i + 1)).contains(CopiaLiteralPdf.MARCA_DE_AGUA);
                assertThat(textos).as("pie en la página " + (i + 1)).anyMatch(t -> t.contains("Documento simulado con fines"));
                assertThat(textos).as("numeración en la página " + (i + 1)).contains("Página " + (i + 1) + " de " + n);
            }
        }
    }

    @Test
    @DisplayName("Tiene la estructura de una copia literal: encabezado, descripción, antecedente y rubros con sus asientos")
    void estructuraRegistral() throws Exception {
        try (PDDocument doc = Loader.loadPDF(CopiaLiteralPdf.generar(partida(2, false)))) {
            String texto = new PDFTextStripper().getText(doc);
            assertThat(texto).contains("ZONA REGISTRAL N.° XI - SEDE ICA", "OFICINA REGISTRAL DE ICA", "REGISTRO DE PREDIOS",
                    "Partida N.° SIM-11048217", "COPIA LITERAL SIMULADA DE PARTIDA REGISTRAL",
                    "DESCRIPCIÓN DEL INMUEBLE", "Área: 160.00 m²", "ANTECEDENTE DOMINIAL", "TÍTULOS DE DOMINIO",
                    "GRAVÁMENES Y CARGAS", "CANCELACIONES", "OTROS", "D00001 · HIPOTECA", "Título archivado N.° SIM-2018-00011",
                    "presentado el 26/03/2018", "inscrito el 02/04/2018", "Rosa Elena Cárdenas Vilca");
            assertThat(doc.getDocumentInformation().getTitle()).isEqualTo("Copia literal simulada SIM-11048217");
        }
    }

    @Test
    @DisplayName("Nunca puede confundirse con un documento oficial: sin firma, sello, código de verificación ni QR")
    void sinElementosOficiales() throws Exception {
        try (PDDocument doc = Loader.loadPDF(CopiaLiteralPdf.generar(partida(3, false)))) {
            String texto = new PDFTextStripper().getText(doc).toLowerCase();
            assertThat(texto).contains("sin firma ni sello", "no está firmado", "no tiene valor legal", "simulad");
            assertThat(texto).doesNotContain("código de verificación", "codigo de verificacion", "código qr", "registrador",
                    "firma digital", "firmado digitalmente");
            assertThat(doc.getPage(0).getResources().getXObjectNames()).as("sin imágenes: ni logo, ni escudo, ni QR").isEmpty();
            assertThat(doc.getDocumentInformation().getSubject()).contains("Sin valor legal");
        }
    }

    @Test
    @DisplayName("El área se imprime siempre con dos decimales, venga como venga del JSON o de la base")
    void areaConDosDecimales() throws Exception {
        for (String entrada : new String[] {"220", "220.0", "220.00", "219.999"}) {
            DatosCopia base = partida(1, false);
            DatosCopia d = new DatosCopia(base.partida(), base.zona(), base.oficina(), base.ubicacion(),
                    new BigDecimal(entrada), base.linderos(), base.antecedente(), false, base.fechaReferencial(),
                    base.asientos());
            try (PDDocument doc = Loader.loadPDF(CopiaLiteralPdf.generar(d))) {
                assertThat(new PDFTextStripper().getText(doc)).contains("Área: 220.00 m²");
            }
        }
    }

    @Test
    @DisplayName("Un extracto parcial lo declara y no inventa el rubro de títulos de dominio")
    void extractoParcial() throws Exception {
        try (PDDocument doc = Loader.loadPDF(CopiaLiteralPdf.generar(partida(1, true)))) {
            String texto = new PDFTextStripper().getText(doc);
            assertThat(texto).contains("EXTRACTO PARCIAL", "No incluido en este extracto.");
            assertThat(texto).doesNotContain("C00001");
        }
    }

    @Test
    @DisplayName("Una partida sin asientos dice que no se representan, y los caracteres raros no rompen la generación")
    void sinAsientosYCaracteresRaros() throws Exception {
        DatosCopia d = new DatosCopia("SIM-99000001", null, null, "Ubicación con símbolo raro → ★", null, null, null, true,
                null, List.of());
        try (PDDocument doc = Loader.loadPDF(CopiaLiteralPdf.generar(d))) {
            String texto = new PDFTextStripper().getText(doc);
            assertThat(texto).contains("No se representan asientos.", "no informado", "símbolo raro ? ?");
        }
    }
}
