package pe.trustinmuebles.expediente;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.trustinmuebles.expediente.LectorCsv.Registro;

/** v1.0 (etapa 3b): el lector de CSV propio. Sin base de datos. */
class LectorCsvTest {
    static LectorCsv.Resultado leer(String t) {
        return LectorCsv.leer(t.getBytes(StandardCharsets.UTF_8));
    }

    static List<List<String>> campos(LectorCsv.Resultado r) {
        return r.registros().stream().map(Registro::campos).toList();
    }

    @Test
    @DisplayName("Lee comas, CRLF y LF, y numera las líneas desde el encabezado")
    void basico() {
        LectorCsv.Resultado r = leer("a,b,c\r\n1,2,3\n4,5,6");
        assertThat(r.separador()).isEqualTo(',');
        assertThat(campos(r)).containsExactly(List.of("a", "b", "c"), List.of("1", "2", "3"), List.of("4", "5", "6"));
        assertThat(r.registros().stream().map(Registro::linea)).containsExactly(1, 2, 3);
        assertThat(r.errorFormato()).isNull();
    }

    @Test
    @DisplayName("El separador es el de la primera línea: punto y coma si aparece más que la coma")
    void separador() {
        assertThat(leer("a;b;c\r\n1;2;3\r\n").separador()).isEqualTo(';');
        assertThat(campos(leer("a;b;c\r\n1,5;2;3\r\n"))).containsExactly(List.of("a", "b", "c"), List.of("1,5", "2", "3"));
        assertThat(leer("a,b;c\r\n").separador()).isEqualTo(',');
        assertThat(leer("\"a;b;c\",d\r\n").separador()).isEqualTo(',');
        assertThat(leer("solo").separador()).isEqualTo(',');
    }

    @Test
    @DisplayName("Comillas: separadores y saltos de línea dentro del campo, y comillas dobles escapadas")
    void comillas() {
        LectorCsv.Resultado r = leer("a,b\r\n\"uno, dos\",\"di \"\"hola\"\"\"\r\n\"línea 1\r\nlínea 2\",x\r\nfin,y\r\n");
        assertThat(campos(r)).containsExactly(List.of("a", "b"), List.of("uno, dos", "di \"hola\""),
                List.of("línea 1\r\nlínea 2", "x"), List.of("fin", "y"));
        // El salto de línea dentro de comillas cuenta como línea del archivo: «fin» está en la 5.
        assertThat(r.registros().get(3).linea()).isEqualTo(5);
    }

    @Test
    @DisplayName("Quita los espacios sobrantes (salvo entre comillas) e ignora las líneas vacías")
    void espaciosYVacias() {
        LectorCsv.Resultado r = leer("a , b\r\n\r\n  1 ,\" 2 \"\r\n,,\r\n3,4\r\n\r\n");
        assertThat(campos(r)).containsExactly(List.of("a", "b"), List.of("1", " 2 "), List.of("3", "4"));
        assertThat(r.registros().get(2).linea()).isEqualTo(5);
    }

    @Test
    @DisplayName("Campos vacíos al final de la línea se conservan; una última línea sin salto también se lee")
    void camposVacios() {
        assertThat(campos(leer("a,b,c\r\n1,,\r\n2,3,"))).containsExactly(List.of("a", "b", "c"), List.of("1", "", ""),
                List.of("2", "3", ""));
    }

    @Test
    @DisplayName("Comillas sin cerrar es un error de formato")
    void comillasSinCerrar() {
        LectorCsv.Resultado r = leer("a,b\r\n1,\"2\r\n3,4\r\n");
        assertThat(r.errorFormato()).contains("comillas sin cerrar").contains("línea 2");
        assertThat(r.registros()).isEmpty();
    }

    @Test
    @DisplayName("Lee UTF-8 con o sin BOM y, si no es UTF-8, Windows-1252")
    void codificacion() {
        String t = "zona,nombre\r\nRDM,Ñandú\r\n";
        byte[] utf8 = t.getBytes(StandardCharsets.UTF_8);
        byte[] conBom = new byte[utf8.length + 3];
        conBom[0] = (byte) 0xEF;
        conBom[1] = (byte) 0xBB;
        conBom[2] = (byte) 0xBF;
        System.arraycopy(utf8, 0, conBom, 3, utf8.length);
        assertThat(campos(LectorCsv.leer(utf8)).get(1)).containsExactly("RDM", "Ñandú");
        assertThat(campos(LectorCsv.leer(conBom)).get(0)).containsExactly("zona", "nombre"); // sin «﻿» pegado
        assertThat(campos(LectorCsv.leer(t.getBytes(Charset.forName("windows-1252")))).get(1)).containsExactly("RDM", "Ñandú");
    }

    @Test
    @DisplayName("Un archivo vacío no tiene registros")
    void vacio() {
        assertThat(LectorCsv.leer(new byte[0]).registros()).isEmpty();
        assertThat(leer("\r\n\r\n   \r\n").registros()).isEmpty();
    }
}
