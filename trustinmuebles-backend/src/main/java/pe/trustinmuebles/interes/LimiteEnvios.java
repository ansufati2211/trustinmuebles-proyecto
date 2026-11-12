package pe.trustinmuebles.interes;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * v1.0 (etapa 4): límite de envíos del formulario público por IP (10 por hora por defecto, {@code
 * app.interes.limite-por-hora}). En memoria, como el límite de intentos de login: suficiente para una sola instancia.
 */
@Component
class LimiteEnvios {
    static final Duration VENTANA = Duration.ofHours(1);

    private final int maximo;
    private final ConcurrentHashMap<String, Deque<Instant>> envios = new ConcurrentHashMap<>();

    LimiteEnvios(@Value("${app.interes.limite-por-hora:10}") int maximo) {
        this.maximo = maximo;
    }

    /** Registra un envío de la IP si no superó el límite. Devuelve false si ya lo alcanzó (y no lo registra). */
    boolean registrar(String ip) {
        Deque<Instant> d = envios.computeIfAbsent(ip == null ? "?" : ip, k -> new ArrayDeque<>());
        synchronized (d) {
            Instant limite = Instant.now().minus(VENTANA);
            while (!d.isEmpty() && d.peekFirst().isBefore(limite)) d.pollFirst();
            if (d.size() >= maximo) return false;
            d.addLast(Instant.now());
            return true;
        }
    }

    int maximo() {
        return maximo;
    }
}
