package pe.trustinmuebles.identidad;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class ValidadorSecretosTest {
    private static final String JWT_OK = "un-secreto-de-produccion-largo-y-aleatorio-1234567890";

    @Test
    void rechazaElSecretoJwtDeEjemplo() {
        assertThatThrownBy(() -> ValidadorSecretos.validar(
                "trustinmuebles-secreto-de-desarrollo-minimo-32-bytes-no-usar-en-produccion", "clave-segura-123456"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("APP_JWT_SECRET");
    }

    @Test
    void rechazaSecretosCortosOClaveDeEjemplo() {
        assertThatThrownBy(() -> ValidadorSecretos.validar("corto", "clave-segura-123456"))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> ValidadorSecretos.validar(JWT_OK, "cambia-esta-clave-de-cifrado-en-produccion"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("APP_STORAGE_KEY");
    }

    @Test
    void aceptaSecretosFuertes() {
        assertThatCode(() -> ValidadorSecretos.validar(JWT_OK, "clave-segura-123456")).doesNotThrowAnyException();
    }
}
