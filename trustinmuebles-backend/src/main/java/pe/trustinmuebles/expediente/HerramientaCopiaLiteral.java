package pe.trustinmuebles.expediente;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import pe.trustinmuebles.expediente.ContenidoCaso.CasoJson;
import tools.jackson.databind.json.JsonMapper;

/**
 * Genera el PDF de un caso desde su JSON, con la misma plantilla que usa el sistema. Sirve para preparar los casos de
 * la forma A del estudio fuera del MVP, de modo que el formato no sea una diferencia entre pretest y postest.
 *
 * Uso (desde trustinmuebles-backend):
 *   ./mvnw -q compile org.codehaus.mojo:exec-maven-plugin:3.5.0:java \
 *       -Dexec.mainClass=pe.trustinmuebles.expediente.HerramientaCopiaLiteral \
 *       -Dexec.args="caso.json salida.pdf"
 */
public final class HerramientaCopiaLiteral {
    private HerramientaCopiaLiteral() {}

    public static void main(String[] args) throws IOException {
        if (args.length != 2) {
            System.err.println("Uso: HerramientaCopiaLiteral <caso.json> <salida.pdf>");
            System.exit(2);
        }
        CasoJson caso = JsonMapper.builder().build().readValue(Path.of(args[0]).toFile(), CasoJson.class);
        var datos = caso.datos();
        var normalizado = NormalizadorAsientos.normalizar(datos.asientos());
        byte[] pdf = CopiaLiteralPdf.generar(ExpedienteService.copiaDe(caso.codigo(), datos, normalizado.asientos()));
        Files.write(Path.of(args[1]), pdf);
        System.out.println("Generado " + args[1] + " (" + pdf.length + " bytes) para la partida " + caso.codigo());
    }
}
