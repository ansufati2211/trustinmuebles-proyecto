package pe.trustinmuebles.identidad;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/** En producción (perfil postgres) la app no arranca con los secretos de ejemplo. */
@Component
@Profile("postgres")
class ValidadorSecretos {
    ValidadorSecretos(@Value("${app.jwt.secret}") String jwt, @Value("${app.storage.key}") String storage) {
        validar(jwt, storage);
    }

    static void validar(String jwt, String storage) {
        if (jwt == null || jwt.length() < 32 || jwt.contains("no-usar-en-produccion")) {
            throw new IllegalStateException("APP_JWT_SECRET debe definirse con al menos 32 caracteres y no ser el valor de ejemplo");
        }
        if (storage == null || storage.length() < 16 || storage.startsWith("cambia-esta-clave")) {
            throw new IllegalStateException("APP_STORAGE_KEY debe definirse con al menos 16 caracteres y no ser el valor de ejemplo");
        }
    }
}
