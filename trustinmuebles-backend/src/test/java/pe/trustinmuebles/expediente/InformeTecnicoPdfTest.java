package pe.trustinmuebles.expediente;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSString;
import org.apache.pdfbox.pdfparser.PDFStreamParser;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.trustinmuebles.expediente.InformeTecnicoPdf.PlanoResumen;
import pe.trustinmuebles.inspeccion.EvaluacionTecnicaDto;
import pe.trustinmuebles.inspeccion.EstadoTecnico;
import pe.trustinmuebles.inspeccion.ResultadoTecnico;
import pe.trustinmuebles.inspeccion.VerificacionCampo;

/** El informe es referencial: nunca puede pasar por un informe real ni llevar firma o sello. */
class InformeTecnicoPdfTest {

    static InformeTecnicoPdf.Datos datos() {
        var t = new EvaluacionTecnicaDto(EstadoTecnico.EMITIDO, "Informe técnico emitido", ResultadoTecnico.CON_OBSERVACIONES,
                "Con observaciones físicas subsanables", "Ing. Civil Hernán Gustavo Paredes Lazo", "CIP SIM-0001",
                java.time.LocalDate.of(2026, 10, 8), java.time.LocalDate.of(2026, 10, 12), VerificacionCampo.CONFORME,
                VerificacionCampo.CONFORME, VerificacionCampo.OBSERVADO, VerificacionCampo.OBSERVADO,
                "Cableado antiguo sin llave diferencial y filtración en la red sanitaria de la cocina.",
                "Las observaciones son subsanables con mantenimiento preventivo.",
                "Medición de aislamiento eléctrico y prueba de estanqueidad.",
                "Basada en la inspección visual e instrumental del profesional. Lo que exige ensayos queda fuera.");
        var planos = List.of(
                new PlanoResumen("Plano arquitectónico", "presentado", "96.00 m²", VerificacionCampo.CONFORME),
                new PlanoResumen("Plano de estructuras", "presentado", "Albañilería confinada", VerificacionCampo.CONFORME),
                new PlanoResumen("Plano de instalaciones eléctricas (II.EE.)", "no presentado", null, VerificacionCampo.OBSERVADO),
                new PlanoResumen("Plano de instalaciones sanitarias (II.SS.)", "no presentado", null, VerificacionCampo.OBSERVADO));
        return new InformeTecnicoPdf.Datos("SIM-11052690", "Mz. K Lote 12 · Hab. Urb. Rincón del Sauce · La Tinguiña, Ica",
                "Mz. K, Lote 12, distrito de La Tinguiña, Ica.", new BigDecimal("200.00"), new BigDecimal("96.00"), planos, t);
    }

    @Test
    @DisplayName("Trae las secciones del informe, las 4 verificaciones en campo y la conclusión del especialista")
    void estructuraDelInforme() throws Exception {
        try (PDDocument doc = Loader.loadPDF(InformeTecnicoPdf.generar(datos()))) {
            String texto = new PDFTextStripper().getText(doc);
            assertThat(texto).contains("INFORME TÉCNICO DE INSPECCIÓN (REFERENCIAL)", "1. DATOS DEL INMUEBLE",
                    "3. ALCANCE Y PROCEDIMIENTO", "Paso 6.", "4. DOCUMENTOS REVISADOS Y VERIFICACIÓN EN CAMPO",
                    "5. OBSERVACIONES Y DEFICIENCIAS FÍSICAS", "6. CONCLUSIÓN", "7. ESTUDIOS ADICIONALES REQUERIDOS",
                    "8. LIMITACIONES", "CIP SIM-0001", "llave diferencial", "Con observaciones físicas subsanables");
            assertThat(texto).contains("En campo: conforme", "En campo: observado");
            assertThat(doc.getDocumentInformation().getTitle()).isEqualTo("Informe técnico referencial SIM-11052690");
        }
    }

    @Test
    @DisplayName("Cada página lleva la marca y el pie que dicen que es ficticio, y no hay firma, sello ni imágenes")
    void sinFirmaNiSello() throws Exception {
        try (PDDocument doc = Loader.loadPDF(InformeTecnicoPdf.generar(datos()))) {
            for (int i = 0; i < doc.getNumberOfPages(); i++) {
                List<String> dibujado = new ArrayList<>();
                for (Object token : new PDFStreamParser(doc.getPage(i)).parse()) {
                    if (token instanceof COSString c) dibujado.add(c.getString());
                }
                assertThat(dibujado).contains(InformeTecnicoPdf.MARCA_DE_AGUA);
                assertThat(dibujado).anyMatch(t -> t.contains("Informe referencial ficticio"));
                assertThat(doc.getPage(i).getResources().getXObjectNames()).isEmpty();
            }
            String texto = new PDFTextStripper().getText(doc).toLowerCase();
            assertThat(texto).contains("sin firma", "no tiene valor legal").doesNotContain("firmado por", "código qr");
        }
    }
}
